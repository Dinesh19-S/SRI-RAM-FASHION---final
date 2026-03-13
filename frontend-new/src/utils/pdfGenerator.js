import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generate PDF from a bill template HTML element
 * @param {HTMLElement} element - The bill template DOM element
 * @param {string} filename - The filename for the PDF
 * @returns {Promise<void>}
 */
export const generateBillPDF = async (element, filename = 'bill.pdf') => {
    if (!element) {
        console.error('No element provided for PDF generation');
        return;
    }

    try {
        // Create canvas from the element
        const canvas = await html2canvas(element, {
            scale: 2, // Higher resolution
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: element.scrollWidth,
            height: element.scrollHeight
        });

        // A4 dimensions in mm
        const a4Width = 210;
        const a4Height = 297;

        // Create PDF
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Calculate image dimensions to fit A4
        const imgWidth = a4Width;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // If the content is taller than A4, scale it down
        let finalWidth = imgWidth;
        let finalHeight = imgHeight;

        if (imgHeight > a4Height) {
            const ratio = a4Height / imgHeight;
            finalWidth = imgWidth * ratio;
            finalHeight = a4Height;
        }

        // Center the content horizontally
        const xOffset = (a4Width - finalWidth) / 2;
        const yOffset = 0;

        // Add image to PDF
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);

        // Download the PDF
        pdf.save(filename);

        return pdf;
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};

/**
 * Generate a bill PDF with a specific bill number as filename
 * @param {HTMLElement} element - The bill template DOM element
 * @param {string} billNumber - The bill number to use in filename
 * @returns {Promise<void>}
 */
export const downloadBillPDF = async (element, billNumber) => {
    const filename = `SRI_RAM_FASHIONS_Invoice_${billNumber || 'bill'}.pdf`;
    return generateBillPDF(element, filename);
};

/**
 * Print the bill using browser print dialog
 * @param {HTMLElement} element - The bill template DOM element
 */
export const printBill = (element) => {
    if (!element) {
        console.error('No element provided for printing');
        return;
    }

    // Create a new window for printing
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
        console.error('Could not open print window');
        return;
    }

    // Copy styles and content
    const styles = Array.from(document.styleSheets)
        .map(styleSheet => {
            try {
                return Array.from(styleSheet.cssRules)
                    .map(rule => rule.cssText)
                    .join('\n');
            } catch (e) {
                return '';
            }
        })
        .join('\n');

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print Bill</title>
            <style>
                ${styles}
                @page {
                    size: A4;
                    margin: 0;
                }
                body {
                    margin: 0;
                    padding: 0;
                }
                .bill-template {
                    width: 210mm;
                    min-height: 297mm;
                    padding: 5mm;
                    margin: 0;
                    box-sizing: border-box;
                }
            </style>
        </head>
        <body>
            ${element.outerHTML}
        </body>
        </html>
    `);

    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
    };
};

export default {
    generateBillPDF,
    downloadBillPDF,
    printBill
};
