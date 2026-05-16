import { forwardRef, useMemo } from 'react';
import ruggedUrbanLogo from '../assets/rugged-urban-logo.png';
import './InvoiceTemplate.css';

const DEFAULT_COMPANY = {
  name: 'SRI RAM FASHIONS',
  gstin: '33AZRPM4425F2ZA',
  address1: '61C9, Anupparpalayam Puthur, Tirupur. 641652',
  address2: '81 K, Madurai Road, SankerNager, Tirunelveli Dt. 627357',
  state: 'Tamilnadu',
  stateCode: '33',
  email: 'sriramfashionstrp@gmail.com',
  phone: '9080573831'
};

const DEFAULT_BANK = {
  accountHolderName: 'SRI RAM FASHIONS',
  bankName: 'SOUTH INDIAN BANK',
  accountNumber: '0338073000002328',
  branchName: 'TIRUPUR',
  ifscCode: 'SIBL0000338'
};

const toAmount = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatDate = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
};

const numberToWords = (value) => {
  const n = Math.floor(toAmount(value));
  if (n <= 0) return '';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const toWordsBelowThousand = (num) => {
    const parts = [];
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;

    if (hundred) parts.push(`${ones[hundred]} Hundred`);
    if (remainder >= 20) {
      const tenVal = Math.floor(remainder / 10);
      const oneVal = remainder % 10;
      parts.push(`${tens[tenVal]}${oneVal ? ` ${ones[oneVal]}` : ''}`);
    } else if (remainder > 0) {
      parts.push(ones[remainder]);
    }

    return parts.join(' ');
  };

  let remainder = n;
  const crore = Math.floor(remainder / 10000000);
  remainder %= 10000000;
  const lakh = Math.floor(remainder / 100000);
  remainder %= 100000;
  const thousand = Math.floor(remainder / 1000);
  remainder %= 1000;
  const hundred = remainder;

  const segments = [];
  if (crore) segments.push(`${toWordsBelowThousand(crore)} Crore`);
  if (lakh) segments.push(`${toWordsBelowThousand(lakh)} Lakh`);
  if (thousand) segments.push(`${toWordsBelowThousand(thousand)} Thousand`);
  if (hundred) segments.push(toWordsBelowThousand(hundred));

  return segments.length ? `Rupees ${segments.join(' ')} Only` : '';
};

const normalizeRow = (item, index) => {
  if (!item) {
    return {
      key: `empty-${index}`,
      sno: '',
      productDescription: '',
      sizesOrPieces: '',
      hsnCode: '',
      ratePerPiece: '',
      noOfPacks: '',
      amount: '',
      hasValue: false
    };
  }

  const productDescription = String(item.productName || item.name || item.particular || '').trim();
  const sizesOrPieces = String(item.sizesOrPieces || item.size || item.designColor || '').trim();
  const hsnCode = String(item.hsnCode || item.hsn || (productDescription ? '61034300' : '')).trim();
  const ratePerPiece = toAmount(item.ratePerPiece, item.ratePerPack ?? item.price);
  const noOfPacks = toAmount(item.noOfPacks, item.quantity);
  const amount = toAmount(item.total, ratePerPiece * noOfPacks);
  const hasValue = Boolean(productDescription || sizesOrPieces || hsnCode || noOfPacks || amount);

  return {
    key: item.uniqueId || item._id || `row-${index}`,
    sno: hasValue ? index + 1 : '',
    productDescription,
    sizesOrPieces,
    hsnCode,
    ratePerPiece: hasValue ? ratePerPiece.toFixed(2) : '',
    noOfPacks: hasValue ? String(noOfPacks) : '',
    amount: hasValue ? amount.toFixed(2) : '',
    hasValue
  };
};

const InvoiceTemplate = forwardRef(function InvoiceTemplate(
  {
    bill = {},
    settings = {},
    isEmpty = false
  },
  ref
) {
  const invoice = isEmpty ? {} : (bill || {});
  const company = { ...DEFAULT_COMPANY, ...(settings?.company || {}) };
  const bank = { ...DEFAULT_BANK, ...(settings?.bank || {}) };
  const items = Array.isArray(invoice.items) ? invoice.items : [];

  const totalPacks = useMemo(() => {
    if (invoice.totalPacks != null) return toAmount(invoice.totalPacks);
    return items.reduce((sum, item) => sum + toAmount(item?.noOfPacks, item?.quantity), 0);
  }, [invoice.totalPacks, items]);

  const productAmount = toAmount(invoice.subtotal);
  const discountAmount = toAmount(invoice.discountAmount);
  const taxableAmount = toAmount(invoice.taxableAmount, productAmount - discountAmount);
  const cgstAmount = toAmount(invoice.cgst);
  const sgstAmount = toAmount(invoice.sgst);
  const roundOff = toAmount(invoice.roundOff);
  const grandTotal = toAmount(invoice.grandTotal, taxableAmount + cgstAmount + sgstAmount + roundOff);
  const totalTaxRate = toAmount(invoice.totalTaxRate, 5);
  const numOfBundles = toAmount(invoice.numOfBundles, 0);

  const tableRows = useMemo(() => {
    const normalizedRows = items.map((item, index) => normalizeRow(item, index));
    while (normalizedRows.length < 20) {
      normalizedRows.push(normalizeRow(null, normalizedRows.length));
    }
    return normalizedRows;
  }, [items]);

  const showNumber = (value, { blankWhenZero = true } = {}) => {
    if (!Number.isFinite(value)) return '';
    if (blankWhenZero && value === 0) return '';
    return value.toFixed(2);
  };

  const formattedGrandTotal = showNumber(grandTotal, { blankWhenZero: false });
  const amountInWords = invoice.amountInWords || numberToWords(grandTotal);
  const customer = invoice.customer || {};

  return (
    <div ref={ref} className="invoice-template" id="invoice-paper">
      <div className="invoice-header-row">
        <div className="invoice-header-left">
          <p className="invoice-company-title">{company.name}</p>
          <p className="invoice-company-gstin">GSTIN: {company.gstin}</p>
        </div>
        <div className="invoice-header-right">
          <img src={ruggedUrbanLogo} alt="Rugged & Urban" className="invoice-rugged-logo" />
        </div>
      </div>

      <div className="invoice-company-row">
        <div className="invoice-company-col">
          <p><span>OFF</span><span>:</span><span>{company.address1}</span></p>
          <p><span>OFF</span><span>:</span><span>{company.address2}</span></p>
          <p><span>State</span><span>:</span><span>{company.state} (Code {company.stateCode})</span></p>
          <p><span>Email</span><span>:</span><span>{company.email}</span></p>
          <p><span>Mob</span><span>:</span><span>{company.phone}</span></p>
        </div>
        <div className="invoice-meta-col">
          <p><span>Invoice Number</span><span>:</span><span>{invoice.billNumber || ''}</span></p>
          <p><span>Invoice Date</span><span>:</span><span>{formatDate(invoice.date || invoice.createdAt)}</span></p>
          <p><span>From</span><span>:</span><span>{invoice.fromText || ''}</span></p>
          <p><span>To</span><span>:</span><span>{invoice.toText || ''}</span></p>
        </div>
      </div>

      <div className="invoice-tax-row">TAX INVOICE</div>

      <div className="invoice-buyer-row">
        <div className="invoice-buyer-col invoice-buyer-left">
          <p className="invoice-consignee">Consignee Copy</p>
          <p><span>BUYER</span><span>:</span><span>{customer.name || ''}</span></p>
          <p><span>STATE</span><span>:</span><span>{customer.state || 'TAMILNADU'}</span></p>
          <p><span>TRANSPORT</span><span>:</span><span>{invoice.transport || ''}</span></p>
        </div>
        <div className="invoice-buyer-col invoice-buyer-right">
          <p><span>MOB</span><span>:</span><span>{customer.phone || ''}</span></p>
          <p><span>GSTIN</span><span>:</span><span>{customer.gstin || ''}</span></p>
          <p><span>CODE</span><span>:</span><span>{customer.stateCode || company.stateCode}</span></p>
        </div>
      </div>

      <table className="invoice-items-table">
        <thead>
          <tr>
            <th>S.No</th>
            <th>PRODUCT DESCRIPTION</th>
            <th>SIZES / PIECES</th>
            <th>HSN CODE</th>
            <th>RATE PER PIECE</th>
            <th>NO OF PACKS</th>
            <th>AMOUNT RS.</th>
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row) => (
            <tr key={row.key}>
              <td className="center-cell">{row.sno}</td>
              <td className="text-cell">{row.productDescription}</td>
              <td className="center-cell nowrap-cell">{row.sizesOrPieces}</td>
              <td className="center-cell">{row.hsnCode}</td>
              <td className="number-cell">{row.ratePerPiece}</td>
              <td className="center-cell">{row.noOfPacks}</td>
              <td className="number-cell">{row.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>


      <div className="invoice-summary-row">
        <div className="invoice-summary-col left-col">
          <p><span>Total Packs</span><span>:</span><span>{totalPacks || ''}</span></p>
          <p><span>Bill Amount</span><span>:</span><span>{formattedGrandTotal}</span></p>
          <p className="words-row"><span>In words</span><span>:</span><span>{amountInWords}</span></p>
        </div>

        <div className="invoice-summary-col middle-col">
          <p className="bundle-row"><span>NUM OF BUNDLES</span><span>:</span><span>{numOfBundles || ''}</span></p>
          <div className="gst-box">
            <span className="gst-label">TOTAL GST</span>
            <span className="gst-value">{totalTaxRate.toFixed(0)}%</span>
          </div>
        </div>

        <div className="invoice-summary-col right-col">
          <p><span>Product Amt</span><span>{showNumber(productAmount)}</span></p>
          <p><span>Discount</span><span>{showNumber(discountAmount)}</span></p>
          <p><span>Taxable Amt</span><span>{showNumber(taxableAmount)}</span></p>
          <p className="tax-row"><span>CGST @ 2.50%</span><span>{showNumber(cgstAmount)}</span></p>
          <p className="tax-row"><span>SGST @ 2.50%</span><span>{showNumber(sgstAmount)}</span></p>
          <p><span>Round Off</span><span>{showNumber(roundOff)}</span></p>
          <p className="total-row"><span>Total Amt</span><span>{formattedGrandTotal}</span></p>
        </div>
      </div>

      <div className="invoice-footer-row">
        <div className="invoice-footer-left">
          <p className="terms-title">TERMS AND CONDITIONS</p>
          <ol>
            <li>Subject to Tirupur Jurisdiction.</li>
            <li>Payment by Cheque/DD only, payable at Tirupur.</li>
            <li>Cheques made in favour of SRI RAM FASHIONS to be sent to Tirunelveli Address</li>
            <li>All disputes are subjected to Tirunelveli Jurisdiction</li>
          </ol>

          <div className="bank-box">
            <p className="bank-title">Bank Details:</p>
            <p><span>ACC NAME</span><span>:</span><span>{bank.accountHolderName}</span></p>
            <p><span>BANK</span><span>:</span><span>{bank.bankName}</span></p>
            <p><span>ACC NUM</span><span>:</span><span>{bank.accountNumber}</span></p>
            <p><span>BRANCH</span><span>:</span><span>{bank.branchName} &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp; IFSC : {bank.ifscCode}</span></p>
          </div>
        </div>

        <div className="invoice-footer-right">
          <p className="declaration">Certified that above particulars are true and correct</p>
          <p className="for-company">FOR {company.name}</p>
          <div className="signature-line" />
          <p className="signature-label">AUTHORIZED SIGNATURE</p>
        </div>
      </div>
    </div>
  );
});

export default InvoiceTemplate;
