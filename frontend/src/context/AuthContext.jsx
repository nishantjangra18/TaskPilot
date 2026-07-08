import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { firebaseAuth, firestoreDb, googleProvider, isFirebaseConfigured } from '../config/firebase';

import { API_BASE_URL } from '../config/api';

const AuthContext = createContext();

const API_URL = API_BASE_URL;

const getFirebaseErrorMessage = (error) => {
  const code = error?.code || '';

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Google sign-in was closed before it finished.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error. Check your connection and try Google sign-in again.';
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return 'An account already exists with this email using another sign-in method.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'This domain is not authorized in Firebase Authentication settings.';
  }
  if (code.startsWith('auth/')) {
    return error?.message || 'Firebase authentication failed. Please try again.';
  }

  return error?.message || 'Google authentication failed. Please try again.';
};

const persistSession = ({ data, setToken, setUser, setIsAuthenticated }) => {
  const userToken = data.token;
  localStorage.setItem('taskpilot_token', userToken);
  if (data.theme) localStorage.setItem('theme', data.theme);
  setToken(userToken);
  setUser(data);
  setIsAuthenticated(true);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('taskpilot_token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const exchangeFirebaseUser = async (firebaseUser) => {
    const idToken = await firebaseUser.getIdToken();
    const res = await fetch(`${API_URL}/api/auth/firebase-google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Could not complete Google authentication');
    }

    persistSession({ data: data.data, setToken, setUser, setIsAuthenticated });
    return data.data;
  };

  useEffect(() => {
    let didCancel = false;
    let unsubscribeFirebase = null;

    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('taskpilot_token');
      if (storedToken) {
        try {
          const res = await fetch(`${API_URL}/api/auth/profile`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${storedToken}`,
            },
          });
          const data = await res.json();
          if (!didCancel && res.ok && data.success) {
            if (data.data?.theme) localStorage.setItem('theme', data.data.theme);
            setUser(data.data);
            setToken(storedToken);
            setIsAuthenticated(true);
            setLoading(false);
            return;
          }
          localStorage.removeItem('taskpilot_token');
        } catch (err) {
          console.error('Failed to authenticate token:', err);
        }
      }

      if (!isFirebaseConfigured || !firebaseAuth) {
        if (!didCancel) {
          setIsAuthenticated(false);
          setLoading(false);
        }
        return;
      }

      unsubscribeFirebase = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
        if (didCancel) return;
        if (!firebaseUser) {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        try {
          await exchangeFirebaseUser(firebaseUser);
        } catch (err) {
          console.error('Failed to restore Firebase session:', err);
          setIsAuthenticated(false);
        } finally {
          if (!didCancel) setLoading(false);
        }
      });
    };

    initializeAuth();

    return () => {
      didCancel = true;
      if (unsubscribeFirebase) unsubscribeFirebase();
    };
  }, []);

  const handleLogin = async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        persistSession({ data: data.data, setToken, setUser, setIsAuthenticated });
        return { success: true };
      }
      return { success: false, message: data.message || 'Invalid email or password' };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, message: 'Could not connect to authentication server' };
    }
  };

  const handleRegister = async (name, email, password) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, avatar: '', title: '' }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        persistSession({ data: data.data, setToken, setUser, setIsAuthenticated });
        return { success: true };
      }
      return { success: false, message: data.message || 'Registration failed' };
    } catch (err) {
      console.error('Registration error:', err);
      return { success: false, message: 'Could not connect to authentication server' };
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isFirebaseConfigured || !firebaseAuth || !firestoreDb) {
      return { success: false, message: 'Firebase is not configured. Add the Vite Firebase environment variables.' };
    }

    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const firebaseUser = result.user;
      const userRef = doc(firestoreDb, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      const provider = result.providerId || firebaseUser.providerData?.[0]?.providerId || 'google.com';

      await setDoc(userRef, {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName || '',
        email: firebaseUser.email || '',
        photoURL: firebaseUser.photoURL || '',
        provider,
        lastLogin: serverTimestamp(),
        ...(userSnap.exists() ? {} : { createdAt: serverTimestamp() }),
      }, { merge: true });

      await exchangeFirebaseUser(firebaseUser);
      return { success: true };
    } catch (err) {
      console.error('Google auth error:', err);
      return { success: false, message: getFirebaseErrorMessage(err) };
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
    } catch (err) {
      console.error('Logout API call failed:', err);
    }
    localStorage.removeItem('taskpilot_token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    if (firebaseAuth?.currentUser) {
      try {
        await signOut(firebaseAuth);
      } catch (err) {
        console.error('Firebase sign out failed:', err);
      }
    }
  };

  const handleUpdateProfile = async (updates) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.data?.theme) localStorage.setItem('theme', data.data.theme);
        setUser(data.data);
        return { success: true };
      }
      return { success: false, message: data.message || 'Failed to update profile' };
    } catch (err) {
      console.error('Update profile error:', err);
      return { success: false, message: 'Could not connect to server' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated,
      loading,
      login: handleLogin,
      register: handleRegister,
      signInWithGoogle: handleGoogleSignIn,
      logout: handleLogout,
      updateProfile: handleUpdateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
