import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { IdentityProvider } from './lib/identity.jsx';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <IdentityProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </IdentityProvider>
  </React.StrictMode>
);
