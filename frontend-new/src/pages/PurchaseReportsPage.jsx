import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Search, ShoppingCart, X, Printer, FileSpreadsheet, Mail, FileText, TrendingUp, ChevronLeft, ChevronRight, Zap, Filter, ArrowDownRight, ShieldCheck, Download, Send, Package } from 'lucide-react';
import ReportHeader from '../components/reports/ReportHeader';
import { exportToExcelStyled } from '../utils/exportToExcel';
import { printReport } from '../utils/printReport';
import { reportsAPI, emailAPI } from '../services/api';
import { useToast } from '../components/common';
import { formatDate } from '../utils/dateUtils';

const PurchaseReportsPage = () => {
    const toast = useToast();
    const { user } = useSelector((state) => state.auth);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [supplierSearch, setSupplierSearch] = useState('');
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
            const response = await reportsAPI.getPurchaseReport({
                fromDate,
                toDate,
                supplier: supplierSearch,
                invNo: invoiceNo
            });
            setReportData(response.data.data || []);
            if (response.data.data?.length > 0) {
                toast.success(`Found ${response.data.data.length} purchase records`);
            } else {
                toast.info('No purchases found for the selected filters');
            }
        } catch (error) {
            console.error('Error fetching purchase data:', error);
            toast.error('Failed to load purchase reports');
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
            title: 'Purchase Report',
            businessName: 'Sri Ram Fashions',
            fromDate,
            toDate,
            columns,
            data: formattedData,
            totals: grandTotals,
            filename: `purchase_report_${fromDate}_to_${toDate}`,
            sheetName: 'Purchases'
        });
        toast.success('Purchase report exported successfully');
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
                type: 'purchase',
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

    const totalPurchase = reportData.reduce((sum, row) => sum + (row.total || (row.rate * row.qty)), 0);
    const totalQty = reportData.reduce((sum, row) => sum + (row.qty || 0), 0);

    return (
        <div className="space-y-10 animate-fade-in p-2 pb-20">
            {/* Professional Header */}
            <div className="page-header-shell bg-white/60 backdrop-blur-2xl border border-white/50 shadow-premium rounded-[2.5rem] p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-start gap-6">
                        <div className="w-20 h-20 rounded-4xl bg-linear-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-2xl shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-500">
                            <ShoppingCart size={32} />
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em]">Reports</p>
                            <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Purchase Report</h1>
                            <p className="text-sm font-bold text-slate-500 pt-1">Analyze your procurement costs and supply chain.</p>
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
                            className="btn btn-secondary px-8 py-4 rounded-2xl flex items-center gap-3 group border-none bg-emerald-50 hover:bg-emerald-100 transition-all"
                        >
                            <Mail size={20} className={`text-emerald-600 ${isSendingEmail ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
                            <span className="font-black uppercase tracking-widest text-[11px] text-emerald-700">Send Report</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Strategic Filters */}
            <div className="glass-card p-10 border-none relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-emerald-500 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 items-end">
                    <div className="space-y-3">
                        <label className="form-label">Invoice No</label>
                        <div className="relative">
                            <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="e.g. PUR-001"
                                className="form-input pl-12 py-4 bg-slate-50/50 border-slate-100 hover:bg-white transition-all font-black uppercase tracking-widest text-xs"
                                value={invoiceNo}
                                onChange={(e) => setInvoiceNo(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="form-label">Supplier</label>
                        <div className="relative">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Supplier Name..."
                                className="form-input pl-12 py-4 bg-slate-50/50 border-slate-100 hover:bg-white transition-all font-bold"
                                value={supplierSearch}
                                onChange={(e) => setSupplierSearch(e.target.value)}
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
                        <label className="form-label">Date Range End</label>
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
                            className="flex-1 py-4 bg-slate-900 text-white rounded-[1.25rem] font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                        >
                            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={18} />}
                            Generate Report
                        </button>
                        <button
                            onClick={() => { setSupplierSearch(''); setInvoiceNo(''); }}
                            className="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Purchase List Table */}
            <div className="glass-card p-0 border-none overflow-hidden group hover:shadow-premium transition-all duration-500" id="printable-report">
                <div className="p-10 border-b border-slate-100 bg-white/40 flex flex-col lg:flex-row items-center justify-between gap-10">
                    <ReportHeader
                        reportTitle="Purchase Report"
                        fromDate={formatDate(fromDate)}
                        toDate={formatDate(toDate)}
                    />
                    <div className="flex gap-6 no-print w-full lg:w-auto">
                        <div className="flex-1 lg:flex-none px-10 py-7 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl shadow-slate-900/20 relative overflow-hidden group min-w-[280px]">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Total Purchase</p>
                                <h3 className="text-4xl font-black tracking-tighter text-emerald-400">₹{totalPurchase.toLocaleString('en-IN')}</h3>
                            </div>
                            <ArrowDownRight size={48} className="absolute bottom-2 right-4 text-white/5 group-hover:text-white/10 transition-colors" />
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
                                <th className="px-10 py-5">S.No</th>
                                <th className="px-10 py-5">Verified Date</th>
                                <th className="px-10 py-5">Document Identity</th>
                                <th className="px-10 py-5">Product Details</th>
                                <th className="px-10 py-5 text-right">Unit Price</th>
                                <th className="px-10 py-5 text-right">Volume</th>
                                <th className="px-10 py-5 text-right">Taxable Worth</th>
                                <th className="px-10 py-5 text-right">Settlement Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.length > 0 ? (
                                <>
                                    {reportData.map((row, index) => (
                                        <tr key={row.sno} className="group transition-colors hover:bg-slate-50/50">
                                            <td className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase">{row.sno}</td>
                                            <td className="px-10 py-8 text-sm font-black text-slate-900 tracking-tighter uppercase">{formatDate(row.date)}</td>
                                            <td className="px-10 py-8">
                                                <div className="flex flex-col">
                                                    <span className="text-base font-black text-slate-900 tracking-tight uppercase group-hover:text-emerald-600 transition-colors">{row.invNo}</span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Invoice #</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <span className="text-sm font-bold text-slate-600">{row.item}</span>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                <span className="text-sm font-black text-slate-900 tracking-tighter">₹{row.rate.toLocaleString('en-IN')}</span>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 text-slate-900 rounded-xl font-black text-xs border border-slate-200/50">
                                                    {row.qty} <span className="text-[9px] text-slate-400 uppercase tracking-widest">Pcs</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                <span className="text-sm font-bold text-slate-900">₹{(row.taxableAmount || (row.rate * row.qty)).toLocaleString('en-IN')}</span>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                <span className="text-lg font-black text-slate-900 tracking-tighter group-hover:text-emerald-600 transition-colors">₹{(row.total || (row.rate * row.qty)).toLocaleString('en-IN')}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-slate-900 text-white border-none shadow-2xl">
                                        <td colSpan="7" className="px-10 py-10 text-right text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Total Purchase</td>
                                        <td className="px-10 py-10 text-right font-black text-3xl tracking-tighter text-emerald-400">₹{totalPurchase.toLocaleString('en-IN')}</td>
                                    </tr>
                                </>
                            ) : (
                                <tr>
                                    <td colSpan="8" className="px-10 py-40 text-center">
                                        <div className="flex flex-col items-center justify-center gap-6">
                                            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-4 border border-dashed border-slate-200">
                                                <Package size={44} className="text-slate-300" />
                                            </div>
                                            <h4 className="text-2xl font-black text-slate-900 tracking-tighter">{isLoading ? 'Loading records...' : 'No Records Found'}</h4>
                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Search for purchase records to see results.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Strategic Report Actions */}
                <div className="p-10 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-8 border-t border-slate-100">
                    <div className="flex items-center gap-4">
                        <ShieldCheck size={24} className="text-emerald-500" />
                        <div className="space-y-0.5">
                             <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Verified Purchase Report</p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Sri Ram Fashions • Purchase Records</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={handlePrint}
                            className="px-8 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center gap-3 shadow-sm active:scale-95"
                        >
                            <Printer size={18} /> Print Archive
                        </button>
                        <button
                            onClick={() => setShowInvoiceModal(true)}
                            className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-600/10 active:scale-95 flex items-center gap-3"
                        >
                            <FileText size={18} /> View Details
                        </button>
                    </div>
                </div>
            </div>

            {/* Invoice Details Modal */}
            {showInvoiceModal && (
                <div className="modal-overlay" onClick={() => setShowInvoiceModal(false)}>
                    <div className="modal-content max-w-6xl border-none shadow-3xl" onClick={(e) => e.stopPropagation()}>
                        <div className="px-10 py-10 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                            <div className="flex items-center gap-8">
                                <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center text-white border border-white/10 backdrop-blur-md shadow-2xl">
                                    <ShoppingCart size={32} />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black tracking-tighter">Purchase Report Details</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 italic">Purchase Audit Ledger</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={handlePrint} className="w-14 h-14 rounded-2xl bg-white/10 hover:bg-emerald-600 text-white flex items-center justify-center transition-all border border-white/10">
                                    <Printer size={24} />
                                </button>
                                <button onClick={() => setShowInvoiceModal(false)} className="w-14 h-14 rounded-2xl bg-white/10 hover:bg-red-500 text-white flex items-center justify-center transition-all border border-white/10">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="p-0 overflow-y-auto max-h-[75vh] bg-slate-100 custom-scrollbar py-16 flex justify-center">
                            <div className="max-w-[850px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] bg-white overflow-hidden rounded-[2.5rem] border border-slate-100 p-16 transform scale-[0.95] origin-top">
                                <ReportHeader reportTitle="Purchase Audit" fromDate={formatDate(fromDate)} toDate={formatDate(toDate)} />
                                <table className="w-full border-collapse mt-16">
                                    <thead>
                                        <tr className="bg-slate-50 border-y-2 border-slate-200">
                                            <th className="text-left py-6 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">S.No</th>
                                            <th className="text-left py-6 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Date</th>
                                            <th className="text-left py-6 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Invoice #</th>
                                            <th className="text-left py-6 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Product Entity</th>
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
                                                <td className="py-5 px-4 text-slate-500 font-bold text-xs">{row.item}</td>
                                                <td className="py-5 px-4 text-right text-slate-900 font-black text-xs">₹{row.rate.toLocaleString('en-IN')}</td>
                                                <td className="py-5 px-4 text-right text-slate-900 font-black text-xs">{row.qty}</td>
                                                <td className="py-5 px-4 text-right text-slate-900 font-black text-sm tracking-tighter">₹{(row.total || (row.rate * row.qty)).toLocaleString('en-IN')}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-slate-900 text-white shadow-2xl">
                                            <td colSpan="6" className="py-8 px-4 text-right font-black text-[11px] uppercase tracking-[0.4em] text-slate-400">Total Purchase</td>
                                            <td className="py-8 px-4 text-right font-black text-emerald-400 text-2xl tracking-tighter">₹{totalPurchase.toLocaleString('en-IN')}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="px-10 py-8 bg-white border-t border-slate-100 flex justify-between items-center rounded-b-[2.5rem]">
                             <div className="flex items-center gap-4">
                                 <ShieldCheck size={24} className="text-blue-500" />
                                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Verified Supply Chain Archive</span>
                             </div>
                             <button onClick={() => setShowInvoiceModal(false)} className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-emerald-600 transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98]">Close Archive View</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseReportsPage;
