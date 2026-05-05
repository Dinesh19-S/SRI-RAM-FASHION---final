import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import MainLayout from './components/layout/MainLayout';
import { supabase } from './services/supabase';
import { setOnlineStatus } from './store/slices/appSlice';
import { logout as logoutAction, setSession, setSessionChecked } from './store/slices/authSlice';

// Lazy-loaded pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const BillingPage = lazy(() => import('./pages/BillingPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const PurchaseEntryPage = lazy(() => import('./pages/PurchaseEntryPage'));
const PurchaseBillingPage = lazy(() => import('./pages/PurchaseBillingPage'));
const SalesReportsPage = lazy(() => import('./pages/SalesReportsPage'));
const PurchaseReportsPage = lazy(() => import('./pages/PurchaseReportsPage'));
const StockReportsPage = lazy(() => import('./pages/StockReportsPage'));
const CustomerEntryPage = lazy(() => import('./pages/CustomerEntryPage'));
const ItemsPage = lazy(() => import('./pages/ItemsPage'));
const SupplierEntryPage = lazy(() => import('./pages/SupplierEntryPage'));

// Full-screen loading spinner shown while checking auth
const FullScreenLoader = () => (
  <div style={{ 
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
    height: '100vh', width: '100vw', background: '#fff' 
  }}>
    <div style={{ 
      width: '40px', height: '40px', border: '3px solid #e2e8f0', 
      borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.6s linear infinite' 
    }} />
    <p style={{ marginTop: '16px', color: '#6b7280', fontFamily: 'sans-serif', fontSize: '14px' }}>
      Loading Sri Ram Fashions...
    </p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route wrapper
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

// Page transition
const pageVariants = { initial: { opacity: 0 }, in: { opacity: 1 }, out: { opacity: 0 } };
const pageTransition = { duration: 0.2 };
const AnimatedPage = ({ children }) => (
  <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
    {children}
  </motion.div>
);

function App() {
  const { isInitializing } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // ── Auth initialization: runs ONCE on mount ──
  useEffect(() => {
    let isMounted = true;

    // Step 1: Listen for auth state changes (fires for Google OAuth redirect too)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (session) {
          dispatch(setSession({ 
            token: session.access_token, 
            user: session.user 
          }));
          
          // Navigate to dashboard if we're on a public page
          const currentPath = window.location.pathname;
          if (currentPath === '/login' || currentPath === '/register' || currentPath === '/') {
            navigate('/dashboard', { replace: true });
          }
        } else {
          // INITIAL_SESSION with no session means user is not logged in
          dispatch(setSessionChecked());
        }
      } else if (event === 'SIGNED_OUT') {
        dispatch(logoutAction());
      }
    });

    // Step 2: Online/Offline
    const handleOnline = () => dispatch(setOnlineStatus(true));
    const handleOffline = () => dispatch(setOnlineStatus(false));
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); // Empty deps — run only once

  // ── Show loading screen until Supabase has checked the session ──
  if (isInitializing) {
    return <FullScreenLoader />;
  }

  return (
    <Suspense fallback={<FullScreenLoader />}>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<PublicRoute><HomePage /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          
          <Route path="/dashboard" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="purchase/entry" element={<PurchaseEntryPage />} />
            <Route path="purchase/billing" element={<PurchaseBillingPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="reports/sales" element={<SalesReportsPage />} />
            <Route path="reports/purchase" element={<PurchaseReportsPage />} />
            <Route path="reports/stock" element={<StockReportsPage />} />
            <Route path="master/customers" element={<CustomerEntryPage />} />
            <Route path="master/items" element={<ItemsPage />} />
            <Route path="master/suppliers" element={<SupplierEntryPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}

export default App;
