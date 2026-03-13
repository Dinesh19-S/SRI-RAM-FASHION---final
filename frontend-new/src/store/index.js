import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import productsReducer from './slices/productsSlice';
import billsReducer from './slices/billsSlice';
import settingsReducer from './slices/settingsSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        products: productsReducer,
        bills: billsReducer,
        settings: settingsReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});

export default store;
