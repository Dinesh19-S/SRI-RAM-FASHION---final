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
            {/* Product Header */}
            <div className="page-header-shell bg-white/40 backdrop-blur-md border border-white/40 shadow-xl shadow-slate-200/20 rounded-3xl p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-5">
                        <div className="w-16 h-16 rounded-3xl bg-linear-to-br from-indigo-600 to-slate-800 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <Layers size={28} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em]">Items</p>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Products</h1>
                            <p className="text-sm font-bold text-slate-500 pt-1">Manage your shop items.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleOpenModal()}
                            className="btn bg-indigo-600 text-white hover:bg-indigo-700 px-8 py-4 rounded-2xl flex items-center gap-3 group shadow-xl shadow-indigo-500/20 transition-all active:scale-95 border-none"
                        >
                            <Plus size={20} />
                            <span className="font-black uppercase tracking-widest text-[11px]">New Item</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="glass-card p-8 border-none">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    <div className="md:col-span-2 space-y-2">
                        <label className="form-label">Search by Name</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Enter product name..."
                                className="form-input pl-11 font-bold"
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="form-label">HSN Code</label>
                        <div className="relative">
                            <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="e.g. 6106"
                                className="form-input pl-11 font-black uppercase tracking-widest text-xs"
                                value={searchHSN}
                                onChange={(e) => setSearchHSN(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSearch}
                            disabled={isLoading}
                            className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95"
                        >
                            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={16} />}
                            <span className="font-black">Search</span>
                        </button>
                        <button
                            onClick={() => { setSearchName(''); setSearchHSN(''); clearAPICache(); setRefreshKey(prev => prev + 1); }}
                            className="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Product Table */}
            <div className="glass-card p-0 border-none overflow-hidden">
                <div className="p-8 pb-4 flex items-center justify-between bg-white/40 border-b border-slate-100">
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Active Products</h3>
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest italic">Real-time updates</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Product Name</th>
                                <th className="px-8 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Category</th>
                                <th className="px-8 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">HSN / GST</th>
                                <th className="px-8 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Stock</th>
                                <th className="px-8 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Selling Price</th>
                                <th className="px-8 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
                                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Loading Products...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-dashed border-slate-200">
                                                <Archive size={32} className="text-slate-300" />
                                            </div>
                                            <h4 className="text-lg font-black text-slate-900 tracking-tight">No Products Found</h4>
                                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Add your first product to get started</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                items.map((item, index) => {
                                    const status = getStockStatus(item);
                                    return (
                                        <tr key={item._id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all border border-slate-200 shadow-sm">
                                                        <Box size={22} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 tracking-tight">{item.name}</p>
                                                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Size: {item.size || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-widest border ${categoryColors[index % categoryColors.length]}`}>
                                                    {item.category?.name || 'Unassigned'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-black font-mono text-slate-900">{item.hsn || '-'}</span>
                                                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">{item.gstRate}% GST</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-sm font-black text-slate-900 tracking-tighter">{item.stock} <span className="text-[8px] text-slate-400 uppercase font-bold tracking-widest ml-1">{item.unit || 'PCS'}</span></span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-black uppercase tracking-widest border inline-block w-fit ${status.class}`}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-indigo-600 tracking-tighter">{formatCurrency(item.sellingPrice || 0)}</span>
                                                    {item.costPrice > 0 && <span className="text-[9px] text-slate-400 line-through font-bold">Cost: {formatCurrency(item.costPrice)}</span>}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center shadow-sm border border-blue-100"
                                                        onClick={() => handleOpenModal(item)}
                                                        title="Edit"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm border border-red-100"
                                                        onClick={() => handleDeleteClick(item)}
                                                        title="Remove"
                                                    >
                                                        <Trash2 size={16} />
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

                {/* Professional Pagination */}
                {pagination.pages > 1 && (
                    <div className="px-8 py-6 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-100">
                        <div className="flex items-center gap-6">
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                                Showing <span className="text-slate-900 font-black">{(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-slate-900 font-black">{pagination.total}</span> Products
                            </p>
                            <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
                            <div className="flex items-center gap-2">
                                {[10, 25, 50].map(limit => (
                                    <button
                                        key={limit}
                                        onClick={() => handleLimitChange(limit)}
                                        className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${pagination.limit === limit ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-100'}`}
                                    >
                                        {limit}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page <= 1}
                                className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all flex items-center justify-center"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                                    const pageNum = Math.max(1, pagination.page - 2) + i;
                                    if (pageNum > pagination.pages) return null;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => handlePageChange(pageNum)}
                                            className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${pagination.page === pageNum ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page >= pagination.pages}
                                className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all flex items-center justify-center"
                            >
                                <ChevronRight size={18} />
                            </button>
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
                                <span className="text-[10px] font-black uppercase tracking-widest">Safe Data Transfer</span>
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
