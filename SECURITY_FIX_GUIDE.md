# Sri Ram Fashions - Authentication Security Fix Guide

## Quick Start: Implementation Roadmap

### Phase 1: Critical Fixes (Today/Tomorrow)
- [ ] Implement input validation
- [ ] Add rate limiting
- [ ] Migrate password reset to MongoDB
- [ ] Add account lockout

### Phase 2: High Priority (This Week)
- [ ] Email verification flow
- [ ] Audit logging
- [ ] HTTPS enforcement
- [ ] Token expiration handling in frontend

### Phase 3: Medium Priority (Next Week)
- [ ] Real OTP integration (Twilio)
- [ ] Session management
- [ ] CSRF protection

---

## Issue #1: Missing Input Validation

### Problem
The authentication endpoints don't validate email format, password strength, or other inputs. This allows:
- Invalid emails like "%%%@test"
- Weak passwords like "password"
- XSS injection in name field
- NoSQL injection attacks

### Current Code (VULNERABLE)
```javascript
router.post('/register', async (req, res) => {
    const { name, email, password, phone } = req.body;
    // ❌ No validation!
    const user = new User({ name, email, password, phone });
    await user.save();
});
```

### Fixed Code
```javascript
import validator from 'validator';

// Install: npm install validator

const validateEmail = (email) => {
    return validator.isEmail(email.trim());
};

const validatePassword = (password) => {
    if (password.length < 8) 
        return { valid: false, message: 'Minimum 8 characters' };
    
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
    if (!regex.test(password))
        return { 
            valid: false,
            message: 'Must contain uppercase, lowercase, number, special char'
        };
    return { valid: true };
};

router.post('/register', async (req, res) => {
    if (!validateEmail(req.body.email)) {
        return res.status(400).json({ message: 'Invalid email' });
    }
    
    const pwValidation = validatePassword(req.body.password);
    if (!pwValidation.valid) {
        return res.status(400).json({ message: pwValidation.message });
    }
    
    // Safe to create user
    const user = new User(req.body);
    await user.save();
});
```

### Installation
```bash
npm install validator
```

---

## Issue #2: No Rate Limiting

### Problem
Unlimited login attempts enable brute force attacks. Attackers can try thousands of password combinations without getting blocked.

### Current Code (VULNERABLE)
```javascript
router.post('/login', async (req, res) => {
    // Let anyone attempt login unlimited times
    const user = await User.findOne({ email });
    // ...
});
```

### Fixed Code
```javascript
import rateLimit from 'express-rate-limit';

// Install: npm install express-rate-limit

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 5,                     // 5 attempts per window
    message: 'Too many login attempts',
    keyGenerator: (req) => `${req.ip}:${req.body.email}`
});

router.post('/login', loginLimiter, async (req, res) => {
    // Can only attempt 5 logins per 15 minutes
    const user = await User.findOne({ email });
    // ...
});
```

### Installation
```bash
npm install express-rate-limit
```

---

## Issue #3: No Account Lockout

### Problem
Even with rate limiting, attackers can keep trying. We need to lock accounts temporarily after repeated failed attempts.

### Current Code (VULNERABLE)
```javascript
const isMatch = await bcrypt.compare(password, user.password);
if (!isMatch) {
    // Just fail the login, no consequence
    return res.status(401).json({ message: 'Invalid credentials' });
}
```

### Fixed Code
```javascript
// Create LoginAttempt model to track failed attempts
// See auth-models-FIXED.js for the model

const checkAccountLockout = async (email) => {
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 min

    const cutoffTime = new Date(Date.now() - LOCKOUT_DURATION);
    const attempts = await LoginAttempt.countDocuments({
        email,
        success: false,
        createdAt: { $gte: cutoffTime }
    });

    if (attempts >= MAX_ATTEMPTS) {
        return {
            locked: true,
            message: 'Account temporarily locked due to failed login attempts'
        };
    }
    return { locked: false };
};

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    // Check lockout BEFORE checking password
    const lockout = await checkAccountLockout(email);
    if (lockout.locked) {
        return res.status(429).json({
            success: false,
            message: lockout.message
        });
    }
    
    const user = await User.findOne({ email });
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
        // Record failed attempt
        await LoginAttempt.create({ email, success: false });
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Record successful attempt
    await LoginAttempt.create({ email, success: true });
    // ... generate token
});
```

---

## Issue #4: Password Reset Tokens Not Persistent

### Problem
Reset tokens stored in memory (JavaScript Map) are lost when server restarts. Users can't reset password after restart.

### Current Code (VULNERABLE)
```javascript
// ❌ In-memory storage - LOST ON SERVER RESTART
const resetCodes = new Map();

router.post('/forgot-password', async (req, res) => {
    const resetCode = generateCode();
    resetCodes.set(email, { code: resetCode, expiresAt: Date.now() + 10 * 60 * 1000 });
    // If server restarts, resetCodes is gone!
});
```

### Fixed Code
```javascript
// Create PasswordResetToken model to persist in MongoDB
// See auth-models-FIXED.js for the model

router.post('/forgot-password', async (req, res) => {
    const user = await User.findOne({ email });
    
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetToken = jwt.sign(
        { userId: user._id },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
    
    // ✅ Store in persistent database
    await PasswordResetToken.create({
        email,
        token: resetToken,
        code: resetCode,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        used: false
    });
    
    // Send email with code
    await sendPasswordResetEmail(email, resetCode);
});

router.post('/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body;
    
    // ✅ Retrieve from database
    const resetData = await PasswordResetToken.findOne({
        email,
        code,
        used: false
    });
    
    if (!resetData || new Date() > resetData.expiresAt) {
        return res.status(400).json({ message: 'Invalid or expired code' });
    }
    
    // Update password
    const user = await User.findOne({ email });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    
    // ✅ Mark token as used (one-time use)
    resetData.used = true;
    await resetData.save();
});
```

---

## Issue #5: Mock OTP Hardcoded

### Problem
OTP is hardcoded to '123456'. Anyone can login with this hardcoded OTP.

### Current Code (VULNERABLE)
```javascript
router.post('/login-phone', async (req, res) => {
    const { phone, otp } = req.body;
    
    // ❌ Hardcoded for testing - ANYONE can login!
    if (otp !== '123456') {
        return res.status(401).json({ message: 'Invalid OTP' });
    }
    // ...
});
```

### Stage 1: Improve Mock Implementation
```javascript
// For testing, generate actual random OTPs

router.post('/send-otp', async (req, res) => {
    const { phone } = req.body;
    
    // Generate random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in database
    await OTPCode.create({
        phone,
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0
    });
    
    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
        console.log(`OTP for ${phone}: ${otp}`);
    } else {
        // In production, send via SMS
        await sendOTPViaSMS(phone, otp);
    }
});

router.post('/login-phone', async (req, res) => {
    const { phone, otp } = req.body;
    
    const otpData = await OTPCode.findOne({
        phone,
        code: otp,
        used: false
    });
    
    if (!otpData || new Date() > otpData.expiresAt) {
        return res.status(401).json({ message: 'Invalid or expired OTP' });
    }
    
    // Mark as used
    otpData.used = true;
    await otpData.save();
    
    // Continue with login
    // ...
});
```

### Stage 2: Real SMS Integration (Twilio)
```bash
npm install twilio
```

```javascript
import twilio from 'twilio';

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

router.post('/send-otp', async (req, res) => {
    const { phone } = req.body;
    
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    try {
        // Send via Twilio
        await client.messages.create({
            body: `Your verification code is: ${otp}. Valid for 10 minutes.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone
        });
        
        // Store OTP
        await OTPCode.create({
            phone,
            code: otp,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        });
        
        res.json({ success: true, message: 'OTP sent' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
});
```

---

## Issue #6: No Email Verification

### Problem
Users can register with any email without verification. Same email can be registered multiple times from different Twilio/SMS accounts.

### Fix: Email Verification Flow

```javascript
// 1. Create EmailVerification model (see auth-models-FIXED.js)

// 2. Update User model to add:
// emailVerified: { type: Boolean, default: false }
// emailVerificationToken: String
// emailVerificationTokenExpires: Date

// 3. On registration, send verification email
router.post('/register', async (req, res) => {
    // ... validation and user creation
    
    const user = new User({
        name,
        email,
        password: hashedPassword,
        emailVerified: false
    });
    await user.save();
    
    // Generate verification token
    const verificationToken = jwt.sign(
        { userId: user._id },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
    
    // Save token
    user.emailVerificationToken = verificationToken;
    user.emailVerificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    
    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    await sendVerificationEmail(email, verificationUrl);
    
    res.json({
        success: true,
        message: 'Please verify your email to complete registration'
    });
});

// 4. Verification endpoint
router.post('/verify-email', async (req, res) => {
    const { token } = req.body;
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        user.emailVerified = true;
        user.emailVerifiedAt = new Date();
        user.emailVerificationToken = null;
        await user.save();
        
        res.json({ success: true, message: 'Email verified successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Invalid or expired token' });
    }
});

// 5. Check verification on login (optional)
router.post('/login', async (req, res) => {
    // ... existing login logic
    
    // Optional: require email verification
    if (!user.emailVerified && process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
        return res.status(403).json({
            success: false,
            message: 'Please verify your email before login'
        });
    }
});
```

---

## Issue #7: No HTTPS Enforcement

### Problem
In production, all tokens and passwords are transmitted over HTTP (unencrypted). MITM attacks can steal everything.

### Fix: Enforce HTTPS in Production

```javascript
// Add to your backend/src/index.js

if (process.env.NODE_ENV === 'production') {
    // Option 1: Redirect HTTP to HTTPS
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
    
    // Option 2: Use helmet for security headers
    import helmet from 'helmet';
    app.use(helmet());
    
    // Option 3: Set HSTS header (tells browsers to always use HTTPS)
    app.use((req, res, next) => {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        next();
    });
}
```

---

## Deployment Checklist

### Before Going to Production

- [ ] Change JWT_SECRET to a strong random value
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS/SSL certificate
- [ ] Input validation implemented
- [ ] Rate limiting implemented
- [ ] Account lockout implemented
- [ ] Password reset tokens persistent
- [ ] Email verification implemented
- [ ] Audit logging implemented
- [ ] Error handling covers all paths
- [ ] No console.log in production
- [ ] Environment variables secured
- [ ] Database backups configured
- [ ] Security headers added (helmet.js)
- [ ] CORS properly configured
- [ ] Rate limiting increased for production
- [ ] Logging infrastructure in place
- [ ] Monitoring/alerting configured
- [ ] Incident response plan ready
- [ ] Penetration testing completed

---

## Environment Variables Template

```env
# Core
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db

# Security
JWT_SECRET=your-super-secret-key-at-least-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION_MS=900000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_IDS=id1,id2,id3

# Email (Resend or Gmail)
RESEND_API_KEY=re_your_key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
RESEND_FROM=Sri Ram Fashions <noreply@example.com>

# SMS (Twilio for OTP)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Frontend
FRONTEND_URL=https://your-domain.com
VITE_API_URL=https://your-api.com/api/v1

# Features
REQUIRE_EMAIL_VERIFICATION=true
ENABLE_PHONE_OTP=true
ENABLE_GOOGLE_OAUTH=true
```

---

## Testing the Fixes

### Test INPUT VALIDATION
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "email": "invalid-email",
    "password": "weak"
  }'
# Should return 400 with validation errors
```

### Test RATE LIMITING
```bash
# Try logging in 6 times quickly
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# 6th attempt should return 429 (Too Many Requests)
```

### Test PASSWORD RESET
```bash
# Request reset
curl -X POST http://localhost:5000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}'

# Check MongoDB for...
# Reset code in PasswordResetToken collection
# Code should be 6 digits

# Reset with code
curl -X POST http://localhost:5000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@test.com",
    "code":"123456",
    "newPassword":"NewPassword@123"
  }'
```

---

## Next Steps

1. **This week**: Implement fixes #1-4 (Validation, Rate Limiting, Account Lockout, Persistent Reset)
2. **Next week**: Implement fixes #5-6 (Real OTP, Email Verification)
3. **Week after**: Implement audit logging and HTTPS enforcement
4. **Then**: Penetration testing and security review

---

## Emergency Contact

If you're about to deploy and find a critical security issue:

1. Check if rate limiting is enabled
2. Verify password reset tokens are in MongoDB
3. Ensure input validation is working
4. Test account lockout manually
5. If all 4 are working, you're safe to deploy (fixes #1-4)

For remaining issues (#5-7), they can be fixed after deployment but should be prioritized.

---

**Last Updated:** March 14, 2026
