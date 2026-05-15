import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import productsReducer from './slices/productsSlice';
import billsReducer from './slices/billsSlice';
import settingsReducer from './slices/settingsSlice';
import appReducer from './slices/appSlice';
import fabricPurchasesReducer from './slices/fabricPurchasesSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        products: productsReducer,
        bills: billsReducer,
        settings: settingsReducer,
        app: appReducer,
        fabricPurchases: fabricPurchasesReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});

export default store;
