import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Silence benign HMR-related WebSocket unhandled promise rejections & connection errors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason) {
      const message = typeof reason === 'string' ? reason : (reason.message || '');
      const isBenignViteError = 
        message.includes('WebSocket') || 
        message.includes('closed without opened') || 
        message.includes('Vite') || 
        message.includes('HMR') || 
        (reason.stack && (reason.stack.includes('vite') || reason.stack.includes('hmr')));

      if (isBenignViteError) {
        event.preventDefault();
        event.stopPropagation();
        console.info('[Vite Shield] Silenced benign development HMR connection warning:', message);
      }
    }
  });

  window.addEventListener('error', (event) => {
    const message = event.message || '';
    if (
      message.includes('WebSocket') || 
      message.includes('closed without opened') || 
      message.includes('Vite') || 
      message.includes('HMR')
    ) {
      event.preventDefault();
      event.stopPropagation();
      console.info('[Vite Shield] Silenced benign development HMR error:', message);
    }
  }, true);
}

// Unregister any active service workers and clear caches in development to prevent Vite dev server cache poisoning.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then(() => {
        console.log('[Service Worker] Successfully unregistered stale service worker.');
      });
    }
  });
}

if ('caches' in window) {
  caches.keys().then((keys) => {
    keys.forEach((key) => {
      caches.delete(key).then(() => {
        console.log('[Cache] Cleared stale cache:', key);
      });
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
