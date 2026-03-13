import { X, Printer, Download } from 'lucide-react';
import { printReport } from '../../utils/printReport';

const InvoiceViewModal = ({ isOpen, onClose, title, elementId }) => {
    if (!isOpen) return null;

    const handlePrint = () => {
        printReport(elementId);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:hidden" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-[230mm] w-full max-h-[95vh] overflow-hidden mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">{title || 'Invoice View'}</h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
                        >
                            <Printer size={16} />
                            Print
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* A4 Content Container */}
                <div className="p-6 overflow-auto max-h-[calc(95vh-80px)]" style={{ backgroundColor: '#e5e5e5' }}>
                    <div
                        className="bg-white mx-auto shadow-lg"
                        style={{
                            width: '210mm',
                            minHeight: '297mm',
                            padding: '15mm',
                            boxSizing: 'border-box'
                        }}
                    >
                        {/* Clone the report content here */}
                        <div id={`${elementId}-preview`}>
                            {/* Content will be cloned from the actual report */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceViewModal;
