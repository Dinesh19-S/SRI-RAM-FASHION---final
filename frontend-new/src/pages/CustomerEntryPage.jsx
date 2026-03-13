import { useState, useEffect } from 'react';
import { Mail, Phone, Plus, Search, Pencil, Trash2, X, Save, Building2 } from 'lucide-react';
import { customersAPI } from '../services/api';
import { useToast } from '../components/common';

const avatarBg = ['bg-amber-500', 'bg-slate-500', 'bg-emerald-500', 'bg-blue-500', 'bg-rose-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-violet-500'];

const CustomerEntryPage = () => {
    const toast = useToast();
    const [customers, setCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
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
        fetchCustomers();
    }, [pagination.page, pagination.limit]);

    const fetchCustomers = async () => {
        setIsLoading(true);
        try {
            const response = await customersAPI.getAll({
                search: searchQuery,
                page: pagination.page,
                limit: pagination.limit
            });
            setCustomers(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                total: response.data.pagination?.total || 0,
                pages: response.data.pagination?.pages || 0
            }));
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = () => {
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchCustomers();
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
        setSelectedCustomer(null);
    };

    const handleOpenModal = (customer = null) => {
        if (customer) {
            setFormData({
                companyName: customer.companyName || '',
                gstin: customer.gstin || '',
                state: customer.state || 'Tamilnadu',
                mobile: customer.mobile || '',
                alternateNo: customer.alternateNo || '',
                email: customer.email || '',
                address: customer.address || '',
                placeOfSupply: customer.placeOfSupply || ''
            });
            setSelectedCustomer(customer);
            setIsEditing(true);
        } else {
            resetForm();
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.companyName || !formData.mobile) {
            toast.warning('Please fill Company Name and Mobile');
            return;
        }
        try {
            if (isEditing && selectedCustomer) {
                await customersAPI.update(selectedCustomer._id, formData);
                toast.success('Customer updated successfully');
            } else {
                await customersAPI.create(formData);
                toast.success('Customer added successfully');
            }
            setShowModal(false);
            resetForm();
            fetchCustomers();
        } catch (error) {
            toast.error('Error saving customer: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleDeleteClick = (customer) => {
        setSelectedCustomer(customer);
        setShowDeleteConfirm(true);
    };

    const handleDelete = async () => {
        try {
            await customersAPI.delete(selectedCustomer._id);
            setShowDeleteConfirm(false);
            setSelectedCustomer(null);
            fetchCustomers();
            toast.success('Customer deleted successfully');
        } catch (error) {
            toast.error('Error deleting customer: ' + (error.response?.data?.message || error.message));
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
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <p className="text-sm text-gray-600">Manage your customer database</p>
                    <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search customers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                        />
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => handleOpenModal()}
                    >
                        <Plus size={16} />
                        New Customer
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden" style={{ borderColor: 'var(--border-soft)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead style={{ backgroundColor: '#dbeafe' }} className="text-left">
                            <tr className="text-xs uppercase tracking-wide text-blue-900">
                                <th className="px-6 py-3">Customer</th>
                                <th className="px-6 py-3">Contact Info</th>
                                <th className="px-6 py-3">GSTIN</th>
                                <th className="px-6 py-3">State</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="py-8 text-center">
                                        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: '#3b82f6', borderTopColor: 'transparent' }}></div>
                                    </td>
                                </tr>
                            ) : customers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-8 text-center text-gray-500">
                                        No customers found. Click &quot;New Customer&quot; to add one.
                                    </td>
                                </tr>
                            ) : (
                                customers.map((customer, index) => (
                                    <tr key={customer._id} className="border-b last:border-b-0 hover:bg-[#eff6ff]" style={{ borderColor: 'var(--border-soft)' }}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-bold ${avatarBg[index % avatarBg.length]}`}>
                                                    {(customer.companyName || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{customer.companyName}</p>
                                                    <p className="text-xs text-gray-500">{customer.placeOfSupply || customer.state || 'Tamilnadu'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col text-sm text-gray-700 gap-1">
                                                {customer.email && (
                                                    <span className="flex items-center gap-2 text-gray-800"><Mail size={14} /> {customer.email}</span>
                                                )}
                                                <span className="flex items-center gap-2 text-gray-800"><Phone size={14} /> {customer.mobile}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-mono text-gray-800">{customer.gstin || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
                                                <Building2 size={16} className="text-gray-500" />
                                                {customer.state || 'Tamilnadu'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    className="action-btn action-btn-blue"
                                                    onClick={() => handleOpenModal(customer)}
                                                    aria-label="Edit customer"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    className="action-btn action-btn-red"
                                                    onClick={() => handleDeleteClick(customer)}
                                                    aria-label="Delete customer"
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
                    <div className="flex items-center justify-between px-6 py-3 border-t bg-gray-50" style={{ borderColor: 'var(--border-soft)' }}>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page <= 1}
                                className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50"
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
                                        className={`px-3 py-1 text-sm rounded font-medium ${pagination.page === pageNum ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page >= pagination.pages}
                                className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50"
                            >
                                &gt;
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            {[10, 25, 50, 100].map(limit => (
                                <button
                                    key={limit}
                                    onClick={() => handleLimitChange(limit)}
                                    className={`px-3 py-1 text-sm rounded font-medium ${pagination.limit === limit ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                                >
                                    {limit}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* New/Edit Customer Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}>
                            <h3 className="text-lg font-semibold text-white">
                                {isEditing ? 'Edit Customer' : 'New Customer'}
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                                <input
                                    type="text"
                                    name="companyName"
                                    value={formData.companyName}
                                    onChange={handleInputChange}
                                    className="form-input w-full"
                                    placeholder="Enter company name"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                                    <input
                                        type="text"
                                        name="gstin"
                                        value={formData.gstin}
                                        onChange={handleInputChange}
                                        className="form-input w-full"
                                        placeholder="Enter GSTIN"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                    <input
                                        type="text"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleInputChange}
                                        className="form-input w-full"
                                        placeholder="State"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone No *</label>
                                    <input
                                        type="text"
                                        name="mobile"
                                        value={formData.mobile}
                                        onChange={handleInputChange}
                                        className="form-input w-full"
                                        placeholder="Phone"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Alternate No</label>
                                    <input
                                        type="text"
                                        name="alternateNo"
                                        value={formData.alternateNo}
                                        onChange={handleInputChange}
                                        className="form-input w-full"
                                        placeholder="Alternate"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="form-input w-full"
                                        placeholder="Email"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    className="form-input w-full resize-none"
                                    rows="2"
                                    placeholder="Enter address"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Place of Supply</label>
                                <input
                                    type="text"
                                    name="placeOfSupply"
                                    value={formData.placeOfSupply}
                                    onChange={handleInputChange}
                                    className="form-input w-full"
                                    placeholder="Enter place of supply"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50">
                            <button
                                onClick={() => setShowModal(false)}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="btn btn-primary"
                            >
                                <Save size={16} />
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && selectedCustomer && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} className="text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Customer</h3>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to delete <strong>{selectedCustomer.companyName}</strong>? This action cannot be undone.
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
        </div>
    );
};

export default CustomerEntryPage;
