import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    syncStatus: 'connecting', // 'connecting', 'connected', 'error', 'disconnected'
    syncError: null,
    isOnline: typeof window !== 'undefined' ? window.navigator.onLine : true,
    lastSyncedAt: null,
    loadingCount: 0,
    isLoading: false,
};

const appSlice = createSlice({
    name: 'app',
    initialState,
    reducers: {
        setSyncStatus: (state, action) => {
            state.syncStatus = action.payload;
        },
        setSyncError: (state, action) => {
            state.syncError = action.payload;
        },
        setOnlineStatus: (state, action) => {
            state.isOnline = action.payload;
        },
        setLastSynced: (state, action) => {
            state.lastSyncedAt = action.payload || new Date().toISOString();
        },
        startLoading: (state) => {
            state.loadingCount += 1;
            state.isLoading = true;
        },
        stopLoading: (state) => {
            state.loadingCount = Math.max(0, state.loadingCount - 1);
            state.isLoading = state.loadingCount > 0;
        }
    },
});

export const { setSyncStatus, setSyncError, setOnlineStatus, setLastSynced, startLoading, stopLoading } = appSlice.actions;
export default appSlice.reducer;
