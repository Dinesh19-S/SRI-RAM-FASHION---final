import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    syncStatus: 'connecting', // 'connecting', 'connected', 'error', 'disconnected'
    syncError: null,
    isOnline: typeof window !== 'undefined' ? window.navigator.onLine : true,
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
    },
});

export const { setSyncStatus, setSyncError, setOnlineStatus } = appSlice.actions;
export default appSlice.reducer;
