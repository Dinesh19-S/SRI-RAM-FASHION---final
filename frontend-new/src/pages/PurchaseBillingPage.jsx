import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, RefreshCcw, Eye, Download, Mail, X, Printer, FileText, History, ShieldCheck, ChevronLeft, ChevronRight, TrendingUp, ArrowDownRight, CreditCard, ExternalLink } from 'lucide-react';
import BillTemplate from '../components/BillTemplate';
import { billsAPI, emailAPI } from '../services/api';
import { EmailActionModal, useToast } from '../components/common';
import { downloadInvoicePDF } from '../utils/invoiceGenerator';
import { fetchSettings } from '../store/slices/settingsSlice';
import { getEmailRecipientValidation, pickDefaultRecipient } from '../utils/emailUtils';

const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
}).format(amount || 0);

const PurchaseBillingPage = () => {
    const toast = useToast();
    const dispatch = useDispatch();
    const settings = useSelector((state) => state.settings.data);
    const { user } = useSelector((state) => state.auth);
    const resolvedSettings = settings || { company: {}, bank: {}, tax: { cgstRate: 0, sgstRate: 0 } };

    const [bills, setBills] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

    const [selectedBill, setSelectedBill] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailTo, setEmailTo] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    useEffect(() => {
        dispatch(fetchSettings());
    }, [dispatch]);

    useEffect(() => {
        loadBills();
    }, [pagination.page, pagination.limit]);

    const loadBills = async (override = {}) => {
        setIsLoading(true);
        try {
            const params = {
                billType: 'PURCHASE',
                search: (override.search ?? search) || undefined,
                startDate: (override.fromDate ?? fromDate) || undefined,
                endDate: (override.toDate ?? toDate) || undefined,
                page: override.page ?? pagination.page,
                limit: pagination.limit
            };

            const response = await billsAPI.getAll(params);
            const data = response.data?.data || [];
            const total = response.data?.pagination?.total ?? data.length;
            const limit = pagination.limit || 20;

            setBills(data);
            setPagination((prev) => ({
                ...prev,
                page: params.page,
                total,
                pages: Math.max(1, Math.ceil(total / limit))
            }));
        } catch (error) {
            toast.error('Failed to load buy bills.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = () => {
        setPagination((prev) => ({ ...prev, page: 1 }));
        loadBills({ page: 1 });
        toast.info('Search results updated');
    };

    const handleReset = () => {
        setSearch('');
        setFromDate('');
        setToDate('');
        setPagination((prev) => ({ ...prev, page: 1 }));
        loadBills({ search: '', fromDate: '', toDate: '', page: 1 });
    };

    const openPreview = (bill) => {
        setSelectedBill(bill);
        setShowPreviewModal(true);
    };

    const handleDownloadPDF = async (bill) => {
        const toastId = toast.loading('Generating PDF...');
        try {
            await downloadInvoicePDF(bill, resolvedSettings, `${bill.billNumber || 'PURCHASE_BILL'}.pdf`);
            toast.update(toastId, { message: 'PDF downloaded successfully', type: 'success', duration: 3000 });
        } catch (error) {
            toast.update(toastId, { message: 'Failed to generate PDF', type: 'error', duration: 3000 });
        }
    };

    const openEmailModal = (bill) => {
        setSelectedBill(bill);
        setEmailTo(pickDefaultRecipient(bill.customer?.email, user?.email));
        setShowEmailModal(true);
    };

    const handleEmailBill = async () => {
        const { hasValidRecipients } = getEmailRecipientValidation(emailTo);
        if (!selectedBill || !hasValidRecipients) {
            toast.warning('Please enter a valid email address');
            return;
        }
        setIsSendingEmail(true);
        const toastId = toast.loading('Sending email...');
        try {
            const response = await emailAPI.sendBill(selectedBill._id, emailTo);
            if (response.data?.success) {
                toast.update(toastId, { message: 'Email sent successfully', type: 'success', duration: 3000 });
                setShowEmailModal(false);
                setEmailTo('');
                setSelectedBill(null);
            } else {
                toast.update(toastId, { message: 'Failed to send email', type: 'error', duration: 3000 });
            }
        } catch (error) {
            toast.update(toastId, { message: 'Email service error', type: 'error', duration: 3000 });
        } finally {
            setIsSendingEmail(false);
        }
    };

    const paginate = (direction) => {
        const nextPage = direction === 'next' ? pagination.page + 1 : pagination.page - 1;
        if (nextPage < 1 || (pagination.pages && nextPage > pagination.pages)) return;
        setPagination(prev => ({ ...prev, page: nextPage }));
    };

    return (
        <div className="space-y-10 animate-fade-in p-2 pb-20">
            {/* Bills Header */}
            <div className="page-header-shell bg-white/40 backdrop-blur-md border border-white/40 shadow-xl shadow-slate-200/20 rounded-3xl p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-5">
                        <div className="w-16 h-16 rounded-3xl bg-linear-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <History size={28} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Buy Records</p>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Buy Bills</h1>
                            <p className="text-sm font-bold text-slate-500 pt-1">Review your shop's buy records.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleReset}
                            className="btn btn-secondary px-6 py-4 rounded-2xl flex items-center gap-2 group border-none bg-slate-100 hover:bg-slate-200"
                        >
                            <RefreshCcw size={18} className="text-slate-400 group-hover:rotate-180 transition-transform duration-500" />
                            <span className="font-black uppercase tracking-widest text-[10px] text-slate-700">Refresh List</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card p-8 border-none">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    <div className="space-y-2 lg:col-span-1">
                        <label className="form-label text-[10px] uppercase tracking-widest font-black text-slate-400">Search Bills</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by bill number or supplier..."
                                className="form-input pl-11 font-bold text-xs uppercase tracking-widest"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="form-label text-[10px] uppercase tracking-widest font-black text-slate-400">From Date</label>
                        <input
                            type="date"
                            className="form-input font-black"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="form-label text-[10px] uppercase tracking-widest font-black text-slate-400">To Date</label>
                        <input
                            type="date"
                            className="form-input font-black"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSearch}
                            disabled={isLoading}
                            className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-95"
                        >
                            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={16} />}
                            Search
                        </button>
                    </div>
                </div>
            </div>

            {/* Bill List */}
            <div className="glass-card p-0 border-none overflow-hidden">
                <div className="p-8 pb-4 flex items-center justify-between border-b border-slate-100 bg-white/40">
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Bills</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Recent shop buys</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bill Number</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Amount</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Status</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading bills...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : bills.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-dashed border-slate-200">
                                                <FileText size={32} className="text-slate-300" />
                                            </div>
                                            <h4 className="text-lg font-black text-slate-900 tracking-tight">No records found</h4>
                                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No purchase bills match your search.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                bills.map((bill) => {
                                    const date = bill.date || bill.createdAt;
                                    const displayDate = date ? new Date(date).toLocaleDateString('en-GB') : '-';
                                    const isPaid = bill.paymentStatus === 'paid';
                                    return (
                                        <tr key={bill._id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-sm group-hover:scale-110 transition-all">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 tracking-tight uppercase">{bill.billNumber}</p>
                                                        {bill.referenceInvoiceNumber && (
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">REF: {bill.referenceInvoiceNumber}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-xs font-black text-slate-900 tracking-tighter uppercase">{displayDate}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-sm font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">{bill.customer?.name || bill.partyName || 'Unknown Entity'}</p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Supplier</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-base font-black text-slate-900 tracking-tighter">{formatCurrency(bill.grandTotal || 0)}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                                    isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                                }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                                                    {isPaid ? 'Paid' : 'Pending'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center shadow-sm border border-blue-100"
                                                        onClick={() => openPreview(bill)}
                                                        title="View Details"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button
                                                        className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center shadow-sm border border-emerald-100"
                                                        onClick={() => handleDownloadPDF(bill)}
                                                        title="Download PDF"
                                                    >
                                                        <Download size={18} />
                                                    </button>
                                                    <button
                                                        className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white transition-all flex items-center justify-center shadow-sm border border-purple-100"
                                                        onClick={() => openEmailModal(bill)}
                                                        title="Send Email"
                                                    >
                                                        <Mail size={18} />
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

                {/* Professional Pagination */}
                {pagination.pages > 1 && (
                    <div className="px-8 py-6 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Showing <span className="text-slate-900 font-black">{(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-slate-900 font-black">{pagination.total}</span> Billing Records
                        </p>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => paginate('prev')}
                                disabled={pagination.page <= 1}
                                className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all flex items-center justify-center"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                                    const pageNum = i + 1;
                                    const isActive = pagination.page === pageNum;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                                            className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => paginate('next')}
                                disabled={pagination.page >= pagination.pages}
                                className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all flex items-center justify-center"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bill Preview Modal */}
            {showPreviewModal && selectedBill && (
                <div className="modal-overlay bg-slate-900/70 backdrop-blur-md p-4" onClick={() => setShowPreviewModal(false)}>
                    <div className="modal-content max-w-6xl border-none animate-scale-up" onClick={(e) => e.stopPropagation()}>
                        <div className="p-8 border-b flex items-center justify-between bg-slate-900 text-white rounded-t-[2.5rem]">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/10 backdrop-blur-md">
                                    <Eye size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black tracking-tighter">Purchase Bill Details</h3>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Bill Preview</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleDownloadPDF(selectedBill)}
                                    className="px-6 py-3 bg-white/10 hover:bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all border border-white/10 flex items-center gap-3"
                                >
                                    <Printer size={16} /> Download PDF
                                </button>
                                <button onClick={() => setShowPreviewModal(false)} className="w-12 h-12 rounded-xl bg-white/10 hover:bg-red-500 text-white flex items-center justify-center transition-all border border-white/10">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-10 overflow-y-auto max-h-[75vh] bg-slate-100 custom-scrollbar flex justify-center">
                            <div className="shadow-2xl bg-white rounded-lg">
                                <BillTemplate bill={selectedBill} settings={resolvedSettings} />
                            </div>
                        </div>
                        <div className="p-8 bg-white border-t border-slate-100 flex justify-between items-center rounded-b-[2.5rem]">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Buy bill details</p>
                             <button onClick={() => setShowPreviewModal(false)} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10">Close Preview</button>
                        </div>
                    </div>
                </div>
            )}

            <EmailActionModal
                open={Boolean(showEmailModal && selectedBill)}
                 title="Send via Email"
                 description={selectedBill ? `Send bill ${selectedBill.billNumber} (${formatCurrency(selectedBill.grandTotal)}) via email.` : ''}
                value={emailTo}
                onChange={setEmailTo}
                onClose={() => {
                    setShowEmailModal(false);
                    setEmailTo('');
                    setSelectedBill(null);
                }}
                onSubmit={handleEmailBill}
                isSubmitting={isSendingEmail}
            />
        </div>
    );
};

export default PurchaseBillingPage;
