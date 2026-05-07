import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Search, TrendingUp, X, Printer, FileSpreadsheet, Mail, FileText, ChevronLeft, ChevronRight, Zap, Filter, ArrowUpRight, ShieldCheck, Download, Send, Package } from 'lucide-react';
import ReportHeader from '../components/reports/ReportHeader';
import { exportToExcelStyled } from '../utils/exportToExcel';
import { printReport } from '../utils/printReport';
import { reportsAPI, emailAPI } from '../services/api';
import { useToast } from '../components/common';
import { formatDate } from '../utils/dateUtils';

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
        return () => { isCancelled = true; };
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
            if (response.data.data?.length > 0) {
                toast.success(`Found ${response.data.data.length} sales records`);
            } else {
                toast.info('No sales found for the selected filters');
            }
        } catch (error) {
            console.error('Error fetching sales data:', error);
            toast.error('Failed to load sales reports');
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
            { key: 'customerName', header: 'Customer Name', width: 22, align: 'left' },
            { key: 'gstin', header: 'GST No', width: 20, align: 'left' },
            { key: 'item', header: 'Item', width: 28, align: 'left' },
            { key: 'rate', header: 'Rate', width: 12, align: 'right' },
            { key: 'qty', header: 'Qty', width: 10, align: 'right' },
            { key: 'taxable', header: 'Taxable', width: 14, align: 'right' },
            { key: 'cgst', header: 'CGST', width: 12, align: 'right' },
            { key: 'sgst', header: 'SGST', width: 12, align: 'right' },
            { key: 'igst', header: 'IGST', width: 12, align: 'right' },
            { key: 'total', header: 'Total', width: 16, align: 'right' }
        ];

        const formattedData = reportData.map(row => ({
            ...row,
            date: formatDate(row.date),
            taxable: row.taxableAmount || (row.rate * row.qty),
            cgst: row.cgst || 0,
            sgst: row.sgst || 0,
            igst: row.igst || 0,
            total: row.total || (row.rate * row.qty)
        }));

        const grandTotals = {
            qty: formattedData.reduce((sum, r) => sum + (Number(r.qty) || 0), 0),
            taxable: formattedData.reduce((sum, r) => sum + (Number(r.taxable) || 0), 0),
            cgst: formattedData.reduce((sum, r) => sum + (Number(r.cgst) || 0), 0),
            sgst: formattedData.reduce((sum, r) => sum + (Number(r.sgst) || 0), 0),
            igst: formattedData.reduce((sum, r) => sum + (Number(r.igst) || 0), 0),
            total: formattedData.reduce((sum, r) => sum + (Number(r.total) || 0), 0)
        };

        exportToExcelStyled({
            title: 'Sales Report',
            businessName: 'Sri Ram Fashions',
            fromDate,
            toDate,
            columns,
            data: formattedData,
            totals: grandTotals,
            filename: `sales_report_${fromDate}_to_${toDate}`,
            sheetName: 'Sales'
        });
        toast.success('Sales report exported successfully');
    };

    const handlePrint = () => {
        printReport('printable-report');
    };

    const handleEmail = async () => {
        if (reportData.length === 0) {
            toast.warning('No data to send');
            return;
        }

        if (emailConfigured === false) {
            toast.error('Email is not configured');
            return;
        }

        const toastId = toast.loading('Sending report...');
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
                    message: 'Report sent successfully', 
                    type: 'success',
                    duration: 5000 
                });
            } else {
                toast.update(toastId, { 
                    message: 'Failed to send report', 
                    type: 'error',
                    duration: 5000 
                });
            }
        } catch (error) {
            console.error('Error emailing report:', error);
            toast.update(toastId, { 
                message: 'Failed to send report', 
                type: 'error',
                duration: 5000 
            });
        } finally {
            setIsSendingEmail(false);
        }
    };

    const totalSales = reportData.reduce((sum, row) => sum + (row.total || (row.rate * row.qty)), 0);
    const totalQty = reportData.reduce((sum, row) => sum + (row.qty || 0), 0);

    return (
        <div className="space-y-10 animate-fade-in p-2 pb-20">
            {/* Reports Header */}
            <div className="page-header-shell bg-white/40 backdrop-blur-md border border-white/40 shadow-xl shadow-slate-200/20 rounded-3xl p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-5">
                        <div className="w-16 h-16 rounded-3xl bg-linear-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <TrendingUp size={28} />
                        </div>
                        <div className="space-y-1">
                             <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Sell Reports</p>
                             <h1 className="text-4xl font-black text-slate-900 tracking-tight">Sell Records</h1>
                             <p className="text-sm font-bold text-slate-500 pt-1">Review your shop sales.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="btn btn-secondary px-6 py-4 rounded-2xl flex items-center gap-2 group border-none bg-slate-100 hover:bg-slate-200"
                        >
                            <FileSpreadsheet size={18} className="text-emerald-600" />
                            <span className="font-black uppercase tracking-widest text-[10px] text-slate-700">Export XLSX</span>
                        </button>
                        <button
                            onClick={handleEmail}
                            disabled={isSendingEmail || isLoading}
                            className="btn btn-secondary px-6 py-4 rounded-2xl flex items-center gap-2 group border-none bg-blue-50 hover:bg-blue-100"
                        >
                            <Mail size={18} className={`text-blue-600 ${isSendingEmail ? 'animate-spin' : ''}`} />
                             <span className="font-black uppercase tracking-widest text-[10px] text-blue-700">Send Email</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="glass-card p-8 border-none">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
                    <div className="space-y-2">
                        <label className="form-label">Invoice Number</label>
                        <div className="relative">
                            <FileText size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="INV-0000"
                                className="form-input pl-11 font-black uppercase tracking-widest text-xs"
                                value={invoiceNo}
                                onChange={(e) => setInvoiceNo(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="form-label">Customer Name</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Enter customer name"
                                className="form-input pl-11 font-bold"
                                value={customerSearch}
                                onChange={(e) => setCustomerSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="form-label">From Date</label>
                        <input
                            type="date"
                            className="form-input font-black"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="form-label">To Date</label>
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
                            className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95"
                        >
                            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={16} />}
                            Search
                        </button>
                        <button
                            onClick={() => { setCustomerSearch(''); setInvoiceNo(''); }}
                            className="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Sales List */}
            <div className="glass-card p-0 border-none overflow-hidden" id="printable-report">
                <div className="p-10 border-b border-slate-100 bg-white/40 flex flex-col md:flex-row items-center justify-between gap-8">
                    <ReportHeader
                        reportTitle="Sales Report"
                        fromDate={formatDate(fromDate)}
                        toDate={formatDate(toDate)}
                    />
                    <div className="flex gap-4">
                        <div className="px-8 py-5 bg-indigo-900 text-white rounded-4xl shadow-xl shadow-indigo-900/20 relative overflow-hidden group min-w-[240px]">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                            <div className="relative z-10">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-300 mb-1">Total Sell</p>
                                <h3 className="text-3xl font-black tracking-tighter">₹{totalSales.toLocaleString('en-IN')}</h3>
                            </div>
                            <ArrowUpRight size={32} className="absolute bottom-4 right-4 text-white/5" />
                        </div>
                        <div className="px-8 py-5 bg-white border border-slate-100 rounded-4xl shadow-sm min-w-[180px]">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total Pcs</p>
                            <h3 className="text-3xl font-black tracking-tighter text-slate-900">{totalQty} <span className="text-xs text-slate-400 font-bold uppercase">Pieces</span></h3>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">S.No</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice No</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Details</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Rate</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Qty</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {reportData.length > 0 ? (
                                <>
                                    {reportData.map((row, index) => (
                                        <tr key={row.sno} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase">{row.sno}</td>
                                            <td className="px-8 py-6 text-xs font-black text-slate-900 uppercase tracking-tighter">{formatDate(row.date)}</td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-900 tracking-tight uppercase group-hover:text-indigo-600 transition-colors">{row.invNo}</span>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Bill No</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-900">{row.customerName || 'Individual Customer'}</span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{row.gstin || 'No GST No'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-sm font-bold text-slate-500">{row.item}</span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <span className="text-sm font-black text-slate-900 tracking-tighter">₹{row.rate.toLocaleString('en-IN')}</span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 text-slate-900 rounded-lg font-black text-xs">
                                                    {row.qty} <span className="text-[8px] text-slate-400 uppercase">Pcs</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <span className="text-base font-black text-slate-900 tracking-tighter">₹{(row.total || (row.rate * row.qty)).toLocaleString('en-IN')}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-slate-900 text-white">
                                         <td colSpan="7" className="px-8 py-8 text-right text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Total</td>
                                        <td className="px-8 py-8 text-right font-black text-2xl tracking-tighter text-emerald-400">₹{totalSales.toLocaleString('en-IN')}</td>
                                    </tr>
                                </>
                            ) : (
                                <tr>
                                    <td colSpan="8" className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="w-20 h-20 bg-slate-50 rounded-4xl flex items-center justify-center mb-4 border border-dashed border-slate-200">
                                                <Package size={32} className="text-slate-300" />
                                            </div>
                                             <h4 className="text-lg font-black text-slate-900 tracking-tight">{isLoading ? 'Searching sales...' : 'No records found'}</h4>
                                             <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Search to view your sales records</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Report Actions */}
                <div className="p-10 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-8 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                        <ShieldCheck size={20} className="text-emerald-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Sales Report Summary</span>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={handlePrint}
                            className="px-8 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all flex items-center gap-3 shadow-sm"
                        >
                            <Printer size={16} /> Print Report
                        </button>
                        <button
                            onClick={() => setShowInvoiceModal(true)}
                            className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/10 active:scale-95 flex items-center gap-3"
                        >
                            <FileText size={16} /> Detailed View
                        </button>
                    </div>
                </div>
            </div>

            {/* Invoice Details Modal */}
            {showInvoiceModal && (
                <div className="modal-overlay bg-slate-900/70 backdrop-blur-md p-4" onClick={() => setShowInvoiceModal(false)}>
                    <div className="modal-content max-w-6xl border-none animate-scale-up" onClick={(e) => e.stopPropagation()}>
                        <div className="p-8 border-b flex items-center justify-between bg-slate-900 text-white rounded-t-[2.5rem]">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/10 backdrop-blur-md">
                                    <FileText size={24} />
                                </div>
                                <div>
                                     <h3 className="text-xl font-black tracking-tighter">Sales Invoice</h3>
                                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Report Details</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handlePrint} className="w-12 h-12 rounded-xl bg-white/10 hover:bg-indigo-600 text-white flex items-center justify-center transition-all border border-white/10">
                                    <Printer size={20} />
                                </button>
                                <button onClick={() => setShowInvoiceModal(false)} className="w-12 h-12 rounded-xl bg-white/10 hover:bg-red-500 text-white flex items-center justify-center transition-all border border-white/10">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-0 overflow-y-auto max-h-[75vh] bg-slate-100 custom-scrollbar">
                            <div className="max-w-[850px] mx-auto my-16 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] bg-white overflow-hidden rounded-[2.5rem] border border-slate-100 p-16">
                                 <ReportHeader reportTitle="Sell Report" fromDate={formatDate(fromDate)} toDate={formatDate(toDate)} />
                                <table className="w-full border-collapse mt-12">
                                    <thead>
                                        <tr className="bg-slate-50 border-y-2 border-slate-200">
                                            <th className="text-left py-5 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">S.No</th>
                                            <th className="text-left py-5 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Date</th>
                                            <th className="text-left py-5 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Inv#</th>
                                             <th className="text-left py-5 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Customer</th>
                                             <th className="text-left py-5 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Item</th>
                                            <th className="text-right py-5 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Rate</th>
                                            <th className="text-right py-5 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Qty</th>
                                            <th className="text-right py-5 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {reportData.map((row) => (
                                            <tr key={row.sno} className="group">
                                                <td className="py-4 px-4 text-slate-400 font-black text-[10px]">{row.sno}</td>
                                                <td className="py-4 px-4 text-slate-900 font-bold text-xs">{formatDate(row.date)}</td>
                                                <td className="py-4 px-4 text-slate-900 font-black text-xs uppercase">{row.invNo}</td>
                                                <td className="py-4 px-4 text-slate-500 font-bold text-xs">{row.customerName || '—'}</td>
                                                <td className="py-4 px-4 text-slate-500 font-bold text-xs">{row.item}</td>
                                                <td className="py-4 px-4 text-right text-slate-900 font-black text-xs">₹{row.rate.toLocaleString('en-IN')}</td>
                                                <td className="py-4 px-4 text-right text-slate-900 font-black text-xs">{row.qty}</td>
                                                <td className="py-4 px-4 text-right text-slate-900 font-black text-sm tracking-tighter">₹{(row.total || (row.rate * row.qty)).toLocaleString('en-IN')}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-slate-900 text-white">
                                             <td colSpan="7" className="py-6 px-4 text-right font-black text-[10px] uppercase tracking-[0.4em] text-slate-400">Total Sell</td>
                                            <td className="py-6 px-4 text-right font-black text-emerald-400 text-lg tracking-tighter">₹{totalSales.toLocaleString('en-IN')}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="p-8 bg-white border-t border-slate-100 flex justify-between items-center rounded-b-[2.5rem]">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Sales details</p>
                             <button onClick={() => setShowInvoiceModal(false)} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-900/10">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesReportsPage;
