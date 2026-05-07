import { useState, useEffect } from 'react';
import { Mail, Phone, Plus, Search, Pencil, Trash2, X, Save, Building2, Users, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
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
            toast.error('Failed to load customers.');
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
            toast.warning('Please enter name and mobile.');
            return;
        }
        setIsSubmitting(true);
        try {
            if (isEditing && selectedCustomer) {
                await customersAPI.update(selectedCustomer._id, formData);
                toast.success('Customer updated successfully');
            } else {
                await customersAPI.create(formData);
                toast.success('New customer successfully saved');
            }
            setShowModal(false);
            resetForm();
            fetchCustomers();
        } catch (error) {
            toast.error('Error: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsSubmitting(false);
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
            toast.success('Customer removed from list');
        } catch (error) {
            toast.error('Failed to delete customer.');
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
        <div className="space-y-10 animate-fade-in p-2">
            {/* Customer Header */}
            <div className="page-header-shell bg-white/40 backdrop-blur-md border border-white/40 shadow-xl shadow-slate-200/20 rounded-3xl p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-5">
                        <div className="w-16 h-16 rounded-3xl bg-linear-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                            <Users size={28} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.3em]">Customer List</p>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Customers</h1>
                            <p className="text-sm font-bold text-slate-500 pt-1">Manage your network of retail and regular customers.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            className="btn btn-primary px-8 py-4 rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 border-none bg-emerald-600 text-white"
                            onClick={() => handleOpenModal()}
                        >
                            <Plus size={20} strokeWidth={3} />
                            <span className="font-black uppercase tracking-widest text-xs">Add Customer</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="glass-card p-8 border-none">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, mobile, or GSTIN..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="form-input pl-12 py-4 bg-slate-50 border-none shadow-inner rounded-2xl font-bold"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSearch}
                            disabled={isLoading}
                            className="px-8 py-4 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] flex items-center gap-2 group hover:bg-slate-800 transition-all active:scale-95"
                        >
                            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={16} className="group-hover:scale-110 transition-transform" />}
                            Search
                        </button>
                        <button
                            onClick={() => { setSearchQuery(''); setPagination(p => ({ ...p, page: 1 })); fetchCustomers(); }}
                            className="p-4 rounded-2xl bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Customer List */}
            <div className="glass-card p-0 border-none overflow-hidden">
                <div className="p-8 pb-4 flex items-center justify-between">
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Saved Customers</h3>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Manage your contacts</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100/50">
                        <span className="text-[11px] font-black uppercase tracking-widest">{pagination.total} Customers Saved</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Customer Name</th>
                                <th className="px-8 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Contact Details</th>
                                <th className="px-8 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">GSTIN</th>
                                <th className="px-8 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Region</th>
                                <th className="px-8 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-32">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="w-12 h-12 border-4 border-slate-100 border-t-emerald-600 rounded-full animate-spin" />
                                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Loading Customers...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : customers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-32 text-center">
                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-dashed border-slate-200">
                                            <Users size={32} className="text-slate-300" />
                                        </div>
                                        <h4 className="text-lg font-black text-slate-900 tracking-tight mb-1">No Customers</h4>
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Add your first customer to get started</p>
                                    </td>
                                </tr>
                            ) : (
                                customers.map((customer, index) => (
                                    <tr key={customer._id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center font-black text-xl shadow-lg transition-transform group-hover:scale-110 ${avatarBg[index % avatarBg.length]}`}>
                                                    {(customer.companyName || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 tracking-tight">{customer.companyName}</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[200px]">{customer.placeOfSupply || customer.state || 'Geographic Origin'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2 text-slate-900">
                                                    <Phone size={12} className="text-emerald-500" strokeWidth={3} />
                                                    <span className="text-xs font-black">{customer.mobile}</span>
                                                </div>
                                                {customer.email && (
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <Mail size={12} strokeWidth={3} />
                                                        <span className="text-[10px] font-bold">{customer.email}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                                {customer.gstin || 'NOT REGISTERED'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                                <span className="text-xs font-black text-slate-900 tracking-tight uppercase">{customer.state || 'Tamilnadu'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                    onClick={() => handleOpenModal(customer)}
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                    onClick={() => handleDeleteClick(customer)}
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
                {pagination.pages > 0 && (
                    <div className="px-8 py-6 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-100">
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                            Viewing: <span className="text-slate-900 font-black">{(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-slate-900 font-black">{pagination.total}</span> Customers
                        </p>
                        <div className="flex items-center gap-4">
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
                                        const isActive = pagination.page === pageNum;
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => handlePageChange(pageNum)}
                                                className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${isActive ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
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
                            <div className="h-8 w-px bg-slate-200 hidden md:block" />
                            <div className="flex items-center p-1 bg-white border border-slate-200 rounded-xl">
                                {[10, 25, 50].map(limit => (
                                    <button
                                        key={limit}
                                        onClick={() => handleLimitChange(limit)}
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${pagination.limit === limit ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {limit}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Customer Details Modal */}
            {showModal && (
                <div className="modal-overlay bg-slate-900/60 p-4" onClick={() => !isSubmitting && setShowModal(false)}>
                    <div className="modal-content max-w-2xl border-none animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="p-8 border-b flex items-center justify-between bg-emerald-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/10">
                                    <Users size={28} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                        {isEditing ? 'Edit Customer' : 'New Customer'}
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Information</p>
                                </div>
                            </div>
                            <button className="action-btn hover:bg-white" onClick={() => setShowModal(false)}><X size={24} /></button>
                        </div>

                        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="form-label">Company Name *</label>
                                    <input
                                        type="text"
                                        name="companyName"
                                        value={formData.companyName}
                                        onChange={handleInputChange}
                                        className="form-input font-black text-lg"
                                        placeholder="Customer or Shop Name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="form-label">GST Number (GSTIN)</label>
                                    <input
                                        type="text"
                                        name="gstin"
                                        value={formData.gstin}
                                        onChange={handleInputChange}
                                        className="form-input font-mono font-black uppercase tracking-widest"
                                        placeholder="GST Number"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-2">
                                    <label className="form-label">Mobile Number *</label>
                                    <div className="relative">
                                        <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            name="mobile"
                                            value={formData.mobile}
                                            onChange={handleInputChange}
                                            className="form-input pl-11 font-bold"
                                            placeholder="Contact No"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="form-label">Alternate Number</label>
                                    <input
                                        type="text"
                                        name="alternateNo"
                                        value={formData.alternateNo}
                                        onChange={handleInputChange}
                                        className="form-input font-bold"
                                        placeholder="Other Number"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="form-label">Email Address</label>
                                    <div className="relative">
                                        <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="form-input pl-11 font-bold"
                                            placeholder="Email address"
                                        />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-2">
                                    <label className="form-label">State</label>
                                    <input
                                        type="text"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleInputChange}
                                        className="form-input font-bold"
                                        placeholder="Tamilnadu"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="form-label">City / Place (Place of Supply)</label>
                                    <div className="relative">
                                        <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            name="placeOfSupply"
                                            value={formData.placeOfSupply}
                                            onChange={handleInputChange}
                                            className="form-input pl-11 font-bold"
                                            placeholder="City/Area"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="form-label">Full Address</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    className="form-input min-h-[120px] font-bold py-4"
                                    placeholder="Address details..."
                                />
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 flex items-center justify-between border-t border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Please check details before saving</p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-8 py-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-10 py-4 rounded-2xl bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-500/20 hover:bg-emerald-500 transition-all active:scale-95 flex items-center gap-2"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : <Save size={16} />}
                                    {isSubmitting ? 'Saving...' : 'Save Customer'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Customer Modal */}
            {showDeleteConfirm && selectedCustomer && (
                <div className="modal-overlay bg-slate-900/60 p-4" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="modal-content max-w-sm border-none animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="p-10 text-center">
                            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-100 shadow-lg shadow-red-500/5">
                                <Trash2 size={40} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-3">Delete Customer?</h3>
                            <p className="text-sm font-bold text-slate-500 mb-10 leading-relaxed uppercase tracking-widest text-[10px]">
                                This will permanently remove <span className="text-red-500 font-black">{selectedCustomer.companyName}</span> from the contacts. This cannot be undone.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <button className="btn btn-secondary py-4 rounded-xl font-black uppercase tracking-widest text-[10px]" onClick={() => setShowDeleteConfirm(false)}>Keep</button>
                                <button className="btn bg-red-500 text-white hover:bg-red-600 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-500/20 transition-all active:scale-95" onClick={handleDelete}>
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
