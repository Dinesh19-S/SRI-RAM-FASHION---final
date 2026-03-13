/**
 * New Database Models Required for Fixed Authentication
 * These models support enhanced security features
 */

// 1. LoginAttempt Model - Track failed login attempts
import mongoose from 'mongoose';

const loginAttemptSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true
    },
    success: {
        type: Boolean,
        required: true,
        index: true
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400 // Auto-delete after 24 hours
    }
});

loginAttemptSchema.index({ email: 1, createdAt: -1 });

export const LoginAttempt = mongoose.model('LoginAttempt', loginAttemptSchema);

// 2. PasswordResetToken Model - Persistent password reset tokens
const passwordResetTokenSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        index: true
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    code: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 } // Auto-delete when expired
    },
    used: {
        type: Boolean,
        default: false
    },
    usedAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const PasswordResetToken = mongoose.model('PasswordResetToken', passwordResetTokenSchema);

// 3. Updated User Model - With email verification
const updatedUserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        trim: true
    },
    role: {
        type: String,
        enum: ['admin', 'staff'],
        default: 'staff'
    },
    avatar: String,
    googleId: {
        type: String,
        sparse: true
    },
    // ✅ EMAIL VERIFICATION
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationTokenExpires: Date,
    emailVerifiedAt: Date,
    // ✅ ACCOUNT STATUS
    isActive: {
        type: Boolean,
        default: true
    },
    lastLoginAt: Date,
    lastLoginIp: String,
    // ✅ SECURITY
    passwordChangedAt: Date,
    passwordChangeAttempts: {
        type: Number,
        default: 0
    },
    // ✅ AUDIT
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

export const UpdatedUser = mongoose.model('User', updatedUserSchema);

// 4. AuditLog Model - Track all authentication events
const auditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    email: {
        type: String,
        lowercase: true
    },
    action: {
        type: String,
        enum: [
            'LOGIN_SUCCESS',
            'LOGIN_FAILED',
            'LOGIN_ATTEMPT_LOCKED',
            'REGISTRATION',
            'PASSWORD_RESET_REQUEST',
            'PASSWORD_RESET_SUCCESS',
            'PASSWORD_RESET_FAILED',
            'EMAIL_VERIFIED',
            'ACCOUNT_LOCKED',
            'ACCOUNT_UNLOCKED'
        ],
        required: true,
        index: true
    },
    ipAddress: String,
    userAgent: String,
    details: {
        type: Map,
        of: String
    },
    status: {
        type: String,
        enum: ['success', 'failed', 'pending'],
        default: 'success'
    },
    error: String,
    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
        expires: 2592000 // 30 days
    }
});

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);

// 5. EmailVerification Model - Track email verification tokens
const emailVerificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 }
    },
    verifiedAt: Date,
    attempts: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const EmailVerification = mongoose.model('EmailVerification', emailVerificationSchema);

// 6. Session Model - For session management
const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    token: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    ipAddress: String,
    userAgent: String,
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 } // Auto-delete expired sessions
    },
    revokedAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const Session = mongoose.model('Session', sessionSchema);

/**
 * MIGRATION GUIDE
 * 
 * To add these new models to your existing User model:
 * 
 * 1. Add email verification fields to User model:
 *    emailVerified: Boolean (default: false)
 *    emailVerificationToken: String
 *    emailVerificationTokenExpires: Date
 *    emailVerifiedAt: Date
 * 
 * 2. Create indexes in MongoDB:
 *    db.loginattempts.createIndex({ "email": 1, "createdAt": -1 })
 *    db.passwordresettokens.createIndex({ "email": 1 })
 *    db.auditlens.createIndex({ "email": 1, "createdAt": -1 })
 *    db.auditlens.createIndex({ "action": 1 })
 * 
 * 3. Verify collections auto-expire obsolete records:
 *    - LoginAttempt: 24 hours
 *    - PasswordResetToken: when expiresAt reached
 *    - AuditLog: 30 days
 *    - EmailVerification: when expiresAt reached
 *    - Session: when expiresAt reached
 */
