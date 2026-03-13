import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import MainLayout from './components/layout/MainLayout';
import { appAPI } from './services/api';

// Lazy-loaded pages for code splitting
const loadHomePage = () => import('./pages/HomePage');
const loadLoginPage = () => import('./pages/LoginPage');
const loadRegisterPage = () => import('./pages/RegisterPage');
const loadDashboardPage = () => import('./pages/DashboardPage');
const loadBillingPage = () => import('./pages/BillingPage');
const loadInventoryPage = () => import('./pages/InventoryPage');
const loadSettingsPage = () => import('./pages/SettingsPage');
const loadPurchaseEntryPage = () => import('./pages/PurchaseEntryPage');
const loadPurchaseBillingPage = () => import('./pages/PurchaseBillingPage');
const loadSalesReportsPage = () => import('./pages/SalesReportsPage');
const loadPurchaseReportsPage = () => import('./pages/PurchaseReportsPage');
const loadStockReportsPage = () => import('./pages/StockReportsPage');
const loadCustomerEntryPage = () => import('./pages/CustomerEntryPage');
const loadItemsPage = () => import('./pages/ItemsPage');
const loadSupplierEntryPage = () => import('./pages/SupplierEntryPage');

const HomePage = lazy(loadHomePage);
const LoginPage = lazy(loadLoginPage);
const RegisterPage = lazy(loadRegisterPage);
const DashboardPage = lazy(loadDashboardPage);
const BillingPage = lazy(loadBillingPage);
const InventoryPage = lazy(loadInventoryPage);
const SettingsPage = lazy(loadSettingsPage);
const PurchaseEntryPage = lazy(loadPurchaseEntryPage);
const PurchaseBillingPage = lazy(loadPurchaseBillingPage);
const SalesReportsPage = lazy(loadSalesReportsPage);
const PurchaseReportsPage = lazy(loadPurchaseReportsPage);
const StockReportsPage = lazy(loadStockReportsPage);
const CustomerEntryPage = lazy(loadCustomerEntryPage);
const ItemsPage = lazy(loadItemsPage);
const SupplierEntryPage = lazy(loadSupplierEntryPage);

const prefetchProtectedRoutes = () => {
  loadDashboardPage();
  loadInventoryPage();

  const warmSecondaryRoutes = () => {
    loadBillingPage();
    loadPurchaseEntryPage();
    loadPurchaseBillingPage();
    loadCustomerEntryPage();
    loadSupplierEntryPage();
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(warmSecondaryRoutes, { timeout: 1500 });
  } else {
    window.setTimeout(warmSecondaryRoutes, 500);
  }
};

// Loading fallback
const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px' }}>
    <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#1e40af', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route wrapper (redirect to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

// Simplified page transition — opacity only, fast
const pageVariants = {
  initial: { opacity: 0 },
  in: { opacity: 1 },
  out: { opacity: 0 },
};

const pageTransition = {
  type: 'tween',
  ease: 'easeOut',
  duration: 0.25,
};

// Animated Page Wrapper
const AnimatedPage = ({ children }) => (
  <motion.div
    initial="initial"
    animate="in"
    exit="out"
    variants={pageVariants}
    transition={pageTransition}
    style={{ width: '100%', height: '100%' }}
  >
    {children}
  </motion.div>
);

// Animated Routes Component
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence>
        <Routes location={location} key={location.pathname}>
          {/* Public Home Page - Always accessible */}
          <Route
            path="/"
            element={
              <AnimatedPage>
                <HomePage />
              </AnimatedPage>
            }
          />

          {/* Public Auth Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <AnimatedPage>
                  <LoginPage />
                </AnimatedPage>
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <AnimatedPage>
                  <RegisterPage />
                </AnimatedPage>
              </PublicRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
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

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
};

function App() {
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    appAPI.warmup().catch(() => {
      // Ignore warm-up failures; real requests will handle connectivity errors.
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    let timeoutId = null;
    let idleId = null;

    const schedulePrefetch = () => prefetchProtectedRoutes();

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(schedulePrefetch, { timeout: 1000 });
    } else {
      timeoutId = window.setTimeout(schedulePrefetch, 350);
    }

    return () => {
      if (idleId !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isAuthenticated]);

  const RouterComponent = (window?.electronAPI?.isElectron || window.location.protocol === 'file:')
    ? HashRouter
    : BrowserRouter;

  return (
    <RouterComponent>
      <div className="min-h-screen app-shell">
        <AnimatedRoutes />
      </div>
    </RouterComponent>
  );
}

export default App;
