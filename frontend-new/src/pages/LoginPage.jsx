import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { login, sendOTP, loginWithPhone, forgotPassword, resetPassword, loginWithGoogle } from '../store/slices/authSlice';
import { authAPI } from '../services/api';
import { GoogleLogin } from '@react-oauth/google';
import { Eye, EyeOff, X, CheckCircle, ArrowRight } from 'lucide-react';
import sriRamLogo from '../assets/logo.jpg';

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
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative font-sans overflow-hidden">
            {/* Background with advanced gradient and subtle motion effect */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    background: 'radial-gradient(circle at 0% 0%, #1e3a8a 0%, transparent 40%), radial-gradient(circle at 100% 100%, #065f46 0%, transparent 40%), #0f172a',
                }}
            ></div>

            {/* Sophisticated Mesh Overlay */}
            <div className="absolute inset-0 z-1 opacity-20 bg-linear-to-br from-transparent via-blue-900/10 to-emerald-900/10"></div>

            {/* Login Card with Glassmorphism */}
            <div className="relative z-2 glass-card p-10 w-full max-w-[460px] animate-scale-up text-center border-white/20">
                <div className="mb-10">
                    <div className="relative inline-block mb-6">
                        <div className="absolute -inset-1 bg-linear-to-r from-blue-600 to-emerald-600 rounded-2xl blur opacity-25"></div>
                        <img
                            src={sriRamLogo}
                            alt="Sri Ram Fashions Logo"
                            className="relative w-24 h-auto mx-auto rounded-2xl shadow-2xl"
                        />
                    </div>
                    <h2 className="text-4xl font-black text-white mb-2 tracking-tight">SRI RAM FASHIONS</h2>
                    <p className="text-xs font-bold text-blue-300 uppercase tracking-[0.2em]">Sign In to ERP</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl mb-6 text-xs font-bold flex items-center gap-2 text-left animate-fade-in">
                        <CheckCircle size={16} className="rotate-45" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="text-left space-y-5">
                    <div className="space-y-1.5">
                        <label className="form-label text-blue-200/60">Email Address</label>
                        <input
                            type="email"
                            className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-semibold"
                            placeholder="name@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="form-label text-blue-200/60">Password</label>
                            <button
                                type="button"
                                className="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-colors"
                                onClick={() => setShowForgotModal(true)}
                            >
                                Forgot Password?
                            </button>
                        </div>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-semibold pr-12"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 btn-primary rounded-xl text-sm font-black uppercase tracking-widest mt-4 group"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Signing in...' : (
                            <span className="flex items-center justify-center gap-2">
                                Sign In
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                        )}
                    </button>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                            <span className="px-4 bg-[#1a2333] text-white/40">Or Sign In With</span>
                        </div>
                    </div>

                    <div className="w-full flex justify-center">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => console.log('Login Failed')}
                            useOneTap
                            theme="filled_blue"
                            shape="pill"
                            width="400"
                        />
                    </div>
                </form>

                <div className="mt-10 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    Restricted Access
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
