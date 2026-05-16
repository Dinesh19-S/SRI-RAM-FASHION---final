import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Export table data to Excel (CSV format) - Legacy/fallback
 */
export const exportToExcel = (data, filename = 'report', headers = null) => {
    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }

    const actualHeaders = headers || Object.keys(data[0]);
    let csvContent = '';
    csvContent += actualHeaders.join(',') + '\n';

    data.forEach(row => {
        const values = actualHeaders.map(header => {
            const value = row[header] !== undefined ? row[header] : '';
            const escaped = String(value).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvContent += values.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Export data as a properly formatted Excel (.xlsx) file with styled header, columns, and totals
 * Uses ExcelJS for full cell styling support (bold, alignment, borders, colors)
 *
 * @param {Object} options
 * @param {string} options.title - Report title (e.g. "Purchase Report")
 * @param {string} options.businessName - Business name for header (default: "Sri Ram Fashions")
 * @param {string} options.fromDate - Start date string
 * @param {string} options.toDate - End date string
 * @param {Array} options.columns - Array of { key, header, width?, align? }
 * @param {Array} options.data - Array of row objects
 * @param {Object} options.totals - Optional totals object { key: value }
 * @param {string} options.filename - Output filename (without extension)
 * @param {string} options.sheetName - Sheet tab name
 */
export const exportToExcelStyled = async ({
    title = 'Report',
    businessName = 'Sri Ram Fashions',
    fromDate = '',
    toDate = '',
    columns = [],
    data = [],
    totals = null,
    summary = null,
    filename = 'report',
    sheetName = 'Report'
}) => {
    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }

    const numCols = columns.length;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Sri Ram Fashions';
    wb.created = new Date();

    const ws = wb.addWorksheet(sheetName, {
        pageSetup: { orientation: 'landscape', fitToPage: true }
    });

    // Set column widths
    ws.columns = columns.map(col => ({
        width: col.width || 15
    }));

    // === Row 1: Business Name (merged, centered, bold, large) ===
    const row1 = ws.addRow([businessName]);
    ws.mergeCells(1, 1, 1, numCols);
    const cell1 = row1.getCell(1);
    cell1.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1a1a1a' } };
    cell1.alignment = { horizontal: 'center', vertical: 'middle' };
    row1.height = 30;

    // === Row 2: Report Title (merged, centered, bold) ===
    const row2 = ws.addRow([title]);
    ws.mergeCells(2, 1, 2, numCols);
    const cell2 = row2.getCell(1);
    cell2.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF333333' } };
    cell2.alignment = { horizontal: 'center', vertical: 'middle' };
    row2.height = 22;

    // === Row 3: Date Range (merged, centered, gray) ===
    const dateText = fromDate || toDate
        ? `From: ${fromDate || 'N/A'}  |  To: ${toDate || 'N/A'}`
        : '';
    if (dateText) {
        const row3 = ws.addRow([dateText]);
        ws.mergeCells(3, 1, 3, numCols);
        const cell3 = row3.getCell(1);
        cell3.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF666666' } };
        cell3.alignment = { horizontal: 'center', vertical: 'middle' };
        row3.height = 20;
    }

    // === Row 4: Empty spacer ===
    ws.addRow([]);

    // === Row 5: Column Headers ===
    const headerValues = columns.map(col => col.header);
    const headerRow = ws.addRow(headerValues);
    headerRow.height = 24;

    headerRow.eachCell((cell, colIdx) => {
        const col = columns[colIdx - 1];
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: col.align === 'right' ? 'right' : 'left', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FF1e40af' } },
            left: { style: 'thin', color: { argb: 'FF1e40af' } },
            bottom: { style: 'medium', color: { argb: 'FFFFFFFF' } },
            right: { style: 'thin', color: { argb: 'FF1e40af' } }
        };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1e40af' } // Indigo-600
        };
    });

    // === Data Rows ===
    data.forEach(rowData => {
        const values = columns.map(col => {
            const val = rowData[col.key];
            if (val === undefined || val === null) return '';
            return val;
        });
        const row = ws.addRow(values);

        row.eachCell((cell, colIdx) => {
            const col = columns[colIdx - 1];
            cell.font = { name: 'Calibri', size: 11 };
            cell.alignment = { horizontal: col.align === 'right' ? 'right' : 'left', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
            };

            // Format numbers
            if (col.align === 'right' && typeof cell.value === 'number') {
                cell.numFmt = '#,##0.00';
            }
        });
    });

    // === Totals Row ===
    if (totals) {
        const totalsValues = columns.map((col, idx) => {
            if (idx === 0) return 'TOTAL';
            if (totals[col.key] !== undefined) return totals[col.key];
            return '';
        });
        const totalsRow = ws.addRow(totalsValues);

        totalsRow.eachCell((cell, colIdx) => {
            const col = columns[colIdx - 1];
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF111827' } };
            cell.alignment = { horizontal: col.align === 'right' ? 'right' : 'left', vertical: 'middle' };
            cell.border = {
                top: { style: 'medium', color: { argb: 'FF374151' } },
                bottom: { style: 'double', color: { argb: 'FF374151' } }
            };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF9FAFB' }
            };

            if (col.align === 'right' && typeof cell.value === 'number') {
                cell.numFmt = '#,##0.00';
            }
        });
    }

    // === Summary Table (for GST Filing) ===
    if (summary && summary.length > 0) {
        ws.addRow([]);
        ws.addRow([]);
        ws.addRow([]);
        
        // Summary Title with distinctive styling
        const sTitle = ws.addRow(['GST FILING & FINANCIAL SUMMARY']);
        ws.mergeCells(sTitle.number, 1, sTitle.number, 4);
        sTitle.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
        sTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } }; // Dark Slate
        sTitle.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        sTitle.height = 30;

        // Summary Table Headers
        const sHeader = ws.addRow(['Particulars', '', '', 'Amount (INR)']);
        ws.mergeCells(sHeader.number, 1, sHeader.number, 3);
        sHeader.height = 24;
        sHeader.eachCell((cell) => {
            cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }; // Indigo-600
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF111827' } },
                bottom: { style: 'thin', color: { argb: 'FF111827' } }
            };
        });

        // Summary Rows
        summary.forEach((item, idx) => {
            const row = ws.addRow([item.label, '', '', item.value]);
            ws.mergeCells(row.number, 1, row.number, 3);
            row.height = 22;
            
            const labelCell = row.getCell(1);
            const valueCell = row.getCell(4);

            const isLast = idx === summary.length - 1;

            labelCell.font = { bold: true, size: 11, color: { argb: isLast ? 'FF1e40af' : 'FF374151' } };
            valueCell.font = { bold: true, size: isLast ? 13 : 11, color: { argb: isLast ? 'FF1e40af' : 'FF111827' } };
            valueCell.alignment = { horizontal: 'right', vertical: 'middle' };

            if (item.isCurrency && typeof item.value === 'number') {
                valueCell.numFmt = '₹ #,##0.00';
            } else if (typeof item.value === 'number') {
                valueCell.numFmt = '#,##0';
            }

            // Zebra striping and borders
            const bgColor = idx % 2 === 0 ? 'FFF9FAFB' : 'FFFFFFFF';
            row.eachCell((cell, colIdx) => {
                if (colIdx <= 4) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isLast ? 'FFEFF6FF' : bgColor } };
                    cell.border = {
                        left: colIdx === 1 ? { style: 'medium', color: { argb: 'FFD1D5DB' } } : undefined,
                        right: colIdx === 4 ? { style: 'medium', color: { argb: 'FFD1D5DB' } } : undefined,
                        bottom: isLast ? { style: 'medium', color: { argb: 'FF1e40af' } } : { style: 'thin', color: { argb: 'FFD1D5DB' } }
                    };
                }
            });
        });
    }

    // Generate and download
    const buffer = await wb.xlsx.writeBuffer();
    const dateStr = new Date().toISOString().split('T')[0];
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${filename}_${dateStr}.xlsx`);
};
