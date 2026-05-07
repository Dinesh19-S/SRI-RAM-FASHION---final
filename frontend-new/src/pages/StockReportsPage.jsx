import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Package, X, Printer, Search, FileSpreadsheet, Mail, Database, Box, TrendingUp, ShieldCheck, Download, Send, ArrowUpRight, FileText, History } from 'lucide-react';
import ReportHeader from '../components/reports/ReportHeader';
import { exportToExcelStyled } from '../utils/exportToExcel';
import { printReport } from '../utils/printReport';
import { reportsAPI, emailAPI } from '../services/api';
import { useToast } from '../components/common';
import { formatDate } from '../utils/dateUtils';

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
        return () => { isCancelled = true; };
    }, []);

    const handleSearch = async () => {
        setIsLoading(true);
        try {
            const response = await reportsAPI.getStockReport({
                name: nameSearch,
                size: sizeFilter
            });
            setReportData(response.data.data || []);
            if (response.data.data?.length > 0) {
                toast.success(`Found ${response.data.data.length} products in stock`);
            } else {
                toast.info('No stock found for the selected filters');
            }
        } catch (error) {
            console.error('Error fetching stock data:', error);
            toast.error('Failed to load stock reports');
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
            qty: reportData.reduce((sum, r) => sum + (Number(r.qty) || 0), 0),
            total: reportData.reduce((sum, r) => sum + (Number(r.total) || 0), 0)
        };

        exportToExcelStyled({
            title: 'Stock Report',
            businessName: 'Sri Ram Fashions',
            columns,
            data: reportData,
            totals: grandTotals,
            filename: `stock_report_${new Date().toISOString().split('T')[0]}`,
            sheetName: 'Stock Inventory'
        });
        toast.success('Stock report exported successfully');
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
            const today = new Date().toISOString().split('T')[0];
            const response = await emailAPI.sendReport({
                type: 'stock',
                fromDate: today,
                toDate: today,
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

    const totalInventoryValue = reportData.reduce((sum, row) => sum + (row.total || 0), 0);
    const totalSKUs = reportData.length;
    const totalUnits = reportData.reduce((sum, row) => sum + (row.qty || 0), 0);

    return (
        <div className="space-y-10 animate-fade-in p-2 pb-20">
            {/* Reports Header */}
            <div className="page-header-shell bg-white/40 backdrop-blur-md border border-white/40 shadow-xl shadow-slate-200/20 rounded-3xl p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-5">
                        <div className="w-16 h-16 rounded-3xl bg-linear-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                            <Package size={28} />
                        </div>
                         <div className="space-y-1">
                             <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.3em]">Inventory Reports</p>
                             <h1 className="text-4xl font-black text-slate-900 tracking-tight">Current Stock</h1>
                             <p className="text-sm font-bold text-slate-500 pt-1">Check what's in your shop.</p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    <div className="md:col-span-2 space-y-2">
                        <label className="form-label">Product Name</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Enter product name..."
                                className="form-input pl-11 font-bold"
                                value={nameSearch}
                                onChange={(e) => setNameSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="form-label">Filter by Size</label>
                        <select
                            className="form-input font-black uppercase tracking-widest"
                            value={sizeFilter}
                            onChange={(e) => setSizeFilter(e.target.value)}
                        >
                            <option value="">All Sizes</option>
                            <option value="S">S - Small</option>
                            <option value="M">M - Medium</option>
                            <option value="L">L - Large</option>
                            <option value="XL">XL - Extra Large</option>
                            <option value="XXL">XXL - Double Extra Large</option>
                        </select>
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
                            onClick={() => { setNameSearch(''); setSizeFilter(''); }}
                            className="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Stock List */}
            <div className="glass-card p-0 border-none overflow-hidden" id="printable-report">
                <div className="p-10 border-b border-slate-100 bg-white/40 flex flex-col md:flex-row items-center justify-between gap-8">
                    <ReportHeader
                        reportTitle="Stock Report"
                        additionalInfo={`System Timestamp: ${new Date().toLocaleDateString('en-GB').replace(/\//g, '.')}`}
                    />
                    <div className="flex gap-4">
                        <div className="px-8 py-5 bg-emerald-900 text-white rounded-4xl shadow-xl shadow-emerald-900/20 relative overflow-hidden group min-w-[240px]">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                            <div className="relative z-10">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300 mb-1">Stock Value</p>
                                <h3 className="text-3xl font-black tracking-tighter">₹{totalInventoryValue.toLocaleString('en-IN')}</h3>
                            </div>
                            <ArrowUpRight size={32} className="absolute bottom-4 right-4 text-white/5" />
                        </div>
                        <div className="px-8 py-5 bg-white border border-slate-100 rounded-4xl shadow-sm min-w-[180px]">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total Pcs</p>
                            <h3 className="text-3xl font-black tracking-tighter text-slate-900">{totalUnits} <span className="text-xs text-slate-400 font-bold uppercase">Pieces</span></h3>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">S.No</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Name</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Size</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Qty</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Rate</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {reportData.length > 0 ? (
                                <>
                                    {reportData.map((row, index) => (
                                        <tr key={row.sno} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase">{row.sno}</td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-900 tracking-tight group-hover:text-amber-600 transition-colors">{row.item}</span>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Code</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="inline-flex items-center px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-xs">
                                                    {row.size}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 text-slate-900 rounded-lg font-black text-xs">
                                                    {row.qty} <span className="text-[8px] text-slate-400 uppercase">Pieces</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <span className="text-sm font-black text-slate-900 tracking-tighter">₹{row.rate.toLocaleString('en-IN')}</span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <span className="text-base font-black text-slate-900 tracking-tighter">₹{(row.total || 0).toLocaleString('en-IN')}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-amber-900 text-white">
                                        <td colSpan="5" className="px-8 py-8 text-right text-[10px] font-black uppercase tracking-[0.4em] text-amber-400">Total</td>
                                        <td className="px-8 py-8 text-right font-black text-2xl tracking-tighter text-white">₹{totalInventoryValue.toLocaleString('en-IN')}</td>
                                    </tr>
                                </>
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="w-20 h-20 bg-slate-50 rounded-4xl flex items-center justify-center mb-4 border border-dashed border-slate-200">
                                                <Package size={32} className="text-slate-300" />
                                            </div>
                                            <h4 className="text-lg font-black text-slate-900 tracking-tight">{isLoading ? 'Searching stock...' : 'No stock found'}</h4>
                                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Search to view your current stock</p>
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
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Stock Report Summary</span>
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
                            className="px-10 py-4 bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-amber-700 transition-all shadow-xl shadow-amber-600/10 active:scale-95 flex items-center gap-3"
                        >
                            <FileText size={16} /> Detailed View
                        </button>
                    </div>
                </div>
            </div>

            {/* Stock Details Modal */}
            {showInvoiceModal && (
                <div className="modal-overlay bg-slate-900/70 backdrop-blur-md p-4" onClick={() => setShowInvoiceModal(false)}>
                    <div className="modal-content max-w-6xl border-none animate-scale-up" onClick={(e) => e.stopPropagation()}>
                        <div className="p-8 border-b flex items-center justify-between bg-slate-900 text-white rounded-t-[2.5rem]">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/10 backdrop-blur-md">
                                    <FileText size={24} />
                                </div>
                                {console.log('Rendering Modal with Data:', reportData)}
                                <div>
                                    <h3 className="text-xl font-black tracking-tighter">Stock Report</h3>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Stock Details</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handlePrint} className="w-12 h-12 rounded-xl bg-white/10 hover:bg-amber-600 text-white flex items-center justify-center transition-all border border-white/10">
                                    <Printer size={20} />
                                </button>
                                <button onClick={() => setShowInvoiceModal(false)} className="w-12 h-12 rounded-xl bg-white/10 hover:bg-red-500 text-white flex items-center justify-center transition-all border border-white/10">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-0 overflow-y-auto max-h-[75vh] bg-slate-100 custom-scrollbar">
                            <div className="max-w-[850px] mx-auto my-16 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] bg-white overflow-hidden rounded-[2.5rem] border border-slate-100 p-16">
                                <ReportHeader reportTitle="Stock Report" additionalInfo={`System Timestamp: ${new Date().toLocaleDateString('en-GB').replace(/\//g, '.')}`} />
                                <table className="w-full border-collapse mt-12">
                                    <thead>
                                        <tr className="bg-slate-50 border-y-2 border-slate-200">
                                            <th className="text-left py-5 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">S.No</th>
                                            <th className="text-left py-5 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Product Name</th>
                                            <th className="text-left py-5 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Size</th>
                                            <th className="text-right py-5 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Qty</th>
                                            <th className="text-right py-5 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Rate</th>
                                            <th className="text-right py-5 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Stock Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {reportData.map((row) => (
                                            <tr key={row.sno} className="group">
                                                <td className="py-4 px-4 text-slate-400 font-black text-[10px]">{row.sno}</td>
                                                <td className="py-4 px-4 text-slate-900 font-black text-xs uppercase">{row.item}</td>
                                                <td className="py-4 px-4 text-slate-900 font-black text-xs uppercase">{row.size}</td>
                                                <td className="py-4 px-4 text-right text-slate-900 font-black text-xs">{row.qty}</td>
                                                <td className="py-4 px-4 text-right text-slate-900 font-black text-xs">₹{row.rate.toLocaleString('en-IN')}</td>
                                                <td className="py-4 px-4 text-right text-slate-900 font-black text-sm tracking-tighter">₹{(row.total || 0).toLocaleString('en-IN')}</td>
                                            </tr>
                                        ))}
                                         <tr className="bg-amber-900 text-white">
                                             <td colSpan="5" className="py-6 px-4 text-right font-black text-[10px] uppercase tracking-[0.4em] text-amber-400">Total</td>
                                             <td className="py-6 px-4 text-right font-black text-white text-lg tracking-tighter">₹{totalInventoryValue.toLocaleString('en-IN')}</td>
                                         </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                         <div className="p-8 bg-white border-t border-slate-100 flex justify-between items-center rounded-b-[2.5rem]">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Stock details</p>
                            <button onClick={() => setShowInvoiceModal(false)} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl shadow-slate-900/10">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockReportsPage;
