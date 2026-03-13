import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { store } from './store'
import { ToastProvider } from './components/common'
import { getGoogleLoginStatus } from './utils/authRuntime'
import './index.css'
import App from './App.jsx'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
const GOOGLE_LOGIN_STATUS = getGoogleLoginStatus();
const ENABLE_GOOGLE_PROVIDER = GOOGLE_LOGIN_STATUS.enabled && Boolean(GOOGLE_CLIENT_ID);

// Application always in light mode - theme system removed

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {ENABLE_GOOGLE_PROVIDER ? (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <Provider store={store}>
          <ToastProvider>
            <App />
          </ToastProvider>
        </Provider>
      </GoogleOAuthProvider>
    ) : (
      <Provider store={store}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </Provider>
    )}
  </StrictMode>,
)
