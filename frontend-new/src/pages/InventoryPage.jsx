import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts, fetchCategories, updateProductStock, createCategory, deleteProduct } from '../store/slices/productsSlice';
import { Package, Plus, Search, ArrowUpCircle, ArrowDownCircle, AlertTriangle, Box, TrendingUp, X, FolderPlus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '../components/common';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const InventoryPage = () => {
    const toast = useToast();
    const dispatch = useDispatch();
    const { items: products, categories, pagination, isLoading } = useSelector((state) => state.products);

    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [page, setPage] = useState(1);
    const [showStockModal, setShowStockModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [stockType, setStockType] = useState('in');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [stockQuantity, setStockQuantity] = useState(1);
    const [stockReason, setStockReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // New category form state
    const [newCategory, setNewCategory] = useState({
        name: '',
        description: ''
    });

    useEffect(() => {
        dispatch(fetchCategories());
    }, [dispatch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            dispatch(fetchProducts({
                page,
                limit: 10,
                search: searchQuery,
                category: filterCategory === 'all' ? undefined : filterCategory
            }));
        }, 300);
        return () => clearTimeout(timer);
    }, [dispatch, page, searchQuery, filterCategory]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [searchQuery, filterCategory]);

    const handleStockUpdate = async () => {
        if (!selectedProduct || !stockQuantity || !stockReason) return;
        
        // Optimistic close and toast
        setShowStockModal(false);
        const actionType = stockType === 'in' ? 'added' : 'removed';
        toast.info(`Updating stock for ${selectedProduct.name}...`);

        try {
            await dispatch(updateProductStock({ 
                id: selectedProduct._id, 
                data: { type: stockType, quantity: stockQuantity, reason: stockReason } 
            })).unwrap();
            
            toast.success(`Stock ${actionType} successfully`);
            setSelectedProduct(null);
            setStockQuantity(1);
            setStockReason('');
        } catch (error) {
            toast.error('Failed to update stock: ' + (error || 'Unknown error'));
            // Re-fetch to sync if failed
            dispatch(fetchProducts({ page, limit: 10 }));
        }
    };

    const handleAddCategory = async () => {
        if (!newCategory.name.trim()) {
            toast.warning('Please enter a category name');
            return;
        }

        setIsSubmitting(true);
        try {
            await dispatch(createCategory({
                name: newCategory.name.trim(),
                description: newCategory.description.trim()
            })).unwrap();

            setShowCategoryModal(false);
            setNewCategory({ name: '', description: '' });
            dispatch(fetchCategories());
        } catch (error) {
            toast.error('Failed to add category: ' + (error || 'Unknown error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (product) => {
        setProductToDelete(product);
        setShowDeleteConfirm(true);
    };

    const handleDeleteProduct = async () => {
        if (!productToDelete) return;
        
        const productName = productToDelete.name;
        setShowDeleteConfirm(false);
        toast.info(`Deleting ${productName}...`);

        try {
            await dispatch(deleteProduct(productToDelete._id)).unwrap();
            toast.success(`${productName} deleted`);
            setProductToDelete(null);
        } catch (error) {
            toast.error('Failed to delete product: ' + (error || 'Unknown error'));
            // Re-fetch to sync
            dispatch(fetchProducts({ page, limit: 10 }));
        }
    };

    const stats = useMemo(() => {
        const items = Array.isArray(products) ? products : [];
        return {
            totalProducts: pagination?.total || items.length,
            totalStock: items.reduce((s, p) => s + (Number(p.stock) || 0), 0),
            lowStock: items.filter(p => (Number(p.stock) || 0) <= (Number(p.lowStockThreshold) || 5)).length,
            inventoryValue: items.reduce((s, p) => s + ((Number(p.stock) || 0) * (Number(p.sellingPrice) || 0)), 0)
        };
    }, [pagination?.total, products]);

    const categoryData = useMemo(() => {
        const items = Array.isArray(products) ? products : [];
        const cats = Array.isArray(categories) ? categories : [];
        return cats.slice(0, 5).map(c => ({
            name: c.name,
            value: items
                .filter(p => {
                    const pCatId = p.category?._id || p.category?.id || p.category_id || p.category;
                    return pCatId === c._id || pCatId === c.id;
                })
                .reduce((s, p) => s + (Number(p.stock) || 0), 0)
        }));
    }, [categories, products]);
    
    const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
    const formatCurrency = (a) => {
        const val = Number(a) || 0;
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    };

    const filteredProducts = products;

    return (
        <div className="space-y-10 animate-fade-in p-2 pb-20">
            {/* Header */}
            <div className="page-header-shell bg-white/60 backdrop-blur-2xl border border-white/50 shadow-premium rounded-[2.5rem] p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-start gap-6">
                        <div className="w-20 h-20 rounded-4xl bg-linear-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-500">
                            <Package size={32} />
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em]">Inventory</p>
                            <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Stock</h1>
                            <p className="text-sm font-bold text-slate-500 pt-1">Track your products and stock levels here.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            className="btn btn-secondary px-8 py-4 rounded-2xl flex items-center gap-3 group border-none bg-slate-100 hover:bg-slate-200 transition-all" 
                            onClick={() => setShowCategoryModal(true)}
                        >
                            <FolderPlus size={20} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                            <span className="font-black uppercase tracking-widest text-[11px] text-slate-700">Manage Categories</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                    { label: 'Total Products', value: stats.totalProducts, note: 'Unique items', icon: Package, color: 'blue' },
                    { label: 'Total Stock', value: stats.totalStock.toLocaleString(), note: 'Total pieces', icon: Box, color: 'emerald' },
                    { label: 'Low Stock', value: stats.lowStock, note: 'Items below threshold', icon: AlertTriangle, color: 'red' },
                    { label: 'Total Value', value: formatCurrency(stats.inventoryValue), note: 'Stock worth', icon: TrendingUp, color: 'indigo' }
                ].map((item, i) => (
                    <div key={i} className="glass-card p-8 group hover:shadow-glow-blue border-none">
                        <div className="flex items-start justify-between mb-6">
                            <div className={`w-14 h-14 rounded-2xl bg-${item.color}-50 text-${item.color}-600 flex items-center justify-center border border-${item.color}-100 shadow-sm group-hover:scale-110 transition-all duration-500`}>
                                <item.icon size={24} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{item.label}</p>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{item.value}</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-2">{item.note}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            {products.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 glass-card p-10 border-none flex flex-col group hover:shadow-premium transition-all duration-500">
                        <div className="flex items-center justify-between mb-10">
                            <div className="space-y-1">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Stock Distribution</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Stock by Category</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <TrendingUp size={20} />
                            </div>
                        </div>
                        <div className="w-full relative" style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} 
                                        dy={15}
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }}
                                    />
                                    <Tooltip 
                                        cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }}
                                        contentStyle={{ 
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                            borderRadius: '20px', 
                                            border: '1px solid rgba(255, 255, 255, 0.5)', 
                                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                                            padding: '16px',
                                            backdropFilter: 'blur(10px)'
                                        }}
                                        itemStyle={{ fontSize: '12px', fontWeight: '900', color: '#1e293b' }}
                                    />
                                    <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={45} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    
                    <div className="glass-card p-10 border-none group hover:shadow-premium transition-all duration-500">
                        <div className="space-y-1 mb-10">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Market Share</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Group Concentration</p>
                        </div>
                        <div className="w-full relative" style={{ height: '280px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={categoryData.filter(c => c.value > 0)} 
                                        cx="50%" 
                                        cy="50%" 
                                        innerRadius={75} 
                                        outerRadius={100} 
                                        paddingAngle={8}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} cornerRadius={8} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-8 space-y-4">
                            {categoryData.slice(0, 4).map((c, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{c.name}</span>
                                    </div>
                                    <span className="text-xs font-black text-slate-900 tracking-tighter">{c.value} Pcs</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Search & Filters */}
            <div className="glass-card p-10 border-none relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="flex flex-col lg:flex-row lg:items-end gap-8">
                    <div className="flex-1 space-y-3">
                        <label className="form-label">Search</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                className="form-input pl-12 py-4 bg-slate-50/50 border-slate-100 hover:bg-white transition-all font-bold w-full" 
                                placeholder="Search by name, SKU, or HSN..." 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                            />
                        </div>
                    </div>
                    <div className="w-full lg:w-72 space-y-3">
                        <label className="form-label">Category</label>
                        <div className="relative">
                            <FolderPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <select 
                                className="form-select pl-12 py-4 bg-slate-50/50 border-slate-100 hover:bg-white transition-all appearance-none" 
                                value={filterCategory} 
                                onChange={(e) => setFilterCategory(e.target.value)}
                            >
                                <option value="all">All Categories</option>
                                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="page-table-card">
                <div className="p-10 pb-6 flex items-center justify-between">
                    <div className="space-y-1">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Inventory</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Stock List</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100/50">
                        <span className="text-[10px] font-black uppercase tracking-widest">{pagination?.total || 0} Items</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="page-table">
                        <thead>
                            <tr>
                                <th className="px-10 py-5">Product</th>
                                <th className="px-10 py-5">Category</th>
                                <th className="px-10 py-5">Price</th>
                                <th className="px-10 py-5">Stock</th>
                                <th className="px-10 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-10 py-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Inventory...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-10 py-32 text-center">
                                        <div className="w-24 h-24 bg-slate-50 rounded-4xl flex items-center justify-center mx-auto mb-8 border border-dashed border-slate-200">
                                            <Box size={40} className="text-slate-300" />
                                        </div>
                                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter mb-2">No Products Found</h4>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Try searching for something else.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map(p => (
                                    <tr key={p._id} className="group">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:border-indigo-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all duration-500 shadow-sm">
                                                    <Box size={24} />
                                                </div>
                                                <div>
                                                    <p className="text-base font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">{p.name}</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{p.sku}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest border border-slate-200/50">
                                                {p.category?.name || 'Unassigned'}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="space-y-1">
                                                <p className="text-lg font-black text-slate-900 tracking-tighter">{formatCurrency(p.sellingPrice)}</p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">MSRP / Piece</p>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-4">
                                                <div className="space-y-1">
                                                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                                                        p.stock <= (p.lowStockThreshold || 5) ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                    }`}>
                                                        {p.stock} Units Left
                                                    </span>
                                                    {p.stock <= (p.lowStockThreshold || 5) && (
                                                        <div className="flex items-center gap-2 pt-2 animate-pulse">
                                                            <AlertTriangle size={12} className="text-red-500" />
                                                            <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Restock Required</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex justify-end gap-3 opacity-70 group-hover:opacity-100 transition-all duration-300">
                                                <button
                                                    className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                    onClick={() => { setSelectedProduct(p); setStockType('in'); setShowStockModal(true); }}
                                                    title="Add Stock"
                                                >
                                                    <ArrowUpCircle size={20} />
                                                </button>
                                                <button
                                                    className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                    onClick={() => { setSelectedProduct(p); setStockType('out'); setShowStockModal(true); }}
                                                    title="Remove Stock"
                                                >
                                                    <ArrowDownCircle size={20} />
                                                </button>
                                                <button
                                                    className="w-11 h-11 rounded-2xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                    onClick={() => handleDeleteClick(p)}
                                                    title="Delete Item"
                                                >
                                                    <Trash2 size={20} />
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
                {pagination && pagination.pages > 1 && (
                    <div className="page-pagination p-10 bg-slate-50/50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Showing <span className="text-slate-900 font-black">{(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)}</span> / <span className="text-slate-900 font-black">{pagination.total}</span> Items
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                className="action-btn bg-white border border-slate-200 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 disabled:opacity-30 shadow-sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <ChevronLeft size={20} />
                            </button>
                            
                            <div className="flex items-center gap-2">
                                {[...Array(pagination.pages)].map((_, i) => {
                                    const pageNum = i + 1;
                                    const isActive = page === pageNum;
                                    if (pageNum === 1 || pageNum === pagination.pages || (pageNum >= page - 1 && pageNum <= page + 1)) {
                                        return (
                                            <button
                                                key={pageNum}
                                                className={`w-11 h-11 rounded-2xl text-[11px] font-black transition-all ${isActive ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 border-none' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'}`}
                                                onClick={() => setPage(pageNum)}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    } else if (pageNum === page - 2 || pageNum === page + 2) {
                                        return <span key={pageNum} className="w-6 text-center text-slate-300 font-black">...</span>;
                                    }
                                    return null;
                                })}
                            </div>

                            <button
                                className="action-btn bg-white border border-slate-200 text-slate-600 hover:border-indigo-500 hover:text-indigo-600 disabled:opacity-30 shadow-sm"
                                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                                disabled={page === pagination.pages}
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Stock Update Form */}
            {showStockModal && selectedProduct && (
                <div className="modal-overlay" onClick={() => setShowStockModal(false)}>
                    <div className="modal-content max-w-lg border-none shadow-3xl" onClick={(e) => e.stopPropagation()}>
                        <div className={`px-10 py-10 border-b border-slate-100 flex items-center justify-between ${stockType === 'in' ? 'bg-emerald-50/30' : 'bg-amber-50/30'}`}>
                            <div className="flex items-center gap-6">
                                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-white ${stockType === 'in' ? 'bg-emerald-600' : 'bg-amber-600'} shadow-2xl shadow-current/20`}>
                                    {stockType === 'in' ? <ArrowUpCircle size={32} /> : <ArrowDownCircle size={32} />}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Update Stock</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Adjust Stock Levels</p>
                                </div>
                            </div>
                            <button className="w-12 h-12 rounded-2xl hover:bg-white text-slate-400 hover:text-slate-900 transition-all flex items-center justify-center" onClick={() => setShowStockModal(false)}><X size={24} /></button>
                        </div>

                        <div className="p-10 space-y-10">
                            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-premium transition-all duration-500">
                                <div className="space-y-1">
                                    <p className="text-lg font-black text-slate-900 tracking-tight">{selectedProduct.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{selectedProduct.sku}</p>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Stock</p>
                                    <span className="text-xl font-black text-slate-900 tracking-tighter">
                                        {selectedProduct.stock} Pcs
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="form-label">Quantity</label>
                                    <input
                                        type="number"
                                        className="form-input text-2xl font-black py-5 px-8 text-center"
                                        min="1"
                                        value={stockQuantity}
                                        onChange={(e) => setStockQuantity(Number(e.target.value))}
                                    />
                                    <div className="flex items-center justify-center gap-2 pt-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                            Forecasted Total: <span className="text-slate-900 font-black">{stockType === 'in' ? selectedProduct.stock + stockQuantity : Math.max(0, selectedProduct.stock - stockQuantity)} Units</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="form-label">Reason</label>
                                    <select
                                        className="form-select font-black py-5 px-8 appearance-none"
                                        value={stockReason}
                                        onChange={(e) => setStockReason(e.target.value)}
                                    >
                                        <option value="">Select Reason</option>
                                        {stockType === 'in' ? (
                                            <>
                                                <option value="purchase">Purchase</option>
                                                <option value="return">Customer Return</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="sale">Sale</option>
                                                <option value="damage">Damaged</option>
                                            </>
                                        )}
                                        <option value="adjustment">Internal Audit</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                className={`w-full py-7 rounded-3xl font-black uppercase tracking-[0.2em] text-xs text-white shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-4 ${
                                    stockType === 'in' ? 'bg-emerald-600 shadow-emerald-500/20 hover:bg-emerald-500' : 'bg-amber-600 shadow-amber-500/20 hover:bg-amber-500'
                                }`}
                                onClick={handleStockUpdate}
                                disabled={!stockQuantity || !stockReason}
                            >
                                <CheckCircle2 size={20} />
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Form Modal */}
            {showCategoryModal && (
                <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
                    <div className="modal-content max-w-xl border-none shadow-3xl" onClick={(e) => e.stopPropagation()}>
                        <div className="px-10 py-10 border-b border-slate-100 flex items-center justify-between bg-indigo-50/30">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-3xl bg-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-500/20">
                                    <FolderPlus size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Add Category</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Create New Category</p>
                                </div>
                            </div>
                            <button className="w-12 h-12 rounded-2xl hover:bg-white text-slate-400 hover:text-slate-900 transition-all flex items-center justify-center" onClick={() => setShowCategoryModal(false)}><X size={24} /></button>
                        </div>

                        <div className="p-10 space-y-10">
                            <div className="space-y-3">
                                <label className="form-label">Category Name *</label>
                                <input
                                    type="text"
                                    className="form-input font-black py-5 px-8"
                                    placeholder="e.g. Premium Silk Collection"
                                    value={newCategory.name}
                                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="form-label">Description</label>
                                <textarea
                                    className="form-input font-bold min-h-[150px] py-5 px-8 resize-none"
                                    placeholder="Define the scope of this product group..."
                                    value={newCategory.description}
                                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                                />
                            </div>
                            <button
                                className="w-full py-7 bg-slate-900 hover:bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-slate-900/10 transition-all active:scale-[0.98] flex items-center justify-center gap-4"
                                onClick={handleAddCategory}
                                disabled={isSubmitting}
                            >
                                <FolderPlus size={20} />
                                {isSubmitting ? 'Saving...' : 'Add Category'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Product Modal */}
            {showDeleteConfirm && productToDelete && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="modal-content max-w-md border-none shadow-3xl bg-white" onClick={(e) => e.stopPropagation()}>
                        <div className="p-12 text-center">
                            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 border border-red-100 shadow-2xl shadow-red-500/10">
                                <Trash2 size={44} />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">Delete Product?</h3>
                            <p className="text-[11px] font-black text-slate-400 mb-12 leading-relaxed uppercase tracking-[0.2em] px-4">
                                You are about to permanently delete <span className="text-red-500">{productToDelete.name}</span> from the inventory. This action cannot be undone.
                            </p>
                            <div className="grid grid-cols-2 gap-6">
                                <button className="btn btn-secondary py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] border-none bg-slate-100 hover:bg-slate-200 transition-all" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                                <button className="btn bg-red-600 text-white hover:bg-red-500 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-red-600/20 transition-all active:scale-95" onClick={handleDeleteProduct} disabled={isDeleting}>
                                    {isDeleting ? 'Deleting...' : 'Delete Product'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryPage;
