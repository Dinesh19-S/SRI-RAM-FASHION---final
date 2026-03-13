import { FileSpreadsheet, Printer, Mail, FileText } from 'lucide-react';

const ReportActions = ({ onExcel, onPrint, onEmail, showInvoice = false, onInvoice }) => {
    return (
        <div className="flex items-center gap-3 print:hidden">
            <button
                onClick={onExcel}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm flex items-center gap-2 transition-all shadow-sm hover:shadow"
            >
                <FileSpreadsheet size={18} />
                EXCEL
            </button>

            <button
                onClick={onPrint}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm flex items-center gap-2 transition-all shadow-sm hover:shadow"
            >
                <Printer size={18} />
                PRINT
            </button>

            <button
                onClick={onEmail}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm flex items-center gap-2 transition-all shadow-sm hover:shadow"
            >
                <Mail size={18} />
                MAIL TO
            </button>

            {showInvoice && (
                <button
                    onClick={onInvoice}
                    className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-900 rounded-lg transition-colors shadow-sm"
                    title="View Invoice"
                >
                    <FileText size={18} />
                </button>
            )}
        </div>
    );
};

export default ReportActions;

