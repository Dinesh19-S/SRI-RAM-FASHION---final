import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ShoppingCart, Plus, Search, Eye, Trash2, X, Save, Building2, Calendar, FileText, IndianRupee, Package, Trash, Edit, CheckCircle2, Printer } from 'lucide-react';
import { purchaseEntriesAPI, suppliersAPI, productsAPI } from '../services/api';
import { useToast } from '../components/common';
import BillTemplate from '../components/BillTemplate';
import { fetchSettings } from '../store/slices/settingsSlice';

const PurchaseEntryPage = () => {
    const toast = useToast();
    const dispatch = useDispatch();
    const settings = useSelector((state) => state.settings.data);
    const resolvedSettings = settings || { company: {}, bank: {}, tax: { cgstRate: 0, sgstRate: 0 } };
    const [entries, setEntries] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });

    const [formData, setFormData] = useState({
        supplier: '',
        billNumber: '',
        date: new Date().toISOString().split('T')[0],
        items: [{ product: '', quantity: '', rate: '', total: 0 }],
        totalAmount: 0,
        paymentStatus: 'pending',
        notes: ''
    });

    useEffect(() => {
        dispatch(fetchSettings());
        fetchEntries();
        fetchSuppliers();
        fetchProducts();
    }, [pagination.page, pagination.limit]);

    const fetchEntries = async () => {
        setIsLoading(true);
        try {
            const response = await purchaseEntriesAPI.getAll({
                search: searchQuery,
                page: pagination.page,
                limit: pagination.limit
            });
            setEntries(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                total: response.data.pagination?.total || 0,
                pages: response.data.pagination?.pages || 0
            }));
        } catch (error) {
            console.error('Error fetching entries:', error);
            toast.error('Failed to load purchase entries');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const response = await suppliersAPI.getAll({ limit: 1000 });
            setSuppliers(response.data.data || []);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await productsAPI.getAll({ limit: 1000 });
            setProducts(response.data.data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const handleSearch = () => {
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchEntries();
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;

        if (field === 'quantity' || field === 'rate') {
            const qty = parseFloat(newItems[index].quantity) || 0;
            const rate = parseFloat(newItems[index].rate) || 0;
            newItems[index].total = qty * rate;
        }

        const total = newItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
        setFormData(prev => ({ ...prev, items: newItems, totalAmount: total }));
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { product: '', quantity: '', rate: '', total: 0 }]
        }));
    };

    const removeItem = (index) => {
        if (formData.items.length === 1) return;
        const newItems = formData.items.filter((_, i) => i !== index);
        const total = newItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
        setFormData(prev => ({ ...prev, items: newItems, totalAmount: total }));
    };

    const handleSave = async () => {
        if (!formData.supplier || !formData.billNumber || formData.items.some(item => !item.product || !item.quantity || !item.rate)) {
            toast.warning('Please fill in all required fields and item details');
            return;
        }

        setIsSubmitting(true);
        try {
            await purchaseEntriesAPI.create(formData);
            toast.success('Purchase entry created successfully');
            setShowModal(false);
            setFormData({
                supplier: '',
                billNumber: '',
                date: new Date().toISOString().split('T')[0],
                items: [{ product: '', quantity: '', rate: '', total: 0 }],
                totalAmount: 0,
                paymentStatus: 'pending',
                notes: ''
            });
            fetchEntries();
        } catch (error) {
            toast.error('Error creating entry: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleViewEntry = (entry) => {
        setSelectedEntry(entry);
        setShowViewModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this purchase entry?')) return;
        try {
            await purchaseEntriesAPI.delete(id);
            toast.success('Entry deleted successfully');
            fetchEntries();
        } catch (error) {
            toast.error('Error deleting entry');
        }
    };

    const formatCurrency = (a) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(a);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="page-header-shell">
                <div className="flex items-start gap-4">
                    <div className="page-icon-badge">
                        <ShoppingCart size={20} />
                    </div>
                    <div className="page-header-copy">
                        <p className="page-header-kicker">Track inward inventory and bills</p>
                        <h1 className="page-header-title">Purchase Entries</h1>
                    </div>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowModal(true)}
                >
                    <Plus size={16} />
                    New Purchase
                </button>
            </div>

            {/* Filter Area */}
            <div className="page-filter-card">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="shrink-0 w-64">
                        <label className="form-label">Search Bills</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Bill # or Supplier name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="form-input pl-9"
                            />
                        </div>
                    </div>
                    <button onClick={handleSearch} className="btn btn-primary">
                        <Search size={16} />
                        Search
                    </button>
                    <button onClick={() => { setSearchQuery(''); fetchEntries(); }} className="btn btn-ghost">
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
                                <th>Date</th>
                                <th>Bill Info</th>
                                <th>Supplier</th>
                                <th>Amount</th>
                                <th>Status</th>
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
                            ) : entries.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="page-empty-state">
                                        No purchase entries found. Record a new purchase to see it here.
                                    </td>
                                </tr>
                            ) : (
                                entries.map((entry) => (
                                    <tr key={entry._id}>
                                        <td className="font-medium text-gray-600">
                                            {new Date(entry.date).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">
                                                {entry.billNumber}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <Building2 size={14} className="text-gray-400" />
                                                <span className="font-semibold text-gray-900">{entry.supplier?.companyName || 'Unknown Vendor'}</span>
                                            </div>
                                        </td>
                                        <td className="font-bold text-gray-900">
                                            {formatCurrency(entry.totalAmount)}
                                        </td>
                                        <td>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${entry.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {entry.paymentStatus}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    className="action-btn action-btn-blue"
                                                    onClick={() => handleViewEntry(entry)}
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    className="action-btn action-btn-red"
                                                    onClick={() => handleDelete(entry._id)}
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
                                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
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
                                        onClick={() => setPagination(p => ({ ...p, page: pageNum }))}
                                        className={`page-pagination-btn ${pagination.page === pageNum ? 'is-active' : ''}`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                disabled={pagination.page >= pagination.pages}
                                className="page-pagination-btn"
                            >
                                &gt;
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* New Entry Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => !isSubmitting && setShowModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="px-8 py-6" style={{ background: 'linear-gradient(135deg, #10b981 0%, #064e3b 100%)' }}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                    <ShoppingCart size={24} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Record Purchase Entry</h3>
                                    <p className="text-emerald-100 text-sm">Fill in vendor and invoice details to update stock</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto">
                            {/* Header Info */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="form-label font-bold text-gray-700">Vendor / Supplier *</label>
                                    <div className="relative">
                                        <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <select
                                            name="supplier"
                                            className="form-input pl-10 font-bold"
                                            value={formData.supplier}
                                            onChange={handleInputChange}
                                        >
                                            <option value="">Select a vendor</option>
                                            {suppliers.map(s => <option key={s._id} value={s._id}>{s.companyName}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="form-label font-bold text-gray-700">Invoice / Bill # *</label>
                                    <div className="relative">
                                        <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            name="billNumber"
                                            className="form-input pl-10 uppercase font-mono"
                                            placeholder="INV-001"
                                            value={formData.billNumber}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="form-label font-bold text-gray-700">Purchase Date</label>
                                    <div className="relative">
                                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="date"
                                            name="date"
                                            className="form-input pl-10"
                                            value={formData.date}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Items Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Package size={14} /> Item Details
                                    </h4>
                                    <button onClick={addItem} className="text-emerald-600 text-xs font-bold hover:underline flex items-center gap-1">
                                        <Plus size={14} /> Add Another Item
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {formData.items.map((item, index) => (
                                        <div key={index} className="grid grid-cols-12 gap-3 items-end p-4 rounded-2xl bg-gray-50 border border-gray-100 group animate-fade-in">
                                            <div className="col-span-12 md:col-span-5 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Product *</label>
                                                <select
                                                    className="form-input bg-white"
                                                    value={item.product}
                                                    onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                                                >
                                                    <option value="">Select Item</option>
                                                    {products.map(p => <option key={p._id} value={p._id}>{p.name} (Size: {p.size || '-'})</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-4 md:col-span-2 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Quantity *</label>
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    className="form-input bg-white text-center"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-4 md:col-span-2 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Unit Rate (₹)</label>
                                                <input
                                                    type="number"
                                                    placeholder="0.00"
                                                    className="form-input bg-white text-right"
                                                    value={item.rate}
                                                    onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-4 md:col-span-2 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase text-right block">Subtotal</label>
                                                <div className="form-input bg-gray-100 text-right font-bold text-gray-600 border-dashed">
                                                    {formatCurrency(item.total)}
                                                </div>
                                            </div>
                                            <div className="col-span-12 md:col-span-1 flex justify-center pb-1">
                                                <button
                                                    onClick={() => removeItem(index)}
                                                    className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Summary Section */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start pt-4 border-t border-gray-100">
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="form-label font-bold text-gray-700">Payment Status & Notes</label>
                                    <div className="flex gap-4 mb-4">
                                        <button
                                            onClick={() => setFormData(p => ({ ...p, paymentStatus: 'pending' }))}
                                            className={`flex-1 py-3 rounded-2xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${formData.paymentStatus === 'pending' ? 'bg-amber-50 border-amber-500 text-amber-700 ring-4 ring-amber-50' : 'bg-white border-gray-100 text-gray-400'}`}
                                        >
                                            Pending
                                        </button>
                                        <button
                                            onClick={() => setFormData(p => ({ ...p, paymentStatus: 'paid' }))}
                                            className={`flex-1 py-3 rounded-2xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${formData.paymentStatus === 'paid' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-4 emerald-50' : 'bg-white border-gray-100 text-gray-400'}`}
                                        >
                                            <CheckCircle2 size={18} />
                                            Paid
                                        </button>
                                    </div>
                                    <textarea
                                        name="notes"
                                        className="form-input min-h-[100px]"
                                        placeholder="Add any additional remarks here..."
                                        value={formData.notes}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="bg-gray-900 rounded-3xl p-8 text-white space-y-6 shadow-xl shadow-gray-200">
                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Purchase Summary</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400">Total Items</span>
                                            <span className="font-bold">{formData.items.length}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400">Taxable Amount</span>
                                            <span className="font-bold">{formatCurrency(formData.totalAmount / 1.05)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm pb-3 border-b border-white/10">
                                            <span className="text-gray-400">GST (5%)</span>
                                            <span className="font-bold text-emerald-400">+{formatCurrency(formData.totalAmount - (formData.totalAmount / 1.05))}</span>
                                        </div>
                                        <div className="pt-2">
                                            <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Grand Total</p>
                                            <p className="text-4xl font-black text-white leading-none">
                                                {formatCurrency(formData.totalAmount)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-gray-50 flex items-center justify-end border-t border-gray-100">
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="btn btn-secondary px-8"
                                    disabled={isSubmitting}
                                >
                                    Discard
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="btn btn-primary px-10 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : <Save size={18} />}
                                    {isSubmitting ? 'Recording...' : 'Finalize Entry'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {showViewModal && selectedEntry && (
                <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-scale-up" onClick={(e) => e.stopPropagation()}>
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
                            <div>
                                <h3 className="text-xl font-black text-white">Purchase Invoice Preview</h3>
                                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Bill #: {selectedEntry.billNumber}</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => window.print()}
                                    className="btn bg-white/10 hover:bg-white/20 text-white border-white/20 flex items-center gap-2"
                                >
                                    <Printer size={18} />
                                    Print
                                </button>
                                <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="p-0 overflow-y-auto max-h-[80vh] bg-gray-100">
                            <div className="max-w-[800px] mx-auto my-8 shadow-lg bg-white overflow-hidden rounded-xl">
                                <BillTemplate
                                    bill={{
                                        ...selectedEntry,
                                        billType: 'PURCHASE',
                                        customer: selectedEntry.supplier, // Map supplier to customer for template
                                        items: selectedEntry.items?.map(item => ({
                                            ...item,
                                            productName: item.product?.name || item.name || 'N/A',
                                            hsnCode: item.product?.hsn || item.hsnCode || '',
                                            designColor: item.designColor || item.product?.size || '',
                                            weightKg: item.quantity, // Purchase entries often use quantity as weight
                                            ratePerKg: item.rate,
                                            total: item.total
                                        })),
                                        subtotal: selectedEntry.totalAmount / 1.05,
                                        totalTax: selectedEntry.totalAmount - (selectedEntry.totalAmount / 1.05),
                                        grandTotal: selectedEntry.totalAmount
                                    }}
                                    settings={resolvedSettings}
                                />
                            </div>
                        </div>
                        <div className="px-8 py-6 bg-gray-50 border-t flex justify-end">
                            <button onClick={() => setShowViewModal(false)} className="btn btn-primary px-10">Close Preview</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseEntryPage;
