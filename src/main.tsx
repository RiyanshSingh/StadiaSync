import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('[main.tsx] App mounting starting...');

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  console.log('[main.tsx] App mounting success (render called)');
} catch (e) {
  console.error('[main.tsx] App mounting crashed!', e);
}

