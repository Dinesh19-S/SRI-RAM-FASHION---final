import { jsPDF } from 'jspdf';

const BLUE = { r: 26, g: 61, b: 124 };
const BLACK = { r: 0, g: 0, b: 0 };
const GRAY = { r: 100, g: 100, b: 100 };

export const generateBackupPDF = (backupData, settings = {}) => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const companyName = settings?.company?.name || 'SRI RAM FASHIONS';
    const timestamp = new Date().toLocaleString();

    let y = 15;
    const margin = 15;
    const pageWidth = pdf.internal.pageSize.width;
    const contentWidth = pageWidth - (margin * 2);

    // Title Page
    pdf.setFontSize(22);
    pdf.setTextColor(BLUE.r, BLUE.g, BLUE.b);
    pdf.setFont('helvetica', 'bold');
    pdf.text(companyName, pageWidth / 2, y, { align: 'center' });
    
    y += 10;
    pdf.setFontSize(16);
    pdf.setTextColor(BLACK.r, BLACK.g, BLACK.b);
    pdf.text('Data Backup Summary Report', pageWidth / 2, y, { align: 'center' });
    
    y += 10;
    pdf.setFontSize(10);
    pdf.setTextColor(GRAY.r, GRAY.g, GRAY.b);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated on: ${timestamp}`, pageWidth / 2, y, { align: 'center' });

    y += 15;
    pdf.setDrawColor(BLUE.r, BLUE.g, BLUE.b);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Table of Contents / Summary
    pdf.setFontSize(12);
    pdf.setTextColor(BLACK.r, BLACK.g, BLACK.b);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Database Statistics:', margin, y);
    y += 8;

    const collections = Object.keys(backupData);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    collections.forEach(col => {
        const count = backupData[col]?.length || 0;
        pdf.text(`• ${col.charAt(0).toUpperCase() + col.slice(1)}: ${count} records`, margin + 5, y);
        y += 6;
    });

    y += 10;

    // Detailed Sections
    const addSection = (title, data, columns) => {
        // Check for page break
        if (y > 250) {
            pdf.addPage();
            y = 15;
        }

        pdf.setFontSize(14);
        pdf.setTextColor(BLUE.r, BLUE.g, BLUE.b);
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, margin, y);
        y += 6;
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 8;

        if (!data || data.length === 0) {
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'italic');
            pdf.setTextColor(GRAY.r, GRAY.g, GRAY.b);
            pdf.text('No records found.', margin, y);
            y += 10;
            return;
        }

        // Draw Table Header
        pdf.setFillColor(240, 240, 240);
        pdf.rect(margin, y - 5, contentWidth, 7, 'F');
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(BLACK.r, BLACK.g, BLACK.b);
        
        let x = margin + 2;
        columns.forEach(col => {
            pdf.text(col.header, x, y);
            x += (contentWidth * col.width);
        });
        
        y += 7;

        // Draw Rows
        pdf.setFont('helvetica', 'normal');
        data.forEach((row, i) => {
            if (y > 275) {
                pdf.addPage();
                y = 20;
                // Redraw header on new page
                pdf.setFillColor(240, 240, 240);
                pdf.rect(margin, y - 5, contentWidth, 7, 'F');
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'bold');
                let hx = margin + 2;
                columns.forEach(col => {
                    pdf.text(col.header, hx, y);
                    hx += (contentWidth * col.width);
                });
                y += 7;
                pdf.setFont('helvetica', 'normal');
            }

            let rx = margin + 2;
            columns.forEach(col => {
                const val = col.key.split('.').reduce((obj, key) => obj?.[key], row) || '';
                const text = String(val).substring(0, 40);
                pdf.text(text, rx, y);
                rx += (contentWidth * col.width);
            });
            
            y += 6;
            pdf.setDrawColor(245, 245, 245);
            pdf.line(margin, y - 1, pageWidth - margin, y - 1);
        });

        y += 10;
    };

    // Add sections for key collections
    if (backupData.product) {
        addSection('Products', backupData.product, [
            { header: 'Name', key: 'name', width: 0.4 },
            { header: 'SKU', key: 'sku', width: 0.2 },
            { header: 'Price', key: 'sellingPrice', width: 0.15 },
            { header: 'Stock', key: 'stock', width: 0.15 },
            { header: 'Unit', key: 'unit', width: 0.1 }
        ]);
    }

    if (backupData.customer) {
        addSection('Customers', backupData.customer, [
            { header: 'Name', key: 'name', width: 0.35 },
            { header: 'Phone', key: 'phone', width: 0.25 },
            { header: 'Email', key: 'email', width: 0.4 }
        ]);
    }

    if (backupData.bill) {
        addSection('Sales Bills (Recent)', backupData.bill.slice(0, 50), [
            { header: 'Bill #', key: 'billNumber', width: 0.2 },
            { header: 'Date', key: 'date', width: 0.25 },
            { header: 'Customer', key: 'customer.name', width: 0.3 },
            { header: 'Total', key: 'grandTotal', width: 0.25 }
        ]);
    }

    if (backupData.supplier) {
        addSection('Suppliers', backupData.supplier, [
            { header: 'Name', key: 'name', width: 0.35 },
            { header: 'Phone', key: 'mobile', width: 0.25 },
            { header: 'GSTIN', key: 'gstin', width: 0.4 }
        ]);
    }

    return pdf;
};

export const downloadBackupPDF = (backupData, settings, filename) => {
    const fn = filename || `SRI_RAM_FASHIONS_Data_Backup_${new Date().toISOString().split('T')[0]}.pdf`;
    const pdf = generateBackupPDF(backupData, settings);
    pdf.save(fn);
};
