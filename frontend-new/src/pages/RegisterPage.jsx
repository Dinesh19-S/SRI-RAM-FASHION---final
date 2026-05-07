import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { register, clearError } from '../store/slices/authSlice';
import { authAPI } from '../services/api';
import { Eye, EyeOff, ArrowRight, XCircle, UserPlus, Mail, Phone, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import sriRamLogo from '../assets/logo.jpg';

const RegisterPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isLoading, error } = useSelector((state) => state.auth);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});

    const validateForm = () => {
        const errors = {};

        if (!formData.name.trim()) {
            errors.name = 'Please enter your full name';
        }

        if (!formData.email.trim()) {
            errors.email = 'Email address is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            errors.email = 'Please enter a valid email address';
        }

        if (!formData.phone.trim()) {
            errors.phone = 'Phone number is required';
        } else if (!/^[+]?[\d\s-]{10,}$/.test(formData.phone)) {
            errors.phone = 'Please enter a valid phone number';
        }

        if (!formData.password) {
            errors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            errors.password = 'Password must be at least 6 characters';
        }

        if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const getPasswordStrength = () => {
        const password = formData.password;
        if (!password) return { strength: 0, label: '', color: '' };

        let strength = 0;
        if (password.length >= 6) strength++;
        if (password.length >= 10) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z\d]/.test(password)) strength++;

        if (strength <= 2) return { strength: 1, label: 'Weak', color: 'bg-red-400' };
        if (strength <= 3) return { strength: 2, label: 'Medium', color: 'bg-amber-400' };
        if (strength <= 4) return { strength: 3, label: 'Strong', color: 'bg-blue-400' };
        return { strength: 4, label: 'Very Strong', color: 'bg-emerald-400' };
    };

    const passwordStrength = getPasswordStrength();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (validationErrors[name]) {
            setValidationErrors(prev => ({ ...prev, [name]: '' }));
        }
        if (error) {
            dispatch(clearError());
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        const result = await dispatch(register({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            password: formData.password
        }));

        if (register.fulfilled.match(result)) {
            navigate('/');
        }
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
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.5em] mb-3">Join the System</p>
                        <h1 className="text-3xl font-black text-white tracking-tighter mb-2">Sign Up</h1>
                        <p className="text-sm font-bold text-slate-400">Create your account to start managing business.</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl mb-8 text-xs flex items-center gap-3 animate-fade-in font-bold">
                            <XCircle size={20} />
                            <span>Error: {error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="relative group">
                                <UserPlus size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Full Name"
                                    className={`w-full p-5 pl-14 bg-white/5 border rounded-2xl outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-sm text-white placeholder:text-slate-500 font-bold ${validationErrors.name ? 'border-red-500/50' : 'border-white/10'}`}
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                                {validationErrors.name && (
                                    <p className="text-red-400 text-[10px] font-black uppercase tracking-widest mt-2 ml-2">{validationErrors.name}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="relative group">
                                    <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="Email Address"
                                        className={`w-full p-5 pl-14 bg-white/5 border rounded-2xl outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-sm text-white placeholder:text-slate-500 font-bold ${validationErrors.email ? 'border-red-500/50' : 'border-white/10'}`}
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                    {validationErrors.email && (
                                        <p className="text-red-400 text-[10px] font-black uppercase tracking-widest mt-2 ml-2">{validationErrors.email}</p>
                                    )}
                                </div>
                                <div className="relative group">
                                    <Phone size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <input
                                        type="tel"
                                        name="phone"
                                        placeholder="Phone Number"
                                        className={`w-full p-5 pl-14 bg-white/5 border rounded-2xl outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-sm text-white placeholder:text-slate-500 font-bold ${validationErrors.phone ? 'border-red-500/50' : 'border-white/10'}`}
                                        value={formData.phone}
                                        onChange={handleChange}
                                    />
                                    {validationErrors.phone && (
                                        <p className="text-red-400 text-[10px] font-black uppercase tracking-widest mt-2 ml-2">{validationErrors.phone}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="relative group">
                                    <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        placeholder="Password"
                                        className={`w-full p-5 pl-14 bg-white/5 border rounded-2xl outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-sm text-white placeholder:text-slate-500 font-bold pr-12 ${validationErrors.password ? 'border-red-500/50' : 'border-white/10'}`}
                                        value={formData.password}
                                        onChange={handleChange}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <div className="relative group">
                                    <ShieldCheck size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="confirmPassword"
                                        placeholder="Confirm Password"
                                        className={`w-full p-5 pl-14 bg-white/5 border rounded-2xl outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all text-sm text-white placeholder:text-slate-500 font-bold pr-12 ${validationErrors.confirmPassword ? 'border-red-500/50' : 'border-white/10'}`}
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {validationErrors.password && (
                                <p className="text-red-400 text-[10px] font-black uppercase tracking-widest mt-2 ml-2">{validationErrors.password}</p>
                            )}
                            {validationErrors.confirmPassword && (
                                <p className="text-red-400 text-[10px] font-black uppercase tracking-widest mt-2 ml-2">{validationErrors.confirmPassword}</p>
                            )}
                        </div>

                        {/* Password Entropy */}
                        {formData.password && (
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 animate-fade-in">
                                <div className="flex gap-1.5 mb-2">
                                    {[1, 2, 3, 4].map((level) => (
                                        <div
                                            key={level}
                                            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${level <= passwordStrength.strength ? passwordStrength.color : 'bg-white/10'}`}
                                        />
                                    ))}
                                </div>
                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                                    Password Strength: <span className="text-white">{passwordStrength.label}</span>
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-indigo-600/30 hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-3 mt-4"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Create Account <ArrowRight size={18} /></>
                            )}
                        </button>

                        <div className="relative my-10">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10"></div>
                            </div>
                            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                                <span className="px-4 bg-slate-900/50 backdrop-blur-md text-slate-500">Or Sign Up With</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => authAPI.signInWithGoogle()}
                            className="w-full py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all flex items-center justify-center gap-4 group"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" className="group-hover:scale-110 transition-transform">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Continue with Google
                        </button>
                    </form>

                    <div className="mt-12 text-center">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            Already have an account? <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-black ml-2 transition-colors underline underline-offset-8 decoration-indigo-500/30">Sign In</Link>
                        </p>
                    </div>
                </div>

                <div className="mt-10 text-center flex items-center justify-center gap-6 opacity-30 grayscale hover:grayscale-0 hover:opacity-60 transition-all duration-700">
                    <Sparkles size={16} className="text-white" />
                    <p className="text-[10px] font-black text-white uppercase tracking-[0.5em]">ERP Framework v4.0</p>
                    <Sparkles size={16} className="text-white" />
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
