import { jsPDF } from 'jspdf';

const BLUE_NAVY = { r: 30, g: 58, b: 138 };
const BLUE_ACCENT = { r: 30, g: 64, b: 175 };
const BLACK = { r: 15, g: 23, b: 42 };
const GRAY_TEXT = { r: 71, g: 85, b: 105 };
const GRAY_BORDER = { r: 226, g: 232, b: 240 };
const BG_STRIPE = { r: 248, g: 250, b: 252 };

export const generateBackupPDF = (backupData, settings = {}) => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const companyName = settings?.company?.name || 'SRI RAM FASHIONS';
    const timestamp = new Date().toLocaleString('en-IN');

    let y = 20;
    const margin = 15;
    const pageWidth = pdf.internal.pageSize.width;
    const contentWidth = pageWidth - (margin * 2);

    // Header Design
    pdf.setFillColor(BLUE_NAVY.r, BLUE_NAVY.g, BLUE_NAVY.b);
    pdf.rect(0, 0, pageWidth, 40, 'F');

    pdf.setFontSize(24);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text(companyName.toUpperCase(), pageWidth / 2, 18, { align: 'center', charSpace: 1.5 });
    
    pdf.setFontSize(11);
    pdf.setTextColor(200, 200, 200);
    pdf.setFont('helvetica', 'normal');
    pdf.text('PROFESSIONAL DATA BACKUP REPORT', pageWidth / 2, 26, { align: 'center', charSpace: 1 });
    
    pdf.setFontSize(9);
    pdf.text(`Security Level: High | Generated on: ${timestamp}`, pageWidth / 2, 33, { align: 'center' });

    y = 55;

    // Database Statistics Section
    pdf.setFontSize(14);
    pdf.setTextColor(BLUE_NAVY.r, BLUE_NAVY.g, BLUE_NAVY.b);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DATABASE STATISTICS', margin, y);
    y += 4;
    pdf.setDrawColor(BLUE_NAVY.r, BLUE_NAVY.g, BLUE_NAVY.b);
    pdf.setLineWidth(0.8);
    pdf.line(margin, y, margin + 40, y);
    y += 12;

    const collections = Object.keys(backupData);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(BLACK.r, BLACK.g, BLACK.b);
    
    // Draw cards for stats
    const colWidth = contentWidth / 3;
    let cardX = margin;
    let cardY = y;

    collections.forEach((col, idx) => {
        if (idx > 0 && idx % 3 === 0) {
            cardX = margin;
            cardY += 20;
        }
        
        pdf.setDrawColor(GRAY_BORDER.r, GRAY_BORDER.g, GRAY_BORDER.b);
        pdf.setLineWidth(0.2);
        pdf.rect(cardX, cardY, colWidth - 5, 15, 'S');
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(GRAY_TEXT.r, GRAY_TEXT.g, GRAY_TEXT.b);
        pdf.text(col.toUpperCase(), cardX + 3, cardY + 5);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(BLUE_ACCENT.r, BLUE_ACCENT.g, BLUE_ACCENT.b);
        pdf.text(`${backupData[col]?.length || 0} RECORDS`, cardX + 3, cardY + 11);
        
        cardX += colWidth;
    });

    y = cardY + 30;

    // Detailed Sections
    const addSection = (title, data, columns) => {
        if (y > 240) {
            pdf.addPage();
            y = 20;
        }

        pdf.setFontSize(14);
        pdf.setTextColor(BLUE_NAVY.r, BLUE_NAVY.g, BLUE_NAVY.b);
        pdf.setFont('helvetica', 'bold');
        pdf.text(title.toUpperCase(), margin, y);
        y += 3;
        pdf.setDrawColor(BLUE_ACCENT.r, BLUE_ACCENT.g, BLUE_ACCENT.b);
        pdf.setLineWidth(0.5);
        pdf.line(margin, y, margin + 20, y);
        y += 8;

        if (!data || data.length === 0) {
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'italic');
            pdf.setTextColor(GRAY_TEXT.r, GRAY_TEXT.g, GRAY_TEXT.b);
            pdf.text('No records found for this vault section.', margin, y);
            y += 15;
            return;
        }

        // Table Header
        pdf.setFillColor(BLUE_ACCENT.r, BLUE_ACCENT.g, BLUE_ACCENT.b);
        pdf.rect(margin, y, contentWidth, 9, 'F');
        pdf.setFontSize(8.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        
        let x = margin + 3;
        columns.forEach(col => {
            pdf.text(col.header.toUpperCase(), x, y + 6);
            x += (contentWidth * col.width);
        });
        
        y += 9;

        // Table Rows
        data.forEach((row, i) => {
            if (y > 275) {
                pdf.addPage();
                y = 20;
                // Redraw header
                pdf.setFillColor(BLUE_ACCENT.r, BLUE_ACCENT.g, BLUE_ACCENT.b);
                pdf.rect(margin, y, contentWidth, 9, 'F');
                pdf.setFontSize(8.5);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(255, 255, 255);
                let hx = margin + 3;
                columns.forEach(col => {
                    pdf.text(col.header.toUpperCase(), hx, y + 6);
                    hx += (contentWidth * col.width);
                });
                y += 9;
            }

            // Zebra striping
            if (i % 2 === 1) {
                pdf.setFillColor(BG_STRIPE.r, BG_STRIPE.g, BG_STRIPE.b);
                pdf.rect(margin, y, contentWidth, 8, 'F');
            }

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(BLACK.r, BLACK.g, BLACK.b);

            let rx = margin + 3;
            columns.forEach(col => {
                const val = col.key.split('.').reduce((obj, key) => obj?.[key], row) || '';
                const text = String(val).substring(0, 50);
                pdf.text(text, rx, y + 5.5);
                rx += (contentWidth * col.width);
            });
            
            y += 8;
            pdf.setDrawColor(GRAY_BORDER.r, GRAY_BORDER.g, GRAY_BORDER.b);
            pdf.setLineWidth(0.1);
            pdf.line(margin, y, margin + contentWidth, y);
        });

        y += 15;
    };

    // Add sections
    if (backupData.product) {
        addSection('Inventory (Products)', backupData.product, [
            { header: 'Item Name', key: 'name', width: 0.4 },
            { header: 'HSN/SKU', key: 'hsn', width: 0.2 },
            { header: 'Rate', key: 'sellingPrice', width: 0.15 },
            { header: 'Stock', key: 'stock', width: 0.15 },
            { header: 'Unit', key: 'unit', width: 0.1 }
        ]);
    }

    if (backupData.customer) {
        addSection('Directory (Customers)', backupData.customer, [
            { header: 'Customer Name', key: 'name', width: 0.35 },
            { header: 'Contact No', key: 'phone', width: 0.25 },
            { header: 'GSTIN / TIN', key: 'gstin', width: 0.4 }
        ]);
    }

    if (backupData.bill) {
        addSection('History (Sales)', backupData.bill.slice(0, 100), [
            { header: 'Bill #', key: 'billNumber', width: 0.15 },
            { header: 'Date', key: 'date', width: 0.2 },
            { header: 'Party Name', key: 'customer.name', width: 0.4 },
            { header: 'Grand Total', key: 'grandTotal', width: 0.25 }
        ]);
    }

    if (backupData.supplier) {
        addSection('Vendors (Suppliers)', backupData.supplier, [
            { header: 'Supplier Name', key: 'name', width: 0.35 },
            { header: 'Mobile', key: 'mobile', width: 0.25 },
            { header: 'GSTIN', key: 'gstin', width: 0.4 }
        ]);
    }

    // Page numbers
    const totalPages = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(GRAY_TEXT.r, GRAY_TEXT.g, GRAY_TEXT.b);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pdf.internal.pageSize.height - 10, { align: 'right' });
        pdf.text(`SRI RAM FASHIONS Vault Security Report • Confidential`, margin, pdf.internal.pageSize.height - 10);
    }

    return pdf;
};


export const downloadBackupPDF = (backupData, settings, filename) => {
    const fn = filename || `SRI_RAM_FASHIONS_Data_Backup_${new Date().toISOString().split('T')[0]}.pdf`;
    const pdf = generateBackupPDF(backupData, settings);
    pdf.save(fn);
};
