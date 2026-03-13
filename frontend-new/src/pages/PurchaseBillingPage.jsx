import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, RefreshCcw, Eye, Download, Mail, X, Printer } from 'lucide-react';
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

    // Pull latest settings so company info is correct on PDF/email
    useEffect(() => {
        dispatch(fetchSettings());
    }, [dispatch]);

    useEffect(() => {
        loadBills();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            toast.error(error.response?.data?.message || 'Failed to load purchase bills');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = () => {
        setPagination((prev) => ({ ...prev, page: 1 }));
        loadBills({ page: 1 });
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
        await downloadInvoicePDF(bill, resolvedSettings, `${bill.billNumber || 'PURCHASE_BILL'}.pdf`);
    };

    const openEmailModal = (bill) => {
        setSelectedBill(bill);
        setEmailTo(pickDefaultRecipient(bill.customer?.email, user?.email));
        setShowEmailModal(true);
    };

    const handleEmailBill = async () => {
        const { hasValidRecipients } = getEmailRecipientValidation(emailTo);
        if (!selectedBill || !hasValidRecipients) {
            toast.warning('Please enter at least one valid recipient email');
            return;
        }
        setIsSendingEmail(true);
        try {
            const response = await emailAPI.sendBill(selectedBill._id, emailTo);
            if (response.data?.success) {
                toast.success(response.data?.message || 'Bill sent successfully');
                setShowEmailModal(false);
                setEmailTo('');
                setSelectedBill(null);
            } else {
                toast.error(response.data?.message || 'Failed to send bill');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send bill');
        } finally {
            setIsSendingEmail(false);
        }
    };

    const paginate = (direction) => {
        setPagination((prev) => {
            const nextPage = direction === 'next' ? prev.page + 1 : prev.page - 1;
            if (nextPage < 1 || (prev.pages && nextPage > prev.pages)) return prev;
            return { ...prev, page: nextPage };
        });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="page-header-shell">
                <div className="page-header-copy">
                    <p className="page-header-kicker">Purchase bill archive</p>
                    <h1 className="page-header-title">Purchase Billing</h1>
                    <p className="text-sm text-slate-600">Auto-generated bills from purchase entries with email and PDF actions.</p>
                </div>
                <div className="page-header-toolbar">
                    <button className="btn btn-ghost" onClick={handleReset}>
                        <RefreshCcw size={16} /> Reset
                    </button>
                </div>
            </div>

            <div className="page-filter-card">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="w-56">
                        <label className="form-label">Search</label>
                        <div className="page-search">
                            <Search size={16} className="page-search-icon" />
                            <input
                                type="text"
                                className="form-input pl-9"
                                placeholder="Bill no / purchase inv no / supplier"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="form-label">From</label>
                        <input
                            type="date"
                            className="form-input"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="form-label">To</label>
                        <input
                            type="date"
                            className="form-input"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={handleSearch} disabled={isLoading}>
                        <Search size={16} /> Search
                    </button>
                </div>
            </div>

            <div className="page-table-card">
                <div className="overflow-x-auto">
                    <table className="page-table">
                        <thead>
                            <tr>
                                <th>Bill No</th>
                                <th>Date</th>
                                <th>Supplier</th>
                                <th>Amount</th>
                                <th>Payment</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="page-empty-state">
                                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                    </td>
                                </tr>
                            ) : bills.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="page-empty-state">
                                        No purchase bills found for the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                bills.map((bill) => {
                                    const date = bill.date || bill.createdAt;
                                    const displayDate = date ? new Date(date).toLocaleDateString('en-GB') : '-';
                                    return (
                                        <tr key={bill._id}>
                                            <td className="font-semibold text-gray-900">
                                                <div>{bill.billNumber}</div>
                                                {bill.referenceInvoiceNumber ? (
                                                    <div className="text-xs font-medium text-gray-500">
                                                        Inv: {bill.referenceInvoiceNumber}
                                                    </div>
                                                ) : null}
                                            </td>
                                            <td>{displayDate}</td>
                                            <td className="text-gray-900">{bill.customer?.name || bill.partyName || '-'}</td>
                                            <td className="font-bold text-green-700">{formatCurrency(bill.grandTotal || 0)}</td>
                                            <td>
                                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                                                    style={{
                                                        backgroundColor: bill.paymentStatus === 'paid' ? '#dcfce7' : '#fef3c7',
                                                        color: bill.paymentStatus === 'paid' ? '#15803d' : '#92400e'
                                                    }}>
                                                    {bill.paymentStatus ? bill.paymentStatus.toUpperCase() : 'PENDING'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <button className="action-btn action-btn-blue" title="View" onClick={() => openPreview(bill)}>
                                                        <Eye size={18} />
                                                    </button>
                                                    <button className="action-btn action-btn-green" title="Download PDF" onClick={() => handleDownloadPDF(bill)}>
                                                        <Download size={18} />
                                                    </button>
                                                    <button className="action-btn action-btn-purple" title="Email Bill" onClick={() => openEmailModal(bill)}>
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

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="page-pagination">
                        <div className="text-sm text-gray-600">
                            Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                        </div>
                        <div className="page-pagination-group">
                            <button
                                onClick={() => paginate('prev')}
                                disabled={pagination.page <= 1}
                                className="page-pagination-btn"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => paginate('next')}
                                disabled={pagination.page >= pagination.pages}
                                className="page-pagination-btn"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            {showPreviewModal && selectedBill && (
                <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 flex justify-between items-center" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}>
                            <h3 className="text-lg font-semibold text-white">Purchase Bill Preview</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleDownloadPDF(selectedBill)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    <Printer size={16} />
                                    Print / PDF
                                </button>
                                <button onClick={() => setShowPreviewModal(false)} className="text-white hover:text-gray-200">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[80vh]">
                            <BillTemplate bill={selectedBill} settings={resolvedSettings} />
                        </div>
                    </div>
                </div>
            )}

            <EmailActionModal
                open={Boolean(showEmailModal && selectedBill)}
                title="Email Purchase Bill"
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
