import axios from 'axios';
import { ENDPOINTS } from './endpoints';

const API_PREFIX = '/api/v1';

const normalizeBaseUrl = (url) => String(url || '').replace(/\/+$/, '');

const resolveApiUrl = () => {
    // Prefer an explicit API host when provided (useful for local development or testing).
    const explicitUrl = import.meta.env.VITE_API_URL?.trim();
    if (explicitUrl) {
        return normalizeBaseUrl(explicitUrl);
    }

    // If running in a browser and NOT on localhost, use the same origin + /api.
    // This matches Vercel and other serverless environments where the API is hosted
    // on the same domain as the frontend.
    const isLocalHost = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname === '::1');

    if (typeof window !== 'undefined' && !isLocalHost) {
        return normalizeBaseUrl(`${window.location.origin}/api`);
    }

    // Local development
    return normalizeBaseUrl(`http://localhost:5000${API_PREFIX}`);
};

const API_URL = resolveApiUrl();

/**
 * Data Mapping Utilities
 * Normalizes backend responses to the format expected by the UI.
 */
const mapProduct = (p) => {
    if (!p) return null;
    const id = p._id || p.id;
    return {
        ...p,
        _id: id,
        id: id,
        sellingPrice: Number(p.sellingPrice || p.mrp || 0),
        mrp: Number(p.mrp || 0),
        lowStockThreshold: p.lowStockThreshold || 5,
        isActive: p.isActive !== false,
        category: p.category || null
    };
};

const mapBillItem = (item) => {
    if (!item) return null;
    const id = item._id || item.id;
    return {
        ...item,
        _id: id,
        id: id,
        name: item.name || item.productName || '',
        productName: item.productName || item.name || '',
        quantity: Number(item.quantity || 0),
        price: Number(item.price || item.rate || 0),
        total: Number(item.total || 0),
        gstRate: Number(item.gstRate || 0),
    };
};

const mapBill = (b) => {
    if (!b) return null;
    const id = b._id || b.id;
    
    return {
        ...b,
        _id: id,
        id: id,
        billNumber: b.billNumber,
        paymentStatus: b.paymentStatus || 'pending',
        paymentMethod: b.paymentMethod || 'cash',
        paymentDetails: b.paymentDetails || {},
        billType: (b.billType || 'SALES').toUpperCase(),
        grandTotal: Number(b.grandTotal || 0),
        subtotal: Number(b.subtotal || 0),
        totalTax: Number(b.totalTax || 0),
        taxableAmount: Number(b.taxableAmount || 0),
        discountAmount: Number(b.discountAmount || 0),
        roundOff: Number(b.roundOff || 0),
        cgst: Number(b.cgst || 0),
        sgst: Number(b.sgst || 0),
        igst: Number(b.igst || 0),
        partyName: b.customer?.name || '',
        transport: b.transport || '',
        fromText: b.fromText || '',
        toText: b.toText || '',
        totalPacks: b.totalPacks || 0,
        numOfBundles: b.numOfBundles || 1,
        amountInWords: b.amountInWords || '',
        customer: b.customer || {},
        items: Array.isArray(b.items) ? b.items : []
    };
};

const flattenBillItems = (bills) => {
    let flattened = [];
    let sno = 1;
    (bills || []).forEach(bill => {
        const items = Array.isArray(bill.items) ? bill.items : [];
        items.forEach(item => {
            flattened.push({
                sno: sno++,
                date: bill.date,
                invNo: bill.billNumber || bill.invoiceNumber,
                item: item.productName || item.particular || 'N/A',
                rate: Number(item.price || item.rate || 0),
                qty: Number(item.quantity || item.qty || 0),
                taxableAmount: Number(item.taxableAmount || 0),
                cgst: Number(item.cgst || 0),
                sgst: Number(item.sgst || 0),
                igst: Number(item.igst || 0),
                total: Number(item.total || 0)
            });
        });
    });
    return flattened;
};

/**
 * Data Preparation Utilities
 * MongoDB uses camelCase, so no conversion needed
 */
const prepareProductData = (data) => {
    const categoryId =
        data.categoryId ||
        (typeof data.category === 'string'
            ? data.category
            : (data.category?._id || data.category?.id));

    return {
        name: data.name,
        sku: data.sku || (data.hsn || '') + Date.now().toString().slice(-4),
        description: data.description || '',
        category: categoryId,
        mrp: Number(data.mrp || data.sellingPrice || 0),
        sellingPrice: Number(data.sellingPrice || 0),
        stock: Number(data.stock || 0),
        lowStockThreshold: Number(data.lowStockThreshold || 5),
        unit: data.unit || 'pcs',
        size: data.size || '',
        hsn: data.hsn || '',
        gstRate: Number(data.gstRate || 12),
        isActive: data.isActive !== false
    };
};

const prepareCustomerData = (data) => {
    return {
        companyName: data.companyName,
        mobile: data.mobile,
        alternateNo: data.alternateNo || '',
        email: data.email || '',
        gstin: data.gstin || '',
        state: data.state || 'Tamilnadu',
        stateCode: data.stateCode || '33',
        address: data.address || '',
        placeOfSupply: data.placeOfSupply || '',
        isActive: data.isActive !== false
    };
};

const prepareFabricPurchaseData = (data) => {
    return {
        supplier_name: data.supplier_name,
        gstin: data.gstin || '',
        mobile: data.mobile || '',
        invoice_number: data.invoice_number,
        invoice_date: data.invoice_date,
        transport: data.transport || '',
        vehicle_number: data.vehicle_number || '',
        lr_number: data.lr_number || '',
        items: Array.isArray(data.items) ? data.items.map(item => ({
            fabric_name: item.fabric_name,
            color: item.color || '',
            gsm: Number(item.gsm || 0),
            roll_no: item.roll_no || '',
            weight_kg: Number(item.weight_kg || 0),
            rate_per_kg: Number(item.rate_per_kg || 0)
        })) : []
    };
};

const handleError = async (error) => {
    const status = error?.response?.status;
    const message = String(error?.response?.data?.message || error?.message || '');

    const isAuthFailure = status === 401 || 
        message.toLowerCase().includes('unauthorized') ||
        message.toLowerCase().includes('invalid token') ||
        message.toLowerCase().includes('expired');

    if (isAuthFailure) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }

    throw error;
};

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
        data: parsed.data,
        status: parsed.status || 200,
        statusText: parsed.statusText || 'OK',
        headers: {},
        config: { url: cacheKey, method: 'get', fromPersistentCache: true }
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
    login: async (email, password) => {
        try {
            const response = await api.post('/auth/login', { email, password }, { skipAuth: true });
            return { data: response.data };
        } catch (error) {
            throw handleError(error);
        }
    },
    register: async (data) => {
        try {
            const response = await api.post('/auth/register', data, { skipAuth: true });
            return { data: response.data };
        } catch (error) {
            throw handleError(error);
        }
    },
    sendOTP: async (phone) => {
        try {
            const response = await api.post('/auth/send-otp', { phone }, { skipAuth: true });
            return { data: response.data };
        } catch (error) {
            throw handleError(error);
        }
    },
    loginPhone: async (phone, token) => {
        try {
            const response = await api.post('/auth/login-phone', { phone, token }, { skipAuth: true });
            return { data: response.data };
        } catch (error) {
            throw handleError(error);
        }
    },
    getProfile: async () => {
        try {
            const response = await api.get('/auth/profile');
            return { data: response.data };
        } catch (error) {
            throw handleError(error);
        }
    },
    forgotPassword: async (email) => {
        try {
            const response = await api.post('/auth/forgot-password', { email }, { skipAuth: true });
            return { data: response.data };
        } catch (error) {
            throw handleError(error);
        }
    },
    resetPassword: async (email, code, newPassword) => {
        try {
            const response = await api.post('/auth/reset-password', { email, code, newPassword }, { skipAuth: true });
            return { data: response.data };
        } catch (error) {
            throw handleError(error);
        }
    },
    signInWithGoogle: async (credential) => {
        try {
            const response = await api.post('/auth/google', { credential }, { skipAuth: true });
            return { data: response.data };
        } catch (error) {
            throw handleError(error);
        }
    },
};

export const appAPI = {
    warmup: async () => {
        try {
            const response = await cachedGet(ENDPOINTS.health, {}, CACHE_TTL.SHORT);
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    getEndpoints: () => cachedGet(
        ENDPOINTS.endpoints,
        { skipAuth: true, persist: true, sharedCache: true },
        CACHE_TTL.LONG
    ),
};

export const productsAPI = {
    getAll: async (params) => {
        try {
            const response = await cachedGet(ENDPOINTS.products.list, { params }, CACHE_TTL.SHORT);
            return { data: { success: true, data: response.data?.data?.map(mapProduct) || [], pagination: response.data?.pagination } };
        } catch (error) {
            throw handleError(error);
        }
    },
    getById: async (id) => {
        try {
            const response = await cachedGet(ENDPOINTS.products.byId(id), {}, CACHE_TTL.MEDIUM);
            return { data: { success: true, data: mapProduct(response.data?.data) } };
        } catch (error) {
            throw handleError(error);
        }
    },
    create: async (data) => {
        try {
            const response = await api.post(ENDPOINTS.products.list, prepareProductData(data));
            return { data: { success: true, data: mapProduct(response.data?.data) } };
        } catch (error) {
            throw handleError(error);
        }
    },
    update: async (id, data) => {
        try {
            const response = await api.put(ENDPOINTS.products.byId(id), prepareProductData(data));
            return { data: { success: true, data: mapProduct(response.data?.data) } };
        } catch (error) {
            throw handleError(error);
        }
    },
    delete: async (id) => {
        try {
            await api.delete(ENDPOINTS.products.byId(id));
            return { data: { success: true } };
        } catch (error) {
            throw handleError(error);
        }
    },
    updateStock: async (id, { quantity, type, reason }) => {
        try {
            const response = await api.post(ENDPOINTS.products.stock(id), { quantity, type, reason });
            return { data: { success: true, data: mapProduct(response.data?.data) } };
        } catch (error) {
            throw handleError(error);
        }
    },
    getLowStock: async () => {
        try {
            const response = await cachedGet(ENDPOINTS.products.lowStock, {}, CACHE_TTL.SHORT);
            return { data: { success: true, data: response.data?.data?.map(mapProduct) || [] } };
        } catch (error) {
            throw handleError(error);
        }
    },
};

export const categoriesAPI = {
    getAll: async () => {
        try {
            const response = await api.get(ENDPOINTS.categories.list);
            return response;
        } catch (error) {
            throw handleError(error);
        }
    },
    create: async (data) => {
        try {
            const response = await api.post(ENDPOINTS.categories.list, data);
            return response;
        } catch (error) {
            throw handleError(error);
        }
    },
    update: async (id, data) => {
        try {
            const response = await api.put(ENDPOINTS.categories.byId(id), data);
            return response;
        } catch (error) {
            throw handleError(error);
        }
    },
    delete: async (id) => {
        try {
            const response = await api.delete(ENDPOINTS.categories.byId(id));
            return response;
        } catch (error) {
            throw handleError(error);
        }
    },
};

// Helper function to get auth token
const getAuthToken = () => {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        return localStorage.getItem('token') || '';
    }
    return '';
};

export const billsAPI = {
    getAll: async (params) => {
        try {
            const queryString = new URLSearchParams();
            if (params?.search) queryString.append('search', params.search);
            if (params?.status) queryString.append('status', params.status);
            if (params?.billType) queryString.append('billType', params.billType);
            if (params?.page) queryString.append('page', params.page);
            if (params?.limit) queryString.append('limit', params.limit);

            const response = await axios.get(`${API_URL}/bills?${queryString}`, {
                headers: { Authorization: `Bearer ${getAuthToken()}` }
            });

            return {
                data: {
                    success: true,
                    data: response.data?.data?.map(mapBill) || [],
                    pagination: response.data?.pagination || {}
                }
            };
        } catch (error) {
            throw new Error(error.response?.data?.message || error.message || 'Failed to fetch bills');
        }
    },

    getById: async (id) => {
        try {
            const response = await axios.get(`${API_URL}/bills/${id}`, {
                headers: { Authorization: `Bearer ${getAuthToken()}` }
            });

            return {
                data: {
                    success: true,
                    data: mapBill(response.data?.data)
                }
            };
        } catch (error) {
            throw new Error(error.response?.data?.message || error.message || 'Failed to fetch bill');
        }
    },

    create: async (data) => {
        try {
            const response = await axios.post(`${API_URL}/bills`, data, {
                headers: { Authorization: `Bearer ${getAuthToken()}` }
            });

            return {
                data: {
                    success: true,
                    data: mapBill(response.data?.data)
                }
            };
        } catch (error) {
            throw new Error(error.response?.data?.message || error.message || 'Failed to create bill');
        }
    },

    update: async (id, data) => {
        try {
            const response = await axios.put(`${API_URL}/bills/${id}`, data, {
                headers: { Authorization: `Bearer ${getAuthToken()}` }
            });

            return {
                data: {
                    success: true,
                    data: mapBill(response.data?.data)
                }
            };
        } catch (error) {
            throw new Error(error.response?.data?.message || error.message || 'Failed to update bill');
        }
    },

    delete: async (id) => {
        try {
            await axios.delete(`${API_URL}/bills/${id}`, {
                headers: { Authorization: `Bearer ${getAuthToken()}` }
            });

            return { data: { success: true } };
        } catch (error) {
            throw new Error(error.response?.data?.message || error.message || 'Failed to delete bill');
        }
    },

    getStats: async (params) => {
        try {
            const queryString = new URLSearchParams();
            if (params?.startDate) queryString.append('startDate', params.startDate);
            if (params?.endDate) queryString.append('endDate', params.endDate);

            const response = await axios.get(`${API_URL}/bills/stats?${queryString}`, {
                headers: { Authorization: `Bearer ${getAuthToken()}` }
            });

            return { data: { success: true, data: response.data?.data || {} } };
        } catch (error) {
            // Return mock data on error to prevent UI crashes
            return { data: { success: true, data: { totalSales: 0, totalOrders: 0, averageOrderValue: 0 } } };
        }
    }
};

export const inventoryAPI = {
    getMovements: async (params) => {
        try {
            const response = await api.get(ENDPOINTS.inventory.movements, { params });
            return { data: { success: true, data: response.data?.data || [] } };
        } catch (error) {
            throw handleError(error);
        }
    },
    addMovement: async (data) => {
        try {
            const response = await api.post(ENDPOINTS.inventory.movements, data);
            return { data: { success: true, data: response.data?.data } };
        } catch (error) {
            throw handleError(error);
        }
    },
    getStats: async () => {
        try {
            const response = await cachedGet(ENDPOINTS.inventory.stats, {}, CACHE_TTL.SHORT);
            return { data: { success: true, data: response.data?.data || { totalItems: 0, lowStockCount: 0 } } };
        } catch (error) {
            return { data: { success: true, data: { totalItems: 0, lowStockCount: 0 } } };
        }
    },
};

export const reportsAPI = {
    getSalesSummary: async (params) => {
        try {
            const response = await cachedGet(ENDPOINTS.reports.salesSummary, { params }, CACHE_TTL.SHORT);
            return { data: { success: true, data: response.data?.data } };
        } catch (error) {
            throw handleError(error);
        }
    },
    getSalesReport: async (params) => {
        try {
            const response = await api.get(ENDPOINTS.reports.salesReport, { params });
            return { data: { success: true, data: response.data?.data || [] } };
        } catch (error) {
            throw handleError(error);
        }
    },
    getPurchaseReport: async (params) => {
        try {
            const response = await api.get(ENDPOINTS.reports.purchaseReport, { params });
            return { data: { success: true, data: response.data?.data || [] } };
        } catch (error) {
            throw handleError(error);
        }
    },
    getStockReport: async (params) => {
        try {
            const response = await api.get(ENDPOINTS.reports.stockReport, { params });
            return { data: { success: true, data: response.data?.data || [] } };
        } catch (error) {
            throw handleError(error);
        }
    }
};

export const settingsAPI = {
    get: async () => {
        try {
            const response = await cachedGet(ENDPOINTS.settings.root, {}, CACHE_TTL.LONG);
            return { data: { success: true, data: response.data?.data || {} } };
        } catch (error) {
            throw handleError(error);
        }
    },
    update: async (data) => {
        try {
            const response = await api.put(ENDPOINTS.settings.root, data);
            return { data: { success: true, data: response.data?.data } };
        } catch (error) {
            throw handleError(error);
        }
    },
    uploadLogo: (formData) => api.post(ENDPOINTS.settings.logo, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const dashboardAPI = {
    getOverview: async (params) => {
        try {
            const response = await api.get(ENDPOINTS.dashboard.overview);
            return response;
        } catch (error) {
            throw handleError(error);
        }
    },
    getRevenueChart: async (period) => {
        try {
            const response = await api.get(ENDPOINTS.dashboard.revenueChart, {
                params: { period }
            });
            return response;
        } catch (error) {
            throw handleError(error);
        }
    },
    getNotifications: async (limit = 5) => {
        try {
            const response = await api.get(ENDPOINTS.dashboard.notifications, {
                params: { limit }
            });
            return response;
        } catch (error) {
            throw handleError(error);
        }
    }
};

export const customersAPI = {
    getAll: async (params) => {
        try {
            const response = await api.get(ENDPOINTS.customers.list, { params });
            return response;
        } catch (error) {
            throw handleError(error);
        }
    },
    getById: async (id) => {
        try {
            const response = await api.get(ENDPOINTS.customers.byId(id));
            return response;
        } catch (error) {
            throw handleError(error);
        }
    },
    create: async (data) => {
        try {
            const customerData = prepareCustomerData(data);
            const response = await api.post(ENDPOINTS.customers.list, customerData);
            return response;
        } catch (error) {
            throw handleError(error);
        }
    },
    update: async (id, data) => {
        try {
            const customerData = prepareCustomerData(data);
            const response = await api.put(ENDPOINTS.customers.byId(id), customerData);
            return response;
        } catch (error) {
            throw handleError(error);
        }
    },
    delete: async (id) => {
        try {
            const response = await api.delete(ENDPOINTS.customers.byId(id));
            return response;
        } catch (error) {
            throw handleError(error);
        }
    },
};

export const hsnAPI = {
    getAll: async (params) => {
        try {
            const response = await cachedGet(ENDPOINTS.hsn.list, { params }, CACHE_TTL.LONG);
            return { data: { success: true, data: response.data?.data || [] } };
        } catch (error) {
            throw handleError(error);
        }
    },
    getById: async (id) => {
        try {
            const response = await cachedGet(ENDPOINTS.hsn.byId(id), {}, CACHE_TTL.LONG);
            return { data: { success: true, data: response.data?.data } };
        } catch (error) {
            throw handleError(error);
        }
    },
    create: async (data) => {
        try {
            const response = await api.post(ENDPOINTS.hsn.list, data);
            return { data: { success: true, data: response.data?.data } };
        } catch (error) {
            throw handleError(error);
        }
    },
    update: async (id, data) => {
        try {
            const response = await api.put(ENDPOINTS.hsn.byId(id), data);
            return { data: { success: true, data: response.data?.data } };
        } catch (error) {
            throw handleError(error);
        }
    },
    delete: async (id) => {
        try {
            await api.delete(ENDPOINTS.hsn.byId(id));
            return { data: { success: true } };
        } catch (error) {
            throw handleError(error);
        }
    },
};

export const suppliersAPI = {
    getAll: async (params) => {
        try {
            const response = await cachedGet(ENDPOINTS.suppliers.list, { params }, CACHE_TTL.SHORT);
            return { data: { success: true, data: response.data?.data || [] } };
        } catch (error) {
            throw handleError(error);
        }
    },
    getById: async (id) => {
        try {
            const response = await cachedGet(ENDPOINTS.suppliers.byId(id), {}, CACHE_TTL.MEDIUM);
            return { data: { success: true, data: response.data?.data } };
        } catch (error) {
            throw handleError(error);
        }
    },
    create: async (data) => {
        try {
            const response = await api.post(ENDPOINTS.suppliers.list, data);
            return { data: { success: true, data: response.data?.data } };
        } catch (error) {
            throw handleError(error);
        }
    },
    update: async (id, data) => {
        try {
            const response = await api.put(ENDPOINTS.suppliers.byId(id), data);
            return { data: { success: true, data: response.data?.data } };
        } catch (error) {
            throw handleError(error);
        }
    },
    delete: async (id) => {
        try {
            await api.delete(ENDPOINTS.suppliers.byId(id));
            return { data: { success: true } };
        } catch (error) {
            throw handleError(error);
        }
    },
};

export const paymentsAPI = {
    getAll: async (params) => {
        try {
            const response = await api.get(ENDPOINTS.payments.list, { params });
            return { data: { success: true, data: response.data?.data || [] } };
        } catch (error) {
            throw handleError(error);
        }
    },
    getById: async (id) => {
        try {
            const response = await api.get(ENDPOINTS.payments.byId(id));
            return { data: { success: true, data: response.data?.data } };
        } catch (error) {
            throw handleError(error);
        }
    },
    create: async (data) => {
        try {
            const response = await api.post(ENDPOINTS.payments.list, data);
            return { data: { success: true, data: response.data?.data } };
        } catch (error) {
            throw handleError(error);
        }
    },
    update: async (id, data) => {
        try {
            const response = await api.put(ENDPOINTS.payments.byId(id), data);
            return { data: { success: true, data: response.data?.data } };
        } catch (error) {
            throw handleError(error);
        }
    },
    delete: async (id) => {
        try {
            await api.delete(ENDPOINTS.payments.byId(id));
            return { data: { success: true } };
        } catch (error) {
            throw handleError(error);
        }
    },
};

export const salesEntriesAPI = {
    getAll: async (params) => {
        try {
            const response = await api.get(ENDPOINTS.salesEntries.list, { params });
            return { data: { success: true, data: response.data?.data || [] } };
        } catch (error) {
            throw handleError(error);
        }
    },
    getById: async (id) => {
        try {
            const response = await api.get(ENDPOINTS.salesEntries.byId(id));
            return { data: { success: true, data: response.data?.data } };
        } catch (error) {
            throw handleError(error);
        }
    },
    create: async (data) => {
        try {
            const response = await api.post(ENDPOINTS.salesEntries.list, data);
            return { data: { success: true, data: response.data?.data } };
        } catch (error) {
            throw handleError(error);
        }
    },
    update: async (id, data) => {
        try {
            const response = await api.put(ENDPOINTS.salesEntries.byId(id), data);
            return { data: { success: true, data: response.data?.data } };
        } catch (error) {
            throw handleError(error);
        }
    },
    delete: async (id) => {
        try {
            await api.delete(ENDPOINTS.salesEntries.byId(id));
            return { data: { success: true } };
        } catch (error) {
            throw handleError(error);
        }
    },
    generateBill: (id) => api.post(ENDPOINTS.salesEntries.generateBill(id)),
};

export const purchaseEntriesAPI = {
    getAll: async (params) => {
        try {
            const response = await api.get(ENDPOINTS.purchaseEntries.list, { params });
            return { data: { success: true, data: response.data?.data || [], pagination: response.data?.pagination } };
        } catch (error) {
            throw handleError(error);
        }
    },
    getById: async (id) => {
        try {
            const response = await api.get(ENDPOINTS.purchaseEntries.byId(id));
            return { data: { success: true, data: response.data?.data } };
        } catch (error) {
            throw handleError(error);
        }
    },
    create: async (data) => {
        try {
            const entryData = preparePurchaseData(data);
            const response = await api.post(ENDPOINTS.purchaseEntries.list, entryData);
            return { data: { success: true, data: response.data?.data } };
        } catch (error) {
            throw handleError(error);
        }
    },
    update: async (id, data) => {
        try {
            const entryData = preparePurchaseData(data);
            const response = await api.put(ENDPOINTS.purchaseEntries.byId(id), entryData);
            return response;
        } catch (error) {
            throw handleError(error);
        }
    },
    delete: async (id) => {
        try {
            const response = await api.delete(ENDPOINTS.purchaseEntries.byId(id));
            return response;
        } catch (error) {
            throw handleError(error);
        }
    },
    uploadBillPdf: async (id, file) => {
        try {
            const formData = new FormData();
            formData.append('billPdf', file);
            const response = await api.post(`${ENDPOINTS.purchaseEntries.root}/${id}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response;
        } catch (error) {
            throw handleError(error);
        }
    },
};

export const aiAPI = {
    chat: (message) => api.post(ENDPOINTS.ai.chat, { message }),
    getInsights: () => cachedGet(ENDPOINTS.ai.insights, {}, CACHE_TTL.SHORT),
    getInventoryPredictions: () => cachedGet(ENDPOINTS.ai.inventoryPredictions, {}, CACHE_TTL.SHORT),
    smartSearch: (query) => api.post(ENDPOINTS.ai.search, { query }),
    healthCheck: () => cachedGet(ENDPOINTS.ai.health, {}, CACHE_TTL.SHORT),
};

export const emailAPI = {
    getStatus: async () => {
        try {
            const response = await api.get(ENDPOINTS.email.status);
            return response;
        } catch (error) {
            throw handleError(error);
        }
    },
    sendTest: async (to) => {
        try {
            const response = await api.post(ENDPOINTS.email.test, { to });
            return response;
        } catch (error) {
            throw handleError(error);
        }
    },
    sendBill: async (billId, to) => {
        try {
            const response = await api.post(ENDPOINTS.email.sendBill(billId), { to });
            return response;
        } catch (error) {
            throw handleError(error);
        }
    },
    sendPurchase: (entryId, to) => api.post(`${ENDPOINTS.email.root}/send-purchase/${entryId}`, { to }),
    sendDailySummary: async (to) => {
        try {
            const response = await api.post(ENDPOINTS.email.dailySummary, { to });
            return response;
        } catch (error) {
            throw handleError(error);
        }
    },
    sendReport: async (reportData) => {
        try {
            const response = await api.post(ENDPOINTS.email.sendReport, reportData);
            return response;
        } catch (error) {
            throw handleError(error);
        }
    },
};

export const backupAPI = {
    exportData: async () => {
        try {
            const response = await api.get(ENDPOINTS.backup.export);
            return response.data;
        } catch (error) {
            throw handleError(error);
        }
    },
    importData: async (backupData) => {
        try {
            const response = await api.post(ENDPOINTS.backup.import, { backupData });
            return response.data;
        } catch (error) {
            throw handleError(error);
        }
    }
};

export const fabricPurchasesAPI = {
    getAll: async (params) => {
        try {
            const response = await api.get(ENDPOINTS.fabricPurchases.list, { params });
            return response;
        } catch (error) {
            throw handleError(error);
        }
    },
    getById: async (id) => {
        try {
            const response = await api.get(ENDPOINTS.fabricPurchases.byId(id));
            return response;
        } catch (error) {
            throw handleError(error);
        }
    },
    create: async (data) => {
        try {
            const response = await api.post(ENDPOINTS.fabricPurchases.list, prepareFabricPurchaseData(data));
            return response;
        } catch (error) {
            throw handleError(error);
        }
    },
    update: async (id, data) => {
        try {
            const response = await api.put(ENDPOINTS.fabricPurchases.byId(id), prepareFabricPurchaseData(data));
            return response;
        } catch (error) {
            throw handleError(error);
        }
    },
    delete: async (id) => {
        try {
            const response = await api.delete(ENDPOINTS.fabricPurchases.byId(id));
            return response;
        } catch (error) {
            throw handleError(error);
        }
    },
    search: async (q) => {
        try {
            const response = await api.get(ENDPOINTS.fabricPurchases.search, { params: { q } });
            return response;
        } catch (error) {
            throw handleError(error);
        }
    }
};

export default api;
