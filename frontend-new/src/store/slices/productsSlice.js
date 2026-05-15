import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { productsAPI, categoriesAPI } from '../../services/api';

// Async thunks
export const fetchProducts = createAsyncThunk(
    'products/fetchAll',
    async (params, { rejectWithValue }) => {
        try {
            const response = await productsAPI.getAll(params);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch products');
        }
    }
);

export const fetchCategories = createAsyncThunk(
    'products/fetchCategories',
    async (_, { rejectWithValue }) => {
        try {
            const response = await categoriesAPI.getAll();
            return response.data.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch categories');
        }
    }
);

export const createProduct = createAsyncThunk(
    'products/create',
    async (data, { rejectWithValue }) => {
        try {
            const response = await productsAPI.create(data);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to create product');
        }
    }
);

export const updateProduct = createAsyncThunk(
    'products/update',
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const response = await productsAPI.update(id, data);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update product');
        }
    }
);

export const deleteProduct = createAsyncThunk(
    'products/delete',
    async (id, { rejectWithValue }) => {
        try {
            await productsAPI.delete(id);
            return id;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to delete product');
        }
    }
);

export const updateProductStock = createAsyncThunk(
    'products/updateStock',
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const response = await productsAPI.updateStock(id, data);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update stock');
        }
    }
);

export const createCategory = createAsyncThunk(
    'products/createCategory',
    async (data, { rejectWithValue }) => {
        try {
            const response = await categoriesAPI.create(data);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to create category');
        }
    }
);

export const updateCategory = createAsyncThunk(
    'products/updateCategory',
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const response = await categoriesAPI.update(id, data);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update category');
        }
    }
);

export const deleteCategory = createAsyncThunk(
    'products/deleteCategory',
    async (id, { rejectWithValue }) => {
        try {
            await categoriesAPI.delete(id);
            return id;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to delete category');
        }
    }
);

// Initial state
const initialState = {
    items: [],
    categories: [],
    pagination: null,
    isLoading: false,
    error: null,
};

// Slice
const productsSlice = createSlice({
    name: 'products',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        upsertProduct: (state, action) => {
            const product = action.payload;
            const id = product.id || product._id;
            const index = state.items.findIndex(p => (p.id || p._id) === id);
            if (index !== -1) {
                state.items[index] = { ...state.items[index], ...product, _id: id, id };
            } else {
                state.items.unshift({ ...product, _id: id, id });
            }
        },
        removeProduct: (state, action) => {
            const id = action.payload;
            state.items = state.items.filter(p => (p.id || p._id) !== id);
        },
        upsertCategory: (state, action) => {
            const category = action.payload;
            const id = category.id || category._id;
            const index = state.categories.findIndex(c => (c.id || c._id) === id);
            if (index !== -1) {
                state.categories[index] = { ...state.categories[index], ...category, _id: id, id };
            } else {
                state.categories.push({ ...category, _id: id, id });
            }
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch Products
            .addCase(fetchProducts.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchProducts.fulfilled, (state, action) => {
                state.isLoading = false;
                state.items = action.payload.data;
                state.pagination = action.payload.pagination;
            })
            .addCase(fetchProducts.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Fetch Categories
            .addCase(fetchCategories.fulfilled, (state, action) => {
                state.categories = action.payload;
            })
            // Create Product
            .addCase(createProduct.fulfilled, (state, action) => {
                state.items.unshift(action.payload);
            })
            // Update Product
            .addCase(updateProduct.pending, (state, action) => {
                const { id, data } = action.meta.arg;
                const index = state.items.findIndex(p => (p._id || p.id) === id);
                if (index !== -1) {
                    state.items[index] = { ...state.items[index], ...data };
                }
            })
            .addCase(updateProduct.fulfilled, (state, action) => {
                const index = state.items.findIndex(p => p._id === action.payload._id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
            })
            .addCase(updateProduct.rejected, (state, action) => {
                state.error = action.payload;
            })
            // Delete Product
            .addCase(deleteProduct.pending, (state, action) => {
                // Optimistically remove from list
                const id = action.meta.arg;
                state.items = state.items.filter(p => (p._id || p.id) !== id);
            })
            .addCase(deleteProduct.fulfilled, (state, action) => {
                // Already removed in pending, just stop loading
                state.isLoading = false;
            })
            .addCase(deleteProduct.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
                // Note: Ideally we should restore the item here, but it requires storing previous state.
                // For now, we rely on the user refreshing or a background sync.
            })
            // Update Stock
            .addCase(updateProductStock.pending, (state, action) => {
                const { id, data } = action.meta.arg;
                const index = state.items.findIndex(p => (p._id || p.id) === id);
                if (index !== -1) {
                    const product = state.items[index];
                    const currentStock = Number(product.stock) || 0;
                    const change = Number(data.quantity) || 0;
                    
                    if (data.type === 'in') {
                        product.stock = currentStock + change;
                    } else {
                        product.stock = Math.max(0, currentStock - change);
                    }
                }
            })
            .addCase(updateProductStock.fulfilled, (state, action) => {
                const index = state.items.findIndex(p => p._id === action.payload._id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
            })
            .addCase(updateProductStock.rejected, (state, action) => {
                state.error = action.payload;
                // Rollback would be ideal here if we stored previous stock, 
                // but for now we rely on the next fetch or manual refresh.
            })
            // Create Category
            .addCase(createCategory.fulfilled, (state, action) => {
                state.categories.push(action.payload);
            })
            // Update Category
            .addCase(updateCategory.fulfilled, (state, action) => {
                const index = state.categories.findIndex(c => (c._id || c.id) === action.payload._id);
                if (index !== -1) {
                    state.categories[index] = action.payload;
                }
            })
            // Delete Category
            .addCase(deleteCategory.fulfilled, (state, action) => {
                state.categories = state.categories.filter(c => (c._id || c.id) !== action.payload);
            });
    },
});

export const { clearError, upsertProduct, removeProduct, upsertCategory } = productsSlice.actions;
export default productsSlice.reducer;

