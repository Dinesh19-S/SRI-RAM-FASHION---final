import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '../../services/api';

// Async thunks
export const login = createAsyncThunk(
    'auth/login',
    async ({ email, password }, { rejectWithValue }) => {
        try {
            const response = await authAPI.login(email, password);
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            return { token, user };
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Login failed');
        }
    }
);

export const loginWithPhone = createAsyncThunk(
    'auth/loginWithPhone',
    async ({ phone, otp }, { rejectWithValue }) => {
        try {
            const response = await authAPI.loginPhone(phone, otp);
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            return { token, user };
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'OTP verification failed');
        }
    }
);

export const register = createAsyncThunk(
    'auth/register',
    async (userData, { rejectWithValue }) => {
        try {
            const response = await authAPI.register(userData);
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            return { token, user };
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Registration failed');
        }
    }
);

export const sendOTP = createAsyncThunk(
    'auth/sendOTP',
    async (phone, { rejectWithValue }) => {
        try {
            await authAPI.sendOTP(phone);
            return true;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to send OTP');
        }
    }
);

export const getProfile = createAsyncThunk(
    'auth/getProfile',
    async (_, { rejectWithValue }) => {
        try {
            const response = await authAPI.getProfile();
            return response.data.user;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to get profile');
        }
    }
);

export const googleLogin = createAsyncThunk(
    'auth/googleLogin',
    async ({ credential }, { rejectWithValue }) => {
        try {
            const response = await authAPI.googleLogin(credential);
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            return { token, user };
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Google login failed');
        }
    }
);

export const forgotPassword = createAsyncThunk(
    'auth/forgotPassword',
    async (email, { rejectWithValue }) => {
        try {
            const response = await authAPI.forgotPassword(email);
            return response.data.message;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to send reset code');
        }
    }
);

export const resetPassword = createAsyncThunk(
    'auth/resetPassword',
    async ({ email, code, newPassword }, { rejectWithValue }) => {
        try {
            const response = await authAPI.resetPassword(email, code, newPassword);
            return response.data.message;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Password reset failed');
        }
    }
);

// Initial state
const initialState = {
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    isAuthenticated: !!localStorage.getItem('token'),
    isLoading: false,
    error: null,
};

// Slice
const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Login
            .addCase(login.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.token = action.payload.token;
            })
            .addCase(login.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Login with Phone
            .addCase(loginWithPhone.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(loginWithPhone.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.token = action.payload.token;
            })
            .addCase(loginWithPhone.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Register
            .addCase(register.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(register.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.token = action.payload.token;
            })
            .addCase(register.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Send OTP
            .addCase(sendOTP.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(sendOTP.fulfilled, (state) => {
                state.isLoading = false;
            })
            .addCase(sendOTP.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Get Profile
            .addCase(getProfile.fulfilled, (state, action) => {
                state.user = action.payload;
            })
            // Google Login
            .addCase(googleLogin.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(googleLogin.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.token = action.payload.token;
            })
            .addCase(googleLogin.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
