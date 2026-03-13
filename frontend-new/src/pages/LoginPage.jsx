import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { login, sendOTP, loginWithPhone, clearError, googleLogin, forgotPassword, resetPassword } from '../store/slices/authSlice';
import { Eye, EyeOff, X, CheckCircle, ArrowRight } from 'lucide-react';
import sriRamLogo from '../assets/logo.jpg';
import { getCurrentOrigin, getGoogleLoginStatus } from '../utils/authRuntime';

const LoginPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isLoading, error } = useSelector((state) => state.auth);
    const googleLoginStatus = getGoogleLoginStatus();
    const googleOrigin = getCurrentOrigin();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showOTPModal, setShowOTPModal] = useState(false);
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [otpStep, setOtpStep] = useState('phone');

    // Forgot password state
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [resetCode, setResetCode] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [forgotStep, setForgotStep] = useState('email');
    const [forgotError, setForgotError] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [googleError, setGoogleError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setGoogleError('');
        const result = await dispatch(login({ email, password }));
        if (login.fulfilled.match(result)) {
            navigate('/dashboard');
        }
    };

    const handleSendOTP = async () => {
        const result = await dispatch(sendOTP(phone));
        if (sendOTP.fulfilled.match(result)) {
            setOtpStep('otp');
        }
    };

    const handleVerifyOTP = async () => {
        const otpString = otp.join('');
        const result = await dispatch(loginWithPhone({ phone, otp: otpString }));
        if (loginWithPhone.fulfilled.match(result)) {
            navigate('/dashboard');
        }
    };

    const handleOTPChange = (index, value) => {
        if (value.length > 1) value = value.slice(-1);
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) {
            document.getElementById(`otp-${index + 2}`)?.focus();
        }
    };

    // Forgot password handlers
    const handleForgotSubmit = async () => {
        setForgotError('');
        setForgotLoading(true);
        const result = await dispatch(forgotPassword(forgotEmail));
        setForgotLoading(false);
        if (forgotPassword.fulfilled.match(result)) {
            setForgotStep('code');
        } else {
            setForgotError(result.payload || 'Failed to send reset code');
        }
    };

    const handleResetCodeChange = (index, value) => {
        if (value.length > 1) value = value.slice(-1);
        if (!/^\d*$/.test(value)) return;
        const newCode = [...resetCode];
        newCode[index] = value;
        setResetCode(newCode);
        if (value && index < 5) {
            document.getElementById(`reset-code-${index + 2}`)?.focus();
        }
    };

    const handleResetPassword = async () => {
        setForgotError('');
        if (newPassword !== confirmPassword) {
            setForgotError('Passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            setForgotError('Password must be at least 6 characters');
            return;
        }
        setForgotLoading(true);
        const result = await dispatch(resetPassword({
            email: forgotEmail,
            code: resetCode.join(''),
            newPassword
        }));
        setForgotLoading(false);
        if (resetPassword.fulfilled.match(result)) {
            setForgotStep('success');
        } else {
            setForgotError(result.payload || 'Password reset failed');
        }
    };

    const closeForgotModal = () => {
        setShowForgotModal(false);
        setForgotEmail('');
        setResetCode(['', '', '', '', '', '']);
        setNewPassword('');
        setConfirmPassword('');
        setForgotStep('email');
        setForgotError('');
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative font-sans">
            {/* Background */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    background:
                        'radial-gradient(circle at 20% 10%, #1f3a8a 0%, rgba(31,58,138,0) 45%), radial-gradient(circle at 80% 90%, #0f766e 0%, rgba(15,118,110,0) 40%), linear-gradient(120deg, #0f172a 0%, #0b1120 40%, #111827 100%)',
                }}
            ></div>

            {/* Dark Overlay */}
            <div className="absolute inset-0 z-1 bg-black/70"></div>

            {/* Login Card */}
            <div className="relative z-2 bg-white p-10 w-full max-w-[480px] rounded-2xl shadow-2xl border border-gray-100 text-center">
                <div className="mb-8">
                    <img
                        src={sriRamLogo}
                        alt="Sri Ram Fashions Logo"
                        className="mx-auto mb-4"
                        style={{ width: '120px', height: 'auto', borderRadius: '12px', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}
                    />
                    <h2 className="font-serif text-3xl text-black mb-2 font-bold tracking-tight">SRI RAM FASHIONS</h2>
                    <p className="text-sm text-gray-700 font-bold">Welcome back! Please sign in.</p>
                </div>

                {(error || googleError) && (
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2 text-left font-medium">
                        <CheckCircle size={18} className="text-red-600 rotate-45" />
                        {error || googleError}
                    </div>
                )}

                <form onSubmit={handleLogin} className="text-left space-y-4">
                    <div>
                        <input
                            type="email"
                            placeholder="Email Address"
                            className="w-full p-4 bg-white border border-gray-300 rounded-lg outline-none focus:border-black transition-colors font-sans text-sm text-black placeholder:text-gray-600 font-medium"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Password"
                                className="w-full p-4 bg-white border border-gray-300 rounded-lg outline-none focus:border-black transition-colors font-sans text-sm text-black placeholder:text-gray-600 pr-10 font-medium"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black transition-colors"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <div className="flex justify-end mt-2">
                            <button
                                type="button"
                                className="text-xs font-bold text-gray-600 hover:text-black transition-colors"
                                onClick={() => setShowForgotModal(true)}
                            >
                                Forgot Password?
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full p-4 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 text-sm"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Signing In...' : <><span className="text-base">Sign In</span> <ArrowRight size={18} /></>}
                    </button>
                </form>

                <div className="flex items-center my-6">
                    <div className="flex-1 border-t border-gray-300"></div>
                    <span className="px-4 text-gray-700 text-xs font-bold tracking-wider">OR CONTINUE WITH</span>
                    <div className="flex-1 border-t border-gray-300"></div>
                </div>

                {googleLoginStatus.enabled ? (
                    <div className="space-y-3">
                        <div className="flex justify-center w-full">
                            <GoogleLogin
                                onSuccess={async (credentialResponse) => {
                                    dispatch(clearError());
                                    setGoogleError('');
                                    if (!credentialResponse?.credential) {
                                        setGoogleError('Google response was incomplete. Please try again.');
                                        return;
                                    }
                                    const result = await dispatch(googleLogin({ credential: credentialResponse.credential }));
                                    if (googleLogin.fulfilled.match(result)) {
                                        navigate('/dashboard');
                                        return;
                                    }
                                    setGoogleError(result.payload || 'Google login failed. Please try again.');
                                }}
                                onError={() => {
                                    dispatch(clearError());
                                    setGoogleError(
                                        `Google login failed for origin ${googleOrigin}. Use a Web OAuth client and add this origin in Google Cloud Console.`
                                    );
                                }}
                                theme="outline"
                                size="large"
                                width="340"
                                shape="rectangular"
                                text="continue_with"
                                logo_alignment="center"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm text-left font-medium">
                        {googleLoginStatus.reason}
                    </div>
                )}

                <div className="mt-8 text-center text-sm text-gray-700 font-medium">
                    Don't have an account? <Link to="/register" className="font-bold text-blue-700 hover:text-blue-900 hover:underline ml-1">Sign Up</Link>
                </div>
            </div>

            {/* OTP Modal */}
            {showOTPModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowOTPModal(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">
                                {otpStep === 'phone' ? 'Phone Login' : 'Verify Code'}
                            </h3>
                            <button className="text-gray-400 hover:text-gray-600 transition-colors" onClick={() => setShowOTPModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            {otpStep === 'phone' ? (
                                <div className="space-y-4">
                                    <p className="text-gray-500 text-sm">Enter your mobile number to receive an OTP.</p>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">+91</span>
                                        <input
                                            type="tel"
                                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg outline-none focus:border-black transition-colors font-sans"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                            placeholder="Mobile Number"
                                        />
                                    </div>
                                    <button
                                        className="w-full p-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-70"
                                        onClick={handleSendOTP}
                                        disabled={isLoading || phone.length !== 10}
                                    >
                                        {isLoading ? 'Sending...' : 'Send OTP'}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-gray-500 text-sm">Enter the 6-digit code sent to <strong>+91 {phone}</strong></p>
                                    <div className="flex justify-center gap-2">
                                        {otp.map((digit, index) => (
                                            <input
                                                key={index}
                                                id={`otp-${index + 1}`}
                                                type="text"
                                                maxLength={1}
                                                className="w-12 h-12 text-center border border-gray-200 rounded-lg text-xl font-bold focus:border-black outline-none transition-colors"
                                                value={digit}
                                                onChange={(e) => handleOTPChange(index, e.target.value)}
                                            />
                                        ))}
                                    </div>
                                    <button
                                        className="w-full p-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-70"
                                        onClick={handleVerifyOTP}
                                        disabled={isLoading || otp.join('').length !== 6}
                                    >
                                        {isLoading ? 'Verifying...' : 'Verify & Login'}
                                    </button>
                                    <button className="w-full text-sm text-blue-600 hover:underline" onClick={() => setOtpStep('phone')}>Change Phone Number</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Forgot Password Modal */}
            {showForgotModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={closeForgotModal}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Reset Password</h3>
                            <button className="text-gray-400 hover:text-gray-600 transition-colors" onClick={closeForgotModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            {forgotError && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg mb-4 text-xs">{forgotError}</div>}

                            {forgotStep === 'email' && (
                                <div className="space-y-4">
                                    <p className="text-gray-500 text-sm">Enter your email to receive a reset code.</p>
                                    <input
                                        type="email"
                                        className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-black transition-colors"
                                        placeholder="Email Address"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                    />
                                    <button
                                        className="w-full p-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-70"
                                        onClick={handleForgotSubmit}
                                        disabled={forgotLoading || !forgotEmail}
                                    >
                                        {forgotLoading ? 'Sending...' : 'Send Reset Code'}
                                    </button>
                                </div>
                            )}

                            {forgotStep === 'code' && (
                                <div className="space-y-4">
                                    <p className="text-gray-500 text-sm">Enter code sent to <strong>{forgotEmail}</strong></p>
                                    <div className="flex justify-center gap-2">
                                        {resetCode.map((digit, index) => (
                                            <input
                                                key={index}
                                                id={`reset-code-${index + 1}`}
                                                type="text"
                                                maxLength={1}
                                                className="w-10 h-10 text-center border border-gray-200 rounded-lg text-lg font-bold focus:border-black outline-none transition-colors"
                                                value={digit}
                                                onChange={(e) => handleResetCodeChange(index, e.target.value)}
                                            />
                                        ))}
                                    </div>
                                    <input type="password" placeholder="New Password" className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-black" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                    <input type="password" placeholder="Confirm Password" className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-black" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                    <button
                                        className="w-full p-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-70"
                                        onClick={handleResetPassword}
                                        disabled={forgotLoading || resetCode.join('').length !== 6 || !newPassword}
                                    >
                                        {forgotLoading ? 'Resetting...' : 'Reset Password'}
                                    </button>
                                </div>
                            )}

                            {forgotStep === 'success' && (
                                <div className="text-center space-y-4">
                                    <CheckCircle size={40} className="text-green-500 mx-auto" />
                                    <p className="text-gray-900 font-medium">Password Reset Successful!</p>
                                    <button className="w-full p-3 bg-black text-white rounded-lg font-semibold" onClick={closeForgotModal}>Back to Login</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Injected Styles */}
            <style>{`
                .font-sans { font-family: 'Outfit', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                .font-serif { font-family: Georgia, 'Times New Roman', Times, serif; }
            `}</style>
        </div>
    );
};

export default LoginPage;
