/**
 * Trigger browser print dialog for a specific report element
 * Generates A4-sized, professionally styled print layout
 * @param {string} elementId - ID of element to print (prints whole page if not provided)
 */
export const printReport = (elementId = null) => {
    if (elementId) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`Element with ID "${elementId}" not found`);
            return;
        }

        // Create a new print window
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) {
            // Popup blocked - fall back to window.print()
            window.print();
            return;
        }

        // Collect all stylesheet link tags from the current document
        const linkTags = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .map(link => link.outerHTML)
            .join('\n');

        // Also collect inline <style> tags
        const styleTags = Array.from(document.querySelectorAll('style'))
            .map(style => style.outerHTML)
            .join('\n');

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Print Report</title>
    ${linkTags}
    ${styleTags}
    <style>
        /* ===== A4 Page Setup ===== */
        @page {
            size: A4;
            margin: 12mm 10mm;
        }

        @media print {
            html, body {
                width: 210mm;
                min-height: 297mm;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            background: white;
            padding: 10mm;
            margin: 0 auto;
            width: 210mm;
            font-family: 'Segoe UI', 'Manrope', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 11px;
            line-height: 1.5;
            color: #111;
        }

        /* Hide interactive elements */
        button, .btn, .no-print, input, select { display: none !important; }

        /* ===== Table Styling: full-width A4 ===== */
        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 10.5px;
            border: 1px solid #d1d5db;
            margin-top: 8px;
        }

        th, td {
            padding: 7px 10px;
            border: 1px solid #e5e7eb;
            word-wrap: break-word;
            overflow: hidden;
        }

        th {
            font-weight: 700;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            background-color: #f0f4ff !important;
            color: #1e40af;
            border-bottom: 2px solid #3b82f6;
            text-align: center;
        }

        td { text-align: left; }

        /* Right-align number columns */
        .text-right, td.text-right, th.text-right {
            text-align: right;
        }

        /* Zebra striping */
        tbody tr:nth-child(even) {
            background-color: #f9fafb !important;
        }

        tbody tr:hover { background: transparent; }

        /* Totals row */
        tbody tr:last-child td,
        tfoot tr td {
            font-weight: 700;
            border-top: 2px solid #374151;
            background-color: #eef2ff !important;
            font-size: 11px;
        }

        /* ===== Report Header ===== */
        .text-center { text-align: center; }
        .mb-6 { margin-bottom: 20px; }
        .mb-1 { margin-bottom: 3px; }
        .mb-2 { margin-bottom: 6px; }
        .mt-1 { margin-top: 3px; }

        h2 {
            font-size: 18px; font-weight: 800;
            margin: 0 0 2px; color: #111;
            text-align: center;
        }
        h3 {
            font-size: 14px; font-weight: 700;
            margin: 0 0 6px; color: #1e40af;
            text-align: center;
        }
        p  { font-size: 11px; color: #555; margin: 0 0 3px; }

        .font-bold { font-weight: 700; }
        .font-semibold { font-weight: 600; }
        .font-mono { font-family: 'Courier New', monospace; }

        /* Page-break control */
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
        .overflow-x-auto { overflow: visible; }

        /* ===== Print Footer ===== */
        .print-footer {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 9px;
            color: #9ca3af;
        }
    </style>
</head>
<body>
    ${element.innerHTML}
    <div class="print-footer">
        © ${new Date().getFullYear()} Sri Ram Fashions. All rights reserved. | Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
    </div>
</body>
</html>`;

        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // Wait for stylesheets to load, then print
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                // Close after print dialog closes
                printWindow.onafterprint = () => printWindow.close();
            }, 500);
        };
    } else {
        window.print();
    }
};

/**
 * Generate print-friendly version of current page
 */
export const preparePrintView = () => {
    document.body.classList.add('printing');

    window.addEventListener('afterprint', () => {
        document.body.classList.remove('printing');
    }, { once: true });

    window.print();
};
