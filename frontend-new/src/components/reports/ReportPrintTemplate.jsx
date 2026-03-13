import './ReportPrintTemplate.css';
import { formatDate } from '../../utils/dateUtils';
import lotusLogo from '../../assets/lotus-logo.png';

/**
 * ReportPrintTemplate - A reusable component for professional report printing
 * 
 * Props:
 * - reportTitle: string - Title of the report (e.g., "Auditor Purchase Report")
 * - fromDate: string - Start date for the report
 * - toDate: string - End date for the report
 * - columns: array - Column definitions [{key, label, align, width}]
 * - data: array - Data rows to display
 * - totals: object - Optional totals row data
 * - showSignature: boolean - Whether to show signature section
 */
const ReportPrintTemplate = ({
    reportTitle = "Report",
    fromDate,
    toDate,
    columns = [],
    data = [],
    totals = null,
    showSignature = true,
    companyInfo = {}
}) => {
    const defaultCompanyInfo = {
        name: 'SRI RAM FASHIONS',
        address1: '61C9, Anupparpalayam Puthur, Tirupur. 641652',
        address2: '81 K, Madurai Road, SankerNager, Tirunelveli Dt. 627357',
        gstin: '33AZRPM4425F2ZA',
        phone: '9080573831',
        email: 'sriramfashionstrp@gmail.com',
        ...companyInfo
    };

    const formatCurrency = (amount) => {
        if (amount === undefined || amount === null) return '';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatValue = (value, column) => {
        if (value === undefined || value === null) return '-';
        if (column.type === 'currency') return formatCurrency(value);
        if (column.type === 'date') return formatDate(value);
        return value;
    };

    return (
        <div className="report-print-template" id="report-print-template">
            {/* Header Section */}
            <div className="report-print-header">
                <h1 className="report-company-name">
                    <img src={lotusLogo} alt="Logo" className="report-company-logo" />
                    {defaultCompanyInfo.name}
                </h1>
                <p className="report-company-address">{defaultCompanyInfo.address1}</p>
                <p className="report-company-address">{defaultCompanyInfo.address2}</p>
                <p className="report-company-contact">
                    GSTIN: {defaultCompanyInfo.gstin} | Phone: {defaultCompanyInfo.phone} | Email: {defaultCompanyInfo.email}
                </p>
            </div>

            {/* Report Title Section */}
            <div className="report-title-section">
                <h2 className="report-title">{reportTitle}</h2>
                {(fromDate || toDate) && (
                    <p className="report-date-range">
                        {fromDate && `From: ${formatDate(fromDate)}`}
                        {fromDate && toDate && ' | '}
                        {toDate && `To: ${formatDate(toDate)}`}
                    </p>
                )}
                <p className="report-generated-date">
                    Generated on: {formatDate(new Date())}
                </p>
            </div>

            {/* Data Table */}
            <table className="report-print-table">
                <thead>
                    <tr>
                        <th className="text-center" style={{ width: '40px' }}>S.No</th>
                        {columns.map((col, idx) => (
                            <th
                                key={idx}
                                className={col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}
                                style={col.width ? { width: col.width } : {}}
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                                No data available
                            </td>
                        </tr>
                    ) : (
                        data.map((row, rowIdx) => (
                            <tr key={rowIdx}>
                                <td className="text-center">{rowIdx + 1}</td>
                                {columns.map((col, colIdx) => (
                                    <td
                                        key={colIdx}
                                        className={col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}
                                    >
                                        {formatValue(row[col.key], col)}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
                {totals && (
                    <tfoot>
                        <tr>
                            <td colSpan={columns.filter(c => !c.showInTotal).length + 1} className="text-right">
                                <strong>Total</strong>
                            </td>
                            {columns.filter(c => c.showInTotal).map((col, idx) => (
                                <td
                                    key={idx}
                                    className={col.align === 'right' ? 'text-right' : ''}
                                >
                                    <strong>{formatValue(totals[col.key], col)}</strong>
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                )}
            </table>

            {/* Footer with Signature */}
            {showSignature && (
                <div className="report-print-footer">
                    <div className="report-footer-left">
                        <p>This is a computer generated report.</p>
                    </div>
                    <div className="report-footer-right">
                        <div className="report-signature-line">
                            Authorized Signature
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportPrintTemplate;
