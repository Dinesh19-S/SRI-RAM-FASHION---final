import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { settingsAPI } from '../../services/api';

// Async thunks
export const fetchSettings = createAsyncThunk(
    'settings/fetch',
    async (_, { rejectWithValue }) => {
        try {
            const response = await settingsAPI.get();
            return response.data.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch settings');
        }
    }
);

export const updateSettings = createAsyncThunk(
    'settings/update',
    async (data, { rejectWithValue }) => {
        try {
            const response = await settingsAPI.update(data);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update settings');
        }
    }
);

// Initial state
const initialState = {
    data: null,
    theme: localStorage.getItem('theme') || 'light',
    themeColor: localStorage.getItem('themeColor') || 'blue',
    isLoading: false,
    error: null,
};

// Slice
const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
        setTheme: (state, action) => {
            state.theme = action.payload;
            localStorage.setItem('theme', action.payload);
            if (action.payload === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        },
        setThemeColor: (state, action) => {
            state.themeColor = action.payload;
            localStorage.setItem('themeColor', action.payload);
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch Settings
            .addCase(fetchSettings.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchSettings.fulfilled, (state, action) => {
                state.isLoading = false;
                state.data = action.payload;
            })
            .addCase(fetchSettings.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Update Settings
            .addCase(updateSettings.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(updateSettings.fulfilled, (state, action) => {
                state.isLoading = false;
                state.data = action.payload;
            })
            .addCase(updateSettings.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    },
});

export const { setTheme, setThemeColor, clearError } = settingsSlice.actions;
export default settingsSlice.reducer;
