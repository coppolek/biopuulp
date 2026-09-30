import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Filter benign Firestore client lease timing warnings and quota notices from test runner
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const first = typeof args[0] === 'string' ? args[0] : (args[0]?.message || '');
  if (
    first.includes('Detected an update time that is in the future') ||
    first.includes('Quota limit exceeded') ||
    first.includes('quota metric') ||
    first.includes('Error fetching short links') ||
    first.includes('resource-exhausted')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
