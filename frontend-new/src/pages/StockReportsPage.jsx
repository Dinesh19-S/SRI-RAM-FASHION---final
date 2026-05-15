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
            {/* Professional Header */}
            <div className="page-header-shell bg-white/60 backdrop-blur-2xl border border-white/50 shadow-premium rounded-[2.5rem] p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-start gap-6">
                        <div className="w-20 h-20 rounded-4xl bg-linear-to-br from-amber-500 to-orange-700 flex items-center justify-center text-white shadow-2xl shadow-amber-500/20 group-hover:scale-105 transition-transform duration-500">
                            <Package size={32} />
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.4em]">Reports</p>
                            <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Stock Report</h1>
                            <p className="text-sm font-bold text-slate-500 pt-1">View your current stock levels and inventory value.</p>
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
                            className="btn btn-secondary px-8 py-4 rounded-2xl flex items-center gap-3 group border-none bg-amber-50 hover:bg-amber-100 transition-all"
                        >
                            <Mail size={20} className={`text-amber-600 ${isSendingEmail ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
                            <span className="font-black uppercase tracking-widest text-[11px] text-amber-700">Send via Email</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Strategic Filters */}
            <div className="glass-card p-10 border-none relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-amber-500 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-end">
                    <div className="lg:col-span-2 space-y-3">
                        <label className="form-label">Product</label>
                        <div className="relative">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Enter product name or code..."
                                className="form-input pl-12 py-4 bg-slate-50/50 border-slate-100 hover:bg-white transition-all font-bold"
                                value={nameSearch}
                                onChange={(e) => setNameSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="form-label">Size</label>
                        <div className="relative">
                            <Box size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <select
                                className="form-input pl-12 py-4 bg-slate-50/50 border-slate-100 hover:bg-white transition-all font-black uppercase tracking-widest text-xs"
                                value={sizeFilter}
                                onChange={(e) => setSizeFilter(e.target.value)}
                            >
                                <option value="">All Dimensions</option>
                                <option value="S">Small (S)</option>
                                <option value="M">Medium (M)</option>
                                <option value="L">Large (L)</option>
                                <option value="XL">Extra Large (XL)</option>
                                <option value="XXL">Double Extra Large (XXL)</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleSearch}
                            disabled={isLoading}
                            className="flex-1 py-4 bg-slate-900 text-white rounded-[1.25rem] font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-3 hover:bg-amber-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                        >
                            {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <TrendingUp size={18} />}
                            Search
                        </button>
                        <button
                            onClick={() => { setNameSearch(''); setSizeFilter(''); }}
                            className="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Stock Ledger Table */}
            <div className="glass-card p-0 border-none overflow-hidden group hover:shadow-premium transition-all duration-500" id="printable-report">
                <div className="p-10 border-b border-slate-100 bg-white/40 flex flex-col lg:flex-row items-center justify-between gap-10">
                    <ReportHeader
                        reportTitle="Stock Report"
                        additionalInfo={`Snapshot Generated: ${new Date().toLocaleDateString('en-GB').replace(/\//g, '.')}`}
                    />
                    <div className="flex gap-6 no-print w-full lg:w-auto">
                        <div className="flex-1 lg:flex-none px-10 py-7 bg-amber-900 text-white rounded-[2.5rem] shadow-2xl shadow-amber-900/20 relative overflow-hidden group min-w-[280px]">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-200/60 mb-2">Total Stock Value</p>
                                <h3 className="text-4xl font-black tracking-tighter">₹{totalInventoryValue.toLocaleString('en-IN')}</h3>
                            </div>
                            <ArrowUpRight size={48} className="absolute bottom-2 right-4 text-white/5 group-hover:text-white/10 transition-colors" />
                        </div>
                        <div className="flex-1 lg:flex-none px-10 py-7 bg-white border border-slate-100 rounded-[2.5rem] shadow-premium min-w-[220px] group hover:bg-slate-50 transition-all">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Total Unit Count</p>
                            <h3 className="text-4xl font-black tracking-tighter text-slate-900">{totalUnits} <span className="text-xs text-slate-400 font-black uppercase tracking-widest ml-1">Pcs</span></h3>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="page-table">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-10 py-5">S.No</th>
                                <th className="px-10 py-5">Product Identity</th>
                                <th className="px-10 py-5">Dimension</th>
                                <th className="px-10 py-5 text-right">Available Qty</th>
                                <th className="px-10 py-5 text-right">Standard Rate</th>
                                <th className="px-10 py-5 text-right">Inventory Worth</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.length > 0 ? (
                                <>
                                    {reportData.map((row, index) => (
                                        <tr key={row.sno} className="group transition-colors hover:bg-slate-50/50">
                                            <td className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase">{row.sno}</td>
                                            <td className="px-10 py-8">
                                                <div className="flex flex-col">
                                                    <span className="text-base font-black text-slate-900 tracking-tight group-hover:text-amber-600 transition-colors uppercase">{row.item}</span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Verified SKU</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="inline-flex items-center px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest border border-white/10 shadow-lg shadow-slate-900/20">
                                                    {row.size}
                                                </div>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 text-slate-900 rounded-xl font-black text-xs border border-slate-200/50">
                                                    {row.qty} <span className="text-[9px] text-slate-400 uppercase tracking-widest">Pcs</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                <span className="text-sm font-black text-slate-900 tracking-tighter">₹{row.rate.toLocaleString('en-IN')}</span>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                <span className="text-lg font-black text-slate-900 tracking-tighter group-hover:text-amber-600 transition-colors">₹{(row.total || 0).toLocaleString('en-IN')}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-slate-900 text-white border-none shadow-2xl">
                                        <td colSpan="5" className="px-10 py-10 text-right text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Total Stock Value</td>
                                        <td className="px-10 py-10 text-right font-black text-3xl tracking-tighter text-amber-400">₹{totalInventoryValue.toLocaleString('en-IN')}</td>
                                    </tr>
                                </>
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-10 py-40 text-center">
                                        <div className="flex flex-col items-center justify-center gap-6">
                                            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-4 border border-dashed border-slate-200">
                                                <Package size={44} className="text-slate-300" />
                                            </div>
                                            <h4 className="text-2xl font-black text-slate-900 tracking-tighter">{isLoading ? 'Loading Stock Data...' : 'No Assets Found'}</h4>
                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Search for products to see stock levels.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Strategic Actions */}
                <div className="p-10 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-8 border-t border-slate-100">
                    <div className="flex items-center gap-4">
                        <ShieldCheck size={24} className="text-emerald-500" />
                        <div className="space-y-0.5">
                             <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Stock Inventory</p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Sri Ram Fashions • Current Stock Ledger</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={handlePrint}
                            className="px-8 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:border-amber-500 hover:text-amber-600 transition-all flex items-center gap-3 shadow-sm active:scale-95"
                        >
                            <Printer size={18} /> Print Archive
                        </button>
                        <button
                            onClick={() => setShowInvoiceModal(true)}
                            className="px-10 py-4 bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-amber-500 transition-all shadow-xl shadow-amber-600/10 active:scale-95 flex items-center gap-3"
                        >
                            <FileText size={18} /> View Details
                        </button>
                    </div>
                </div>
            </div>

            {/* Stock Details Modal */}
            {showInvoiceModal && (
                <div className="modal-overlay" onClick={() => setShowInvoiceModal(false)}>
                    <div className="modal-content max-w-6xl border-none shadow-3xl" onClick={(e) => e.stopPropagation()}>
                        <div className="px-10 py-10 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                            <div className="flex items-center gap-8">
                                <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center text-white border border-white/10 backdrop-blur-md shadow-2xl">
                                    <Database size={32} />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black tracking-tighter">Stock Report Details</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 italic">Stock Audit Ledger</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={handlePrint} className="w-14 h-14 rounded-2xl bg-white/10 hover:bg-amber-600 text-white flex items-center justify-center transition-all border border-white/10">
                                    <Printer size={24} />
                                </button>
                                <button onClick={() => setShowInvoiceModal(false)} className="w-14 h-14 rounded-2xl bg-white/10 hover:bg-red-500 text-white flex items-center justify-center transition-all border border-white/10">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="p-0 overflow-y-auto max-h-[75vh] bg-slate-100 custom-scrollbar py-16 flex justify-center">
                             <div className="max-w-[850px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] bg-white overflow-hidden rounded-[2.5rem] border border-slate-100 p-16 transform scale-[0.95] origin-top">
                                <ReportHeader reportTitle="Stock Status Report" additionalInfo={`System Timestamp: ${new Date().toLocaleDateString('en-GB').replace(/\//g, '.')}`} />
                                <table className="w-full border-collapse mt-16">
                                    <thead>
                                        <tr className="bg-slate-50 border-y-2 border-slate-200">
                                            <th className="text-left py-6 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">S.No</th>
                                            <th className="text-left py-6 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Product Entity</th>
                                            <th className="text-left py-6 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Dimension</th>
                                            <th className="text-right py-6 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Quantity</th>
                                            <th className="text-right py-6 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Unit Rate</th>
                                            <th className="text-right py-6 px-4 font-black text-slate-900 text-[10px] uppercase tracking-widest">Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {reportData.map((row) => (
                                            <tr key={row.sno} className="group">
                                                <td className="py-5 px-4 text-slate-400 font-black text-[10px]">{row.sno}</td>
                                                <td className="py-5 px-4 text-slate-900 font-black text-xs uppercase">{row.item}</td>
                                                <td className="py-5 px-4 text-slate-900 font-black text-xs uppercase">{row.size}</td>
                                                <td className="py-5 px-4 text-right text-slate-900 font-black text-xs">{row.qty}</td>
                                                <td className="py-5 px-4 text-right text-slate-900 font-black text-xs">₹{row.rate.toLocaleString('en-IN')}</td>
                                                <td className="py-5 px-4 text-right text-slate-900 font-black text-sm tracking-tighter">₹{(row.total || 0).toLocaleString('en-IN')}</td>
                                            </tr>
                                        ))}
                                         <tr className="bg-slate-900 text-white shadow-2xl">
                                             <td colSpan="5" className="py-8 px-4 text-right font-black text-[11px] uppercase tracking-[0.4em] text-amber-400">Total Stock Value</td>
                                             <td className="py-8 px-4 text-right font-black text-amber-400 text-2xl tracking-tighter">₹{totalInventoryValue.toLocaleString('en-IN')}</td>
                                         </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                         <div className="px-10 py-8 bg-white border-t border-slate-100 flex justify-between items-center rounded-b-[2.5rem]">
                             <div className="flex items-center gap-4">
                                 <ShieldCheck size={24} className="text-blue-500" />
                                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Verified Inventory Asset Archive</span>
                             </div>
                            <button onClick={() => setShowInvoiceModal(false)} className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-amber-600 transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98]">Close Archive View</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockReportsPage;
