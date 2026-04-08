import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

const ingestAccessTokenFromHash = () => {
  const hash = window.location.hash || '';
  if (!hash.startsWith('#')) return;

  const hashParams = new URLSearchParams(hash.slice(1));
  const accessToken = hashParams.get('access_token');

  if (typeof accessToken !== 'string' || accessToken.trim() === '') {
    return;
  }

  localStorage.setItem('authToken', accessToken.trim());

  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, '', cleanUrl);
};

ingestAccessTokenFromHash();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

