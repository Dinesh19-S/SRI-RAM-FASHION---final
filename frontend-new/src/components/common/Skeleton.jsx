// Skeleton Loading Components for Sri Ram Fashions
// 3D Glassmorphism themed skeleton loaders

// Base Skeleton with shimmer animation
export const Skeleton = ({ className = '', style = {} }) => {
    return (
        <div
            className={`skeleton ${className}`}
            style={style}
        />
    );
};

// Stat Card Skeleton (for dashboard)
export const StatCardSkeleton = () => {
    return (
        <div className="stats-card" style={{ animation: 'none' }}>
            <div className="skeleton skeleton-icon" />
            <div className="flex-1 space-y-2">
                <div className="skeleton skeleton-text" style={{ width: '60%' }} />
                <div className="skeleton skeleton-text-lg" style={{ width: '80%' }} />
                <div className="skeleton skeleton-text-sm" style={{ width: '50%' }} />
            </div>
        </div>
    );
};

// Chart Skeleton
export const ChartSkeleton = ({ height = 300 }) => {
    return (
        <div className="card" style={{ animation: 'none' }}>
            <div className="skeleton skeleton-text" style={{ width: '40%', marginBottom: '1rem' }} />
            <div className="skeleton" style={{ height: `${height}px`, borderRadius: '0.75rem' }} />
        </div>
    );
};

// Table Row Skeleton
export const TableRowSkeleton = ({ columns = 5 }) => {
    return (
        <tr>
            {Array.from({ length: columns }).map((_, index) => (
                <td key={index} className="p-4">
                    <div className="skeleton skeleton-text" style={{ width: `${60 + Math.random() * 30}%` }} />
                </td>
            ))}
        </tr>
    );
};

// Table Skeleton
export const TableSkeleton = ({ rows = 5, columns = 5 }) => {
    return (
        <div className="card p-0" style={{ animation: 'none' }}>
            <div className="p-6 pb-4">
                <div className="skeleton skeleton-text-lg" style={{ width: '30%' }} />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-y border-gray-200">
                            {Array.from({ length: columns }).map((_, index) => (
                                <th key={index} className="text-left p-4">
                                    <div className="skeleton skeleton-text" style={{ width: '80%' }} />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: rows }).map((_, index) => (
                            <TableRowSkeleton key={index} columns={columns} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Card Skeleton
export const CardSkeleton = ({ lines = 3 }) => {
    return (
        <div className="card" style={{ animation: 'none' }}>
            <div className="skeleton skeleton-text-lg" style={{ width: '50%', marginBottom: '1rem' }} />
            {Array.from({ length: lines }).map((_, index) => (
                <div
                    key={index}
                    className="skeleton skeleton-text"
                    style={{
                        width: `${70 + Math.random() * 25}%`,
                        marginBottom: index < lines - 1 ? '0.5rem' : 0
                    }}
                />
            ))}
        </div>
    );
};

// Form Skeleton
export const FormSkeleton = ({ fields = 4 }) => {
    return (
        <div className="card" style={{ animation: 'none' }}>
            <div className="skeleton skeleton-text-lg" style={{ width: '40%', marginBottom: '1.5rem' }} />
            <div className="space-y-4">
                {Array.from({ length: fields }).map((_, index) => (
                    <div key={index}>
                        <div className="skeleton skeleton-text-sm" style={{ width: '25%', marginBottom: '0.5rem' }} />
                        <div className="skeleton skeleton-input" />
                    </div>
                ))}
                <div className="flex gap-3 pt-4">
                    <div className="skeleton skeleton-button" />
                    <div className="skeleton skeleton-button-secondary" />
                </div>
            </div>
        </div>
    );
};

// Page Header Skeleton
export const PageHeaderSkeleton = () => {
    return (
        <div className="flex items-center justify-between mb-6">
            <div className="skeleton skeleton-text-xl" style={{ width: '200px' }} />
            <div className="skeleton skeleton-button" />
        </div>
    );
};

// Low Stock Alert Skeleton
export const AlertSkeleton = () => {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.5)' }}>
            <div className="skeleton skeleton-icon-sm" />
            <div className="flex-1">
                <div className="skeleton skeleton-text" style={{ width: '70%', marginBottom: '0.25rem' }} />
                <div className="skeleton skeleton-text-sm" style={{ width: '50%' }} />
            </div>
        </div>
    );
};

// Dashboard Skeleton (Complete)
export const DashboardSkeleton = () => {
    return (
        <div className="space-y-6">
            <PageHeaderSkeleton />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <StatCardSkeleton key={index} />
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <ChartSkeleton height={300} />
                </div>
                <div className="space-y-3">
                    <div className="skeleton skeleton-text-lg" style={{ width: '50%', marginBottom: '1rem' }} />
                    {Array.from({ length: 3 }).map((_, index) => (
                        <AlertSkeleton key={index} />
                    ))}
                </div>
            </div>

            {/* Recent Bills Table */}
            <TableSkeleton rows={5} columns={5} />
        </div>
    );
};

export default Skeleton;
