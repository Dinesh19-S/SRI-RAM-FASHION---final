import { useState, useEffect } from 'react';
import { Package, Plus, Search, Edit, Trash2, X, Save, FolderPlus, Tag, Layers, IndianRupee, Info, ShieldCheck, ChevronLeft, ChevronRight, Archive, Box, TrendingUp, BarChart3, Filter } from 'lucide-react';
import { productsAPI, categoriesAPI, clearAPICache } from '../services/api';
import { useToast } from '../components/common';

const categoryColors = [
    'bg-blue-50 text-blue-600 border-blue-100',
    'bg-purple-50 text-purple-600 border-purple-100',
    'bg-emerald-50 text-emerald-600 border-emerald-100',
    'bg-amber-50 text-amber-600 border-amber-100',
    'bg-rose-50 text-rose-600 border-rose-100',
    'bg-indigo-50 text-indigo-600 border-indigo-100'
];

const ItemsPage = () => {
    const toast = useToast();
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchName, setSearchName] = useState('');
    const [searchHSN, setSearchHSN] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
    const [newCategory, setNewCategory] = useState({ name: '', description: '' });
    const [refreshKey, setRefreshKey] = useState(0);

    const [formData, setFormData] = useState({
        name: '',
        category: '',
        size: '',
        costPrice: '',
        sellingPrice: '',
        stock: '',
        lowStockThreshold: '5',
        hsn: '',
        gstRate: '5',
        description: ''
    });

    useEffect(() => {
        fetchItems();
        fetchCategories();
    }, [pagination.page, pagination.limit, refreshKey]);

    const fetchItems = async () => {
        setIsLoading(true);
        try {
            const searchQuery = [searchName, searchHSN].filter(Boolean).join(' ');
            const response = await productsAPI.getAll({
                search: searchQuery,
                page: pagination.page,
                limit: pagination.limit
            });
            setItems(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                total: response.data.pagination?.total || 0,
                pages: response.data.pagination?.pages || 0
            }));
        } catch (error) {
            console.error('Error fetching items:', error);
            toast.error('Failed to load products.');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await categoriesAPI.getAll();
            setCategories(response.data.data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const handleSearch = () => {
        clearAPICache();
        setPagination(prev => ({ ...prev, page: 1 }));
        setRefreshKey(prev => prev + 1);
        toast.info('Search completed');
    };

    const handleCategoryChange = (e) => {
        const value = e.target.value;
        if (value === '__add_new__') {
            setShowCategoryModal(true);
        } else {
            setFormData(prev => ({ ...prev, category: value }));
        }
    };

    const handleAddCategory = async () => {
        if (!newCategory.name.trim()) {
            toast.warning('Please enter a name.');
            return;
        }
        try {
            const response = await categoriesAPI.create({
                name: newCategory.name.trim(),
                description: newCategory.description.trim()
            });
            const createdCategory = response.data.data;
            setCategories(prev => [...prev, createdCategory]);
            setFormData(prev => ({ ...prev, category: createdCategory._id }));
            setShowCategoryModal(false);
            setNewCategory({ name: '', description: '' });
            toast.success('Category saved successfully');
        } catch (error) {
            toast.error('Failed to create category');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({
            name: '',
            category: '',
            size: '',
            costPrice: '',
            sellingPrice: '',
            stock: '',
            lowStockThreshold: '5',
            hsn: '',
            gstRate: '5',
            description: ''
        });
        setIsEditing(false);
        setSelectedItem(null);
    };

    const handleOpenModal = (item = null) => {
        if (item) {
            const categoryValue =
                item.category?._id ||
                item.category?.id ||
                (typeof item.category === 'string' ? item.category : '');
            setFormData({
                name: item.name || '',
                category: categoryValue,
                size: item.size || '',
                costPrice: item.costPrice?.toString() || '',
                sellingPrice: item.sellingPrice?.toString() || '',
                stock: item.stock?.toString() || '',
                lowStockThreshold: item.lowStockThreshold?.toString() || '5',
                hsn: item.hsn || '',
                gstRate: item.gstRate?.toString() || '5',
                description: item.description || ''
            });
            setSelectedItem(item);
            setIsEditing(true);
        } else {
            resetForm();
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.category || !formData.sellingPrice || !formData.stock) {
            toast.warning('Please fill all required fields.');
            return;
        }

        const selectedCategory =
            categories.find((c) => (c._id || c.id) === formData.category) ||
            categories.find((c) => c.name?.toLowerCase() === String(formData.category).toLowerCase());
        const resolvedCategoryId = selectedCategory?._id || selectedCategory?.id || '';

        if (!resolvedCategoryId) {
            toast.error('Please select a category.');
            return;
        }

        setIsSubmitting(true);
        try {
            const productData = {
                name: formData.name,
                sku: formData.hsn || formData.name.substring(0, 3).toUpperCase() + Date.now().toString().slice(-4),
                category: resolvedCategoryId,
                size: formData.size,
                costPrice: Number(formData.costPrice) || 0,
                mrp: Number(formData.sellingPrice),
                sellingPrice: Number(formData.sellingPrice),
                stock: Number(formData.stock),
                lowStockThreshold: Number(formData.lowStockThreshold) || 5,
                hsn: formData.hsn,
                gstRate: Number(formData.gstRate) || 5,
                description: formData.description
            };

            if (isEditing && selectedItem) {
                await productsAPI.update(selectedItem._id, productData);
                toast.success('Product updated successfully');
            } else {
                await productsAPI.create(productData);
                toast.success('New product saved successfully');
            }
            setShowModal(false);
            resetForm();
            clearAPICache();
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            toast.error('Failed to save product.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (item) => {
        setSelectedItem(item);
        setShowDeleteConfirm(true);
    };

    const handleDelete = async () => {
        try {
            await productsAPI.delete(selectedItem._id);
            toast.success('Product deleted successfully');
            setShowDeleteConfirm(false);
            setSelectedItem(null);
            clearAPICache();
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            toast.error('Failed to delete product.');
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.pages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    const handleLimitChange = (newLimit) => {
        setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
    };

    const formatCurrency = (a) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(a);

    const getStockStatus = (item) => {
        if (item.stock <= 0) return { label: 'OUT OF STOCK', class: 'bg-red-50 text-red-600 border-red-100' };
        if (item.stock <= (item.lowStockThreshold || 5)) return { label: 'LOW STOCK', class: 'bg-amber-50 text-amber-600 border-amber-100' };
        return { label: 'IN STOCK', class: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
    };

    return (
        <div className="space-y-10 animate-fade-in p-2 pb-20">
            {/* Header */}
            <div className="page-header-shell bg-white/60 backdrop-blur-2xl border border-white/50 shadow-premium rounded-[2.5rem] p-10 relative overflow-hidden group text-left">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-start gap-6">
                        <div className="w-20 h-20 rounded-4xl bg-linear-to-br from-indigo-600 to-slate-800 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-500">
                            <Layers size={32} />
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em]">Items</p>
                            <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Items</h1>
                            <p className="text-sm font-bold text-slate-500 pt-1">Manage your product list and stock.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => handleOpenModal()}
                            className="h-16 px-8 rounded-2xl flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-slate-900/20 transition-all hover:scale-105 active:scale-95"
                        >
                            <Plus size={20} strokeWidth={3} />
                            New Item
                        </button>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="glass-card p-10 border-none shadow-premium relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                    <div className="md:col-span-2 space-y-3 group/input">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Name</label>
                        <div className="relative">
                            <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-indigo-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search inventory..."
                                className="w-full pl-16 pr-8 py-5 bg-slate-50/50 border-none focus:ring-4 focus:ring-indigo-500/5 rounded-3xl font-bold text-slate-900 placeholder:text-slate-400 transition-all"
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                    </div>
                    <div className="space-y-3 group/input">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">HSN Code</label>
                        <div className="relative">
                            <Tag size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-indigo-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="HSN Code"
                                className="w-full pl-16 pr-8 py-5 bg-slate-50/50 border-none focus:ring-4 focus:ring-indigo-500/5 rounded-3xl font-black text-slate-900 placeholder:text-slate-400 transition-all uppercase tracking-widest"
                                value={searchHSN}
                                onChange={(e) => setSearchHSN(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                    </div>
                    <div className="flex gap-4 items-end">
                        <button
                            onClick={handleSearch}
                            disabled={isLoading}
                            className="h-16 flex-1 px-8 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 group hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/10"
                        >
                            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={18} className="group-hover:scale-110 transition-transform" />}
                            Search
                        </button>
                        <button
                            onClick={() => { setSearchName(''); setSearchHSN(''); clearAPICache(); setRefreshKey(prev => prev + 1); }}
                            className="h-16 w-16 rounded-2xl bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all flex items-center justify-center group"
                        >
                            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Item List */}
            <div className="page-table-card animate-slide-up border-none shadow-premium overflow-hidden rounded-[2.5rem] bg-white/40 backdrop-blur-3xl">
                <div className="p-10 flex items-center justify-between border-b border-slate-100/50">
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter text-left">Item List</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-left">View all items</p>
                    </div>
                    <div className="px-5 py-2.5 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-100/50 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                        <span className="text-[11px] font-black uppercase tracking-widest">{pagination.total} Items</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="page-table w-full border-separate border-spacing-y-2 px-10">
                        <thead>
                            <tr className="text-left">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">HSN & Tax</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Price</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-0">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-6">
                                            <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Loading Items...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-32 text-center">
                                        <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-slate-100 shadow-inner">
                                            <Archive size={40} className="text-slate-200" />
                                        </div>
                                        <h4 className="text-xl font-black text-slate-900 tracking-tight mb-2">No Items Found</h4>
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest max-w-xs mx-auto">Add a new item to get started.</p>
                                    </td>
                                </tr>
                            ) : (
                                items.map((item, index) => {
                                    const status = getStockStatus(item);
                                    return (
                                        <tr key={item._id} className="group bg-white/50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/20 transition-all duration-300">
                                            <td className="px-8 py-6 rounded-l-4xl">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-14 h-14 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:rotate-3 transition-all duration-300 border border-slate-100 shadow-sm">
                                                        <Box size={24} />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-base font-black text-slate-900 tracking-tight uppercase leading-none">{item.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">Size Specification: <span className="text-slate-900">{item.size || 'N/A'}</span></p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors ${categoryColors[index % categoryColors.length]}`}>
                                                    {item.category?.name || 'GENERIC'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-1.5 text-left">
                                                    <span className="text-xs font-black font-mono text-slate-900 tracking-widest uppercase">{item.hsn || 'HSN-PENDING'}</span>
                                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md w-fit">{item.gstRate}% TAX RATE</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-2 text-left">
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-base font-black text-slate-900 tracking-tighter">{item.stock}</span>
                                                        <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{item.unit || 'UNITS'}</span>
                                                    </div>
                                                    <span className={`text-[9px] px-3 py-1 rounded-lg font-black uppercase tracking-widest border w-fit shadow-xs ${status.class}`}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col text-left">
                                                    <span className="text-base font-black text-indigo-600 tracking-tighter">{formatCurrency(item.sellingPrice || 0)}</span>
                                                    {item.costPrice > 0 && <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Procurement: {formatCurrency(item.costPrice)}</span>}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 rounded-r-4xl text-right">
                                                <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                    <button
                                                        className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                        onClick={() => handleOpenModal(item)}
                                                        title="Edit Item"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                        onClick={() => handleDeleteClick(item)}
                                                        title="Delete Item"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Professional Pagination Shell */}
                {pagination.pages > 1 && (
                    <div className="px-10 py-10 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-8 border-t border-slate-100/50">
                        <div className="flex items-center gap-8">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                Showing <span className="text-slate-900">{(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-slate-900">{pagination.total}</span> Items
                            </p>
                            <div className="h-10 w-px bg-slate-200 hidden md:block" />
                            <div className="flex items-center p-1.5 bg-white/50 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-inner">
                                {[10, 25, 50].map(limit => (
                                    <button
                                        key={limit}
                                        onClick={() => handleLimitChange(limit)}
                                        className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${pagination.limit === limit ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {limit}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page <= 1}
                                    className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 disabled:opacity-30 transition-all flex items-center justify-center shadow-sm"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <div className="flex items-center gap-2">
                                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                                        const pageNum = Math.max(1, pagination.page - 2) + i;
                                        if (pageNum > pagination.pages) return null;
                                        const isActive = pagination.page === pageNum;
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => handlePageChange(pageNum)}
                                                className={`w-12 h-12 rounded-2xl text-[11px] font-black transition-all ${isActive ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 scale-110' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm'}`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.pages}
                                    className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 disabled:opacity-30 transition-all flex items-center justify-center shadow-sm"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Product Details Modal */}
            {showModal && (
                <div className="modal-overlay bg-slate-900/60 p-4" onClick={() => !isSubmitting && setShowModal(false)}>
                    <div className="modal-content max-w-4xl border-none animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="p-10 border-b flex items-center justify-between bg-linear-to-br from-indigo-700 to-indigo-900 text-white rounded-t-4xl">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/10 backdrop-blur-md">
                                    <Package size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black tracking-tighter">
                                        {isEditing ? 'Edit Product' : 'New Product'}
                                    </h3>
                                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.4em] mt-1">Product Details</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all border border-white/10"><X size={24} /></button>
                        </div>

                        <div className="p-10 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar bg-slate-50/30">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        className="form-input text-lg font-black bg-white shadow-sm py-4 border-slate-100 rounded-2xl"
                                        placeholder="Enter product name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">HSN Code</label>
                                    <input
                                        type="text"
                                        name="hsn"
                                        className="form-input font-mono font-black text-indigo-600 bg-white shadow-sm py-4 border-slate-100 rounded-2xl"
                                        placeholder="Enter HSN"
                                        value={formData.hsn}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            {/* Categorization */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category *</label>
                                    <select
                                        name="category"
                                        className="form-select font-black text-xs uppercase tracking-widest bg-white shadow-sm py-4 border-slate-100 rounded-2xl"
                                        value={formData.category}
                                        onChange={handleCategoryChange}
                                    >
                                        <option value="">Select category</option>
                                        {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        <option value="__add_new__" className="text-indigo-600 font-black">+ ADD NEW CATEGORY</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Size</label>
                                    <input
                                        type="text"
                                        name="size"
                                        className="form-input font-black uppercase tracking-widest text-xs bg-white shadow-sm py-4 border-slate-100 rounded-2xl"
                                        placeholder="S, M, L, XL, XXL"
                                        value={formData.size}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GST Rate (%)</label>
                                    <select
                                        name="gstRate"
                                        className="form-select font-black text-xs bg-white shadow-sm py-4 border-slate-100 rounded-2xl"
                                        value={formData.gstRate}
                                        onChange={handleInputChange}
                                    >
                                        <option value="0">0% - Exempt</option>
                                        <option value="5">5% - Essential</option>
                                        <option value="12">12% - General</option>
                                        <option value="18">18% - Standard</option>
                                        <option value="28">28% - Luxury</option>
                                    </select>
                                </div>
                            </div>

                            {/* Pricing */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="bg-white/60 p-8 rounded-4xl border border-indigo-50 shadow-sm space-y-6">
                                    <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-[0.3em] flex items-center gap-3">
                                        <TrendingUp size={16} /> Pricing
                                    </h4>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cost Price</label>
                                            <input
                                                type="number"
                                                name="costPrice"
                                                className="form-input bg-slate-50 border-none shadow-inner font-black py-4 rounded-xl"
                                                placeholder="0.00"
                                                value={formData.costPrice}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-indigo-600">MRP / Selling Price *</label>
                                            <input
                                                type="number"
                                                name="sellingPrice"
                                                className="form-input bg-white border-2 border-indigo-200 shadow-xl shadow-indigo-500/5 font-black py-4 rounded-xl text-lg text-indigo-700"
                                                placeholder="0.00"
                                                value={formData.sellingPrice}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/60 p-8 rounded-4xl border border-emerald-50 shadow-sm space-y-6">
                                    <h4 className="text-[10px] font-black text-emerald-900 uppercase tracking-[0.3em] flex items-center gap-3">
                                        <BarChart3 size={16} /> Stock Details
                                    </h4>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{isEditing ? 'Current Stock' : 'Starting Stock *'}</label>
                                            <input
                                                type="number"
                                                name="stock"
                                                className="form-input bg-slate-50 border-none shadow-inner font-black py-4 rounded-xl"
                                                placeholder="0"
                                                value={formData.stock}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Alert at</label>
                                            <input
                                                type="number"
                                                name="lowStockThreshold"
                                                className="form-input bg-white border-2 border-emerald-200 font-black py-4 rounded-xl"
                                                placeholder="5"
                                                value={formData.lowStockThreshold}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Info size={14} /> Product Description
                                </label>
                                <textarea
                                    name="description"
                                    className="form-input font-bold py-6 min-h-[100px] bg-white border-slate-100 rounded-3xl"
                                    placeholder="About this item..."
                                    value={formData.description}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className="px-10 py-8 bg-white flex items-center justify-between border-t border-slate-100 rounded-b-4xl">
                            <div className="flex items-center gap-3 text-emerald-500">
                                <ShieldCheck size={18} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Data Protected</span>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="btn px-10 py-4 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px] border-none transition-all"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="btn px-12 py-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-600/20 transition-all active:scale-95 border-none flex items-center gap-3"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : <Save size={18} />}
                                    {isSubmitting ? 'Saving...' : 'Save Product'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Product Modal */}
            {showDeleteConfirm && selectedItem && (
                <div className="modal-overlay bg-slate-900/60 p-4" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="modal-content max-w-sm border-none animate-scale-up" onClick={(e) => e.stopPropagation()}>
                        <div className="p-12 text-center">
                            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-100 shadow-xl shadow-red-500/5">
                                <Trash2 size={44} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-3">Delete Product?</h3>
                            <p className="text-sm font-bold text-slate-500 mb-10 leading-relaxed uppercase tracking-widest text-[10px]">
                                You are about to delete <span className="text-red-500 font-black">{selectedItem.name}</span> from the system. This action is permanent.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border-none"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="btn bg-red-600 text-white hover:bg-red-700 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-red-600/20 transition-all active:scale-95 border-none"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Form Modal */}
            {showCategoryModal && (
                <div className="modal-overlay bg-slate-900/60 p-4" onClick={() => !isSubmitting && setShowCategoryModal(false)}>
                    <div className="modal-content max-w-md border-none animate-scale-up" onClick={(e) => e.stopPropagation()}>
                        <div className="p-8 flex items-center gap-4 bg-slate-900 text-white rounded-t-3xl">
                            <FolderPlus size={24} className="text-indigo-400" />
                            <h3 className="text-lg font-black uppercase tracking-widest">New Category</h3>
                        </div>
                        <div className="p-8 space-y-6 bg-white">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category Name *</label>
                                <input
                                    type="text"
                                    className="form-input font-bold py-4 rounded-xl bg-slate-50 border-none shadow-inner"
                                    placeholder="e.g. Shirts, Pants, etc."
                                    value={newCategory.name}
                                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category Description</label>
                                <textarea
                                    className="form-input font-bold py-4 rounded-xl bg-slate-50 border-none shadow-inner min-h-[100px]"
                                    placeholder="Group description..."
                                    value={newCategory.description}
                                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 p-8 bg-slate-50 border-t border-slate-100 rounded-b-3xl">
                            <button
                                className="btn bg-white text-slate-400 hover:text-slate-600 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] border border-slate-200"
                                onClick={() => { setShowCategoryModal(false); setNewCategory({ name: '', description: '' }); }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn bg-slate-900 text-white hover:bg-black px-10 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] border-none shadow-lg transition-all active:scale-95"
                                onClick={handleAddCategory}
                            >
                                Save Category
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ItemsPage;
