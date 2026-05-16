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
            { key: 'invNo', header: 'Invoice Numbers', width: 18, align: 'left' },
            { key: 'customerName', header: 'Customer Name', width: 25, align: 'left' },
            { key: 'gstin', header: 'GST Number', width: 20, align: 'left' },
            { key: 'total', header: 'Total Amount', width: 16, align: 'right' },
            { key: 'taxableAmount', header: 'Taxable Amount', width: 16, align: 'right' },
            { key: 'cgst', header: 'CGST', width: 12, align: 'right' },
            { key: 'sgst', header: 'SGST', width: 12, align: 'right' },
            { key: 'igst', header: 'IGST', width: 12, align: 'right' },
            { key: 'totalGst', header: 'Total GST', width: 14, align: 'right' },
            { key: 'hsn', header: 'HSN Number', width: 14, align: 'left' }
        ];

        const formattedData = reportData.map(row => {
            const cgst = Number(row.cgst || 0);
            const sgst = Number(row.sgst || 0);
            const igst = Number(row.igst || 0);
            return {
                ...row,
                date: formatDate(row.date),
                total: Number(row.total || 0),
                taxableAmount: Number(row.taxableAmount || 0),
                cgst,
                sgst,
                igst,
                totalGst: cgst + sgst + igst
            };
        });

        const grandTotals = {
            total: formattedData.reduce((sum, r) => sum + (Number(r.total) || 0), 0),
            taxableAmount: formattedData.reduce((sum, r) => sum + (Number(r.taxableAmount) || 0), 0),
            cgst: formattedData.reduce((sum, r) => sum + (Number(r.cgst) || 0), 0),
            sgst: formattedData.reduce((sum, r) => sum + (Number(r.sgst) || 0), 0),
            igst: formattedData.reduce((sum, r) => sum + (Number(r.igst) || 0), 0),
            totalGst: formattedData.reduce((sum, r) => sum + (Number(r.totalGst) || 0), 0)
        };

        const summary = [
            { label: 'Total No. of Bills', value: totalBills, isCurrency: false },
            { label: 'Total Taxable Amount', value: grandTotals.taxableAmount, isCurrency: true },
            { label: 'Total CGST', value: grandTotals.cgst, isCurrency: true },
            { label: 'Total SGST', value: grandTotals.sgst, isCurrency: true },
            { label: 'Total IGST', value: grandTotals.igst, isCurrency: true },
            { label: 'Total GST Result', value: grandTotals.totalGst, isCurrency: true }
        ];

        exportToExcelStyled({
            title: 'Sales Report',
            businessName: 'Sri Ram Fashions',
            fromDate,
            toDate,
            columns,
            data: formattedData,
            totals: grandTotals,
            summary,
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

    const totalSales = reportData.reduce((sum, row) => sum + (row.total || 0), 0);
    const totalQty = reportData.reduce((sum, row) => sum + (row.qty || 0), 0);
    const totalTaxable = reportData.reduce((sum, row) => sum + (row.taxableAmount || (row.rate * row.qty)), 0);
    const totalCgst = reportData.reduce((sum, row) => sum + (row.cgst || 0), 0);
    const totalSgst = reportData.reduce((sum, row) => sum + (row.sgst || 0), 0);
    const totalIgst = reportData.reduce((sum, row) => sum + (row.igst || 0), 0);
    const totalGstValue = totalCgst + totalSgst + totalIgst;
    const totalBills = reportData.length;

    return (
        <div className="space-y-10 animate-fade-in p-2 pb-20">
            {/* Professional Header */}
            <div className="page-header-shell bg-white/60 backdrop-blur-2xl border border-white/50 shadow-premium rounded-[2.5rem] p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-start gap-6">
                        <div className="w-20 h-20 rounded-4xl bg-linear-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-500">
                            <TrendingUp size={32} />
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em]">Reports</p>
                            <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Sales Report</h1>
                            <p className="text-sm font-bold text-slate-500 pt-1">Analyze your sales performance and revenue.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleExport}
                            className="btn btn-secondary px-8 py-4 rounded-2xl flex items-center gap-3 group border-none bg-slate-100 hover:bg-slate-200 transition-all"
                        >
                            <FileSpreadsheet size={20} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                            <span className="font-black uppercase tracking-widest text-[11px] text-slate-700">Export XLSX</span>
                        </button>
                        <button
                            onClick={handleEmail}
                            disabled={isSendingEmail || isLoading}
                            className="btn btn-secondary px-8 py-4 rounded-2xl flex items-center gap-3 group border-none bg-indigo-50 hover:bg-indigo-100 transition-all"
                        >
                            <Mail size={20} className={`text-indigo-600 ${isSendingEmail ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
                            <span className="font-black uppercase tracking-widest text-[11px] text-indigo-700">Send Report</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Strategic Filters */}
            <div className="glass-card p-10 border-none relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-indigo-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 items-end">
                    <div className="space-y-3">
                        <label className="form-label">Invoice No</label>
                        <div className="relative">
                            <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="e.g. INV-001"
                                className="form-input pl-12 py-4 bg-slate-50/50 border-slate-100 hover:bg-white transition-all font-black uppercase tracking-widest text-xs"
                                value={invoiceNo}
                                onChange={(e) => setInvoiceNo(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="form-label">Customer</label>
                        <div className="relative">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Customer Name..."
                                className="form-input pl-12 py-4 bg-slate-50/50 border-slate-100 hover:bg-white transition-all font-bold"
                                value={customerSearch}
                                onChange={(e) => setCustomerSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="form-label">From Date</label>
                        <input
                            type="date"
                            className="form-input py-4 bg-slate-50/50 border-slate-100 hover:bg-white transition-all font-black"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="form-label">To Date</label>
                        <input
                            type="date"
                            className="form-input py-4 bg-slate-50/50 border-slate-100 hover:bg-white transition-all font-black"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleSearch}
                            disabled={isLoading}
                            className="flex-1 py-4 bg-slate-900 text-white rounded-[1.25rem] font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                        >
                            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap size={18} />}
                            Generate Report
                        </button>
                        <button
                            onClick={() => { setCustomerSearch(''); setInvoiceNo(''); }}
                            className="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Sales Performance Table */}
            <div className="glass-card p-0 border-none overflow-hidden group hover:shadow-premium transition-all duration-500" id="printable-report">
                <div className="p-10 border-b border-slate-100 bg-white/40 flex flex-col lg:flex-row items-center justify-between gap-10">
                    <ReportHeader
                        reportTitle="Sales Report"
                        fromDate={formatDate(fromDate)}
                        toDate={formatDate(toDate)}
                    />
                    <div className="flex gap-6 no-print w-full lg:w-auto">
                        <div className="flex-1 lg:flex-none px-10 py-7 bg-indigo-950 text-white rounded-[2.5rem] shadow-2xl shadow-indigo-900/20 relative overflow-hidden group min-w-[280px]">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-2">Total Sales</p>
                                <h3 className="text-4xl font-black tracking-tighter text-blue-400">₹{totalSales.toLocaleString('en-IN')}</h3>
                            </div>
                            <ArrowUpRight size={48} className="absolute bottom-2 right-4 text-white/5 group-hover:text-white/10 transition-colors" />
                        </div>
                        <div className="flex-1 lg:flex-none px-10 py-7 bg-white border border-slate-100 rounded-[2.5rem] shadow-premium min-w-[220px] group hover:bg-slate-50 transition-all">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Total Quantity</p>
                            <h3 className="text-4xl font-black tracking-tighter text-slate-900">{totalQty} <span className="text-xs text-slate-400 font-black uppercase tracking-widest ml-1">Pcs</span></h3>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="page-table">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-5">S.No</th>
                                <th className="px-6 py-5">Date</th>
                                <th className="px-6 py-5">Invoice</th>
                                <th className="px-6 py-5">Customer / GSTIN</th>
                                <th className="px-6 py-5 text-right">Taxable</th>
                                <th className="px-6 py-5 text-right">CGST</th>
                                <th className="px-6 py-5 text-right">SGST</th>
                                <th className="px-6 py-5 text-right">IGST</th>
                                <th className="px-6 py-5 text-right">Total GST</th>
                                <th className="px-6 py-5 text-right">Grand Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.length > 0 ? (
                                <>
                                    {reportData.map((row, index) => {
                                        const cgst = Number(row.cgst || 0);
                                        const sgst = Number(row.sgst || 0);
                                        const igst = Number(row.igst || 0);
                                        const totalGst = cgst + sgst + igst;
                                        const taxable = Number(row.taxableAmount || (row.rate * row.qty));
                                        
                                        return (
                                            <tr key={row.sno} className="group transition-colors hover:bg-slate-50/50">
                                                <td className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase">{row.sno}</td>
                                                <td className="px-6 py-6 text-[11px] font-black text-slate-900 tracking-tighter uppercase">{formatDate(row.date)}</td>
                                                <td className="px-6 py-6 text-sm font-black text-slate-900 tracking-tight uppercase group-hover:text-indigo-600 transition-colors">{row.invNo}</td>
                                                <td className="px-6 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{row.customerName || 'Direct Sale'}</span>
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{row.gstin || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 text-right">
                                                    <span className="text-xs font-bold text-slate-600">₹{taxable.toLocaleString('en-IN')}</span>
                                                </td>
                                                <td className="px-6 py-6 text-right">
                                                    <span className="text-xs font-bold text-slate-500">₹{cgst.toLocaleString('en-IN')}</span>
                                                </td>
                                                <td className="px-6 py-6 text-right">
                                                    <span className="text-xs font-bold text-slate-500">₹{sgst.toLocaleString('en-IN')}</span>
                                                </td>
                                                <td className="px-6 py-6 text-right">
                                                    <span className="text-xs font-bold text-slate-500">₹{igst.toLocaleString('en-IN')}</span>
                                                </td>
                                                <td className="px-6 py-6 text-right">
                                                    <span className="text-xs font-black text-indigo-600">₹{totalGst.toLocaleString('en-IN')}</span>
                                                </td>
                                                <td className="px-6 py-6 text-right">
                                                    <span className="text-base font-black text-slate-900 tracking-tighter group-hover:text-indigo-600 transition-colors">₹{(row.total || (taxable + totalGst)).toLocaleString('en-IN')}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="bg-slate-950 text-white border-none shadow-2xl">
                                        <td colSpan="9" className="px-10 py-10 text-right text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Grand Total Sales</td>
                                        <td className="px-10 py-10 text-right font-black text-3xl tracking-tighter text-blue-400">₹{totalSales.toLocaleString('en-IN')}</td>
                                    </tr>
                                </>
                            ) : (
                                <tr>
                                    <td colSpan="8" className="px-10 py-40 text-center">
                                        <div className="flex flex-col items-center justify-center gap-6">
                                            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-4 border border-dashed border-slate-200">
                                                <TrendingUp size={44} className="text-slate-300" />
                                            </div>
                                            <h4 className="text-2xl font-black text-slate-900 tracking-tighter">{isLoading ? 'Loading Sales Data...' : 'No Sales Found'}</h4>
                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Search for sales records to see results.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Detailed Summary Breakdown */}
                <div className="px-10 py-12 bg-white/50 border-t border-slate-100 flex justify-end">
                    <div className="w-full max-w-md space-y-4">
                        <div className="flex items-center justify-between py-3 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Total No. of Bills</span>
                            </div>
                            <span className="text-lg font-black text-slate-900">{totalBills}</span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Total Taxable Amount</span>
                            </div>
                            <span className="text-lg font-black text-slate-900">₹{totalTaxable.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Total CGST</span>
                            </div>
                            <span className="text-lg font-bold text-slate-700">₹{totalCgst.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Total SGST</span>
                            </div>
                            <span className="text-lg font-bold text-slate-700">₹{totalSgst.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Total IGST</span>
                            </div>
                            <span className="text-lg font-bold text-slate-700">₹{totalIgst.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex items-center justify-between py-5 bg-indigo-600 px-8 rounded-[2rem] mt-6 shadow-2xl shadow-indigo-600/20 text-white">
                            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-100">Total GST Result</span>
                            <span className="text-3xl font-black">₹{totalGstValue.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>

                {/* Strategic Actions */}
                <div className="p-10 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-8 border-t border-slate-100">
                    <div className="flex items-center gap-4">
                        <ShieldCheck size={24} className="text-blue-500" />
                        <div className="space-y-0.5">
                             <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Verified Revenue Report</p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Sri Ram Fashions • Intelligence Division</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={handlePrint}
                            className="px-8 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center gap-3 shadow-sm active:scale-95"
                        >
                            <Printer size={18} /> Print Archive
                        </button>
                        <button
                            onClick={() => setShowInvoiceModal(true)}
                            className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/10 active:scale-95 flex items-center gap-3"
                        >
                            <FileText size={18} /> View Details
                        </button>
                    </div>
                </div>
            </div>

            {/* Detailed View Modal */}
            {showInvoiceModal && (
                <div className="modal-overlay" onClick={() => setShowInvoiceModal(false)}>
                    <div className="modal-content max-w-6xl border-none shadow-3xl" onClick={(e) => e.stopPropagation()}>
                        <div className="px-10 py-10 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                            <div className="flex items-center gap-8">
                                <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center text-white border border-white/10 backdrop-blur-md shadow-2xl">
                                    <TrendingUp size={32} />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black tracking-tighter">Sales Report Details</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 italic">Sales Transaction Ledger</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={handlePrint} className="w-14 h-14 rounded-2xl bg-white/10 hover:bg-indigo-600 text-white flex items-center justify-center transition-all border border-white/10">
                                    <Printer size={24} />
                                </button>
                                <button onClick={() => setShowInvoiceModal(false)} className="w-14 h-14 rounded-2xl bg-white/10 hover:bg-red-500 text-white flex items-center justify-center transition-all border border-white/10">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="p-0 overflow-y-auto max-h-[75vh] bg-slate-100 custom-scrollbar py-16 flex justify-center">
                            <div className="max-w-[850px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] bg-white overflow-hidden rounded-[2.5rem] border border-slate-100 p-16 transform scale-[0.95] origin-top">
                                <ReportHeader reportTitle="Revenue Statement" fromDate={formatDate(fromDate)} toDate={formatDate(toDate)} />
                                <table className="w-full border-collapse mt-16">
                                    <thead>
                                        <tr className="bg-slate-50 border-y-2 border-slate-200">
                                            <th className="text-left py-6 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">S.No</th>
                                            <th className="text-left py-6 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Date</th>
                                            <th className="text-left py-6 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Inv #</th>
                                            <th className="text-left py-6 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Customer</th>
                                            <th className="text-right py-6 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Unit Rate</th>
                                            <th className="text-right py-6 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Qty</th>
                                            <th className="text-right py-6 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {reportData.map((row) => (
                                            <tr key={row.sno} className="group">
                                                <td className="py-5 px-4 text-slate-400 font-black text-[10px]">{row.sno}</td>
                                                <td className="py-5 px-4 text-slate-900 font-bold text-xs">{formatDate(row.date)}</td>
                                                <td className="py-5 px-4 text-slate-900 font-black text-xs uppercase">{row.invNo}</td>
                                                <td className="py-5 px-4 text-slate-500 font-bold text-xs">{row.customerName || 'Direct Sale'}</td>
                                                <td className="py-5 px-4 text-right text-slate-900 font-black text-xs">₹{row.rate.toLocaleString('en-IN')}</td>
                                                <td className="py-5 px-4 text-right text-slate-900 font-black text-xs">{row.qty}</td>
                                                <td className="py-5 px-4 text-right text-slate-900 font-black text-sm tracking-tighter">₹{(row.total || (row.rate * row.qty)).toLocaleString('en-IN')}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-slate-900 text-white shadow-2xl">
                                            <td colSpan="6" className="py-8 px-4 text-right font-black text-[11px] uppercase tracking-[0.4em] text-slate-400">Total Sales</td>
                                            <td className="py-8 px-4 text-right font-black text-blue-400 text-2xl tracking-tighter">₹{totalSales.toLocaleString('en-IN')}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="px-10 py-8 bg-white border-t border-slate-100 flex justify-between items-center rounded-b-[2.5rem]">
                             <div className="flex items-center gap-4">
                                 <ShieldCheck size={24} className="text-indigo-500" />
                                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Verified Commercial Archive</span>
                             </div>
                             <button onClick={() => setShowInvoiceModal(false)} className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-indigo-600 transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98]">Close Audit View</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesReportsPage;
