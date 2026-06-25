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
import CalendarPage from './pages/Calendar';
import GoogleOAuthCallback from './pages/GoogleOAuthCallback';
import ErrorBoundary from './components/ErrorBoundary';
import PageTransition from './components/PageTransition';
import NotificationToastBridge from './components/NotificationToastBridge';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppProvider>
          <Router>
            <Routes>
              {/* Public SaaS Landing & Auth Routes */}
              <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
              <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
              <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
              <Route path="/auth/google/callback" element={<GoogleOAuthCallback />} />

              {/* Protected Main SaaS Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ErrorBoundary>
                        <PageTransition>
                          <Dashboard />
                        </PageTransition>
                      </ErrorBoundary>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ErrorBoundary>
                        <Projects />
                      </ErrorBoundary>
                    </Layout>
                  </ProtectedRoute>
                }
              />
                            <Route
                path="/projects/:projectId/meeting"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ErrorBoundary>
                        <ProjectMeeting />
                      </ErrorBoundary>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:id"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ErrorBoundary>
                        <ProjectDetails />
                      </ErrorBoundary>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/:projectId/tasks/:taskId"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ErrorBoundary>
                        <TaskDetails />
                      </ErrorBoundary>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ErrorBoundary>
                        <Messages />
                      </ErrorBoundary>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ErrorBoundary>
                        <CalendarPage />
                      </ErrorBoundary>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ErrorBoundary>
                        <Profile />
                      </ErrorBoundary>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ErrorBoundary>
                        <SettingsPage />
                      </ErrorBoundary>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
            <NotificationToastBridge />
          </Router>
        </AppProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;




