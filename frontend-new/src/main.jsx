import { Fragment, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import { ToastProvider } from './components/common'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'

const RootWrapper = import.meta.env.DEV ? Fragment : StrictMode;

createRoot(document.getElementById('root')).render(
  <RootWrapper>
    <Provider store={store}>
      <ToastProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ToastProvider>
    </Provider>
  </RootWrapper>,
)
