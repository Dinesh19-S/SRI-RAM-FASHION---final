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
    Sparkles
} from 'lucide-react';
import logoImage from '../assets/logo.jpg';
import './HomePage.css';

const HomePage = () => {
    const { isAuthenticated } = useSelector((state) => state.auth);

    const features = [
        {
            icon: Receipt,
            title: 'Professional Billing',
            text: 'Generate clean, A4-ready invoices with your branding. PDF export & email support.',
            colorClass: 'home-feature-icon-billing'
        },
        {
            icon: Package,
            title: 'Smart Inventory',
            text: 'Real-time stock tracking with low-stock alerts. Never run out of popular items.',
            colorClass: 'home-feature-icon-inventory'
        },
        {
            icon: FileText,
            title: 'Reports',
            text: 'Purchase, sales, and stock reports formatted for A4 printing and audit.',
            colorClass: 'home-feature-icon-reports'
        },
        {
            icon: Users,
            title: 'Customer Records',
            text: 'Manage customer profiles, billing history, and payment tracking.',
            colorClass: 'home-feature-icon-customers'
        },
        {
            icon: Truck,
            title: 'Supplier Records',
            text: 'Track suppliers, purchase entries, and outstanding payments.',
            colorClass: 'home-feature-icon-suppliers'
        },
        {
            icon: BarChart3,
            title: 'Business Dashboard',
            text: 'Revenue charts, order trends, and at-a-glance business health metrics.',
            colorClass: 'home-feature-icon-dashboard'
        }
    ];

    return (
        <div className="home-root">
            {/* ===== NAVBAR ===== */}
            <nav className="home-navbar">
                <div className="home-navbar-brand">
                    <img src={logoImage} alt="Sri Ram Fashions" className="home-navbar-logo" />
                    <span className="home-navbar-name">Sri Ram Fashions</span>
                </div>

            </nav>

            {/* ===== HERO ===== */}
            <section className="home-hero">
                <div className="home-hero-inner">
                    <div className="home-hero-badge">
                        <span className="home-hero-badge-dot"></span>
                        Retail Management Suite
                    </div>

                    <h1 className="home-hero-title">
                        SRI RAM{' '}
                        <span className="home-hero-title-accent">FASHIONS</span>
                    </h1>

                    <p className="home-hero-subtitle">
                        Professional billing, real-time inventory, and audit-ready A4 reports —
                        everything you need to run your retail store efficiently.
                    </p>

                    <div className="home-hero-actions">
                        {isAuthenticated ? (
                            <>
                                <Link to="/dashboard" className="home-hero-btn home-hero-btn-primary">
                                    <LayoutDashboard size={18} />
                                    Go to Dashboard
                                </Link>
                                <Link to="/dashboard/billing" className="home-hero-btn home-hero-btn-secondary">
                                    Create Bill
                                    <ArrowRight size={18} />
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link to="/register" className="home-hero-btn home-hero-btn-primary">
                                    Get Started Free
                                    <ArrowRight size={18} />
                                </Link>
                                <Link to="/login" className="home-hero-btn home-hero-btn-secondary">
                                    Sign In
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* ===== FEATURES ===== */}
            <section className="home-features">
                <div className="home-features-inner">
                    <p className="home-section-label">Features</p>
                    <h2 className="home-section-title">Everything Your Store Needs</h2>

                    <div className="home-features-grid">
                        {features.map((feat, i) => (
                            <div key={i} className="home-feature-card">
                                <div className={`home-feature-icon-wrap ${feat.colorClass}`}>
                                    <feat.icon size={24} />
                                </div>
                                <p className="home-feature-title">{feat.title}</p>
                                <p className="home-feature-text">{feat.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== STATS ===== */}
            <section className="home-stats">
                <div className="home-stats-inner">
                    <div className="home-stat-item">
                        <p className="home-stat-number">A4</p>
                        <p className="home-stat-label">Ready Reports</p>
                    </div>
                    <div className="home-stat-item">
                        <p className="home-stat-number">PDF</p>
                        <p className="home-stat-label">Bill Export</p>
                    </div>
                    <div className="home-stat-item">
                        <p className="home-stat-number">24/7</p>
                        <p className="home-stat-label">Access</p>
                    </div>
                    <div className="home-stat-item">
                        <p className="home-stat-number">
                            <Sparkles size={28} style={{ display: 'inline' }} />
                        </p>
                        <p className="home-stat-label">Premium Design</p>
                    </div>
                </div>
            </section>

            {/* ===== PREVIEW ===== */}
            <section className="home-preview-section">
                <div className="home-preview-container">
                    <div className="home-preview-text">
                        <p className="home-section-label">Why Sri Ram Fashions</p>
                        <h3>Built for Daily Business Operations</h3>
                        <p>
                            From generating professional bills to tracking every piece of inventory,
                            our suite handles the details so you can focus on growing your business.
                        </p>
                        <ul className="home-preview-list">
                            <li>
                                <span className="home-preview-list-icon"><Check size={14} /></span>
                                Fast billing with PDF & email support
                            </li>
                            <li>
                                <span className="home-preview-list-icon"><Check size={14} /></span>
                                Automatic stock deduction on sales
                            </li>
                            <li>
                                <span className="home-preview-list-icon"><Check size={14} /></span>
                                Low-stock alerts and inventory reports
                            </li>
                            <li>
                                <span className="home-preview-list-icon"><Check size={14} /></span>
                                Purchase and sales audit reports
                            </li>
                            <li>
                                <span className="home-preview-list-icon"><Check size={14} /></span>
                                Clean, professional A4 print layout
                            </li>
                        </ul>
                    </div>

                    <div className="home-preview-card">
                        <div className="home-preview-card-header">
                            <img src={logoImage} alt="Sri Ram Fashions" className="home-preview-card-logo" />
                            <div>
                                <p className="home-preview-card-title">Sri Ram Fashions</p>
                                <p className="home-preview-card-sub">Retail Management Suite</p>
                            </div>
                        </div>
                        <div className="home-preview-rows">
                            <div className="home-preview-row">
                                <span>Invoice</span>
                                <span>SRF-1021</span>
                            </div>
                            <div className="home-preview-row">
                                <span>Customer</span>
                                <span>Walk-in</span>
                            </div>
                            <div className="home-preview-row">
                                <span>Amount</span>
                                <span>₹42,500</span>
                            </div>
                            <div className="home-preview-divider"></div>
                            <div className="home-preview-row">
                                <span>Stock Alerts</span>
                                <span>3 items</span>
                            </div>
                            <div className="home-preview-row">
                                <span>Reports</span>
                                <span>A4 Ready</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== FOOTER ===== */}
            <footer className="home-footer">
                <p>
                    © {new Date().getFullYear()} <span className="home-footer-brand">Sri Ram Fashions</span>.
                    All rights reserved. Designed for daily billing and audit-ready records.
                </p>
            </footer>
        </div>
    );
};

export default HomePage;
