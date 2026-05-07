import { memo, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { dashboardAPI, emailAPI } from '../services/api';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Bar,
    ComposedChart
} from 'recharts';
import { formatDate } from '../utils/dateUtils';
import { EmailActionModal, useToast } from '../components/common';
import { getEmailRecipientValidation, pickDefaultRecipient } from '../utils/emailUtils';
import { Loader2, Mail, Clock as ClockIcon, LayoutDashboard, IndianRupee, ShoppingCart, Package, Users } from 'lucide-react';

// Static helpers outside component to prevent recreation
const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

const PRODUCT_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#a855f7'];
const EMPTY_STATS = { totalRevenue: 0, totalOrders: 0, totalCustomers: 0 };
const EMPTY_ORDER_COUNTS = { pending: 0, confirmed: 0, delivered: 0, cancelled: 0 };
const DASHBOARD_OVERVIEW_CACHE_KEY = 'srf:dashboard:overview:v1';
const DASHBOARD_OVERVIEW_CACHE_TTL = 5 * 1000; // 5 seconds for real-time updates
const REAL_TIME_REFRESH_INTERVAL = 30 * 1000; // Refresh data every 30 seconds

// Isolated Clock component to prevent Dashboard-wide re-renders every second
const DigitalClock = memo(() => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/80 border border-blue-100 rounded-full shadow-sm">
            <ClockIcon size={14} className="text-blue-500" />
            <span className="text-xs font-semibold text-gray-700">
                {currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <span className="text-xs text-gray-400">|</span>
            <span className="text-xs font-bold text-blue-600">
                {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </span>
        </div>
    );
});

DigitalClock.displayName = 'DigitalClock';

const getStatusCountsFromBills = (bills = []) => bills.reduce(
    (acc, bill) => {
        const status = (bill.status || bill.paymentStatus || '').toLowerCase();
        if (status.includes('pending')) acc.pending += 1;
        else if (status.includes('confirm')) acc.confirmed += 1;
        else if (status.includes('deliver')) acc.delivered += 1;
        else if (status.includes('cancel')) acc.cancelled += 1;
        return acc;
    },
    { ...EMPTY_ORDER_COUNTS }
);

const readCachedOverview = () => {
    try {
        const raw = localStorage.getItem(DASHBOARD_OVERVIEW_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.timestamp || !parsed?.payload) return null;
        if (Date.now() - parsed.timestamp > DASHBOARD_OVERVIEW_CACHE_TTL) return null;
        return parsed.payload;
    } catch {
        return null;
    }
};

const writeCachedOverview = (payload) => {
    try {
        localStorage.setItem(
            DASHBOARD_OVERVIEW_CACHE_KEY,
            JSON.stringify({ timestamp: Date.now(), payload })
        );
    } catch {
        // Ignore cache write errors (storage quota/private mode).
    }
};

const DashboardPage = () => {
    const toast = useToast();
    const { user } = useSelector((state) => state.auth);
    const [stats, setStats] = useState(EMPTY_STATS);
    const [recentBills, setRecentBills] = useState([]);
    const [revenueData, setRevenueData] = useState([]);
    const [orderStatusCounts, setOrderStatusCounts] = useState(EMPTY_ORDER_COUNTS);
    const [categoryData, setCategoryData] = useState([]);
    const [productCount, setProductCount] = useState(0);
    const [lowStockAlerts, setLowStockAlerts] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sendingSummary, setSendingSummary] = useState(false);
    const [emailConfigured, setEmailConfigured] = useState(null);
    const [chartPeriod, setChartPeriod] = useState('month');

    const applyOverviewPayload = (overview = {}) => {
        const nextStats = overview?.stats || EMPTY_STATS;
        const bills = overview?.recentBills || [];
        const alerts = overview?.lowStockAlerts || [];
        const categoryStats = overview?.categoryStats || [];
        const products = overview?.products || [];

        setStats(nextStats);
        setRecentBills(bills);
        setOrderStatusCounts(getStatusCountsFromBills(bills));
        setLowStockAlerts(alerts);
        setCategoryData(
            categoryStats.map((cat) => ({
                name: cat.name,
                value: cat.count,
                units: cat.totalStock
            }))
        );
        setAllProducts(products);
        setProductCount(overview?.productCount || products.length || 0);
    };

    useEffect(() => {
        let isCancelled = false;
        const cachedOverview = readCachedOverview();

        const loadDashboardData = async () => {
            if (!cachedOverview) {
                setLoading(true);
            }

            try {
                const overviewRes = await dashboardAPI.getOverview({ recentLimit: 6, productLimit: 10 });
                if (isCancelled) return;

                const overview = overviewRes?.data?.data || {};
                applyOverviewPayload(overview);
                writeCachedOverview(overview);
            } catch (error) {
                if (isCancelled) return;
                if (!cachedOverview) {
                    console.error('Dashboard overview error:', error);
                    applyOverviewPayload({
                        stats: EMPTY_STATS,
                        recentBills: [],
                        lowStockAlerts: [],
                        categoryStats: [],
                        products: [],
                        productCount: 0
                    });
                }
            } finally {
                if (!isCancelled) {
                    setLoading(false);
                }
            }
        };

        if (cachedOverview) {
            applyOverviewPayload(cachedOverview);
            setLoading(false);
        }

        loadDashboardData();

        // Set up real-time polling to refresh data periodically
        const refreshInterval = setInterval(() => {
            if (!isCancelled) {
                loadDashboardData();
            }
        }, REAL_TIME_REFRESH_INTERVAL);

        return () => {
            isCancelled = true;
            clearInterval(refreshInterval);
        };
    }, []);

    useEffect(() => {
        let isCancelled = false;

        const loadChartData = async () => {
            try {
                const chartRes = await dashboardAPI.getRevenueChart(chartPeriod);
                if (isCancelled) return;

                setRevenueData((chartRes.data.data || []).map((dataPoint) => ({
                    date: dataPoint._id,
                    revenue: dataPoint.revenue,
                    sales: dataPoint.sales || 0,
                    purchase: dataPoint.purchase || 0,
                    orders: dataPoint.orders || 0
                })));
            } catch (error) {
                if (!isCancelled) {
                    console.error('Error fetching chart data:', error);
                    setRevenueData([]);
                }
            }
        };

        loadChartData();

        // Refresh chart data in real-time
        const chartRefreshInterval = setInterval(() => {
            if (!isCancelled) {
                loadChartData();
            }
        }, REAL_TIME_REFRESH_INTERVAL);

        return () => {
            isCancelled = true;
            clearInterval(chartRefreshInterval);
        };
    }, [chartPeriod]);

    useEffect(() => {
        let isCancelled = false;

        const loadEmailStatus = async () => {
            try {
                const response = await emailAPI.getStatus();
                if (isCancelled) return;
                setEmailConfigured(Boolean(response?.data?.configured));
            } catch (error) {
                console.error('Error loading email status:', error);
            }
        };

        loadEmailStatus();

        return () => {
            isCancelled = true;
        };
    }, []);

    const maxStock = useMemo(
        () => Math.max(...allProducts.map((product) => product.stock || 0), 1),
        [allProducts]
    );

    const handleSendSummary = async () => {
        if (emailConfigured === false) {
            toast.error('Email service is not configured on the server');
            return;
        }

        const toastId = toast.loading('Preparing your daily report...');
        try {
            setSendingSummary(true);
            const response = await emailAPI.sendDailySummary();
            toast.update(toastId, { 
                message: response?.data?.message || 'Report sent successfully', 
                type: 'success',
                duration: 5000 
            });
        } catch (err) {
            toast.update(toastId, { 
                message: err?.response?.data?.message || 'Failed to send summary', 
                type: 'error',
                duration: 5000 
            });
        } finally {
            setSendingSummary(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#1f9b73', borderTopColor: 'transparent' }} />
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-fade-in p-2">
            {/* Executive Header */}
            <div className="page-header-shell bg-white/40 backdrop-blur-md border border-white/40 shadow-xl shadow-slate-200/20 rounded-3xl p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-5">
                        <div className="w-16 h-16 rounded-3xl bg-linear-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <LayoutDashboard size={28} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em]">Overview</p>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Dashboard</h1>
                            <div className="flex items-center gap-3 pt-1">
                                <p className="text-sm font-bold text-slate-500">Hi, {user?.name?.split(' ')[0] || 'User'}</p>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <DigitalClock />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden xl:flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100/50">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Real-time Updates</span>
                        </div>
                        <button
                            onClick={handleSendSummary}
                            disabled={sendingSummary}
                            className="btn btn-primary px-6 py-4 rounded-2xl shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            {sendingSummary ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                            <span className="font-bold tracking-tight">{sendingSummary ? 'Preparing...' : 'Send Daily Report'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Core Intelligence Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Sales', value: formatCurrency(stats.totalRevenue), note: 'Monthly Performance', icon: IndianRupee, color: 'blue', trend: '+12.5%' },
                    { label: 'Active Orders', value: stats.totalOrders || 0, note: `${orderStatusCounts.pending} Pending Bills`, icon: ShoppingCart, color: 'emerald', trend: '+5.2%' },
                    { label: 'Total Items', value: productCount, note: `${categoryData.length} Categories`, icon: Package, color: 'indigo', trend: 'Optimal' },
                    { label: 'Customers', value: stats.totalCustomers || 0, note: 'Saved in system', icon: Users, color: 'amber', trend: '+3 new' }
                ].map((item, i) => (
                    <div key={i} className="glass-card p-8 border-none group hover:translate-y-[-4px] transition-all duration-500">
                        <div className="flex items-start justify-between mb-6">
                            <div className={`w-14 h-14 rounded-2xl bg-${item.color}-50 text-${item.color}-600 flex items-center justify-center border border-${item.color}-100 shadow-sm group-hover:scale-110 transition-transform`}>
                                <item.icon size={24} />
                            </div>
                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg bg-${item.color}-50 text-${item.color}-700 uppercase tracking-widest`}>
                                {item.trend}
                            </span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{item.value}</h2>
                            <p className="text-xs font-bold text-slate-500 pt-1">{item.note}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Analytics Landscape */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="glass-card lg:col-span-2 p-8 border-none flex flex-col">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Sales Analytics</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Revenue & Sales Trends</p>
                        </div>
                        <div className="flex p-1.5 bg-slate-100/50 rounded-2xl backdrop-blur-sm border border-slate-200/50">
                            {['week', 'month', 'year'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setChartPeriod(p)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        chartPeriod === p
                                            ? 'bg-white text-blue-600 shadow-md'
                                            : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="w-full relative" style={{ height: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                        borderRadius: '16px', 
                                        border: 'none', 
                                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                                        padding: '16px'
                                    }}
                                />
                                <Bar dataKey="sales" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={32} name="Total Sales" />
                                <Bar dataKey="purchase" fill="#10b981" radius={[6, 6, 0, 0]} barSize={32} name="Purchases" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card p-8 border-none">
                    <div className="flex items-center justify-between mb-8">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Alerts</h3>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Low Stock Items</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center border border-red-100">
                            <ClockIcon size={20} />
                        </div>
                    </div>

                    {lowStockAlerts.length === 0 ? (
                        <div className="py-20 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200">
                                <Package size={24} className="text-slate-300" />
                            </div>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">No Stock Alerts</p>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[400px] overflow-auto pr-2 custom-scrollbar">
                            {lowStockAlerts.map((item) => (
                                <div key={item._id} className="p-4 bg-red-50/50 border border-red-100 rounded-2xl group hover:bg-red-50 transition-colors">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{item.name}</p>
                                            <p className="text-[11px] font-black text-red-500 uppercase tracking-widest">Low Stock</p>
                                        </div>
                                        <span className="px-2 py-1 rounded-lg bg-red-100 text-red-800 text-[11px] font-black">{item.stock} LEFT</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-red-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-red-500 rounded-full" 
                                            style={{ width: `${(item.stock / item.lowStockThreshold) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Tactical Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="glass-card p-8 border-none flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Stock Mix</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Category Distribution</p>
                        </div>
                        <Link to="/dashboard/inventory" className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all">
                            <Package size={18} />
                        </Link>
                    </div>

                    <div className="flex-1 space-y-6 max-h-[400px] overflow-auto pr-2 custom-scrollbar">
                        {allProducts.map((p, idx) => {
                            const stock = p.stock || 0;
                            const percentage = Math.min(100, (stock / maxStock) * 100);
                            const color = PRODUCT_COLORS[idx % PRODUCT_COLORS.length];
                            return (
                                <div key={p._id || idx} className="space-y-2 group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                            <span className="text-sm font-bold text-slate-700 truncate max-w-[150px]">{p.name}</span>
                                        </div>
                                        <span className="text-xs font-black text-slate-900">{stock.toLocaleString()} <span className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">PCS</span></span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full rounded-full transition-all duration-1000 group-hover:brightness-110" 
                                            style={{ width: `${percentage}%`, backgroundColor: color }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="glass-card lg:col-span-2 p-0 border-none overflow-hidden">
                    <div className="p-8 pb-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Recent Transactions</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Latest updates</p>
                        </div>
                        <Link to="/dashboard/billing" className="btn btn-secondary px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                            View All Bills
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bill No.</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Name</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentBills.length === 0 ? (
                                    <tr><td colSpan="5" className="px-8 py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">No transactions yet</td></tr>
                                ) : (
                                    recentBills.map((bill) => (
                                        <tr key={bill._id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-5 text-sm font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">#{bill.billNumber}</td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                                                        {bill.customer?.name?.charAt(0) || 'C'}
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-700">{bill.customer?.name || 'Walk-in Client'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-sm font-black text-slate-900">{formatCurrency(bill.grandTotal)}</td>
                                            <td className="px-8 py-5 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                    bill.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                                                    bill.paymentStatus === 'cancelled' ? 'bg-red-50 text-red-600 border border-red-100' : 
                                                    'bg-amber-50 text-amber-600 border border-amber-100'
                                                }`}>
                                                    {bill.paymentStatus || 'processing'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right text-xs font-bold text-slate-400">{formatDate(bill.date || bill.createdAt)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
