const encodeId = (value) => encodeURIComponent(String(value ?? ''));

export const ENDPOINTS = {
    health: '/health',
    endpoints: '/endpoints',
    auth: {
        login: '/auth/login',
        register: '/auth/register',
        sendOtp: '/auth/send-otp',
        loginPhone: '/auth/login-phone',
        profile: '/auth/profile',
        google: '/auth/google',
        forgotPassword: '/auth/forgot-password',
        resetPassword: '/auth/reset-password'
    },
    products: {
        list: '/products',
        byId: (id) => `/products/${encodeId(id)}`,
        stock: (id) => `/products/${encodeId(id)}/stock`,
        lowStock: '/products/low-stock'
    },
    categories: {
        list: '/categories',
        byId: (id) => `/categories/${encodeId(id)}`
    },
    bills: {
        list: '/bills',
        stats: '/bills/stats',
        byId: (id) => `/bills/${encodeId(id)}`
    },
    inventory: {
        movements: '/inventory/movements',
        stats: '/inventory/stats'
    },
    reports: {
        salesSummary: '/reports/sales-summary',
        salesTrend: '/reports/sales-trend',
        topProducts: '/reports/top-products',
        categoryPerformance: '/reports/category-performance',
        paymentMethods: '/reports/payment-methods',
        stock: '/reports/stock',
        salesReport: '/reports/sales-report',
        purchaseReport: '/reports/purchase-report',
        stockReport: '/reports/stock-report',
        auditorSales: '/reports/auditor-sales',
        auditorPurchase: '/reports/auditor-purchase'
    },
    settings: {
        root: '/settings',
        logo: '/settings/logo'
    },
    dashboard: {
        overview: '/dashboard/overview',
        notifications: '/dashboard/notifications',
        stats: '/dashboard/stats',
        recentBills: '/dashboard/recent-bills',
        revenueChart: '/dashboard/revenue-chart',
        lowStockAlerts: '/dashboard/low-stock-alerts',
        categoryStats: '/dashboard/category-stats'
    },
    customers: {
        list: '/customers',
        byId: (id) => `/customers/${encodeId(id)}`
    },
    hsn: {
        list: '/hsn',
        byId: (id) => `/hsn/${encodeId(id)}`
    },
    suppliers: {
        list: '/suppliers',
        byId: (id) => `/suppliers/${encodeId(id)}`
    },
    payments: {
        list: '/payments',
        byId: (id) => `/payments/${encodeId(id)}`
    },
    salesEntries: {
        list: '/sales-entries',
        byId: (id) => `/sales-entries/${encodeId(id)}`,
        generateBill: (id) => `/sales-entries/${encodeId(id)}/generate-bill`
    },
    purchaseEntries: {
        list: '/purchase-entries',
        byId: (id) => `/purchase-entries/${encodeId(id)}`
    },
    ai: {
        chat: '/ai/chat',
        insights: '/ai/insights',
        inventoryPredictions: '/ai/inventory-predictions',
        search: '/ai/search',
        health: '/ai/health'
    },
    email: {
        status: '/email/status',
        test: '/email/test',
        sendBill: (billId) => `/email/send-bill/${encodeId(billId)}`,
        dailySummary: '/email/daily-summary',
        sendReport: '/email/send-report'
    }
};

export default ENDPOINTS;
