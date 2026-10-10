import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import SplashApp from './SplashApp.jsx';
import { LanguageProvider } from './i18n/index.jsx';
import './styles/global.css';

// We use the URL hash to decide which "app" to mount, so that a single Vite
// build can serve both the splash window and the main launcher window.
const route = window.location.hash.replace('#', '') || '/';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <LanguageProvider>
      {route === '/splash' ? <SplashApp /> : <App />}
    </LanguageProvider>
  </React.StrictMode>
);
