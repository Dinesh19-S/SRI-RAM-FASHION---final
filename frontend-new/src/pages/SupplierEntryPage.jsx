import { useState, useEffect } from 'react';
import { Mail, Phone, Plus, Search, Pencil, Trash2, X, Save, Building2, MapPin, Globe } from 'lucide-react';
import { suppliersAPI } from '../services/api';
import { useToast } from '../components/common';

const avatarBg = ['bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'];

const SupplierEntryPage = () => {
    const toast = useToast();
    const [suppliers, setSuppliers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
    const [formData, setFormData] = useState({
        companyName: '',
        gstin: '',
        state: 'Tamilnadu',
        mobile: '',
        alternateNo: '',
        email: '',
        address: '',
        placeOfSupply: ''
    });

    useEffect(() => {
        fetchSuppliers();
    }, [pagination.page, pagination.limit]);

    const fetchSuppliers = async () => {
        setIsLoading(true);
        try {
            const response = await suppliersAPI.getAll({
                search: searchQuery,
                page: pagination.page,
                limit: pagination.limit
            });
            setSuppliers(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                total: response.data.pagination?.total || 0,
                pages: response.data.pagination?.pages || 0
            }));
        } catch (error) {
            console.error('Error fetching suppliers:', error);
            toast.error('Failed to load suppliers');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = () => {
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchSuppliers();
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({
            companyName: '',
            gstin: '',
            state: 'Tamilnadu',
            mobile: '',
            alternateNo: '',
            email: '',
            address: '',
            placeOfSupply: ''
        });
        setIsEditing(false);
        setSelectedSupplier(null);
    };

    const handleOpenModal = (supplier = null) => {
        if (supplier) {
            setFormData({
                companyName: supplier.companyName || '',
                gstin: supplier.gstin || '',
                state: supplier.state || 'Tamilnadu',
                mobile: supplier.mobile || '',
                alternateNo: supplier.alternateNo || '',
                email: supplier.email || '',
                address: supplier.address || '',
                placeOfSupply: supplier.placeOfSupply || ''
            });
            setSelectedSupplier(supplier);
            setIsEditing(true);
        } else {
            resetForm();
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.companyName || !formData.mobile) {
            toast.warning('Company Name and Mobile are required');
            return;
        }

        setIsSubmitting(true);
        try {
            if (isEditing && selectedSupplier) {
                await suppliersAPI.update(selectedSupplier._id, formData);
                toast.success('Supplier updated successfully');
            } else {
                await suppliersAPI.create(formData);
                toast.success('Supplier added successfully');
            }
            setShowModal(false);
            resetForm();
            fetchSuppliers();
        } catch (error) {
            toast.error('Error saving supplier: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (supplier) => {
        setSelectedSupplier(supplier);
        setShowDeleteConfirm(true);
    };

    const handleDelete = async () => {
        try {
            await suppliersAPI.delete(selectedSupplier._id);
            setShowDeleteConfirm(false);
            setSelectedSupplier(null);
            fetchSuppliers();
            toast.success('Supplier deleted successfully');
        } catch (error) {
            toast.error('Error deleting supplier: ' + (error.response?.data?.message || error.message));
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

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="page-header-shell">
                <div className="flex items-start gap-4">
                    <div className="page-icon-badge">
                        <Building2 size={20} />
                    </div>
                    <div className="page-header-copy">
                        <p className="page-header-kicker">Manage your vendor relationships</p>
                        <h1 className="page-header-title">Suppliers</h1>
                    </div>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => handleOpenModal()}
                >
                    <Plus size={16} />
                    New Supplier
                </button>
            </div>

            {/* Filter Area */}
            <div className="page-filter-card">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="shrink-0 w-64">
                        <label className="form-label">Search</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Name, Mobile, or GSTIN"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="form-input pl-9"
                            />
                        </div>
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
                        onClick={() => { setSearchQuery(''); setPagination(p => ({ ...p, page: 1 })); fetchSuppliers(); }}
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
                                <th>Supplier</th>
                                <th>Contact Info</th>
                                <th>GSTIN</th>
                                <th>State / Place</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="page-empty-state">
                                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                    </td>
                                </tr>
                            ) : suppliers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="page-empty-state">
                                        No suppliers found. Click "NEW SUPPLIER" to add one.
                                    </td>
                                </tr>
                            ) : (
                                suppliers.map((supplier, index) => (
                                    <tr key={supplier._id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-lg shadow-sm ${avatarBg[index % avatarBg.length]}`}>
                                                    {(supplier.companyName || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{supplier.companyName}</p>
                                                    <p className="text-xs text-gray-500 font-medium">{supplier.address ? (supplier.address.substring(0, 30) + '...') : (supplier.placeOfSupply || 'Tamilnadu')}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                                    <Phone size={12} className="text-blue-500" />
                                                    <span className="font-medium">{supplier.mobile}</span>
                                                </div>
                                                {supplier.email && (
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <Mail size={12} className="text-gray-400" />
                                                        {supplier.email}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="text-sm font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                                                {supplier.gstin || '-'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-gray-800">{supplier.state || 'Tamilnadu'}</span>
                                                <span className="text-xs text-gray-500">{supplier.placeOfSupply || ''}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    className="action-btn action-btn-blue"
                                                    onClick={() => handleOpenModal(supplier)}
                                                    title="Edit Supplier"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    className="action-btn action-btn-red"
                                                    onClick={() => handleDeleteClick(supplier)}
                                                    title="Delete Supplier"
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

            {/* New/Edit Supplier Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => !isSubmitting && setShowModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="px-8 py-6" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)' }}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                    <Building2 size={24} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">
                                        {isEditing ? 'Update Supplier Profile' : 'Register New Supplier'}
                                    </h3>
                                    <p className="text-blue-100 text-sm">Enter the company details below</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                            {/* Primary Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="form-label font-bold text-gray-700">Company Name *</label>
                                    <input
                                        type="text"
                                        name="companyName"
                                        value={formData.companyName}
                                        onChange={handleInputChange}
                                        className="form-input text-lg focus:ring-4"
                                        placeholder="Enter legal entity name"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="form-label font-bold text-gray-700">GST Number</label>
                                    <input
                                        type="text"
                                        name="gstin"
                                        value={formData.gstin}
                                        onChange={handleInputChange}
                                        className="form-input font-mono uppercase tracking-wider"
                                        placeholder="e.g. 33AAAAA0000A1Z5"
                                    />
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-1.5">
                                    <label className="form-label font-bold text-gray-700">Primary Mobile *</label>
                                    <div className="relative">
                                        <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            name="mobile"
                                            value={formData.mobile}
                                            onChange={handleInputChange}
                                            className="form-input pl-10"
                                            placeholder="Contact number"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="form-label font-bold text-gray-700">Alternate No</label>
                                    <input
                                        type="text"
                                        name="alternateNo"
                                        value={formData.alternateNo}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        placeholder="Secondary contact"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="form-label font-bold text-gray-700">Email Address</label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="form-input pl-10"
                                            placeholder="vendor@email.com"
                                        />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* Location Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-1.5">
                                    <label className="form-label font-bold text-gray-700">State</label>
                                    <input
                                        type="text"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        placeholder="Tamilnadu"
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="form-label font-bold text-gray-700">Place of Supply / City</label>
                                    <div className="relative">
                                        <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            name="placeOfSupply"
                                            value={formData.placeOfSupply}
                                            onChange={handleInputChange}
                                            className="form-input pl-10"
                                            placeholder="City or Area"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="form-label font-bold text-gray-700">Detailed Address</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    className="form-input min-h-[100px] py-3"
                                    placeholder="Complete office or warehouse address"
                                />
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-gray-50 flex items-center justify-between border-t border-gray-100">
                            <p className="text-xs text-gray-400 italic">* Required fields must be filled</p>
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
                                    {isSubmitting ? 'Processing...' : 'Save Supplier'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && selectedSupplier && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-scale-up" onClick={(e) => e.stopPropagation()}>
                        <div className="text-center">
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Trash2 size={40} className="text-red-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">Delete Supplier?</h3>
                            <p className="text-gray-600 mb-8 leading-relaxed">
                                You are about to remove <strong>{selectedSupplier.companyName}</strong>. This action will archive the supplier record.
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 btn btn-secondary py-3"
                                >
                                    No, Keep it
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 btn btn-danger py-3"
                                >
                                    Yes, Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplierEntryPage;
