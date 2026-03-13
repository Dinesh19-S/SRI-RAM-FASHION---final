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
            .addCase(updateProduct.fulfilled, (state, action) => {
                const index = state.items.findIndex(p => p._id === action.payload._id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
            })
            // Delete Product
            .addCase(deleteProduct.fulfilled, (state, action) => {
                state.items = state.items.filter(p => p._id !== action.payload);
            })
            // Update Stock
            .addCase(updateProductStock.fulfilled, (state, action) => {
                const index = state.items.findIndex(p => p._id === action.payload._id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
            })
            // Create Category
            .addCase(createCategory.fulfilled, (state, action) => {
                state.categories.push(action.payload);
            });
    },
});

export const { clearError } = productsSlice.actions;
export default productsSlice.reducer;

