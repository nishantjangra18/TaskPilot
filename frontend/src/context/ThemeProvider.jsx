import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const { user, isAuthenticated, updateProfile } = useAuth();

  // State to hold the current theme ('light' or 'dark')
  const [theme, setTheme] = useState(() => {
    // 1. If we have a user with a saved theme in the context, use it
    if (user?.theme) {
      return user.theme;
    }
    // 2. Otherwise try local storage
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    // 3. Fallback to system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

  // Apply theme class to HTML element whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Save to local storage for guests or as a fallback
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Sync theme with user object when user changes (e.g. login)
  useEffect(() => {
    if (isAuthenticated && user?.theme && user.theme !== theme) {
      setTheme(user.theme);
      localStorage.setItem('theme', user.theme);
    }
  }, [isAuthenticated, user?.theme, theme]);

  // Toggle theme function
  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    
    // Optimistic UI update
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    // If logged in, update DB
    if (isAuthenticated && updateProfile) {
      try {
        await updateProfile({ theme: newTheme });
      } catch (err) {
        console.error('Failed to save theme to profile:', err);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
