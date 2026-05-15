import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

const toAmount = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

// ==============================
// Main generator
// ==============================

export const generateInvoicePDF = (bill, settings = {}) => {
    // We use points (pt) or mm. The python reportlab code uses points/inches.
    // Let's use points ('pt') to perfectly map reportlab's inch measurements.
    // A4 is 595.28 x 841.89 points
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    
    // Page dimensions in pt
    const PW = 595.28;
    const M = 20; // 20pt margin, matching reportlab
    const W = PW - M * 2; // 555.28 pt

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
    const cgstAmt = toAmount(bill.cgst, isPurchase ? 0 : (taxableAmt * fallbackCgstRate) / 100);
    const sgstAmt = toAmount(bill.sgst, isPurchase ? 0 : (taxableAmt * fallbackSgstRate) / 100);
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

    const titleText = isPurchase ? 'PURCHASE INVOICE' : 'TAX INVOICE';
    
    let currentY = M;

    // Colors mapping from python script
    const NAVY = [0, 0, 128]; // colors.navy
    const RED = [255, 0, 0];  // colors.red
    const BLACK = [0, 0, 0];
    const ORANGE = [255, 165, 0]; // colors.orange

    // ==========================================
    // 1. Header Section
    // ==========================================
    autoTable(pdf, {
        startY: currentY,
        margin: { left: M, right: M },
        body: [[
            companyName.toUpperCase(), 
            '', 
            `GSTIN: ${gstin}`, 
            'RUGGED & URBAN'
        ]],
        theme: 'plain',
        styles: { cellPadding: 2 },
        columnStyles: {
            0: { fontStyle: 'bold', fontSize: 22, textColor: NAVY, cellWidth: 250 },
            1: { cellWidth: 36 }, // 0.5 inch
            2: { fontSize: 8, valign: 'middle', cellWidth: 144 }, // 2 inch
            3: { fontSize: 10, valign: 'middle', cellWidth: 108 } // 1.5 inch
        },
        didDrawPage: function (data) {
            currentY = data.cursor.y;
        }
    });

    // ==========================================
    // 2. Address & Invoice Info Section
    // ==========================================
    const leftAddress = `OFF : ${addr1}\nOFF : ${addr2}\nState : ${state} (Code ${stateCode})\nEmail : ${email}\nMob : ${phone}`;
    
    let rightInfoStr = '';
    if (isPurchase) {
        rightInfoStr = `Bill Number : ${bill.billNumber || ''}\nBill Date : ${fmtDate(bill.date || bill.createdAt)}\nPurchase Inv No : ${purchaseInvoiceNumber}\nTotal Weight : ${totalQuantity}`;
    } else {
        rightInfoStr = `Invoice Number : ${bill.billNumber || ''}\nInvoice Date : ${fmtDate(bill.date || bill.createdAt)}\nFrom : ${bill.fromText || ''}\nTo : ${bill.toText || ''}`;
    }

    autoTable(pdf, {
        startY: currentY + 5,
        margin: { left: M, right: M },
        body: [[leftAddress, rightInfoStr]],
        theme: 'plain',
        styles: { 
            lineWidth: 1, 
            lineColor: BLACK, 
            cellPadding: 6,
            fontSize: 8,
            valign: 'top'
        },
        columnStyles: {
            0: { cellWidth: 324 }, // 4.5 inch
            1: { cellWidth: 216 }  // 3 inch
        },
        didDrawPage: function (data) {
            currentY = data.cursor.y;
        }
    });

    // ==========================================
    // 3. TAX INVOICE Title
    // ==========================================
    currentY += 15;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    pdf.text(titleText, PW / 2, currentY, { align: 'center' });
    currentY += 5;

    // ==========================================
    // 4. Buyer Info Section
    // ==========================================
    const buyerHeading = isPurchase ? 'Supplier Copy' : 'Consignee Copy';
    const primaryLabel = isPurchase ? 'SUPPLIER' : 'BUYER';
    const tertLabel = isPurchase ? 'ADDRESS' : 'TRANSPORT';
    const tertValue = isPurchase ? (bill.customer?.address || '') : (bill.transport || '');
    const btmLabel = isPurchase ? 'INV NO' : 'CODE';
    const btmValue = isPurchase ? purchaseInvoiceNumber : (bill.customer?.stateCode || '33');

    const buyerData = [
        [buyerHeading, ''],
        [`${primaryLabel.padEnd(14, ' ')} : ${bill.customer?.name || ''}`, `MOB            : ${bill.customer?.phone || ''}`],
        [`STATE           : ${bill.customer?.state || 'Tamilnadu'}`, `GSTIN         : ${bill.customer?.gstin || ''}`],
        [`${tertLabel.padEnd(14, ' ')} : ${tertValue}`, `${btmLabel.padEnd(14, ' ')}: ${btmValue}`]
    ];

    autoTable(pdf, {
        startY: currentY + 5,
        margin: { left: M, right: M },
        body: buyerData,
        theme: 'plain',
        styles: {
            lineWidth: 1,
            lineColor: BLACK,
            cellPadding: { top: 2, bottom: 2, left: 4, right: 4 },
            fontSize: 9,
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 324 }, // 4.5 inch
            1: { cellWidth: 216 }  // 3 inch
        },
        didParseCell: function(data) {
            if (data.row.index === 0) {
                data.cell.styles.fontSize = 8;
                data.cell.styles.fontStyle = 'normal';
                data.cell.styles.lineWidth = { top: 1, right: 0, bottom: 0, left: 1 };
                if (data.column.index === 1) data.cell.styles.lineWidth = { top: 1, right: 1, bottom: 0, left: 0 };
            } else {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.lineWidth = { top: 0, right: 0, bottom: 0, left: 1 };
                if (data.column.index === 1) data.cell.styles.lineWidth = { top: 0, right: 1, bottom: 0, left: 0 };
                // Add bottom border to last row
                if (data.row.index === buyerData.length - 1) {
                    data.cell.styles.lineWidth.bottom = 1;
                    data.cell.styles.cellPadding.bottom = 6;
                }
            }
        },
        didDrawPage: function (data) {
            currentY = data.cursor.y;
        }
    });

    // ==========================================
    // 5. Main Table
    // ==========================================
    const mainTableHeaders = isPurchase 
        ? ["S.No", "Particulars", "Design / Color", "HSN Code", "Rate / KG", "Weight (KG)", "Amount Rs."]
        : ["S.No", "Product Description", "Sizes / Pieces", "HSN Code", "Rate Per Piece", "No Of Packs", "Amount Rs."];

    const mainTableBody = items.map((item, index) => {
        if (isPurchase) {
            return [
                index + 1,
                item.productName || item.name || '',
                item.sizesOrPieces || item.designColor || '',
                item.hsnCode || item.hsn || '',
                toAmount(item.ratePerKg, toAmount(item.price)).toFixed(2),
                toAmount(item.weightKg, toAmount(item.quantity)).toFixed(2),
                toAmount(item.total, toAmount(item.weightKg, toAmount(item.quantity)) * toAmount(item.ratePerKg, toAmount(item.price))).toFixed(2)
            ];
        } else {
            return [
                index + 1,
                item.productName || item.name || '',
                item.sizesOrPieces || '',
                item.hsnCode || item.hsn || '',
                toAmount(item.ratePerPack, toAmount(item.price)).toFixed(2), // Actually Rate Per Pack / Rate Per Piece mapping varies
                item.noOfPacks || item.quantity || 0,
                toAmount(item.total, toAmount(item.ratePerPack, toAmount(item.price)) * toAmount(item.noOfPacks, toAmount(item.quantity))).toFixed(2)
            ];
        }
    });

    const quantityLbl = isPurchase ? "Total Weight :" : "Total Pcs :";
    
    // Add Total Row at the bottom
    mainTableBody.push([
        "", "", quantityLbl, "", "", "", "" // We'll inject the red number via didDrawCell
    ]);

    autoTable(pdf, {
        startY: currentY,
        margin: { left: M, right: M },
        head: [mainTableHeaders],
        body: mainTableBody,
        theme: 'grid',
        headStyles: {
            fillColor: [245, 245, 245], // whitesmoke
            textColor: BLACK,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            fontSize: 9,
            lineWidth: 0.5,
            lineColor: BLACK
        },
        bodyStyles: {
            textColor: BLACK,
            halign: 'center',
            valign: 'middle',
            fontSize: 8,
            lineWidth: 0.5,
            lineColor: BLACK
        },
        columnStyles: {
            0: { cellWidth: 34.7 },
            1: { cellWidth: 152.7, halign: 'left' },
            2: { cellWidth: 124.9 },
            3: { cellWidth: 55.5 },
            4: { cellWidth: 69.4 },
            5: { cellWidth: 55.5 },
            6: { cellWidth: 62.4 }
        },
        didParseCell: function (data) {
            // Remove bottom border from last row so it doesn't close out if we don't want to,
            // but the python code had the last row enclosed.
            if (data.section === 'body' && data.row.index === mainTableBody.length - 1) {
                // The Total Pcs row
                data.cell.styles.fontStyle = 'bold';
                if (data.column.index === 2) {
                    data.cell.styles.halign = 'right';
                }
            }
        },
        didDrawCell: function (data) {
            // Draw the red Total Pcs text in the 4th column (index 3) manually for color styling
            if (data.section === 'body' && data.row.index === mainTableBody.length - 1 && data.column.index === 3) {
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(12);
                pdf.setTextColor(RED[0], RED[1], RED[2]);
                // Center text
                const text = `${totalQuantity}`;
                const textWidth = pdf.getStringUnitWidth(text) * 12 / pdf.internal.scaleFactor;
                const textX = data.cell.x + (data.cell.width / 2) - (textWidth / 2);
                const textY = data.cell.y + (data.cell.height / 2) + 4;
                pdf.text(text, textX, textY);
            }
        },
        didDrawPage: function (data) {
            currentY = data.cursor.y;
        }
    });

    // ==========================================
    // 6. Summary Table
    // ==========================================
    const totalPacksLabel = isPurchase ? "Total Weight" : "Total Packs";
    const amountWords = `Rupees ${numberToWords(totalAmt)} Only`;
    
    // We will draw the 3 columns using manual autoTables to simulate the nested Tables in python,
    // or draw 3 side-by-side autoTables.
    const summaryColW = W / 3; // 555.28 / 3 = 185.09
    
    let sumStartY = currentY;
    let sumMaxY = currentY;

    // Col 1 (Left)
    autoTable(pdf, {
        startY: sumStartY,
        margin: { left: M, right: M + summaryColW * 2 },
        body: [
            [`${totalPacksLabel}  : ${totalQuantity}`],
            [`Bill Amount  : ${totalAmt.toFixed(2)}`],
            [`In words     : ${amountWords}`]
        ],
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 4, lineColor: BLACK, lineWidth: { top: 1, left: 1, bottom: 1, right: 1 } },
        didParseCell: function(data) {
            if (data.row.index === 2) data.cell.styles.fontStyle = 'normal';
            else data.cell.styles.fontStyle = 'bold';
            
            // Manage borders to mimic single box
            if (data.row.index > 0) data.cell.styles.lineWidth = { left: 1, right: 1, top: 0, bottom: 0 };
            if (data.row.index === 2) data.cell.styles.lineWidth.bottom = 1;
        },
        didDrawPage: function(data) { sumMaxY = Math.max(sumMaxY, data.cursor.y); }
    });

    // Col 2 (Middle)
    autoTable(pdf, {
        startY: sumStartY,
        margin: { left: M + summaryColW, right: M + summaryColW },
        body: [
            [`NUM OF BUNDLES : ${numBundles}`],
            ['TOTAL_GST_PLACEHOLDER'] // We'll manually draw the red box
        ],
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 4, fontStyle: 'bold', lineColor: BLACK, lineWidth: { top: 1, left: 0, bottom: 1, right: 1 } },
        didParseCell: function(data) {
            // Remove borders between rows
            if (data.row.index > 0) data.cell.styles.lineWidth = { left: 0, right: 1, top: 0, bottom: 0 };
            if (data.row.index === 1) data.cell.styles.lineWidth.bottom = 1;
            data.cell.styles.cellPadding = 6;
        },
        didDrawCell: function(data) {
            if (data.row.index === 1 && data.column.index === 0) {
                // Manually draw the red GST box
                const bx = data.cell.x + 10;
                const by = data.cell.y + 2;
                const bw = data.cell.width - 20;
                const bh = 18;
                pdf.setDrawColor(RED[0], RED[1], RED[2]);
                pdf.setLineWidth(1);
                pdf.rect(bx, by, bw, bh, 'S');
                
                pdf.setTextColor(RED[0], RED[1], RED[2]);
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(9);
                pdf.text(`TOTAL GST ${totalGst.toFixed(0)}`, bx + bw/2, by + bh/2 + 3, { align: 'center' });
            }
        },
        didDrawPage: function(data) { sumMaxY = Math.max(sumMaxY, data.cursor.y); }
    });

    // Col 3 (Right)
    const taxRows = igstAmt > 0
        ? [
            ["Product Amt", productAmt.toFixed(2)],
            ["Discount", discount.toFixed(2)],
            ["Taxable Amt", taxableAmt.toFixed(2)],
            [`IGST @ ${(igstAmt > 0 && taxableAmt > 0 ? (igstAmt * 100 / taxableAmt) : 0).toFixed(2).replace(/\.00$/, '')}%`, igstAmt.toFixed(2)],
            ["Round Off", roundOff.toFixed(2)],
            ["Total Amt", totalAmt.toFixed(2)]
        ]
        : [
            ["Product Amt", productAmt.toFixed(2)],
            ["Discount", discount.toFixed(2)],
            ["Taxable Amt", taxableAmt.toFixed(2)],
            [`CGST @ ${cgstRate.toFixed(2).replace(/\.00$/, '')}%`, cgstAmt.toFixed(2)],
            [`SGST @ ${sgstRate.toFixed(2).replace(/\.00$/, '')}%`, sgstAmt.toFixed(2)],
            ["Round Off", roundOff.toFixed(2)],
            ["Total Amt", totalAmt.toFixed(2)]
        ];

    autoTable(pdf, {
        startY: sumStartY,
        margin: { left: M + summaryColW * 2, right: M },
        body: taxRows,
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 2, lineColor: BLACK, lineWidth: { top: 1, left: 0, bottom: 1, right: 1 } },
        columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'right' }
        },
        didParseCell: function(data) {
            // Manage borders inside the box
            data.cell.styles.lineWidth = { left: 0, right: 0, top: 0, bottom: 0 };
            if (data.column.index === 1) data.cell.styles.lineWidth.right = 1; // outer right border
            
            // Last row has a top border
            if (data.row.index === taxRows.length - 1) {
                data.cell.styles.lineWidth.top = 1;
                data.cell.styles.lineWidth.bottom = 1;
                data.cell.styles.fontStyle = 'bold';
            }
            // GST rows get red text
            if (data.row.raw[0].includes('GST')) {
                data.cell.styles.textColor = RED;
                data.cell.styles.fontStyle = 'bold';
            }
            
            // Fix corners of box
            if (data.row.index === 0) data.cell.styles.lineWidth.top = 1;
        },
        didDrawPage: function(data) { sumMaxY = Math.max(sumMaxY, data.cursor.y); }
    });

    currentY = sumMaxY;

    // ==========================================
    // 7. Terms & Bank & Signatures (Footer)
    // ==========================================
    const footerW1 = 288; // 4 inch
    const footerW2 = 252; // 3.5 inch (Total 540 pt)
    
    const termsHtml = `Terms And Conditions\n1. Subject to Tirupur Jurisdiction.\n2. Payment by Cheque/DD only, payable at Tirupur.\n3. Cheques made in favour of SRI RAM FASHIONS to be sent to Tirunelveli Address\n4. All disputes are subjected to Tirunelveli Jurisdiction.`;
    const signHtml = `Certified that above particulars are true and correct\n\nFor SRI RAM FASHIONS\n\n\n\nAuthorized Signature`;

    // Footer Table
    autoTable(pdf, {
        startY: currentY,
        margin: { left: M, right: M },
        body: [[termsHtml, signHtml]],
        theme: 'plain',
        styles: { fontSize: 8, lineColor: BLACK, lineWidth: 1, cellPadding: 6, valign: 'top' },
        columnStyles: {
            0: { cellWidth: footerW1 },
            1: { cellWidth: footerW2, halign: 'center' }
        },
        didParseCell: function(data) {
            if (data.column.index === 0) {
                data.cell.styles.fontStyle = 'bold';
            } else {
                data.cell.styles.fontStyle = 'italic';
            }
        },
        didDrawPage: function (data) {
            currentY = data.cursor.y;
        }
    });

    // Bank Details Box - Positioned overlaid on the left side of the footer, similar to the python code behavior 
    // "Spacer(1, -60) -> manual positioning"
    const bankBoxY = currentY - 60; // Upwards overlap
    
    autoTable(pdf, {
        startY: bankBoxY,
        margin: { left: M + 5, right: M + footerW2 + 10 }, // Fits inside left column
        body: [[`Bank Details:\nACC NAME : ${bankAccName}\nBANK : ${bankName}\nACC NUM : ${bankAcc}\nBRANCH : ${bankBranch}    |    IFSC : ${bankIfsc}`]],
        theme: 'plain',
        styles: { fontSize: 8, lineColor: ORANGE, lineWidth: 1, cellPadding: 4, fillColor: [255, 251, 230] },
        didParseCell: function(data) {
            data.cell.styles.fontStyle = 'bold';
        }
    });

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
