import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerMonetagServiceWorker } from './lib/monetag';

// Register official Monetag Service Worker (/sw.js)
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') {
    registerMonetagServiceWorker();
  } else {
    window.addEventListener('load', () => {
      registerMonetagServiceWorker();
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
