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

    const stats = useMemo(() => ({
        totalProducts: pagination?.total || products.length,
        totalStock: products.reduce((s, p) => s + (p.stock || 0), 0),
        lowStock: products.filter(p => p.stock <= (p.lowStockThreshold || 5)).length,
        inventoryValue: products.reduce((s, p) => s + ((p.stock || 0) * (p.sellingPrice || 0)), 0)
    }), [pagination?.total, products]);

    const categoryData = useMemo(() => categories.slice(0, 5).map(c => ({
        name: c.name,
        value: products
            .filter(p => p.category?._id === c._id || p.category === c._id)
            .reduce((s, p) => s + (p.stock || 0), 0)
    })), [categories, products]);
    
    const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
    const formatCurrency = (a) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(a);

    const filteredProducts = products;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="page-header-shell">
                <div className="flex items-start gap-4">
                    <div className="page-icon-badge">
                        <Package size={20} />
                    </div>
                    <div className="page-header-copy">
                        <p className="page-header-kicker">Live stock and movement control</p>
                        <h1 className="page-header-title">Inventory</h1>
                    </div>
                </div>
                <div className="page-header-toolbar">
                    <button className="btn btn-secondary" onClick={() => setShowCategoryModal(true)}>
                        <FolderPlus size={16} />
                        Add Category
                    </button>
                </div>
            </div>

            <div className="metric-grid">
                <div className="metric-card">
                    <div className="metric-card-header">
                        <div className="metric-card-copy">
                            <p className="metric-card-label">Total Products</p>
                            <p className="metric-card-value">{stats.totalProducts}</p>
                            <p className="metric-card-note">Current page</p>
                        </div>
                        <div className="metric-card-icon">
                            <Package size={22} />
                        </div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-card-header">
                        <div className="metric-card-copy">
                            <p className="metric-card-label">Page Stock</p>
                            <p className="metric-card-value">{stats.totalStock.toLocaleString()}</p>
                            <p className="metric-card-note">Units available</p>
                        </div>
                        <div className="metric-card-icon">
                            <Box size={22} />
                        </div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-card-header">
                        <div className="metric-card-copy">
                            <p className="metric-card-label">Low Stock</p>
                            <p className="metric-card-value">{stats.lowStock}</p>
                            <p className="metric-card-note">Needs attention</p>
                        </div>
                        <div className="metric-card-icon">
                            <AlertTriangle size={22} />
                        </div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-card-header">
                        <div className="metric-card-copy">
                            <p className="metric-card-label">Inventory Value</p>
                            <p className="metric-card-value">{formatCurrency(stats.inventoryValue)}</p>
                            <p className="metric-card-note">Current page</p>
                        </div>
                        <div className="metric-card-icon">
                            <TrendingUp size={22} />
                        </div>
                    </div>
                </div>
            </div>

            {products.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 card">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock by Category (Current Page)</h3>
                        <ResponsiveContainer width="100%" height={200}><BarChart data={categoryData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
                    </div>
                    <div className="card">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribution</h3>
                        <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={categoryData.filter(c => c.value > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value">{categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
                    </div>
                </div>
            )}

            <div className="page-filter-card">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[240px]">
                        <label className="form-label">Search</label>
                        <div className="page-search">
                            <Search size={18} className="page-search-icon" />
                            <input type="text" className="form-input pl-10" placeholder="Search product name or SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                    </div>
                    <div className="w-52">
                        <label className="form-label">Category</label>
                        <select className="form-input" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}><option value="all">All Categories</option>{categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
                    </div>
                </div>
            </div>

            <div className="page-table-card">
                {isLoading ? (
                    <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#3b82f6', borderTopColor: 'transparent' }} /></div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500"><Package size={48} className="mx-auto mb-2 opacity-50" /><p>No products found</p></div>
                ) : (
                    <>
                        <table className="page-table">
                            <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Stock</th><th>Price</th><th>Status</th><th className="text-right">Stock Actions</th></tr></thead>
                            <tbody>
                                {filteredProducts.map(p => (
                                    <tr key={p._id}>
                                        <td className="font-medium">{p.name}</td><td className="text-gray-500">{p.sku}</td><td>{p.category?.name || 'N/A'}</td><td className="font-semibold">{p.stock}</td><td>{formatCurrency(p.sellingPrice)}</td>
                                        <td>
                                            <span className={`badge ${p.stock <= (p.lowStockThreshold || 5) ? 'badge-error' : 'badge-success'}`}>
                                                {p.stock <= (p.lowStockThreshold || 5) ? 'Low' : 'In Stock'} • {p.stock}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    className="action-btn action-btn-green"
                                                    onClick={() => { setSelectedProduct(p); setStockType('in'); setShowStockModal(true); }}
                                                    title="Stock In"
                                                >
                                                    <ArrowUpCircle size={18} />
                                                </button>
                                                <button
                                                    className="action-btn action-btn-amber"
                                                    onClick={() => { setSelectedProduct(p); setStockType('out'); setShowStockModal(true); }}
                                                    title="Stock Out"
                                                >
                                                    <ArrowDownCircle size={18} />
                                                </button>
                                                <button
                                                    className="action-btn action-btn-red"
                                                    onClick={() => handleDeleteClick(p)}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {/* Pagination Controls */}
                        {pagination && pagination.pages > 1 && (
                            <div className="page-pagination">
                                <p className="text-sm text-gray-600">
                                    Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> products
                                </p>
                                <div className="page-pagination-group">
                                    <button
                                        className="page-pagination-btn"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    {[...Array(pagination.pages)].map((_, i) => {
                                        const pageNum = i + 1;
                                        // Simple pagination: show current, first, last, and neighbors
                                        if (
                                            pageNum === 1 ||
                                            pageNum === pagination.pages ||
                                            (pageNum >= page - 1 && pageNum <= page + 1)
                                        ) {
                                            return (
                                                <button
                                                    key={pageNum}
                                                    className={`page-pagination-btn ${page === pageNum ? 'is-active' : ''}`}
                                                    onClick={() => setPage(pageNum)}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        } else if (
                                            pageNum === page - 2 ||
                                            pageNum === page + 2
                                        ) {
                                            return <span key={pageNum} className="flex items-center justify-center w-8">...</span>;
                                        }
                                        return null;
                                    })}
                                    <button
                                        className="page-pagination-btn"
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

            {/* Stock Update Modal */}
            {showStockModal && selectedProduct && (
                <div className="modal-overlay" onClick={() => setShowStockModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        {/* Colored Header */}
                        <div
                            className="px-6 py-5 flex items-center justify-between"
                            style={{
                                background: stockType === 'in'
                                    ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                                    : 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)'
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    {stockType === 'in'
                                        ? <ArrowUpCircle size={22} className="text-white" />
                                        : <ArrowDownCircle size={22} className="text-white" />
                                    }
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">{stockType === 'in' ? 'Stock In' : 'Stock Out'}</h3>
                                    <p className="text-xs text-white/70">Update inventory quantity</p>
                                </div>
                            </div>
                            <button
                                className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                                onClick={() => setShowStockModal(false)}
                            >
                                <X size={18} className="text-white" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-5">
                            {/* Product Info */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div>
                                    <p className="font-semibold text-gray-900 text-base">{selectedProduct.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">SKU: {selectedProduct.sku || 'N/A'}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-medium text-gray-500 block">Current Stock</span>
                                    <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-bold ${selectedProduct.stock <= (selectedProduct.lowStockThreshold || 5)
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-green-100 text-green-700'
                                        }`}>
                                        {selectedProduct.stock}
                                    </span>
                                </div>
                            </div>

                            {/* Quantity */}
                            <div>
                                <label className="form-label">Quantity</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    min="1"
                                    value={stockQuantity}
                                    onChange={(e) => setStockQuantity(Number(e.target.value))}
                                    placeholder="Enter quantity"
                                />
                                {stockQuantity > 0 && (
                                    <p className="text-xs mt-1.5 text-gray-500">
                                        New stock will be: <span className="font-semibold text-gray-800">
                                            {stockType === 'in'
                                                ? selectedProduct.stock + stockQuantity
                                                : Math.max(0, selectedProduct.stock - stockQuantity)
                                            }
                                        </span>
                                    </p>
                                )}
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="form-label">Reason</label>
                                <select
                                    className="form-input"
                                    value={stockReason}
                                    onChange={(e) => setStockReason(e.target.value)}
                                >
                                    <option value="">Select reason</option>
                                    {stockType === 'in' ? (
                                        <>
                                            <option value="purchase">Purchase</option>
                                            <option value="return">Customer Return</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="sale">Sale</option>
                                            <option value="damage">Damaged / Defective</option>
                                        </>
                                    )}
                                    <option value="adjustment">Manual Adjustment</option>
                                </select>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
                            <button className="btn btn-secondary" onClick={() => setShowStockModal(false)}>Cancel</button>
                            <button
                                className="btn text-white font-semibold"
                                style={{
                                    background: stockType === 'in'
                                        ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                                        : 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                                    boxShadow: stockType === 'in'
                                        ? '0 4px 14px rgba(5, 150, 105, 0.4)'
                                        : '0 4px 14px rgba(234, 88, 12, 0.4)'
                                }}
                                onClick={handleStockUpdate}
                                disabled={!stockQuantity || !stockReason}
                            >
                                {stockType === 'in' ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                                Update Stock
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Category Modal */}
            {showCategoryModal && (
                <div className="modal-overlay" onClick={() => { setShowCategoryModal(false); setNewCategory({ name: '', description: '' }); }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 rounded-t-2xl" style={{ backgroundColor: '#1e3a5f' }}>
                            <h3 className="text-lg font-semibold text-white">Add New Category</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="form-label">Category Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter category name"
                                    value={newCategory.name}
                                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="form-label">Description</label>
                                <textarea
                                    className="form-input"
                                    rows="3"
                                    placeholder="Category description (optional)"
                                    value={newCategory.description}
                                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-2xl">
                            <button className="btn btn-secondary" onClick={() => { setShowCategoryModal(false); setNewCategory({ name: '', description: '' }); }}>Cancel</button>
                            <button
                                className="btn btn-primary flex items-center gap-2"
                                onClick={handleAddCategory}
                                disabled={isSubmitting}
                            >
                                <Plus size={18} />
                                {isSubmitting ? 'Adding...' : 'Add Category'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && productToDelete && (
                <div className="modal-overlay" onClick={() => { setShowDeleteConfirm(false); setProductToDelete(null); }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} className="text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Product</h3>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to delete <strong>{productToDelete.name}</strong>? This action cannot be undone.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => { setShowDeleteConfirm(false); setProductToDelete(null); }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn bg-red-600 text-white hover:bg-red-700"
                                    onClick={handleDeleteProduct}
                                    disabled={isDeleting}
                                >
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
