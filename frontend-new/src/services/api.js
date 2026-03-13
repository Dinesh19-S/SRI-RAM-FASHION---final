import axios from 'axios';
import { ENDPOINTS } from './endpoints';

const API_PREFIX = '/api/v1';

const normalizeBaseUrl = (url) => String(url || '').replace(/\/+$/, '');

const resolveApiUrl = () => {
    // If running in a browser and NOT on localhost, forcefully use the local /api
    const isLocal = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (typeof window !== 'undefined' && !isLocal) {
        // This MUST be the current origin to avoid calling Render/legacy backends
        return normalizeBaseUrl(`${window.location.origin}/api`);
    }

    // Otherwise, allow environment variables or fallback to localhost
    const explicitUrl = import.meta.env.VITE_API_URL?.trim();
    if (explicitUrl) {
        return normalizeBaseUrl(explicitUrl);
    }

    return normalizeBaseUrl(`http://localhost:5000${API_PREFIX}`);
};

const API_URL = resolveApiUrl();

const CACHE_TTL = {
    SEARCH: 15 * 1000,
    SHORT: 30 * 1000,
    MEDIUM: 60 * 1000,
    LONG: 5 * 60 * 1000,
};

const CACHE_STORAGE_VERSION = 'v1';
const CACHE_STORAGE_PREFIX = `srf:api-cache:${CACHE_STORAGE_VERSION}:`;
const CACHE_STORAGE_INDEX_KEY = `${CACHE_STORAGE_PREFIX}index`;
const CACHE_STORAGE_MAX_ENTRIES = 80;
const MIN_PERSIST_TTL = CACHE_TTL.MEDIUM;
const canUseStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const responseCache = new Map();
const inflightGetRequests = new Map();

const normalizeParams = (params = {}) => {
    if (!params || typeof params !== 'object') return '';
    return Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([key, value]) => {
            if (Array.isArray(value)) {
                return value
                    .map((entry) => `${encodeURIComponent(key)}=${encodeURIComponent(entry)}`)
                    .join('&');
            }
            return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
        })
        .filter(Boolean)
        .join('&');
};

const getCacheKey = (url, params) => {
    const queryString = normalizeParams(params);
    return queryString ? `${url}?${queryString}` : url;
};

const safeParseJSON = (value) => {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};

const getCacheAuthScope = () => {
    if (!canUseStorage) return 'public';
    const token = localStorage.getItem('token') || '';
    return token ? token.slice(0, 16) : 'public';
};

const getPersistStorageKey = (cacheKey, authScoped = true) => {
    const scope = authScoped ? getCacheAuthScope() : 'shared';
    return `${CACHE_STORAGE_PREFIX}${scope}:${encodeURIComponent(cacheKey)}`;
};

const readPersistIndex = () => {
    if (!canUseStorage) return [];
    const parsed = safeParseJSON(localStorage.getItem(CACHE_STORAGE_INDEX_KEY));
    return Array.isArray(parsed) ? parsed : [];
};

const writePersistIndex = (entries) => {
    if (!canUseStorage) return;
    localStorage.setItem(CACHE_STORAGE_INDEX_KEY, JSON.stringify(entries));
};

const prunePersistedCache = () => {
    if (!canUseStorage) return;
    const now = Date.now();
    const nextEntries = readPersistIndex()
        .filter((entry) => {
            if (!entry?.key || !entry?.expiresAt) return false;
            if (entry.expiresAt <= now) {
                localStorage.removeItem(entry.key);
                return false;
            }
            if (localStorage.getItem(entry.key) == null) {
                return false;
            }
            return true;
        })
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    if (nextEntries.length > CACHE_STORAGE_MAX_ENTRIES) {
        const removable = nextEntries.splice(CACHE_STORAGE_MAX_ENTRIES);
        removable.forEach((entry) => localStorage.removeItem(entry.key));
    }

    writePersistIndex(nextEntries);
};

const loadPersistedResponse = (cacheKey, authScoped = true) => {
    if (!canUseStorage) return null;
    const storageKey = getPersistStorageKey(cacheKey, authScoped);
    const parsed = safeParseJSON(localStorage.getItem(storageKey));
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
        localStorage.removeItem(storageKey);
        return null;
    }

    return {
        response: {
            data: parsed.data,
            status: parsed.status || 200,
            statusText: parsed.statusText || 'OK',
            headers: {},
            config: { url: cacheKey, method: 'get', fromPersistentCache: true }
        },
        expiresAt: parsed.expiresAt
    };
};

const persistResponse = (cacheKey, response, ttl, authScoped = true) => {
    if (!canUseStorage || ttl < MIN_PERSIST_TTL) return;

    const expiresAt = Date.now() + ttl;
    const storageKey = getPersistStorageKey(cacheKey, authScoped);
    const payload = {
        data: response?.data,
        status: response?.status || 200,
        statusText: response?.statusText || 'OK',
        expiresAt
    };

    try {
        localStorage.setItem(storageKey, JSON.stringify(payload));
        const updatedAt = Date.now();
        const nextIndex = readPersistIndex()
            .filter((entry) => entry?.key && entry.key !== storageKey)
            .concat([{ key: storageKey, expiresAt, updatedAt }]);
        writePersistIndex(nextIndex);
        prunePersistedCache();
    } catch {
        // Ignore storage quota/private-mode errors.
    }
};

const clearPersistedCache = () => {
    if (!canUseStorage) return;
    const entries = readPersistIndex();
    entries.forEach((entry) => {
        if (entry?.key) {
            localStorage.removeItem(entry.key);
        }
    });
    localStorage.removeItem(CACHE_STORAGE_INDEX_KEY);
};

if (canUseStorage) {
    prunePersistedCache();
}

export const clearAPICache = () => {
    responseCache.clear();
    inflightGetRequests.clear();
    clearPersistedCache();
};

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

api.interceptors.request.use(
    (config) => {
        // Add Private Network Access header for localhost/private network requests
        if (API_URL.includes('localhost') || API_URL.includes('127.0.0.1') || API_URL.includes('192.168') || API_URL.includes('10.')) {
            config.headers['Access-Control-Request-Private-Network'] = 'true';
        }
        
        if (!config.skipAuth) {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

const cachedGet = (url, config = {}, ttl = CACHE_TTL.SHORT) => {
    if (!ttl || ttl <= 0) {
        return api.get(url, config);
    }

    const persist = config?.persist === true;
    const sharedCache = config?.sharedCache === true;
    const normalizedConfig = { ...config };
    delete normalizedConfig.persist;
    delete normalizedConfig.sharedCache;

    const key = getCacheKey(url, config?.params);
    const now = Date.now();
    const cached = responseCache.get(key);

    if (cached && cached.expiresAt > now) {
        return Promise.resolve(cached.response);
    }

    if (persist) {
        const persisted = loadPersistedResponse(key, !sharedCache);
        if (persisted && persisted.expiresAt > now) {
            responseCache.set(key, persisted);
            return Promise.resolve(persisted.response);
        }
    }

    if (inflightGetRequests.has(key)) {
        return inflightGetRequests.get(key);
    }

    const request = api.get(url, normalizedConfig)
        .then((response) => {
            const cacheEntry = {
                response,
                expiresAt: Date.now() + ttl
            };
            responseCache.set(key, cacheEntry);
            if (persist) {
                persistResponse(key, response, ttl, !sharedCache);
            }
            return response;
        })
        .finally(() => {
            inflightGetRequests.delete(key);
        });

    inflightGetRequests.set(key, request);
    return request;
};

api.interceptors.response.use(
    (response) => {
        const method = response?.config?.method?.toLowerCase();
        if (method && method !== 'get') {
            clearAPICache();
        }
        return response;
    },
    (error) => {
        const method = error?.config?.method?.toLowerCase();
        if (method && method !== 'get') {
            clearAPICache();
        }

        const isAuthEndpoint = error.config?.url?.includes('/auth/');
        if (error.response?.status === 401 && !isAuthEndpoint) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export const authAPI = {
    login: (email, password) => api.post(ENDPOINTS.auth.login, { email, password }),
    register: (data) => api.post(ENDPOINTS.auth.register, data),
    sendOTP: (phone) => api.post(ENDPOINTS.auth.sendOtp, { phone }),
    loginPhone: (phone, otp) => api.post(ENDPOINTS.auth.loginPhone, { phone, otp }),
    getProfile: () => api.get(ENDPOINTS.auth.profile),
    googleLogin: (credential) => api.post(ENDPOINTS.auth.google, { credential }),
    forgotPassword: (email) => api.post(ENDPOINTS.auth.forgotPassword, { email }),
    resetPassword: (email, code, newPassword) => api.post(ENDPOINTS.auth.resetPassword, { email, code, newPassword }),
};

export const appAPI = {
    warmup: () => {
        // Non-blocking warmup - fire and forget
        api.get(ENDPOINTS.health, { timeout: 3000, skipAuth: true }).catch(() => {
            // Silently ignore warmup errors
        });
        // Prefetch endpoints if not already in cache
        return authAPI.getProfile().catch(() => null);
    },
    getEndpoints: () => cachedGet(
        ENDPOINTS.endpoints,
        { skipAuth: true, persist: true, sharedCache: true },
        CACHE_TTL.LONG
    ),
};

export const productsAPI = {
    getAll: (params) => {
        const hasSearch = Boolean(params?.search);
        const isFirstPage = !params?.page || Number(params.page) === 1;
        return cachedGet(
            ENDPOINTS.products.list,
            { params, persist: !hasSearch && isFirstPage },
            hasSearch ? CACHE_TTL.SEARCH : CACHE_TTL.MEDIUM
        );
    },
    getById: (id) => cachedGet(ENDPOINTS.products.byId(id), {}, CACHE_TTL.SHORT),
    create: (data) => api.post(ENDPOINTS.products.list, data),
    update: (id, data) => api.put(ENDPOINTS.products.byId(id), data),
    delete: (id) => api.delete(ENDPOINTS.products.byId(id)),
    updateStock: (id, data) => api.post(ENDPOINTS.products.stock(id), data),
    getLowStock: () => cachedGet(ENDPOINTS.products.lowStock, {}, CACHE_TTL.SHORT),
};

export const categoriesAPI = {
    getAll: () => cachedGet(ENDPOINTS.categories.list, { persist: true }, CACHE_TTL.LONG),
    create: (data) => api.post(ENDPOINTS.categories.list, data),
    update: (id, data) => api.put(ENDPOINTS.categories.byId(id), data),
    delete: (id) => api.delete(ENDPOINTS.categories.byId(id)),
};

export const billsAPI = {
    getAll: (params) => {
        const hasSearch = Boolean(params?.search);
        const isFirstPage = !params?.page || Number(params.page) === 1;
        return cachedGet(
            ENDPOINTS.bills.list,
            { params, persist: !hasSearch && isFirstPage },
            hasSearch ? CACHE_TTL.SEARCH : CACHE_TTL.SHORT
        );
    },
    getById: (id) => cachedGet(ENDPOINTS.bills.byId(id), {}, CACHE_TTL.SHORT),
    create: (data) => api.post(ENDPOINTS.bills.list, data),
    update: (id, data) => api.put(ENDPOINTS.bills.byId(id), data),
    delete: (id) => api.delete(ENDPOINTS.bills.byId(id)),
    getStats: (params) => cachedGet(ENDPOINTS.bills.stats, { params }, CACHE_TTL.SHORT),
};

export const inventoryAPI = {
    getMovements: (params) => api.get(ENDPOINTS.inventory.movements, { params }),
    addMovement: (data) => api.post(ENDPOINTS.inventory.movements, data),
    getStats: () => api.get(ENDPOINTS.inventory.stats),
};

export const reportsAPI = {
    getSalesSummary: (params) => cachedGet(ENDPOINTS.reports.salesSummary, { params }, CACHE_TTL.SHORT),
    getSalesTrend: (params) => cachedGet(ENDPOINTS.reports.salesTrend, { params }, CACHE_TTL.SHORT),
    getTopProducts: (params) => cachedGet(ENDPOINTS.reports.topProducts, { params }, CACHE_TTL.SHORT),
    getCategoryPerformance: (params) => cachedGet(ENDPOINTS.reports.categoryPerformance, { params }, CACHE_TTL.SHORT),
    getPaymentMethods: (params) => cachedGet(ENDPOINTS.reports.paymentMethods, { params }, CACHE_TTL.SHORT),
    getStock: (params) => cachedGet(ENDPOINTS.reports.stock, { params }, CACHE_TTL.SHORT),
    getSalesReport: (params) => cachedGet(ENDPOINTS.reports.salesReport, { params }, CACHE_TTL.SHORT),
    getPurchaseReport: (params) => cachedGet(ENDPOINTS.reports.purchaseReport, { params }, CACHE_TTL.SHORT),
    getStockReport: (params) => cachedGet(ENDPOINTS.reports.stockReport, { params }, CACHE_TTL.SHORT),
    getAuditorSales: (params) => cachedGet(ENDPOINTS.reports.auditorSales, { params }, CACHE_TTL.SHORT),
    getAuditorPurchase: (params) => cachedGet(ENDPOINTS.reports.auditorPurchase, { params }, CACHE_TTL.SHORT),
};

export const settingsAPI = {
    get: () => cachedGet(ENDPOINTS.settings.root, { persist: true }, CACHE_TTL.LONG),
    update: (data) => api.put(ENDPOINTS.settings.root, data),
    uploadLogo: (formData) => api.post(ENDPOINTS.settings.logo, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const dashboardAPI = {
    getOverview: (params) => cachedGet(ENDPOINTS.dashboard.overview, { params, persist: true }, CACHE_TTL.SHORT),
    getNotifications: (limit = 5) => cachedGet(ENDPOINTS.dashboard.notifications, { params: { limit }, persist: true }, CACHE_TTL.SHORT),
    getStats: () => cachedGet(ENDPOINTS.dashboard.stats, {}, CACHE_TTL.SHORT),
    getRecentBills: (limit) => cachedGet(ENDPOINTS.dashboard.recentBills, { params: { limit } }, CACHE_TTL.SHORT),
    getRevenueChart: (period) => cachedGet(ENDPOINTS.dashboard.revenueChart, { params: { period } }, CACHE_TTL.SHORT),
    getLowStockAlerts: () => cachedGet(ENDPOINTS.dashboard.lowStockAlerts, {}, CACHE_TTL.SHORT),
    getCategoryStats: () => cachedGet(ENDPOINTS.dashboard.categoryStats, {}, CACHE_TTL.SHORT),
};

export const customersAPI = {
    getAll: (params) => cachedGet(ENDPOINTS.customers.list, { params }, params?.search ? CACHE_TTL.SEARCH : CACHE_TTL.MEDIUM),
    getById: (id) => cachedGet(ENDPOINTS.customers.byId(id), {}, CACHE_TTL.MEDIUM),
    create: (data) => api.post(ENDPOINTS.customers.list, data),
    update: (id, data) => api.put(ENDPOINTS.customers.byId(id), data),
    delete: (id) => api.delete(ENDPOINTS.customers.byId(id)),
};

export const hsnAPI = {
    getAll: (params) => cachedGet(ENDPOINTS.hsn.list, { params }, CACHE_TTL.LONG),
    getById: (id) => cachedGet(ENDPOINTS.hsn.byId(id), {}, CACHE_TTL.LONG),
    create: (data) => api.post(ENDPOINTS.hsn.list, data),
    update: (id, data) => api.put(ENDPOINTS.hsn.byId(id), data),
    delete: (id) => api.delete(ENDPOINTS.hsn.byId(id)),
};

export const suppliersAPI = {
    getAll: (params) => cachedGet(ENDPOINTS.suppliers.list, { params }, params?.search ? CACHE_TTL.SEARCH : CACHE_TTL.MEDIUM),
    getById: (id) => cachedGet(ENDPOINTS.suppliers.byId(id), {}, CACHE_TTL.MEDIUM),
    create: (data) => api.post(ENDPOINTS.suppliers.list, data),
    update: (id, data) => api.put(ENDPOINTS.suppliers.byId(id), data),
    delete: (id) => api.delete(ENDPOINTS.suppliers.byId(id)),
};

export const paymentsAPI = {
    getAll: (params) => cachedGet(ENDPOINTS.payments.list, { params }, CACHE_TTL.SHORT),
    getById: (id) => cachedGet(ENDPOINTS.payments.byId(id), {}, CACHE_TTL.SHORT),
    create: (data) => api.post(ENDPOINTS.payments.list, data),
    update: (id, data) => api.put(ENDPOINTS.payments.byId(id), data),
    delete: (id) => api.delete(ENDPOINTS.payments.byId(id)),
};

export const salesEntriesAPI = {
    getAll: (params) => cachedGet(ENDPOINTS.salesEntries.list, { params }, CACHE_TTL.SHORT),
    getById: (id) => cachedGet(ENDPOINTS.salesEntries.byId(id), {}, CACHE_TTL.SHORT),
    create: (data) => api.post(ENDPOINTS.salesEntries.list, data),
    update: (id, data) => api.put(ENDPOINTS.salesEntries.byId(id), data),
    delete: (id) => api.delete(ENDPOINTS.salesEntries.byId(id)),
    generateBill: (id) => api.post(ENDPOINTS.salesEntries.generateBill(id)),
};

export const purchaseEntriesAPI = {
    getAll: (params) => cachedGet(ENDPOINTS.purchaseEntries.list, { params }, CACHE_TTL.SHORT),
    getById: (id) => cachedGet(ENDPOINTS.purchaseEntries.byId(id), {}, CACHE_TTL.SHORT),
    create: (data) => api.post(ENDPOINTS.purchaseEntries.list, data),
    update: (id, data) => api.put(ENDPOINTS.purchaseEntries.byId(id), data),
    delete: (id) => api.delete(ENDPOINTS.purchaseEntries.byId(id)),
};

export const aiAPI = {
    chat: (message) => api.post(ENDPOINTS.ai.chat, { message }),
    getInsights: () => cachedGet(ENDPOINTS.ai.insights, {}, CACHE_TTL.SHORT),
    getInventoryPredictions: () => cachedGet(ENDPOINTS.ai.inventoryPredictions, {}, CACHE_TTL.SHORT),
    smartSearch: (query) => api.post(ENDPOINTS.ai.search, { query }),
    healthCheck: () => cachedGet(ENDPOINTS.ai.health, {}, CACHE_TTL.SHORT),
};

export const emailAPI = {
    getStatus: () => cachedGet(ENDPOINTS.email.status, {}, CACHE_TTL.SHORT),
    sendTest: (to) => api.post(ENDPOINTS.email.test, to ? { to } : {}),
    sendBill: (billId, to) => api.post(ENDPOINTS.email.sendBill(billId), to ? { to } : {}),
    sendDailySummary: (to) => api.post(ENDPOINTS.email.dailySummary, to ? { to } : {}),
    sendReport: (data) => api.post(ENDPOINTS.email.sendReport, data),
};

export default api;
