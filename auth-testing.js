#!/usr/bin/env node

/**
 * Comprehensive Authentication Testing Suite for Sri Ram Fashions
 * Tests all auth flows: login, registration, password reset, OTP, Google OAuth
 */

import axios from 'axios';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import 'dotenv/config';
import User from './backend/src/models/User.js';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sri-ram-fashions';
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

// Test results tracking
const results = {
    passed: [],
    failed: [],
    warnings: [],
    issues: []
};

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const log = {
    success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
    header: (msg) => console.log(`\n${colors.blue}${msg}${colors.reset}`)
};

class AuthTester {
    constructor() {
        this.testResults = [];
        this.testUser = {
            name: 'Test User ' + Date.now(),
            email: `test${Date.now()}@example.com`,
            password: 'Test@123456',
            phone: '9876543210'
        };
    }

    // Test 1: Backend Connectivity
    async testBackendStatus() {
        log.header('\n🔍 TEST 1: Backend Status & Connectivity');
        
        try {
            const response = await axios.get(`${API_BASE_URL.replace('/api/v1', '')}/api/ping`);
            log.success('Backend is accessible');
            results.passed.push('Backend connectivity');
            return true;
        } catch (error) {
            log.error(`Backend not accessible: ${error.message}`);
            results.failed.push({
                test: 'Backend connectivity',
                error: error.message
            });
            return false;
        }
    }

    // Test 2: Database Connection
    async testDatabaseConnection() {
        log.header('\n🔍 TEST 2: Database Connection');
        
        try {
            await mongoose.connect(MONGODB_URI);
            log.success('MongoDB connection successful');
            results.passed.push('Database connection');
            return true;
        } catch (error) {
            log.error(`MongoDB connection failed: ${error.message}`);
            results.failed.push({
                test: 'Database connection',
                error: error.message,
                severity: 'CRITICAL'
            });
            return false;
        }
    }

    // Test 3: Email/Password Login
    async testEmailPasswordLogin() {
        log.header('\n🔍 TEST 3: Email/Password Login');
        
        try {
            // First try with a default admin account
            const loginResponse = await axios.post(
                `${API_BASE_URL}/auth/login`,
                {
                    email: 'admin@sriramfashions.com',
                    password: 'Admin@123456'
                }
            );

            if (loginResponse.status !== 200) {
                log.error(`Login returned status ${loginResponse.status}`);
                results.failed.push({
                    test: 'Email/Password login',
                    issue: `Unexpected status code: ${loginResponse.status}`,
                    severity: 'HIGH'
                });
                return null;
            }

            const { success, token, user } = loginResponse.data;

            if (!success) {
                log.error('Login returned success: false');
                results.failed.push({
                    test: 'Email/Password login',
                    issue: 'success field is false',
                    severity: 'CRITICAL'
                });
                return null;
            }

            if (!token) {
                log.error('No token returned from login');
                results.failed.push({
                    test: 'Email/Password login',
                    issue: 'Token missing in response',
                    severity: 'CRITICAL'
                });
                return null;
            }

            // Validate JWT token
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                log.success('JWT token is valid');
                results.passed.push('JWT token validation');
            } catch (error) {
                log.error(`JWT validation failed: ${error.message}`);
                results.failed.push({
                    test: 'JWT token validation',
                    error: error.message,
                    severity: 'CRITICAL'
                });
            }

            // Verify user object contains required fields
            const requiredFields = ['id', 'name', 'email', 'role'];
            const missingFields = requiredFields.filter(field => !user[field]);
            
            if (missingFields.length > 0) {
                log.warning(`User object missing fields: ${missingFields.join(', ')}`);
                results.warnings.push({
                    test: 'User object completeness',
                    message: `Missing fields: ${missingFields.join(', ')}`
                });
            } else {
                log.success(`User object contains all required fields`);
                results.passed.push('User object structure');
            }

            // Check token expiration (should be 7 days)
            const decoded = jwt.decode(token);
            const expirationTime = decoded.exp * 1000 - Date.now();
            const daysRemaining = expirationTime / (1000 * 60 * 60 * 24);
            
            if (daysRemaining < 6 || daysRemaining > 7) {
                log.warning(`Token expiration: ${daysRemaining.toFixed(2)} days (expected ~7)`);
                results.warnings.push({
                    test: 'Token expiration',
                    message: `Expiration: ${daysRemaining.toFixed(2)} days`
                });
            } else {
                log.success(`Token expiration: ${daysRemaining.toFixed(2)} days`);
                results.passed.push('Token 7-day expiration');
            }

            log.success('Email/Password login successful');
            results.passed.push('Email/Password login');
            return token;

        } catch (error) {
            log.error(`Login failed: ${error.message}`);
            if (error.response?.status === 401) {
                results.failed.push({
                    test: 'Email/Password login (admin)',
                    issue: 'Admin credentials not found or invalid',
                    severity: 'HIGH'
                });
            } else {
                results.failed.push({
                    test: 'Email/Password login',
                    error: error.message,
                    severity: 'HIGH'
                });
            }
            return null;
        }
    }

    // Test 4: User Registration
    async testRegistration() {
        log.header('\n🔍 TEST 4: User Registration');
        
        try {
            const registerResponse = await axios.post(
                `${API_BASE_URL}/auth/register`,
                this.testUser
            );

            const { success, token, user } = registerResponse.data;

            if (!success || !token) {
                log.error('Registration did not return token');
                results.failed.push({
                    test: 'User registration',
                    issue: 'Token not returned',
                    severity: 'CRITICAL'
                });
                return null;
            }

            log.success('New user registered');
            results.passed.push('User registration');

            // Verify can login with new credentials
            try {
                const loginResponse = await axios.post(
                    `${API_BASE_URL}/auth/login`,
                    {
                        email: this.testUser.email,
                        password: this.testUser.password
                    }
                );

                if (loginResponse.data.success) {
                    log.success('Can login with new registered credentials');
                    results.passed.push('Login with new credentials');
                } else {
                    log.error('Cannot login with new credentials');
                    results.failed.push({
                        test: 'Login with new credentials',
                        issue: 'Login unsuccessful after registration',
                        severity: 'HIGH'
                    });
                }
            } catch (error) {
                log.error(`Cannot login with new credentials: ${error.message}`);
                results.failed.push({
                    test: 'Login with new credentials',
                    error: error.message,
                    severity: 'HIGH'
                });
            }

            // Check password is hashed in database
            const dbUser = await User.findOne({ email: this.testUser.email });
            if (dbUser.password === this.testUser.password) {
                log.error('PASSWORD STORED IN PLAIN TEXT - CRITICAL SECURITY ISSUE');
                results.failed.push({
                    test: 'Password hashing',
                    issue: 'Password stored in plain text',
                    severity: 'CRITICAL'
                });
            } else if (dbUser.password) {
                log.success('Password is hashed in database');
                results.passed.push('Password hashing');
            }

            // Check default role is 'staff'
            if (user.role === 'staff') {
                log.success('Default role is "staff"');
                results.passed.push('Default staff role');
            } else {
                log.warning(`Default role is "${user.role}", expected "staff"`);
                results.warnings.push({
                    test: 'Default role',
                    message: `Role is ${user.role}`
                });
            }

            return token;

        } catch (error) {
            log.error(`Registration failed: ${error.message}`);
            results.failed.push({
                test: 'User registration',
                error: error.message,
                severity: error.response?.status === 400 ? 'MEDIUM' : 'HIGH'
            });
            return null;
        }
    }

    // Test 5: Forgot Password
    async testForgotPassword() {
        log.header('\n🔍 TEST 5: Forgot Password');
        
        try {
            const response = await axios.post(
                `${API_BASE_URL}/auth/forgot-password`,
                { email: this.testUser.email }
            );

            if (response.data.success) {
                log.success('Reset email request successful');
                results.passed.push('Forgot password request');

                // Check if reset code is displayed in console (for testing)
                log.info('Check backend console for reset code (displayed when email not configured)');
                results.warnings.push({
                    test: 'Email configuration',
                    message: 'Reset code displayed in console - email service may not be configured'
                });

                return true;
            } else {
                log.error('Reset request failed');
                results.failed.push({
                    test: 'Forgot password',
                    issue: 'Request returned success: false',
                    severity: 'HIGH'
                });
                return false;
            }

        } catch (error) {
            log.error(`Forgot password failed: ${error.message}`);
            results.failed.push({
                test: 'Forgot password',
                error: error.message,
                severity: 'HIGH'
            });
            return false;
        }
    }

    // Test 6: Reset Password (requires manual reset code from console)
    async testResetPassword() {
        log.header('\n🔍 TEST 6: Reset Password');
        
        log.info('Manual reset code needed - check backend console for code from forgot-password test');
        log.info('Skipping automated reset test');
        results.warnings.push({
            test: 'Reset password',
            message: 'Requires manual reset code from console output'
        });
    }

    // Test 7: Phone OTP Login
    async testPhoneOTP() {
        log.header('\n🔍 TEST 7: Phone/OTP Login');
        
        try {
            // Send OTP
            const otpResponse = await axios.post(
                `${API_BASE_URL}/auth/send-otp`,
                { phone: this.testUser.phone }
            );

            if (otpResponse.data.success) {
                log.success('OTP sent successfully');
                results.passed.push('Send OTP');

                // Mock OTP (123456 is hardcoded for testing)
                const loginResponse = await axios.post(
                    `${API_BASE_URL}/auth/login-phone`,
                    { phone: this.testUser.phone, otp: '123456' }
                );

                if (loginResponse.data.success && loginResponse.data.token) {
                    log.success('Phone OTP login successful');
                    results.passed.push('Phone OTP login');
                    return loginResponse.data.token;
                } else {
                    log.error('Phone OTP login failed');
                    results.failed.push({
                        test: 'Phone OTP login',
                        issue: 'Login with OTP unsuccessful',
                        severity: 'HIGH'
                    });
                }
            } else {
                log.error('OTP send failed');
                results.failed.push({
                    test: 'Send OTP',
                    issue: 'OTP request unsuccessful',
                    severity: 'MEDIUM'
                });
            }

        } catch (error) {
            log.error(`Phone OTP test failed: ${error.message}`);
            results.failed.push({
                test: 'Phone OTP',
                error: error.message,
                severity: 'MEDIUM'
            });
        }
    }

    // Test 8: Google OAuth Configuration
    async testGoogleOAuth() {
        log.header('\n🔍 TEST 8: Google OAuth Configuration');
        
        const googleClientId = process.env.GOOGLE_CLIENT_ID;
        const googleClientIds = process.env.GOOGLE_CLIENT_IDS;

        if (!googleClientId && !googleClientIds) {
            log.warning('Google OAuth not configured');
            results.warnings.push({
                test: 'Google OAuth configuration',
                message: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_IDS not found',
                severity: 'MEDIUM'
            });
        } else {
            log.success('Google OAuth appears to be configured');
            results.passed.push('Google OAuth configured');

            if (googleClientId) {
                log.info(`GOOGLE_CLIENT_ID: ${googleClientId.substring(0, 20)}...`);
            }
            if (googleClientIds) {
                log.info(`GOOGLE_CLIENT_IDS configured: ${googleClientIds.split(',').length} ID(s)`);
            }
        }
    }

    // Test 9: Check Frontend Integration
    async testFrontendIntegration() {
        log.header('\n🔍 TEST 9: Frontend Integration Check');
        
        try {
            const loginPagePath = './frontend-new/src/pages/LoginPage.jsx';
            const fs = await import('fs');
            
            if (fs.existsSync(loginPagePath)) {
                const content = fs.readFileSync(loginPagePath, 'utf8');
                
                // Check for API endpoint calls
                const checks = {
                    'POST /login endpoint': content.includes('/auth/login'),
                    'POST /register endpoint': content.includes('/auth/register'),
                    'Google OAuth integration': content.includes('google') || content.includes('credential'),
                    'Token stored in localStorage': content.includes('localStorage') && content.includes('token')
                };

                Object.entries(checks).forEach(([check, found]) => {
                    if (found) {
                        log.success(`Frontend: ${check}`);
                        results.passed.push(`Frontend: ${check}`);
                    } else {
                        log.warning(`Frontend: ${check} - not found`);
                        results.warnings.push({
                            test: 'Frontend integration',
                            message: `${check} not found in LoginPage.jsx`
                        });
                    }
                });
            } else {
                log.warning('LoginPage.jsx not found');
            }

        } catch (error) {
            log.warning(`Frontend integration check failed: ${error.message}`);
        }
    }

    // Summary Report
    printSummary() {
        log.header('\n📋 COMPREHENSIVE TEST SUMMARY');

        console.log(`\n${colors.green}✓ PASSED: ${results.passed.length}${colors.reset}`);
        results.passed.forEach(test => console.log(`   • ${test}`));

        if (results.failed.length > 0) {
            console.log(`\n${colors.red}✗ FAILED: ${results.failed.length}${colors.reset}`);
            results.failed.forEach(item => {
                console.log(`   • ${item.test || item.error}`);
                if (item.error) console.log(`     Error: ${item.error}`);
                if (item.issue) console.log(`     Issue: ${item.issue}`);
                if (item.severity) console.log(`     Severity: ${item.severity}`);
            });
        }

        if (results.warnings.length > 0) {
            console.log(`\n${colors.yellow}⚠ WARNINGS: ${results.warnings.length}${colors.reset}`);
            results.warnings.forEach(item => {
                console.log(`   • ${item.test}`);
                if (item.message) console.log(`     ${item.message}`);
            });
        }

        // Issues by severity
        const criticalIssues = results.failed.filter(i => i.severity === 'CRITICAL');
        const highIssues = results.failed.filter(i => i.severity === 'HIGH');
        const mediumIssues = results.failed.filter(i => i.severity === 'MEDIUM');

        if (criticalIssues.length > 0 || highIssues.length > 0) {
            log.header('\n🚨 CRITICAL & HIGH SEVERITY ISSUES');
            
            if (criticalIssues.length > 0) {
                console.log(`\n${colors.red}CRITICAL (${criticalIssues.length}):${colors.reset}`);
                criticalIssues.forEach(issue => {
                    console.log(`   • ${issue.test || issue.issue}`);
                });
            }
            
            if (highIssues.length > 0) {
                console.log(`\n${colors.red}HIGH (${highIssues.length}):${colors.reset}`);
                highIssues.forEach(issue => {
                    console.log(`   • ${issue.test || issue.issue}`);
                });
            }
        }

        console.log(`\n${colors.blue}Test execution complete.${colors.reset}\n`);
    }

    // Run all tests
    async runAll() {
        try {
            log.header('╔════════════════════════════════════════╗');
            log.header('║  Sri Ram Fashions Auth Testing Suite   ║');
            log.header('╚════════════════════════════════════════╝');

            const backendOk = await this.testBackendStatus();
            if (!backendOk) {
                log.error('Backend not accessible. Cannot continue with tests.');
                this.printSummary();
                return;
            }

            const dbOk = await this.testDatabaseConnection();
            if (!dbOk) {
                log.error('Database not accessible. Cannot continue with tests.');
                this.printSummary();
                return;
            }

            await this.testEmailPasswordLogin();
            await this.testRegistration();
            await this.testForgotPassword();
            await this.testResetPassword();
            await this.testPhoneOTP();
            await this.testGoogleOAuth();
            await this.testFrontendIntegration();

            this.printSummary();

        } catch (error) {
            log.error(`Test execution error: ${error.message}`);
            console.error(error);
        } finally {
            if (mongoose.connection.readyState === 1) {
                await mongoose.disconnect();
            }
            process.exit(results.failed.length > 0 ? 1 : 0);
        }
    }
}

// Run tests
const tester = new AuthTester();
tester.runAll();
