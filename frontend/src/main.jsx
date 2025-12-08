import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryProvider } from './providers/QueryProvider';
import { AppProvider } from './context/AppContext';
import './index.css'
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </QueryProvider>
  </React.StrictMode>
);