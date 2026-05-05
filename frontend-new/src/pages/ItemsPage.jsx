import { useState, useEffect } from 'react';
import { Package, Plus, Search, Edit, Trash2, X, Save, FolderPlus, Tag, Layers, IndianRupee, Info } from 'lucide-react';
import { productsAPI, categoriesAPI, clearAPICache } from '../services/api';
import { useToast } from '../components/common';

const categoryColors = ['bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-indigo-100 text-indigo-700'];

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
            toast.error('Failed to load items');
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
            toast.warning('Please enter a category name');
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
            toast.success('Category added successfully');
        } catch (error) {
            toast.error('Failed to add category: ' + (error.response?.data?.message || error.message));
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
            toast.warning('Please fill in Name, Category, Price, and Stock');
            return;
        }

        const selectedCategory =
            categories.find((c) => (c._id || c.id) === formData.category) ||
            categories.find((c) => c.name?.toLowerCase() === String(formData.category).toLowerCase());
        const resolvedCategoryId = selectedCategory?._id || selectedCategory?.id || '';

        if (!resolvedCategoryId) {
            toast.error('Please select a valid category');
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
                toast.success('Product added successfully');
            }
            setShowModal(false);
            resetForm();
            clearAPICache();
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            toast.error('Error saving product: ' + (error.response?.data?.message || error.message));
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
            toast.error('Error deleting product: ' + (error.response?.data?.message || error.message));
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
        if (item.stock <= 0) return { label: 'Out of Stock', class: 'bg-red-100 text-red-700' };
        if (item.stock <= (item.lowStockThreshold || 5)) return { label: 'Low Stock', class: 'bg-amber-100 text-amber-700' };
        return { label: 'In Stock', class: 'bg-emerald-100 text-emerald-700' };
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="page-header-shell">
                <div className="flex items-start gap-4">
                    <div className="page-icon-badge">
                        <Package size={20} />
                    </div>
                    <div className="page-header-copy">
                        <p className="page-header-kicker">Manage your product catalog and inventory</p>
                        <h1 className="page-header-title">Items & Products</h1>
                    </div>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => handleOpenModal()}
                >
                    <Plus size={16} />
                    Add Product
                </button>
            </div>

            {/* Filter Area */}
            <div className="page-filter-card">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="shrink-0 w-64">
                        <label className="form-label">Product Name</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Enter item name..."
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="form-input pl-9"
                            />
                        </div>
                    </div>
                    <div className="shrink-0 w-40">
                        <label className="form-label">HSN Code</label>
                        <input
                            type="text"
                            placeholder="e.g. 6106"
                            value={searchHSN}
                            onChange={(e) => setSearchHSN(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="form-input"
                        />
                    </div>

                    <button
                        onClick={handleSearch}
                        disabled={isLoading}
                        className="btn btn-primary"
                    >
                        <Search size={16} />
                        Search
                    </button>
                    <button
                        onClick={() => { setSearchName(''); setSearchHSN(''); clearAPICache(); setRefreshKey(prev => prev + 1); }}
                        className="btn btn-ghost"
                    >
                        <X size={16} />
                        Clear
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="page-table-card">
                <div className="overflow-x-auto">
                    <table className="page-table">
                        <thead>
                            <tr>
                                <th>Product Details</th>
                                <th>Category</th>
                                <th>HSN / GST</th>
                                <th>Stock Info</th>
                                <th>Pricing</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="page-empty-state">
                                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="page-empty-state">
                                        No products found. Start by adding your first product.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item, index) => {
                                    const status = getStockStatus(item);
                                    return (
                                        <tr key={item._id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 shadow-inner">
                                                        <Package size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{item.name}</p>
                                                        <p className="text-xs text-gray-500 font-medium">Size: {item.size || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${categoryColors[index % categoryColors.length]}`}>
                                                    {item.category?.name || 'Uncategorized'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-mono font-bold text-blue-700">{item.hsn || '-'}</span>
                                                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{item.gstRate}% GST</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-bold text-gray-800">{item.stock} <span className="text-[10px] text-gray-400 font-medium uppercase">{item.unit || 'pcs'}</span></span>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tighter inline-block w-fit ${status.class}`}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-900">{formatCurrency(item.sellingPrice || 0)}</span>
                                                    {item.costPrice > 0 && <span className="text-[10px] text-gray-400 line-through">Cost: {formatCurrency(item.costPrice)}</span>}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        className="action-btn action-btn-blue"
                                                        onClick={() => handleOpenModal(item)}
                                                        title="Edit"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        className="action-btn action-btn-red"
                                                        onClick={() => handleDeleteClick(item)}
                                                        title="Delete"
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

                {/* Pagination */}
                {pagination.pages > 0 && (
                    <div className="page-pagination">
                        <div className="page-pagination-group">
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page <= 1}
                                className="page-pagination-btn"
                            >
                                &lt;
                            </button>
                            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                                const pageNum = Math.max(1, pagination.page - 2) + i;
                                if (pageNum > pagination.pages) return null;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => handlePageChange(pageNum)}
                                        className={`page-pagination-btn ${pagination.page === pageNum ? 'is-active' : ''}`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page >= pagination.pages}
                                className="page-pagination-btn"
                            >
                                &gt;
                            </button>
                        </div>
                        <div className="page-pagination-group">
                            {[10, 25, 50, 100].map(limit => (
                                <button
                                    key={limit}
                                    onClick={() => handleLimitChange(limit)}
                                    className={`page-pagination-btn ${pagination.limit === limit ? 'is-active' : ''}`}
                                >
                                    {limit}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Add/Edit Product Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => !isSubmitting && setShowModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="px-8 py-6" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)' }}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                    <Package size={24} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">
                                        {isEditing ? 'Update Product Details' : 'Register New Product'}
                                    </h3>
                                    <p className="text-indigo-100 text-sm">Fill in the technical and commercial specifications</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                            {/* Primary Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="form-label font-bold text-gray-700">Product Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        className="form-input text-lg"
                                        placeholder="Enter product name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="form-label font-bold text-gray-700">HSN Code</label>
                                    <input
                                        type="text"
                                        name="hsn"
                                        className="form-input font-mono"
                                        placeholder="e.g. 6106"
                                        value={formData.hsn}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            {/* Classification */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-1.5">
                                    <label className="form-label font-bold text-gray-700">Category *</label>
                                    <select
                                        name="category"
                                        className="form-input font-bold"
                                        value={formData.category}
                                        onChange={handleCategoryChange}
                                    >
                                        <option value="">Select category</option>
                                        {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        <option value="__add_new__" className="text-indigo-600 font-black">+ Create New</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="form-label font-bold text-gray-700">Size</label>
                                    <input
                                        type="text"
                                        name="size"
                                        className="form-input uppercase"
                                        placeholder="S, M, L, XL"
                                        value={formData.size}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="form-label font-bold text-gray-700">GST Rate (%)</label>
                                    <select
                                        name="gstRate"
                                        className="form-input"
                                        value={formData.gstRate}
                                        onChange={handleInputChange}
                                    >
                                        <option value="0">0% (Exempt)</option>
                                        <option value="5">5% (Essential)</option>
                                        <option value="12">12% (Standard)</option>
                                        <option value="18">18% (Service)</option>
                                        <option value="28">28% (Luxury)</option>
                                    </select>
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* Commercials */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 space-y-4">
                                    <h4 className="text-sm font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                                        <IndianRupee size={14} /> Pricing & Costing
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Cost Price</label>
                                            <input
                                                type="number"
                                                name="costPrice"
                                                className="form-input bg-white border-indigo-200"
                                                placeholder="0"
                                                value={formData.costPrice}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Selling Price *</label>
                                            <input
                                                type="number"
                                                name="sellingPrice"
                                                className="form-input bg-white border-indigo-400 ring-indigo-100 ring-2"
                                                placeholder="0"
                                                value={formData.sellingPrice}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 space-y-4">
                                    <h4 className="text-sm font-black text-emerald-900 uppercase tracking-widest flex items-center gap-2">
                                        <Layers size={14} /> Stock Management
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{isEditing ? 'Current Stock' : 'Initial Stock *'}</label>
                                            <input
                                                type="number"
                                                name="stock"
                                                className="form-input bg-white border-emerald-200"
                                                placeholder="0"
                                                value={formData.stock}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Low Alert at</label>
                                            <input
                                                type="number"
                                                name="lowStockThreshold"
                                                className="form-input bg-white border-emerald-200"
                                                placeholder="5"
                                                value={formData.lowStockThreshold}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="form-label font-bold text-gray-700 flex items-center gap-2">
                                    <Info size={14} /> Product Description
                                </label>
                                <textarea
                                    name="description"
                                    className="form-input py-3 min-h-[80px]"
                                    placeholder="Enter additional details, material info, etc."
                                    value={formData.description}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-gray-50 flex items-center justify-between border-t border-gray-100">
                            <p className="text-xs text-gray-400 italic">Press Save to commit changes to the catalog</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="btn btn-secondary px-6"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="btn btn-primary px-8 flex items-center gap-2"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : <Save size={18} />}
                                    {isSubmitting ? 'Saving...' : 'Save Product'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && selectedItem && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-scale-up" onClick={(e) => e.stopPropagation()}>
                        <div className="text-center">
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Trash2 size={40} className="text-red-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">Delete Product?</h3>
                            <p className="text-gray-600 mb-8 leading-relaxed text-center">
                                You are removing <strong>{selectedItem.name}</strong> from the catalog. This will archive the product but historical data remains.
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 btn btn-secondary py-3"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 btn btn-danger py-3"
                                >
                                    Confirm Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Category Modal */}
            {showCategoryModal && (
                <div className="modal-overlay" onClick={() => !isSubmitting && setShowCategoryModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)' }}>
                            <FolderPlus size={20} className="text-white" />
                            <h3 className="text-lg font-bold text-white">Create Category</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="form-label font-bold">Category Name *</label>
                                <input
                                    type="text"
                                    className="form-input focus:ring-4"
                                    placeholder="e.g. Menswear, Fabric, etc."
                                    value={newCategory.name}
                                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="form-label font-bold">Description (Optional)</label>
                                <textarea
                                    className="form-input py-2"
                                    rows="2"
                                    placeholder="Brief category description..."
                                    value={newCategory.description}
                                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-3xl">
                            <button
                                className="btn btn-secondary px-5"
                                onClick={() => { setShowCategoryModal(false); setNewCategory({ name: '', description: '' }); }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary px-6"
                                onClick={handleAddCategory}
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ItemsPage;
