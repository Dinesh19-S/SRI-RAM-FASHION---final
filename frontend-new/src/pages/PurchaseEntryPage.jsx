import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ShoppingCart, Plus, Search, Eye, Trash2, X, Save, Building2, Calendar, FileText, IndianRupee, Package, Trash, Edit, CheckCircle2, Printer, TrendingUp, AlertTriangle, ChevronLeft, ChevronRight, UploadCloud, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { purchaseEntriesAPI, suppliersAPI, productsAPI } from '../services/api';
import { useToast } from '../components/common';
import BillTemplate from '../components/BillTemplate';
import { fetchSettings } from '../store/slices/settingsSlice';

const avatarBg = ['bg-indigo-500', 'bg-blue-500', 'bg-emerald-500', 'bg-teal-500', 'bg-slate-500'];

const PurchaseEntryPage = () => {
    const toast = useToast();
    const dispatch = useDispatch();
    const settings = useSelector((state) => state.settings.data);
    const resolvedSettings = settings || { company: {}, bank: {}, tax: { cgstRate: 0, sgstRate: 0 } };
    const [entries, setEntries] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });

    const [formData, setFormData] = useState({
        supplier: '',
        billNumber: '',
        date: new Date().toISOString().split('T')[0],
        items: [{ product: '', quantity: '', rate: '', total: 0 }],
        totalAmount: 0,
        paymentStatus: 'pending',
        notes: ''
    });

    useEffect(() => {
        dispatch(fetchSettings());
        fetchEntries();
        fetchSuppliers();
        fetchProducts();
    }, [pagination.page, pagination.limit]);

    const fetchEntries = async () => {
        setIsLoading(true);
        try {
            const response = await purchaseEntriesAPI.getAll({
                search: searchQuery,
                page: pagination.page,
                limit: pagination.limit
            });
            setEntries(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                total: response.data.pagination?.total || 0,
                pages: response.data.pagination?.pages || 0
            }));
        } catch (error) {
            console.error('Error fetching entries:', error);
            toast.error('Error: Could not load purchase history');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const response = await suppliersAPI.getAll({ limit: 1000 });
            setSuppliers(response.data.data || []);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await productsAPI.getAll({ limit: 1000 });
            setProducts(response.data.data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const handleSearch = () => {
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchEntries();
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;

        if (field === 'quantity' || field === 'rate') {
            const qty = parseFloat(newItems[index].quantity) || 0;
            const rate = parseFloat(newItems[index].rate) || 0;
            newItems[index].total = qty * rate;
        }

        const total = newItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
        setFormData(prev => ({ ...prev, items: newItems, totalAmount: total }));
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { product: '', quantity: '', rate: '', total: 0 }]
        }));
    };

    const removeItem = (index) => {
        if (formData.items.length === 1) return;
        const newItems = formData.items.filter((_, i) => i !== index);
        const total = newItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
        setFormData(prev => ({ ...prev, items: newItems, totalAmount: total }));
    };

    const handleSave = async () => {
        if (!formData.supplier || !formData.billNumber || formData.items.some(item => !item.product || !item.quantity || !item.rate)) {
            toast.warning('Error: Please fill all fields');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await purchaseEntriesAPI.create(formData);
            if (response.data.success) {
                const newEntryId = response.data.data._id;
                if (selectedFile) {
                    try {
                        await purchaseEntriesAPI.uploadBillPdf(newEntryId, selectedFile);
                    } catch (uploadError) {
                        toast.error('Saved: Purchase added, but file upload failed');
                    }
                }
                toast.success('Success: Purchase record added');
                setShowModal(false);
                resetForm();
                fetchEntries();
            }
        } catch (error) {
            toast.error('System Error: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            supplier: '',
            billNumber: '',
            date: new Date().toISOString().split('T')[0],
            items: [{ product: '', quantity: '', rate: '', total: 0 }],
            totalAmount: 0,
            paymentStatus: 'pending',
            notes: ''
        });
        setSelectedFile(null);
    };

    const handleViewEntry = (entry) => {
        setSelectedEntry(entry);
        setShowViewModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this record?')) return;
        try {
            await purchaseEntriesAPI.delete(id);
            toast.success('Deleted: Purchase record removed');
            fetchEntries();
        } catch (error) {
            toast.error('Error: Could not delete record');
        }
    };

    const formatCurrency = (a) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(a) || 0);

    const metrics = useMemo(() => {
        const totalValue = entries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
        const pendingValue = entries.filter(e => e.paymentStatus === 'pending').reduce((sum, e) => sum + (e.totalAmount || 0), 0);
        const paidCount = entries.filter(e => e.paymentStatus === 'paid').length;
        const totalCount = entries.length;

        return {
            totalValue,
            pendingValue,
            paidPercent: totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0,
            avgBill: totalCount > 0 ? Math.round(totalValue / totalCount) : 0
        };
    }, [entries]);

    return (
        <div className="space-y-10 animate-fade-in p-2 pb-20">
            {/* Elite Procurement Header */}
            <div className="page-header-shell bg-white/40 backdrop-blur-md border border-white/40 shadow-xl shadow-slate-200/20 rounded-3xl p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-5">
                        <div className="w-16 h-16 rounded-3xl bg-linear-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                            <ShoppingCart size={28} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.3em]">Purchase History</p>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Purchase List</h1>
                            <p className="text-sm font-bold text-slate-500 pt-1">Track all your stock purchases and vendor bills.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            className="btn btn-secondary px-6 py-4 rounded-2xl flex items-center gap-2 group"
                            onClick={() => fetchEntries()}
                        >
                            <Zap size={18} className="text-emerald-500 group-hover:animate-pulse" />
                            <span className="font-black uppercase tracking-widest text-[11px]">Refresh</span>
                        </button>
                        <button
                            className="btn btn-primary px-8 py-4 rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 border-none bg-emerald-600 text-white"
                            onClick={() => setShowModal(true)}
                        >
                            <Plus size={20} strokeWidth={3} />
                            <span className="font-black uppercase tracking-widest text-xs">New Purchase</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Strategic Intelligence Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass-card p-6 border-none group hover:scale-[1.02] transition-all">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Purchase Value</p>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(metrics.totalValue)}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                    <div className="mt-6 flex items-center gap-2">
                        <div className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded-lg uppercase">Active</div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{entries.length} Invoices Tracked</p>
                    </div>
                </div>

                <div className="glass-card p-6 border-none group hover:scale-[1.02] transition-all border-l-4 border-amber-400">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Pending Payments</p>
                            <h3 className="text-3xl font-black text-amber-600 tracking-tighter">{formatCurrency(metrics.pendingValue)}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <AlertTriangle size={24} />
                        </div>
                    </div>
                    <div className="mt-6">
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-amber-400 h-full" style={{ width: `${100 - metrics.paidPercent}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 border-none group hover:scale-[1.02] transition-all border-l-4 border-indigo-400">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Payment Progress</p>
                            <h3 className="text-3xl font-black text-indigo-600 tracking-tighter">{metrics.paidPercent}%</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <CheckCircle2 size={24} />
                        </div>
                    </div>
                    <div className="mt-6 flex items-center gap-2">
                         <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{entries.filter(e => e.paymentStatus === 'paid').length} Invoices Cleared</p>
                    </div>
                </div>

                <div className="glass-card p-6 border-none group hover:scale-[1.02] transition-all">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Average Purchase</p>
                            <h3 className="text-3xl font-black text-slate-700 tracking-tighter">{formatCurrency(metrics.avgBill)}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
                            <FileText size={24} />
                        </div>
                    </div>
                    <div className="mt-6 flex items-center gap-2">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Optimized Order Volume</span>
                    </div>
                </div>
            </div>

            {/* Procurement Intelligence Filters */}
            <div className="glass-card p-8 border-none">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by Bill #, Supplier, or Date..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="form-input pl-12 py-4 bg-slate-50 border-none shadow-inner rounded-2xl font-bold"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <select className="px-6 py-4 rounded-2xl bg-slate-100 border-none font-black uppercase tracking-widest text-[11px] outline-none">
                            <option value="">All Payment Status</option>
                            <option value="paid">Paid Bills</option>
                            <option value="pending">Unpaid Bills</option>
                        </select>
                        <button
                            onClick={handleSearch}
                            disabled={isLoading}
                            className="px-8 py-4 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] flex items-center gap-2 group hover:bg-slate-800 transition-all active:scale-95"
                        >
                            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={16} className="group-hover:scale-110 transition-transform" />}
                            Search
                        </button>
                    </div>
                </div>
            </div>

            {/* Purchase Ledger Table */}
            <div className="glass-card p-0 border-none overflow-hidden">
                <div className="p-8 pb-4 flex items-center justify-between">
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">All Purchases</h3>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">History</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100/50">
                        <span className="text-[11px] font-black uppercase tracking-widest">{pagination.total} Purchase Records</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                                <th className="px-8 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Bill Number</th>
                                <th className="px-8 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Supplier Name</th>
                                <th className="px-8 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Amount</th>
                                <th className="px-8 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="w-12 h-12 border-4 border-slate-100 border-t-emerald-600 rounded-full animate-spin" />
                                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Loading Data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : entries.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-32 text-center">
                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-dashed border-slate-200">
                                            <ShoppingCart size={32} className="text-slate-300" />
                                        </div>
                                        <h4 className="text-lg font-black text-slate-900 tracking-tight mb-1">No Records</h4>
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No purchases found.</p>
                                    </td>
                                </tr>
                            ) : (
                                entries.map((entry, index) => (
                                    <tr key={entry._id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center shadow-sm group-hover:border-emerald-200 transition-all">
                                                    <span className="text-[10px] font-black text-slate-500 leading-none uppercase">{new Date(entry.date).toLocaleString('default', { month: 'short' })}</span>
                                                    <span className="text-xl font-black text-slate-900 leading-none mt-1">{new Date(entry.date).getDate()}</span>
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-500">{new Date(entry.date).getFullYear()}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-900 tracking-tight uppercase group-hover:text-emerald-700 transition-colors">{entry.billNumber}</span>
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">ID: {entry._id.slice(-8)}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-black text-xs shadow-lg ${avatarBg[index % avatarBg.length]}`}>
                                                    {entry.supplier?.companyName?.charAt(0) || 'V'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-900 tracking-tight">{entry.supplier?.companyName || 'Unknown Vendor'}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">{entry.supplier?.mobile || 'No Profile'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-base font-black text-slate-900 tracking-tighter">{formatCurrency(entry.totalAmount)}</span>
                                                <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest">Incl. 5% GST</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 flex items-center gap-2 w-fit ${
                                                entry.paymentStatus === 'paid' 
                                                ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                                : 'bg-amber-50 border-amber-100 text-amber-700'
                                            }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${entry.paymentStatus === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                                {entry.paymentStatus}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                    onClick={() => handleViewEntry(entry)}
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                {entry.billPdf && (
                                                    <a
                                                        href={`http://localhost:5000/${entry.billPdf}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                    >
                                                        <FileText size={18} />
                                                    </a>
                                                )}
                                                <button
                                                    className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                    onClick={() => handleDelete(entry._id)}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Professional Pagination */}
                <div className="px-8 py-6 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-100">
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                        Purchase Entries: <span className="text-slate-900 font-black">{(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-slate-900 font-black">{pagination.total}</span> Records
                    </p>
                    {pagination.pages > 1 && (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                    disabled={pagination.page <= 1}
                                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all flex items-center justify-center"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: pagination.pages }, (_, i) => {
                                        const pageNum = i + 1;
                                        const isActive = pagination.page === pageNum;
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setPagination(p => ({ ...p, page: pageNum }))}
                                                className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${isActive ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                    disabled={pagination.page >= pagination.pages}
                                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all flex items-center justify-center"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* High-Performance Recording Modal */}
            {showModal && (
                <div className="modal-overlay bg-slate-900/60 p-4" onClick={() => !isSubmitting && setShowModal(false)}>
                    <div className="modal-content max-w-6xl border-none animate-slide-up rounded-4xl" onClick={(e) => e.stopPropagation()}>
                        <div className="p-8 border-b flex items-center justify-between bg-emerald-50/50 rounded-t-4xl">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                    <ShoppingCart size={32} />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">New Purchase Record</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Entry Session</span>
                                    </div>
                                </div>
                            </div>
                            <button className="p-4 rounded-2xl hover:bg-white text-slate-400 transition-all" onClick={() => setShowModal(false)}><X size={24} /></button>
                        </div>

                        <div className="p-10 space-y-10 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                <div className="space-y-2 md:col-span-2">
                                    <label className="form-label">Select Supplier *</label>
                                    <select
                                        name="supplier"
                                        className="form-input py-4 px-6 font-black text-lg"
                                        value={formData.supplier}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select Supplier...</option>
                                        {suppliers.map(s => <option key={s._id} value={s._id}>{s.companyName}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="form-label">Bill Number</label>
                                    <input
                                        type="text"
                                        name="billNumber"
                                        className="form-input py-4 px-6 font-mono font-black uppercase tracking-widest"
                                        placeholder="BILL-IDENTIFIER"
                                        value={formData.billNumber}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="form-label">Date</label>
                                    <input
                                        type="date"
                                        name="date"
                                        className="form-input py-4 px-6 font-black"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Purchase Items</h4>
                                    <button onClick={addItem} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/10">
                                        <Plus size={14} strokeWidth={3} /> Add Line Item
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {formData.items.map((item, index) => (
                                        <div key={index} className="grid grid-cols-12 gap-6 items-center p-6 rounded-3xl bg-slate-50 border border-slate-100 group hover:border-emerald-200 hover:bg-white hover:shadow-2xl transition-all animate-fade-in">
                                            <div className="col-span-12 md:col-span-5">
                                                <label className="text-[11px] font-black text-slate-500 uppercase mb-2 block">Select Product</label>
                                                <select
                                                    className="w-full bg-white border border-slate-200 rounded-xl py-4 px-5 font-black text-slate-900 outline-none focus:border-emerald-500 transition-all"
                                                    value={item.product}
                                                    onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                                                >
                                                    <option value="">Choose item...</option>
                                                    {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.size || 'N/A'})</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-4 md:col-span-2">
                                                <label className="text-[11px] font-black text-slate-500 uppercase mb-2 block text-center">Quantity</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-white border border-slate-200 rounded-xl py-4 px-5 text-center font-black text-emerald-700 outline-none focus:border-emerald-500 transition-all"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-4 md:col-span-2">
                                                <label className="text-[11px] font-black text-slate-500 uppercase mb-2 block text-right">Unit Rate</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-white border border-slate-200 rounded-xl py-4 px-5 text-right font-black text-slate-900 outline-none focus:border-emerald-500 transition-all"
                                                    value={item.rate}
                                                    onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-3 md:col-span-2">
                                                <label className="text-[11px] font-black text-slate-500 uppercase mb-2 block text-right">Subtotal</label>
                                                <div className="py-4 text-right font-black text-slate-900 text-lg tracking-tight">
                                                    {formatCurrency(item.total)}
                                                </div>
                                            </div>
                                            <div className="col-span-1 flex justify-center">
                                                <button
                                                    onClick={() => removeItem(index)}
                                                    className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-10 border-t border-slate-100">
                                <div className="space-y-10">
                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">Payment Status</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            {['pending', 'paid'].map(status => (
                                                <button
                                                    key={status}
                                                    onClick={() => setFormData(p => ({ ...p, paymentStatus: status }))}
                                                    className={`py-6 rounded-3xl border-2 font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-3 ${
                                                        formData.paymentStatus === status 
                                                        ? (status === 'paid' ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-500/20' : 'bg-amber-500 border-amber-500 text-white shadow-xl shadow-amber-500/20')
                                                        : 'bg-white border-slate-100 text-slate-400 grayscale hover:grayscale-0 hover:border-slate-300'
                                                    }`}
                                                >
                                                    {status === 'paid' ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
                                                    {status === 'paid' ? 'Paid' : 'Pending'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">Upload Bill (PDF)</label>
                                        <div className="relative group">
                                            <input
                                                type="file"
                                                accept="application/pdf,image/*"
                                                onChange={(e) => setSelectedFile(e.target.files[0])}
                                                className="hidden"
                                                id="bill-upload-elite"
                                            />
                                            <label
                                                htmlFor="bill-upload-elite"
                                                className="flex flex-col items-center justify-center gap-4 py-12 px-10 border-2 border-dashed border-slate-200 rounded-4xl text-[11px] font-black text-slate-500 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50/30 transition-all bg-slate-50/50 cursor-pointer group"
                                            >
                                                {selectedFile ? (
                                                    <div className="text-center">
                                                        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-lg">
                                                            <FileText size={32} />
                                                        </div>
                                                        <span className="block text-emerald-900 font-black text-xs truncate max-w-[250px] mb-1">{selectedFile.name}</span>
                                                        <span className="text-[8px] uppercase tracking-widest text-emerald-500">File Selected - Click to change</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-xl border border-slate-100 group-hover:scale-110 transition-transform">
                                                            <UploadCloud size={28} className="text-emerald-500" />
                                                        </div>
                                                        <div className="text-center">
                                                            <span className="uppercase tracking-[0.3em] block mb-2">Upload Bill File</span>
                                                            <span className="text-[8px] font-bold text-slate-300">Format: PDF / JPEG / PNG • Max: 50MB</span>
                                                        </div>
                                                    </>
                                                )}
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-900 rounded-4xl p-12 text-white relative overflow-hidden shadow-2xl shadow-slate-900/40 flex flex-col justify-between border border-white/5">
                                    <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-400/5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
                                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-400/5 rounded-full translate-y-1/3 -translate-x-1/2"></div>
                                    
                                    <div className="relative z-10 space-y-8">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <h4 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.4em]">Bill Summary</h4>
                                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em]">Total Amount</p>
                                            </div>
                                            <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                                                <IndianRupee size={16} className="text-emerald-400" />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-400 text-[11px] font-black uppercase tracking-widest">Net Value</span>
                                                <span className="font-black text-xl tracking-tight">{formatCurrency(formData.totalAmount / 1.05)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-400 text-[11px] font-black uppercase tracking-widest">Input GST (5%)</span>
                                                <span className="font-black text-xl tracking-tight text-emerald-400">+{formatCurrency(formData.totalAmount - (formData.totalAmount / 1.05))}</span>
                                            </div>
                                            <div className="h-px bg-white/10" />
                                            <div className="space-y-2">
                                                <span className="text-emerald-500 text-[11px] font-black uppercase tracking-[0.3em]">Total Amount</span>
                                                <div className="text-6xl font-black tracking-tighter text-white drop-shadow-2xl">
                                                    {formatCurrency(formData.totalAmount)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative z-10 pt-12">
                                        <button
                                            onClick={handleSave}
                                            className="w-full py-7 bg-emerald-400 hover:bg-white text-emerald-950 rounded-4xl font-black text-sm uppercase tracking-widest transition-all shadow-2xl shadow-emerald-400/30 active:scale-[0.97] flex items-center justify-center gap-4 group"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <div className="w-5 h-5 border-2 border-emerald-950/20 border-t-emerald-950 rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    Save Purchase
                                                    <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Authoritative View Modal */}
            {showViewModal && selectedEntry && (
                <div className="modal-overlay backdrop-blur-xl bg-slate-900/60 p-4" onClick={() => setShowViewModal(false)}>
                    <div className="modal-content max-w-5xl border-none animate-scale-up" onClick={(e) => e.stopPropagation()}>
                        <div className="p-10 border-b flex items-center justify-between bg-slate-900 text-white rounded-t-4xl">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-2xl shadow-emerald-500/5">
                                    <FileText size={32} />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black tracking-tighter">Purchase Bill</h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="px-3 py-1 bg-white/5 rounded-lg text-[11px] font-black uppercase tracking-widest text-slate-300 border border-white/5">Bill #: {selectedEntry.billNumber}</span>
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Purchase Record</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => window.print()}
                                    className="w-14 h-14 rounded-2xl bg-white/5 hover:bg-emerald-500 hover:text-white border border-white/10 flex items-center justify-center transition-all group"
                                >
                                    <Printer size={24} className="group-hover:scale-110 transition-transform" />
                                </button>
                                <button 
                                    onClick={() => setShowViewModal(false)}
                                    className="w-14 h-14 rounded-2xl bg-white/5 hover:bg-red-500 hover:text-white border border-white/10 flex items-center justify-center transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="p-0 overflow-y-auto max-h-[75vh] bg-slate-50 custom-scrollbar">
                            <div className="max-w-[850px] mx-auto my-16 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] bg-white overflow-hidden rounded-4xl border border-slate-100">
                                <BillTemplate
                                    bill={{
                                        ...selectedEntry,
                                        billType: 'PURCHASE',
                                        customer: selectedEntry.supplier,
                                        items: selectedEntry.items?.map(item => ({
                                            ...item,
                                            productName: item.product?.name || item.name || 'N/A',
                                            hsnCode: item.product?.hsn || item.hsnCode || '',
                                            designColor: item.product?.size || '',
                                            weightKg: item.quantity,
                                            ratePerKg: item.rate,
                                            total: item.total
                                        })),
                                        subtotal: selectedEntry.totalAmount / 1.05,
                                        totalTax: selectedEntry.totalAmount - (selectedEntry.totalAmount / 1.05),
                                        grandTotal: selectedEntry.totalAmount
                                    }}
                                    settings={resolvedSettings}
                                />
                            </div>
                        </div>
                        <div className="px-10 py-8 bg-white border-t border-slate-100 flex justify-between items-center rounded-b-[2.5rem]">
                            <div className="flex items-center gap-3">
                                <ShieldCheck size={20} className="text-emerald-500" />
                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Verified Record</span>
                            </div>
                            <button 
                                onClick={() => setShowViewModal(false)} 
                                className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-emerald-600 transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98]"
                            >
                                Close View
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseEntryPage;
