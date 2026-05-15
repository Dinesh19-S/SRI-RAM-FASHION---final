import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { logout } from '../../store/slices/authSlice';
import { appAPI, dashboardAPI } from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import {
    LayoutDashboard,
    Receipt,
    Plus,
    Package,
    Settings,
    Search,
    Bell,
    ChevronDown,
    ChevronRight,
    Menu,
    X,
    LogOut,
    User,
    Calculator,
    TrendingUp,
    Users,
    Truck,
    RefreshCw,
    Wifi,
    WifiOff,
    Grid,
} from 'lucide-react';

import logoImage from '../../assets/logo.jpg';
import { useToast } from '../common';

const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
}).format(amount || 0);

const navigationSections = [
    {
        title: 'MAIN',
        items: [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
            { name: 'Sales', href: '/dashboard/billing', icon: Receipt },
            { name: 'New Sale', href: '/dashboard/billing?view=create', icon: Plus },
            { name: 'Purchases', href: '/dashboard/purchase/billing', icon: Calculator },
            { name: 'New Purchase', href: '/dashboard/purchase/entry', icon: Calculator },
            { name: 'Stock', href: '/dashboard/inventory', icon: Package },
        ]
    },
    {
        title: 'REPORTS',
        items: [
            { name: 'Sales Report', href: '/dashboard/reports/sales', icon: TrendingUp },
            { name: 'Purchase Report', href: '/dashboard/reports/purchase', icon: Calculator },
            { name: 'Stock Report', href: '/dashboard/reports/stock', icon: Package },
        ]
    },
    {
        title: 'MANAGEMENT',
        items: [
            { name: 'Customers', href: '/dashboard/master/customers', icon: Users },
            { name: 'Suppliers', href: '/dashboard/master/suppliers', icon: Truck },
            { name: 'Items', href: '/dashboard/master/items', icon: Package },
            { name: 'Categories', href: '/dashboard/master/categories', icon: Grid },
        ]
    },
    {
        title: 'SYSTEM',
        items: [
            { name: 'Settings', href: '/dashboard/settings', icon: Settings },
        ]
    },
];

const searchSuggestions = [
    { label: 'Dashboard', path: '/dashboard', keywords: ['dashboard', 'home', 'overview'] },
    { label: 'Purchase Entry', path: '/dashboard/purchase/entry', keywords: ['purchase', 'buy', 'supplier', 'invoice'] },
    { label: 'Purchase Billing', path: '/dashboard/purchase/billing', keywords: ['purchase', 'bill', 'email', 'pdf'] },
    { label: 'Sales Reports', path: '/dashboard/reports/sales', keywords: ['sales', 'report', 'analysis'] },
    { label: 'Purchase Reports', path: '/dashboard/reports/purchase', keywords: ['purchase', 'buy', 'report', 'analysis'] },
    { label: 'Create Bill', path: '/dashboard/billing?view=create', keywords: ['billing', 'create', 'generate', 'new'] },
    { label: 'Bill List', path: '/dashboard/billing', keywords: ['billing', 'bill', 'invoice', 'list'] },
    { label: 'Products', path: '/dashboard/inventory', keywords: ['inventory', 'stock', 'product', 'item'] },
    { label: 'Stock Reports', path: '/dashboard/reports/stock', keywords: ['stock', 'report', 'inventory'] },
    { label: 'Suppliers', path: '/dashboard/master/suppliers', keywords: ['supplier', 'vendor', 'entry', 'master'] },
    { label: 'Customers', path: '/dashboard/master/customers', keywords: ['customer', 'entry', 'master', 'company'] },
    { label: 'Items', path: '/dashboard/master/items', keywords: ['items', 'hsn', 'product', 'master'] },
    { label: 'Categories', path: '/dashboard/master/categories', keywords: ['category', 'group', 'master', 'hierarchy'] },
    { label: 'Settings', path: '/dashboard/settings', keywords: ['settings', 'config', 'preferences'] },
];

const NOTIFICATIONS_CACHE_KEY = 'srf:layout:notifications:v1';
const NOTIFICATIONS_CACHE_TTL = 45 * 1000;

const readCachedNotifications = () => {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
        return null;
    }
    try {
        const raw = localStorage.getItem(NOTIFICATIONS_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.timestamp || !Array.isArray(parsed.items)) return null;
        return parsed;
    } catch {
        return null;
    }
};

const writeCachedNotifications = (items, timestamp = Date.now()) => {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
        return;
    }
    try {
        localStorage.setItem(
            NOTIFICATIONS_CACHE_KEY,
            JSON.stringify({ timestamp, items })
        );
    } catch {
        // Ignore storage errors.
    }
};

// Preload critical assets
if (typeof window !== 'undefined') {
    const preloadLogo = new Image();
    preloadLogo.src = logoImage;
}

const MainLayout = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const { syncStatus, isOnline, lastSyncedAt } = useSelector((state) => state.app);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState({});
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [notificationsError, setNotificationsError] = useState('');
    const [notifications, setNotifications] = useState([]);
    const [notificationsLastLoadedAt, setNotificationsLastLoadedAt] = useState(0);
    const searchRef = useRef(null);
    const notificationsRef = useRef(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const toast = useToast();

    const handleRefresh = () => {
        setIsRefreshing(true);
        toast.info('Refreshing application state...');
        
        // Short delay for visual feedback before actual reload
        setTimeout(() => {
            window.location.reload();
        }, 800);
    };

    const unreadCount = useMemo(
        () => notifications.filter((notification) => !notification.read).length,
        [notifications]
    );

    const filteredSuggestions = searchQuery.trim()
        ? searchSuggestions.filter(s =>
            s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.keywords.some(k => k.includes(searchQuery.toLowerCase()))
        )
        : [];

    const billNotifications = useMemo(
        () => notifications.filter((notification) => notification.type === 'bill'),
        [notifications]
    );

    const stockNotifications = useMemo(
        () => notifications.filter((notification) => notification.type === 'low-stock'),
        [notifications]
    );

    const handleSearchSelect = (path) => {
        navigate(path);
        setSearchQuery('');
        setShowSearchDropdown(false);
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter' && filteredSuggestions.length > 0) {
            handleSearchSelect(filteredSuggestions[0].path);
        }
        if (e.key === 'Escape') {
            setShowSearchDropdown(false);
        }
    };

    const toggleSection = (sectionTitle) => {
        setCollapsedSections(prev => ({
            ...prev,
            [sectionTitle]: !prev[sectionTitle]
        }));
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSearchDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
                setNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const cached = readCachedNotifications();
        if (cached?.items?.length) {
            setNotifications(cached.items);
            setNotificationsLastLoadedAt(cached.timestamp || 0);
        }
    }, []);

    const loadNotifications = useCallback(async (force = false) => {
        const isFresh = notifications.length > 0
            && Date.now() - notificationsLastLoadedAt < NOTIFICATIONS_CACHE_TTL;

        if (isFresh && !force) {
            return;
        }

        setNotificationsLoading(true);
        setNotificationsError('');
        try {
            const response = await dashboardAPI.getNotifications(5);
            const payload = response?.data?.data || {};
            const lowStockItems = payload.lowStockAlerts || [];
            const recentBills = payload.recentBills || [];

            const nextNotifications = [
                ...recentBills.map((bill) => {
                    const customerName = bill?.customer?.name || 'Customer';
                    const paymentStatus = bill?.paymentStatus
                        ? bill.paymentStatus.charAt(0).toUpperCase() + bill.paymentStatus.slice(1)
                        : 'Pending';
                    return {
                        id: `bill:${bill._id || bill.billNumber}`,
                        type: 'bill',
                        title: `Bill #${bill.billNumber}`,
                        message: `${customerName} | ${formatCurrency(bill.grandTotal)} | ${paymentStatus}`,
                        date: bill.date,
                        action: '/dashboard/billing'
                    };
                }),
                ...lowStockItems.map((product) => ({
                    id: `stock:${product._id || product.name}`,
                    type: 'low-stock',
                    title: `Low stock: ${product.name}`,
                    message: `Stock ${product.stock} / ${product.lowStockThreshold}`,
                    action: '/dashboard/inventory'
                }))
            ];

            let resolvedNotifications = [];
            setNotifications((prev) => {
                const readMap = new Map(prev.map((item) => [item.id, item.read]));
                resolvedNotifications = nextNotifications.map((item) => ({
                    ...item,
                    read: readMap.get(item.id) ?? false
                }));
                return resolvedNotifications;
            });

            const loadedAt = Date.now();
            setNotificationsLastLoadedAt(loadedAt);
            writeCachedNotifications(resolvedNotifications, loadedAt);
        } catch (error) {
            setNotificationsError('Failed to load notifications');
        } finally {
            setNotificationsLoading(false);
        }
    }, [notifications.length, notificationsLastLoadedAt]);

    useEffect(() => {
        if (notificationsOpen) {
            loadNotifications();
        }
    }, [notificationsOpen, loadNotifications]);

    const handleLogout = () => {
        dispatch(logout());
    };

    const handleNotificationClick = (notification) => {
        setNotifications((prev) => {
            const next = prev.map((item) => (item.id === notification.id ? { ...item, read: true } : item));
            writeCachedNotifications(next, notificationsLastLoadedAt || Date.now());
            return next;
        });
        if (notification.action) {
            navigate(notification.action);
        }
        setNotificationsOpen(false);
    };

    const markAllNotificationsRead = () => {
        setNotifications((prev) => {
            const next = prev.map((item) => ({ ...item, read: true }));
            writeCachedNotifications(next, notificationsLastLoadedAt || Date.now());
            return next;
        });
    };

    return (
        <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg-default)' }}>
            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 lg:hidden bg-black/20 backdrop-blur-sm"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 lg:z-40 w-72 transform transition-transform duration-500 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} glass-sidebar`}
                style={{
                    boxShadow: '10px 0 30px rgba(0,0,0,0.15)'
                }}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <img
                        src={logoImage}
                        alt="Sri Ram Fashions"
                        className="w-10 h-10 rounded-lg object-cover shadow-lg ring-2 ring-white/20"
                    />
                    <div>
                        <div className="text-sm font-bold text-white">
                            Sri Ram Fashions
                        </div>
                        <div className="text-xs text-blue-200/70">Stock & Sales</div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex flex-col py-6 px-4 space-y-1.5 overflow-y-auto h-[calc(100vh-160px)] custom-scrollbar">
                    {navigationSections.map((section, sectionIndex) => (
                        <div key={sectionIndex} className={sectionIndex > 0 ? 'mt-6' : ''}>
                            <button
                                onClick={() => toggleSection(section.title)}
                                className="flex items-center justify-between w-full text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-3 px-3 py-1 hover:text-white transition-all group"
                            >
                                <span className="relative">
                                    {section.title}
                                    <span className="absolute -bottom-1 left-0 w-0 h-px bg-blue-500 transition-all group-hover:w-full"></span>
                                </span>
                                <ChevronRight
                                    size={12}
                                    className={`transition-transform duration-300 ${!collapsedSections[section.title] ? 'rotate-90 text-blue-400' : 'text-slate-600'}`}
                                />
                            </button>

                            <AnimatePresence>
                                {!collapsedSections[section.title] && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                        className="overflow-hidden space-y-1"
                                    >
                                        {section.items.map((item) => (
                                            <NavLink
                                                key={item.name}
                                                to={item.href}
                                                end={item.href === '/dashboard'}
                                                className={({ isActive }) => `
                                                    flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group relative
                                                    ${isActive
                                                        ? 'bg-blue-600/10 text-white shadow-[inset_0_0_12px_rgba(37,99,235,0.1)]'
                                                        : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                                                `}
                                                onClick={() => setSidebarOpen(false)}
                                            >
                                                {({ isActive }) => (
                                                    <>
                                                        {isActive && (
                                                            <motion.div 
                                                                layoutId="active-indicator"
                                                                className="absolute left-0 w-1 h-5 bg-blue-500 rounded-r-full"
                                                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                                            />
                                                        )}
                                                        <item.icon
                                                            size={18}
                                                            className={`transition-all duration-300 ${isActive ? 'text-blue-400 scale-110' : 'text-slate-500 group-hover:text-blue-300 group-hover:translate-x-0.5'}`}
                                                            strokeWidth={isActive ? 2.5 : 2}
                                                        />
                                                        <span className={`text-sm tracking-tight transition-colors ${isActive ? 'font-bold' : 'font-medium'}`}>{item.name}</span>
                                                    </>
                                                )}
                                            </NavLink>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </nav>

                {/* Logout */}
                <div className="absolute bottom-0 left-0 right-0 px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)' }}>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[#f2d6a2] hover:bg-white/5 hover:text-white transition-colors"
                    >
                        <LogOut size={18} />
                        <span className="text-sm font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen lg:ml-72 lg:z-50 transition-all duration-500 ease-in-out relative">
                {/* Header */}
                <header
                    className="h-20 flex items-center justify-between px-4 lg:px-10 py-3 sticky top-0 z-30"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)', borderBottom: '1px solid rgba(241, 245, 249, 0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
                >
                    <div className="flex items-center gap-4 flex-1">
                        <button
                            className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>

                        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/50 border rounded-full text-[10px] font-bold uppercase tracking-wider"
                            style={{ borderColor: 'var(--border-soft)' }}>
                            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
                            <span className={isOnline ? 'text-green-700' : 'text-red-700'}>
                                {isOnline ? 'Connected' : 'Offline'}
                            </span>
                        </div>

                        <div className="hidden md:block relative w-full max-w-md" ref={searchRef}>
                            <div className="flex items-center gap-3 px-4 py-2 bg-white/80 border rounded-lg focus-within:bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-200 transition-all"
                                style={{ borderColor: 'var(--border-soft)' }}>
                                <Search size={18} className="text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="bg-transparent border-none outline-none text-sm w-full text-gray-900 placeholder:text-gray-400"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setShowSearchDropdown(true);
                                    }}
                                    onFocus={() => setShowSearchDropdown(true)}
                                    onKeyDown={handleSearchKeyDown}
                                />
                            </div>

                            <AnimatePresence>
                                {showSearchDropdown && filteredSuggestions.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 4 }}
                                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-blue-50 py-2 z-50 max-h-64 overflow-y-auto"
                                    >
                                        {filteredSuggestions.map((suggestion, index) => (
                                            <div
                                                key={suggestion.path}
                                                className={`px-4 py-2.5 cursor-pointer flex items-center gap-3 hover:bg-gray-50 transition-colors ${index === 0 ? 'bg-blue-50/50' : ''}`}
                                                onClick={() => handleSearchSelect(suggestion.path)}
                                            >
                                                <Search size={16} className={index === 0 ? 'text-blue-600' : 'text-gray-400'} />
                                                <span className={index === 0 ? 'text-blue-800 font-medium' : 'text-gray-700'}>{suggestion.label}</span>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            className={`p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-all duration-300 ${isRefreshing ? 'rotate-180 text-blue-600 bg-blue-50' : ''}`}
                            onClick={handleRefresh}
                            title="Refresh Page"
                        >
                            <RefreshCw size={19} className={isRefreshing ? 'animate-spin' : ''} />
                        </button>
                        <div className="relative" ref={notificationsRef}>
                                <button
                                    className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                                    onClick={() => setNotificationsOpen((prev) => !prev)}
                                    aria-label="Notifications"
                                >
                                    <Bell size={20} />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-white flex items-center justify-center">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                            <AnimatePresence>
                                {notificationsOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 8 }}
                                        className="absolute right-0 mt-3 w-96 max-w-[90vw] bg-white rounded-xl shadow-xl border border-gray-100 z-50"
                                    >
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                                            <div>
                                                <div className="text-sm font-semibold text-gray-900">Updates</div>
                                                <div className="text-xs text-gray-500">Recent info</div>
                                            </div>
                                            {unreadCount > 0 && (
                                                <button
                                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                                                    onClick={markAllNotificationsRead}
                                                >
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>

                                        <div className="max-h-96 overflow-y-auto">
                                            {notificationsLoading && (
                                                <div className="px-4 py-6 text-sm text-gray-500 text-center">
                                                    Loading notifications...
                                                </div>
                                            )}

                                            {!notificationsLoading && notificationsError && (
                                                <div className="px-4 py-6 text-sm text-red-600 text-center">
                                                    {notificationsError}
                                                </div>
                                            )}

                                            {!notificationsLoading && !notificationsError && notifications.length === 0 && (
                                                <div className="px-4 py-6 text-sm text-gray-500 text-center">
                                                    No notifications yet.
                                                </div>
                                            )}

                                            {!notificationsLoading && !notificationsError && notifications.length > 0 && (
                                                <>
                                                    {billNotifications.length > 0 && (
                                                        <div className="px-4 pt-3 text-xs font-semibold text-gray-400 uppercase">
                                                            Recent Bills
                                                        </div>
                                                    )}
                                                    {billNotifications.map((notification) => (
                                                            <button
                                                                key={notification.id}
                                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3"
                                                                onClick={() => handleNotificationClick(notification)}
                                                            >
                                                                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                                                    <Receipt size={18} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-sm font-semibold text-gray-900 truncate">
                                                                        {notification.title}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {notification.message}
                                                                    </div>
                                                                    {notification.date && (
                                                                        <div className="text-xs text-gray-400 mt-1">
                                                                            {formatDate(notification.date)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {!notification.read && (
                                                                    <span className="mt-1 w-2 h-2 rounded-full bg-blue-500" />
                                                                )}
                                                            </button>
                                                    ))}

                                                    {stockNotifications.length > 0 && (
                                                        <div className="px-4 pt-3 text-xs font-semibold text-gray-400 uppercase">
                                                            Low Stock Alerts
                                                        </div>
                                                    )}
                                                    {stockNotifications.map((notification) => (
                                                            <button
                                                                key={notification.id}
                                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3"
                                                                onClick={() => handleNotificationClick(notification)}
                                                            >
                                                                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                                                                    <Package size={18} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-sm font-semibold text-gray-900 truncate">
                                                                        {notification.title}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {notification.message}
                                                                    </div>
                                                                </div>
                                                                {!notification.read && (
                                                                    <span className="mt-1 w-2 h-2 rounded-full bg-amber-500" />
                                                                )}
                                                            </button>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="relative">
                            <div
                                className="flex items-center gap-3 cursor-pointer pl-2"
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                            >
                                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm">
                                    {user?.name?.charAt(0) || 'A'}
                                </div>
                                <div className="hidden md:block">
                                    <div className="text-sm font-semibold text-gray-900 leading-tight">
                                        {user?.name || 'Admin User'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {user?.role || 'admin'}
                                    </div>
                                </div>
                                <ChevronDown
                                    size={16}
                                    className={`text-gray-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
                                />
                            </div>

                            <AnimatePresence>
                                {userMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 8 }}
                                        className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 origin-top-right"
                                    >
                                        <div className="px-4 py-3 border-b border-gray-100 md:hidden">
                                            <p className="text-sm font-semibold text-gray-900">{user?.name || 'Admin User'}</p>
                                            <p className="text-xs text-gray-500">{user?.email || 'admin@example.com'}</p>
                                        </div>
                                        <button
                                            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                            onClick={() => navigate('/dashboard/settings')}
                                        >
                                            <User size={16} className="text-gray-400" />
                                            <span>Profile</span>
                                        </button>
                                        <button
                                            className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                            onClick={handleLogout}
                                        >
                                            <LogOut size={16} className="text-red-500" />
                                            <span>Logout</span>
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--bg-default)' }}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
