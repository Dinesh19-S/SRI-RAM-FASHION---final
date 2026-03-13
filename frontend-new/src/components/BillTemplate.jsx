import './BillTemplate.css';

// Convert number to words in Indian format
const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (num === 0) return 'Zero';
    if (num < 0) return 'Minus ' + numberToWords(-num);

    num = Math.floor(num);
    let words = '';

    if (Math.floor(num / 10000000) > 0) {
        words += numberToWords(Math.floor(num / 10000000)) + ' Crore ';
        num %= 10000000;
    }
    if (Math.floor(num / 100000) > 0) {
        words += numberToWords(Math.floor(num / 100000)) + ' Lakh ';
        num %= 100000;
    }
    if (Math.floor(num / 1000) > 0) {
        words += numberToWords(Math.floor(num / 1000)) + ' Thousand ';
        num %= 1000;
    }
    if (Math.floor(num / 100) > 0) {
        words += numberToWords(Math.floor(num / 100)) + ' Hundred ';
        num %= 100;
    }
    if (num > 0) {
        if (words !== '') words += 'and ';
        if (num < 20) words += ones[num];
        else {
            words += tens[Math.floor(num / 10)];
            if (num % 10 > 0) words += ' ' + ones[num % 10];
        }
    }
    return words.trim();
};

const toAmount = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const BillTemplate = ({ bill, settings, forPrint = false }) => {
    if (!bill || !settings) return null;

    const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const isPurchase = bill.billType === 'PURCHASE';
    const items = bill.items || [];
    const productAmt = toAmount(bill.subtotal);
    const discount = toAmount(bill.discountAmount);
    const taxableAmt = toAmount(bill.taxableAmount, productAmt - discount);
    const fallbackCgstRate = settings?.tax?.cgstRate || 2.5;
    const fallbackSgstRate = settings?.tax?.sgstRate || 2.5;
    const cgstAmt = toAmount(
        bill.cgst,
        isPurchase ? 0 : (taxableAmt * fallbackCgstRate) / 100
    );
    const sgstAmt = toAmount(
        bill.sgst,
        isPurchase ? 0 : (taxableAmt * fallbackSgstRate) / 100
    );
    const igstAmt = toAmount(bill.igst);
    const totalGst = toAmount(bill.totalTax, cgstAmt + sgstAmt + igstAmt);
    const rawTotal = taxableAmt + totalGst;
    const totalAmt = toAmount(bill.grandTotal, Math.round(rawTotal));
    const roundOff = toAmount(bill.roundOff, totalAmt - rawTotal);
    const cgstRate = taxableAmt > 0 && cgstAmt > 0 ? (cgstAmt * 100) / taxableAmt : (isPurchase ? 0 : fallbackCgstRate);
    const sgstRate = taxableAmt > 0 && sgstAmt > 0 ? (sgstAmt * 100) / taxableAmt : (isPurchase ? 0 : fallbackSgstRate);
    const totalQuantity = isPurchase
        ? (bill.totalPacks || items.reduce((sum, item) => sum + toAmount(item.weightKg, toAmount(item.quantity)), 0) || 0)
        : (bill.totalPacks || items.reduce((sum, item) => sum + toAmount(item.noOfPacks, toAmount(item.quantity)), 0) || 0);
    const numBundles = bill.numOfBundles || 1;
    const purchaseInvoiceNumber = bill.referenceInvoiceNumber || bill.fromText || '';

    // Company details
    const companyName = settings?.company?.name || 'SRI RAM FASHIONS';
    const companyGstin = settings?.company?.gstin || '33AZRPM4425F2ZA';
    const companyAddress1 = settings?.company?.address1 || 'OFF : 61C9, Anupparpalayam Puthur, Tirupur - 641652';
    const companyAddress2 = settings?.company?.address2 || 'OFF : 81K, Madurai Road, Sankernager, Tirunelveli Dt - 627357';
    const companyState = settings?.company?.state || 'Tamilnadu';
    const companyStateCode = settings?.company?.stateCode || '33';
    const companyEmail = settings?.company?.email || 'sriramfashionstrp@gmail.com';
    const companyPhone = settings?.company?.phone || '9080573831';
    const companyMob = settings?.company?.phone2 || settings?.company?.mob || '8248893759';

    // Bank details
    const bankName = settings?.bank?.bankName || settings?.bank?.name || 'SOUTH INDIAN BANK';
    const bankAccount = settings?.bank?.accountNumber || settings?.bank?.account || '0338073000002328';
    const bankBranch = settings?.bank?.branchName || settings?.bank?.branch || 'TIRUPUR';
    const bankIfsc = settings?.bank?.ifscCode || settings?.bank?.ifsc || 'SIBL0000338';
    const bankAccName = settings?.bank?.accountHolderName || companyName;

    const salesColumns = [
        { key: 'sno', label: 'S.No', width: '5%', render: (_, index) => index + 1 },
        { key: 'product', label: 'Product', width: '18%', align: 'left', render: (item) => item.productName || item.name || '' },
        { key: 'hsn', label: 'HSN\nCode', width: '9%', render: (item) => item.hsnCode || item.hsn || '' },
        { key: 'sizes', label: 'Sizes/\nPieces', width: '10%', render: (item) => item.sizesOrPieces || '' },
        { key: 'ratePc', label: 'Rate Per\nPiece', width: '10%', render: (item) => item.ratePerPiece || '' },
        { key: 'pcsPack', label: 'Pcs in\nPack', width: '8%', render: (item) => item.pcsInPack || '' },
        { key: 'ratePack', label: 'Rate Per\nPack', width: '11%', render: (item) => toAmount(item.ratePerPack, toAmount(item.price)) },
        { key: 'packs', label: 'No Of\nPacks', width: '9%', render: (item) => toAmount(item.noOfPacks, toAmount(item.quantity)) },
        { key: 'amount', label: 'Amount\nRs.', width: '12%', render: (item) => toAmount(item.total, toAmount(item.ratePerPack, toAmount(item.price)) * toAmount(item.noOfPacks, toAmount(item.quantity))) }
    ];

    const purchaseColumns = [
        { key: 'sno', label: 'S.No', width: '6%', render: (_, index) => index + 1 },
        { key: 'particular', label: 'Particular', width: '30%', align: 'left', render: (item) => item.productName || item.name || '' },
        { key: 'hsn', label: 'HSN\nCode', width: '12%', render: (item) => item.hsnCode || item.hsn || '' },
        { key: 'design', label: 'Design /\nColor', width: '16%', render: (item) => item.designColor || item.sizesOrPieces || '' },
        { key: 'weight', label: 'Weight\n(KG)', width: '12%', render: (item) => toAmount(item.weightKg, toAmount(item.quantity)) },
        { key: 'rateKg', label: 'Rate Per\nKG', width: '12%', render: (item) => toAmount(item.ratePerKg, toAmount(item.price)) },
        { key: 'amount', label: 'Amount\nRs.', width: '12%', render: (item) => toAmount(item.total, toAmount(item.weightKg, toAmount(item.quantity)) * toAmount(item.ratePerKg, toAmount(item.price))) }
    ];

    const columns = isPurchase ? purchaseColumns : salesColumns;
    const minRows = 20;
    const emptyRowsCount = Math.max(0, minRows - items.length);

    const detailRows = isPurchase
        ? [
            { label: 'Bill Number', value: bill.billNumber || '' },
            { label: 'Bill Date', value: formatDate(bill.date || bill.createdAt) },
            { label: 'Purchase Inv No', value: purchaseInvoiceNumber },
            { label: 'Total Weight', value: `${totalQuantity}` }
        ]
        : [
            { label: 'Invoice Number', value: bill.billNumber || '' },
            { label: 'Invoice Date', value: formatDate(bill.date || bill.createdAt) },
            { label: 'From', value: bill.fromText || bill.fromDate || '' },
            { label: 'To', value: bill.toText || bill.toDate || '' }
        ];

    const buyerHeading = isPurchase ? 'Supplier Copy' : 'Consigner Copy';
    const leftPrimaryLabel = isPurchase ? 'SUPPLIER:' : 'BUYER:';
    const leftTertiaryLabel = isPurchase ? 'ADDRESS:' : 'TRANSPORT:';
    const leftTertiaryValue = isPurchase ? (bill.customer?.address || '') : (bill.transport || '');
    const rightBottomLabel = isPurchase ? 'INV NO:' : 'CODE:';
    const rightBottomValue = isPurchase ? purchaseInvoiceNumber : (bill.customer?.stateCode || '33');
    const quantityLabel = isPurchase ? 'Total Weight' : 'Total Packs';
    const titleText = isPurchase ? 'PURCHASE INVOICE' : 'TAX INVOICE';

    return (
        <div className={`bill-template-tax ${forPrint ? 'for-print' : ''}`} id="bill-template">
            <div className="tax-invoice-page">
                <div className="ti-header-row">
                    <div className="ti-company-name">
                        {companyName}
                    </div>
                    <div className="ti-gstin-header">GSTIN: {companyGstin}</div>
                </div>

                <div className="ti-info-row">
                    <div className="ti-company-address">
                        <div>{companyAddress1}</div>
                        <div>{companyAddress2}</div>
                        <div>State : {companyState} (Code {companyStateCode})</div>
                        <div>Email : {companyEmail}</div>
                        <div>Mob : {companyPhone}</div>
                    </div>
                    <div className="ti-invoice-details">
                        {detailRows.map((row) => (
                            <div className="ti-detail-row" key={row.label}>
                                <span className="ti-detail-label">{row.label}</span>
                                <span className="ti-detail-sep">:</span>
                                <span className="ti-detail-value">{row.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="ti-title-row">
                    <span className="ti-title-text">{titleText}</span>
                </div>

                <div className="ti-buyer-row">
                    <div className="ti-buyer-left">
                        <div className="ti-buyer-heading">{buyerHeading}</div>
                        <div className="ti-buyer-field">
                            <span className="ti-buyer-label">{leftPrimaryLabel}</span>
                            <span className="ti-buyer-value">{bill.customer?.name || ''}</span>
                        </div>
                        <div className="ti-buyer-field">
                            <span className="ti-buyer-label">STATE:</span>
                            <span className="ti-buyer-value">{bill.customer?.state || 'Tamilnadu'}</span>
                        </div>
                        <div className="ti-buyer-field">
                            <span className="ti-buyer-label">{leftTertiaryLabel}</span>
                            <span className="ti-buyer-value">{leftTertiaryValue}</span>
                        </div>
                    </div>
                    <div className="ti-buyer-right">
                        <div className="ti-detail-row">
                            <span className="ti-detail-label">MOB:</span>
                            <span className="ti-detail-sep"></span>
                            <span className="ti-detail-value">{bill.customer?.phone || companyMob}</span>
                        </div>
                        <div className="ti-detail-row">
                            <span className="ti-detail-label">GSTIN:</span>
                            <span className="ti-detail-sep"></span>
                            <span className="ti-detail-value">{bill.customer?.gstin || ''}</span>
                        </div>
                        <div className="ti-detail-row">
                            <span className="ti-detail-label">{rightBottomLabel}</span>
                            <span className="ti-detail-sep"></span>
                            <span className="ti-detail-value">{rightBottomValue}</span>
                        </div>
                    </div>
                </div>

                <div className="ti-table-container">
                    <table className="ti-items-table">
                        <thead>
                            <tr>
                                {columns.map((column) => (
                                    <th key={column.key} style={{ width: column.width }}>
                                        {column.label.split('\n').map((line, index) => (
                                            <span key={`${column.key}-${index}`}>
                                                {line}
                                                {index < column.label.split('\n').length - 1 ? <br /> : null}
                                            </span>
                                        ))}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={index}>
                                    {columns.map((column) => (
                                        <td
                                            key={`${column.key}-${index}`}
                                            className={column.align === 'left' ? 'ti-text-left' : ''}
                                        >
                                            {column.render(item, index)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            {Array.from({ length: emptyRowsCount }).map((_, rowIndex) => (
                                <tr key={`empty-${rowIndex}`} className="ti-empty-row">
                                    {columns.map((column) => (
                                        <td key={`${column.key}-empty-${rowIndex}`}>&nbsp;</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="ti-summary-row">
                    <div className="ti-summary-left">
                        <div className="ti-summary-field">
                            <span className="ti-summary-label">{quantityLabel}</span>
                            <span className="ti-summary-sep">:</span>
                            <span className="ti-summary-value">{totalQuantity}</span>
                        </div>
                        <div className="ti-summary-field">
                            <span className="ti-summary-label">Bill Amount</span>
                            <span className="ti-summary-sep">:</span>
                            <span className="ti-summary-value">{totalAmt}</span>
                        </div>
                        <div className="ti-summary-field">
                            <span className="ti-summary-label">In words</span>
                            <span className="ti-summary-sep">:</span>
                            <span className="ti-summary-value ti-words">Rupees {numberToWords(totalAmt)} Only</span>
                        </div>
                    </div>

                    <div className="ti-summary-middle">
                        <div className="ti-bundles-box">
                            <span className="ti-bundles-label">NUM OF BUNDLES :</span>
                            <span className="ti-bundles-value">{numBundles}</span>
                        </div>
                        <div className="ti-gst-box">
                            <span className="ti-gst-label">TOTAL GST</span>
                            <span className="ti-gst-value">{totalGst.toFixed(0)}</span>
                        </div>
                    </div>

                    <div className="ti-summary-right">
                        <div className="ti-tax-row">
                            <span>Product Amt</span>
                            <span>{productAmt.toFixed(2)}</span>
                        </div>
                        <div className="ti-tax-row">
                            <span>Discount</span>
                            <span>{discount.toFixed(2)}</span>
                        </div>
                        <div className="ti-tax-row">
                            <span>Taxable Amt</span>
                            <span>{taxableAmt.toFixed(2)}</span>
                        </div>
                        {igstAmt > 0 ? (
                            <div className="ti-tax-row ti-tax-highlight">
                                <span>IGST @{(igstAmt * 100 / taxableAmt).toFixed(2).replace(/\.00$/, '')}%</span>
                                <span>{igstAmt.toFixed(2)}</span>
                            </div>
                        ) : (
                            <>
                                <div className="ti-tax-row ti-tax-highlight">
                                    <span>CGST @{cgstRate.toFixed(2).replace(/\.00$/, '')}%</span>
                                    <span>{cgstAmt.toFixed(2)}</span>
                                </div>
                                <div className="ti-tax-row ti-tax-highlight">
                                    <span>SGST @{sgstRate.toFixed(2).replace(/\.00$/, '')}%</span>
                                    <span>{sgstAmt.toFixed(2)}</span>
                                </div>
                            </>
                        )}
                        <div className="ti-tax-row">
                            <span>Round Off</span>
                            <span>{roundOff.toFixed(2)}</span>
                        </div>
                        <div className="ti-tax-row ti-tax-total">
                            <span>Total Amt</span>
                            <span>{totalAmt.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="ti-footer-row">
                    <div className="ti-footer-left">
                        <div className="ti-terms-title">Terms and Conditions</div>
                        <div className="ti-terms-text">
                            Subject to Tirupur Jurisdiction.<br />
                            Payment by Cheque/DD only.<br />
                            Cheques made in favour of {companyName}.
                        </div>
                        <div className="ti-bank-box">
                            <div className="ti-bank-title">Bank Details:</div>
                            <div className="ti-bank-info">
                                <div>ACC NAME: {bankAccName}</div>
                                <div>BANK: {bankName}</div>
                                <div>ACC NUM: {bankAccount} | BRANCH: {bankBranch} | IFSC: {bankIfsc}</div>
                            </div>
                        </div>
                    </div>
                    <div className="ti-footer-right">
                        <div className="ti-certified">
                            Certified that above particulars are true<br />and correct
                        </div>
                        <div className="ti-signature">
                            For {companyName}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BillTemplate;
