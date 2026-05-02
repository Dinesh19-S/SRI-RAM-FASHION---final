import axios from 'axios';
import { supabase } from './supabase';
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
    return {
        ...p,
        _id: p.id,
        sellingPrice: Number(p.selling_price || 0),
        mrp: Number(p.mrp || 0),
        lowStockThreshold: p.low_stock_threshold,
        isActive: p.is_active,
        category: p.categories ? p.categories : (p.category_id ? { _id: p.category_id, id: p.category_id, name: 'N/A' } : null)
    };
};

const mapBillItem = (item) => {
    if (!item) return null;
    return {
        ...item,
        _id: item.id,
        billId: item.bill_id,
        productId: item.product_id,
        ratePerPiece: Number(item.rate_per_piece || 0),
        totalPrice: Number(item.total_price || 0),
    };
};

const mapBill = (b) => {
    if (!b) return null;
    return {
        ...b,
        _id: b.id,
        billNumber: b.bill_number,
        paymentStatus: b.payment_status,
        billType: b.bill_type,
        grandTotal: Number(b.grand_total || 0),
        subtotal: Number(b.subtotal || 0),
        totalTax: Number(b.total_tax || 0),
        taxableAmount: Number(b.taxable_amount || 0),
        discountAmount: Number(b.discount_amount || 0),
        roundOff: Number(b.round_off || 0),
        items: Array.isArray(b.bill_items) ? b.bill_items.map(mapBillItem) : (b.items || [])
    };
};

/**
 * Data Preparation Utilities
 * Converts camelCase frontend data to snake_case for Supabase.
 */
const prepareBillData = (data) => {
    const { items, customer, ...rest } = data;
    return {
        bill_number: data.billNumber || `SRF-${Date.now().toString().slice(-6)}`,
        date: data.date || new Date().toISOString(),
        customer_data: customer || {},
        subtotal: Number(data.subtotal || 0),
        discount_amount: Number(data.discountAmount || 0),
        taxable_amount: Number(data.taxableAmount || 0),
        cgst: Number(data.cgst || 0),
        sgst: Number(data.sgst || 0),
        igst: Number(data.igst || 0),
        total_tax: Number(data.totalTax || 0),
        round_off: Number(data.roundOff || 0),
        grand_total: Number(data.grandTotal || 0),
        payment_status: data.paymentStatus || 'pending',
        payment_method: data.paymentMethod || 'cash',
        payment_details: data.paymentDetails || {},
        bill_type: data.billType || 'SALES',
        transport: data.transport || '',
        from_text: data.fromDate || '',
        to_text: data.toDate || '',
        total_packs: Number(data.totalPacks || 0)
    };
};

const prepareBillItem = (item) => {
    return {
        product_id: item.productId,
        product_name: item.name,
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
        rate_per_piece: Number(item.ratePerPiece || 0),
        pcs_in_pack: Number(item.pcsInPack || 1),
        rate_per_pack: Number(item.ratePerPack || 0),
        no_of_packs: Number(item.noOfPacks || 0),
        hsn_code: item.hsnCode || '',
        gst_rate: Number(item.gstRate || 0),
        total: Number(item.total || 0),
        sizes_or_pieces: item.sizesOrPieces || ''
    };
};

const prepareProductData = (data) => {
    return {
        name: data.name,
        sku: data.sku,
        description: data.description,
        category_id: data.categoryId || data.category?._id || data.category?.id,
        mrp: Number(data.mrp || 0),
        selling_price: Number(data.sellingPrice || 0),
        stock: Number(data.stock || 0),
        low_stock_threshold: Number(data.lowStockThreshold || 5),
        unit: data.unit || 'pcs',
        size: data.size,
        hsn: data.hsn,
        gst_rate: Number(data.gstRate || 12),
        is_active: data.isActive !== undefined ? data.isActive : true
    };
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
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return { data: { token: data.session.access_token, user: data.user } };
    },
    register: async (data) => {
        const { data: result, error } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: {
                    name: data.name,
                    phone: data.phone,
                    role: data.role || 'user'
                }
            }
        });
        if (error) throw error;
        return { data: { token: result.session?.access_token, user: result.user } };
    },
    sendOTP: (phone) => supabase.auth.signInWithOtp({ phone }),
    loginPhone: (phone, token) => supabase.auth.verifyOtp({ phone, token, type: 'sms' }),
    getProfile: () => supabase.auth.getUser(),
    googleLogin: (credential) => supabase.auth.signInWithIdToken({ provider: 'google', token: credential }),
    forgotPassword: (email) => supabase.auth.resetPasswordForEmail(email),
    resetPassword: (email, code, newPassword) => supabase.auth.updateUser({ password: newPassword }),
};

export const appAPI = {
    warmup: async () => {
        try {
            // Check Supabase connection
            const { data, error } = await supabase.from('categories').select('count', { count: 'exact', head: true });
            if (error) {
                console.error('Supabase connection error:', error.message);
                return { success: false, error: error.message };
            }
            console.log('Supabase connected successfully');
            return { success: true };
        } catch (err) {
            console.error('Warmup failed:', err.message);
            return { success: false, error: err.message };
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
        let query = supabase.from('products').select('*, categories(*)');

        if (params?.search) {
            query = query.ilike('name', `%${params.search}%`);
        }

        if (params?.category) {
            query = query.eq('category_id', params.category);
        }

        if (params?.isActive !== undefined) {
            query = query.eq('is_active', params.isActive);
        }

        // Pagination
        const page = params?.page ? parseInt(params.page) : 1;
        const limit = params?.limit ? parseInt(params.limit) : 20;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await query
            .order('name', { ascending: true })
            .range(from, to);

        if (error) throw error;
        return { data: { success: true, data: data.map(mapProduct), pagination: { total: count, page, limit } } };
    },
    getById: async (id) => {
        const { data, error } = await supabase
            .from('products')
            .select('*, categories(*)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return { data: { success: true, data: mapProduct(data) } };
    },
    create: async (data) => {
        const productData = prepareProductData(data);
        const { data: result, error } = await supabase
            .from('products')
            .insert([productData])
            .select()
            .single();

        if (error) throw error;
        return { data: { success: true, data: mapProduct(result) } };
    },
    update: async (id, data) => {
        const productData = prepareProductData(data);
        const { data: result, error } = await supabase
            .from('products')
            .update(productData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { data: { success: true, data: mapProduct(result) } };
    },
    delete: async (id) => {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { data: { success: true } };
    },
    updateStock: async (id, { stock, type, reason }) => {
        const { data: result, error } = await supabase
            .from('products')
            .update({ stock })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Also record movement
        await supabase.from('stock_movements').insert([{
            product_id: id,
            type: type || 'ADJUSTMENT',
            quantity: stock,
            notes: reason
        }]);

        return { data: { success: true, data: mapProduct(result) } };
    },
    getLowStock: async () => {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .lte('stock', 'low_stock_threshold');

        if (error) throw error;
        return { data: { success: true, data: data.map(mapProduct) } };
    },
};

export const categoriesAPI = {
    getAll: async () => {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return { data: { success: true, data } };
    },
    create: async (data) => {
        const { data: result, error } = await supabase
            .from('categories')
            .insert([data])
            .select()
            .single();

        if (error) throw error;
        return { data: { success: true, data: result } };
    },
    update: async (id, data) => {
        const { data: result, error } = await supabase
            .from('categories')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { data: { success: true, data: result } };
    },
    delete: async (id) => {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { data: { success: true } };
    },
};

export const billsAPI = {
    getAll: async (params) => {
        let query = supabase.from('bills').select('*');

        if (params?.search) {
            query = query.ilike('bill_number', `%${params.search}%`);
        }

        if (params?.status) {
            query = query.eq('payment_status', params.status);
        }

        if (params?.type) {
            query = query.eq('bill_type', params.type);
        }

        // Pagination
        const page = params?.page ? parseInt(params.page) : 1;
        const limit = params?.limit ? parseInt(params.limit) : 20;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await query
            .order('date', { ascending: false })
            .range(from, to);

        if (error) throw error;
        return { data: { success: true, data: data.map(mapBill), pagination: { total: count, page, limit } } };
    },
    getById: async (id) => {
        const { data: bill, error: billError } = await supabase
            .from('bills')
            .select('*, bill_items(*)')
            .eq('id', id)
            .single();

        if (billError) throw billError;

        return { data: { success: true, data: mapBill(bill) } };
    },
    create: async (data) => {
        const { items, ...rawBillData } = data;
        const billData = prepareBillData(data);
        
        // 1. Create the bill
        const { data: bill, error: billError } = await supabase
            .from('bills')
            .insert([billData])
            .select()
            .single();

        if (billError) throw billError;

        // 2. Create the bill items
        if (items && items.length > 0) {
            const preparedItems = items.map(item => ({ 
                ...prepareBillItem(item), 
                bill_id: bill.id 
            }));
            const { error: itemsError } = await supabase
                .from('bill_items')
                .insert(preparedItems);

            if (itemsError) throw itemsError;
        }

        return { data: { success: true, data: mapBill(bill) } };
    },
    update: async (id, data) => {
        const { items, ...rawBillData } = data;
        const billData = prepareBillData(data);

        // 1. Update the bill
        const { data: bill, error: billError } = await supabase
            .from('bills')
            .update(billData)
            .eq('id', id)
            .select()
            .single();

        if (billError) throw billError;

        // 2. Update items (Delete and recreate for simplicity in this migration step)
        if (items) {
            await supabase.from('bill_items').delete().eq('bill_id', id);
            const preparedItems = items.map(item => ({ 
                ...prepareBillItem(item), 
                bill_id: bill.id 
            }));
            const { error: itemsError } = await supabase
                .from('bill_items')
                .insert(preparedItems);

            if (itemsError) throw itemsError;
        }

        return { data: { success: true, data: mapBill(bill) } };
    },
    delete: async (id) => {
        const { error } = await supabase
            .from('bills')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { data: { success: true } };
    },
    getStats: async (params) => {
        // This would typically be a Supabase RPC or a more complex query
        // For now, let's keep it simple or use the existing API if needed
        return api.get(ENDPOINTS.bills.stats, { params });
    },
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
    get: async () => {
        const { data, error } = await supabase
            .from('settings')
            .select('*')
            .eq('id', '00000000-0000-0000-0000-000000000001')
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 'no rows'
        return { data: { success: true, data: data || {} } };
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
    getOverview: (params) => cachedGet(ENDPOINTS.dashboard.overview, { params, persist: true }, CACHE_TTL.SHORT),
    getNotifications: (limit = 5) => cachedGet(ENDPOINTS.dashboard.notifications, { params: { limit }, persist: true }, CACHE_TTL.SHORT),
    getStats: () => cachedGet(ENDPOINTS.dashboard.stats, {}, CACHE_TTL.SHORT),
    getRecentBills: (limit) => cachedGet(ENDPOINTS.dashboard.recentBills, { params: { limit } }, CACHE_TTL.SHORT),
    getRevenueChart: (period) => cachedGet(ENDPOINTS.dashboard.revenueChart, { params: { period } }, CACHE_TTL.SHORT),
    getLowStockAlerts: () => cachedGet(ENDPOINTS.dashboard.lowStockAlerts, {}, CACHE_TTL.SHORT),
    getCategoryStats: () => cachedGet(ENDPOINTS.dashboard.categoryStats, {}, CACHE_TTL.SHORT),
};

export const customersAPI = {
    getAll: async (params) => {
        let query = supabase.from('customers').select('*');
        if (params?.search) {
            query = query.or(`name.ilike.%${params.search}%,phone.ilike.%${params.search}%`);
        }
        const { data, error } = await query.order('name', { ascending: true });
        if (error) throw error;
        return { data: { success: true, data } };
    },
    getById: async (id) => {
        const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
        if (error) throw error;
        return { data: { success: true, data } };
    },
    create: async (data) => {
        const { data: result, error } = await supabase.from('customers').insert([data]).select().single();
        if (error) throw error;
        return { data: { success: true, data: result } };
    },
    update: async (id, data) => {
        const { data: result, error } = await supabase.from('customers').update(data).eq('id', id).select().single();
        if (error) throw error;
        return { data: { success: true, data: result } };
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
            query = query.or(`name.ilike.%${params.search}%,contact_person.ilike.%${params.search}%`);
        }
        const { data, error } = await query.order('name', { ascending: true });
        if (error) throw error;
        return { data: { success: true, data } };
    },
    getById: async (id) => {
        const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single();
        if (error) throw error;
        return { data: { success: true, data } };
    },
    create: async (data) => {
        const { data: result, error } = await supabase.from('suppliers').insert([data]).select().single();
        if (error) throw error;
        return { data: { success: true, data: result } };
    },
    update: async (id, data) => {
        const { data: result, error } = await supabase.from('suppliers').update(data).eq('id', id).select().single();
        if (error) throw error;
        return { data: { success: true, data: result } };
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
            query = query.or(`transaction_id.ilike.%${params.search}%,payer_name.ilike.%${params.search}%`);
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
        let query = supabase.from('purchase_entries').select('*');
        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw error;
        return { data: { success: true, data } };
    },
    getById: async (id) => {
        const { data, error } = await supabase.from('purchase_entries').select('*').eq('id', id).single();
        if (error) throw error;
        return { data: { success: true, data } };
    },
    create: async (data) => {
        const { data: result, error } = await supabase.from('purchase_entries').insert([data]).select().single();
        if (error) throw error;
        return { data: { success: true, data: result } };
    },
    update: async (id, data) => {
        const { data: result, error } = await supabase.from('purchase_entries').update(data).eq('id', id).select().single();
        if (error) throw error;
        return { data: { success: true, data: result } };
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
    getStatus: () => cachedGet(ENDPOINTS.email.status, {}, CACHE_TTL.SHORT),
    sendTest: (to) => api.post(ENDPOINTS.email.test, to ? { to } : {}),
    sendBill: (billId, to) => api.post(ENDPOINTS.email.sendBill(billId), to ? { to } : {}),
    sendDailySummary: (to) => api.post(ENDPOINTS.email.dailySummary, to ? { to } : {}),
    sendReport: (data) => api.post(ENDPOINTS.email.sendReport, data),
};

export default api;
