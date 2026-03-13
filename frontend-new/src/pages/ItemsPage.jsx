import { useState, useEffect } from 'react';
import { Package, Plus, Search, Edit, Trash2, X, Save, FolderPlus } from 'lucide-react';
import { productsAPI, categoriesAPI } from '../services/api';
import { useToast } from '../components/common';

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

    // Full product form data (without SKU)
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
    }, [pagination.page, pagination.limit]);

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
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchItems();
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
            setFormData({
                name: item.name || '',
                category: item.category?._id || item.category || '',
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
        // Validation - removed SKU requirement
        if (!formData.name || !formData.category || !formData.sellingPrice || !formData.stock) {
            toast.warning('Please fill in all required fields (Name, Category, Selling Price, Stock)');
            return;
        }

        setIsSubmitting(true);
        try {
            const productData = {
                name: formData.name,
                // Auto-generate SKU from HSN or name for backend compatibility
                sku: formData.hsn || formData.name.substring(0, 3).toUpperCase() + Date.now().toString().slice(-4),
                category: formData.category,
                size: formData.size,
                costPrice: Number(formData.costPrice) || 0,
                mrp: Number(formData.sellingPrice),  // MRP is required by backend
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
            fetchItems();
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
            fetchItems();
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

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="page-header-shell">
                <div className="flex items-start gap-4">
                    <div className="page-icon-badge">
                        <Package size={20} />
                    </div>
                    <div className="page-header-copy">
                        <p className="page-header-kicker">Manage your product catalog</p>
                        <h1 className="page-header-title">Items / Products</h1>
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

            <div className="page-filter-card">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="shrink-0 w-48">
                        <label className="form-label">Name</label>
                        <input
                            type="text"
                            placeholder="Enter item name"
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="form-input"
                        />
                    </div>
                    <div className="shrink-0 w-32">
                        <label className="form-label">HSN Code</label>
                        <input
                            type="text"
                            placeholder="Enter HSN code"
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
                        onClick={() => { setSearchName(''); setSearchHSN(''); fetchItems(); }}
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
                                <th>S No</th>
                                <th>Name</th>
                                <th>HSN Code</th>
                                <th>Category</th>
                                <th>Size</th>
                                <th>Stock</th>
                                <th>Price</th>
                                <th>GST</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="9" className="page-empty-state">
                                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="page-empty-state">
                                        No products found. Click "ADD PRODUCT" to add one.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item, index) => (
                                    <tr key={item._id}>
                                        <td>{(pagination.page - 1) * pagination.limit + index + 1}</td>
                                        <td className="font-medium">{item.name}</td>
                                        <td className="text-blue-600 font-mono">{item.hsn || '-'}</td>
                                        <td>{item.category?.name || '-'}</td>
                                        <td>{item.size || '-'}</td>
                                        <td className="font-semibold">{item.stock || 0}</td>
                                        <td>{formatCurrency(item.sellingPrice || 0)}</td>
                                        <td>{item.gstRate || 5}%</td>
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
                                ))
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
                <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}>
                            <h3 className="text-lg font-semibold text-white">
                                {isEditing ? 'Edit Product' : 'Add New Product'}
                            </h3>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Product Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        className="form-input"
                                        placeholder="Enter product name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">HSN Code</label>
                                    <input
                                        type="text"
                                        name="hsn"
                                        className="form-input"
                                        placeholder="e.g., 6106"
                                        value={formData.hsn}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="form-label">Category *</label>
                                    <select
                                        name="category"
                                        className="form-input"
                                        value={formData.category}
                                        onChange={handleCategoryChange}
                                    >
                                        <option value="">Select category</option>
                                        {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        <option value="__add_new__" style={{ color: '#8b5cf6', fontWeight: 'bold' }}>+ Add New Category</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Size</label>
                                    <input
                                        type="text"
                                        name="size"
                                        className="form-input"
                                        placeholder="e.g., S, M, L, XL or 32, 34"
                                        value={formData.size}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">GST Rate (%)</label>
                                    <select
                                        name="gstRate"
                                        className="form-input"
                                        value={formData.gstRate}
                                        onChange={handleInputChange}
                                    >
                                        <option value="0">0%</option>
                                        <option value="5">5%</option>
                                        <option value="12">12%</option>
                                        <option value="18">18%</option>
                                        <option value="28">28%</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Cost Price (₹)</label>
                                    <input
                                        type="number"
                                        name="costPrice"
                                        className="form-input"
                                        placeholder="0"
                                        value={formData.costPrice}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Selling Price (₹) *</label>
                                    <input
                                        type="number"
                                        name="sellingPrice"
                                        className="form-input"
                                        placeholder="0"
                                        value={formData.sellingPrice}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">{isEditing ? 'Stock' : 'Initial Stock *'}</label>
                                    <input
                                        type="number"
                                        name="stock"
                                        className="form-input"
                                        placeholder="0"
                                        min="0"
                                        value={formData.stock}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Low Stock Threshold</label>
                                    <input
                                        type="number"
                                        name="lowStockThreshold"
                                        className="form-input"
                                        placeholder="5"
                                        min="0"
                                        value={formData.lowStockThreshold}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="form-label">Description</label>
                                <textarea
                                    name="description"
                                    className="form-input"
                                    rows="3"
                                    placeholder="Product description (optional)"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-2xl">
                            <button className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                            <button
                                className="btn btn-primary flex items-center gap-2"
                                onClick={handleSave}
                                disabled={isSubmitting}
                            >
                                <Save size={18} />
                                {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Product')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && selectedItem && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} className="text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Product</h3>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to delete <strong>{selectedItem.name}</strong>? This action cannot be undone.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="btn btn-danger"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Category Modal */}
            {showCategoryModal && (
                <div className="modal-overlay" onClick={() => { setShowCategoryModal(false); setNewCategory({ name: '', description: '' }); }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}>
                            <FolderPlus size={20} className="text-white" />
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
                                    autoFocus
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
                            <button
                                className="btn btn-secondary"
                                onClick={() => { setShowCategoryModal(false); setNewCategory({ name: '', description: '' }); }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary flex items-center gap-2"
                                onClick={handleAddCategory}
                            >
                                <Plus size={18} />
                                Add Category
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ItemsPage;
