import { Fragment, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import { ToastProvider } from './components/common'
import './index.css'
import { HashRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'

const RootWrapper = import.meta.env.DEV ? Fragment : StrictMode;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "70478872500-1drce72segim48l21r8nm80289q39ndk.apps.googleusercontent.com";

createRoot(document.getElementById('root')).render(
  <RootWrapper>
    <Provider store={store}>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <ToastProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </ToastProvider>
      </GoogleOAuthProvider>
    </Provider>
  </RootWrapper>,
)
