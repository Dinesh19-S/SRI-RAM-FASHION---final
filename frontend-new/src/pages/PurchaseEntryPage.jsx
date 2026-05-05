import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, ArrowLeft, FileText, Save, Eye, Edit, Trash2, X, Printer, Mail } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';
import { purchaseEntriesAPI, suppliersAPI, settingsAPI, emailAPI } from '../services/api';
import { EmailActionModal, useToast } from '../components/common';
import BillTemplate from '../components/BillTemplate';
import { getEmailRecipientValidation, pickDefaultRecipient } from '../utils/emailUtils';
import { useSelector } from 'react-redux';


// Common textile/fabric HSN codes
const TEXTILE_HSN_CODES = [
    { code: '5402', description: 'Synthetic filament yarn (Lycra/Spandex)' },
    { code: '5407', description: 'Woven fabrics of synthetic filament yarn' },
    { code: '5408', description: 'Woven fabrics of artificial filament yarn' },
    { code: '5512', description: 'Woven fabrics of synthetic staple fibres (>=85%)' },
    { code: '5513', description: 'Woven fabrics of synthetic staple fibres (<85%)' },
    { code: '5514', description: 'Woven fabrics of synthetic staple fibres (twill)' },
    { code: '5515', description: 'Woven fabrics of synthetic staple fibres (other)' },
    { code: '5516', description: 'Woven fabrics of artificial staple fibres' },
    { code: '6001', description: 'Pile fabrics (knitted/crocheted)' },
    { code: '6004', description: 'Knitted fabrics (>30cm, elastomeric yarn)' },
    { code: '6005', description: 'Warp knit fabrics' },
    { code: '6006', description: 'Knitted/crocheted fabrics (other)' },
    { code: '6101', description: 'Mens overcoats (knitted/crocheted)' },
    { code: '6104', description: 'Womens suits (knitted/crocheted)' },
    { code: '6105', description: 'Mens shirts (knitted/crocheted)' },
    { code: '6106', description: 'Womens blouses (knitted/crocheted)' },
    { code: '6109', description: 'T-shirts, singlets (knitted/crocheted)' },
    { code: '6110', description: 'Jerseys, pullovers, cardigans' },
    { code: '6115', description: 'Hosiery (stockings, socks)' },
    { code: '6116', description: 'Gloves (knitted/crocheted)' },
];

// Common fabric colors
const FABRIC_COLORS = [
    'Red', 'Blue', 'Black', 'White', 'Green', 'Yellow', 'Orange', 'Purple',
    'Pink', 'Brown', 'Grey', 'Navy Blue', 'Maroon', 'Cream', 'Beige',
    'Sky Blue', 'Olive', 'Turquoise', 'Magenta', 'Peach', 'Lavender',
    'Burgundy', 'Teal', 'Coral', 'Mint', 'Rust', 'Ivory', 'Charcoal',
    'Multi Color', 'Printed'
];

const PurchaseEntryPage = () => {
    const toast = useToast();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const [showNewEntry, setShowNewEntry] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [purchases, setPurchases] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
    const [searchTrigger, setSearchTrigger] = useState(0);
    const [filters, setFilters] = useState({
        invNo: '',
        company: '',
        fromDate: '',
        toDate: ''
    });

    // New/Edit Purchase Entry State
    const [isEditing, setIsEditing] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showBillModal, setShowBillModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailTo, setEmailTo] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [billData, setBillData] = useState(null);
    const [settings, setSettings] = useState(null);
    const [newPurchase, setNewPurchase] = useState({
        supplier: '',
        date: new Date().toISOString().split('T')[0],
        invNo: ''
    });

    const [items, setItems] = useState([
        { id: 1, particular: '', hsnCode: '', designColor: '', weightKg: '', ratePerKg: '', gstRate: '0' }
    ]);

    useEffect(() => {
        fetchPurchases();
    }, [pagination.page, pagination.limit, searchTrigger]);

    useEffect(() => {
        fetchSuppliers();
    }, []);

    useEffect(() => {
        if (showBillModal && !settings) {
            fetchSettings();
        }
    }, [showBillModal, settings]);

    const fetchPurchases = async () => {
        setIsLoading(true);
        try {
            const params = {
                page: pagination.page,
                limit: pagination.limit
            };
            if (filters.invNo) params.search = filters.invNo;
            if (filters.company) params.search = filters.company;
            if (filters.fromDate) params.fromDate = filters.fromDate;
            if (filters.toDate) params.toDate = filters.toDate;

            const response = await purchaseEntriesAPI.getAll(params);
            setPurchases(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                total: response.data.pagination?.total || 0,
                pages: response.data.pagination?.pages || 0
            }));
        } catch (error) {
            console.error('Error fetching purchases:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSuppliers = async () => {
        try {
            const response = await suppliersAPI.getAll({ limit: 100 });
            setSuppliers(response.data.data || []);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await settingsAPI.get();
            setSettings(response.data.data || response.data);
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const handleSearch = () => {
        setPagination(prev => ({ ...prev, page: 1 }));
        setSearchTrigger((value) => value + 1);
    };

    const handleClearFilters = () => {
        setFilters({ invNo: '', company: '', fromDate: '', toDate: '' });
        setPagination((prev) => ({ ...prev, page: 1 }));
        setSearchTrigger((value) => value + 1);
    };

    const handleNewPurchase = () => {
        resetForm();
        setShowNewEntry(true);
    };

    const handleBack = () => {
        setShowNewEntry(false);
        resetForm();
    };

    const resetForm = () => {
        setNewPurchase({
            supplier: '',
            date: new Date().toISOString().split('T')[0],
            invNo: ''
        });
        setItems([{ id: 1, particular: '', hsnCode: '', designColor: '', weightKg: '', ratePerKg: '', gstRate: '0' }]);
        setIsEditing(false);
        setSelectedEntry(null);
    };

    const handleAddItem = () => {
        setItems([...items, {
            id: items.length + 1,
            particular: '',
            hsnCode: '',
            designColor: '',
            weightKg: '',
            ratePerKg: '',
            gstRate: '0'
        }]);
    };

    const handleRemoveItem = (id) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const handleItemChange = (id, field, value) => {
        setItems(items.map(item => {
            if (item.id !== id) return item;
            return { ...item, [field]: value };
        }));
    };

    const calculateItemTotal = (item) => {
        const amount = (parseFloat(item.weightKg) || 0) * (parseFloat(item.ratePerKg) || 0);
        const gst = (amount * (parseFloat(item.gstRate) || 0)) / 100;
        return amount + gst;
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2
    }).format(Number(amount) || 0);

    const handleSave = async () => {
        if (!newPurchase.supplier) {
            toast.warning('Please enter supplier name');
            return;
        }

        if (!newPurchase.invNo) {
            toast.warning('Please enter invoice number');
            return;
        }

        const validItems = items.filter(item => item.particular && item.weightKg && item.ratePerKg);
        if (validItems.length === 0) {
            toast.warning('Please add at least one item with particulars, weight and rate per kg');
            return;
        }

        // Warn about potentially invalid HSN codes
        const invalidHsnItems = validItems.filter(item => item.hsnCode && item.hsnCode.length < 4);
        if (invalidHsnItems.length > 0) {
            toast.warning('Some items have HSN codes shorter than 4 digits. Please verify HSN codes are correct.');
            return;
        }

        setIsSubmitting(true);
        try {
            const entryData = {
                supplier: { 
                    name: newPurchase.supplier,
                    // Try to find supplier details if they exist in state
                    ...(suppliers.find(s => s.companyName === newPurchase.supplier) || {})
                },
                date: newPurchase.date,
                invoiceNumber: newPurchase.invNo,
                items: validItems.map(item => ({
                    particular: item.particular,
                    hsnCode: item.hsnCode || '',
                    designColor: item.designColor || '',
                    weightKg: parseFloat(item.weightKg) || 0,
                    ratePerKg: parseFloat(item.ratePerKg) || 0,
                    gstRate: parseFloat(item.gstRate) || 0
                }))
            };

            if (isEditing && selectedEntry) {
                await purchaseEntriesAPI.update(selectedEntry._id, entryData);
                toast.success('Purchase entry updated successfully');
            } else {
                await purchaseEntriesAPI.create(entryData);
                toast.success('Purchase entry saved successfully');
            }

            setShowNewEntry(false);
            resetForm();
            fetchPurchases();
        } catch (error) {
            toast.error('Error saving purchase entry: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleView = (entry) => {
        setSelectedEntry(entry);
        setShowViewModal(true);
    };

    const handleEdit = (entry) => {
        setNewPurchase({
            supplier: entry.supplier?.name || '',
            date: entry.date ? new Date(entry.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            invNo: entry.invoiceNumber || ''
        });
        setItems(entry.items?.map((item, index) => ({
            id: index + 1,
            particular: item.particular || '',
            hsnCode: item.hsnCode || '',
            designColor: item.designColor || '',
            weightKg: item.weightKg?.toString() || '',
            ratePerKg: item.ratePerKg?.toString() || '',
            gstRate: item.gstRate?.toString() || '0'
        })) || [{ id: 1, particular: '', hsnCode: '', designColor: '', weightKg: '', ratePerKg: '', gstRate: '0' }]);
        setSelectedEntry(entry);
        setIsEditing(true);
        setShowNewEntry(true);
    };

    const handleDeleteClick = (entry) => {
        setSelectedEntry(entry);
        setShowDeleteConfirm(true);
    };

    const handleGenerateBill = (entry) => {
        const totalWeight = entry.items?.reduce((sum, item) => sum + (item.weightKg || 0), 0) || 0;
        const bill = {
            _id: entry._id,
            billNumber: `PUR-${entry.invoiceNumber}`,
            billType: 'PURCHASE',
            referenceInvoiceNumber: entry.invoiceNumber,
            date: entry.date,
            customer: {
                name: entry.supplier?.name || '',
                phone: entry.supplier?.mobile || '',
                address: entry.supplier?.address || '',
                gstin: entry.supplier?.gstin || '',
                state: entry.supplier?.state || 'Tamilnadu',
                stateCode: entry.supplier?.stateCode || '33',
                email: entry.supplier?.email || ''
            },
            items: entry.items?.map(item => ({
                productName: item.particular,
                hsnCode: item.hsnCode || '',
                designColor: item.designColor || '',
                sizesOrPieces: item.designColor || '',
                weightKg: item.weightKg || 0,
                ratePerKg: item.ratePerKg || 0,
                quantity: item.weightKg || 0,
                price: item.ratePerKg || 0,
                gstRate: item.gstRate || 0,
                cgst: item.cgst || 0,
                sgst: item.sgst || 0,
                igst: item.igst || 0,
                total: item.total || (item.weightKg || 0) * (item.ratePerKg || 0)
            })) || [],
            subtotal: entry.subtotal || 0,
            discountAmount: 0,
            taxableAmount: entry.subtotal || 0,
            totalTax: entry.totalTax || 0,
            cgst: entry.totalCgst || 0,
            sgst: entry.totalSgst || 0,
            igst: entry.totalIgst || 0,
            totalPacks: entry.totalWeight || totalWeight,
            numOfBundles: 1,
            roundOff: entry.roundOff || 0,
            grandTotal: entry.grandTotal || 0
        };
        setBillData(bill);
        setShowBillModal(true);
    };

    const handlePrintBill = () => {
        const printContent = document.getElementById('purchase-bill-template');
        if (!printContent) return;
        const printWindow = window.open('', '_blank');
        const billCSS = document.querySelector('link[href*="BillTemplate"]');
        const cssLink = billCSS ? billCSS.href : '';
        printWindow.document.write(`
            <html>
            <head>
                <title>Purchase Bill</title>
                <link rel="stylesheet" href="${cssLink}" />
                <style>
                    @page { size: A4; margin: 0; }
                    body { margin: 0; padding: 0; }
                    .bill-template-tax { width: 210mm; min-height: 297mm; margin: 0 auto; }
                </style>
            </head>
            <body>${printContent.innerHTML}</body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); }, 500);
    };

    const handleEmailBill = async () => {
        if (!billData) return;
        const { hasValidRecipients } = getEmailRecipientValidation(emailTo);
        if (!hasValidRecipients) {
            toast.warning('Please enter at least one valid recipient email');
            return;
        }

        setIsSendingEmail(true);
        try {
            const response = await emailAPI.sendBill(billData._id, emailTo);
            if (response.data.success) {
                toast.success(response.data.message || 'Email sent successfully');
                setShowEmailModal(false);
                setBillData(null);
                setEmailTo('');
            } else {
                toast.error(response.data.message || 'Failed to send email. Please check the recipient address.');
            }
        } catch (error) {
            toast.error('Failed to send email: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsSendingEmail(false);
        }
    };


    const handleDelete = async () => {
        try {
            await purchaseEntriesAPI.delete(selectedEntry._id);
            toast.success('Purchase entry deleted successfully');
            setShowDeleteConfirm(false);
            setSelectedEntry(null);
            fetchPurchases();
        } catch (error) {
            toast.error('Error deleting purchase entry: ' + (error.response?.data?.message || error.message));
        }
    };

    // Show New Purchase Entry Form
    if (showNewEntry) {
        return (
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleBack}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft size={20} className="text-gray-700" />
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {isEditing ? 'Edit Purchase Entry' : 'New Purchase Entry'}
                        </h1>
                    </div>
                    <button className="btn btn-secondary">
                        <FileText size={18} />
                        INVOICE
                    </button>
                </div>

                {/* Top Fields */}
                <div className="card">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="form-label">Supplier *</label>
                            <input
                                type="text"
                                className="form-input border-2 border-cyan-500 focus:border-cyan-600 focus:ring-cyan-500"
                                placeholder="Enter Supplier Name"
                                value={newPurchase.supplier}
                                onChange={(e) => setNewPurchase({ ...newPurchase, supplier: e.target.value })}
                                list="supplier-list"
                            />
                            <datalist id="supplier-list">
                                {suppliers.map(s => (
                                    <option key={s._id} value={s.companyName} />
                                ))}
                            </datalist>
                        </div>
                        <div>
                            <label className="form-label">Date</label>
                            <input
                                type="date"
                                className="form-input"
                                value={newPurchase.date}
                                onChange={(e) => setNewPurchase({ ...newPurchase, date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="form-label">Inv No *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter Invoice Number"
                                value={newPurchase.invNo}
                                onChange={(e) => setNewPurchase({ ...newPurchase, invNo: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* New Purchase Entry Table */}
                <div className="card">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Fabric Items</h2>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-100 border-b-2 border-gray-300">
                                    <th className="p-3 text-left text-sm font-semibold text-gray-700" style={{ width: '60px' }}>S No</th>
                                    <th className="p-3 text-left text-sm font-semibold text-gray-700">Particulars *</th>
                                    <th className="p-3 text-left text-sm font-semibold text-gray-700" style={{ width: '100px' }}>HSN</th>
                                    <th className="p-3 text-left text-sm font-semibold text-gray-700" style={{ width: '140px' }}>Design / Color</th>
                                    <th className="p-3 text-left text-sm font-semibold text-gray-700" style={{ width: '90px' }}>WT (KG) *</th>
                                    <th className="p-3 text-left text-sm font-semibold text-gray-700" style={{ width: '100px' }}>Rate *</th>
                                    <th className="p-3 text-left text-sm font-semibold text-gray-700" style={{ width: '80px' }}>GST %</th>
                                    <th className="p-3 text-left text-sm font-semibold text-gray-700" style={{ width: '120px' }}>Total Rs.</th>
                                    <th className="p-3 text-left text-sm font-semibold text-gray-700" style={{ width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={item.id} className="border-b border-gray-200">
                                        <td className="p-3 text-sm font-medium text-gray-900">{index + 1}</td>
                                        <td className="p-3">
                                            <input
                                                type="text"
                                                className="form-input w-full"
                                                placeholder="Fabric name"
                                                value={item.particular}
                                                onChange={(e) => handleItemChange(item.id, 'particular', e.target.value)}
                                            />
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="text"
                                                className="form-input w-full"
                                                placeholder="HSN Code"
                                                value={item.hsnCode}
                                                onChange={(e) => handleItemChange(item.id, 'hsnCode', e.target.value)}
                                                list="hsn-code-list"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <select
                                                className="form-input w-full"
                                                value={item.designColor}
                                                onChange={(e) => handleItemChange(item.id, 'designColor', e.target.value)}
                                            >
                                                <option value="">-- Select Color --</option>
                                                {FABRIC_COLORS.map(color => (
                                                    <option key={color} value={color}>{color}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="number"
                                                className="form-input w-full"
                                                placeholder="Weight"
                                                value={item.weightKg}
                                                onChange={(e) => handleItemChange(item.id, 'weightKg', e.target.value)}
                                                min="0"
                                                step="0.01"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="number"
                                                className="form-input w-full"
                                                placeholder="Rate/KG"
                                                value={item.ratePerKg}
                                                onChange={(e) => handleItemChange(item.id, 'ratePerKg', e.target.value)}
                                                min="0"
                                                step="0.01"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="number"
                                                className="form-input w-full"
                                                placeholder="GST%"
                                                value={item.gstRate}
                                                onChange={(e) => handleItemChange(item.id, 'gstRate', e.target.value)}
                                                min="0"
                                            />
                                        </td>
                                        <td className="p-3 text-sm font-bold text-gray-900">
                                            {formatCurrency(calculateItemTotal(item))}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex gap-1">
                                                {index === items.length - 1 && (
                                                    <button
                                                        onClick={handleAddItem}
                                                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                )}
                                                {items.length > 1 && (
                                                    <button
                                                        onClick={() => handleRemoveItem(item.id)}
                                                        className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-md transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {/* HSN Code datalist */}
                        <datalist id="hsn-code-list">
                            {TEXTILE_HSN_CODES.map(hsn => (
                                <option key={hsn.code} value={hsn.code}>{hsn.code} - {hsn.description}</option>
                            ))}
                        </datalist>
                    </div>

                    {/* Grand Total */}
                    <div className="mt-4 flex justify-end">
                        <div className="bg-gray-100 px-6 py-3 rounded-lg">
                            <span className="text-lg font-bold text-gray-900">
                                Grand Total: {formatCurrency(items.reduce((sum, item) => sum + calculateItemTotal(item), 0))}
                            </span>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            onClick={handleBack}
                            className="btn btn-secondary px-6"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSubmitting}
                            className="btn btn-primary px-8"
                        >
                            <Save size={18} />
                            {isSubmitting ? 'Saving...' : 'SAVE'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Show Purchase List (default view)
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Purchase</h1>
                <div className="flex items-center gap-2">
                    <button
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 rounded-lg font-medium text-sm transition-colors border border-gray-200 hover:bg-gray-100"
                        onClick={() => navigate('/dashboard/purchase/billing')}
                    >
                        <FileText size={16} />
                        PURCHASE BILLING
                    </button>
                    <button
                        className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium text-sm transition-colors"
                        style={{ backgroundColor: '#3b82f6' }}
                        onClick={handleNewPurchase}
                    >
                        <Plus size={18} />
                        NEW PURCHASE ENTRY
                    </button>
                </div>
            </div>

            {/* Search Filters Card */}
            <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="shrink-0 w-32">
                        <label className="form-label">Inv No</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Enter invoice number"
                            value={filters.invNo}
                            onChange={(e) => setFilters({ ...filters, invNo: e.target.value })}
                        />
                    </div>
                    <div className="shrink-0 w-48">
                        <label className="form-label">Company</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Enter company name"
                            value={filters.company}
                            onChange={(e) => setFilters({ ...filters, company: e.target.value })}
                        />
                    </div>
                    <div className="shrink-0 w-36">
                        <label className="form-label">From Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={filters.fromDate}
                            onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                        />
                    </div>
                    <div className="shrink-0 w-36">
                        <label className="form-label">To Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={filters.toDate}
                            onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                        />
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={handleSearch}
                        disabled={isLoading}
                    >
                        <Search size={16} />
                        Search
                    </button>
                    <button
                        className="btn btn-ghost"
                        onClick={handleClearFilters}
                        title="Clear filters"
                    >
                        <X size={16} />
                        Clear
                    </button>
                </div>
            </div>

            {/* Data Table Card */}
            <div className="card p-0">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100 border-b-2 border-gray-300">
                                <th className="text-left p-4 text-sm font-bold text-gray-900">S No</th>
                                <th className="text-left p-4 text-sm font-bold text-gray-900">Date</th>
                                <th className="text-left p-4 text-sm font-bold text-gray-900">InvNo</th>
                                <th className="text-left p-4 text-sm font-bold text-gray-900">Company Name</th>
                                <th className="text-left p-4 text-sm font-bold text-gray-900">Total Weight (KG)</th>
                                <th className="text-left p-4 text-sm font-bold text-gray-900">Amount</th>
                                <th className="text-left p-4 text-sm font-bold text-gray-900">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="7" className="py-8 text-center">
                                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                    </td>
                                </tr>
                            ) : purchases.length > 0 ? (
                                purchases.map((purchase, index) => (
                                    <tr
                                        key={purchase._id}
                                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="p-4 text-sm font-medium text-gray-900">{(pagination.page - 1) * pagination.limit + index + 1}</td>
                                        <td className="p-4 text-sm font-medium text-gray-900">{formatDate(purchase.date)}</td>
                                        <td className="p-4 text-sm font-semibold" style={{ color: '#1e40af' }}>{purchase.invoiceNumber}</td>
                                        <td className="p-4 text-sm font-medium text-gray-900">{purchase.supplier?.name || '-'}</td>
                                        <td className="p-4 text-sm font-medium text-gray-900">
                                            {purchase.items?.reduce((sum, item) => sum + (item.weightKg || 0), 0).toFixed(2) || '0'} kg
                                        </td>
                                        <td className="p-4 text-sm font-bold text-green-600">{formatCurrency(purchase.grandTotal || 0)}</td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                <button
                                                    className="action-btn action-btn-blue"
                                                    title="View"
                                                    onClick={() => handleView(purchase)}
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    className="action-btn action-btn-green"
                                                    title="Edit"
                                                    onClick={() => handleEdit(purchase)}
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    className="action-btn action-btn-red"
                                                    title="Delete"
                                                    onClick={() => handleDeleteClick(purchase)}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                                <button
                                                    className="action-btn"
                                                    title="Generate Bill"
                                                    style={{ backgroundColor: '#7c3aed', color: 'white' }}
                                                    onClick={() => handleGenerateBill(purchase)}
                                                >
                                                    <FileText size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-600 font-medium">
                                        No purchase entries found. Click "NEW PURCHASE ENTRY" to add one.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                        <div className="text-sm text-gray-600">
                            Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                disabled={pagination.page <= 1}
                                className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                disabled={pagination.page >= pagination.pages}
                                className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
            </div>

            {/* New Entry Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => !isSubmitting && setShowModal(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="px-8 py-6" style={{ background: 'linear-gradient(135deg, #10b981 0%, #064e3b 100%)' }}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                    <ShoppingCart size={24} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Record Purchase Entry</h3>
                                    <p className="text-emerald-100 text-sm">Fill in vendor and invoice details to update stock</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto">
                            {/* Header Info */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="form-label font-bold text-gray-700">Vendor / Supplier *</label>
                                    <div className="relative">
                                        <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <select
                                            name="supplier"
                                            className="form-input pl-10 font-bold"
                                            value={formData.supplier}
                                            onChange={handleInputChange}
                                        >
                                            <option value="">Select a vendor</option>
                                            {suppliers.map(s => <option key={s._id} value={s._id}>{s.companyName}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="form-label font-bold text-gray-700">Invoice / Bill # *</label>
                                    <div className="relative">
                                        <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            name="billNumber"
                                            className="form-input pl-10 uppercase font-mono"
                                            placeholder="INV-001"
                                            value={formData.billNumber}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="form-label font-bold text-gray-700">Purchase Date</label>
                                    <div className="relative">
                                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="date"
                                            name="date"
                                            className="form-input pl-10"
                                            value={formData.date}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Items Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Package size={14} /> Item Details
                                    </h4>
                                    <button onClick={addItem} className="text-emerald-600 text-xs font-bold hover:underline flex items-center gap-1">
                                        <Plus size={14} /> Add Another Item
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {formData.items.map((item, index) => (
                                        <div key={index} className="grid grid-cols-12 gap-3 items-end p-4 rounded-2xl bg-gray-50 border border-gray-100 group animate-fade-in">
                                            <div className="col-span-12 md:col-span-5 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Product *</label>
                                                <select
                                                    className="form-input bg-white"
                                                    value={item.product}
                                                    onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                                                >
                                                    <option value="">Select Item</option>
                                                    {products.map(p => <option key={p._id} value={p._id}>{p.name} (Size: {p.size || '-'})</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-4 md:col-span-2 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Quantity *</label>
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    className="form-input bg-white text-center"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-4 md:col-span-2 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Unit Rate (₹)</label>
                                                <input
                                                    type="number"
                                                    placeholder="0.00"
                                                    className="form-input bg-white text-right"
                                                    value={item.rate}
                                                    onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-4 md:col-span-2 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase text-right block">Subtotal</label>
                                                <div className="form-input bg-gray-100 text-right font-bold text-gray-600 border-dashed">
                                                    {formatCurrency(item.total)}
                                                </div>
                                            </div>
                                            <div className="col-span-12 md:col-span-1 flex justify-center pb-1">
                                                <button
                                                    onClick={() => removeItem(index)}
                                                    className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Summary Section */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start pt-4 border-t border-gray-100">
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="form-label font-bold text-gray-700">Payment Status & Notes</label>
                                    <div className="flex gap-4 mb-4">
                                        <button
                                            onClick={() => setFormData(p => ({ ...p, paymentStatus: 'pending' }))}
                                            className={`flex-1 py-3 rounded-2xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${formData.paymentStatus === 'pending' ? 'bg-amber-50 border-amber-500 text-amber-700 ring-4 ring-amber-50' : 'bg-white border-gray-100 text-gray-400'}`}
                                        >
                                            Pending
                                        </button>
                                        <button
                                            onClick={() => setFormData(p => ({ ...p, paymentStatus: 'paid' }))}
                                            className={`flex-1 py-3 rounded-2xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${formData.paymentStatus === 'paid' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-4 ring-emerald-50' : 'bg-white border-gray-100 text-gray-400'}`}
                                        >
                                            <CheckCircle2 size={18} />
                                            Paid
                                        </button>
                                    </div>
                                    <textarea
                                        name="notes"
                                        className="form-input min-h-[100px]"
                                        placeholder="Add any additional remarks here..."
                                        value={formData.notes}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="bg-gray-900 rounded-3xl p-8 text-white space-y-6 shadow-xl shadow-gray-200">
                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Purchase Summary</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400">Total Items</span>
                                            <span className="font-bold">{formData.items.length}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400">Taxable Amount</span>
                                            <span className="font-bold">{formatCurrency(formData.totalAmount / 1.05)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm pb-3 border-b border-white/10">
                                            <span className="text-gray-400">GST (5%)</span>
                                            <span className="font-bold text-emerald-400">+{formatCurrency(formData.totalAmount - (formData.totalAmount / 1.05))}</span>
                                        </div>
                                        <div className="pt-2">
                                            <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Grand Total</p>
                                            <p className="text-4xl font-black text-white leading-none">
                                                {formatCurrency(formData.totalAmount)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-gray-50 flex items-center justify-end border-t border-gray-100">
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="btn btn-secondary px-8"
                                    disabled={isSubmitting}
                                >
                                    Discard
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="btn btn-primary px-10 flex items-center gap-2 !bg-emerald-600 hover:!bg-emerald-700"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : <Save size={18} />}
                                    {isSubmitting ? 'Recording...' : 'Finalize Entry'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {showViewModal && selectedEntry && (
                <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
                            <h4 className="font-semibold mb-2">Fabric Items</h4>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="p-2 text-left">Particular</th>
                                        <th className="p-2 text-left">HSN Code</th>
                                        <th className="p-2 text-left">Design/Color</th>
                                        <th className="p-2 text-right">Weight (KG)</th>
                                        <th className="p-2 text-right">Rate/KG</th>
                                        <th className="p-2 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedEntry.items?.map((item, i) => (
                                        <tr key={i} className="border-b">
                                            <td className="p-2">{item.particular}</td>
                                            <td className="p-2">{item.hsnCode || '-'}</td>
                                            <td className="p-2">{item.designColor || '-'}</td>
                                            <td className="p-2 text-right">{item.weightKg || 0} kg</td>
                                            <td className="p-2 text-right">{formatCurrency(item.ratePerKg || 0)}</td>
                                            <td className="p-2 text-right">{formatCurrency(item.total ?? ((item.weightKg || 0) * (item.ratePerKg || 0)))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="mt-4 text-right">
                                <span className="text-gray-500">Total Weight: </span>
                                <span className="font-semibold">{selectedEntry.items?.reduce((sum, item) => sum + (item.weightKg || 0), 0).toFixed(2)} kg</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && selectedEntry && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} className="text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Purchase Entry</h3>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to delete invoice <strong>{selectedEntry.invoiceNumber}</strong>? This action cannot be undone.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bill Preview Modal */}
            {showBillModal && billData && (
                <div className="modal-overlay" onClick={() => setShowBillModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 flex justify-between items-center" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}>
                            <h3 className="text-lg font-semibold text-white">Purchase Bill Preview</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={handlePrintBill}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    <Printer size={16} />
                                    Print
                                </button>
                                <button
                                    onClick={() => {
                                        setEmailTo(pickDefaultRecipient(billData.customer?.email, user?.email));
                                        setShowBillModal(false);
                                        setShowEmailModal(true);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    <Mail size={16} />
                                    Email
                                </button>
                                <button onClick={() => setShowBillModal(false)} className="text-white hover:text-gray-200">

                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[80vh]" id="purchase-bill-template">
                            <BillTemplate bill={billData} settings={settings} />
                        </div>
                    </div>
                </div>
            )}

            <EmailActionModal
                open={showEmailModal}
                title="Email Purchase Bill"
                description={`Send purchase bill details to the supplier or other recipients.`}
                value={emailTo}
                onChange={setEmailTo}
                onClose={() => setShowEmailModal(false)}
                onSubmit={handleEmailBill}
                isSubmitting={isSendingEmail}
            />
        </div>
    );
};

export default PurchaseEntryPage;
