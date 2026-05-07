import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
    ArrowRight,
    LayoutDashboard,
    Receipt,
    Package,
    FileText,
    Users,
    Truck,
    BarChart3,
    Check,
    Sparkles,
    ShieldCheck,
    TrendingUp,
    Zap,
    ExternalLink
} from 'lucide-react';
import logoImage from '../assets/logo.jpg';
import './HomePage.css';

const HomePage = () => {
    const { isAuthenticated } = useSelector((state) => state.auth);

    const features = [
        {
            icon: Receipt,
            title: 'Sales & Billing',
            text: 'Generate professional, GST-compliant invoices with automated tax logic. Download as PDF and email easily.',
            colorClass: 'home-feature-icon-billing'
        },
        {
            icon: Package,
            title: 'Stock Management',
            text: 'Track your inventory with real-time stock alerts. Easily manage products and categories.',
            colorClass: 'home-feature-icon-inventory'
        },
        {
            icon: FileText,
            title: 'Reports & Analytics',
            text: 'Detailed reports for purchases, sales, and inventory to help you make better business decisions.',
            colorClass: 'home-feature-icon-reports'
        },
        {
            icon: Users,
            title: 'Customer Management',
            text: 'Keep track of all your customers, their purchase history, and payment records in one place.',
            colorClass: 'home-feature-icon-customers'
        },
        {
            icon: Truck,
            title: 'Purchase & Suppliers',
            text: 'Manage your suppliers and purchase entries from start to finish with ease.',
            colorClass: 'home-feature-icon-suppliers'
        },
        {
            icon: BarChart3,
            title: 'Business Overview',
            text: 'See your real-time revenue, sales trends, and business health on a simple dashboard.',
            colorClass: 'home-feature-icon-dashboard'
        }
    ];

    return (
        <div className="home-root">
            {/* ===== ELITE NAVIGATION ===== */}
            <nav className="home-navbar animate-fade-in">
                <div className="home-navbar-brand">
                    <img src={logoImage} alt="Sri Ram Fashions" className="home-navbar-logo" />
                    <div className="flex flex-col">
                        <span className="home-navbar-name">Sri Ram Fashions</span>
                        <span className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-400 -mt-1">Shop Management</span>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-8">
                    {isAuthenticated ? (
                        <Link to="/dashboard" className="text-xs font-black uppercase tracking-widest text-slate-600 hover:text-indigo-600 transition-colors flex items-center gap-2">
                            <LayoutDashboard size={14} /> Go to Dashboard
                        </Link>
                    ) : (
                        <Link to="/login" className="text-xs font-black uppercase tracking-widest text-slate-600 hover:text-indigo-600 transition-colors">
                            Login
                        </Link>
                    )}
                </div>
            </nav>

            {/* ===== SUPREME HERO ===== */}
            <section className="home-hero">
                <div className="home-hero-inner">
                    <div className="home-hero-badge">
                        <span className="home-hero-badge-dot"></span>
                        Business Management v4.0
                    </div>

                    <h1 className="home-hero-title">
                        SRI RAM{' '}
                        <span className="home-hero-title-accent">FASHIONS</span>
                    </h1>

                    <p className="home-hero-subtitle">
                        Professional billing, inventory management, and reports — 
                        all in one easy-to-use platform.
                    </p>

                    <div className="home-hero-actions">
                        {isAuthenticated ? (
                            <>
                                <Link to="/dashboard" className="home-hero-btn home-hero-btn-primary group">
                                    <LayoutDashboard size={18} className="group-hover:rotate-12 transition-transform" />
                                    Dashboard
                                </Link>
                                <Link to="/dashboard/billing" className="home-hero-btn home-hero-btn-secondary group">
                                    Create Bill
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link to="/register" className="home-hero-btn home-hero-btn-primary group">
                                    Create Account
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                                <Link to="/login" className="home-hero-btn home-hero-btn-secondary">
                                    Sign In
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* ===== STRATEGIC METRICS ===== */}
            <section className="home-stats">
                <div className="home-stats-inner">
                    <div className="home-stat-item">
                        <p className="home-stat-number text-indigo-400">A4</p>
                        <p className="home-stat-label">GST Reports</p>
                    </div>
                    <div className="home-stat-item">
                        <p className="home-stat-number text-emerald-400">PDF</p>
                        <p className="home-stat-label">PDF Bills</p>
                    </div>
                    <div className="home-stat-item">
                        <p className="home-stat-number text-amber-400">24/7</p>
                        <p className="home-stat-label">Cloud Sync</p>
                    </div>
                    <div className="home-stat-item">
                        <div className="flex justify-center mb-4">
                            <ShieldCheck size={48} className="text-blue-400" />
                        </div>
                        <p className="home-stat-label">Secure Access</p>
                    </div>
                </div>
            </section>

            {/* ===== CORE INTELLIGENCE ===== */}
            <section className="home-features">
                <div className="home-features-inner">
                    <p className="home-section-label">Operational Core</p>
                    <h2 className="home-section-title">All-in-One Management</h2>

                    <div className="home-features-grid">
                        {features.map((feat, i) => (
                            <div key={i} className="home-feature-card group">
                                <div className={`home-feature-icon-wrap ${feat.colorClass} shadow-xl`}>
                                    <feat.icon size={28} />
                                </div>
                                <p className="home-feature-title">{feat.title}</p>
                                <p className="home-feature-text">{feat.text}</p>
                                <div className="mt-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                                        View Details <ExternalLink size={12} />
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== PREVIEW ARCHITECTURE ===== */}
            <section className="home-preview-section">
                <div className="home-preview-container">
                    <div className="home-preview-text">
                        <p className="home-section-label">Key Benefits</p>
                        <h3>Fast & Simple to Use</h3>
                        <p>
                            From creating professional bills to tracking your stock, 
                            our system makes managing your shop easy and efficient.
                        </p>
                        <ul className="home-preview-list">
                            <li>
                                <span className="home-preview-list-icon shadow-lg"><Zap size={14} /></span>
                                Quick bill creation and sales tracking
                            </li>
                            <li>
                                <span className="home-preview-list-icon shadow-lg"><TrendingUp size={14} /></span>
                                Automated stock level alerts
                            </li>
                            <li>
                                <span className="home-preview-list-icon shadow-lg"><Package size={14} /></span>
                                Manage all products in one place
                            </li>
                            <li>
                                <span className="home-preview-list-icon shadow-lg"><FileText size={14} /></span>
                                GST-ready billing for your shop
                            </li>
                            <li>
                                <span className="home-preview-list-icon shadow-lg"><Check size={14} /></span>
                                Professional A4 and Thermal prints
                            </li>
                        </ul>
                    </div>

                    <div className="relative">
                        <div className="absolute -inset-10 bg-indigo-600/10 rounded-full blur-[100px] animate-pulse"></div>
                        <div className="home-preview-card border-white/40 backdrop-blur-md">
                            <div className="home-preview-card-header">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-2xl">
                                    <Sparkles size={32} />
                                </div>
                                <div>
                                    <p className="home-preview-card-title">Shop Status</p>
                                    <p className="home-preview-card-sub">Active Session: Live</p>
                                </div>
                            </div>
                            <div className="home-preview-rows">
                                <div className="home-preview-row">
                                    <span>Billing Status</span>
                                    <span className="text-emerald-500 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Connected
                                    </span>
                                </div>
                                <div className="home-preview-row">
                                    <span>Plan</span>
                                    <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px]">PREMIUM</span>
                                </div>
                                <div className="home-preview-row">
                                    <span>Daily Sales</span>
                                    <span className="text-indigo-600">₹14.2M</span>
                                </div>
                                <div className="home-preview-divider"></div>
                                <div className="home-preview-row">
                                    <span>Data Status</span>
                                    <span className="font-mono text-[10px] text-slate-400">FULLY SECURE</span>
                                </div>
                                <div className="home-preview-row">
                                    <span>System Status</span>
                                    <span className="font-black text-xs text-slate-900">OPTIMAL</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== INSTITUTIONAL FOOTER ===== */}
            <footer className="home-footer">
                <div className="max-w-7xl mx-auto flex flex-col items-center gap-8">
                    <img src={logoImage} alt="Sri Ram Fashions" className="w-12 h-12 rounded-xl opacity-50 grayscale" />
                    <p className="max-w-2xl text-slate-400 leading-relaxed font-medium">
                        © {new Date().getFullYear()} <span className="home-footer-brand">Sri Ram Fashions</span>. 
                        Modern shop management for high-performance retail. 
                        All your data is safe and secure.
                    </p>
                    <div className="flex gap-10 opacity-40">
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Version 4.1</span>
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Privacy Policy</span>
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Terms of Service</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default HomePage;
