import jsPDF from 'jspdf';

// ==============================
// Helpers
// ==============================

/** Convert number to words – Indian format */
const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    if (num === 0) return 'Zero';
    if (num < 0) return 'Minus ' + numberToWords(-num);
    num = Math.floor(num);
    let words = '';
    if (Math.floor(num / 10000000) > 0) { words += numberToWords(Math.floor(num / 10000000)) + ' Crore '; num %= 10000000; }
    if (Math.floor(num / 100000) > 0) { words += numberToWords(Math.floor(num / 100000)) + ' Lakh '; num %= 100000; }
    if (Math.floor(num / 1000) > 0) { words += numberToWords(Math.floor(num / 1000)) + ' Thousand '; num %= 1000; }
    if (Math.floor(num / 100) > 0) { words += numberToWords(Math.floor(num / 100)) + ' Hundred '; num %= 100; }
    if (num > 0) {
        if (words !== '') words += 'and ';
        if (num < 20) words += ones[num];
        else { words += tens[Math.floor(num / 10)]; if (num % 10 > 0) words += ' ' + ones[num % 10]; }
    }
    return words.trim();
};

/** Format date as DD/MM/YYYY */
const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}/${dt.getFullYear()}`;
};

// Colors matching BillTemplate.css exactly
const BLUE = { r: 26, g: 61, b: 124 };   // #1a3d7c
const BLACK = { r: 0, g: 0, b: 0 };
const RED = { r: 204, g: 0, b: 0 };       // #cc0000 (#c00)
const GRAY_TEXT = { r: 34, g: 34, b: 34 }; // #222
const GRAY_BORDER = { r: 51, g: 51, b: 51 }; // #333
const GRAY_LIGHT = { r: 85, g: 85, b: 85 }; // #555
const BANK_BG = { r: 255, g: 251, b: 230 }; // #fffbe6
const BANK_BORDER = { r: 212, g: 160, b: 23 }; // #d4a017

// Helper: set color
const setC = (pdf, c) => pdf.setTextColor(c.r, c.g, c.b);
const setD = (pdf, c) => pdf.setDrawColor(c.r, c.g, c.b);
const setF = (pdf, c) => pdf.setFillColor(c.r, c.g, c.b);
const toAmount = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

// ==============================
// Main generator — matches BillTemplate.css layout exactly
// The bill fits precisely on one A4 page.
// ==============================

export const generateInvoicePDF = (bill, settings = {}) => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Page dimensions
    const PW = 210;
    const PH = 297;
    const M = 8;       // 8mm margin (from CSS @page { margin: 8mm })
    const W = PW - M * 2; // content width
    const H = PH - M * 2; // content height

    // ---- Settings / defaults ----
    const co = settings?.company || {};
    const companyName = co.name || 'SRI RAM FASHIONS';
    const gstin = co.gstin || '33AZRPM4425F2ZA';
    const addr1 = co.address1 || '61C9, Anupparpalayam Puthur, Tirupur. 641652';
    const addr2 = co.address2 || '81 K, Madurai Road, SankerNager, Tirunelveli Dt. 627357';
    const state = co.state || 'Tamilnadu';
    const stateCode = co.stateCode || '33';
    const email = co.email || 'sriramfashionstrp@gmail.com';
    const phone = co.phone || '9080573831';

    const bk = settings?.bank || {};
    const bankName = bk.bankName || bk.name || 'SOUTH INDIAN BANK';
    const bankAcc = bk.accountNumber || bk.account || '0338073000002328';
    const bankBranch = bk.branchName || bk.branch || 'TIRUPUR';
    const bankIfsc = bk.ifscCode || bk.ifsc || 'SIBL0000338';
    const bankAccName = bk.accountHolderName || companyName;

    const fallbackCgstRate = settings?.tax?.cgstRate || 2.5;
    const fallbackSgstRate = settings?.tax?.sgstRate || 2.5;

    // ---- Bill data ----
    const isPurchase = bill.billType === 'PURCHASE';
    const items = bill.items || [];
    const productAmt = toAmount(bill.subtotal);
    const discount = toAmount(bill.discountAmount);
    const taxableAmt = toAmount(bill.taxableAmount, productAmt - discount);
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

    const detailRows = isPurchase
        ? [
            ['Bill Number', bill.billNumber || ''],
            ['Bill Date', fmtDate(bill.date || bill.createdAt)],
            ['Purchase Inv No', purchaseInvoiceNumber],
            ['Total Weight', `${totalQuantity}`]
        ]
        : [
            ['Invoice Number', bill.billNumber || ''],
            ['Invoice Date', fmtDate(bill.date || bill.createdAt)],
            ['From', bill.fromText || ''],
            ['To', bill.toText || '']
        ];

    const buyerHeading = isPurchase ? 'Supplier Copy' : 'Consignee Copy';
    const buyerPrimaryLabel = isPurchase ? 'SUPPLIER:' : 'BUYER:';
    const buyerTertiaryLabel = isPurchase ? 'ADDRESS:' : 'TRANSPORT:';
    const buyerTertiaryValue = isPurchase ? (bill.customer?.address || '') : (bill.transport || '');
    const buyerBottomLabel = isPurchase ? 'INV NO:' : 'CODE:';
    const buyerBottomValue = isPurchase ? purchaseInvoiceNumber : (bill.customer?.stateCode || '33');
    const titleText = isPurchase ? 'PURCHASE INVOICE' : 'TAX INVOICE';
    const quantityLabel = isPurchase ? 'Total Weight' : 'Total Packs';

    const columns = isPurchase
        ? [
            { header: 'S.No', width: 0.06, align: 'center', value: (_, index) => `${index + 1}` },
            { header: 'Particular', width: 0.30, align: 'left', value: (item) => item.productName || item.name || '' },
            { header: 'HSN\nCode', width: 0.12, align: 'center', value: (item) => String(item.hsnCode || item.hsn || '') },
            { header: 'Design /\nColor', width: 0.16, align: 'center', value: (item) => String(item.designColor || item.sizesOrPieces || '') },
            { header: 'Weight\n(KG)', width: 0.12, align: 'center', value: (item) => `${toAmount(item.weightKg, toAmount(item.quantity))}` },
            { header: 'Rate Per\nKG', width: 0.12, align: 'center', value: (item) => `${toAmount(item.ratePerKg, toAmount(item.price))}` },
            { header: 'Amount\nRs.', width: 0.12, align: 'center', value: (item) => `${toAmount(item.total, toAmount(item.weightKg, toAmount(item.quantity)) * toAmount(item.ratePerKg, toAmount(item.price)))}` }
        ]
        : [
            { header: 'S.No', width: 0.05, align: 'center', value: (_, index) => `${index + 1}` },
            { header: 'Product', width: 0.18, align: 'left', value: (item) => item.productName || item.name || '' },
            { header: 'HSN\nCode', width: 0.09, align: 'center', value: (item) => String(item.hsnCode || item.hsn || '') },
            { header: 'Sizes/\nPieces', width: 0.10, align: 'center', value: (item) => String(item.sizesOrPieces || '') },
            { header: 'Rate Per\nPiece', width: 0.10, align: 'center', value: (item) => item.ratePerPiece ? `${item.ratePerPiece}` : '' },
            { header: 'Pcs in\nPack', width: 0.08, align: 'center', value: (item) => item.pcsInPack ? `${item.pcsInPack}` : '' },
            { header: 'Rate Per\nPack', width: 0.11, align: 'center', value: (item) => `${toAmount(item.ratePerPack, toAmount(item.price))}` },
            { header: 'No Of\nPacks', width: 0.09, align: 'center', value: (item) => `${toAmount(item.noOfPacks, toAmount(item.quantity))}` },
            { header: 'Amount\nRs.', width: 0.20, align: 'center', value: (item) => `${toAmount(item.total, toAmount(item.ratePerPack, toAmount(item.price)) * toAmount(item.noOfPacks, toAmount(item.quantity)))}` }
        ];

    // ===== Fixed section heights (mm) =====
    const row1H = 12;    // Company Name + GSTIN
    const row2H = 24;    // Address + Invoice Details
    const row3H = 8;     // TAX INVOICE title
    const row4H = 20;    // Buyer / Consignee
    const thH = 9;       // Table header
    const row6H = 28;    // Summary section
    const row7H = 30;    // Footer

    const fixedH = row1H + row2H + row3H + row4H + thH + row6H + row7H;
    const tableBodyH = H - fixedH;

    // Dynamic row height to fill remaining space
    const minRows = Math.max(items.length, 10);
    const rowH = tableBodyH / minRows;

    // ===== Outer border (2px solid #333) =====
    let y = M;
    setD(pdf, GRAY_BORDER);
    pdf.setLineWidth(0.6);
    pdf.rect(M, M, W, H, 'S');

    // Helpers
    const hLine = (yPos, lw = 0.5) => {
        setD(pdf, GRAY_BORDER);
        pdf.setLineWidth(lw);
        pdf.line(M, yPos, M + W, yPos);
    };
    const vLine = (x, y1, y2, lw = 0.5) => {
        setD(pdf, GRAY_BORDER);
        pdf.setLineWidth(lw);
        pdf.line(x, y1, x, y2);
    };

    const PX = 5; // horizontal padding in mm

    // =============================================
    // ROW 1: Company Name + GSTIN
    // =============================================
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    setC(pdf, BLUE);
    const nameX = M + PX;
    pdf.text(companyName.toUpperCase(), nameX, y + 8);

    pdf.setFontSize(10);
    setC(pdf, BLACK);
    pdf.text(`GSTIN: ${gstin}`, M + W - PX, y + 8, { align: 'right' });

    y += row1H;
    hLine(y);

    // =============================================
    // ROW 2: Address (left) + Invoice Details (right)
    // Right panel = ~70mm (matching CSS 280px at 210mm)
    // =============================================
    const row2Top = y;
    const invDetW = 70;
    const addrW = W - invDetW;

    vLine(M + addrW, row2Top, row2Top + row2H);

    // Address
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    setC(pdf, GRAY_TEXT);
    const addrLines = [
        `OFF : ${addr1}`,
        `OFF : ${addr2}`,
        `State: ${state} (Code ${stateCode})`,
        `Email: ${email}`,
        `Mob: ${phone}`
    ];
    addrLines.forEach((l, i) => pdf.text(l, M + PX, row2Top + 4 + i * 3.8, { maxWidth: addrW - PX * 2 }));

    // Invoice details
    const detX = M + addrW + PX;
    const detLabelW = 26;
    let detY = row2Top + 4;
    const detRowH = 5;

    const drawDetailRow = (label, value) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        setC(pdf, BLACK);
        pdf.text(label, detX, detY);
        pdf.text(':', detX + detLabelW, detY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value || '', detX + detLabelW + 3, detY);
        detY += detRowH;
    };

    detailRows.forEach(([label, value]) => drawDetailRow(label, value));

    y += row2H;
    hLine(y);

    // =============================================
    // ROW 3: TAX INVOICE Title Bar
    // =============================================
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    setC(pdf, BLUE);
    pdf.text(titleText, M + W / 2, y + 5.5, { align: 'center' });
    // Underline
    const tw = pdf.getTextWidth(titleText);
    setD(pdf, BLUE);
    pdf.setLineWidth(0.3);
    pdf.line(M + W / 2 - tw / 2, y + 6.5, M + W / 2 + tw / 2, y + 6.5);

    y += row3H;
    hLine(y);

    // =============================================
    // ROW 4: Buyer / Consignee Section
    // Left (flex:1) | Right (280px → 70mm)
    // =============================================
    const row4Top = y;
    const buyerRightW = invDetW;
    const buyerLeftW = W - buyerRightW;

    vLine(M + buyerLeftW, row4Top, row4Top + row4H);

    // Left - Consignee Copy
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(6);
    setC(pdf, GRAY_LIGHT);
    pdf.text(buyerHeading, M + PX, row4Top + 3);

    // Buyer fields
    const bFieldX = M + PX;
    const bLabelW = 22;
    let bFieldY = row4Top + 7;
    const bFieldRowH = 4.5;

    const drawBuyerField = (label, value) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        setC(pdf, BLACK);
        pdf.text(label, bFieldX, bFieldY);
        pdf.text((value || '').toUpperCase(), bFieldX + bLabelW + 2, bFieldY, { maxWidth: buyerLeftW - PX * 2 - bLabelW - 2 });
        bFieldY += bFieldRowH;
    };

    drawBuyerField(buyerPrimaryLabel, bill.customer?.name || '');
    drawBuyerField('STATE:', bill.customer?.state || 'Tamilnadu');
    // Transport with normal weight value
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    setC(pdf, BLACK);
    pdf.text(buyerTertiaryLabel, bFieldX, bFieldY);
    pdf.setFont('helvetica', 'normal');
    pdf.text((buyerTertiaryValue || '').toUpperCase(), bFieldX + bLabelW + 2, bFieldY, { maxWidth: buyerLeftW - PX * 2 - bLabelW - 2 });

    // Right side
    const bRightX = M + buyerLeftW + PX;
    const bRLabelW = 14;
    let bRightY = row4Top + 7;
    const bRRowH = 4.5;

    const drawBuyerRight = (label, value) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        setC(pdf, BLACK);
        pdf.text(label, bRightX, bRightY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value || '', bRightX + bRLabelW, bRightY);
        bRightY += bRRowH;
    };

    drawBuyerRight('MOB:', bill.customer?.phone || '');
    drawBuyerRight('GSTIN:', bill.customer?.gstin || '');
    drawBuyerRight(buyerBottomLabel, buyerBottomValue);

    y += row4H;
    hLine(y);

    // =============================================
    // ROW 5: Items Table (fills remaining A4 space)
    // Column widths depend on bill type.
    // =============================================
    const colW = columns.map((column) => W * column.width);

    // Table header
    let tY = y;
    let tX = M;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    setC(pdf, BLACK);
    setD(pdf, GRAY_BORDER);
    pdf.setLineWidth(0.3);

    for (let i = 0; i < columns.length; i++) {
        pdf.rect(tX, tY, colW[i], thH, 'S');
        const lines = columns[i].header.split('\n');
        const lineH = 3;
        const startY = tY + (thH - lines.length * lineH) / 2 + lineH - 0.5;
        lines.forEach((line, li) => {
            pdf.text(line, tX + colW[i] / 2, startY + li * lineH, { align: 'center' });
        });
        tX += colW[i];
    }
    tY += thH;

    // Data rows — dynamically sized
    for (let r = 0; r < minRows; r++) {
        tX = M;
        const item = items[r];

        setD(pdf, GRAY_BORDER);
        pdf.setLineWidth(0.3);

        for (let c = 0; c < columns.length; c++) {
            // Left border
            pdf.line(tX, tY, tX, tY + rowH);
            // Right border on last column
            if (c === columns.length - 1) pdf.line(tX + colW[c], tY, tX + colW[c], tY + rowH);

            if (item) {
                const column = columns[c];
                const cellText = column.value(item, r);
                const align = column.align || 'center';

                if (cellText) {
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(7);
                    setC(pdf, BLACK);
                    const txtX = align === 'left' ? tX + 2 : tX + colW[c] / 2;
                    pdf.text(cellText, txtX, tY + rowH / 2 + 1, { align, maxWidth: colW[c] - 3 });
                }
            }

            tX += colW[c];
        }
        tY += rowH;
    }

    // Bottom border of last row
    y = tY;
    hLine(y, 0.6);

    // =============================================
    // ROW 6: Summary (3-column, flex 1.2:0.8:1)
    // =============================================
    const sumTotalFlex = 3.0;
    const sumLeftW = W * (1.2 / sumTotalFlex);
    const sumMidW = W * (0.8 / sumTotalFlex);
    const sumRightW = W * (1.0 / sumTotalFlex);

    vLine(M + sumLeftW, y, y + row6H);
    vLine(M + sumLeftW + sumMidW, y, y + row6H);

    // Left column: Total Packs / Bill Amount / In Words
    const sLX = M + PX;
    let sLY = y + 4;
    const sLabelW = 22;
    const sRowGap = 5;

    const drawSummaryField = (label, value, isWords = false) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(isWords ? 6.5 : 7.5);
        setC(pdf, BLACK);
        pdf.text(label, sLX, sLY);
        pdf.text(':', sLX + sLabelW, sLY);
        pdf.text(value, sLX + sLabelW + 3, sLY, { maxWidth: sumLeftW - PX * 2 - sLabelW - 5 });
        sLY += sRowGap;
    };

    drawSummaryField(quantityLabel, `${totalQuantity}`);
    drawSummaryField('Bill Amount', `${totalAmt.toFixed(2)}`);
    drawSummaryField('In words', `Rupees ${numberToWords(totalAmt)} Only`, true);

    // Middle column: Bundles + GST Box
    const sMX = M + sumLeftW + 4;
    const sMW = sumMidW - 8;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    setC(pdf, BLACK);
    pdf.text('NUM OF BUNDLES :', sMX, y + 5);
    pdf.setFontSize(9);
    pdf.text(`${numBundles}`, sMX + sMW, y + 5, { align: 'right' });

    // GST Box: border 2px solid #c00
    const gstBoxY = y + row6H - 11;
    const gstBoxH = 8;
    setD(pdf, RED);
    pdf.setLineWidth(0.6);
    pdf.rect(sMX, gstBoxY, sMW, gstBoxH, 'S');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    setC(pdf, RED);
    pdf.text('TOTAL GST', sMX + 3, gstBoxY + 6);
    pdf.setFontSize(10);
    pdf.text(`${totalGst.toFixed(0)}`, sMX + sMW - 3, gstBoxY + 6, { align: 'right' });

    // Right column: Tax breakdown
    const sRX = M + sumLeftW + sumMidW + PX;
    const sRW = sumRightW - PX * 2;
    const taxRows = [
        { label: 'Product Amt', value: productAmt.toFixed(2) },
        { label: 'Discount', value: discount.toFixed(2) },
        { label: 'Taxable Amt', value: taxableAmt.toFixed(2) },
        { label: `CGST @ ${cgstRate.toFixed(2).replace(/\.00$/, '')}%`, value: cgstAmt.toFixed(2), highlight: true },
        { label: `SGST @ ${sgstRate.toFixed(2).replace(/\.00$/, '')}%`, value: sgstAmt.toFixed(2), highlight: true },
        { label: 'Round Off', value: roundOff.toFixed(2) }
    ];
    const rightTop = y + 4;
    const totalLineY = y + row6H - 8;
    const totalTextY = y + row6H - 3;
    const taxRowGap = (totalLineY - rightTop - 1) / Math.max(taxRows.length - 1, 1);

    taxRows.forEach((row, index) => {
        const rowY = rightTop + (taxRowGap * index);
        const color = row.highlight ? RED : BLACK;

        pdf.setFont('helvetica', row.highlight ? 'bold' : 'normal');
        pdf.setFontSize(7.2);
        setC(pdf, color);
        pdf.text(row.label, sRX, rowY);
        pdf.setFont('helvetica', 'bold');
        pdf.text(row.value, sRX + sRW, rowY, { align: 'right' });
    });

    setD(pdf, BLACK);
    pdf.setLineWidth(0.4);
    pdf.line(sRX - 1, totalLineY, sRX + sRW + 1, totalLineY);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.2);
    setC(pdf, BLACK);
    pdf.text('Total Amt', sRX, totalTextY);
    pdf.text(`${totalAmt.toFixed(2)}`, sRX + sRW, totalTextY, { align: 'right' });

    y += row6H;
    hLine(y, 0.5);

    // =============================================
    // ROW 7: Footer (Terms + Bank | Certification)
    // flex 1.2 : 1
    // =============================================
    const footFlex = 2.2;
    const footLeftW = W * (1.2 / footFlex);
    const footRightW = W * (1.0 / footFlex);

    vLine(M + footLeftW, y, y + row7H);

    // Left: Terms
    const fLX = M + PX;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    setC(pdf, BLUE);
    pdf.text('Terms And Conditions', fLX, y + 4);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.5);
    setC(pdf, GRAY_BORDER);
    const termsLines = [
        'Subject to Tirupur Jurisdiction.',
        'Payment by Cheque/DD only, payable at Tirupur.',
        `Cheques made in favour of ${companyName} to be sent to Tirunelveli Address`,
        'All disputes are subjected to Tirunelveli Jurisdiction'
    ];
    termsLines.forEach((t, i) => pdf.text(t, fLX, y + 7.5 + i * 2.8, { maxWidth: footLeftW - PX * 2 }));

    // Bank box: yellow background, gold border
    const bankBoxY = y + 16;
    const bankBoxW = footLeftW - PX * 2;
    const bankBoxH = 13;

    setF(pdf, BANK_BG);
    pdf.rect(fLX, bankBoxY, bankBoxW, bankBoxH, 'F');
    setD(pdf, BANK_BORDER);
    pdf.setLineWidth(0.5);
    pdf.rect(fLX, bankBoxY, bankBoxW, bankBoxH, 'S');

    // Bank title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.5);
    setC(pdf, RED);
    pdf.text('Bank Details:', fLX + 3, bankBoxY + 3.5);

    // Bank info
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(5.6);
    setC(pdf, BLUE);
    pdf.text(`ACC NAME: ${bankAccName}`, fLX + 3, bankBoxY + 6.6, { maxWidth: bankBoxW - 6 });
    pdf.text(`BANK: ${bankName}`, fLX + 3, bankBoxY + 9.6, { maxWidth: bankBoxW - 6 });
    pdf.text(`ACC NUM: ${bankAcc} | BRANCH: ${bankBranch} | IFSC: ${bankIfsc}`, fLX + 3, bankBoxY + 12.4, { maxWidth: bankBoxW - 6 });

    // Right: Certification + Signature
    const fRX = M + footLeftW + PX;
    const fRW = footRightW - PX * 2;
    const fRCenterX = M + footLeftW + footRightW / 2;

    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7.5);
    setC(pdf, GRAY_BORDER);
    pdf.text('Certified that above particulars are true', fRCenterX, y + 10, { align: 'center' });
    pdf.text('and correct', fRCenterX, y + 13.5, { align: 'center' });

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    setC(pdf, BLUE);
    pdf.text(`For ${companyName}`, fRCenterX, y + 25, { align: 'center' });

    return pdf;
};

// ==============================
// Export helpers
// ==============================

/** Download Tax Invoice PDF */
export const downloadInvoicePDF = (bill, settings, filename) => {
    const fn = filename || `SRI_RAM_FASHIONS_Invoice_${bill.billNumber || 'bill'}.pdf`;
    const pdf = generateInvoicePDF(bill, settings);
    pdf.save(fn);
    return Promise.resolve(pdf);
};

/** Get invoice PDF as blob URL for preview */
export const getInvoicePreviewUrl = (bill, settings) => {
    const pdf = generateInvoicePDF(bill, settings);
    return Promise.resolve(URL.createObjectURL(pdf.output('blob')));
};

/** Get invoice PDF as base64 data URL */
export const getInvoiceDataUrl = (bill, settings) => {
    const pdf = generateInvoicePDF(bill, settings);
    return Promise.resolve(pdf.output('datauristring'));
};

export { numberToWords };

export default {
    generateInvoicePDF,
    downloadInvoicePDF,
    getInvoicePreviewUrl,
    getInvoiceDataUrl,
    numberToWords
};
