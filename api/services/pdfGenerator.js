import PDFDocument from 'pdfkit';
import Settings from '../models/Settings.js';
import cacheService from './cacheService.js';

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

const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

const toAmount = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Generate a bill PDF buffer using PDFKit.
 * Layout precisely matches BillTemplate.jsx + BillTemplate.css.
 * The items table dynamically fills remaining A4 space so the bill fits exactly one page.
 */
export const generateBillPDF = async (bill) => {
    // Load settings (cached for 1 hour to reduce DB load)
    let settings = await cacheService.getOrSet(
        cacheService.CACHE_KEYS.SETTINGS,
        async () => {
            const loaded = await Settings.findOne();
            return loaded || new Settings();
        },
        cacheService.CACHE_TTL.SETTINGS
    );

    const companyName = settings?.company?.name || 'SRI RAM FASHIONS';
    const companyGstin = settings?.company?.gstin || '33AZRPM4425F2ZA';
    const companyAddress1 = settings?.company?.address1 || '61C9, Anupparpalayam Puthur, Tirupur. 641652';
    const companyAddress2 = settings?.company?.address2 || '81 K, Madurai Raod, SankerNager, Tirunelveli Dt. 627357';
    const companyState = settings?.company?.state || 'Tamilnadu';
    const companyStateCode = settings?.company?.stateCode || '33';
    const companyEmail = settings?.company?.email || 'sriramfashionstrp@gmail.com';
    const companyPhone = settings?.company?.phone || '9080573831';

    const bankName = settings?.bank?.bankName || 'SOUTH INDIAN BANK';
    const bankAccount = settings?.bank?.accountNumber || '0338073000002328';
    const bankBranch = settings?.bank?.branchName || 'TIRUPUR';
    const bankIfsc = settings?.bank?.ifscCode || 'SIBL0000338';
    const bankAccName = settings?.bank?.accountHolderName || 'SRI RAM FASHIONS';

    const isPurchase = bill.billType === 'PURCHASE';
    const items = bill.items || [];
    const productAmt = toAmount(bill.subtotal);
    const discount = toAmount(bill.discountAmount);
    const taxableAmt = toAmount(bill.taxableAmount, productAmt - discount);
    const cgstAmt = toAmount(bill.cgst, isPurchase ? 0 : (taxableAmt * 2.5) / 100);
    const sgstAmt = toAmount(bill.sgst, isPurchase ? 0 : (taxableAmt * 2.5) / 100);
    const igstAmt = toAmount(bill.igst);
    const totalGst = toAmount(bill.totalTax, cgstAmt + sgstAmt + igstAmt);
    const totalAmt = toAmount(bill.grandTotal, Math.round(taxableAmt + totalGst));
    const roundOff = toAmount(bill.roundOff, totalAmt - (taxableAmt + totalGst));
    
    const totalQuantity = isPurchase
        ? (bill.totalPacks || items.reduce((sum, item) => sum + toAmount(item.weightKg || item.quantity), 0))
        : (bill.totalPacks || items.reduce((sum, item) => sum + toAmount(item.noOfPacks || item.quantity), 0));
    const numBundles = bill.numOfBundles || 1;

    const doc = new PDFDocument({ size: 'A4', margins: { top: 15, bottom: 15, left: 15, right: 15 } });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    const pdfPromise = new Promise((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
    });

    const M = 15;
    const PW = 595.28;
    const PH = 841.89;
    const W = PW - M * 2;
    let y = M;

    // --- 1. Top Header Banner ---
    doc.rect(M, y, W * 0.55, 45).fill('#002080');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20).text(companyName.toUpperCase(), M + 15, y + 10);
    doc.fontSize(9).text(`GSTIN: ${companyGstin}`, M + 15, y + 32);

    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(14).text('RUGGED & URBAN', M + W - 140, y + 15);
    doc.circle(M + W - 160, y + 20, 10).stroke();
    y += 45;

    // --- 2. Address & Invoice Details ---
    const row2Y = y;
    doc.rect(M, y, W, 65).stroke();
    doc.font('Helvetica').fontSize(8).fillColor('#000000');
    doc.text(`OFF : ${companyAddress1}\nOFF : ${companyAddress2}\nState : ${companyState} (Code ${companyStateCode})\nEmail : ${companyEmail}\nMob : ${companyPhone}`, M + 8, y + 8, { width: W * 0.55 });
    
    doc.text(`${isPurchase ? 'Bill' : 'Invoice'} Number   : ${bill.billNumber || ''}\n${isPurchase ? 'Bill' : 'Invoice'} Date       : ${formatDate(bill.date || bill.createdAt)}\nFrom                 : ${bill.fromText || ''}\nTo                    : ${bill.toText || ''}`, M + W * 0.55 + 8, y + 8);
    y += 65;

    // --- 3. TAX INVOICE Header ---
    doc.fillColor('#002080').font('Helvetica-Bold').fontSize(14).text(isPurchase ? 'PURCHASE INVOICE' : 'TAX INVOICE', M, y + 6, { width: W, align: 'center' });
    doc.moveTo(M, y + 22).lineTo(M + W, y + 22).stroke();
    y += 22;

    // --- 4. Buyer Section ---
    doc.rect(M, y, W, 55).stroke();
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8);
    
    const buyerLabel = isPurchase ? 'SUPPLIER' : 'BUYER';
    const transportLabel = isPurchase ? 'ADDRESS' : 'TRANSPORT';
    const codeLabel = isPurchase ? 'INV NO' : 'CODE';
    const codeValue = isPurchase ? (bill.referenceInvoiceNumber || bill.fromText || '') : (bill.customer?.stateCode || '33');

    doc.text(`${isPurchase ? 'Supplier' : 'Consignee'} Copy\n${buyerLabel}           : ${bill.customer?.name || ''}\nSTATE            : ${bill.customer?.state || 'Tamilnadu'}\n${transportLabel}  : ${isPurchase ? (bill.customer?.address || '') : (bill.transport || '')}`, M + 8, y + 6, { width: W * 0.55 });
    doc.text(`\nMOB             : ${bill.customer?.phone || ''}\nGSTIN          : ${bill.customer?.gstin || ''}\n${codeLabel}            : ${codeValue}`, M + W * 0.55 + 8, y + 6);
    y += 55;

    // --- 5. Main Items Table ---
    const tableTop = y;
    const colWidths = [35, 150, 80, 60, 80, 60, 100];
    const headers = isPurchase 
        ? ["S.NO", "PARTICULARS", "DESIGN / COLOR", "HSN CODE", "RATE / KG", "WEIGHT (KG)", "AMOUNT RS."]
        : ["S.NO", "PRODUCT DESCRIPTION", "SIZES / PIECES", "HSN CODE", "RATE PER PIECE", "NO OF PACKS", "AMOUNT RS."];
    
    let x = M;
    doc.font('Helvetica-Bold').fontSize(8);
    headers.forEach((h, i) => {
        doc.rect(x, y, colWidths[i], 20).stroke();
        doc.text(h, x, y + 6, { width: colWidths[i], align: 'center' });
        x += colWidths[i];
    });
    y += 20;

    doc.font('Helvetica').fontSize(8);
    for (let i = 0; i < 15; i++) {
        const item = items[i];
        x = M;
        colWidths.forEach((w, j) => {
            doc.rect(x, y, w, 18).stroke();
            if (item) {
                let val = '';
                if (j === 0) val = `${i + 1}`;
                else if (j === 1) val = item.productName || item.name || '';
                else if (j === 2) val = isPurchase ? (item.designColor || item.sizesOrPieces || '') : (item.sizesOrPieces || '');
                else if (j === 3) val = item.hsnCode || item.hsn || '';
                else if (j === 4) val = isPurchase ? toAmount(item.ratePerKg || item.price).toFixed(2) : toAmount(item.ratePerPack || item.price).toFixed(2);
                else if (j === 5) val = isPurchase ? `${toAmount(item.weightKg || item.quantity).toFixed(2)}` : `${item.noOfPacks || item.quantity || 0}`;
                else if (j === 6) val = toAmount(item.total).toFixed(2);
                
                doc.text(val, x + 2, y + 5, { width: w - 4, align: j === 1 ? 'left' : (j === 6 ? 'right' : 'center') });
            }
            x += w;
        });
        y += 18;
    }

    // --- 5.5 Total Pcs Row (Above Summary) ---
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10);
    doc.text(`Total Pcs : `, PW / 2 - 40, y + 5);
    doc.rect(PW / 2 + 20, y, 40, 15).strokeColor('#000000').stroke();
    doc.text(`${totalQuantity}`, PW / 2 + 20, y + 4, { width: 40, align: 'center' });
    y += 20;

    // --- 6. Summary Section ---
    const summaryY = y;
    doc.rect(M, y, W, 100).stroke();
    const sumW = W / 3;

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000');
    const packL = isPurchase ? 'Total Weight' : 'Total Packs';
    doc.text(`${packL} : ${totalQuantity}`, M + 10, y + 10);
    doc.text(`Bill Amount : ${totalAmt.toFixed(2)}`, M + 10, y + 30);
    doc.text(`In words :`, M + 10, y + 50);
    doc.font('Helvetica').text(`Rupees ${numberToWords(totalAmt)} Only`, M + 10, y + 62, { width: sumW - 15 });

    doc.font('Helvetica-Bold').text(`NUM OF BUNDLES :`, M + sumW + 15, y + 10);
    doc.rect(M + sumW + 110, y + 4, 30, 15).stroke();
    doc.text(`${numBundles}`, M + sumW + 110, y + 7, { width: 30, align: 'center' });

    doc.rect(M + sumW + 10, y + 50, sumW - 20, 35).strokeColor('#FF0000').stroke();
    doc.fillColor('#FF0000').fontSize(11).text('TOTAL GST', M + sumW + 20, y + 62);
    doc.fontSize(12).text(totalGst.toFixed(2), M + sumW * 2 - 20, y + 62, { align: 'right' });
    
    doc.fillColor('#000000').fontSize(8);
    let taxY = summaryY + 10;
    const drawTax = (l, v, ty, color = '#000000', bold = false) => {
        doc.fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica');
        doc.text(l, M + sumW * 2 + 10, ty);
        doc.text(v, M + sumW * 3 - 60, ty, { width: 50, align: 'right' });
    };

    drawTax('Product Amt', productAmt.toFixed(2), taxY); taxY += 12;
    drawTax('Discount', discount.toFixed(2), taxY); taxY += 12;
    drawTax('Taxable Amt', taxableAmt.toFixed(2), taxY); taxY += 12;
    drawTax('CGST @ 2.50%', cgstAmt.toFixed(2), taxY, '#FF0000', true); taxY += 12;
    drawTax('SGST @ 2.50%', sgstAmt.toFixed(2), taxY, '#FF0000', true); taxY += 12;
    drawTax('Round Off', roundOff.toFixed(2), taxY); taxY += 12;
    drawTax('TOTAL AMT', totalAmt.toFixed(2), taxY, '#000000', true);

    doc.strokeColor('#000000');
    doc.moveTo(M + sumW, summaryY).lineTo(M + sumW, summaryY + 100).stroke();
    doc.moveTo(M + sumW * 2, summaryY).lineTo(M + sumW * 2, summaryY + 100).stroke();
    y += 100;

    // --- 7. Footer Section ---
    doc.fillColor('#000080').font('Helvetica-Bold').fontSize(8).text('TERMS AND CONDITIONS', M + 10, y + 10);
    doc.fillColor('#000000').font('Helvetica').fontSize(6).text(`1. Subject to Tirupur Jurisdiction.\n2. Payment by Cheque/DD only, payable at Tirupur.\n3. Cheques made in favour of ${companyName.toUpperCase()}\n   to be sent to Tirunelveli Address\n4. All disputes are subjected to Tirunelveli Jurisdiction`, M + 10, y + 20);

    const bankY = y + 55;
    doc.rect(M + 5, bankY, sumW + 30, 35).strokeColor('#FFA500').stroke();
    doc.fillColor('#FF0000').font('Helvetica-Bold').fontSize(8).text('Bank Details:', M + 10, bankY + 5);
    doc.fillColor('#002080').fontSize(7).text(`ACC NAME  : ${bankAccName}\nBANK          : ${bankName}\nACC NUM     : ${bankAccount}\nBRANCH      : ${bankBranch}        |  IFSC : ${bankIfsc}`, M + 10, bankY + 14);

    doc.fillColor('#000000').font('Helvetica').fontSize(8).text('Certified that above particulars are true and correct', M + W - 180, y + 10, { width: 150, align: 'center' });
    doc.font('Helvetica-Bold').text(`FOR ${companyName.toUpperCase()}`, M + W - 180, y + 35, { width: 150, align: 'center' });
    doc.text('AUTHORIZED SIGNATURE', M + W - 180, y + 85, { width: 150, align: 'center' });

    // Final border
    doc.strokeColor('#000000').lineWidth(1).rect(M, M, W, PH - M * 2).stroke();

    doc.end();
    return pdfPromise;
};

export default { generateBillPDF };
