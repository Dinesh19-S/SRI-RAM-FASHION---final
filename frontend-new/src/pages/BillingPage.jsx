import { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBills, createBill, deleteBill } from '../store/slices/billsSlice';
import { fetchProducts } from '../store/slices/productsSlice';
import { fetchSettings } from '../store/slices/settingsSlice';
import { Plus, Search, Printer, Eye, Trash2, X, FileText, Download, Users, Receipt, Mail } from 'lucide-react';
import BillTemplate from '../components/BillTemplate';
import { customersAPI, emailAPI } from '../services/api';
import { EmailActionModal, useToast } from '../components/common';
import { getEmailRecipientValidation, pickDefaultRecipient } from '../utils/emailUtils';

const BILL_REFRESH_INTERVAL = 30 * 1000;

const toAmount = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const BillingPage = () => {
    const toast = useToast();
    const dispatch = useDispatch();
    const { items: bills, isLoading, lastFetchedAt } = useSelector((state) => state.bills);
    const { items: products } = useSelector((state) => state.products);
    const settings = useSelector((state) => state.settings.data);
    const { user } = useSelector((state) => state.auth);
    const billTemplateRef = useRef(null);
    const emptyInvoiceRef = useRef(null);

    const [showBillModal, setShowBillModal] = useState(false);
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
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [billItems, setBillItems] = useState([]);
    const [discount, setDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerSuggestions, setCustomerSuggestions] = useState([]);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
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
        if (!showBillModal || hasLoadedProducts) {
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
    }, [dispatch, hasLoadedProducts, showBillModal]);

    useEffect(() => {
        const shouldLoadSettings = showBillModal || showPreviewModal || showEmptyInvoiceModal;
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
    }, [dispatch, hasLoadedSettings, showBillModal, showPreviewModal, showEmptyInvoiceModal]);

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
        if (!showBillModal) {
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
    }, [productSearch, dispatch, showBillModal]);

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

    const { subtotal, taxableAmount, cgstAmount, sgstAmount, igstAmount, totalTax, grandTotal, totalPacks, roundOff, cgstRate, sgstRate, igstRate } = totals;

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
                fromDate,
                toDate,
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
                paymentStatus: 'pending'
            };

            await dispatch(createBill(billData)).unwrap();
            toast.success('Bill created successfully');
            setShowBillModal(false);
            resetForm();
        } catch (error) {
            toast.error(error || 'Failed to create bill');
        }
    };

    const resetForm = () => {
        setCustomer({ name: '', phone: '', email: '', address: '', gstin: '', state: 'Tamilnadu', stateCode: '33' });
        setTransport('');
        setFromDate('');
        setToDate('');
        setBillItems([]);
        setDiscount(0);
        setCustomerSearch('');
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
            const { downloadInvoicePDF } = await import('../utils/invoiceGenerator');
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
            const { downloadInvoicePDF } = await import('../utils/invoiceGenerator');
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
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
                <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={() => setShowBillModal(true)}><Plus size={18} />New Bill</button>
                    <button
                        className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                        onClick={() => setShowEmptyInvoiceModal(true)}
                        title="Empty Invoice Template"
                    >
                        <FileText size={20} className="text-gray-600" />
                    </button>
                </div>
            </div>

            <div className="card py-4">
                <div className="flex flex-col gap-4">
                    <input
                        type="text"
                        className="form-input py-2 text-sm w-full"
                        placeholder="Search by Bill No, Customer, or Date..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="flex gap-4 flex-wrap items-center">
                        <div className="flex gap-2 flex-wrap items-center">
                            <span className="text-xs font-semibold text-gray-600 uppercase">Type:</span>
                            {[{ key: 'all', label: 'All' }, { key: 'SALES', label: 'Sales' }, { key: 'PURCHASE', label: 'Purchase' }].map(f => (
                                <button
                                    key={f.key}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${billTypeFilter === f.key ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    style={billTypeFilter === f.key ? { backgroundColor: f.key === 'SALES' ? '#16a34a' : f.key === 'PURCHASE' ? '#2563eb' : '#7c3aed' } : {}}
                                    onClick={() => setBillTypeFilter(f.key)}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2 flex-wrap items-center">
                            <span className="text-xs font-semibold text-gray-600 uppercase">Status:</span>
                            {[{ key: 'all', label: 'All' }, { key: 'paid', label: 'Paid' }, { key: 'pending', label: 'Pending' }, { key: 'partial', label: 'Partial' }, { key: 'cancel', label: 'Cancel' }].map(f => (
                                <button
                                    key={f.key}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === f.key ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    style={filterStatus === f.key ? { backgroundColor: f.key === 'paid' ? '#16a34a' : f.key === 'pending' ? '#f59e0b' : f.key === 'partial' ? '#3b82f6' : f.key === 'cancel' ? '#ef4444' : '#7c3aed' } : {}}
                                    onClick={() => setFilterStatus(f.key)}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="card overflow-hidden p-0">
                {isLoading ? (
                    <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#3b82f6', borderTopColor: 'transparent' }} /></div>
                ) : filteredBills.length === 0 ? (
                    <div className="text-center py-12 text-gray-500"><FileText size={48} className="mx-auto mb-2 opacity-50" /><p>No bills found</p></div>
                ) : (
                    <table className="table">
                        <thead><tr className="bg-gray-50"><th>Bill No</th><th>Type</th><th>Date</th><th>Party</th><th>Amount</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                        <tbody>
                            {filteredBills.map((bill) => {
                                const normalizedBillType = resolveBillType(bill.billType);
                                return (
                                <tr key={bill._id}>
                                    <td className="font-medium" style={{ color: '#1e40af' }}>{bill.billNumber}</td>
                                    <td>
                                        <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{
                                            backgroundColor: normalizedBillType === 'SALES' ? '#dcfce7' : normalizedBillType === 'PURCHASE' ? '#dbeafe' : '#f3f4f6',
                                            color: normalizedBillType === 'SALES' ? '#15803d' : normalizedBillType === 'PURCHASE' ? '#1d4ed8' : '#4b5563'
                                        }}>
                                            {normalizedBillType}
                                        </span>
                                    </td>
                                    <td>{(() => { const d = new Date(bill.date || bill.createdAt); return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`; })()}</td>
                                    <td><div><p className="font-medium">{bill.partyName || bill.customer?.name}</p><p className="text-xs text-gray-500">{bill.customer?.phone}</p></div></td>
                                    <td className="font-semibold">{formatCurrency(bill.grandTotal)}</td>
                                    <td>
                                        <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{
                                            backgroundColor: bill.paymentStatus === 'paid' ? '#dcfce7' : bill.paymentStatus === 'pending' ? '#fef3c7' : bill.paymentStatus === 'partial' ? '#dbeafe' : '#fee2e2',
                                            color: bill.paymentStatus === 'paid' ? '#15803d' : bill.paymentStatus === 'pending' ? '#92400e' : bill.paymentStatus === 'partial' ? '#1d4ed8' : '#991b1b'
                                        }}>
                                            {bill.paymentStatus ? bill.paymentStatus.charAt(0).toUpperCase() + bill.paymentStatus.slice(1) : 'Pending'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                className="action-btn action-btn-blue"
                                                onClick={() => handleViewBill(bill)}
                                                title="View Bill"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                className="action-btn action-btn-green"
                                                onClick={() => handleDownloadPDF(bill)}
                                                title="Download PDF"
                                            >
                                                <Download size={18} />
                                            </button>
                                            <button
                                                className="action-btn"
                                                style={{ color: '#7c3aed', backgroundColor: '#f5f3ff' }}
                                                onClick={() => {
                                                    setEmailBill(bill);
                                                    setEmailTo(pickDefaultRecipient(bill.customer?.email, user?.email));
                                                    setShowEmailModal(true);
                                                }}
                                                title="Email Bill"
                                            >
                                                <Mail size={18} />
                                            </button>
                                            <button
                                                className="action-btn action-btn-red"
                                                onClick={() => handleDeleteClick(bill)}
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Bill Preview Modal */}
            {showPreviewModal && selectedBill && (
                <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-[230mm] max-h-[95vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="text-lg font-semibold text-gray-900">Bill Preview - {selectedBill.billNumber}</h3>
                            <div className="flex gap-2">
                                <button
                                    className="btn btn-sm"
                                    style={{ backgroundColor: '#1e40af', color: 'white' }}
                                    onClick={() => {
                                        setEmailBill(selectedBill);
                                        setEmailTo(pickDefaultRecipient(selectedBill.customer?.email, user?.email));
                                        setShowPreviewModal(false);
                                        setShowEmailModal(true);
                                    }}
                                >
                                    <Mail size={16} />Email
                                </button>
                                <button className="btn btn-primary btn-sm" onClick={handlePrintBill}><Download size={16} />Download PDF</button>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowPreviewModal(false)}><X size={20} /></button>
                            </div>
                        </div>
                        <div className="p-4 overflow-auto max-h-[80vh]" style={{ backgroundColor: '#f0f0f0' }}>
                            <div ref={billTemplateRef}>
                                <BillTemplate bill={selectedBill} settings={settings} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Bill Modal */}
            {showBillModal && (
                <div className="modal-overlay p-0 items-stretch justify-center bg-transparent" onClick={() => setShowBillModal(false)}>
                    <div className="app-shell w-full h-full max-w-none max-h-none rounded-none shadow-none overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b bg-white flex items-center justify-between sticky top-0 z-20">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                    <Receipt size={20} style={{ color: '#1e40af' }} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Create New Bill</h3>
                                    <p className="text-xs text-gray-500">Fill customer details and add items to generate the invoice</p>
                                </div>
                            </div>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowBillModal(false)}><X size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
                                <div className="space-y-6">
                                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Users size={18} style={{ color: '#1e40af' }} />
                                            <h4 className="font-semibold text-gray-900">Buyer Details</h4>
                                        </div>

                                        {/* Customer Search */}
                                        <div className="relative">
                                            <label className="text-xs text-gray-500 mb-1 block">Search Customer</label>
                                            <input
                                                className="form-input"
                                                placeholder="Search by company name, phone, or GSTIN..."
                                                value={customerSearch}
                                                onChange={(e) => {
                                                    setCustomerSearch(e.target.value);
                                                    setShowCustomerDropdown(true);
                                                }}
                                                onFocus={() => setShowCustomerDropdown(true)}
                                            />
                                            {isSearchingCustomers && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#3b82f6', borderTopColor: 'transparent' }} />
                                                </div>
                                            )}
                                            {showCustomerDropdown && customerSuggestions.length > 0 && (
                                                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                    {customerSuggestions.map((cust) => (
                                                        <div
                                                            key={cust._id}
                                                            className="px-4 py-3 cursor-pointer hover:bg-green-50 border-b border-gray-100 last:border-b-0"
                                                            onClick={() => selectCustomer(cust)}
                                                        >
                                                            <p className="font-medium text-gray-900">{cust.companyName}</p>
                                                            <p className="text-xs text-gray-500">{cust.mobile} • {cust.gstin || 'No GSTIN'}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {showCustomerDropdown && customerSearch.length >= 2 && customerSuggestions.length === 0 && !isSearchingCustomers && (
                                                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-center text-gray-500 text-sm">
                                                    No customers found. Fill details below.
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mt-4">
                                            <div>
                                                <label className="text-xs text-gray-500 mb-1 block">Buyer Name *</label>
                                                <input className="form-input" placeholder="Enter buyer name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 mb-1 block">Phone Number *</label>
                                                <input className="form-input" placeholder="Enter phone number" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block">Email Address (optional)</label>
                                            <input className="form-input" placeholder="Enter email address" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 mt-4">
                                            <div>
                                                <label className="text-xs text-gray-500 mb-1 block">GSTIN</label>
                                                <input className="form-input" placeholder="Enter GSTIN" value={customer.gstin} onChange={(e) => setCustomer({ ...customer, gstin: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 mb-1 block">Transport</label>
                                                <input className="form-input" placeholder="Enter transport" value={transport} onChange={(e) => setTransport(e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-gray-500 mb-1 block">From</label>
                                                <input
                                                    className="form-input"
                                                    list="tn-districts"
                                                    placeholder="From (province or district)"
                                                    value={fromDate}
                                                    onChange={(e) => setFromDate(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 mb-1 block">To</label>
                                                <input
                                                    className="form-input"
                                                    list="tn-districts"
                                                    placeholder="To (province or district)"
                                                    value={toDate}
                                                    onChange={(e) => setToDate(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <datalist id="tn-districts">
                                            {TAMIL_NADU_DISTRICTS.map((district) => (
                                                <option key={district} value={district} />
                                            ))}
                                        </datalist>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-gray-500 mb-1 block">State</label>
                                                <input className="form-input" placeholder="State" value={customer.state} onChange={(e) => setCustomer({ ...customer, state: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 mb-1 block">State Code</label>
                                                <input className="form-input" placeholder="State Code" value={customer.stateCode} onChange={(e) => setCustomer({ ...customer, stateCode: e.target.value })} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block">Address (optional)</label>
                                            <input className="form-input" placeholder="Enter address" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
                                        </div>
                                    </div>

                                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-semibold text-gray-900">Select Products</h4>
                                            <div className="relative">
                                                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input 
                                                    type="text" 
                                                    className="form-input py-1.5 pl-8 text-xs w-48" 
                                                    placeholder="Search products..." 
                                                    value={productSearch}
                                                    onChange={(e) => setProductSearch(e.target.value)}
                                                />
                                                {isSearchingProducts && (
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                        <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin border-blue-500" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                                            {products.length === 0 ? <p className="text-gray-500 text-center py-4">No products found</p> : products.map((product) => (
                                                <div key={product._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100" onClick={() => addItemToBill(product)}>
                                                    <div><p className="font-medium text-gray-900">{product.name}</p><p className="text-sm text-gray-500">{product.sku} • HSN: {product.hsn || 'N/A'}</p></div>
                                                    <div className="text-right"><p className="font-semibold" style={{ color: '#1e40af' }}>{formatCurrency(product.sellingPrice)}</p><button className="text-xs font-medium" style={{ color: '#1e40af' }}>+ Add Item</button></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-semibold text-gray-900">Bill Items</h4>
                                            <span className="text-xs text-gray-500">{billItems.length} items</span>
                                        </div>
                                        {billItems.length === 0 ? <div className="text-center py-10 text-gray-500"><FileText size={48} className="mx-auto mb-2 opacity-50" /><p>No items added</p></div> : (
                                            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                                                {billItems.map((item) => (
                                                    <div key={item.uniqueId} className="p-3 bg-gray-50 rounded-lg">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div>
                                                                <p className="font-medium text-gray-900">{item.name}</p>
                                                                <p className="text-xs text-gray-500">HSN: {item.hsnCode || 'N/A'}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-semibold">{formatCurrency((item.ratePerPack || item.price) * (item.noOfPacks || item.quantity))}</p>
                                                                <button
                                                                    type="button"
                                                                    className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center"
                                                                    title="Remove item"
                                                                    onClick={() => updateItemQuantity(item.uniqueId, 0)}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-5 gap-2 text-xs">
                                                            <div>
                                                                <label className="text-gray-500">Size</label>
                                                                <select className="form-input text-xs p-1" value={item.sizesOrPieces || ''} onChange={(e) => updateItemField(item.uniqueId, 'sizesOrPieces', e.target.value)}>
                                                                    <option value="">Select</option>
                                                                    <option value="S">S</option>
                                                                    <option value="M">M</option>
                                                                    <option value="L">L</option>
                                                                    <option value="XL">XL</option>
                                                                    <option value="XXL">XXL</option>
                                                                    <option value="XXXL">XXXL</option>
                                                                    <option value="28">28</option>
                                                                    <option value="30">30</option>
                                                                    <option value="32">32</option>
                                                                    <option value="34">34</option>
                                                                    <option value="36">36</option>
                                                                    <option value="38">38</option>
                                                                    <option value="40">40</option>
                                                                    <option value="Free Size">Free Size</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="text-gray-500">Rate/Pc</label>
                                                                <input type="number" className="form-input text-xs p-1" value={item.ratePerPiece || ''} onChange={(e) => updateItemField(item.uniqueId, 'ratePerPiece', Number(e.target.value))} />
                                                            </div>
                                                            <div>
                                                                <label className="text-gray-500">Pcs/Pack</label>
                                                                <input type="number" className="form-input text-xs p-1" value={item.pcsInPack || ''} onChange={(e) => updateItemField(item.uniqueId, 'pcsInPack', Number(e.target.value))} />
                                                            </div>
                                                            <div>
                                                                <label className="text-gray-500">Rate/Pack</label>
                                                                <input type="number" className="form-input text-xs p-1" value={item.ratePerPack || ''} onChange={(e) => updateItemField(item.uniqueId, 'ratePerPack', Number(e.target.value))} />
                                                            </div>
                                                            <div>
                                                                <label className="text-gray-500">No. Packs</label>
                                                                <div className="flex items-center gap-1">
                                                                    <button className="w-6 h-6 rounded bg-gray-200 text-sm" onClick={() => updateItemQuantity(item.uniqueId, (item.noOfPacks || item.quantity) - 1)}>-</button>
                                                                    <span className="w-6 text-center text-sm">{item.noOfPacks || item.quantity}</span>
                                                                    <button className="w-6 h-6 rounded bg-gray-200 text-sm" onClick={() => updateItemQuantity(item.uniqueId, (item.noOfPacks || item.quantity) + 1)}>+</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold text-gray-900">Summary</h4>
                                            <span className="text-xs text-gray-500">Auto calculated</span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-gray-600"><span>Product Amount</span><span>{formatCurrency(subtotal)}</span></div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-600">Discount (%)</span>
                                                <input type="number" className="form-input w-20 text-right" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
                                            </div>
                                            <div className="flex justify-between text-gray-600"><span>Taxable Amount</span><span>{formatCurrency(taxableAmount)}</span></div>
                                            <div className="flex justify-between text-gray-600"><span>CGST @ {cgstRate}%</span><span>{formatCurrency(cgstAmount)}</span></div>
                                            <div className="flex justify-between text-gray-600"><span>SGST @ {sgstRate}%</span><span>{formatCurrency(sgstAmount)}</span></div>
                                            <div className="flex justify-between text-gray-600"><span>Total Packs</span><span>{totalPacks}</span></div>
                                            <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t border-gray-200"><span>Grand Total</span><span style={{ color: '#1e40af' }}>{formatCurrency(grandTotal)}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer rounded-none bg-white/95 backdrop-blur border-t"><button className="btn btn-secondary" onClick={() => setShowBillModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreateBill} disabled={isLoading}>{isLoading ? 'Creating...' : 'Create Bill'}</button></div>
                    </div>
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

            {/* Delete Bill Confirmation Modal */}
            {
                showDeleteConfirm && selectedBill && (
                    <div className="modal-overlay" onClick={() => { setShowDeleteConfirm(false); setSelectedBill(null); }}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="text-center">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Trash2 size={32} className="text-red-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Bill</h3>
                                <p className="text-gray-600 mb-6">
                                    Are you sure you want to delete bill <strong>{selectedBill.billNumber}</strong>? This action cannot be undone.
                                </p>
                                <div className="flex gap-3 justify-center">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => { setShowDeleteConfirm(false); setSelectedBill(null); }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn bg-red-600 text-white hover:bg-red-700"
                                        onClick={handleDeleteBill}
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            {showEmptyInvoiceModal && (
                <div className="modal-overlay" onClick={() => setShowEmptyInvoiceModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-[230mm] max-h-[95vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="text-lg font-semibold text-gray-900">Empty Invoice Template</h3>
                            <div className="flex gap-2">
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={async () => {
                                        const element = emptyInvoiceRef.current;
                                        if (element) {
                                            const { downloadBillPDF } = await import('../utils/pdfGenerator');
                                            await downloadBillPDF(element, 'Empty_Invoice');
                                        }
                                    }}
                                >
                                    <Download size={16} />Download PDF
                                </button>
                                <button className="btn btn-ghost btn-icon" onClick={() => setShowEmptyInvoiceModal(false)}><X size={20} /></button>
                            </div>
                        </div>
                        <div className="p-4 overflow-auto max-h-[80vh]" style={{ backgroundColor: '#f0f0f0' }}>
                            <div ref={emptyInvoiceRef}>
                                <BillTemplate
                                    bill={{
                                        billNumber: '',
                                        date: new Date(),
                                        customer: {
                                            name: '',
                                            phone: '',
                                            address: '',
                                            gstin: '',
                                            state: 'Tamilnadu',
                                            stateCode: '33'
                                        },
                                        transport: '',
                                        fromText: 'TIRUPPUR',
                                        toText: '',
                                        fromDate: '',
                                        toDate: '',
                                        items: [],
                                        subtotal: 0,
                                        discount: 0,
                                        discountAmount: 0,
                                        taxableAmount: 0,
                                        cgst: 0,
                                        sgst: 0,
                                        totalTax: 0,
                                        roundOff: 0,
                                        grandTotal: 0,
                                        totalPacks: 0,
                                        numOfBundles: 0
                                    }}
                                    settings={settings}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default BillingPage;
