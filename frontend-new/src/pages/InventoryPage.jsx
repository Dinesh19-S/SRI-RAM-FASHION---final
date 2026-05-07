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
        try {
            await dispatch(updateProductStock({ id: selectedProduct._id, data: { type: stockType, quantity: stockQuantity, reason: stockReason } })).unwrap();
            toast.success(`Stock ${stockType === 'in' ? 'added' : 'removed'} successfully`);
            setShowStockModal(false);
            setSelectedProduct(null);
            setStockQuantity(1);
            setStockReason('');
        } catch (error) {
            toast.error('Failed to update stock: ' + (error || 'Unknown error'));
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
        setIsDeleting(true);
        try {
            await dispatch(deleteProduct(productToDelete._id)).unwrap();
            setShowDeleteConfirm(false);
            setProductToDelete(null);
        } catch (error) {
            toast.error('Failed to delete product: ' + (error || 'Unknown error'));
        } finally {
            setIsDeleting(false);
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
        <div className="space-y-10 animate-fade-in p-2">
            {/* Professional Header */}
            <div className="page-header-shell bg-white/40 backdrop-blur-md border border-white/40 shadow-xl shadow-slate-200/20 rounded-3xl p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-5">
                        <div className="w-16 h-16 rounded-3xl bg-linear-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <Package size={28} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Inventory</p>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Stock Room</h1>
                            <p className="text-sm font-bold text-slate-500 pt-1">Manage your product stock.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            className="btn btn-secondary px-6 py-4 rounded-2xl hover:bg-slate-100 transition-all flex items-center gap-2 group" 
                            onClick={() => setShowCategoryModal(true)}
                        >
                            <FolderPlus size={18} className="group-hover:scale-110 transition-transform" />
                            <span className="font-bold tracking-tight">Product Groups</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Inventory Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Product Types', value: stats.totalProducts, note: 'Different items', icon: Package, color: 'blue' },
                    { label: 'Total Stock', value: stats.totalStock.toLocaleString(), note: 'Current count', icon: Box, color: 'emerald' },
                    { label: 'Low Stock', value: stats.lowStock, note: 'Low stock alert', icon: AlertTriangle, color: 'red' },
                    { label: 'Stock value', value: formatCurrency(stats.inventoryValue), note: 'Total value of stock', icon: TrendingUp, color: 'indigo' }
                ].map((item, i) => (
                    <div key={i} className="glass-card p-8 border-none group hover:translate-y-[-4px] transition-all duration-500">
                        <div className="flex items-start justify-between mb-6">
                            <div className={`w-14 h-14 rounded-2xl bg-${item.color}-50 text-${item.color}-600 flex items-center justify-center border border-${item.color}-100 shadow-sm group-hover:scale-110 transition-transform`}>
                                <item.icon size={24} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{item.value}</h2>
                            <p className="text-xs font-bold text-slate-500 pt-1">{item.note}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Visualization Section */}
            {products.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 glass-card p-8 border-none flex flex-col">
                        <div className="space-y-1 mb-8">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Stock by Group</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Items by group</p>
                        </div>
                        <div className="w-full relative" style={{ height: '250px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="name" 
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
                                            backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                                            borderRadius: '16px', 
                                            border: 'none', 
                                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                                            padding: '12px'
                                        }}
                                    />
                                    <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    
                    <div className="glass-card p-8 border-none">
                        <div className="space-y-1 mb-8">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Group Summary</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Stock split</p>
                        </div>
                        <div className="w-full relative" style={{ height: '250px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={categoryData.filter(c => c.value > 0)} 
                                        cx="50%" 
                                        cy="50%" 
                                        innerRadius={65} 
                                        outerRadius={85} 
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} cornerRadius={4} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 space-y-2">
                            {categoryData.slice(0, 4).map((c, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                        <span className="text-xs font-bold text-slate-600">{c.name}</span>
                                    </div>
                                    <span className="text-xs font-black text-slate-900">{c.value} Pieces</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Search & Filters */}
            <div className="glass-card p-8 border-none">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            className="form-input pl-12 py-4 bg-slate-50 border-none shadow-inner rounded-2xl" 
                            placeholder="Search by name, SKU, or HSN..." 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                        />
                    </div>
                    <div className="w-full md:w-72">
                        <div className="relative">
                            <FolderPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select 
                                className="form-select pl-11 py-4 bg-slate-50 border-none shadow-inner rounded-2xl appearance-none" 
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
            <div className="glass-card p-0 border-none overflow-hidden">
                <div className="p-8 pb-4 flex items-center justify-between">
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">All Items</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Stock details</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading inventory...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="py-32 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-dashed border-slate-200">
                            <Box size={32} className="text-slate-300" />
                        </div>
                        <h4 className="text-lg font-black text-slate-900 tracking-tight mb-1">No Products Found</h4>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Price</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Left</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredProducts.map(p => (
                                        <tr key={p._id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                                                        <Box size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 tracking-tight">{p.name}</p>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.sku}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                                                    {p.category?.name || 'Unassigned'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-sm font-black text-slate-900">{formatCurrency(p.sellingPrice)}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rate / Unit</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                        p.stock <= (p.lowStockThreshold || 5) ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                    }`}>
                                                        {p.stock} Pieces
                                                    </span>
                                                    {p.stock <= (p.lowStockThreshold || 5) && (
                                                        <span className="text-[9px] font-black text-red-400 uppercase tracking-widest flex items-center gap-1">
                                                            <AlertTriangle size={10} /> Low Stock
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex justify-end gap-3">
                                                    <button
                                                        className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                        onClick={() => { setSelectedProduct(p); setStockType('in'); setShowStockModal(true); }}
                                                    >
                                                        <ArrowUpCircle size={18} />
                                                    </button>
                                                    <button
                                                        className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                        onClick={() => { setSelectedProduct(p); setStockType('out'); setShowStockModal(true); }}
                                                    >
                                                        <ArrowDownCircle size={18} />
                                                    </button>
                                                    <button
                                                        className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                        onClick={() => handleDeleteClick(p)}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Professional Pagination */}
                        {pagination && pagination.pages > 1 && (
                            <div className="px-8 py-6 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Showing <span className="text-slate-900 font-black">{(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-slate-900 font-black">{pagination.total}</span> Products
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all flex items-center justify-center"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    
                                    <div className="flex items-center gap-1">
                                        {[...Array(pagination.pages)].map((_, i) => {
                                            const pageNum = i + 1;
                                            const isActive = page === pageNum;
                                            if (pageNum === 1 || pageNum === pagination.pages || (pageNum >= page - 1 && pageNum <= page + 1)) {
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                                        onClick={() => setPage(pageNum)}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            } else if (pageNum === page - 2 || pageNum === page + 2) {
                                                return <span key={pageNum} className="w-8 text-center text-slate-300 font-black">...</span>;
                                            }
                                            return null;
                                        })}
                                    </div>

                                    <button
                                        className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all flex items-center justify-center"
                                        onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                                        disabled={page === pagination.pages}
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Stock Update Form */}
            {showStockModal && selectedProduct && (
                <div className="modal-overlay bg-slate-900/60 p-4" onClick={() => setShowStockModal(false)}>
                    <div className="modal-content max-w-md border-none animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className={`p-8 border-b flex items-center justify-between ${stockType === 'in' ? 'bg-emerald-50/50' : 'bg-amber-50/50'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stockType === 'in' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'} shadow-lg shadow-emerald-500/10`}>
                                    {stockType === 'in' ? <ArrowUpCircle size={28} /> : <ArrowDownCircle size={28} />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Stock Update</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add or remove stock</p>
                                </div>
                            </div>
                            <button className="action-btn hover:bg-white transition-all" onClick={() => setShowStockModal(false)}><X size={24} /></button>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-black text-slate-900">{selectedProduct.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedProduct.sku}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current</p>
                                    <span className="px-3 py-1 rounded-full bg-white text-slate-900 font-black text-xs shadow-sm">
                                        {selectedProduct.stock} Pieces
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="form-label">Quantity</label>
                                    <input
                                        type="number"
                                        className="form-input text-lg font-black"
                                        min="1"
                                        value={stockQuantity}
                                        onChange={(e) => setStockQuantity(Number(e.target.value))}
                                    />
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pt-1">
                                        New Total: <span className="text-blue-600">{stockType === 'in' ? selectedProduct.stock + stockQuantity : Math.max(0, selectedProduct.stock - stockQuantity)} Pieces</span>
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <label className="form-label">Why?</label>
                                    <select
                                        className="form-select font-bold"
                                        value={stockReason}
                                        onChange={(e) => setStockReason(e.target.value)}
                                    >
                                        <option value="">Select Reason</option>
                                        {stockType === 'in' ? (
                                            <>
                                                <option value="purchase">Bought new stock</option>
                                                <option value="return">Customer returned item</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="sale">Sold item</option>
                                                <option value="damage">Item damaged</option>
                                            </>
                                        )}
                                        <option value="adjustment">Manual update</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                                    stockType === 'in' ? 'bg-emerald-500 shadow-emerald-500/20 hover:bg-emerald-400' : 'bg-amber-500 shadow-amber-500/20 hover:bg-amber-400'
                                }`}
                                onClick={handleStockUpdate}
                                disabled={!stockQuantity || !stockReason}
                            >
                                <Plus size={18} />
                                Update Stock
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Form Modal */}
            {showCategoryModal && (
                <div className="modal-overlay bg-slate-900/60 p-4" onClick={() => setShowCategoryModal(false)}>
                    <div className="modal-content max-w-md border-none animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="p-8 border-b flex items-center justify-between bg-indigo-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/10">
                                    <FolderPlus size={28} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">New Category</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add a new product category</p>
                                </div>
                            </div>
                            <button className="action-btn hover:bg-white" onClick={() => setShowCategoryModal(false)}><X size={24} /></button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="form-label">Category Name *</label>
                                <input
                                    type="text"
                                    className="form-input font-bold"
                                    placeholder="Enter category name"
                                    value={newCategory.name}
                                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="form-label">Category Description</label>
                                <textarea
                                    className="form-input font-bold min-h-[120px]"
                                    placeholder="Short description of the category"
                                    value={newCategory.description}
                                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                                />
                            </div>
                            <button
                                className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                                onClick={handleAddCategory}
                                disabled={isSubmitting}
                            >
                                <FolderPlus size={18} />
                                {isSubmitting ? 'Saving...' : 'Save Category'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Product Modal */}
            {showDeleteConfirm && productToDelete && (
                <div className="modal-overlay bg-slate-900/60 p-4" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="modal-content max-w-sm border-none animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="p-10 text-center">
                            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-100 shadow-lg shadow-red-500/5">
                                <Trash2 size={40} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-3">Delete Product?</h3>
                            <p className="text-sm font-bold text-slate-500 mb-10 leading-relaxed uppercase tracking-widest text-[10px]">
                                This will permanently delete <span className="text-red-500">{productToDelete.name}</span> from the inventory. This action cannot be undone.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <button className="btn btn-secondary py-4 rounded-xl font-black uppercase tracking-widest text-[10px]" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                                <button className="btn bg-red-500 text-white hover:bg-red-600 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-500/20 transition-all active:scale-95" onClick={handleDeleteProduct} disabled={isDeleting}>
                                    {isDeleting ? 'Deleting...' : 'Delete'}
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
