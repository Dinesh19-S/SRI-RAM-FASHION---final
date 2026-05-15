import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createPortal } from 'react-dom';
import { ShoppingCart, Plus, Search, Eye, Trash2, X, Save, Building2, Calendar, FileText, IndianRupee, Package, Trash, Edit, CheckCircle2, Printer, TrendingUp, AlertTriangle, ChevronLeft, ChevronRight, UploadCloud, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fabricPurchasesAPI, suppliersAPI, productsAPI } from '../services/api';
import { 
    fetchFabricPurchases, 
    createFabricPurchase, 
    deleteFabricPurchase, 
    updateFabricPurchase 
} from '../store/slices/fabricPurchasesSlice';
import { fetchSettings } from '../store/slices/settingsSlice';
import { useToast } from '../components/common';
import BillTemplate from '../components/BillTemplate';

const avatarBg = ['bg-indigo-500', 'bg-blue-500', 'bg-emerald-500', 'bg-teal-500', 'bg-slate-500'];

const PurchaseEntryPage = () => {
    const toast = useToast();
    const dispatch = useDispatch();
    const settings = useSelector((state) => state.settings.data);
    const { items: entries, isLoading, pagination } = useSelector((state) => state.fabricPurchases);
    const resolvedSettings = settings || { company: {}, bank: {}, tax: { cgstRate: 0, sgstRate: 0 } };
    
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const [formData, setFormData] = useState({
        supplier_name: '',
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        items: [{ fabric_name: '', weight_kg: '', rate_per_kg: '', color: '', gsm: '', roll_no: '' }],
        transport: '',
        vehicle_number: '',
        lr_number: '',
        gstin: '',
        mobile: ''
    });

    useEffect(() => {
        dispatch(fetchSettings());
        dispatch(fetchFabricPurchases({ page: currentPage, search: searchQuery }));
        fetchSuppliers();
        fetchProducts();
    }, [dispatch, currentPage, searchQuery]);

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
        setCurrentPage(1);
        dispatch(fetchFabricPurchases({ page: 1, search: searchQuery }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { fabric_name: '', weight_kg: '', rate_per_kg: '', color: '', gsm: '', roll_no: '' }]
        }));
    };

    const removeItem = (index) => {
        if (formData.items.length === 1) return;
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const handleSave = async () => {
        // Basic validation
        if (!formData.supplier_name) {
            toast.warning('Please enter supplier name');
            return;
        }
        if (!formData.invoice_number) {
            toast.warning('Please enter invoice number');
            return;
        }
        if (formData.items.some(item => !item.fabric_name || !item.weight_kg || !item.rate_per_kg)) {
            toast.warning('Please fill fabric details (name, weight, and rate)');
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading('Saving purchase record...');

        try {
            // Ensure numbers are numbers
            const formattedData = {
                ...formData,
                items: formData.items.map(item => ({
                    ...item,
                    weight_kg: Number(item.weight_kg),
                    rate_per_kg: Number(item.rate_per_kg),
                    gsm: item.gsm ? Number(item.gsm) : undefined,
                    amount: Number(item.weight_kg) * Number(item.rate_per_kg)
                }))
            };

            if (editingId) {
                await dispatch(updateFabricPurchase({ id: editingId, data: formattedData })).unwrap();
                toast.update(toastId, { 
                    message: 'Purchase record updated successfully', 
                    type: 'success',
                    duration: 3000 
                });
            } else {
                await dispatch(createFabricPurchase(formattedData)).unwrap();
                toast.update(toastId, { 
                    message: 'Purchase record saved successfully', 
                    type: 'success',
                    duration: 3000 
                });
            }
            setShowModal(false);
            resetForm();
            setEditingId(null);
        } catch (error) {
            toast.update(toastId, { 
                message: 'Failed to save: ' + error, 
                type: 'error',
                duration: 5000 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            supplier_name: '',
            invoice_number: '',
            invoice_date: new Date().toISOString().split('T')[0],
            items: [{ fabric_name: '', weight_kg: '', rate_per_kg: '', color: '', gsm: '', roll_no: '' }],
            transport: '',
            vehicle_number: '',
            lr_number: '',
            gstin: '',
            mobile: ''
        });
    };

    const handleViewEntry = async (entry) => {
        const toastId = toast.loading('Loading invoice details...');
        try {
            const response = await fabricPurchasesAPI.getById(entry._id);
            setSelectedEntry(response.data.data);
            setShowViewModal(true);
            toast.update(toastId, { message: 'Loaded successfully', type: 'success', duration: 1000 });
        } catch (error) {
            toast.update(toastId, { message: 'Failed to load details', type: 'error', duration: 3000 });
        }
    };

    const handleEdit = async (entry) => {
        const toastId = toast.loading('Fetching details...');
        try {
            const response = await fabricPurchasesAPI.getById(entry._id);
            const fullEntry = response.data.data;
            
            setEditingId(fullEntry._id);
            setFormData({
                supplier_name: fullEntry.supplier_name,
                gstin: fullEntry.gstin || '',
                mobile: fullEntry.mobile || '',
                invoice_number: fullEntry.invoice_number,
                invoice_date: fullEntry.invoice_date ? new Date(fullEntry.invoice_date).toISOString().split('T')[0] : '',
                transport: fullEntry.transport || '',
                vehicle_number: fullEntry.vehicle_number || '',
                lr_number: fullEntry.lr_number || '',
                items: fullEntry.items?.map(item => ({
                    fabric_name: item.fabric_name,
                    weight_kg: item.weight_kg,
                    rate_per_kg: item.rate_per_kg,
                    color: item.color || '',
                    gsm: item.gsm || '',
                    roll_no: item.roll_no || ''
                })) || [{ fabric_name: '', weight_kg: '', rate_per_kg: '', color: '', gsm: '', roll_no: '' }]
            });
            
            toast.update(toastId, { message: 'Details loaded', type: 'success', duration: 1000 });
            setShowModal(true);
        } catch (error) {
            toast.update(toastId, { message: 'Failed to load details', type: 'error', duration: 3000 });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this record?')) return;
        
        const toastId = toast.loading('Removing record...');
        try {
            await dispatch(deleteFabricPurchase(id)).unwrap();
            toast.update(toastId, { 
                message: 'Purchase record removed', 
                type: 'success',
                duration: 3000 
            });
        } catch (error) {
            toast.update(toastId, { 
                message: 'Error: Could not delete record', 
                type: 'error',
                duration: 5000 
            });
            dispatch(fetchFabricPurchases());
        }
    };

    const formatCurrency = (a) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(a) || 0);

    const metrics = useMemo(() => {
        const totalValue = (entries || []).reduce((sum, e) => sum + (e.total_amount || 0), 0);
        const totalWeight = (entries || []).reduce((sum, e) => sum + (e.total_weight || 0), 0);
        const totalRolls = (entries || []).reduce((sum, e) => sum + (e.total_rolls || 0), 0);
        const totalCount = entries?.length || 0;

        return {
            totalValue,
            totalWeight,
            totalRolls,
            avgBill: totalCount > 0 ? Math.round(totalValue / totalCount) : 0
        };
    }, [entries]);

    return (
        <div className="space-y-10 animate-fade-in p-2 pb-20">
            {/* Elite Procurement Header */}
            <div className="page-header-shell bg-white/60 backdrop-blur-2xl border border-white/50 shadow-premium rounded-[2.5rem] p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-start gap-6">
                        <div className="w-20 h-20 rounded-4xl bg-linear-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-2xl shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-500">
                            <ShoppingCart size={32} />
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em]">Purchase</p>
                            <h1 className="text-5xl font-black text-slate-900 tracking-tighter">New Purchase</h1>
                            <p className="text-sm font-bold text-slate-500 pt-1">Manage your fabric purchases.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => dispatch(fetchFabricPurchases({ page: currentPage, search: searchQuery }))}
                            className="btn btn-secondary px-8 py-4 rounded-2xl flex items-center gap-3 group border-none bg-slate-100 hover:bg-slate-200 transition-all"
                        >
                            <Zap size={20} className="text-emerald-500 group-hover:animate-pulse" />
                            <span className="font-black uppercase tracking-widest text-[11px] text-slate-700">Refresh Data</span>
                        </button>
                        <button
                            onClick={() => setShowModal(true)}
                            className="btn btn-primary px-8 py-4 rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 border-none bg-emerald-600 text-white"
                        >
                            <Plus size={20} strokeWidth={3} />
                            <span className="font-black uppercase tracking-widest text-[11px]">New Purchase</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="glass-card p-8 group hover:shadow-glow-blue border-none">
                    <div className="flex items-start justify-between mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500">
                            <IndianRupee size={24} />
                        </div>
                        <div className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded-lg uppercase tracking-widest">Invoiced</div>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Procurement</p>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(metrics.totalValue)}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-4">{entries?.length || 0} Invoices</p>
                </div>

                <div className="glass-card p-8 group hover:shadow-glow-blue border-none border-l-4 border-amber-500">
                    <div className="flex items-start justify-between mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:bg-amber-600 group-hover:text-white transition-all duration-500">
                            <Package size={24} />
                        </div>
                        <div className="px-2 py-1 bg-amber-100 text-amber-700 text-[9px] font-black rounded-lg uppercase tracking-widest">Weight</div>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Net Weight</p>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{metrics.totalWeight.toFixed(2)} <span className="text-xs text-slate-400 uppercase">Kg</span></h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-4">Consolidated Stock Inflow</p>
                </div>

                <div className="glass-card p-8 group hover:shadow-glow-blue border-none border-l-4 border-indigo-500">
                    <div className="flex items-start justify-between mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                            <CheckCircle2 size={24} />
                        </div>
                        <div className="px-2 py-1 bg-indigo-100 text-indigo-700 text-[9px] font-black rounded-lg uppercase tracking-widest">Units</div>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Rolls</p>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{metrics.totalRolls} <span className="text-xs text-slate-400 uppercase">Units</span></h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-4">Fabric Bundles Received</p>
                </div>

                <div className="glass-card p-8 group hover:shadow-glow-blue border-none">
                    <div className="flex items-start justify-between mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                            <FileText size={24} />
                        </div>
                        <div className="px-2 py-1 bg-slate-100 text-slate-600 text-[9px] font-black rounded-lg uppercase tracking-widest">Average</div>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Avg Invoice Value</p>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(metrics.avgBill)}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-4">Procurement Efficiency</p>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card p-10 border-none relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-emerald-500 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="flex flex-col lg:flex-row lg:items-end gap-8">
                    <div className="flex-1 space-y-3">
                        <label className="form-label">Search</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search by Invoice #, Supplier, or Fabric..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="form-input pl-12 py-4 bg-slate-50/50 border-slate-100 hover:bg-white transition-all font-bold w-full"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleSearch}
                            disabled={isLoading}
                            className="px-10 py-4 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-3 group hover:bg-emerald-600 transition-all active:scale-95 shadow-xl shadow-slate-900/10 hover:shadow-emerald-500/20"
                        >
                            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={18} className="group-hover:scale-110 transition-transform" />}
                            Search
                        </button>
                    </div>
                </div>
            </div>

            {/* Purchase List Table */}
            <div className="glass-card p-0 border-none overflow-hidden">
                <div className="p-8 pb-4 flex items-center justify-between">
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Purchases</h3>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Purchase List</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100/50">
                        <span className="text-[11px] font-black uppercase tracking-widest">{pagination?.total || 0} Records</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                                <th className="px-8 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Invoice #</th>
                                <th className="px-8 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Supplier</th>
                                <th className="px-8 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Weight (Kg)</th>
                                <th className="px-8 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Amount</th>
                                <th className="px-8 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="w-12 h-12 border-4 border-slate-100 border-t-emerald-600 rounded-full animate-spin" />
                                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Loading Purchases...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : !entries || entries.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-32 text-center">
                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-dashed border-slate-200">
                                            <ShoppingCart size={32} className="text-slate-300" />
                                        </div>
                                        <h4 className="text-lg font-black text-slate-900 tracking-tight mb-1">No Fabric Records</h4>
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Start by adding your first fabric purchase.</p>
                                    </td>
                                </tr>
                            ) : (
                                entries.map((entry, index) => (
                                    <tr key={entry._id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center shadow-sm group-hover:border-emerald-200 transition-all">
                                                    <span className="text-[10px] font-black text-slate-500 leading-none uppercase">{new Date(entry.invoice_date).toLocaleString('default', { month: 'short' })}</span>
                                                    <span className="text-xl font-black text-slate-900 leading-none mt-1">{new Date(entry.invoice_date).getDate()}</span>
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-500">{new Date(entry.invoice_date).getFullYear()}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-900 tracking-tight uppercase group-hover:text-emerald-700 transition-colors">{entry.invoice_number}</span>
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Rolls: {entry.total_rolls}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-black text-xs shadow-lg ${avatarBg[index % avatarBg.length]}`}>
                                                    {entry.supplier_name?.charAt(0) || 'V'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-900 tracking-tight">{entry.supplier_name}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">{entry.gstin || 'No GSTIN'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-base font-black text-slate-900 tracking-tighter">{entry.total_weight.toFixed(2)} Kg</span>
                                                <span className="text-[9px] text-amber-600 font-black uppercase tracking-widest">Fabric Weight</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-base font-black text-slate-900 tracking-tighter">{formatCurrency(entry.total_amount)}</span>
                                                <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest">Total Invoice</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                    onClick={() => handleViewEntry(entry)}
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                    onClick={() => handleEdit(entry)}
                                                    title="Edit Record"
                                                >
                                                    <Edit size={18} />
                                                </button>
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
                        Page <span className="text-slate-900 font-black">{pagination?.page || 1}</span> of <span className="text-slate-900 font-black">{pagination?.pages || 1}</span>
                    </p>
                    {pagination?.pages > 1 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => p - 1)}
                                disabled={currentPage <= 1}
                                className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all flex items-center justify-center"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => p + 1)}
                                disabled={currentPage >= (pagination?.pages || 1)}
                                className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all flex items-center justify-center"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* High-Performance Recording Modal */}
            {showModal && createPortal(
                <div className="modal-overlay" onClick={() => !isSubmitting && setShowModal(false)}>
                    <div className="modal-content max-w-7xl w-[95vw] lg:w-full border-none shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-emerald-50/30">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                    <ShoppingCart size={32} />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">New Fabric Purchase</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Active Entry Session</span>
                                    </div>
                                </div>
                        </div>
                        <button className="w-12 h-12 rounded-2xl hover:bg-white hover:shadow-sm text-slate-400 hover:text-slate-900 transition-all flex items-center justify-center" onClick={() => setShowModal(false)}><X size={24} /></button>
                    </div>

                        <div className="p-10 space-y-12 max-h-[80vh] overflow-y-auto custom-scrollbar bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                <div className="space-y-2 md:col-span-2">
                                    <label className="form-label text-[11px] font-black text-slate-500 uppercase tracking-widest">Supplier Name *</label>
                                    <input
                                        type="text"
                                        name="supplier_name"
                                        className="form-input py-4 px-6 font-black text-lg bg-slate-50 border-none shadow-inner rounded-2xl w-full"
                                        placeholder="Enter Supplier Name"
                                        value={formData.supplier_name}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="form-label text-[11px] font-black text-slate-500 uppercase tracking-widest">Invoice Number *</label>
                                    <input
                                        type="text"
                                        name="invoice_number"
                                        className="form-input py-4 px-6 font-mono font-black uppercase tracking-widest bg-slate-50 border-none shadow-inner rounded-2xl w-full"
                                        placeholder="INV/2024/001"
                                        value={formData.invoice_number}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="form-label text-[11px] font-black text-slate-500 uppercase tracking-widest">Invoice Date</label>
                                    <input
                                        type="date"
                                        name="invoice_date"
                                        className="form-input py-4 px-6 font-black bg-slate-50 border-none shadow-inner rounded-2xl w-full"
                                        value={formData.invoice_date}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="form-label text-[11px] font-black text-slate-500 uppercase tracking-widest">GSTIN</label>
                                    <input
                                        type="text"
                                        name="gstin"
                                        className="form-input py-4 px-6 font-black bg-slate-50 border-none shadow-inner rounded-2xl w-full"
                                        placeholder="33XXXXXXXXXXXXX"
                                        value={formData.gstin}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="form-label text-[11px] font-black text-slate-500 uppercase tracking-widest">Mobile Number</label>
                                    <input
                                        type="text"
                                        name="mobile"
                                        className="form-input py-4 px-6 font-black bg-slate-50 border-none shadow-inner rounded-2xl w-full"
                                        placeholder="10-digit mobile"
                                        value={formData.mobile}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="form-label text-[11px] font-black text-slate-500 uppercase tracking-widest">Transport</label>
                                    <input
                                        type="text"
                                        name="transport"
                                        className="form-input py-4 px-6 font-black bg-slate-50 border-none shadow-inner rounded-2xl w-full"
                                        placeholder="Transport Name"
                                        value={formData.transport}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Fabric Items (Weight-Based)</h4>
                                    <button onClick={addItem} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/10">
                                        <Plus size={14} strokeWidth={3} /> Add Fabric Roll
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <AnimatePresence>
                                        {formData.items.map((item, index) => (
                                            <motion.div 
                                                key={index}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className="grid grid-cols-12 gap-4 items-center p-6 rounded-3xl bg-slate-50 border border-slate-100 group hover:border-emerald-200 hover:bg-white hover:shadow-2xl transition-all"
                                            >
                                                <div className="col-span-12 md:col-span-3">
                                                    <label className="text-[11px] font-black text-slate-500 uppercase mb-2 block">Fabric Name *</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Cotton Single Jersey"
                                                        className="w-full bg-white border border-slate-200 rounded-xl py-4 px-5 font-black text-slate-900 outline-none focus:border-emerald-500 transition-all"
                                                        value={item.fabric_name}
                                                        onChange={(e) => handleItemChange(index, 'fabric_name', e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-6 md:col-span-2">
                                                    <label className="text-[11px] font-black text-slate-500 uppercase mb-2 block text-center">Color / GSM</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Color"
                                                            className="w-1/2 bg-white border border-slate-200 rounded-xl py-4 px-3 text-center font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all"
                                                            value={item.color}
                                                            onChange={(e) => handleItemChange(index, 'color', e.target.value)}
                                                        />
                                                        <input
                                                            type="number"
                                                            placeholder="GSM"
                                                            className="w-1/2 bg-white border border-slate-200 rounded-xl py-4 px-3 text-center font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all"
                                                            value={item.gsm}
                                                            onChange={(e) => handleItemChange(index, 'gsm', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-span-6 md:col-span-2">
                                                    <label className="text-[11px] font-black text-slate-500 uppercase mb-2 block text-center">Roll No / Wt (Kg) *</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Roll #"
                                                            className="w-1/2 bg-white border border-slate-200 rounded-xl py-4 px-3 text-center font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all"
                                                            value={item.roll_no}
                                                            onChange={(e) => handleItemChange(index, 'roll_no', e.target.value)}
                                                        />
                                                        <input
                                                            type="number"
                                                            placeholder="Kg"
                                                            className="w-1/2 bg-white border border-slate-200 rounded-xl py-4 px-3 text-center font-black text-emerald-700 outline-none focus:border-emerald-500 transition-all"
                                                            value={item.weight_kg}
                                                            onChange={(e) => handleItemChange(index, 'weight_kg', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-span-8 md:col-span-2">
                                                    <label className="text-[11px] font-black text-slate-500 uppercase mb-2 block text-right">Rate / Kg *</label>
                                                    <input
                                                        type="number"
                                                        className="w-full bg-white border border-slate-200 rounded-xl py-4 px-5 text-right font-black text-slate-900 outline-none focus:border-emerald-500 transition-all"
                                                        value={item.rate_per_kg}
                                                        onChange={(e) => handleItemChange(index, 'rate_per_kg', e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-3 md:col-span-2">
                                                    <label className="text-[11px] font-black text-slate-500 uppercase mb-2 block text-right">Amount</label>
                                                    <div className="py-4 text-right font-black text-slate-900 text-lg tracking-tight">
                                                        {formatCurrency((parseFloat(item.weight_kg) || 0) * (parseFloat(item.rate_per_kg) || 0))}
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
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-10 border-t border-slate-100">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">Vehicle Number</label>
                                            <input
                                                type="text"
                                                name="vehicle_number"
                                                className="form-input py-4 px-6 font-black bg-slate-50 border-none shadow-inner rounded-2xl w-full"
                                                placeholder="TN-XX-XXXX"
                                                value={formData.vehicle_number}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">LR Number</label>
                                            <input
                                                type="text"
                                                name="lr_number"
                                                className="form-input py-4 px-6 font-black bg-slate-50 border-none shadow-inner rounded-2xl w-full"
                                                placeholder="LR/123456"
                                                value={formData.lr_number}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </div>
                                    <div className="p-8 bg-indigo-50/50 rounded-4xl border border-indigo-100/50">
                                        <div className="flex items-center gap-3 mb-4">
                                            <ShieldCheck className="text-indigo-600" size={20} />
                                            <h5 className="text-[11px] font-black text-indigo-900 uppercase tracking-widest">Note</h5>
                                        </div>
                                        <p className="text-[10px] font-bold text-indigo-700 leading-relaxed uppercase">All fabric entries are automatically synced with inventory. Weights are recorded in Kilograms (Kg) for precision billing.</p>
                                    </div>
                                </div>

                                <div className="bg-slate-900 rounded-4xl p-12 text-white relative overflow-hidden shadow-2xl shadow-slate-900/40 flex flex-col justify-between border border-white/5">
                                    <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-400/5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
                                    
                                    <div className="relative z-10 space-y-8">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <h4 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.4em]">Summary</h4>
                                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em]">Automatic Calculation</p>
                                            </div>
                                            <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                                                <Package size={16} className="text-emerald-400" />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-400 text-[11px] font-black uppercase tracking-widest">Total Weight</span>
                                                <span className="font-black text-xl tracking-tight text-amber-400">
                                                    {formData.items.reduce((sum, item) => sum + (parseFloat(item.weight_kg) || 0), 0).toFixed(2)} Kg
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-400 text-[11px] font-black uppercase tracking-widest">Total Rolls</span>
                                                <span className="font-black text-xl tracking-tight">
                                                    {formData.items.length} Units
                                                </span>
                                            </div>
                                            <div className="h-px bg-white/10" />
                                            <div className="space-y-2">
                                                <span className="text-emerald-500 text-[11px] font-black uppercase tracking-[0.3em]">Estimated Total</span>
                                                <div className="text-6xl font-black tracking-tighter text-white drop-shadow-2xl">
                                                    {formatCurrency(formData.items.reduce((sum, item) => sum + (parseFloat(item.weight_kg) || 0) * (parseFloat(item.rate_per_kg) || 0), 0))}
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
                </div>,
                document.body
            )}

            {/* Authoritative View Modal */}
            {showViewModal && selectedEntry && createPortal(
                <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
                    <div className="modal-content max-w-6xl w-[95vw] lg:w-full border-none shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-2xl shadow-emerald-500/5">
                                    <FileText size={32} />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black tracking-tighter">Fabric Invoice</h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="px-3 py-1 bg-white/5 rounded-lg text-[11px] font-black uppercase tracking-widest text-slate-300 border border-white/5">INV #: {selectedEntry.invoice_number}</span>
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Verified Procurement</span>
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
                                        billNumber: selectedEntry.invoice_number,
                                        date: selectedEntry.invoice_date,
                                        billType: 'PURCHASE',
                                        customer: {
                                            name: selectedEntry.supplier_name,
                                            gstin: selectedEntry.gstin,
                                            mobile: selectedEntry.mobile,
                                            address: selectedEntry.address || ''
                                        },
                                        items: selectedEntry.items?.map(item => ({
                                            ...item,
                                            productName: item.fabric_name,
                                            hsnCode: '',
                                            designColor: `${item.color || ''} ${item.gsm ? `(${item.gsm} GSM)` : ''}`,
                                            weightKg: item.weight_kg,
                                            ratePerKg: item.rate_per_kg,
                                            total: item.amount
                                        })),
                                        subtotal: selectedEntry.total_amount,
                                        totalTax: 0,
                                        grandTotal: selectedEntry.total_amount,
                                        totalPacks: selectedEntry.total_rolls,
                                        fromText: selectedEntry.transport
                                    }}
                                    settings={resolvedSettings}
                                />
                            </div>
                        </div>
                        <div className="px-10 py-8 bg-white border-t border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <ShieldCheck size={20} className="text-emerald-500" />
                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Verified Stock Record</span>
                            </div>
                            <button 
                                onClick={() => setShowViewModal(false)} 
                                className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-emerald-600 transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98]"
                            >
                                Close View
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default PurchaseEntryPage;
