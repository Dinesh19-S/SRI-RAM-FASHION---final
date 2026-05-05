import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '../../services/api';

const readStoredToken = () => {
    const token = localStorage.getItem('token');
    if (!token || token === 'null' || token === 'undefined') return null;
    return token;
};

const readStoredUser = () => {
    const rawUser = localStorage.getItem('user');
    if (!rawUser || rawUser === 'null' || rawUser === 'undefined') return null;

    try {
        return JSON.parse(rawUser);
    } catch {
        return null;
    }
};

const persistAuthState = (token, user) => {
    if (token) {
        localStorage.setItem('token', token);
    } else {
        localStorage.removeItem('token');
    }

    if (user) {
        localStorage.setItem('user', JSON.stringify(user));
    } else {
        localStorage.removeItem('user');
    }
};

// Async thunks
export const login = createAsyncThunk(
    'auth/login',
    async ({ email, password }, { rejectWithValue }) => {
        try {
            const response = await authAPI.login(email, password);
            const { token, user } = response.data;
            persistAuthState(token || null, user || null);
            return { token: token || null, user: user || null };
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message || 'Login failed');
        }
    }
);

export const loginWithPhone = createAsyncThunk(
    'auth/loginWithPhone',
    async ({ phone, otp }, { rejectWithValue }) => {
        try {
            const response = await authAPI.loginPhone(phone, otp);
            const { token, user } = response.data;
            persistAuthState(token || null, user || null);
            return { token: token || null, user: user || null };
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
            persistAuthState(token || null, user || null);
            return { token: token || null, user: user || null };
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
const storedToken = readStoredToken();

const initialState = {
    user: readStoredUser(),
    token: storedToken,
    isAuthenticated: !!storedToken,
    isInitializing: true,   // NEW: prevents premature redirects during OAuth
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
            state.isInitializing = false;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        },
        clearError: (state) => {
            state.error = null;
        },
        // NEW: Called by App.jsx after Supabase session check completes
        setSessionChecked: (state) => {
            state.isInitializing = false;
        },
        // NEW: Called when Google OAuth session is detected
        setSession: (state, action) => {
            state.token = action.payload.token;
            state.user = action.payload.user;
            state.isAuthenticated = !!action.payload.token;
            state.isInitializing = false;
            state.isLoading = false;
            persistAuthState(action.payload.token, action.payload.user);
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
                state.isInitializing = false;
                state.isAuthenticated = !!action.payload.token;
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
                state.isInitializing = false;
                state.isAuthenticated = !!action.payload.token;
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
                state.isInitializing = false;
                state.isAuthenticated = !!action.payload.token;
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
            });
    },
});

export const { logout, clearError, setSessionChecked, setSession } = authSlice.actions;
export default authSlice.reducer;
