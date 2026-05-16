import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, RefreshCcw, Eye, Download, Mail, X, Printer, FileText, History, ShieldCheck, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import BillTemplate from '../components/BillTemplate';
import { billsAPI, emailAPI } from '../services/api';
import { EmailActionModal, useToast } from '../components/common';
import { downloadInvoicePDF, generateInvoicePdfFile, printInvoice, shareInvoice } from '../utils/invoiceGenerator';
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
    const previewBillRef = useRef(null);

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

    const getPreviewElement = (bill) =>
        showPreviewModal && selectedBill?._id === bill?._id ? previewBillRef.current : null;

    const handleDownloadPDF = async (bill) => {
        const toastId = toast.loading('Generating PDF...');
        try {
            await downloadInvoicePDF(
                bill,
                resolvedSettings,
                `${bill.billNumber || 'PURCHASE_BILL'}.pdf`,
                { element: getPreviewElement(bill) }
            );
            toast.update(toastId, { message: 'PDF downloaded successfully', type: 'success', duration: 3000 });
        } catch (error) {
            toast.update(toastId, { message: 'Failed to generate PDF', type: 'error', duration: 3000 });
        }
    };

    const handlePrintBill = async (bill) => {
        const toastId = toast.loading('Opening print...');
        try {
            await printInvoice(bill, resolvedSettings, { element: getPreviewElement(bill) });
            toast.update(toastId, { message: 'Print opened', type: 'success', duration: 2000 });
        } catch (error) {
            toast.update(toastId, { message: 'Unable to print bill', type: 'error', duration: 3000 });
        }
    };

    const handleShareBill = async (bill) => {
        const toastId = toast.loading('Preparing invoice...');
        try {
            const result = await shareInvoice(bill, resolvedSettings, {
                element: getPreviewElement(bill),
                filename: `${bill.billNumber || 'PURCHASE_BILL'}.pdf`,
                title: 'Invoice From SRI RAM FASHIONS',
                text: `Invoice ${bill.billNumber || ''}`
            });

            toast.update(toastId, {
                message: result.shared ? 'Invoice shared successfully' : 'Share unavailable. PDF downloaded instead.',
                type: 'success',
                duration: 3000
            });
        } catch (error) {
            toast.update(toastId, { message: 'Unable to share invoice', type: 'error', duration: 3000 });
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
            const invoiceFile = await generateInvoicePdfFile(selectedBill, resolvedSettings, {
                element: getPreviewElement(selectedBill),
                filename: `${selectedBill.billNumber || 'PURCHASE_BILL'}.pdf`
            });

            const response = await emailAPI.sendBillPdf({
                to: emailTo,
                billNumber: selectedBill.billNumber,
                customerName: selectedBill.customer?.name,
                pdfFile: invoiceFile
            });
            if (response.data?.success) {
                toast.update(toastId, { message: 'Email sent successfully', type: 'success', duration: 3000 });
                setShowEmailModal(false);
                setEmailTo('');
                if (!showPreviewModal) {
                    setSelectedBill(null);
                }
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
            {/* Professional Header */}
            <div className="page-header-shell bg-white/60 backdrop-blur-2xl border border-white/50 shadow-premium rounded-[2.5rem] p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-start gap-6">
                        <div className="w-20 h-20 rounded-4xl bg-linear-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white shadow-2xl shadow-blue-500/20 group-hover:scale-105 transition-transform duration-500">
                            <History size={32} />
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em]">Purchases</p>
                            <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Purchases</h1>
                            <p className="text-sm font-bold text-slate-500 pt-1">View and manage all your purchase bills here.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            className="btn btn-secondary px-8 py-4 rounded-2xl flex items-center gap-3 group border-none bg-slate-100 hover:bg-slate-200 transition-all" 
                            onClick={handleReset}
                        >
                            <RefreshCcw size={20} className="text-slate-500 group-hover:rotate-180 transition-transform duration-500" />
                            <span className="font-black uppercase tracking-widest text-[11px] text-slate-700">Refresh</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Strategic Filters */}
            <div className="glass-card p-10 border-none relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-end">
                    <div className="space-y-3 lg:col-span-1">
                        <label className="form-label">Search</label>
                        <div className="relative">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Invoice # or Supplier Name..."
                                className="form-input pl-12 py-4 bg-slate-50/50 border-slate-100 hover:bg-white transition-all font-bold"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="form-label">Date Range Start</label>
                        <div className="relative">
                            <input
                                type="date"
                                className="form-input py-4 bg-slate-50/50 border-slate-100 hover:bg-white transition-all font-black"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="form-label">Date Range End</label>
                        <div className="relative">
                            <input
                                type="date"
                                className="form-input py-4 bg-slate-50/50 border-slate-100 hover:bg-white transition-all font-black"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleSearch}
                            disabled={isLoading}
                            className="flex-1 py-4 bg-slate-900 text-white rounded-[1.25rem] font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-3 hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                        >
                            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={18} />}
                            Search
                        </button>
                    </div>
                </div>
            </div>

            {/* Bill List Table */}
            <div className="page-table-card">
                <div className="p-10 pb-6 flex items-center justify-between">
                    <div className="space-y-1">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Purchases</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Verified Transaction Records</p>
                    </div>
                    <div className="flex items-center gap-3 px-5 py-2.5 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100/50">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                        <span className="text-[11px] font-black uppercase tracking-widest">{pagination?.total || 0} Records</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="page-table">
                        <thead>
                            <tr>
                                <th className="px-10 py-5">Bill Number</th>
                                <th className="px-10 py-5">Date</th>
                                <th className="px-10 py-5">Supplier</th>
                                <th className="px-10 py-5">Amount</th>
                                <th className="px-10 py-5">Status</th>
                                <th className="px-10 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="px-10 py-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-6">
                                            <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : bills.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-10 py-32 text-center">
                                        <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-dashed border-slate-200">
                                            <FileText size={40} className="text-slate-300" />
                                        </div>
                                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter mb-2">No Records Found</h4>
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Adjust your search parameters to find records.</p>
                                    </td>
                                </tr>
                            ) : (
                                bills.map((bill) => {
                                    const date = bill.date || bill.createdAt;
                                    const displayDate = date ? new Date(date).toLocaleDateString('en-GB') : '-';
                                    const isPaid = bill.paymentStatus === 'paid';
                                    return (
                                        <tr key={bill._id} className="group">
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all duration-500 shadow-sm">
                                                        <FileText size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="text-base font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors uppercase">{bill.billNumber}</p>
                                                        {bill.referenceInvoiceNumber && (
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Ref: {bill.referenceInvoiceNumber}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <span className="text-sm font-black text-slate-900 tracking-tighter uppercase">{displayDate}</span>
                                            </td>
                                            <td className="px-10 py-8">
                                                <p className="text-base font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">{bill.customer?.name || bill.partyName || 'Unknown Entity'}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Registered Supplier</p>
                                            </td>
                                            <td className="px-10 py-8">
                                                <span className="text-xl font-black text-slate-900 tracking-tighter">{formatCurrency(bill.grandTotal || 0)}</span>
                                            </td>
                                            <td className="px-10 py-8">
                                                <span className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border ${
                                                    isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                                                }`}>
                                                    <div className={`w-2 h-2 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                                                    {isPaid ? 'Settled' : 'Unpaid'}
                                                </span>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex justify-end gap-3 opacity-70 group-hover:opacity-100 transition-all duration-300">
                                                    <button
                                                        className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center shadow-sm border border-blue-100"
                                                        onClick={() => openPreview(bill)}
                                                        title="View Bill"
                                                    >
                                                        <Eye size={20} />
                                                    </button>
                                                    <button
                                                        className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center shadow-sm border border-emerald-100"
                                                        onClick={() => handleDownloadPDF(bill)}
                                                        title="Download PDF"
                                                    >
                                                        <Download size={20} />
                                                    </button>
                                                    <button
                                                        className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white transition-all flex items-center justify-center shadow-sm border border-purple-100"
                                                        onClick={() => openEmailModal(bill)}
                                                        title="Email Bill"
                                                    >
                                                        <Mail size={20} />
                                                    </button>
                                                    <button
                                                        className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center shadow-sm border border-indigo-100"
                                                        onClick={() => handleShareBill(bill)}
                                                        title="Share Bill"
                                                    >
                                                        <Share2 size={20} />
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
                    <div className="page-pagination p-10 bg-slate-50/50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Showing <span className="text-slate-900 font-black">{(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)}</span> / <span className="text-slate-900 font-black">{pagination.total}</span> Records
                        </p>
                        
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => paginate('prev')}
                                disabled={pagination.page <= 1}
                                className="action-btn bg-white border border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600 disabled:opacity-30 shadow-sm"
                            >
                                <ChevronLeft size={22} />
                            </button>
                            <div className="flex items-center gap-2">
                                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                                    const pageNum = i + 1;
                                    const isActive = pagination.page === pageNum;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                                            className={`w-11 h-11 rounded-2xl text-[11px] font-black transition-all ${isActive ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30 border-none' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'}`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => paginate('next')}
                                disabled={pagination.page >= pagination.pages}
                                className="action-btn bg-white border border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600 disabled:opacity-30 shadow-sm"
                            >
                                <ChevronRight size={22} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bill Preview Modal */}
            {showPreviewModal && selectedBill && (
                <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
                    <div className="modal-content max-w-6xl border-none shadow-3xl" onClick={(e) => e.stopPropagation()}>
                        <div className="px-10 py-10 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                            <div className="flex items-center gap-8">
                                <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center text-white border border-white/10 backdrop-blur-md shadow-2xl">
                                    <FileText size={32} />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black tracking-tighter">Purchase Bill</h3>
                                    <div className="flex items-center gap-4 mt-1">
                                        <span className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-300 border border-white/5">Invoice #: {selectedBill.billNumber}</span>
                                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Purchase Bill View</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => handlePrintBill(selectedBill)}
                                    className="px-8 py-4 bg-white/10 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all border border-white/10 flex items-center gap-4"
                                >
                                    <Printer size={20} /> Print Bill
                                </button>
                                <button
                                    onClick={() => handleDownloadPDF(selectedBill)}
                                    className="px-8 py-4 bg-white/10 hover:bg-blue-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all border border-white/10 flex items-center gap-4"
                                >
                                    <Download size={20} /> Download PDF
                                </button>
                                <button
                                    onClick={() => openEmailModal(selectedBill)}
                                    className="px-8 py-4 bg-white/10 hover:bg-purple-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all border border-white/10 flex items-center gap-4"
                                >
                                    <Mail size={20} /> Send Email
                                </button>
                                <button
                                    onClick={() => handleShareBill(selectedBill)}
                                    className="px-8 py-4 bg-white/10 hover:bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all border border-white/10 flex items-center gap-4"
                                >
                                    <Share2 size={20} /> Share
                                </button>
                                <button onClick={() => setShowPreviewModal(false)} className="w-14 h-14 rounded-2xl bg-white/10 hover:bg-red-500 text-white flex items-center justify-center transition-all border border-white/10">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="p-0 overflow-y-auto max-h-[75vh] bg-slate-100 custom-scrollbar flex justify-center py-16">
                            <div className="shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] bg-white rounded-lg transform scale-[0.95] origin-top">
                                <BillTemplate ref={previewBillRef} bill={selectedBill} settings={resolvedSettings} />
                            </div>
                        </div>
                        <div className="px-10 py-8 bg-white border-t border-slate-100 flex justify-between items-center">
                             <div className="flex items-center gap-3">
                                 <ShieldCheck size={20} className="text-blue-500" />
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Verified Bill</span>
                             </div>
                             <button onClick={() => setShowPreviewModal(false)} className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98]">Close Archive View</button>
                        </div>
                    </div>
                </div>
            )}

            <EmailActionModal
                open={Boolean(showEmailModal && selectedBill)}
                 title="Email Bill"
                 description={selectedBill ? `Send bill ${selectedBill.billNumber} to your supplier. Total: ${formatCurrency(selectedBill.grandTotal)}.` : ''}
                value={emailTo}
                onChange={setEmailTo}
                onClose={() => {
                    setShowEmailModal(false);
                    setEmailTo('');
                    if (!showPreviewModal) {
                        setSelectedBill(null);
                    }
                }}
                onSubmit={handleEmailBill}
                isSubmitting={isSendingEmail}
            />
        </div>
    );
};

export default PurchaseBillingPage;
