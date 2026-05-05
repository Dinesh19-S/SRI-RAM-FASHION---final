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
    const id = p.id || p._id;
    const categoryFromJoin = p.categories
        ? { ...p.categories, _id: p.categories.id || p.categories._id, id: p.categories.id || p.categories._id }
        : null;
    return {
        ...p,
        _id: id,
        id: id,
        sellingPrice: Number(p.selling_price || 0),
        mrp: Number(p.mrp || 0),
        lowStockThreshold: p.low_stock_threshold || 5,
        isActive: p.is_active !== false,
        category: categoryFromJoin || (p.category_id ? { _id: p.category_id, id: p.category_id, name: 'N/A' } : null)
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
        ratePerPiece: Number(item.rate_per_piece || 0),
        totalPrice: Number(item.total || item.total_price || 0),
        gstRate: Number(item.gst_rate || 0),
        quantity: Number(item.quantity || 0)
    };
};

const mapBill = (b) => {
    if (!b) return null;
    const id = b.id || b._id;
    return {
        ...b,
        _id: id,
        id: id,
        billNumber: b.bill_number,
        paymentStatus: b.payment_status || 'pending',
        billType: b.bill_type || 'SALES',
        grandTotal: Number(b.grand_total || 0),
        subtotal: Number(b.subtotal || 0),
        totalTax: Number(b.total_tax || 0),
        taxableAmount: Number(b.taxable_amount || 0),
        discountAmount: Number(b.discount_amount || 0),
        roundOff: Number(b.round_off || 0),
        items: Array.isArray(b.bill_items) ? b.bill_items.map(mapBillItem) : (Array.isArray(b.items) ? b.items.map(mapBillItem) : [])
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
                rate: Number(item.rate_per_piece || item.rate_per_kg || item.rate || item.price || 0),
                qty: Number(item.quantity || item.weight_kg || item.qty || 0),
                taxableAmount: Number(item.taxable_amount || 0),
                cgst: Number(item.cgst || 0),
                sgst: Number(item.sgst || 0),
                igst: Number(item.igst || 0),
                total: Number(item.total || item.total_price || 0)
            });
        });
    });
    return flattened;
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
        from_text: data.fromDate || data.from_text || '',
        to_text: data.toDate || data.to_text || '',
        total_packs: Number(data.totalPacks || 0),
        num_of_bundles: Number(data.numOfBundles || 1),
        amount_in_words: data.amountInWords || '',
        notes: data.notes || '',
        reference_invoice_number: data.referenceInvoiceNumber || '',
        party_name: data.partyName || (customer?.name || '')
    };
};

const prepareBillItem = (item) => {
    const qty = Number(item.quantity || 0);
    const rate = Number(item.ratePerPiece || item.price || 0);
    const total = Number(item.total || (qty * rate));
    
    return {
        product_id: item.productId,
        product_name: item.name || item.productName,
        sku: item.sku || '',
        hsn: item.hsnCode || item.hsn || '',
        hsn_code: item.hsnCode || item.hsn || '',
        quantity: qty,
        price: rate,
        rate_per_piece: rate,
        pcs_in_pack: Number(item.pcsInPack || 1),
        rate_per_pack: Number(item.ratePerPack || 0),
        no_of_packs: Number(item.noOfPacks || 0),
        mrp: Number(item.mrp || rate),
        gst_rate: Number(item.gstRate || 0),
        gst_amount: Number(item.gstAmount || 0),
        total: total,
        sizes_or_pieces: item.sizesOrPieces || ''
    };
};

const mapPurchaseItem = (i) => {
    if (!i) return null;
    return {
        ...i,
        _id: i.id,
        id: i.id,
        hsnCode: i.hsn_code,
        designColor: i.design_color,
        weightKg: Number(i.weight_kg || 0),
        ratePerKg: Number(i.rate_per_kg || 0),
        gstRate: Number(i.gst_rate || 0),
        total: Number(i.total || 0)
    };
};

const mapPurchase = (p) => {
    if (!p) return null;
    const id = p.id || p._id;
    return {
        ...p,
        _id: id,
        id: id,
        invoiceNumber: p.invoice_number,
        supplier: p.supplier_data,
        grandTotal: Number(p.grand_total || 0),
        totalWeight: Number(p.total_weight || 0),
        subtotal: Number(p.subtotal || 0),
        totalTax: Number(p.total_tax || 0),
        items: Array.isArray(p.purchase_items) ? p.purchase_items.map(mapPurchaseItem) : (Array.isArray(p.items) ? p.items.map(mapPurchaseItem) : [])
    };
};

const preparePurchaseData = (data) => {
    return {
        invoice_number: data.invoiceNumber || data.invNo,
        date: data.date || new Date().toISOString(),
        supplier_data: data.supplier || {},
        subtotal: Number(data.subtotal || 0),
        total_tax: Number(data.totalTax || 0),
        grand_total: Number(data.grandTotal || 0),
        total_weight: Number(data.totalWeight || 0)
    };
};

const preparePurchaseItem = (item) => {
    const qty = Number(item.weightKg || 0);
    const rate = Number(item.ratePerKg || 0);
    return {
        particular: item.particular,
        hsn_code: item.hsnCode || '',
        design_color: item.designColor || '',
        weight_kg: qty,
        rate_per_kg: rate,
        gst_rate: Number(item.gstRate || 0),
        total: Number(item.total || (qty * rate))
    };
};

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
        category_id: categoryId,
        mrp: Number(data.mrp || data.sellingPrice || 0),
        selling_price: Number(data.sellingPrice || 0),
        stock: Number(data.stock || 0),
        low_stock_threshold: Number(data.lowStockThreshold || 5),
        unit: data.unit || 'pcs',
        size: data.size || '',
        hsn: data.hsn || '',
        gst_rate: Number(data.gstRate || 12),
        is_active: data.isActive !== false
    };
};

const mapCustomer = (c) => {
    if (!c) return null;
    const id = c.id || c._id;
    return {
        ...c,
        _id: id,
        id,
        companyName: c.company_name || c.name,
        mobile: c.mobile || c.phone,
        alternateNo: c.alternate_no,
        placeOfSupply: c.place_of_supply
    };
};

const prepareCustomerData = (data) => {
    return {
        name: data.companyName || data.name,
        company_name: data.companyName || data.name,
        gstin: data.gstin || '',
        state: data.state || 'Tamilnadu',
        phone: data.mobile || data.phone || '',
        mobile: data.mobile || data.phone || '',
        alternate_no: data.alternateNo || '',
        email: data.email || '',
        address: data.address || '',
        place_of_supply: data.placeOfSupply || ''
    };
};

const mapSupplier = (s) => {
    if (!s) return null;
    const id = s.id || s._id;
    return {
        ...s,
        _id: id,
        id,
        contactPerson: s.contact_person
    };
};

const mapCategory = (cat) => {
    if (!cat) return null;
    const id = cat.id || cat._id;
    return {
        ...cat,
        _id: id,
        id
    };
};

const prepareSupplierData = (data) => {
    return {
        name: data.name,
        contact_person: data.contactPerson || '',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        gstin: data.gstin || ''
    };
};

const handleSupabaseError = async (error) => {
    const status = error?.status || error?.code;
    const message = String(error?.message || '');

    const isAuthFailure =
        status === 401 ||
        message.toLowerCase().includes('jwt') ||
        message.toLowerCase().includes('invalid token') ||
        message.toLowerCase().includes('expired');

    if (isAuthFailure) {
        try {
            await supabase.auth.signOut();
        } catch {
            // no-op
        }
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
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return { data: { token: data.session?.access_token || null, user: data.user || null } };
    },
    signInWithGoogle: async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            },
        });
        if (error) throw error;
        return data;
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
        return { data: { token: result.session?.access_token || null, user: result.user || null } };
    },
    sendOTP: (phone) => supabase.auth.signInWithOtp({ phone }),
    loginPhone: async (phone, token) => {
        const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
        if (error) throw error;
        return { data: { token: data.session?.access_token || null, user: data.user || null } };
    },
    getProfile: () => supabase.auth.getUser(),
    forgotPassword: (email) => supabase.auth.resetPasswordForEmail(email),
    resetPassword: (email, code, newPassword) => supabase.auth.updateUser({ password: newPassword }),
};

export const appAPI = {
    warmup: async () => {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            return { success: false, error: sessionError.message };
        }

        // Avoid auth-protected table calls for signed-out users.
        if (!sessionData?.session) {
            return { success: false, skipped: true, reason: 'NO_SESSION' };
        }

        const { error } = await supabase
            .from('categories')
            .select('*', { count: 'exact', head: true });

        if (error) {
            await handleSupabaseError(error);
        }

        if (import.meta.env.DEV) {
            console.log('Supabase connected successfully');
        }

        return { success: true };
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
        } catch (error) {
            return handleSupabaseError(error);
        }
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

        if (error) return handleSupabaseError(error);
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

        if (error) return handleSupabaseError(error);
        return { data: { success: true, data: mapProduct(result) } };
    },
    delete: async (id) => {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) return handleSupabaseError(error);
        return { data: { success: true } };
    },
    updateStock: async (id, { stock, type, reason }) => {
        const { data: result, error } = await supabase
            .from('products')
            .update({ stock })
            .eq('id', id)
            .select()
            .single();

        if (error) return handleSupabaseError(error);

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

        if (error) return handleSupabaseError(error);
        return { data: { success: true, data: data.map(mapProduct) } };
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
        // Return mock success to prevent UI errors during migration
        return { data: { success: true, data: { totalSales: 0, totalOrders: 0, averageOrderValue: 0 } } };
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
            query = query.or(`name.ilike.%${params.search}%,phone.ilike.%${params.search}%`);
        }
        const { data, error } = await query.order('name', { ascending: true });
        if (error) throw error;
        return { data: { success: true, data: data.map(mapCustomer) } };
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
            query = query.or(`name.ilike.%${params.search}%,contact_person.ilike.%${params.search}%`);
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
