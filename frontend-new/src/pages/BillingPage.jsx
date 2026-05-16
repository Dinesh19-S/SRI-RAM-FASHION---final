import { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBills, createBill, deleteBill, updateBillStatus } from '../store/slices/billsSlice';
import { fetchProducts } from '../store/slices/productsSlice';
import { fetchSettings } from '../store/slices/settingsSlice';
import { Plus, Search, Printer, Eye, Trash2, X, FileText, Download, Users, Receipt, Mail, Clock as ClockIcon, ArrowRight, ShoppingCart, IndianRupee, AtSign, Save, Edit3, RotateCcw, FileDown, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BillTemplate from '../components/BillTemplate';
import { customersAPI, emailAPI } from '../services/api';
import { EmailActionModal, useToast } from '../components/common';
import { getEmailRecipientValidation, pickDefaultRecipient } from '../utils/emailUtils';
import { downloadInvoicePDF, downloadEmptyTemplate, generateInvoicePdfFile, printInvoice, shareInvoice } from '../utils/invoiceGenerator';

const BILL_REFRESH_INTERVAL = 5 * 60 * 1000;

const toAmount = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const BillingPage = () => {
    const toast = useToast();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { items: bills, isLoading, lastFetchedAt } = useSelector((state) => state.bills);
    const { items: products } = useSelector((state) => state.products);
    const settings = useSelector((state) => state.settings.data);
    const { user } = useSelector((state) => state.auth);
    const previewBillRef = useRef(null);
    const emptyInvoiceRef = useRef(null);
    const createPreviewRef = useRef(null);


    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedBill, setSelectedBill] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showEmptyInvoiceModal, setShowEmptyInvoiceModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailBill, setEmailBill] = useState(null);
    const [emailTo, setEmailTo] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const [filterStatus, setFilterStatus] = useState('all');
    const [billTypeFilter, setBillTypeFilter] = useState('all');
    const [hasLoadedProducts, setHasLoadedProducts] = useState(false);
    const [hasLoadedSettings, setHasLoadedSettings] = useState(false);

    // Product searching in modal
    const [productSearch, setProductSearch] = useState('');
    const [isSearchingProducts, setIsSearchingProducts] = useState(false);

    const [customer, setCustomer] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        gstin: '',
        state: 'TAMILNADU',
        stateCode: '33'
    });
    const [transport, setTransport] = useState('');
    const [fromText, setFromText] = useState('TIRUPPUR');
    const [toText, setToText] = useState('');
    const [view, setView] = useState('LIST'); // 'LIST' or 'CREATE'
    const [isEditable, setIsEditable] = useState(true); // Builder mode toggle
    const [billItems, setBillItems] = useState([]);
    const [discount, setDiscount] = useState(0);
    const [numOfBundles, setNumOfBundles] = useState(0);

    const EMPTY_PAYMENT_DETAILS = {
        payerName: '',
        transactionRefId: '',
        notes: '',
        cardType: '',
        last4Digits: '',
        authCode: '',
        utrNumber: '',
        upiId: '',
        appName: '',
        bankName: '',
        accountHolderName: '',
        gatewayName: '',
        transactionId: '',
        receivedBy: '',
        receiptNumber: '',
        location: '',
        chequeNumber: '',
        chequeDate: '',
        accountNumber: '',
        clearingStatus: 'pending',
        referenceNote: ''
    };

    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [billPaymentStatus, setBillPaymentStatus] = useState('pending');
    const [paymentDetails, setPaymentDetails] = useState(EMPTY_PAYMENT_DETAILS);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerSuggestions, setCustomerSuggestions] = useState([]);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
    
    // Status update states
    const [showStatusUpdateModal, setShowStatusUpdateModal] = useState(false);
    const [statusUpdateBill, setStatusUpdateBill] = useState(null);
    const [statusUpdateMethod, setStatusUpdateMethod] = useState('cash');
    const [statusUpdateDetails, setStatusUpdateDetails] = useState(EMPTY_PAYMENT_DETAILS);

    useEffect(() => {
        if (!lastFetchedAt || Date.now() - lastFetchedAt > BILL_REFRESH_INTERVAL) {
            dispatch(fetchBills());
        }
    }, [dispatch, lastFetchedAt]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('view') === 'create') {
            setView('CREATE');
        } else {
            setView('LIST');
        }
    }, [window.location.search]);

    useEffect(() => {
        if (view !== 'CREATE' || hasLoadedProducts) {
            return undefined;
        }

        let isActive = true;
        dispatch(fetchProducts({ limit: 10 }))
            .unwrap()
            .then(() => {
                if (isActive) {
                    setHasLoadedProducts(true);
                }
            })
            .catch(() => {
                // Retry automatically when modal opens again.
            });

        return () => {
            isActive = false;
        };
    }, [dispatch, hasLoadedProducts, view]);

    useEffect(() => {
        const shouldLoadSettings = view === 'CREATE' || showPreviewModal || showEmptyInvoiceModal;
        if (!shouldLoadSettings || hasLoadedSettings) {
            return undefined;
        }

        let isActive = true;
        dispatch(fetchSettings())
            .unwrap()
            .then(() => {
                if (isActive) {
                    setHasLoadedSettings(true);
                }
            })
            .catch(() => {
                // Retry automatically when a settings-dependent modal opens again.
            });

        return () => {
            isActive = false;
        };
    }, [dispatch, hasLoadedSettings, showPreviewModal, showEmptyInvoiceModal]);

    // Search customers when customerSearch changes
    useEffect(() => {
        const searchCustomers = async () => {
            if (customerSearch.length < 2) {
                setCustomerSuggestions([]);
                return;
            }
            setIsSearchingCustomers(true);
            try {
                const response = await customersAPI.getAll({ search: customerSearch, limit: 5 });
                setCustomerSuggestions(response.data.data || []);
            } catch (error) {
                console.error('Error searching customers:', error);
            } finally {
                setIsSearchingCustomers(false);
            }
        };
        const debounce = setTimeout(searchCustomers, 300);
        return () => clearTimeout(debounce);
    }, [customerSearch]);

    // Search products in modal
    useEffect(() => {
        if (view !== 'CREATE') {
            return undefined;
        }

        const searchProducts = async () => {
            if (!productSearch.trim()) {
                // If search is empty, show default list (top 10)
                dispatch(fetchProducts({ limit: 10 }));
                return;
            }
            setIsSearchingProducts(true);
            try {
                dispatch(fetchProducts({ search: productSearch, limit: 10 }));
            } catch (error) {
                console.error('Error searching products:', error);
            } finally {
                setIsSearchingProducts(false);
            }
        };
        const debounce = setTimeout(searchProducts, 400);
        return () => clearTimeout(debounce);
    }, [productSearch, dispatch, view]);

    const selectCustomer = (selectedCustomer) => {
        setCustomer({
            name: selectedCustomer.companyName || '',
            phone: selectedCustomer.mobile || '',
            email: selectedCustomer.email || '',
            address: selectedCustomer.address || '',
            gstin: selectedCustomer.gstin || '',
            state: selectedCustomer.state || 'TAMILNADU',
            stateCode: selectedCustomer.stateCode || '33'
        });
        setCustomerSearch(selectedCustomer.companyName);
        setShowCustomerDropdown(false);
    };

    const addItemToBill = (product) => {
        // Always add as a new line item to allow same product with different sizes/rates
        const uniqueId = `${product._id}_${Date.now()}`;
        setBillItems([...billItems, {
            productId: product._id,
            uniqueId: uniqueId,
            name: product.name,
            productName: product.name,
            price: product.sellingPrice,
            quantity: 1,
            noOfPacks: 1,
            pcsInPack: 1,
            ratePerPiece: product.sellingPrice,
            ratePerPack: product.sellingPrice,
            hsnCode: product.hsn || '61034300',
            gstRate: product.gstRate || 5,
            sizesOrPieces: ''
        }]);
    };


    const updateItemQuantity = (uniqueId, quantity) => {
        if (quantity < 1) {
            setBillItems(billItems.filter(item => item.uniqueId !== uniqueId));
            return;
        }
        setBillItems(billItems.map(item =>
            item.uniqueId === uniqueId ? { ...item, quantity, noOfPacks: quantity } : item
        ));
    };

    const updateItemField = (uniqueId, field, value) => {
        setBillItems(billItems.map(item => {
            if (item.uniqueId === uniqueId) {
                const updatedItem = { ...item, [field]: value };
                // Keep quantity and noOfPacks in sync
                if (field === 'noOfPacks') updatedItem.quantity = value;
                // Auto-calculate ratePerPack = ratePerPiece × pcsInPack
                if (field === 'ratePerPiece') {
                    updatedItem.ratePerPack = value * (toAmount(updatedItem.pcsInPack, 1));
                }
                if (field === 'pcsInPack') {
                    updatedItem.ratePerPack = toAmount(updatedItem.ratePerPiece, 0) * value;
                }
                // Auto-parse sizesOrPieces: "S/10,M/10,L/5,XL/5" → pcsInPack = 30
                if (field === 'sizesOrPieces' && value) {
                    const entries = value.split(',').map(e => e.trim()).filter(Boolean);
                    let totalPcs = 0;
                    entries.forEach(entry => {
                        const parts = entry.split('/');
                        if (parts.length === 2) {
                            const pcs = parseInt(parts[1], 10);
                            if (!isNaN(pcs)) totalPcs += pcs;
                        }
                    });
                    if (totalPcs > 0) {
                        updatedItem.pcsInPack = totalPcs;
                        updatedItem.ratePerPack = toAmount(updatedItem.ratePerPiece, 0) * totalPcs;
                    }
                }
                return updatedItem;
            }
            return item;
        }));
    };

    const totals = useMemo(() => {
        let subtotal = 0;
        let totalTax = 0;
        let totalPacks = 0;

        billItems.forEach(item => {
            const itemPrice = toAmount(item.ratePerPack, toAmount(item.price, 0));
            const itemQty = toAmount(item.noOfPacks, toAmount(item.quantity, 0));
            const itemSubtotal = itemPrice * itemQty;
            
            subtotal += itemSubtotal;
            totalPacks += Number(itemQty);

            // Per-item tax calculation logic
            const itemDiscountRate = toAmount(discount, 0);
            const itemDiscount = (itemSubtotal * itemDiscountRate) / 100;
            const itemTaxable = itemSubtotal - itemDiscount;
            const itemGstRate = toAmount(item.gstRate, 5);
            const itemTax = (itemTaxable * itemGstRate) / 100;
            totalTax += itemTax;
        });

        const discountAmount = (subtotal * toAmount(discount, 0)) / 100;
        const taxableAmount = subtotal - discountAmount;
        
        const isInterState = customer?.stateCode && String(customer.stateCode) !== '33';
        
        let cgstAmount = 0;
        let sgstAmount = 0;
        let igstAmount = 0;

        if (isInterState) {
            igstAmount = totalTax;
        } else {
            cgstAmount = totalTax / 2;
            sgstAmount = totalTax / 2;
        }
        
        const rawTotal = taxableAmount + totalTax;
        const grandTotal = Math.round(rawTotal);
        const roundOff = Number((grandTotal - rawTotal).toFixed(2));

        const firstGstRate = toAmount(billItems[0]?.gstRate, 5);
        const cgstRate = isInterState ? 0 : firstGstRate / 2;
        const sgstRate = isInterState ? 0 : firstGstRate / 2;
        const igstRate = isInterState ? firstGstRate : 0;

        return {
            subtotal,
            discountAmount,
            taxableAmount,
            cgstAmount,
            sgstAmount,
            igstAmount,
            totalTax,
            grandTotal,
            totalPacks,
            roundOff,
            cgstRate,
            sgstRate,
            igstRate
        };
    }, [billItems, discount, customer]);

    const { subtotal, discountAmount, taxableAmount, cgstAmount, sgstAmount, igstAmount, totalTax, grandTotal, totalPacks, roundOff, cgstRate, sgstRate, igstRate } = totals;

    const resolveBillType = (billType) => (billType === 'DIRECT' ? 'SALES' : (billType || 'SALES'));

    const nextInvoiceNumber = useMemo(() => {
        if (!bills || bills.length === 0) return 'SRF-001';
        const salesBills = bills.filter(b => resolveBillType(b.billType) === 'SALES');
        return `SRF-${(salesBills.length + 1).toString().padStart(3, '0')}`;
    }, [bills]);

    const handleCreateBill = async () => {
        if (!customer.name || !customer.phone || billItems.length === 0) {
            toast.warning('Please fill buyer details and add at least one item');
            return;
        }

        try {
            const billData = {
                customer: { ...customer },
                items: billItems.map(item => ({
                    productId: item.productId,
                    name: item.name,
                    quantity: toAmount(item.noOfPacks, item.quantity),
                    price: item.price,
                    ratePerPiece: item.ratePerPiece,
                    pcsInPack: item.pcsInPack,
                    ratePerPack: item.ratePerPack,
                    sizesOrPieces: item.sizesOrPieces,
                    hsnCode: item.hsnCode,
                    gstRate: item.gstRate,
                    total: (toAmount(item.ratePerPack, item.price) * toAmount(item.noOfPacks, item.quantity))
                })),
                transport,
                fromText,
                toText,
                subtotal,
                discount,
                taxableAmount,
                cgst: cgstAmount,
                sgst: sgstAmount,
                igst: igstAmount,
                totalTax,
                roundOff,
                grandTotal,
                totalPacks,
                numOfBundles,
                paymentMethod: billPaymentStatus === 'paid' ? paymentMethod : undefined,
                paymentStatus: billPaymentStatus,
                paymentDetails: billPaymentStatus === 'paid' ? paymentDetails : undefined
            };

            await dispatch(createBill(billData)).unwrap();
            toast.success('Bill created successfully');
            navigate('/dashboard/billing');
            resetForm();
        } catch (error) {
            toast.error(error || 'Failed to create bill');
        }
    };

    const resetForm = () => {
        setCustomer({ name: '', phone: '', email: '', address: '', gstin: '', state: 'TAMILNADU', stateCode: '33' });
        setTransport('');
        setFromText('TIRUPPUR');
        setToText('');
        setBillItems([]);
        setDiscount(0);
        setNumOfBundles(0);
        setCustomerSearch('');
        setBillPaymentStatus('pending');
        setPaymentMethod('cash');
        setPaymentDetails(EMPTY_PAYMENT_DETAILS);
    };

    const handleViewBill = (bill) => {
        setSelectedBill(bill);
        setShowPreviewModal(true);
    };

    const ensureSettingsLoaded = async () => {
        if (settings) return settings;
        try {
            const loadedSettings = await dispatch(fetchSettings()).unwrap();
            setHasLoadedSettings(true);
            return loadedSettings;
        } catch (error) {
            toast.error('Failed to load billing settings');
            return null;
        }
    };

    const resolvePreviewElement = (bill) => (
        showPreviewModal && selectedBill?._id === bill?._id ? previewBillRef.current : null
    );

    const handleDownloadPDF = async (bill, element = null) => {
        try {
            const currentSettings = await ensureSettingsLoaded();
            if (!currentSettings) return;
            await downloadInvoicePDF(
                bill,
                currentSettings,
                `SRI_RAM_FASHIONS_Invoice_${bill?.billNumber || 'bill'}.pdf`,
                { element: element || resolvePreviewElement(bill) }
            );
            toast.success('PDF download started');
        } catch (error) {
            toast.error('Failed to generate PDF');
        }
    };

    const handlePrintBill = async (bill, element = null, isEmpty = false) => {
        try {
            const currentSettings = await ensureSettingsLoaded();
            if (!currentSettings) return;
            await printInvoice(bill, currentSettings, {
                element: element || resolvePreviewElement(bill),
                isEmpty
            });
        } catch (error) {
            toast.error('Failed to open print');
        }
    };

    const handleShareBill = async (bill, element = null, isEmpty = false) => {
        try {
            const currentSettings = await ensureSettingsLoaded();
            if (!currentSettings) return;

            const result = await shareInvoice(bill, currentSettings, {
                element: element || resolvePreviewElement(bill),
                isEmpty,
                filename: `SRI_RAM_FASHIONS_Invoice_${bill?.billNumber || 'bill'}.pdf`,
                title: 'Invoice From SRI RAM FASHIONS',
                text: `Invoice ${bill?.billNumber || ''}`
            });

            if (!result.shared) {
                toast.info('Share is not available on this device. PDF downloaded instead.');
            }
        } catch (error) {
            toast.error('Failed to share invoice');
        }
    };

    const handleDownloadEmptyTemplate = async () => {
        try {
            const currentSettings = await ensureSettingsLoaded();
            if (!currentSettings) return;
            await downloadEmptyTemplate(currentSettings, 'SRI_RAM_FASHIONS_Empty_Template.pdf', { element: emptyInvoiceRef.current });
            toast.success('Template download started');
        } catch (error) {
            toast.error('Failed to download template');
        }
    };

    const openEmailModal = (bill) => {
        setEmailBill(bill);
        setEmailTo(pickDefaultRecipient(bill?.customer?.email, user?.email));
        setShowEmailModal(true);
    };

    const handleSendEmail = async () => {
        const { hasValidRecipients } = getEmailRecipientValidation(emailTo);
        if (!emailBill || !hasValidRecipients) {
            toast.warning('Please enter a valid email address');
            return;
        }

        setIsSendingEmail(true);
        const toastId = toast.loading('Generating invoice PDF...');

        try {
            const currentSettings = await ensureSettingsLoaded();
            if (!currentSettings) return;

            const invoiceFile = await generateInvoicePdfFile(emailBill, currentSettings, {
                element: resolvePreviewElement(emailBill),
                filename: `SRI_RAM_FASHIONS_Invoice_${emailBill?.billNumber || 'bill'}.pdf`
            });

            toast.update(toastId, { message: 'Sending email...', type: 'info', duration: 3000 });

            const response = await emailAPI.sendBillPdf({
                to: emailTo,
                billNumber: emailBill.billNumber,
                customerName: emailBill.customer?.name,
                pdfFile: invoiceFile
            });

            if (response.data?.success) {
                toast.update(toastId, { message: response.data.message || 'Email sent successfully', type: 'success', duration: 3000 });
                setShowEmailModal(false);
                setEmailBill(null);
                setEmailTo('');
            } else {
                toast.update(toastId, { message: response.data?.message || 'Failed to send email', type: 'error', duration: 3000 });
            }
        } catch (error) {
            toast.update(toastId, { message: error?.response?.data?.message || 'Email service error', type: 'error', duration: 3000 });
        } finally {
            setIsSendingEmail(false);
        }
    };

    const handleDeleteClick = (bill) => {
        setSelectedBill(bill);
        setShowDeleteConfirm(true);
    };

    const handleDeleteBill = async () => {
        if (!selectedBill) return;
        setShowDeleteConfirm(false);
        try {
            await dispatch(deleteBill(selectedBill._id)).unwrap();
            toast.success('Bill deleted');
            setSelectedBill(null);
        } catch (error) {
            toast.error(error || 'Failed to delete bill');
        }
    };

    const handleStatusChange = async (billId, newStatus) => {
        if (newStatus === 'paid') {
            const bill = bills.find(b => b._id === billId);
            setStatusUpdateBill(bill);
            setStatusUpdateMethod(bill?.paymentMethod || 'cash');
            setStatusUpdateDetails(bill?.paymentDetails || EMPTY_PAYMENT_DETAILS);
            setShowStatusUpdateModal(true);
            return;
        }
        try {
            await dispatch(updateBillStatus({ id: billId, status: newStatus })).unwrap();
            toast.success(`Bill marked as ${newStatus}`);
        } catch (error) {
            toast.error(error || 'Failed to update status');
        }
    };

    const handleStatusUpdateSubmit = async () => {
        if (!statusUpdateBill) return;
        try {
            await dispatch(updateBillStatus({ 
                id: statusUpdateBill._id, 
                status: 'paid',
                data: { paymentMethod: statusUpdateMethod, paymentDetails: statusUpdateDetails }
            })).unwrap();
            toast.success('Bill marked as paid');
            setShowStatusUpdateModal(false);
        } catch (error) {
            toast.error(error || 'Failed to update status');
        }
    };

    const renderPaymentFields = (method, details, setDetails) => {
        const update = (key, val) => setDetails({ ...details, [key]: val });
        return (
            <div className="space-y-3 pt-3 border-t border-gray-100">
                {method === 'upi' && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs text-gray-500 mb-1 block">UTR Number</label><input className="form-input" placeholder="UTR Ref" value={details.utrNumber} onChange={(e) => update('utrNumber', e.target.value)} /></div>
                            <div><label className="text-xs text-gray-500 mb-1 block">Payer UPI ID</label><input className="form-input" placeholder="e.g. name@upi" value={details.upiId} onChange={(e) => update('upiId', e.target.value)} /></div>
                        </div>
                    </div>
                )}
                {/* ... other fields similar to before ... */}
                <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-gray-500 mb-1 block">Transaction Ref ID</label><input className="form-input" placeholder="Reference" value={details.transactionRefId} onChange={(e) => update('transactionRefId', e.target.value)} /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">Note</label><input className="form-input" placeholder="Remarks" value={details.referenceNote} onChange={(e) => update('referenceNote', e.target.value)} /></div>
                </div>
            </div>
        );
    };

    const formatCurrency = (amount) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)}`;

    const filteredBills = useMemo(() => bills.filter((bill) => {
        const searchLower = deferredSearchQuery.toLowerCase();
        const billDateObj = new Date(bill.date || bill.createdAt);
        const billDate = `${billDateObj.getDate().toString().padStart(2, '0')}/${(billDateObj.getMonth() + 1).toString().padStart(2, '0')}/${billDateObj.getFullYear()}`;
        const matchesSearch = bill.billNumber?.toLowerCase().includes(searchLower) || bill.customer?.name?.toLowerCase().includes(searchLower) || billDate.includes(deferredSearchQuery);
        const normalizedBillType = resolveBillType(bill.billType);
        const matchesType = billTypeFilter === 'all' || normalizedBillType === billTypeFilter;
        return matchesSearch && matchesType && (filterStatus === 'all' || bill.paymentStatus === filterStatus);
    }), [bills, deferredSearchQuery, billTypeFilter, filterStatus]);

    // Current Bill for Preview
    const currentBillForPreview = useMemo(() => ({
        billNumber: nextInvoiceNumber,
        date: new Date(),
        customer: { ...customer },
        items: billItems,
        subtotal,
        discount,
        discountAmount,
        taxableAmount,
        cgst: cgstAmount,
        sgst: sgstAmount,
        igst: igstAmount,
        totalTax,
        roundOff,
        grandTotal,
        totalPacks,
        numOfBundles,
        transport,
        fromText,
        toText
    }), [nextInvoiceNumber, customer, billItems, subtotal, discount, discountAmount, taxableAmount, cgstAmount, sgstAmount, igstAmount, totalTax, roundOff, grandTotal, totalPacks, numOfBundles, transport, fromText, toText]);

    return (
        <div className="animate-fade-in">
            {view === 'CREATE' ? (
                <div className="flex flex-col h-screen -m-6 bg-slate-50/50 overflow-hidden">
                    {/* Invoice Builder Header */}
                    <div className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-50 shadow-sm">
                        <div className="flex items-center justify-between max-w-[1400px] mx-auto w-full">
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <Receipt size={24} />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create Invoice</h1>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SRI RAM FASHIONS • Rugged & Urban</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsEditable(!isEditable)}
                                    className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${isEditable ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    {isEditable ? <Save size={16} /> : <Edit3 size={16} />}
                                    {isEditable ? 'Preview' : 'Edit Mode'}
                                </button>
                                <button
                                    onClick={() => handleDownloadPDF(currentBillForPreview, !isEditable ? createPreviewRef.current : null)}
                                    className="px-6 py-3 bg-red-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all"
                                >
                                    <FileDown size={16} /> PDF
                                </button>
                                <button
                                    onClick={resetForm}
                                    className="w-12 h-12 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 flex items-center justify-center transition-all"
                                    title="Reset Draft"
                                >
                                    <RotateCcw size={20} />
                                </button>
                                <div className="w-px h-8 bg-slate-200 mx-2"></div>
                                <button onClick={() => setView('LIST')} className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <AnimatePresence mode="wait">
                            {isEditable ? (
                                <motion.div 
                                    key="editor"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex flex-col xl:flex-row h-full overflow-hidden"
                                >
                                    {/* Left Side: Form Editor */}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
                                        <div className="max-w-3xl mx-auto p-8 space-y-8 pb-32">
                                            {/* Customer Details */}
                                            <div className="bg-white rounded-[2rem] border border-slate-100 p-8 space-y-6 shadow-sm">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="text-lg font-black text-slate-900 tracking-tight">Customer Details</h4>
                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">Required *</span>
                                                </div>
                                                <div className="relative">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Search Customer</label>
                                                    <div className="relative">
                                                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input type="text" placeholder="Company, Name or Phone..." className="form-input pl-12 py-3.5 text-sm border-slate-100 rounded-2xl bg-slate-50/50" value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }} />
                                                    </div>
                                                    {showCustomerDropdown && customerSuggestions.length > 0 && (
                                                        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-64 overflow-y-auto p-2">
                                                            {customerSuggestions.map((cust) => (
                                                                <div key={cust._id} className="px-4 py-3 cursor-pointer hover:bg-blue-50 rounded-xl transition-colors mb-1 last:mb-0" onClick={() => selectCustomer(cust)}>
                                                                    <p className="text-sm font-bold text-slate-900">{cust.companyName}</p>
                                                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">{cust.mobile} {cust.gstin ? `• ${cust.gstin}` : ''}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Buyer Name *</label><input className="form-input py-3.5 text-sm border-slate-100 rounded-2xl bg-slate-50/50" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value.toUpperCase() })} /></div>
                                                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Phone Number *</label><input className="form-input py-3.5 text-sm border-slate-100 rounded-2xl bg-slate-50/50" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} /></div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Address</label>
                                                    <textarea 
                                                        className="form-input py-3.5 text-sm border-slate-100 rounded-2xl bg-slate-50/50 w-full resize-none h-20" 
                                                        placeholder="Full Address..."
                                                        value={customer.address} 
                                                        onChange={(e) => setCustomer({ ...customer, address: e.target.value.toUpperCase() })}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">GSTIN</label><input className="form-input py-3.5 text-sm border-slate-100 rounded-2xl bg-slate-50/50 uppercase" value={customer.gstin} onChange={(e) => setCustomer({ ...customer, gstin: e.target.value.toUpperCase() })} /></div>
                                                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Transport</label><input className="form-input py-3.5 text-sm border-slate-100 rounded-2xl bg-slate-50/50 uppercase" value={transport} onChange={(e) => setTransport(e.target.value.toUpperCase())} /></div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-6">
                                                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">From</label><input className="form-input py-3.5 text-sm border-slate-100 rounded-2xl bg-slate-50/50 uppercase" value={fromText} onChange={(e) => setFromText(e.target.value.toUpperCase())} /></div>
                                                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">To</label><input className="form-input py-3.5 text-sm border-slate-100 rounded-2xl bg-slate-50/50 uppercase" value={toText} onChange={(e) => setToText(e.target.value.toUpperCase())} /></div>
                                                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Bundles</label><input type="number" className="form-input py-3.5 text-sm border-slate-100 rounded-2xl bg-slate-50/50" value={numOfBundles} onChange={(e) => setNumOfBundles(Number(e.target.value))} /></div>
                                                </div>
                                            </div>

                                            {/* Select Products */}
                                            <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
                                                <div className="flex items-center justify-between mb-6">
                                                    <h4 className="text-lg font-black text-slate-900 tracking-tight">Select Products</h4>
                                                    <div className="relative">
                                                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input type="text" className="form-input py-2.5 pl-12 text-sm w-64 border-slate-100 rounded-2xl bg-slate-50/50" placeholder="Search products..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
                                                    </div>
                                                </div>
                                                <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                                                    {products.map((product) => (
                                                        <div key={product._id} className="flex items-center justify-between py-4 hover:bg-slate-50 px-4 rounded-2xl transition-all group">
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-900 uppercase">{product.name}</p>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">HSN: {product.hsn || '61034300'}</p>
                                                            </div>
                                                            <div className="text-right flex flex-col items-end gap-1">
                                                                <span className="text-base font-black text-blue-600">{formatCurrency(product.sellingPrice)}</span>
                                                                <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline" onClick={() => addItemToBill(product)}>+ Add Item</button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side: Cart Summary */}
                                    <div className="w-full xl:w-[480px] bg-white flex flex-col border-l border-slate-200 shadow-2xl z-40">
                                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                            <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="text-sm font-black text-slate-900 tracking-tight">Bill Items</h4>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-xs font-bold text-blue-600">{billItems.length} items</span>
                                                        {billItems.length > 0 && (
                                                            <button className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-red-700 transition-colors" onClick={() => setBillItems([])}>Clear</button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    {billItems.map((item) => (
                                                        <div key={item.uniqueId} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                                            {/* Row 1: Name + HSN + Total + Delete */}
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.name}</p>
                                                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">HSN: {item.hsnCode}</p>
                                                                </div>
                                                                <div className="flex items-start gap-3">
                                                                    <p className="text-base font-black text-slate-900">{formatCurrency(item.ratePerPack * item.noOfPacks)}</p>
                                                                    <button className="text-slate-300 hover:text-red-500 mt-0.5 transition-colors" onClick={() => updateItemQuantity(item.uniqueId, 0)}><Trash2 size={16} /></button>
                                                                </div>
                                                            </div>
                                                            {/* Row 2: Size | Rate/Pc | Pcs/Pack | Rate/Pack | No. Packs */}
                                                            <div className="grid grid-cols-5 gap-2">
                                                                <div>
                                                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Sizes / Pieces</label>
                                                                    <input 
                                                                        className="w-full h-8 px-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none transition-all" 
                                                                        placeholder="S/10,M/10" 
                                                                        value={item.sizesOrPieces} 
                                                                        onChange={(e) => updateItemField(item.uniqueId, 'sizesOrPieces', e.target.value)} 
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Rate/Pc</label>
                                                                    <input 
                                                                        type="number" 
                                                                        className="w-full h-8 px-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none transition-all" 
                                                                        value={item.ratePerPiece} 
                                                                        onChange={(e) => updateItemField(item.uniqueId, 'ratePerPiece', Number(e.target.value))} 
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Pcs/Pack</label>
                                                                    <input 
                                                                        type="number" 
                                                                        className="w-full h-8 px-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none transition-all" 
                                                                        value={item.pcsInPack} 
                                                                        onChange={(e) => updateItemField(item.uniqueId, 'pcsInPack', Number(e.target.value))} 
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Rate/Pack</label>
                                                                    <input 
                                                                        type="number" 
                                                                        className="w-full h-8 px-2 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none transition-all" 
                                                                        value={item.ratePerPack} 
                                                                        onChange={(e) => updateItemField(item.uniqueId, 'ratePerPack', Number(e.target.value))} 
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">No. Packs</label>
                                                                    <div className="flex items-center h-8 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                                                                        <button className="w-6 h-full text-slate-500 hover:bg-slate-200 text-xs font-black transition-colors" onClick={() => updateItemQuantity(item.uniqueId, item.noOfPacks - 1)}>-</button>
                                                                        <span className="flex-1 text-center text-xs font-black text-slate-800">{item.noOfPacks}</span>
                                                                        <button className="w-6 h-full text-slate-500 hover:bg-slate-200 text-xs font-black transition-colors" onClick={() => updateItemQuantity(item.uniqueId, item.noOfPacks + 1)}>+</button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="bg-blue-600 rounded-3xl p-8 text-white shadow-xl shadow-blue-500/20">
                                                <div className="flex justify-between items-center mb-6">
                                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Grand Total</span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-1 rounded">Tax Included</span>
                                                </div>
                                                <div className="text-4xl font-black tracking-tighter mb-8">{formatCurrency(grandTotal)}</div>
                                                <div className="space-y-3 pt-6 border-t border-white/10">
                                                    <div className="flex justify-between text-xs font-bold"><span className="opacity-60">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                                                    <div className="flex justify-between text-xs font-bold"><span className="opacity-60">GST (5%)</span><span>{formatCurrency(totalTax)}</span></div>
                                                    <div className="flex justify-between text-xs font-bold"><span className="opacity-60">Total Items</span><span>{totalPacks} Packs</span></div>
                                                </div>
                                            </div>
                                            
                                            {/* Payment Status Toggle */}
                                            <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Payment Status</h4>
                                                <div className="flex gap-2">
                                                    {['pending', 'paid'].map(s => (
                                                        <button 
                                                            key={s} 
                                                            onClick={() => setBillPaymentStatus(s)}
                                                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${billPaymentStatus === s ? 'bg-white text-blue-600 border-blue-100 shadow-sm' : 'bg-transparent text-slate-400 border-transparent hover:bg-white'}`}
                                                        >
                                                            {s === 'pending' ? 'Unpaid' : 'Paid'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-8 border-t border-slate-100 bg-white flex gap-4">
                                            <button className="flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 border border-slate-200 hover:bg-slate-50 transition-all" onClick={() => { resetForm(); setView('LIST'); }}>Cancel</button>
                                            <button className="flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 shadow-2xl shadow-blue-500/30 transition-all disabled:opacity-50" onClick={handleCreateBill} disabled={billItems.length === 0}>Create Bill</button>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="preview"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    className="h-full overflow-y-auto bg-slate-200/50 flex justify-center p-12 custom-scrollbar"
                                >
                                    <div className="max-w-[210mm] w-full">
                                        <BillTemplate ref={createPreviewRef} bill={currentBillForPreview} settings={settings} />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 pb-12">
                    {/* Header */}
                    <div className="page-header-shell bg-white/60 backdrop-blur-2xl border border-white/50 shadow-premium rounded-[2.5rem] p-10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl pointer-events-none"></div>
                        
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div className="flex items-start gap-6">
                                <div className="w-20 h-20 rounded-4xl bg-linear-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 group-hover:scale-105 transition-transform duration-500">
                                    <Receipt size={32} />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em]">Sales</p>
                                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Sales</h1>
                                    <p className="text-sm font-bold text-slate-500 pt-1">Manage and track your sales.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button className="h-16 px-8 rounded-2xl flex items-center gap-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black uppercase tracking-widest text-[11px] transition-all" onClick={() => setShowEmptyInvoiceModal(true)}><FileText size={20} className="text-slate-500" />Template</button>
                                <button className="h-16 px-8 rounded-2xl flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-slate-900/20 transition-all hover:scale-105 active:scale-95" onClick={() => setView('CREATE')}><Plus size={20} />New Sale</button>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {[
                            { label: 'Revenue', value: formatCurrency(bills.reduce((acc, b) => acc + (b.grandTotal || 0), 0)), note: 'Gross', icon: IndianRupee, color: 'blue' },
                            { label: 'Pending', value: formatCurrency(bills.filter(b => b.paymentStatus !== 'paid').reduce((acc, b) => acc + (b.grandTotal || 0), 0)), note: 'Receivables', icon: ClockIcon, color: 'amber' },
                            { label: 'Invoices', value: bills.length, note: 'Processed', icon: FileText, color: 'emerald' },
                            { label: 'Customers', value: new Set(bills.map(b => b.customer?.phone)).size, note: 'Unique', icon: Users, color: 'purple' }
                        ].map((stat, i) => (
                            <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-100 relative overflow-hidden group hover:shadow-xl transition-all">
                                <div className={`absolute top-0 right-0 w-32 h-32 bg-${stat.color}-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-700`}></div>
                                <div className={`w-14 h-14 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center border border-${stat.color}-100/50 mb-6 relative z-10`}><stat.icon size={24} /></div>
                                <div className="space-y-1 relative z-10">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{stat.value}</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-2 flex items-center gap-2"><span className={`w-1 h-1 rounded-full bg-${stat.color}-500`}></span>{stat.note}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Filters & Table */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                        <div className="p-8 border-b border-slate-100 flex flex-wrap items-center gap-6 bg-slate-50/30">
                            <div className="flex-1 min-w-[300px] relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input type="text" className="form-input pl-12 py-3.5 bg-white border-slate-100 rounded-2xl text-sm" placeholder="Search by bill number, customer, or date..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type:</span>
                                <div className="flex bg-white p-1 rounded-xl border border-slate-100">
                                    {[{ key: 'all', label: 'All' }, { key: 'SALES', label: 'Sales' }, { key: 'PURCHASE', label: 'Purchase' }].map(f => (
                                        <button key={f.key} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${billTypeFilter === f.key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setBillTypeFilter(f.key)}>{f.label}</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-separate border-spacing-0 px-8">
                                <thead>
                                    <tr className="text-left border-b border-slate-100">
                                        <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bill No</th>
                                        <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                                        <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                                        <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredBills.map((bill) => (
                                        <tr key={bill._id} className="group hover:bg-slate-50/50 transition-all">
                                            <td className="px-6 py-5"><p className="text-sm font-black text-slate-900">{bill.billNumber}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{resolveBillType(bill.billType)}</p></td>
                                            <td className="px-6 py-5"><p className="text-sm font-bold text-slate-700">{new Date(bill.date || bill.createdAt).toLocaleDateString('en-GB')}</p></td>
                                            <td className="px-6 py-5"><p className="text-sm font-bold text-slate-900 uppercase">{bill.customer?.name || bill.partyName || 'N/A'}</p><p className="text-[10px] font-bold text-slate-400 mt-0.5">{bill.customer?.phone || '---'}</p></td>
                                            <td className="px-6 py-5 text-right"><p className="text-sm font-black text-blue-600 tracking-tight">{formatCurrency(bill.grandTotal)}</p></td>
                                            <td className="px-6 py-5 text-center">
                                                <select
                                                    className={`mx-auto px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer outline-none ${bill.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}
                                                    value={bill.paymentStatus || 'pending'}
                                                    onChange={(e) => handleStatusChange(bill._id, e.target.value)}
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="paid">Paid</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleViewBill(bill)} className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all"><Eye size={16} /></button>
                                                    <button onClick={() => handleDownloadPDF(bill)} className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all"><Download size={16} /></button>
                                                    <button onClick={() => openEmailModal(bill)} className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-600 hover:text-white transition-all"><Mail size={16} /></button>
                                                    <button onClick={() => handleShareBill(bill)} className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all"><Share2 size={16} /></button>
                                                    <button onClick={() => handleDeleteClick(bill)} className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty Template Modal */}
            {showEmptyInvoiceModal && (
                <div className="modal-overlay" onClick={() => setShowEmptyInvoiceModal(false)}>
                    <div className="modal-content max-w-[220mm] bg-slate-100" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header bg-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><FileText size={20} /></div>
                                <div><h3 className="text-xl font-black text-slate-900 tracking-tight">Empty Bill Template</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sri Ram Fashions Standard A4</p></div>
                            </div>
                             <div className="flex items-center gap-2">
                                <button className="btn btn-primary px-6 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2" onClick={() => handlePrintBill({}, emptyInvoiceRef.current, true)}><Printer size={16} /> Print</button>
                                <button className="btn bg-slate-900 text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2" onClick={handleDownloadEmptyTemplate}><Download size={16} /> Download Template</button>
                                <button className="btn bg-indigo-600 text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2" onClick={() => handleShareBill({}, emptyInvoiceRef.current, true)}><Share2 size={16} /> Share</button>
                                <button className="action-btn ml-2" onClick={() => setShowEmptyInvoiceModal(false)}><X size={24} /></button>
                            </div>
                        </div>
                        <div className="p-8 overflow-auto max-h-[80vh] flex justify-center">
                            <BillTemplate ref={emptyInvoiceRef} bill={{}} settings={settings} isEmpty />
                        </div>
                    </div>
                </div>
            )}

            {/* Modals similar to before but with updated styling */}
            {showPreviewModal && selectedBill && (
                <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
                    <div className="modal-content max-w-[220mm] bg-slate-100" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header bg-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Receipt size={20} /></div>
                                <div><h3 className="text-xl font-black text-slate-900 tracking-tight">Preview</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedBill.billNumber}</p></div>
                            </div>
                             <div className="flex items-center gap-2">
                                <button className="btn btn-primary px-6 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2" onClick={() => handlePrintBill(selectedBill, previewBillRef.current)}><Printer size={16} /> Print</button>
                                <button className="btn bg-slate-900 text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2" onClick={() => handleDownloadPDF(selectedBill)}><Download size={16} /> Download PDF</button>
                                <button className="btn bg-purple-600 text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2" onClick={() => openEmailModal(selectedBill)}><Mail size={16} /> Send Email</button>
                                <button className="btn bg-indigo-600 text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2" onClick={() => handleShareBill(selectedBill, previewBillRef.current)}><Share2 size={16} /> Share</button>
                                <button className="action-btn ml-2" onClick={() => setShowPreviewModal(false)}><X size={24} /></button>
                            </div>
                        </div>
                        <div className="p-8 overflow-auto max-h-[80vh] flex justify-center">
                            <BillTemplate ref={previewBillRef} bill={selectedBill} settings={settings} />
                        </div>
                    </div>
                </div>
            )}

            <EmailActionModal
                open={Boolean(showEmailModal && emailBill)}
                title="Email Bill"
                description={emailBill ? `Send bill ${emailBill.billNumber} via email.` : ''}
                value={emailTo}
                onChange={setEmailTo}
                onClose={() => {
                    setShowEmailModal(false);
                    setEmailBill(null);
                    setEmailTo('');
                }}
                onSubmit={handleSendEmail}
                isSubmitting={isSendingEmail}
            />
        </div>
    );
};

export default BillingPage;
