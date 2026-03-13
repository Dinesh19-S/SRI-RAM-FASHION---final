/**
 * FIXED Authentication Routes - With All Security Improvements
 * Implements: Input validation, rate limiting, account lockout, persistent password reset
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import validator from 'validator';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import PasswordResetToken from '../models/PasswordResetToken.js';
import LoginAttempt from '../models/LoginAttempt.js';
import { sendPasswordResetEmail, isEmailConfigured } from '../services/emailService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}

// ✅ FIX #1: Rate Limiting Configuration
const loginLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS) || 5,
    message: 'Too many login attempts. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === 'development', // Skip in dev
    keyGenerator: (req) => `${req.ip}:${req.body.email || 'unknown'}`
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Max 5 registrations per hour per IP
    message: 'Too many registration attempts. Please try again later.'
});

const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3, // Max 3 password reset requests per hour
    message: 'Too many password reset attempts. Please try again later.'
});

// ✅ FIX #2: Input Validation Helper
const validateEmail = (email) => {
    if (!email || typeof email !== 'string') return false;
    return validator.isEmail(email.trim());
};

const validatePassword = (password) => {
    if (!password || typeof password !== 'string') return false;
    if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
    
    // Require: uppercase, lowercase, number, special char
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!regex.test(password)) {
        return { 
            valid: false, 
            message: 'Password must contain uppercase, lowercase, number, and special character (@$!%*?&)' 
        };
    }
    return { valid: true };
};

const validateName = (name) => {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    return trimmed.length >= 2 && trimmed.length <= 100;
};

const validatePhone = (phone) => {
    if (!phone || typeof phone !== 'string') return false;
    return validator.isMobilePhone(phone, 'any', { strictMode: true });
};

// ✅ FIX #3: Account Lockout Helper
const checkAccountLockout = async (email) => {
    const MAX_ATTEMPTS = parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS) || 5;
    const LOCKOUT_DURATION = parseInt(process.env.ACCOUNT_LOCKOUT_DURATION_MS) || 15 * 60 * 1000;

    // Find recent failed attempts
    const cutoffTime = new Date(Date.now() - LOCKOUT_DURATION);
    const attempts = await LoginAttempt.countDocuments({
        email,
        success: false,
        createdAt: { $gte: cutoffTime }
    });

    if (attempts >= MAX_ATTEMPTS) {
        const lastAttempt = await LoginAttempt.findOne({ email, success: false }).sort({ createdAt: -1 });
        const lockoutExpiresAt = new Date(lastAttempt.createdAt.getTime() + LOCKOUT_DURATION);
        
        if (Date.now() < lockoutExpiresAt.getTime()) {
            return {
                locked: true,
                expiresAt: lockoutExpiresAt,
                message: `Account locked. Try again after ${lockoutExpiresAt.toLocaleTimeString()}`
            };
        } else {
            // Clear old attempts
            await LoginAttempt.deleteMany({ email, createdAt: { $lt: cutoffTime } });
        }
    }

    return { locked: false };
};

const recordLoginAttempt = async (email, success) => {
    try {
        await LoginAttempt.create({ email, success });
        
        // Clean up old attempts (older than 24 hours)
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        await LoginAttempt.deleteMany({ createdAt: { $lt: cutoff } });
    } catch (error) {
        console.error('Failed to record login attempt:', error);
    }
};

// ✅ ENHANCED: Login with validation and rate limiting
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate inputs
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Check account lockout
        const lockoutStatus = await checkAccountLockout(email);
        if (lockoutStatus.locked) {
            return res.status(429).json({
                success: false,
                message: lockoutStatus.message
            });
        }

        const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
        if (!user) {
            // Record failed attempt
            await recordLoginAttempt(email, false);
            // Generic message (doesn't reveal if email exists)
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check email verification (optional)
        if (!user.emailVerified && process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
            return res.status(403).json({
                success: false,
                message: 'Please verify your email before login'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // Record failed attempt
            await recordLoginAttempt(email, false);
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Record successful login
        await recordLoginAttempt(email, true);

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                avatar: user.avatar,
                emailVerified: user.emailVerified
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.'
        });
    }
});

// ✅ ENHANCED: Registration with full validation
router.post('/register', registerLimiter, async (req, res) => {
    try {
        const { name, email, password, confirmPassword, phone } = req.body;

        // Validate all inputs
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required'
            });
        }

        if (!validateName(name)) {
            return res.status(400).json({
                success: false,
                message: 'Name must be between 2 and 100 characters'
            });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                success: false,
                message: passwordValidation.message
            });
        }

        // Verify password confirmation
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        // Validate phone if provided
        if (phone && !validatePhone(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid phone number format'
            });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Email already registered. Please login or use a different email.'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = new User({
            name: name.trim(),
            email: email.toLowerCase(),
            password: hashedPassword,
            phone: phone || '',
            role: 'staff',
            emailVerified: false // ✅ FIX: Track email verification
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            success: true,
            message: 'Registration successful. Please verify your email.',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                emailVerified: user.emailVerified
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed. Please try again.'
        });
    }
});

// ✅ FIX #4: Forgot Password - with persistent database storage
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email
        if (!validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
        
        // Don't reveal if email exists (security best practice)
        if (!user) {
            return res.json({
                success: true,
                message: 'If this email exists, a reset code has been sent'
            });
        }

        // Generate reset token
        const resetToken = jwt.sign(
            { userId: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Generate 6-digit code for email
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

        // ✅ FIX: Store in persistent database, not in-memory
        await PasswordResetToken.create({
            email: user.email,
            token: resetToken,
            code: resetCode,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            used: false
        });

        // Send reset email with token and code
        if (isEmailConfigured()) {
            const result = await sendPasswordResetEmail(user.email, resetCode, resetToken);
            if (!result.success) {
                // ✅ FIX: Return error if email fails
                return res.status(503).json({
                    success: false,
                    message: 'Failed to send reset email. Please try again later.'
                });
            }
        } else {
            // Fallback: log to console when email is not configured
            console.log(`\n========================================`);
            console.log(`Password Reset for ${user.email}`);
            console.log(`Code: ${resetCode}`);
            console.log(`Token: ${resetToken}`);
            console.log(`Expires in 24 hours`);
            console.log(`========================================\n`);
        }

        res.json({
            success: true,
            message: 'Reset code sent to your email'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Password reset request failed. Please try again.'
        });
    }
});

// ✅ FIX #5: Reset Password - with validation and token verification
router.post('/reset-password', async (req, res) => {
    try {
        const { email, code, newPassword, confirmPassword } = req.body;

        // Validate inputs
        if (!email || !code || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Email, reset code, and new password are required'
            });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Validate password
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                success: false,
                message: passwordValidation.message
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        // Check if reset token exists and is valid
        const resetData = await PasswordResetToken.findOne({
            email: email.toLowerCase(),
            code,
            used: false
        });

        if (!resetData) {
            return res.status(400).json({
                success: false,
                message: 'Invalid reset code. Please request a new one.'
            });
        }

        // Check expiration
        if (new Date() > resetData.expiresAt) {
            // Mark as expired
            resetData.used = true;
            await resetData.save();
            return res.status(400).json({
                success: false,
                message: 'Reset code has expired. Please request a new one.'
            });
        }

        // Find user and update password
        const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Hash new password
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        // Mark reset token as used (one-time use)
        resetData.used = true;
        await resetData.save();

        // Clear any related tokens
        await PasswordResetToken.deleteMany({ email: email.toLowerCase() });

        console.log(`Password reset successful for ${email}`);

        res.json({
            success: true,
            message: 'Password has been reset successfully. You can now login with your new password.'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Password reset failed. Please try again.'
        });
    }
});

// Google OAuth Login (unchanged but with error handling)
router.post('/google', async (req, res) => {
    try {
        const GOOGLE_CLIENT_IDS = [
            ...(process.env.GOOGLE_CLIENT_IDS || '').split(','),
            process.env.GOOGLE_CLIENT_ID || ''
        ]
            .map((value) => value.trim())
            .filter(Boolean);

        if (GOOGLE_CLIENT_IDS.length === 0) {
            return res.status(503).json({
                success: false,
                message: 'Google login is not configured on this server'
            });
        }

        const googleClient = new OAuth2Client();
        const { credential } = req.body;

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_IDS
        });

        const payload = ticket.getPayload();
        const { email, name, picture, sub: googleId } = payload;

        let user = await User.findOne({ email });

        if (!user) {
            user = new User({
                name,
                email,
                password: await bcrypt.hash(googleId + Math.random().toString(), 10),
                phone: '',
                role: 'staff',
                avatar: picture,
                googleId,
                isActive: true,
                emailVerified: true // ✅ FIX: Google verified email
            });
            await user.save();
        } else {
            if (!user.googleId) {
                user.googleId = googleId;
                user.avatar = picture || user.avatar;
                user.emailVerified = true;
                await user.save();
            }
        }

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                avatar: user.avatar,
                emailVerified: user.emailVerified
            }
        });
    } catch (error) {
        console.error('Google auth error:', error);
        let errorMessage = 'Google authentication failed';
        if (error.message.includes('Token used too late')) {
            errorMessage = 'Token expired. Please try again.';
        } else if (error.message.includes('Invalid token')) {
            errorMessage = 'Invalid token. Please try again.';
        } else if (error.message.includes('audience')) {
            errorMessage = 'Configuration mismatch. Check GOOGLE_CLIENT_ID settings.';
        }
        res.status(401).json({ success: false, message: errorMessage });
    }
});

// Protected route: Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch profile' });
    }
});

export default router;
