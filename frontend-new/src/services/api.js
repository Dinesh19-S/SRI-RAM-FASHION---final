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
 * Normalizes Supabase snake_case responses to the camelCase format expected by the UI.
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
    const id = item.id || item._id;
    return {
        ...item,
        _id: id,
        id: id,
        billId: item.bill_id,
        productId: item.product_id,
        name: item.product_name || item.name || '',
        productName: item.product_name || item.name || '',
        hsnCode: item.hsn_code || item.hsn || '',
        ratePerPiece: Number(item.rate || item.rate_per_piece || 0),
        ratePerPack: Number(item.rate || item.rate_per_pack || 0),
        noOfPacks: Number(item.quantity || 0),
        pcsInPack: Number(item.pcs_in_pack || 1),
        totalPrice: Number(item.total || item.total_price || 0),
        gstRate: Number(item.gst_rate || 0),
        quantity: Number(item.quantity || 0),
        price: Number(item.rate || 0),
        total: Number(item.total || 0),
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
        const items = Array.isArray(bill.bill_items) ? bill.bill_items : (Array.isArray(bill.items) ? bill.items : []);
        items.forEach(item => {
            flattened.push({
                sno: sno++,
                date: bill.date,
                invNo: bill.bill_number || bill.invoiceNumber,
                item: item.product_name || item.particular || 'N/A',
                rate: Number(item.rate || item.rate_per_piece || item.rate_per_kg || item.price || 0),
                qty: Number(item.quantity || item.weight_kg || item.qty || 0),
                taxableAmount: Number(item.taxable_amount || 0),
                cgst: Number(item.cgst_amount || item.cgst || 0),
                sgst: Number(item.sgst_amount || item.sgst || 0),
                igst: Number(item.igst_amount || item.igst || 0),
                total: Number(item.total || item.total_price || 0)
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
        categoryId: categoryId,
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

        // Actionable logging for Supabase errors
        if (error.response?.status === 400 && error.response?.data?.message?.includes('column')) {
            console.error('Supabase Schema Error detected!');
            console.error('Missing column suspected:', error.response.data.message);
            console.error('Recommended fix: Run "ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;" in Supabase SQL Editor.');
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
    updateStock: async (id, { stock, type, reason }) => {
        try {
            const response = await api.put(ENDPOINTS.products.stock(id), { stock });
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
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            return { data: { success: true, data: (data || []).map(mapCategory) } };
        } catch (error) {
            return handleSupabaseError(error);
        }
    },
    create: async (data) => {
        try {
            const { data: result, error } = await supabase
                .from('categories')
                .insert([data])
                .select()
                .single();

            if (error) throw error;
            return { data: { success: true, data: mapCategory(result) } };
        } catch (error) {
            return handleSupabaseError(error);
        }
    },
    update: async (id, data) => {
        try {
            const { data: result, error } = await supabase
                .from('categories')
                .update(data)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data: { success: true, data: mapCategory(result) } };
        } catch (error) {
            return handleSupabaseError(error);
        }
    },
    delete: async (id) => {
        try {
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { data: { success: true } };
        } catch (error) {
            return handleSupabaseError(error);
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
        let query = supabase.from('stock_movements').select('*, products(*)');
        if (params?.productId) query = query.eq('product_id', params.productId);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return { data: { success: true, data } };
    },
    addMovement: async (data) => {
        const { data: result, error } = await supabase.from('stock_movements').insert([data]).select().single();
        if (error) throw error;
        return { data: { success: true, data: result } };
    },
    getStats: async () => {
        return { data: { success: true, data: { totalItems: 0, lowStockCount: 0 } } };
    },
};

export const reportsAPI = {
    getSalesSummary: async (params) => {
        const { data, error } = await supabase.from('bills').select('*').neq('bill_type', 'PURCHASE');
        if (error) throw error;
        const total = (data || []).reduce((sum, b) => sum + Number(b.grand_total || 0), 0);
        return { data: { success: true, data: { total, count: (data || []).length } } };
    },
    getSalesReport: async (params) => {
        let query = supabase.from('bills').select('*, bill_items(*)').neq('bill_type', 'PURCHASE');
        if (params?.startDate) query = query.gte('date', params.startDate);
        if (params?.endDate) query = query.lte('date', params.endDate);
        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw error;
        return { data: { success: true, data: flattenBillItems(data) } };
    },
    getPurchaseReport: async (params) => {
        let query = supabase.from('bills').select('*, bill_items(*)').eq('bill_type', 'PURCHASE');
        if (params?.startDate) query = query.gte('date', params.startDate);
        if (params?.endDate) query = query.lte('date', params.endDate);
        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw error;
        return { data: { success: true, data: flattenBillItems(data) } };
    },
    getStockReport: async (params) => {
        const { data, error } = await supabase.from('products').select('*, categories(*)');
        if (error) throw error;
        return { data: { success: true, data: (data || []).map(mapProduct) } };
    }
};

export const settingsAPI = {
    get: async () => {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('*')
                .eq('id', '00000000-0000-0000-0000-000000000001');

            if (error) throw error;
            return { data: { success: true, data: data && data.length > 0 ? data[0] : {} } };
        } catch (error) {
            return handleSupabaseError(error);
        }
    },
    update: async (data) => {
        const { data: result, error } = await supabase
            .from('settings')
            .upsert({ id: '00000000-0000-0000-0000-000000000001', ...data })
            .select()
            .single();

        if (error) throw error;
        return { data: { success: true, data: result } };
    },
    uploadLogo: (formData) => api.post(ENDPOINTS.settings.logo, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const dashboardAPI = {
    getOverview: async (params) => {
        const { data: bills } = await supabase.from('bills').select('*').order('date', { ascending: false });
        const { data: products } = await supabase.from('products').select('*').order('name', { ascending: true });
        const { data: customers } = await supabase.from('customers').select('*');
        const { data: categories } = await supabase.from('categories').select('*');

        const salesBills = bills?.filter(b => b.bill_type !== 'PURCHASE') || [];
        const purchaseBills = bills?.filter(b => b.bill_type === 'PURCHASE') || [];
        
        const totalRevenue = salesBills.reduce((sum, b) => sum + Number(b.grand_total || 0), 0) - purchaseBills.reduce((sum, b) => sum + Number(b.grand_total || 0), 0);
        const lowStockAlerts = products?.filter(p => Number(p.stock || 0) <= Number(p.low_stock_threshold || 5)) || [];

        return {
            data: {
                success: true,
                data: {
                    stats: {
                        totalRevenue,
                        totalOrders: salesBills.length,
                        totalCustomers: customers?.length || 0,
                        productCount: products?.length || 0
                    },
                    recentBills: salesBills.slice(0, params?.recentLimit || 6).map(mapBill),
                    lowStockAlerts: lowStockAlerts.slice(0, 5).map(mapProduct),
                    products: products?.slice(0, params?.productLimit || 10).map(mapProduct),
                    categoryStats: categories?.map(cat => ({
                        name: cat.name,
                        count: products?.filter(p => p.category === cat.name || p.category_id === cat.id || (p.categories?.name === cat.name)).length || 0,
                        totalStock: products?.filter(p => p.category === cat.name || p.category_id === cat.id || (p.categories?.name === cat.name)).reduce((sum, p) => sum + Number(p.stock || 0), 0) || 0
                    }))
                }
            }
        };
    },
    getRevenueChart: async (period) => {
        const { data: bills } = await supabase.from('bills').select('*').order('date', { ascending: true });
        // Simple day-wise aggregation for charts
        const dailyData = bills?.reduce((acc, b) => {
            const day = b.date?.split('T')[0] || (b.created_at ? new Date(b.created_at).toISOString().split('T')[0] : 'N/A');
            if (day === 'N/A') return acc;
            if (!acc[day]) acc[day] = { _id: day, sales: 0, purchase: 0, revenue: 0, orders: 0 };
            const amount = Number(b.grand_total || 0);
            if (b.bill_type === 'PURCHASE') {
                acc[day].purchase += amount;
                acc[day].revenue -= amount;
            } else {
                acc[day].sales += amount;
                acc[day].revenue += amount;
                acc[day].orders += 1;
            }
            return acc;
        }, {}) || {};

        return { data: { success: true, data: Object.values(dailyData) } };
    },
    getNotifications: async (limit = 5) => {
        const { data: products } = await supabase.from('products').select('*');
        const lowStock = (products || []).filter(p => Number(p.stock || 0) <= Number(p.low_stock_threshold || 5)).slice(0, limit);
        return { data: { success: true, data: { lowStockAlerts: lowStock.map(mapProduct) } } };
    }
};

export const customersAPI = {
    getAll: async (params) => {
        let query = supabase.from('customers').select('*');
        if (params?.search) {
            const term = params.search.replace(/'/g, "''");
            query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%,company_name.ilike.%${term}%`);
        }
        const { data, error } = await query.order('name', { ascending: true });
        if (error) throw error;
        return { data: { success: true, data: (data || []).map(mapCustomer) } };
    },
    getById: async (id) => {
        const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
        if (error) throw error;
        return { data: { success: true, data: mapCustomer(data) } };
    },
    create: async (data) => {
        const customerData = prepareCustomerData(data);
        const { data: result, error } = await supabase.from('customers').insert([customerData]).select().single();
        if (error) throw error;
        return { data: { success: true, data: mapCustomer(result) } };
    },
    update: async (id, data) => {
        const customerData = prepareCustomerData(data);
        const { data: result, error } = await supabase.from('customers').update(customerData).eq('id', id).select().single();
        if (error) throw error;
        return { data: { success: true, data: mapCustomer(result) } };
    },
    delete: async (id) => {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw error;
        return { data: { success: true } };
    },
};

export const hsnAPI = {
    getAll: async (params) => {
        let query = supabase.from('hsn_codes').select('*');
        if (params?.search) {
            query = query.ilike('code', `%${params.search}%`);
        }
        const { data, error } = await query.order('code', { ascending: true });
        if (error) throw error;
        return { data: { success: true, data } };
    },
    getById: async (id) => {
        const { data, error } = await supabase.from('hsn_codes').select('*').eq('id', id).single();
        if (error) throw error;
        return { data: { success: true, data } };
    },
    create: async (data) => {
        const { data: result, error } = await supabase.from('hsn_codes').insert([data]).select().single();
        if (error) throw error;
        return { data: { success: true, data: result } };
    },
    update: async (id, data) => {
        const { data: result, error } = await supabase.from('hsn_codes').update(data).eq('id', id).select().single();
        if (error) throw error;
        return { data: { success: true, data: result } };
    },
    delete: async (id) => {
        const { error } = await supabase.from('hsn_codes').delete().eq('id', id);
        if (error) throw error;
        return { data: { success: true } };
    },
};

export const suppliersAPI = {
    getAll: async (params) => {
        let query = supabase.from('suppliers').select('*');
        if (params?.search) {
            const term = params.search.replace(/'/g, "''");
            query = query.ilike('name', `%${term}%`);
        }
        const { data, error } = await query.order('name', { ascending: true });
        if (error) throw error;
        return { data: { success: true, data: data.map(mapSupplier) } };
    },
    getById: async (id) => {
        const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single();
        if (error) throw error;
        return { data: { success: true, data: mapSupplier(data) } };
    },
    create: async (data) => {
        const supplierData = prepareSupplierData(data);
        const { data: result, error } = await supabase.from('suppliers').insert([supplierData]).select().single();
        if (error) throw error;
        return { data: { success: true, data: mapSupplier(result) } };
    },
    update: async (id, data) => {
        const supplierData = prepareSupplierData(data);
        const { data: result, error } = await supabase.from('suppliers').update(supplierData).eq('id', id).select().single();
        if (error) throw error;
        return { data: { success: true, data: mapSupplier(result) } };
    },
    delete: async (id) => {
        const { error } = await supabase.from('suppliers').delete().eq('id', id);
        if (error) throw error;
        return { data: { success: true } };
    },
};

export const paymentsAPI = {
    getAll: async (params) => {
        let query = supabase.from('payments').select('*');
        if (params?.search) {
            const term = params.search.replace(/'/g, "''");
            query = query.or(`transaction_id.ilike.%${term}%,party_name.ilike.%${term}%`);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return { data: { success: true, data } };
    },
    getById: async (id) => {
        const { data, error } = await supabase.from('payments').select('*').eq('id', id).single();
        if (error) throw error;
        return { data: { success: true, data } };
    },
    create: async (data) => {
        const { data: result, error } = await supabase.from('payments').insert([data]).select().single();
        if (error) throw error;
        return { data: { success: true, data: result } };
    },
    update: async (id, data) => {
        const { data: result, error } = await supabase.from('payments').update(data).eq('id', id).select().single();
        if (error) throw error;
        return { data: { success: true, data: result } };
    },
    delete: async (id) => {
        const { error } = await supabase.from('payments').delete().eq('id', id);
        if (error) throw error;
        return { data: { success: true } };
    },
};

export const salesEntriesAPI = {
    getAll: async (params) => {
        let query = supabase.from('sales_entries').select('*');
        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw error;
        return { data: { success: true, data } };
    },
    getById: async (id) => {
        const { data, error } = await supabase.from('sales_entries').select('*').eq('id', id).single();
        if (error) throw error;
        return { data: { success: true, data } };
    },
    create: async (data) => {
        const { data: result, error } = await supabase.from('sales_entries').insert([data]).select().single();
        if (error) throw error;
        return { data: { success: true, data: result } };
    },
    update: async (id, data) => {
        const { data: result, error } = await supabase.from('sales_entries').update(data).eq('id', id).select().single();
        if (error) throw error;
        return { data: { success: true, data: result } };
    },
    delete: async (id) => {
        const { error } = await supabase.from('sales_entries').delete().eq('id', id);
        if (error) throw error;
        return { data: { success: true } };
    },
    generateBill: (id) => api.post(ENDPOINTS.salesEntries.generateBill(id)),
};

export const purchaseEntriesAPI = {
    getAll: async (params) => {
        let query = supabase.from('purchase_entries').select('*, purchase_items(*)');
        
        if (params?.search) {
            query = query.or(`invoice_number.ilike.%${params.search}%`);
        }

        const page = params?.page ? parseInt(params.page) : 1;
        const limit = params?.limit ? parseInt(params.limit) : 20;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await query
            .order('date', { ascending: false })
            .range(from, to);

        if (error) throw error;
        return { data: { success: true, data: data.map(mapPurchase), pagination: { total: count, page, limit } } };
    },
    getById: async (id) => {
        const { data, error } = await supabase
            .from('purchase_entries')
            .select('*, purchase_items(*)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return { data: { success: true, data: mapPurchase(data) } };
    },
    create: async (data) => {
        const { items } = data;
        const entryData = preparePurchaseData(data);

        const { data: result, error } = await supabase
            .from('purchase_entries')
            .insert([entryData])
            .select()
            .single();

        if (error) throw error;

        if (items && items.length > 0) {
            const preparedItems = items.map(item => ({ 
                ...preparePurchaseItem(item), 
                purchase_id: result.id 
            }));
            const { error: itemsError } = await supabase
                .from('purchase_items')
                .insert(preparedItems);
            
            if (itemsError) throw itemsError;
        }

        return { data: { success: true, data: mapPurchase(result) } };
    },
    update: async (id, data) => {
        const { items } = data;
        const entryData = preparePurchaseData(data);

        const { data: result, error } = await supabase
            .from('purchase_entries')
            .update(entryData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        if (items) {
            await supabase.from('purchase_items').delete().eq('purchase_id', id);
            const preparedItems = items.map(item => ({ 
                ...preparePurchaseItem(item), 
                purchase_id: result.id 
            }));
            const { error: itemsError } = await supabase
                .from('purchase_items')
                .insert(preparedItems);
            
            if (itemsError) throw itemsError;
        }

        return { data: { success: true, data: mapPurchase(result) } };
    },
    delete: async (id) => {
        const { error } = await supabase.from('purchase_entries').delete().eq('id', id);
        if (error) throw error;
        return { data: { success: true } };
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
    getStatus: async () => ({ data: { success: true, configured: true } }),
    sendTest: async (to) => ({ data: { success: true, message: 'Test email sent (Mock)' } }),
    sendBill: async (billId, to) => ({ data: { success: true, message: 'Bill email sent (Mock)' } }),
    sendDailySummary: async (to) => ({ data: { success: true, message: 'Daily summary sent (Mock)' } }),
    sendReport: async (data) => ({ data: { success: true, message: 'Report sent (Mock)' } }),
};

export default api;
