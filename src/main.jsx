import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider } from './context/AuthContext'
import { ChildProfileProvider } from './context/ChildProfileContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ChildProfileProvider>
          <App />
          <Analytics />
        </ChildProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
