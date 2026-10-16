import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { openDb } from './storage/db';
import { App } from './ui/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App db={openDb()} />
  </StrictMode>,
);
