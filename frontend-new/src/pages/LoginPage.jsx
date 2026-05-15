import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { login, sendOTP, loginWithPhone, forgotPassword, resetPassword, loginWithGoogle } from '../store/slices/authSlice';
import { authAPI } from '../services/api';
import { GoogleLogin } from '@react-oauth/google';
import { Eye, EyeOff, X, CheckCircle, ArrowRight, XCircle, Mail, Lock, ShieldCheck } from 'lucide-react';
import sriRamLogo from '../assets/logo.jpg';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "70478872500-1drce72segim48l21r8nm80289q39ndk.apps.googleusercontent.com";

const LoginPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isLoading, error } = useSelector((state) => state.auth);

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

    const handleLogin = async (e) => {
        e.preventDefault();
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

    const handleGoogleSuccess = async (credentialResponse) => {
        const result = await dispatch(loginWithGoogle(credentialResponse.credential));
        if (loginWithGoogle.fulfilled.match(result)) {
            navigate('/dashboard');
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
        <div className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden font-sans bg-slate-950">
            {/* Elite Background Architecture */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
            </div>

            {/* Auth Shell */}
            <div className="relative z-10 w-full max-w-[540px] animate-scale-up">
                <div className="glass-card p-10 md:p-14 border-white/10 shadow-2xl backdrop-blur-2xl bg-white/5 overflow-hidden">
                    {/* Security Badge */}
                    <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
                        <ShieldCheck size={120} className="text-white -rotate-12 translate-x-12 -translate-y-12" />
                    </div>

                    <div className="relative z-10 mb-12 text-center">
                        <div className="w-24 h-24 mx-auto mb-8 relative">
                            <div className="absolute inset-0 bg-indigo-600 rounded-3xl blur-2xl opacity-40 animate-pulse"></div>
                            <img
                                src={sriRamLogo}
                                alt="Sri Ram Fashions"
                                className="relative w-full h-full object-cover rounded-3xl border border-white/20 shadow-2xl"
                            />
                        </div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.5em] mb-3">Enter the System</p>
                        <h1 className="text-3xl font-black text-white tracking-tighter mb-2">Sign In</h1>
                        <p className="text-sm font-bold text-slate-400">Access your business dashboard to manage operations.</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl mb-8 text-xs flex items-center gap-3 animate-fade-in font-bold">
                            <XCircle size={20} />
                            <span>Error: {error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative group">
                                <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    className="w-full p-5 pl-14 bg-white/5 border rounded-2xl outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-sm text-white placeholder:text-slate-500 font-bold border-white/10"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="relative group">
                                <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    className="w-full p-5 pl-14 pr-12 bg-white/5 border rounded-2xl outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-sm text-white placeholder:text-slate-500 font-bold border-white/10"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 bg-white/5 border border-white/20 rounded text-indigo-600" />
                                <span className="font-bold text-slate-400">Remember me</span>
                            </label>
                            <button
                                type="button"
                                className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                                onClick={() => setShowForgotModal(true)}
                            >
                                Forgot password?
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 px-6 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-black rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {isLoading ? (
                                <>
                                    <span className="animate-spin">⚙️</span>
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10"></div>
                            </div>
                            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                                <span className="px-4 bg-slate-950 text-white/40">Or Continue With</span>
                            </div>
                        </div>

                        <div className="w-full flex justify-center">
                            {GOOGLE_CLIENT_ID ? (
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => console.log('Google login unavailable - use email instead')}
                                    useOneTap
                                    theme="filled_blue"
                                    shape="pill"
                                    width="400"
                                />
                            ) : (
                                <div className="w-full text-center text-xs text-slate-400 py-4">
                                    Google login is not configured. Use email and password to sign in.
                                </div>
                            )}
                        </div>
                    </form>

                    <p className="text-center text-xs font-bold text-slate-500 mt-8">
                        Don't have an account? <Link to="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors">Sign up here</Link>
                    </p>
                </div>
            </div>

            {/* OTP Modal */}
            {showOTPModal && (
                <div className="modal-overlay" onClick={() => setShowOTPModal(false)}>
                    <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                {otpStep === 'phone' ? 'Sign In with Phone' : 'Verify Code'}
                            </h3>
                            <button className="text-slate-400 hover:text-slate-600 transition-colors" onClick={() => setShowOTPModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8">
                            {otpStep === 'phone' ? (
                                <div className="space-y-6">
                                    <p className="text-slate-500 text-sm font-medium">Verify your registered mobile number.</p>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">+91</span>
                                        <input
                                            type="tel"
                                            className="form-input pl-14"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                            placeholder="90000 00000"
                                        />
                                    </div>
                                    <button
                                        className="w-full btn btn-primary py-4"
                                        onClick={handleSendOTP}
                                        disabled={isLoading || phone.length !== 10}
                                    >
                                        {isLoading ? 'Verifying...' : 'Get OTP'}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <p className="text-slate-500 text-sm font-medium">Enter the 6-digit code sent to your device.</p>
                                    <div className="flex justify-center gap-2">
                                        {otp.map((digit, index) => (
                                            <input
                                                key={index}
                                                id={`otp-${index + 1}`}
                                                type="text"
                                                maxLength={1}
                                                className="w-10 h-12 text-center border-2 border-slate-100 rounded-xl text-xl font-black text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                                value={digit}
                                                onChange={(e) => handleOTPChange(index, e.target.value)}
                                            />
                                        ))}
                                    </div>
                                    <button
                                        className="w-full btn btn-primary py-4"
                                        onClick={handleVerifyOTP}
                                        disabled={isLoading || otp.join('').length !== 6}
                                    >
                                        {isLoading ? 'Processing...' : 'Sign In Now'}
                                    </button>
                                    <button className="w-full text-xs font-bold text-blue-600 hover:underline uppercase tracking-widest" onClick={() => setOtpStep('phone')}>Retry with different number</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Forgot Password Modal */}
            {showForgotModal && (
                <div className="modal-overlay" onClick={closeForgotModal}>
                    <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Reset Password</h3>
                            <button className="text-slate-400 hover:text-slate-600 transition-colors" onClick={closeForgotModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8">
                            {forgotError && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-6 text-xs font-bold border border-red-100">{forgotError}</div>}

                            {forgotStep === 'email' && (
                                <div className="space-y-6">
                                    <p className="text-slate-500 text-sm font-medium">Provide your work email to initiate recovery.</p>
                                    <input
                                        type="email"
                                        className="form-input"
                                        placeholder="yourname@company.com"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                    />
                                    <button
                                        className="w-full btn btn-primary py-4"
                                        onClick={handleForgotSubmit}
                                        disabled={forgotLoading || !forgotEmail}
                                    >
                                        {forgotLoading ? 'Verifying...' : 'Send Reset Link'}
                                    </button>
                                </div>
                            )}

                            {forgotStep === 'code' && (
                                <div className="space-y-6">
                                    <p className="text-slate-500 text-sm font-medium">Validation code dispatched to your inbox.</p>
                                    <div className="flex justify-center gap-2">
                                        {resetCode.map((digit, index) => (
                                            <input
                                                key={index}
                                                id={`reset-code-${index + 1}`}
                                                type="text"
                                                maxLength={1}
                                                className="w-10 h-10 text-center border-2 border-slate-100 rounded-lg text-lg font-bold focus:border-blue-500 outline-none transition-all"
                                                value={digit}
                                                onChange={(e) => handleResetCodeChange(index, e.target.value)}
                                            />
                                        ))}
                                    </div>
                                    <input type="password" placeholder="Define New Password" title="New Password" className="form-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                    <input type="password" placeholder="Confirm New Password" title="Confirm Password" className="form-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                    <button
                                        className="w-full btn btn-primary py-4"
                                        onClick={handleResetPassword}
                                        disabled={forgotLoading || resetCode.join('').length !== 6 || !newPassword}
                                    >
                                        {forgotLoading ? 'Updating Security...' : 'Reset Password'}
                                    </button>
                                </div>
                            )}

                            {forgotStep === 'success' && (
                                <div className="text-center space-y-6">
                                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                                        <CheckCircle size={32} />
                                    </div>
                                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Security Updated</h4>
                                    <p className="text-slate-500 text-sm font-medium">Your credentials have been successfully recovered.</p>
                                    <button className="w-full btn btn-primary py-4" onClick={closeForgotModal}>Go Back to Sign In</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .font-sans { font-family: 'Outfit', 'Inter', sans-serif; }
            `}</style>
        </div>
    );
};

export default LoginPage;
