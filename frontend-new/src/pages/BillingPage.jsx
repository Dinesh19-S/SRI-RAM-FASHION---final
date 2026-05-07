import { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBills, createBill, deleteBill, updateBillStatus } from '../store/slices/billsSlice';
import { fetchProducts } from '../store/slices/productsSlice';
import { fetchSettings } from '../store/slices/settingsSlice';
import { Plus, Search, Printer, Eye, Trash2, X, FileText, Download, Users, Receipt, Mail, Clock as ClockIcon, ArrowRight } from 'lucide-react';
import BillTemplate from '../components/BillTemplate';
import { customersAPI, emailAPI } from '../services/api';
import { EmailActionModal, useToast } from '../components/common';
import { getEmailRecipientValidation, pickDefaultRecipient } from '../utils/emailUtils';
import { downloadInvoicePDF } from '../utils/invoiceGenerator';

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
    const billTemplateRef = useRef(null);
    const emptyInvoiceRef = useRef(null);


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
        state: 'Tamilnadu',
        stateCode: '33'
    });
    const [transport, setTransport] = useState('');
    const [fromText, setFromText] = useState('');
    const [toText, setToText] = useState('');
    const [view, setView] = useState('LIST'); // 'LIST' or 'CREATE'
    const [billItems, setBillItems] = useState([]);
    const [discount, setDiscount] = useState(0);
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
    const TAMIL_NADU_DISTRICTS = [
        'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul',
        'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai',
        'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai',
        'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni',
        'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupattur', 'Tiruppur', 'Tiruvallur',
        'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar'
    ];

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
            state: selectedCustomer.state || 'Tamilnadu',
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
            hsnCode: product.hsn || '',
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
        
        // Determine if it's Inter-state (IGST) or Intra-state (CGST + SGST)
        // Tamilnadu code is '33'.
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

        // Aggregate GST rates for display
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

    const handleCreateBill = async () => {
        if (!customer.name || !customer.phone || billItems.length === 0) {
            toast.warning('Please fill buyer details and add at least one item');
            return;
        }

        const hasMissingProductId = billItems.some((item) => !item.productId);
        if (hasMissingProductId) {
            toast.error('One or more bill items are missing product information');
            return;
        }

        try {
            const billData = {
                customer: {
                    name: customer.name,
                    phone: customer.phone,
                    email: customer.email,
                    address: customer.address,
                    gstin: customer.gstin,
                    state: customer.state,
                    stateCode: customer.stateCode
                },
                items: billItems.map(item => {
                    const itemPrice = toAmount(item.ratePerPack, toAmount(item.price, 0));
                    const itemQty = toAmount(item.noOfPacks, toAmount(item.quantity, 0));
                    const itemSubtotal = itemPrice * itemQty;
                    const itemDiscount = (itemSubtotal * toAmount(discount, 0)) / 100;
                    const itemTaxable = itemSubtotal - itemDiscount;
                    const itemGstAmount = (itemTaxable * toAmount(item.gstRate, 5)) / 100;

                    return {
                        productId: item.productId,
                        name: item.name,
                        quantity: itemQty,
                        price: item.price,
                        ratePerPiece: item.ratePerPiece,
                        pcsInPack: item.pcsInPack,
                        ratePerPack: item.ratePerPack,
                        sizesOrPieces: item.sizesOrPieces,
                        hsnCode: item.hsnCode,
                        gstRate: item.gstRate,
                        total: itemTaxable + itemGstAmount
                    };
                }),
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
        setCustomer({ name: '', phone: '', email: '', address: '', gstin: '', state: 'Tamilnadu', stateCode: '33' });
        setTransport('');
        setFromText('');
        setToText('');
        setBillItems([]);
        setDiscount(0);
        setCustomerSearch('');
        setBillPaymentStatus('pending');
        setPaymentMethod('cash');
        setPaymentDetails({ upiId: '', transactionId: '', bankName: '', chequeNumber: '', chequeDate: '', accountNumber: '', referenceNote: '' });
    };

    const handleViewBill = (bill) => {
        setSelectedBill(bill);
        setShowPreviewModal(true);
    };

    const ensureSettingsLoaded = async () => {
        if (settings) {
            return settings;
        }

        try {
            const loadedSettings = await dispatch(fetchSettings()).unwrap();
            setHasLoadedSettings(true);
            return loadedSettings;
        } catch (error) {
            toast.error('Failed to load billing settings');
            return null;
        }
    };

    const handleDownloadPDF = async (bill) => {
        try {
            const currentSettings = await ensureSettingsLoaded();
            if (!currentSettings) return;
            await downloadInvoicePDF(bill, currentSettings);
            toast.success('PDF download started');
        } catch (error) {
            toast.error('Failed to generate PDF');
        }
    };

    const handleDeleteClick = (bill) => {
        setSelectedBill(bill);
        setShowDeleteConfirm(true);
    };

    const handleDeleteBill = async () => {
        if (!selectedBill) return;
        setIsDeleting(true);
        try {
            await dispatch(deleteBill(selectedBill._id)).unwrap();
            toast.success('Bill deleted successfully');
            setShowDeleteConfirm(false);
            setSelectedBill(null);
        } catch (error) {
            toast.error(error || 'Failed to delete bill');
        } finally {
            setIsDeleting(false);
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
            toast.success(`Bill status updated to ${newStatus}`);
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
                data: {
                    paymentMethod: statusUpdateMethod,
                    paymentDetails: statusUpdateDetails
                }
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
                {/* Method Specific Fields */}
                {method === 'upi' && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">UTR Number</label>
                                <input className="form-input" placeholder="UTR Ref" value={details.utrNumber} onChange={(e) => update('utrNumber', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Payer UPI ID</label>
                                <input className="form-input" placeholder="e.g. name@upi" value={details.upiId} onChange={(e) => update('upiId', e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Paid By</label>
                                <input className="form-input" placeholder="Full Name" value={details.payerName} onChange={(e) => update('payerName', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">App Name</label>
                                <input className="form-input" placeholder="GPay, PhonePe" value={details.appName} onChange={(e) => update('appName', e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Bank Name</label>
                            <input className="form-input" placeholder="e.g. SBI, HDFC" value={details.bankName} onChange={(e) => update('bankName', e.target.value)} />
                        </div>
                    </div>
                )}

                {method === 'card' && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Card Type</label>
                                <select className="form-input" value={details.cardType} onChange={(e) => update('cardType', e.target.value)}>
                                    <option value="">Select Type</option>
                                    <option value="Visa">Visa</option>
                                    <option value="MasterCard">MasterCard</option>
                                    <option value="Rupay">Rupay</option>
                                    <option value="Amex">Amex</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Last 4 Digits</label>
                                <input className="form-input" maxLength="4" placeholder="1234" value={details.last4Digits} onChange={(e) => update('last4Digits', e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Auth Code</label>
                                <input className="form-input" placeholder="Appr ID" value={details.authCode} onChange={(e) => update('authCode', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Bank Name</label>
                                <input className="form-input" placeholder="Issuing Bank" value={details.bankName} onChange={(e) => update('bankName', e.target.value)} />
                            </div>
                        </div>
                    </div>
                )}

                {method === 'netbanking' && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Bank Name</label>
                                <input className="form-input" placeholder="e.g. SBI, HDFC" value={details.bankName} onChange={(e) => update('bankName', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Transaction ID</label>
                                <input className="form-input" placeholder="Ref No" value={details.transactionId} onChange={(e) => update('transactionId', e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">A/C Holder Name</label>
                                <input className="form-input" placeholder="Name" value={details.accountHolderName} onChange={(e) => update('accountHolderName', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Gateway Name</label>
                                <input className="form-input" placeholder="Razorpay, etc" value={details.gatewayName} onChange={(e) => update('gatewayName', e.target.value)} />
                            </div>
                        </div>
                    </div>
                )}

                {method === 'cash' && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Collected By</label>
                                <input className="form-input" placeholder="Staff Name" value={details.receivedBy} onChange={(e) => update('receivedBy', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Manual Bill No</label>
                                <input className="form-input" placeholder="Manual No" value={details.receiptNumber} onChange={(e) => update('receiptNumber', e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Location</label>
                            <input className="form-input" placeholder="Store location" value={details.location} onChange={(e) => update('location', e.target.value)} />
                        </div>
                    </div>
                )}

                {method === 'cheque' && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Cheque Number *</label>
                                <input className="form-input" placeholder="No" value={details.chequeNumber} onChange={(e) => update('chequeNumber', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Cheque Date</label>
                                <input type="date" className="form-input" value={details.chequeDate} onChange={(e) => update('chequeDate', e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Bank Name</label>
                                <input className="form-input" placeholder="Bank" value={details.bankName} onChange={(e) => update('bankName', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Clearing Status</label>
                                <select className="form-input" value={details.clearingStatus} onChange={(e) => update('clearingStatus', e.target.value)}>
                                    <option value="pending">Pending</option>
                                    <option value="cleared">Cleared</option>
                                    <option value="bounced">Bounced</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">A/C Holder Name</label>
                            <input className="form-input" placeholder="Name" value={details.accountHolderName} onChange={(e) => update('accountHolderName', e.target.value)} />
                        </div>
                    </div>
                )}

                {/* Common Fields */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Transaction Ref ID</label>
                        <input className="form-input" placeholder="Reference" value={details.transactionRefId} onChange={(e) => update('transactionRefId', e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Note (optional)</label>
                        <input className="form-input" placeholder="Remarks" value={details.referenceNote} onChange={(e) => update('referenceNote', e.target.value)} />
                    </div>
                </div>
            </div>
        );
    };

    const handleEmailBill = async () => {
        if (!emailBill) return;
        const { hasValidRecipients } = getEmailRecipientValidation(emailTo);
        if (!hasValidRecipients) {
            toast.warning('Please enter at least one valid recipient email');
            return;
        }

        setIsSendingEmail(true);
        try {
            const response = await emailAPI.sendBill(emailBill._id, emailTo);
            if (response.data.success) {
                toast.success(response.data.message || 'Email sent successfully');
                setShowEmailModal(false);
                setEmailBill(null);
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

    const handlePrintBill = async () => {
        if (selectedBill) {
            const currentSettings = await ensureSettingsLoaded();
            if (!currentSettings) return;
            await downloadInvoicePDF(selectedBill, currentSettings);
        }
    };

    const formatCurrency = (amount) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)}`;
    const resolveBillType = (billType) => (billType === 'DIRECT' ? 'SALES' : (billType || 'SALES'));
    const closeEmailModal = () => {
        setShowEmailModal(false);
        setEmailBill(null);
        setEmailTo('');
    };

    const filteredBills = useMemo(() => bills.filter((bill) => {
        const searchLower = deferredSearchQuery.toLowerCase();
        const billDateObj = new Date(bill.date || bill.createdAt);
        const billDate = `${billDateObj.getDate().toString().padStart(2, '0')}/${(billDateObj.getMonth() + 1).toString().padStart(2, '0')}/${billDateObj.getFullYear()}`;
        const matchesSearch =
            bill.billNumber?.toLowerCase().includes(searchLower) ||
            bill.customer?.name?.toLowerCase().includes(searchLower) ||
            bill.partyName?.toLowerCase().includes(searchLower) ||
            billDate.includes(deferredSearchQuery);
        const normalizedBillType = resolveBillType(bill.billType);
        const matchesType = billTypeFilter === 'all' || normalizedBillType === billTypeFilter;
        return matchesSearch && matchesType && (filterStatus === 'all' || bill.paymentStatus === filterStatus);
    }), [bills, deferredSearchQuery, billTypeFilter, filterStatus]);

    return (
        <div className="animate-fade-in">
            {view === 'CREATE' ? (
                <div className="flex flex-col h-screen -m-6 bg-slate-50/50">

                {/* Elite Header */}
                <div className="bg-white/80 backdrop-blur-md border-b border-slate-100 p-6 sticky top-0 z-50">
                    <div className="flex items-center justify-between max-w-[1600px] mx-auto w-full">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Plus size={28} strokeWidth={2.5} />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em]">Billing Module</p>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Create New Bill</h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="hidden md:flex flex-col items-end">
                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Current Session</span>
                                <span className="text-xs font-bold text-slate-700">{user?.name || 'Admin User'}</span>
                            </div>
                            <button 
                                className="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all flex items-center justify-center" 
                                onClick={() => setView('LIST')}
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col xl:flex-row max-w-[1600px] mx-auto w-full">
                    {/* Left Side: Details & Selection */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 pb-32">
                        {/* Buyer Details Card */}
                        <div className="glass-card p-8 border-none shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Buyer Details</h4>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Customer Information & Transport</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="relative group">
                                    <label className="form-label text-slate-500">Search Customer</label>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                        <input
                                            className="form-input pl-12 bg-slate-50/50 border-slate-100 focus:bg-white"
                                            placeholder="Type name, phone, or GST..."
                                            value={customerSearch}
                                            onChange={(e) => {
                                                setCustomerSearch(e.target.value);
                                                setShowCustomerDropdown(true);
                                            }}
                                        />
                                    </div>
                                    {showCustomerDropdown && customerSuggestions.length > 0 && (
                                        <div className="absolute z-50 top-full left-0 right-0 mt-3 glass-card p-2 border-none shadow-2xl bg-white/95 backdrop-blur-xl animate-slide-up">
                                            {customerSuggestions.map((cust) => (
                                                <div
                                                    key={cust._id}
                                                    className="px-5 py-4 cursor-pointer hover:bg-blue-50 rounded-xl transition-all group/item"
                                                    onClick={() => selectCustomer(cust)}
                                                >
                                                    <p className="text-sm font-black text-slate-900 group-hover/item:text-blue-600">{cust.companyName}</p>
                                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">{cust.mobile} • {cust.gstin || 'NO GSTIN'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="form-label text-slate-500">Buyer Name *</label>
                                        <input className="form-input bg-slate-50/50 border-slate-100 focus:bg-white" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="form-label text-slate-500">Phone Number *</label>
                                        <input className="form-input bg-slate-50/50 border-slate-100 focus:bg-white" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8 pt-8 border-t border-slate-50">
                                <div className="md:col-span-2">
                                    <label className="form-label text-slate-500">Email Address</label>
                                    <input className="form-input bg-slate-50/50 border-slate-100 focus:bg-white" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label text-slate-500">GSTIN</label>
                                    <input className="form-input bg-slate-50/50 border-slate-100 focus:bg-white uppercase" value={customer.gstin} onChange={(e) => setCustomer({ ...customer, gstin: e.target.value.toUpperCase() })} />
                                </div>
                                <div>
                                    <label className="form-label text-slate-500">Transport</label>
                                    <input className="form-input bg-slate-50/50 border-slate-100 focus:bg-white" value={transport} onChange={(e) => setTransport(e.target.value)} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
                                <div>
                                    <label className="form-label text-slate-500">From</label>
                                    <input className="form-input bg-slate-50/50 border-slate-100 focus:bg-white" placeholder="District/City" value={fromText} onChange={(e) => setFromText(e.target.value)} />
                                </div>
                                <div>
                                    <label className="form-label text-slate-500">To</label>
                                    <input className="form-input bg-slate-50/50 border-slate-100 focus:bg-white" placeholder="District/City" value={toText} onChange={(e) => setToText(e.target.value)} />
                                </div>
                                <div>
                                    <label className="form-label text-slate-500">State</label>
                                    <input className="form-input bg-slate-50/50 border-slate-100 focus:bg-white" value={customer.state} onChange={(e) => setCustomer({ ...customer, state: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label text-slate-500">State Code</label>
                                    <input className="form-input bg-slate-50/50 border-slate-100 focus:bg-white" value={customer.stateCode} onChange={(e) => setCustomer({ ...customer, stateCode: e.target.value })} />
                                </div>
                            </div>

                            <div className="mt-6">
                                <label className="form-label text-slate-500">Address</label>
                                <textarea 
                                    className="form-input bg-slate-50/50 border-slate-100 focus:bg-white min-h-[80px]" 
                                    value={customer.address} 
                                    onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Select Products Card */}
                        <div className="glass-card p-8 border-none shadow-sm overflow-hidden relative">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                                        <Search size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Select Products</h4>
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Available Items in Stock</p>
                                    </div>
                                </div>
                                <div className="relative group">
                                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input 
                                        type="text" 
                                        className="form-input py-2.5 pl-11 text-xs w-72 bg-slate-50/50 border-slate-100 focus:bg-white focus:ring-2 focus:ring-blue-500/10" 
                                        placeholder="Quick product search..." 
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {products.map((product) => (
                                    <div 
                                        key={product._id} 
                                        className="p-5 bg-white border border-slate-100 rounded-2xl hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer group active:scale-[0.98]" 
                                        onClick={() => addItemToBill(product)}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="space-y-1">
                                                <h5 className="font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate max-w-[120px]">{product.name}</h5>
                                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">SKU: {product.sku}</p>
                                            </div>
                                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300 shadow-sm">
                                                <Plus size={18} />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-auto">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Selling Price</span>
                                                <span className="text-base font-black text-slate-900 tracking-tight">{formatCurrency(product.sellingPrice)}</span>
                                            </div>
                                            <div className="px-2 py-1 rounded-lg bg-slate-50 text-[11px] font-black text-slate-600 uppercase tracking-widest border border-slate-100">
                                                GST {product.gstRate}%
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Items & Summary */}
                    <div className="w-full xl:w-[500px] bg-slate-50 flex flex-col shadow-2xl relative z-10 border-l border-slate-200">
                        <div className="flex-1 overflow-y-auto p-8 space-y-8 pb-40">
                            {/* Bill Items Section */}
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Bill Items</h4>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{billItems.length} items</p>
                                </div>
                                 {billItems.length === 0 ? (
                                    <div className="py-24 text-center rounded-3xl border-2 border-dashed border-slate-200 bg-white">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                            <Plus size={24} className="text-slate-300" />
                                        </div>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Add products from the left</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {billItems.map((item, idx) => (
                                            <div key={item.uniqueId} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm animate-slide-up group hover:shadow-md transition-all">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="space-y-0.5">
                                                        <h5 className="font-black text-slate-900 text-sm uppercase tracking-tight">{item.name}</h5>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">HSN: {item.hsnCode || '---'}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-black text-slate-900">
                                                            {formatCurrency(toAmount(item.ratePerPack, toAmount(item.price, 0)) * toAmount(item.noOfPacks, toAmount(item.quantity, 0)))}
                                                        </span>
                                                        <button 
                                                            className="w-6 h-6 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                                                            onClick={() => updateItemQuantity(item.uniqueId, 0)}
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-5 gap-2">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Size</label>
                                                        <select 
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-[11px] font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none"
                                                            value={item.sizesOrPieces || ''} 
                                                            onChange={(e) => updateItemField(item.uniqueId, 'sizesOrPieces', e.target.value)}
                                                        >
                                                            <option value="">---</option>
                                                            {['S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size', '28', '30', '32', '34', '36', '38'].map(s => (
                                                                <option key={s} value={s}>{s}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Rate/Pc</label>
                                                        <input 
                                                            type="number" 
                                                            className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-[11px] font-black text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none" 
                                                            value={item.ratePerPiece || ''} 
                                                            onChange={(e) => updateItemField(item.uniqueId, 'ratePerPiece', Number(e.target.value))} 
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Pcs/Pack</label>
                                                        <input 
                                                            type="number" 
                                                            className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-[11px] font-black text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none" 
                                                            value={item.pcsInPack || ''} 
                                                            onChange={(e) => updateItemField(item.uniqueId, 'pcsInPack', Number(e.target.value))} 
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Rate/Pack</label>
                                                        <input 
                                                            type="number" 
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-[11px] font-black text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none" 
                                                            value={item.ratePerPack || ''} 
                                                            onChange={(e) => updateItemField(item.uniqueId, 'ratePerPack', Number(e.target.value))} 
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1 text-center">No. Packs</label>
                                                        <div className="flex items-center justify-between bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                                                            <button 
                                                                className="w-5 h-5 rounded-md hover:bg-white text-slate-600 font-black transition-all active:scale-90 text-[10px]" 
                                                                onClick={() => updateItemQuantity(item.uniqueId, (item.noOfPacks || item.quantity) - 1)}
                                                            >-</button>
                                                            <span className="text-[10px] font-black text-slate-900">{item.noOfPacks || item.quantity}</span>
                                                            <button 
                                                                className="w-5 h-5 rounded-md hover:bg-white text-slate-600 font-black transition-all active:scale-90 text-[10px]" 
                                                                onClick={() => updateItemQuantity(item.uniqueId, (item.noOfPacks || item.quantity) + 1)}
                                                            >+</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                             {/* Summary Panel */}
                            <div className="pt-8 border-t border-slate-200 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Summary</h4>
                                    <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest border border-blue-100">Auto Calculate</div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-5 rounded-3xl bg-white border border-slate-100 shadow-sm">
                                        <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Subtotal</span>
                                        <span className="text-xl font-black text-slate-900">{formatCurrency(subtotal)}</span>
                                    </div>

                                    <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Discount</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate %</span>
                                                <input 
                                                    type="number" 
                                                    className="w-20 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-center text-blue-600 focus:ring-2 focus:ring-blue-500/10 outline-none" 
                                                    value={discount} 
                                                    onChange={(e) => setDiscount(Number(e.target.value))} 
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-slate-50">
                                            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Less Discount</span>
                                            <span className="text-sm font-black text-red-500">-{formatCurrency(discountAmount)}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
                                        <span className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">Grand Total</span>
                                        <div className="text-right">
                                            <p className="text-4xl font-black text-white tracking-tighter">{formatCurrency(grandTotal)}</p>
                                            <p className="text-[9px] font-black text-blue-400/60 uppercase tracking-widest mt-1 italic">Inclusive of Tax & Roundoff</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Fixed Bottom Action Bar */}
                        <div className="p-8 bg-white/80 backdrop-blur-xl border-t border-slate-200 sticky bottom-0 z-50">
                            <div className="flex gap-4">
                                <button 
                                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 border border-slate-200"
                                    onClick={() => setView('LIST')}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className="flex-2 py-4 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                                    onClick={handleCreateBill}
                                    disabled={isLoading || billItems.length === 0}
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Complete Transaction
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Keep other necessary modals */}
                <EmailActionModal
                    open={Boolean(showEmailModal && emailBill)}
                    title="Email Bill"
                    description={emailBill ? `Send bill ${emailBill.billNumber} (${formatCurrency(emailBill.grandTotal)}) via email.` : ''}
                    value={emailTo}
                    onChange={setEmailTo}
                    onClose={closeEmailModal}
                    onSubmit={handleEmailBill}
                    isSubmitting={isSendingEmail}
                />
                
                {/* Status Update Modal */}
                {showStatusUpdateModal && statusUpdateBill && (
                    <div className="modal-overlay" onClick={() => setShowStatusUpdateModal(false)}>
                        {/* ... modal content ... */}
                    </div>
                )}
            </div>
            ) : (

                <div className="space-y-8 pb-12">

            {/* Page Header */}
            <div className="page-header-shell">
                <div className="flex items-center gap-4">
                    <div className="page-icon-badge">
                        <Receipt size={24} />
                    </div>
                    <div className="page-header-copy">
                        <span className="page-header-kicker">Billing History</span>
                        <h1 className="page-header-title">Bill List</h1>
                    </div>
                </div>
                <div className="page-header-toolbar">
                    <button 
                        className="btn bg-gray-50 text-slate-600 border border-slate-200 hover:bg-white hover:shadow-sm" 
                        onClick={() => setShowEmptyInvoiceModal(true)}
                        title="Blank Template"
                    >
                        <FileText size={18} />
                        Template
                    </button>
                    <button className="btn btn-primary shadow-blue-500/20" onClick={() => setView('CREATE')}>
                        <Plus size={18} />
                        Generate Bill
                    </button>
                </div>
            </div>

            {/* Billing Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Sales', value: formatCurrency(bills.reduce((acc, b) => acc + (b.grandTotal || 0), 0)), note: 'Total amount', icon: Receipt, color: 'blue' },
                    { label: 'Unpaid', value: formatCurrency(bills.filter(b => b.paymentStatus !== 'paid').reduce((acc, b) => acc + (b.grandTotal || 0), 0)), note: 'Amount due', icon: ClockIcon, color: 'amber' },
                    { label: 'Total Bills', value: bills.length, note: 'Total bills', icon: FileText, color: 'emerald' },
                    { label: 'Customers', value: new Set(bills.map(b => b.customer?.phone)).size, note: 'Total customers', icon: Users, color: 'purple' }
                ].map((stat, i) => (
                    <div key={i} className="glass-card p-8 border-none group hover:translate-y-[-4px] transition-all duration-500">
                        <div className="flex items-start justify-between mb-6">
                            <div className={`w-14 h-14 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center border border-${stat.color}-100 shadow-sm group-hover:scale-110 transition-transform`}>
                                <stat.icon size={24} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</h3>
                            <p className="text-xs font-bold text-slate-500 pt-1">{stat.note}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters Section */}
            <div className="page-filter-card">
                <div className="flex-1 min-w-[300px] relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        className="form-input pl-12 py-3 bg-white/50 backdrop-blur-sm"
                        placeholder="Search by bill number, customer, or date..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter By:</span>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        {[
                            { key: 'all', label: 'All' },
                            { key: 'SALES', label: 'Sales' },
                            { key: 'PURCHASE', label: 'Purchase' }
                        ].map(f => (
                            <button
                                key={f.key}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${billTypeFilter === f.key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                onClick={() => setBillTypeFilter(f.key)}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status:</span>
                    <select 
                        className="form-select py-2 pl-4 pr-10 text-xs w-40"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="partial">Partial</option>
                    </select>
                </div>
            </div>

            {/* Main Table Section */}
            <div className="page-table-card animate-slide-up">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading bills...</p>
                    </div>
                ) : filteredBills.length === 0 ? (
                    <div className="text-center py-24">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FileText size={40} className="text-slate-200" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">No transactions found</h3>
                        <p className="text-slate-500 max-w-xs mx-auto mt-2">We couldn't find any bills matching your current filter criteria.</p>
                        <button className="btn btn-ghost mt-6 text-blue-600 font-black uppercase tracking-widest text-[10px]" onClick={() => {setSearchQuery(''); setFilterStatus('all'); setBillTypeFilter('all');}}>Clear All Filters</button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="page-table">
                            <thead>
                                <tr>
                                    <th>Bill Number</th>
                                    <th>Type</th>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Total</th>
                                    <th>Payment Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBills.map((bill) => {
                                    const normalizedBillType = resolveBillType(bill.billType);
                                    return (
                                        <tr key={bill._id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${normalizedBillType === 'SALES' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                                        <FileText size={14} />
                                                    </div>
                                                    <span className="font-bold text-slate-900">{bill.billNumber}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                                    normalizedBillType === 'SALES' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                                                    normalizedBillType === 'PURCHASE' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 
                                                    'bg-slate-50 text-slate-600'
                                                }`}>
                                                    {normalizedBillType}
                                                </span>
                                            </td>
                                            <td className="text-slate-500 font-medium">
                                                {(() => { 
                                                    const d = new Date(bill.date || bill.createdAt); 
                                                    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`; 
                                                })()}
                                            </td>
                                            <td>
                                                <div>
                                                    <p className="font-bold text-slate-900">{bill.partyName || bill.customer?.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 tracking-wider">{bill.customer?.phone}</p>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="text-sm font-black text-slate-900">{formatCurrency(bill.grandTotal)}</span>
                                            </td>
                                            <td>
                                                <div className="relative inline-block w-32">
                                                    <select
                                                        className={`w-full px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border-none cursor-pointer appearance-none transition-all ${
                                                            bill.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' : 
                                                            bill.paymentStatus === 'pending' ? 'bg-amber-50 text-amber-700' : 
                                                            bill.paymentStatus === 'partial' ? 'bg-blue-50 text-blue-700' : 
                                                            'bg-red-50 text-red-700'
                                                        }`}
                                                        value={bill.paymentStatus}
                                                        onChange={(e) => handleStatusChange(bill._id, e.target.value)}
                                                    >
                                                        <option value="pending">Pending</option>
                                                        <option value="paid">Paid</option>
                                                        <option value="partial">Partial</option>
                                                        <option value="cancelled">Cancelled</option>
                                                    </select>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex items-center justify-end gap-2">
                                                    <button className="action-btn action-btn-blue" onClick={() => handleViewBill(bill)} title="View Details">
                                                        <Eye size={16} />
                                                    </button>
                                                    <button className="action-btn action-btn-green" onClick={() => handleDownloadPDF(bill)} title="Download PDF">
                                                        <Download size={16} />
                                                    </button>
                                                    <button 
                                                        className="action-btn bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white" 
                                                        onClick={() => { setEmailBill(bill); setEmailTo(pickDefaultRecipient(bill)); setShowEmailModal(true); }}
                                                        title="Send via Email"
                                                    >
                                                        <Mail size={16} />
                                                    </button>
                                                    <button className="action-btn action-btn-red" onClick={() => handleDeleteClick(bill)} title="Delete Bill">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Bill Preview Modal */}
            {showPreviewModal && selectedBill && (
                <div className="modal-overlay bg-slate-900/40 backdrop-blur-md" onClick={() => setShowPreviewModal(false)}>
                    <div className="modal-content max-w-[230mm] border-none shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header border-b border-slate-100 p-8">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
                                    <FileText size={28} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Invoice Details</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedBill.billNumber}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    className="btn btn-secondary px-6 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                                    onClick={() => {
                                        setEmailBill(selectedBill);
                                        setEmailTo(pickDefaultRecipient(selectedBill.customer?.email, user?.email));
                                        setShowPreviewModal(false);
                                        setShowEmailModal(true);
                                    }}
                                >
                                    <Mail size={16} /> Email Invoice
                                </button>
                                <button className="btn btn-primary px-6 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2" onClick={handlePrintBill}>
                                    <Download size={16} /> Download PDF
                                </button>
                                <button className="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all flex items-center justify-center ml-2" onClick={() => setShowPreviewModal(false)}>
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="p-0 overflow-auto max-h-[80vh] bg-slate-100/30">
                            <div className="p-10 flex justify-center">
                                <div ref={billTemplateRef} className="shadow-2xl rounded-sm overflow-hidden">
                                    <BillTemplate bill={selectedBill} settings={settings} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            </div>
            )}



            <EmailActionModal
                open={Boolean(showEmailModal && emailBill)}
                title="Email Bill"
                description={emailBill ? `Send bill ${emailBill.billNumber} (${formatCurrency(emailBill.grandTotal)}) via email.` : ''}
                value={emailTo}
                onChange={setEmailTo}
                onClose={closeEmailModal}
                onSubmit={handleEmailBill}
                isSubmitting={isSendingEmail}
            />

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && selectedBill && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="p-8 text-center">
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                                <Trash2 size={40} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Delete Bill</h3>
                            <p className="text-sm text-slate-500 mb-8">This will permanently remove <b>{selectedBill.billNumber}</b> from the ledger. This action is irreversible.</p>
                            <div className="flex gap-3">
                                <button className="flex-1 btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                                <button className="flex-1 btn btn-danger" onClick={handleDeleteBill} disabled={isDeleting}>
                                    {isDeleting ? 'Deleting...' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty Invoice Template Modal */}
            {showEmptyInvoiceModal && (
                <div className="modal-overlay" onClick={() => setShowEmptyInvoiceModal(false)}>
                    <div className="modal-content max-w-[230mm]" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Invoice Template</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invoice Format</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="btn btn-primary px-4 py-2 text-xs" onClick={async () => {
                                    const element = emptyInvoiceRef.current;
                                    if (element) {
                                        const { downloadBillPDF } = await import('../utils/pdfGenerator');
                                        await downloadBillPDF(element, 'Master_Template');
                                    }
                                }}>
                                    <Download size={14} />Download Template
                                </button>
                                <button className="action-btn hover:bg-slate-100 ml-2" onClick={() => setShowEmptyInvoiceModal(false)}>
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="p-8 bg-slate-100/50 flex justify-center">
                            <div ref={emptyInvoiceRef} className="shadow-2xl">
                                <BillTemplate
                                    bill={{
                                        billNumber: 'TEMP-000',
                                        date: new Date(),
                                        customer: { name: '', phone: '', address: '', gstin: '', state: 'Tamilnadu', stateCode: '33' },
                                        transport: '', fromText: 'TIRUPPUR', toText: '', fromDate: '', toDate: '',
                                        items: [], subtotal: 0, discount: 0, discountAmount: 0, taxableAmount: 0,
                                        cgst: 0, sgst: 0, totalTax: 0, roundOff: 0, grandTotal: 0, totalPacks: 0, numOfBundles: 0
                                    }}
                                    settings={settings}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showStatusUpdateModal && statusUpdateBill && (
                <div className="modal-overlay" onClick={() => setShowStatusUpdateModal(false)}>
                    <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                    <Receipt size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Update Payment</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{statusUpdateBill.billNumber}</p>
                                </div>
                            </div>
                            <button className="action-btn hover:bg-slate-100" onClick={() => setShowStatusUpdateModal(false)}><X size={20} /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="form-label">Payment Method *</label>
                                <select
                                    className="form-select"
                                    value={statusUpdateMethod}
                                    onChange={(e) => setStatusUpdateMethod(e.target.value)}
                                >
                                    <option value="cash">💵 Cash</option>
                                    <option value="upi">📱 UPI</option>
                                    <option value="netbanking">🏦 Net Banking</option>
                                    <option value="cheque">📄 Cheque</option>
                                    <option value="card">💳 Card</option>
                                </select>
                            </div>

                            {renderPaymentFields(statusUpdateMethod, statusUpdateDetails, setStatusUpdateDetails)}
                        </div>
                        <div className="p-6 bg-slate-50 flex gap-3">
                            <button className="flex-1 btn btn-secondary" onClick={() => setShowStatusUpdateModal(false)}>Cancel</button>
                            <button className="flex-1 btn btn-primary" onClick={handleStatusUpdateSubmit}>Confirm Payment</button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default BillingPage;
