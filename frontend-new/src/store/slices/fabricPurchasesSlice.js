import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fabricPurchasesAPI } from '../../services/api';

// Async thunks
export const fetchFabricPurchases = createAsyncThunk(
    'fabricPurchases/fetchAll',
    async (params, { rejectWithValue }) => {
        try {
            const response = await fabricPurchasesAPI.getAll(params);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch fabric purchases');
        }
    }
);

export const createFabricPurchase = createAsyncThunk(
    'fabricPurchases/create',
    async (data, { rejectWithValue }) => {
        try {
            const response = await fabricPurchasesAPI.create(data);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to create fabric purchase');
        }
    }
);

export const updateFabricPurchase = createAsyncThunk(
    'fabricPurchases/update',
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const response = await fabricPurchasesAPI.update(id, data);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update fabric purchase');
        }
    }
);

export const deleteFabricPurchase = createAsyncThunk(
    'fabricPurchases/delete',
    async (id, { rejectWithValue }) => {
        try {
            await fabricPurchasesAPI.delete(id);
            return id;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to delete fabric purchase');
        }
    }
);

// Initial state
const initialState = {
    items: [],
    pagination: null,
    isLoading: false,
    error: null,
};

// Slice
const fabricPurchasesSlice = createSlice({
    name: 'fabricPurchases',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch
            .addCase(fetchFabricPurchases.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchFabricPurchases.fulfilled, (state, action) => {
                state.isLoading = false;
                state.items = action.payload.data;
                state.pagination = action.payload.pagination;
            })
            .addCase(fetchFabricPurchases.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Create (Optimistic-ish: Add immediately in pending)
            .addCase(createFabricPurchase.pending, (state, action) => {
                // We could add a temp item here if we wanted to be fully optimistic
                state.isLoading = true;
            })
            .addCase(createFabricPurchase.fulfilled, (state, action) => {
                state.isLoading = false;
                state.items.unshift(action.payload);
            })
            .addCase(createFabricPurchase.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Update (Optimistic)
            .addCase(updateFabricPurchase.pending, (state, action) => {
                const { id, data } = action.meta.arg;
                const index = state.items.findIndex(item => (item._id || item.id) === id);
                if (index !== -1) {
                    state.items[index] = { ...state.items[index], ...data };
                }
            })
            .addCase(updateFabricPurchase.fulfilled, (state, action) => {
                const index = state.items.findIndex(item => (item._id || item.id) === action.payload._id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
            })
            // Delete (Optimistic)
            .addCase(deleteFabricPurchase.pending, (state, action) => {
                const id = action.meta.arg;
                state.items = state.items.filter(item => (item._id || item.id) !== id);
            })
            .addCase(deleteFabricPurchase.fulfilled, (state) => {
                state.isLoading = false;
            })
            .addCase(deleteFabricPurchase.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
                // Ideally restore here
            });
    },
});

export const { clearError } = fabricPurchasesSlice.actions;
export default fabricPurchasesSlice.reducer;
