import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeProvider';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import ProjectMeeting from './pages/ProjectMeeting';
import TaskDetails from './pages/TaskDetails';
import Profile from './pages/Profile';
import SettingsPage from './pages/Settings';
import Messages from './pages/Messages';
import Network from './pages/Network';
import CalendarPage from './pages/Calendar';
import AIWorkspace from './pages/AIWorkspace';
import AIProjectCreator from './pages/AIProjectCreator';
import AIWorkloadBalancer from './pages/AIWorkloadBalancer';
import AIProjectRiskPredictor from './pages/AIProjectRiskPredictor';
import GoogleOAuthCallback from './pages/GoogleOAuthCallback';
import ErrorBoundary from './components/ErrorBoundary';
import PageTransition from './components/PageTransition';
import NotificationToastBridge from './components/NotificationToastBridge';

function ProtectedPage({ children, transition = false }) {
  return (
    <ProtectedRoute>
      <Layout>
        <ErrorBoundary>
          {transition ? <PageTransition>{children}</PageTransition> : children}
        </ErrorBoundary>
      </Layout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppProvider>
          <Router>
            <Routes>
              <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
              <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
              <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
              <Route path="/auth/google/callback" element={<GoogleOAuthCallback />} />

              <Route path="/dashboard" element={<ProtectedPage transition><Dashboard /></ProtectedPage>} />
              <Route path="/projects" element={<ProtectedPage><Projects /></ProtectedPage>} />
              <Route path="/projects/:projectId/meeting" element={<ProtectedPage><ProjectMeeting /></ProtectedPage>} />
              <Route path="/projects/:id" element={<ProtectedPage><ProjectDetails /></ProtectedPage>} />
              <Route path="/projects/:projectId/tasks/:taskId" element={<ProtectedPage><TaskDetails /></ProtectedPage>} />
              <Route path="/messages" element={<ProtectedPage><Messages /></ProtectedPage>} />
              <Route path="/network" element={<ProtectedPage><Network /></ProtectedPage>} />
              <Route path="/ai" element={<ProtectedPage><AIWorkspace /></ProtectedPage>} />
              <Route path="/ai-project-creator" element={<ProtectedPage><AIProjectCreator /></ProtectedPage>} />
              <Route path="/ai-workload-balancer" element={<ProtectedPage><AIWorkloadBalancer /></ProtectedPage>} />
              <Route path="/ai-risk-predictor" element={<ProtectedPage><AIProjectRiskPredictor /></ProtectedPage>} />
              <Route path="/calendar" element={<ProtectedPage><CalendarPage /></ProtectedPage>} />
              <Route path="/profile" element={<ProtectedPage><Profile /></ProtectedPage>} />
              <Route path="/settings" element={<ProtectedPage><SettingsPage /></ProtectedPage>} />
            </Routes>
            <NotificationToastBridge />
          </Router>
        </AppProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;



