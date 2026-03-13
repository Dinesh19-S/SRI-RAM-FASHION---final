import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';

// Confirm Dialog Component
// 3D Glassmorphism styled confirmation modal

const ConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning', // 'warning', 'danger', 'info', 'success'
    isLoading = false,
}) => {
    if (!isOpen) return null;

    const icons = {
        warning: <AlertTriangle size={28} />,
        danger: <XCircle size={28} />,
        info: <Info size={28} />,
        success: <CheckCircle size={28} />,
    };

    const iconColors = {
        warning: {
            bg: 'rgba(245, 158, 11, 0.15)',
            text: '#f59e0b',
            border: 'rgba(245, 158, 11, 0.3)',
        },
        danger: {
            bg: 'rgba(239, 68, 68, 0.15)',
            text: '#ef4444',
            border: 'rgba(239, 68, 68, 0.3)',
        },
        info: {
            bg: 'rgba(59, 130, 246, 0.15)',
            text: '#3b82f6',
            border: 'rgba(59, 130, 246, 0.3)',
        },
        success: {
            bg: 'rgba(16, 185, 129, 0.15)',
            text: '#10b981',
            border: 'rgba(16, 185, 129, 0.3)',
        },
    };

    const buttonColors = {
        warning: 'btn-accent',
        danger: 'btn-danger',
        info: 'btn-primary',
        success: 'btn-success',
    };

    const colors = iconColors[type];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal max-w-md confirm-dialog"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    <button
                        className="btn btn-ghost btn-icon"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="flex flex-col items-center text-center">
                        <div
                            className="confirm-icon-wrapper"
                            style={{
                                background: colors.bg,
                                border: `2px solid ${colors.border}`,
                                color: colors.text,
                            }}
                        >
                            {icons[type]}
                        </div>
                        <p className="text-gray-600 mt-4 text-sm leading-relaxed">
                            {message}
                        </p>
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        className="btn btn-secondary flex-1"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        {cancelText}
                    </button>
                    <button
                        className={`btn ${buttonColors[type]} flex-1`}
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
