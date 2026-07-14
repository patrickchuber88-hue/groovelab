import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Automatically redirect localhost subdomains to the main localhost origin with query parameters to bypass CORS and script import errors.
if (typeof window !== 'undefined' && window.location.hostname.includes('localhost') && window.location.hostname !== 'localhost') {
  const parts = window.location.hostname.split('.');
  if (parts.length === 2 && parts[1] === 'localhost') {
    const subdomain = parts[0];
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('subdomain', subdomain);
    window.location.href = `${window.location.protocol}//localhost:${window.location.port}${window.location.pathname}?${urlParams.toString()}`;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
