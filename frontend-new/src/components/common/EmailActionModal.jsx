import { Loader2, Mail, X } from 'lucide-react';

const EmailActionModal = ({
    open,
    title,
    description,
    value,
    onChange,
    onClose,
    onSubmit,
    isSubmitting = false,
    submitLabel = 'Send Email',
    placeholder = 'Recipient email address',
    helperText = 'Use comma to send to multiple recipients. Invalid emails will be skipped.'
}) => {
    if (!open) {
        return null;
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-violet-100 text-violet-700">
                            <Mail size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{description}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={onClose}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="mt-5">
                    <input
                        type="text"
                        className="form-input w-full"
                        placeholder={placeholder}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        autoFocus
                    />
                    <p className="text-xs text-gray-500 mt-2">{helperText}</p>
                </div>

                <div className="flex gap-3 justify-end mt-6">
                    <button className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button
                        className="btn"
                        style={{ backgroundColor: '#7c3aed', color: 'white' }}
                        onClick={onSubmit}
                        disabled={isSubmitting || !value.trim()}
                    >
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                        {isSubmitting ? 'Sending...' : submitLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailActionModal;
