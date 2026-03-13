import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { billsAPI } from '../../services/api';

// Async thunks
export const fetchBills = createAsyncThunk(
    'bills/fetchAll',
    async (params, { rejectWithValue }) => {
        try {
            const response = await billsAPI.getAll(params);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch bills');
        }
    }
);

export const createBill = createAsyncThunk(
    'bills/create',
    async (data, { rejectWithValue }) => {
        try {
            const response = await billsAPI.create(data);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to create bill');
        }
    }
);

export const fetchBillById = createAsyncThunk(
    'bills/fetchById',
    async (id, { rejectWithValue }) => {
        try {
            const response = await billsAPI.getById(id);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch bill');
        }
    }
);

export const updateBillStatus = createAsyncThunk(
    'bills/updateStatus',
    async ({ id, status }, { rejectWithValue }) => {
        try {
            const response = await billsAPI.update(id, { paymentStatus: status });
            return response.data.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update bill');
        }
    }
);

export const deleteBill = createAsyncThunk(
    'bills/delete',
    async (id, { rejectWithValue }) => {
        try {
            await billsAPI.delete(id);
            return id;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to delete bill');
        }
    }
);

// Initial state
const initialState = {
    items: [],
    currentBill: null,
    pagination: null,
    lastFetchedAt: 0,
    isLoading: false,
    error: null,
};

// Slice
const billsSlice = createSlice({
    name: 'bills',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        clearCurrentBill: (state) => {
            state.currentBill = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch Bills
            .addCase(fetchBills.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchBills.fulfilled, (state, action) => {
                state.isLoading = false;
                state.items = action.payload.data;
                state.pagination = action.payload.pagination;
                state.lastFetchedAt = Date.now();
            })
            .addCase(fetchBills.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Create Bill
            .addCase(createBill.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(createBill.fulfilled, (state, action) => {
                state.isLoading = false;
                state.items.unshift(action.payload);
                state.currentBill = action.payload;
            })
            .addCase(createBill.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Fetch Bill by ID
            .addCase(fetchBillById.fulfilled, (state, action) => {
                state.currentBill = action.payload;
            })
            // Update Bill Status
            .addCase(updateBillStatus.fulfilled, (state, action) => {
                const index = state.items.findIndex(b => b._id === action.payload._id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
            })
            // Delete Bill
            .addCase(deleteBill.fulfilled, (state, action) => {
                state.items = state.items.filter(b => b._id !== action.payload);
            });
    },
});

export const { clearError, clearCurrentBill } = billsSlice.actions;
export default billsSlice.reducer;
