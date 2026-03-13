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
const DASHBOARD_OVERVIEW_CACHE_TTL = 60 * 1000;

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

        return () => {
            isCancelled = true;
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

        return () => {
            isCancelled = true;
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

        const toastId = toast.loading('Calculating and preparing daily summary...');
        try {
            setSendingSummary(true);
            const response = await emailAPI.sendDailySummary();
            toast.update(toastId, { 
                message: response?.data?.message || 'Daily summary is being sent to admin', 
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
        <div className="space-y-6 animate-fade-in">
            <div className="page-header-shell">
                <div className="flex items-start gap-4">
                    <div className="page-icon-badge">
                        <LayoutDashboard size={20} />
                    </div>
                    <div className="page-header-copy">
                        <p className="page-header-kicker">Store performance overview</p>
                        <h1 className="page-header-title">Dashboard</h1>
                        <div className="flex flex-wrap items-center gap-3">
                            <p className="text-sm text-slate-600">Here&apos;s what&apos;s happening with your store today.</p>
                            <DigitalClock />
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleSendSummary}
                    disabled={sendingSummary}
                    className="btn btn-primary"
                >
                    {sendingSummary ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                    {sendingSummary ? 'Sending...' : 'Email Daily Summary'}
                </button>
            </div>

            <div className="metric-grid">
                <div className="metric-card">
                    <div className="metric-card-header">
                        <div className="metric-card-copy">
                            <p className="metric-card-label">Total Revenue</p>
                            <p className="metric-card-value">{formatCurrency(stats.totalRevenue)}</p>
                            <p className="metric-card-note">This month</p>
                        </div>
                        <div className="metric-card-icon">
                            <IndianRupee size={22} />
                        </div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-card-header">
                        <div className="metric-card-copy">
                            <p className="metric-card-label">Total Orders</p>
                            <p className="metric-card-value">{stats.totalOrders || 0}</p>
                            <p className="metric-card-note">{orderStatusCounts.pending} pending</p>
                        </div>
                        <div className="metric-card-icon">
                            <ShoppingCart size={22} />
                        </div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-card-header">
                        <div className="metric-card-copy">
                            <p className="metric-card-label">Products</p>
                            <p className="metric-card-value">{productCount}</p>
                            <p className="metric-card-note">{categoryData.length} categories</p>
                        </div>
                        <div className="metric-card-icon">
                            <Package size={22} />
                        </div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-card-header">
                        <div className="metric-card-copy">
                            <p className="metric-card-label">Customers</p>
                            <p className="metric-card-value">{stats.totalCustomers || 0}</p>
                            <p className="metric-card-note">Registered users</p>
                        </div>
                        <div className="metric-card-icon">
                            <Users size={22} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Sales & Purchase Analysis</h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setChartPeriod('week')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    chartPeriod === 'week'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Week
                            </button>
                            <button
                                onClick={() => setChartPeriod('month')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    chartPeriod === 'month'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Month
                            </button>
                            <button
                                onClick={() => setChartPeriod('year')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    chartPeriod === 'year'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Year
                            </button>
                            <button
                                onClick={() => setChartPeriod('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    chartPeriod === 'all'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                All
                            </button>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <ComposedChart data={revenueData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                            <YAxis stroke="#94a3b8" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                            <Tooltip />
                            <Legend verticalAlign="top" height={28} />
                            <Bar dataKey="sales" fill="#16a34a" name="Sales" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="purchase" fill="#ef4444" name="Purchase Expense" radius={[8, 8, 0, 0]} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                <div className="card">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">Low Stock Alerts</h3>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{lowStockAlerts.length} items</span>
                    </div>
                    {lowStockAlerts.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-10">No low stock items</p>
                    ) : (
                        <div className="space-y-2 max-h-56 overflow-auto pr-2">
                            {lowStockAlerts.map((item) => (
                                <div key={item._id} className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                                        <p className="text-xs text-gray-600">Stock {item.stock} / Min {item.lowStockThreshold}</p>
                                    </div>
                                    <span className="badge badge-warning">{item.stock}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">Products</h3>
                        <span className="text-xs text-gray-500">{allProducts.length} items</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-2.5 overflow-auto max-h-72 pr-1">
                        {allProducts.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-8">No products in inventory</p>
                        ) : (
                            allProducts.map((p, idx) => {
                                const stock = p.stock || 0;
                                return (
                                    <div key={p._id || idx} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm text-gray-700">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PRODUCT_COLORS[idx % PRODUCT_COLORS.length] }} />
                                                <span className="font-semibold truncate" style={{ maxWidth: '140px' }}>{p.name}</span>
                                            </div>
                                            <span className="font-bold text-gray-900">{stock.toLocaleString()} <span className="font-normal text-gray-500 text-xs">units</span></span>
                                        </div>
                                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${Math.min(100, (stock / maxStock) * 100)}%`,
                                                    backgroundColor: PRODUCT_COLORS[idx % PRODUCT_COLORS.length]
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="page-table-card lg:col-span-2">
                    <div className="flex items-center justify-between p-4 pb-0">
                        <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
                        <Link to="/dashboard/billing" className="text-sm font-semibold text-indigo-600 hover:underline">View All →</Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="page-table">
                            <thead>
                                <tr>
                                    <th>Order</th>
                                    <th>Customer</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentBills.length === 0 ? (
                                    <tr><td colSpan="5" className="page-empty-state">No recent orders</td></tr>
                                ) : (
                                    recentBills.map((bill) => (
                                        <tr key={bill._id}>
                                            <td className="font-semibold text-gray-900">{bill.billNumber}</td>
                                            <td>{bill.customer?.name || '-'}</td>
                                            <td className="font-semibold text-gray-900">{formatCurrency(bill.grandTotal)}</td>
                                            <td>
                                                <span className={`badge ${bill.paymentStatus === 'paid' ? 'badge-success' : bill.paymentStatus === 'cancelled' ? 'badge-error' : 'badge-warning'}`}>
                                                    {bill.paymentStatus || 'pending'}
                                                </span>
                                            </td>
                                            <td>{formatDate(bill.date || bill.createdAt)}</td>
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
