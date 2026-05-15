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
            {/* Header */}
            <div className="page-header-shell bg-white/60 backdrop-blur-2xl border border-white/50 shadow-premium rounded-[2.5rem] p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-start gap-6">
                        <div className="w-20 h-20 rounded-4xl bg-linear-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-2xl shadow-emerald-500/30 group-hover:scale-105 transition-transform duration-500">
                            <Users size={32} />
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em]">Customers</p>
                            <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Customers</h1>
                            <p className="text-sm font-bold text-slate-500 pt-1">Manage and track your customers.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            className="h-16 px-8 rounded-2xl flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-slate-900/20 transition-all hover:scale-105 active:scale-95"
                            onClick={() => handleOpenModal()}
                        >
                            <Plus size={20} strokeWidth={3} />
                            New Customer
                        </button>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="glass-card p-10 border-none shadow-premium relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
                <div className="flex flex-col lg:flex-row lg:items-center gap-8 relative z-10">
                    <div className="flex-1 relative group/input">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-emerald-600 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name, phone, or GSTIN..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full pl-16 pr-8 py-5 bg-slate-50/50 border-none focus:ring-4 focus:ring-emerald-500/5 rounded-3xl font-bold text-slate-900 placeholder:text-slate-400 transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleSearch}
                            disabled={isLoading}
                            className="h-16 px-10 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] flex items-center gap-3 group hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/10"
                        >
                            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={18} className="group-hover:scale-110 transition-transform" />}
                            Search
                        </button>
                        <button
                            onClick={() => { setSearchQuery(''); setPagination(p => ({ ...p, page: 1 })); fetchCustomers(); }}
                            className="h-16 w-16 rounded-2xl bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all flex items-center justify-center group"
                        >
                            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Customer List */}
            <div className="page-table-card animate-slide-up border-none shadow-premium overflow-hidden rounded-[2.5rem] bg-white/40 backdrop-blur-3xl">
                <div className="p-10 flex items-center justify-between border-b border-slate-100/50">
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Customer List</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">View all customers</p>
                    </div>
                    <div className="px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100/50 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[11px] font-black uppercase tracking-widest">{pagination.total} Customers</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="page-table w-full border-separate border-spacing-y-2 px-10">
                        <thead>
                            <tr className="text-left">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">GSTIN</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">State</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-0">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-32">
                                        <div className="flex flex-col items-center justify-center gap-6">
                                            <div className="w-16 h-16 border-4 border-slate-100 border-t-emerald-600 rounded-full animate-spin" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Loading...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : customers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-32 text-center">
                                        <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-slate-100 shadow-inner">
                                            <Users size={40} className="text-slate-200" />
                                        </div>
                                        <h4 className="text-xl font-black text-slate-900 tracking-tight mb-2">No Customers Found</h4>
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest max-w-xs mx-auto">Add a new customer to get started.</p>
                                    </td>
                                </tr>
                            ) : (
                                customers.map((customer, index) => (
                                    <tr key={customer._id} className="group bg-white/50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/20 transition-all duration-300">
                                        <td className="px-8 py-6 rounded-l-4xl">
                                            <div className="flex items-center gap-5">
                                                <div className={`w-14 h-14 rounded-3xl text-white flex items-center justify-center font-black text-2xl shadow-lg transition-all group-hover:scale-110 group-hover:rotate-3 ${avatarBg[index % avatarBg.length]}`}>
                                                    {(customer.companyName || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-base font-black text-slate-900 tracking-tight uppercase">{customer.companyName}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">{customer.placeOfSupply || customer.state || 'Global'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3 text-slate-900">
                                                    <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                                        <Phone size={12} strokeWidth={3} />
                                                    </div>
                                                    <span className="text-sm font-black tracking-tight">{customer.mobile}</span>
                                                </div>
                                                {customer.email && (
                                                    <div className="flex items-center gap-3 text-slate-400">
                                                        <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center">
                                                            <Mail size={12} strokeWidth={3} />
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest">{customer.email}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors ${customer.gstin ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                                {customer.gstin || 'UNREGISTERED'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                                <span className="text-xs font-black text-slate-900 tracking-tight uppercase">{customer.state || 'Tamilnadu'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 rounded-r-4xl text-right">
                                            <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                <button
                                                    className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                    onClick={() => handleOpenModal(customer)}
                                                    title="Edit Customer"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                    onClick={() => handleDeleteClick(customer)}
                                                    title="Delete Customer"
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

                {/* Professional Pagination Shell */}
                {pagination.pages > 0 && (
                    <div className="px-10 py-10 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-8 border-t border-slate-100/50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                            Showing <span className="text-slate-900">{(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-slate-900">{pagination.total}</span> Customers
                        </p>
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
