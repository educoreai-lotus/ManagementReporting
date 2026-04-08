// Test CD deploy via Vercel CLI
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/DashboardContainer';
import ChartDetail from './components/ChartDetail/ChartDetailPage';
import ReportsPage from './components/Reports/ReportsPage';
import AICustomPage from './components/AICustom/AICustomPage';
import './styles/index.css';

const hasAuthToken = () => {
  const token = localStorage.getItem('authToken');
  return typeof token === 'string' && token.trim() !== '';
};

const AdminProtectedRoute = ({ children }) => {
  if (!hasAuthToken()) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
};

const HomeRedirect = () => {
  return <Navigate to={hasAuthToken() ? '/dashboard' : '/unauthorized'} replace />;
};

const UnauthorizedPage = () => (
  <div className="card max-w-xl mx-auto mt-10">
    <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">Access denied</h1>
    <p className="text-neutral-600 dark:text-neutral-400">
      You must be an authenticated System Administrator to use this service.
    </p>
  </div>
);

// App.jsx is compatible with third-party floating widgets (e.g., RAG chatbot)
// No overflow:hidden, no container restrictions, no DOM manipulation that would block portal-based UI
function App() {
  return (
    <ThemeProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route
              path="/dashboard"
              element={
                <AdminProtectedRoute>
                  <Dashboard />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/dashboard/chart/:chartId"
              element={
                <AdminProtectedRoute>
                  <ChartDetail />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <AdminProtectedRoute>
                  <ReportsPage />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/ai-custom"
              element={
                <AdminProtectedRoute>
                  <AICustomPage />
                </AdminProtectedRoute>
              }
            />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>

      {/* RAG Chatbot Container - Floating widget appears on all pages */}
    </ThemeProvider>
  );
}

export default App;

