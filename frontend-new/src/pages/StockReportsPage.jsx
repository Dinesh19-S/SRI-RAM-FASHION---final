import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Package, X, Printer, Search, FileSpreadsheet, Mail } from 'lucide-react';
import ReportHeader from '../components/reports/ReportHeader';
import { exportToExcelStyled } from '../utils/exportToExcel';
import { printReport } from '../utils/printReport';
import { reportsAPI, emailAPI } from '../services/api';
import { EmailActionModal, useToast } from '../components/common';
import { getEmailRecipientValidation, pickDefaultRecipient } from '../utils/emailUtils';

const StockReportsPage = () => {
    const toast = useToast();
    const { user } = useSelector((state) => state.auth);
    const [nameSearch, setNameSearch] = useState('');
    const [sizeFilter, setSizeFilter] = useState('');
    const [reportData, setReportData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [emailConfigured, setEmailConfigured] = useState(null);

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
            const response = await reportsAPI.getStockReport({
                name: nameSearch,
                size: sizeFilter
            });

            setReportData(response.data.data || []);
        } catch (error) {
            console.error('Error fetching stock data:', error);
            toast.error('Error loading stock data. Please try again.');
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
            { key: 'item', header: 'Item', width: 28, align: 'left' },
            { key: 'size', header: 'Size', width: 10, align: 'left' },
            { key: 'qty', header: 'Quantity', width: 12, align: 'right' },
            { key: 'rate', header: 'Rate', width: 14, align: 'right' },
            { key: 'total', header: 'Total', width: 16, align: 'right' }
        ];

        const grandTotals = {
            qty: reportData.reduce((sum, r) => sum + (r.qty || 0), 0),
            rate: reportData.reduce((sum, r) => sum + (r.rate || 0), 0),
            total: reportData.reduce((sum, r) => sum + (r.total || 0), 0)
        };

        exportToExcelStyled({
            title: 'Stock Report',
            businessName: 'Sri Ram Fashions',
            columns,
            data: reportData,
            totals: grandTotals,
            filename: 'stock_report',
            sheetName: 'Stock Report'
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

        const toastId = toast.loading('Preparing stock report email...');
        try {
            setIsSendingEmail(true);
            const today = new Date().toISOString().split('T')[0];
            const response = await emailAPI.sendReport({
                type: 'stock',
                fromDate: today,
                toDate: today,
                data: reportData
            });

            if (response.data.success) {
                toast.update(toastId, { 
                    message: response.data.message || 'Stock report is being sent to admin', 
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
                        <Package size={20} />
                    </div>
                    <div className="page-header-copy">
                        <p className="page-header-kicker">Inventory and stock reports</p>
                        <h1 className="page-header-title">Stock</h1>
                    </div>
                </div>
            </div>

            <div className="page-filter-card">
                <div className="flex flex-wrap items-end gap-3">
                    {/* Name */}
                    <div className="shrink-0 w-64">
                        <label className="form-label">Name</label>
                        <input
                            type="text"
                            placeholder="Enter product name"
                            className="form-input"
                            value={nameSearch}
                            onChange={(e) => setNameSearch(e.target.value)}
                        />
                    </div>

                    {/* Size */}
                    <div className="shrink-0 w-32">
                        <label className="form-label">Size</label>
                        <select
                            className="form-input"
                            value={sizeFilter}
                            onChange={(e) => setSizeFilter(e.target.value)}
                        >
                            <option value="">All Sizes</option>
                            <option value="S">S</option>
                            <option value="M">M</option>
                            <option value="L">L</option>
                            <option value="XL">XL</option>
                            <option value="XXL">XXL</option>
                        </select>
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
                        onClick={() => { setNameSearch(''); setSizeFilter(''); }}
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
                </div>
            </div>

            <div className="page-table-card print:shadow-none" id="printable-report">
                <div className="p-6">
                    <ReportHeader
                        reportTitle="Stock Report"
                        additionalInfo={`Date: ${new Date().toLocaleDateString('en-GB').replace(/\//g, '.')}`}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="page-table">
                        <thead>
                            <tr className="border-b-2 border-gray-300">
                                <th className="text-left py-3 px-4 font-semibold text-gray-700 print:text-black">S.No</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700 print:text-black">Item</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700 print:text-black">Size</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-700 print:text-black">Qty</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-700 print:text-black">Rate</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-700 print:text-black">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.length > 0 ? (
                                <>
                                    {reportData.map((row) => (
                                        <tr key={row.sno} className="border-b border-gray-200 hover:bg-gray-50 print:hover:bg-transparent">
                                            <td className="py-3 px-4 text-gray-900 print:text-black">{row.sno}</td>
                                            <td className="py-3 px-4 text-gray-900 print:text-black">{row.item}</td>
                                            <td className="py-3 px-4 text-gray-900 print:text-black">{row.size}</td>
                                            <td className="py-3 px-4 text-right text-gray-900 print:text-black">{row.qty}</td>
                                            <td className="py-3 px-4 text-right text-gray-900 print:text-black">{row.rate}</td>
                                            <td className="py-3 px-4 text-right text-gray-900 print:text-black">{row.total}</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                                        <td colSpan="5" className="py-4 px-4 text-right font-bold text-gray-900 print:text-black">Grand Total:</td>
                                        <td className="py-4 px-4 text-right font-bold text-blue-600 print:text-black text-lg">₹{reportData.reduce((sum, row) => sum + (row.total || 0), 0).toLocaleString('en-IN')}</td>
                                    </tr>
                                </>
                            ) : (
                                <tr>
                                    <td colSpan="6" className="py-8 text-center text-gray-500">
                                        {isLoading ? 'Loading...' : 'No data available. Click SEARCH to load stock data.'}
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
                            <h3 className="text-lg font-semibold text-gray-900">Invoice View - Stock Report</h3>
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
                                <ReportHeader reportTitle="Stock Report" additionalInfo={`Date: ${new Date().toLocaleDateString('en-GB').replace(/\//g, '.')}`} />
                                <table className="w-full border-collapse mt-4">
                                    <thead>
                                        <tr className="bg-gray-100 border-y-2 border-gray-300">
                                            <th className="text-left py-3 px-3 font-bold text-gray-900 text-sm">S.No</th>
                                            <th className="text-left py-3 px-3 font-bold text-gray-900 text-sm">Item</th>
                                            <th className="text-left py-3 px-3 font-bold text-gray-900 text-sm">Size</th>
                                            <th className="text-right py-3 px-3 font-bold text-gray-900 text-sm">Qty</th>
                                            <th className="text-right py-3 px-3 font-bold text-gray-900 text-sm">Rate</th>
                                            <th className="text-right py-3 px-3 font-bold text-gray-900 text-sm">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.map((row) => (
                                            <tr key={row.sno} className="border-b border-gray-200">
                                                <td className="py-2 px-3 text-gray-900 text-sm">{row.sno}</td>
                                                <td className="py-2 px-3 text-gray-900 text-sm">{row.item}</td>
                                                <td className="py-2 px-3 text-gray-900 text-sm">{row.size}</td>
                                                <td className="py-2 px-3 text-right text-gray-900 text-sm">{row.qty}</td>
                                                <td className="py-2 px-3 text-right text-gray-900 text-sm">{row.rate}</td>
                                                <td className="py-2 px-3 text-right text-gray-900 text-sm">{row.total}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-gray-100 border-t-2 border-gray-300">
                                            <td colSpan="5" className="py-3 px-3 text-right font-bold text-gray-900 text-sm">Grand Total:</td>
                                            <td className="py-3 px-3 text-right font-bold text-blue-600 text-sm">₹{reportData.reduce((sum, row) => sum + (row.total || 0), 0).toLocaleString('en-IN')}</td>
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

export default StockReportsPage;
