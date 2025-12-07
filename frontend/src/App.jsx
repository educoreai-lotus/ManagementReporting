// Test CD deploy via Vercel CLI
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/DashboardContainer';
import ChartDetail from './components/ChartDetail/ChartDetailPage';
import ReportsPage from './components/Reports/ReportsPage';
import AICustomPage from './components/AICustom/AICustomPage';
import './styles/index.css';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/chart/:chartId" element={<ChartDetail />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/ai-custom" element={<AICustomPage />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;

