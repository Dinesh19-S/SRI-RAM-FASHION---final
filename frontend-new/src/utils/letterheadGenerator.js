import jsPDF from 'jspdf';

/**
 * Generate Sri Ram Fashions Letterhead PDF
 * Converted from Python fpdf implementation
 */
export const generateLetterhead = (content = '') => {
    // Create A4 PDF in portrait mode
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // Page dimensions
    const pageWidth = 210;
    const pageHeight = 297;
    const leftMargin = 10;
    const rightMargin = 200;
    const contentMargin = 15;

    // --- Settings ---
    // Dark Blue Color (RGB: 40, 60, 140)
    const darkBlue = { r: 40, g: 60, b: 140 };

    // --- Row 1: GSTIN and Mobile ---
    pdf.setTextColor(darkBlue.r, darkBlue.g, darkBlue.b);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);

    // GSTIN (Left aligned)
    pdf.text('GSTIN : 33AZRPM4425F2ZA', leftMargin, 10);

    // Mobile (Right aligned)
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    const mobileLines = [
        'Mobile     90805 73831',
        '               94428 07770'
    ];
    let mobileY = 8;
    mobileLines.forEach((line, index) => {
        pdf.text(line, rightMargin, mobileY + (index * 4), { align: 'right' });
    });

    // --- Row 2: Main Title ---
    pdf.setFont('times', 'bolditalic');
    pdf.setFontSize(32);
    pdf.text('Sri Ram Fashions', pageWidth / 2, 25, { align: 'center' });

    // --- Row 3: Addresses and Email ---
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);

    // H.O. Address (Left)
    const hoAddress = [
        'H.O : 81K, Madurai road, Sankarnagar,',
        'Tirunelveli Dist - 627357, Tamilnadu.'
    ];
    let addressY = 32;
    hoAddress.forEach((line, index) => {
        pdf.text(line, leftMargin, addressY + (index * 4));
    });

    // Email (Center)
    pdf.text('Email : sriramfashionstrp@gmail.com', pageWidth / 2, 42, { align: 'center' });

    // B.O. Address (Right)
    const boAddress = [
        'B.O : 61C9, Anupparpalayam puthur,',
        'Tirupur - 641652.'
    ];
    boAddress.forEach((line, index) => {
        pdf.text(line, rightMargin, addressY + (index * 4), { align: 'right' });
    });

    // --- Horizontal Line ---
    pdf.setDrawColor(darkBlue.r, darkBlue.g, darkBlue.b);
    pdf.setLineWidth(0.5);
    pdf.line(leftMargin, 50, rightMargin, 50);

    // --- Date Field ---
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);

    // Get current date
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    pdf.text(`Date : ${dateStr}`, rightMargin, 57, { align: 'right' });

    // --- Content Section ---
    if (content && content.trim()) {
        pdf.setTextColor(0, 0, 0); // Black text for content
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);

        // Calculate available content area
        const contentStartY = 70;
        const contentEndY = pageHeight - 60; // Leave space for footer
        const contentWidth = pageWidth - (contentMargin * 2);

        // Split content into lines that fit the page width
        const lines = pdf.splitTextToSize(content, contentWidth);

        let currentY = contentStartY;
        const lineHeight = 6;

        lines.forEach((line) => {
            // Check if we need a new page
            if (currentY > contentEndY) {
                pdf.addPage();
                currentY = 20;

                // Add light header on continuation pages
                pdf.setTextColor(darkBlue.r, darkBlue.g, darkBlue.b);
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(8);
                pdf.text('Sri Ram Fashions - Continued', pageWidth / 2, 10, { align: 'center' });
                pdf.setDrawColor(darkBlue.r, darkBlue.g, darkBlue.b);
                pdf.setLineWidth(0.3);
                pdf.line(contentMargin, 14, pageWidth - contentMargin, 14);

                currentY = 25;
                pdf.setTextColor(0, 0, 0);
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(11);
            }

            pdf.text(line, contentMargin, currentY);
            currentY += lineHeight;
        });
    }

    // --- Footer Signatures (on last page) ---
    // For Sri Ram Fashions
    pdf.setTextColor(0, 0, 139); // Blue
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('For SRI RAM FASHIONS', rightMargin, pageHeight - 50, { align: 'right' });

    // Proprietor
    pdf.setFontSize(9);
    pdf.text('Proprietor', rightMargin, pageHeight - 30, { align: 'right' });

    return pdf;
};

/**
 * Download the letterhead PDF with optional content
 * @param {string} content - Optional letter content
 * @param {string} filename - Optional custom filename
 */
export const downloadLetterhead = (filename = 'Sri_Ram_Fashions_Letterhead.pdf') => {
    const pdf = generateLetterhead();
    pdf.save(filename);
    return pdf;
};

/**
 * Download the letterhead PDF with content
 * @param {string} content - Letter content to include
 * @param {string} filename - Optional custom filename
 */
export const downloadLetterheadWithContent = (content, filename = 'Sri_Ram_Fashions_Letter.pdf') => {
    const pdf = generateLetterhead(content);
    pdf.save(filename);
    return pdf;
};

/**
 * Get letterhead PDF as blob URL for preview
 * @returns {string} Blob URL
 */
export const getLetterheadPreviewUrl = () => {
    const pdf = generateLetterhead();
    const blob = pdf.output('blob');
    return URL.createObjectURL(blob);
};

/**
 * Get letterhead PDF with content as blob URL for preview
 * @param {string} content - Letter content to include
 * @returns {string} Blob URL
 */
export const getLetterheadPreviewUrlWithContent = (content) => {
    const pdf = generateLetterhead(content);
    const blob = pdf.output('blob');
    return URL.createObjectURL(blob);
};

/**
 * Get letterhead as base64 data URL
 * @returns {string} Data URL
 */
export const getLetterheadDataUrl = () => {
    const pdf = generateLetterhead();
    return pdf.output('datauristring');
};

export default {
    generateLetterhead,
    downloadLetterhead,
    downloadLetterheadWithContent,
    getLetterheadPreviewUrl,
    getLetterheadPreviewUrlWithContent,
    getLetterheadDataUrl
};
