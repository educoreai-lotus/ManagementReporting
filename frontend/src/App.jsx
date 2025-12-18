// Test CD deploy via Vercel CLI
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/DashboardContainer';
import ChartDetail from './components/ChartDetail/ChartDetailPage';
import ReportsPage from './components/Reports/ReportsPage';
import AICustomPage from './components/AICustom/AICustomPage';
import FloatingChatWidget from './components/Chatbot/FloatingChatWidget';
import './styles/index.css';

// App.jsx with integrated RAG chatbot widget
function App() {
  // Extract auth info for chatbot
  const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('accessToken') || 'DEV_BOT_TOKEN';
  let userId = 'DEV_BOT_USER';
  
  if (token && token !== 'DEV_BOT_TOKEN') {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.userId || payload.sub || payload.id || 'DEV_BOT_USER';
    } catch (error) {
      console.warn('Could not parse JWT for chatbot');
    }
  }

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

      {/* Floating RAG Chatbot Widget */}
      <FloatingChatWidget
        microservice="HR_MANAGEMENT_REPORTING"
        userId={userId}
        token={token}
        tenantId="default"
      />
    </ThemeProvider>
  );
}

export default App;

