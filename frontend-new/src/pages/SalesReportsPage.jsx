import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Search, TrendingUp, X, Printer, FileSpreadsheet, Mail, FileText } from 'lucide-react';
import ReportHeader from '../components/reports/ReportHeader';
import { exportToExcelStyled } from '../utils/exportToExcel';
import { printReport } from '../utils/printReport';
import { reportsAPI, emailAPI } from '../services/api';
import { EmailActionModal, useToast } from '../components/common';
import { formatDate } from '../utils/dateUtils';
import { getEmailRecipientValidation, pickDefaultRecipient } from '../utils/emailUtils';

const SalesReportsPage = () => {
    const toast = useToast();
    const { user } = useSelector((state) => state.auth);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [invoiceNo, setInvoiceNo] = useState('');
    const [reportData, setReportData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [emailConfigured, setEmailConfigured] = useState(null);

    // Initialize with current month dates
    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        setFromDate(firstDay.toISOString().split('T')[0]);
        setToDate(today.toISOString().split('T')[0]);
    }, []);

    useEffect(() => {
        let isCancelled = false;

        const loadEmailStatus = async () => {
            try {
                const response = await emailAPI.getStatus();
                if (isCancelled) return;
                setEmailConfigured(Boolean(response?.data?.configured));
            } catch (error) {
                console.error('Error loading email status:', error);
            }
        };

        loadEmailStatus();

        return () => {
            isCancelled = true;
        };
    }, []);

    const handleSearch = async () => {
        setIsLoading(true);
        try {
            const response = await reportsAPI.getSalesReport({
                fromDate,
                toDate,
                customer: customerSearch,
                invNo: invoiceNo
            });

            setReportData(response.data.data || []);
        } catch (error) {
            console.error('Error fetching sales data:', error);
            toast.error('Error loading sales data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = () => {
        if (reportData.length === 0) {
            toast.warning('No data to export');
            return;
        }

        const columns = [
            { key: 'sno', header: 'S.No', width: 8, align: 'left' },
            { key: 'date', header: 'Date', width: 14, align: 'left' },
            { key: 'invNo', header: 'Invoice No', width: 16, align: 'left' },
            { key: 'item', header: 'Item', width: 28, align: 'left' },
            { key: 'rate', header: 'Rate', width: 14, align: 'right' },
            { key: 'qty', header: 'Quantity', width: 12, align: 'right' },
            { key: 'total', header: 'Total', width: 16, align: 'right' }
        ];

        const formattedData = reportData.map(row => ({
            ...row,
            date: formatDate(row.date),
            total: row.rate * row.qty
        }));

        const grandTotals = {
            rate: formattedData.reduce((sum, r) => sum + (r.rate || 0), 0),
            qty: formattedData.reduce((sum, r) => sum + (r.qty || 0), 0),
            total: formattedData.reduce((sum, r) => sum + (r.total || 0), 0)
        };

        exportToExcelStyled({
            title: 'Sales Report',
            businessName: 'Sri Ram Fashions',
            fromDate,
            toDate,
            columns,
            data: formattedData,
            totals: grandTotals,
            filename: 'sales_report',
            sheetName: 'Sales Report'
        });
    };

    const handlePrint = () => {
        printReport('printable-report');
    };

    const handleEmail = async () => {
        if (reportData.length === 0) {
            toast.warning('No data to email');
            return;
        }

        if (emailConfigured === false) {
            toast.error('Email service is not configured on the server');
            return;
        }

        const toastId = toast.loading('Preparing sales report email...');
        try {
            setIsSendingEmail(true);
            const response = await emailAPI.sendReport({
                type: 'sales',
                fromDate,
                toDate,
                data: reportData
            });

            if (response.data.success) {
                toast.update(toastId, { 
                    message: response.data.message || 'Sales report is being sent to admin', 
                    type: 'success',
                    duration: 5000 
                });
            } else {
                toast.update(toastId, { 
                    message: response.data.message || 'Failed to initiate email', 
                    type: 'error',
                    duration: 5000 
                });
            }
        } catch (error) {
            console.error('Error emailing report:', error);
            toast.update(toastId, { 
                message: error.response?.data?.message || 'Error emailing report', 
                type: 'error',
                duration: 5000 
            });
        } finally {
            setIsSendingEmail(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="page-header-shell">
                <div className="flex items-start gap-4">
                    <div className="page-icon-badge">
                        <TrendingUp size={20} />
                    </div>
                    <div className="page-header-copy">
                        <p className="page-header-kicker">Sales performance reports</p>
                        <h1 className="page-header-title">Sales Reports</h1>
                    </div>
                </div>
            </div>

            <div className="page-filter-card">
                <div className="flex flex-wrap items-end gap-3">
                    {/* Inv No */}
                    <div className="shrink-0 w-32">
                        <label className="form-label">Inv No</label>
                        <input
                            type="text"
                            placeholder="Enter invoice num"
                            className="form-input"
                            value={invoiceNo}
                            onChange={(e) => setInvoiceNo(e.target.value)}
                        />
                    </div>

                    {/* Customer */}
                    <div className="shrink-0 w-48">
                        <label className="form-label">Customer</label>
                        <input
                            type="text"
                            placeholder="Enter customer name"
                            className="form-input"
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                        />
                    </div>

                    {/* From Date */}
                    <div className="shrink-0 w-36">
                        <label className="form-label">From Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                    </div>

                    {/* To Date */}
                    <div className="shrink-0 w-36">
                        <label className="form-label">To Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                        />
                    </div>

                    {/* Search */}
                    <button
                        className="btn btn-primary"
                        onClick={handleSearch}
                        disabled={isLoading}
                    >
                        <Search size={16} />
                        Search
                    </button>

                    {/* Clear */}
                    <button
                        className="btn btn-secondary"
                        onClick={() => { setCustomerSearch(''); setInvoiceNo(''); setFromDate(''); setToDate(''); }}
                    >
                        <X size={16} />
                        Clear
                    </button>

                    {/* Divider */}
                    <div className="h-8 w-px bg-gray-300 mx-1 hidden md:block"></div>

                    {/* Actions */}
                    <button className="btn text-white bg-green-600 hover:bg-green-700" onClick={handleExport}>
                        <FileSpreadsheet size={16} />
                        Excel
                    </button>

                    <button className="btn btn-primary" onClick={handlePrint}>
                        <Printer size={16} />
                        Print
                    </button>

                    <button 
                        className="btn text-white bg-blue-600 hover:bg-blue-700" 
                        onClick={handleEmail}
                        disabled={isSendingEmail || isLoading}
                    >
                        <Mail size={16} className={isSendingEmail ? 'animate-spin' : ''} />
                        {isSendingEmail ? 'Sending...' : 'Mail'}
                    </button>

                    <button className="btn btn-ghost border" onClick={() => setShowInvoiceModal(true)}>
                        <FileText size={16} />
                    </button>
                </div>
            </div>

            {/* Report Content */}
            <div className="page-table-card print:shadow-none" id="printable-report">
                <div className="p-6">
                    <ReportHeader
                        reportTitle="Sales Report"
                        fromDate={formatDate(fromDate)}
                        toDate={formatDate(toDate)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="page-table">
                        <thead>
                            <tr>
                                <th className="print:text-black">S.No</th>
                                <th className="print:text-black">Date</th>
                                <th className="print:text-black">Inv No</th>
                                <th className="print:text-black">Item</th>
                                <th className="text-right print:text-black">Rate</th>
                                <th className="text-right print:text-black">Qty</th>
                                <th className="text-right print:text-black">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.length > 0 ? (
                                <>
                                    {reportData.map((row) => (
                                        <tr key={row.sno} className="border-b border-gray-200 hover:bg-gray-50 print:hover:bg-transparent">
                                            <td className="py-4 px-4 font-medium text-gray-900 print:text-black">{row.sno}</td>
                                            <td className="py-4 px-4 font-medium text-gray-900 print:text-black">{formatDate(row.date)}</td>
                                            <td className="py-4 px-4 font-medium text-gray-900 print:text-black">{row.invNo}</td>
                                            <td className="py-4 px-4 font-medium text-gray-900 print:text-black">{row.item}</td>
                                            <td className="py-4 px-4 text-right font-semibold text-gray-900 print:text-black">₹{row.rate}</td>
                                            <td className="py-4 px-4 text-right font-semibold text-gray-900 print:text-black">{row.qty}</td>
                                            <td className="py-4 px-4 text-right font-semibold text-gray-900 print:text-black">₹{row.rate * row.qty}</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                                        <td colSpan="6" className="py-4 px-4 text-right font-bold text-gray-900 print:text-black">Grand Total:</td>
                                        <td className="py-4 px-4 text-right font-bold text-blue-600 print:text-black text-lg">₹{reportData.reduce((sum, row) => sum + (row.rate * row.qty), 0).toLocaleString('en-IN')}</td>
                                    </tr>
                                </>
                            ) : (
                                <tr>
                                    <td colSpan="7" className="py-8 text-center text-gray-600 font-medium">
                                        {isLoading ? 'Loading...' : 'No data available. Click SEARCH to load sales data.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Invoice View Modal */}
            {showInvoiceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowInvoiceModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-[230mm] w-full max-h-[95vh] overflow-hidden mx-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-900">Invoice View - Sales Report</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors">
                                    <Printer size={16} />
                                    Print
                                </button>
                                <button onClick={() => setShowInvoiceModal(false)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 overflow-auto max-h-[calc(95vh-80px)]" style={{ backgroundColor: '#e5e5e5' }}>
                            <div className="bg-white mx-auto shadow-lg" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', boxSizing: 'border-box' }}>
                                <ReportHeader reportTitle="Sales Report" fromDate={formatDate(fromDate)} toDate={formatDate(toDate)} />
                                <table className="w-full border-collapse mt-4">
                                    <thead>
                                        <tr className="bg-gray-100 border-y-2 border-gray-300">
                                            <th className="text-left py-3 px-3 font-bold text-gray-900 text-sm">S.No</th>
                                            <th className="text-left py-3 px-3 font-bold text-gray-900 text-sm">Date</th>
                                            <th className="text-left py-3 px-3 font-bold text-gray-900 text-sm">Inv No</th>
                                            <th className="text-left py-3 px-3 font-bold text-gray-900 text-sm">Item</th>
                                            <th className="text-right py-3 px-3 font-bold text-gray-900 text-sm">Rate</th>
                                            <th className="text-right py-3 px-3 font-bold text-gray-900 text-sm">Qty</th>
                                            <th className="text-right py-3 px-3 font-bold text-gray-900 text-sm">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.map((row) => (
                                            <tr key={row.sno} className="border-b border-gray-200">
                                                <td className="py-2 px-3 text-gray-900 text-sm">{row.sno}</td>
                                                <td className="py-2 px-3 text-gray-900 text-sm">{formatDate(row.date)}</td>
                                                <td className="py-2 px-3 text-gray-900 text-sm">{row.invNo}</td>
                                                <td className="py-2 px-3 text-gray-900 text-sm">{row.item}</td>
                                                <td className="py-2 px-3 text-right text-gray-900 text-sm">₹{row.rate}</td>
                                                <td className="py-2 px-3 text-right text-gray-900 text-sm">{row.qty}</td>
                                                <td className="py-2 px-3 text-right text-gray-900 text-sm">₹{row.rate * row.qty}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-gray-100 border-t-2 border-gray-300">
                                            <td colSpan="6" className="py-3 px-3 text-right font-bold text-gray-900 text-sm">Grand Total:</td>
                                            <td className="py-3 px-3 text-right font-bold text-blue-600 text-sm">₹{reportData.reduce((sum, row) => sum + (row.rate * row.qty), 0).toLocaleString('en-IN')}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default SalesReportsPage;
