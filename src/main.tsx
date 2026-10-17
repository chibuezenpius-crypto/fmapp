import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'flag-icons/css/flag-icons.min.css'
import './index.css'
import App from './App.tsx'
import UnemployedScreen from './UnemployedScreen.tsx'
import ErrorBoundary from './ErrorBoundary.tsx'
import { readCareer } from './state/saveData'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {readCareer().status === 'unemployed' ? <UnemployedScreen /> : <App />}
    </ErrorBoundary>
  </StrictMode>,
)
