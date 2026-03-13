import { Calendar } from 'lucide-react';

const DateRangeFilter = ({ fromDate, toDate, onFromDateChange, onToDateChange, fromLabel = "From Date", toLabel = "To Date" }) => {
    return (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    {fromLabel}
                </label>
                <div className="relative">
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => onFromDateChange(e.target.value)}
                        className="form-input pl-10 pr-3 py-2"
                    />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    {toLabel}
                </label>
                <div className="relative">
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => onToDateChange(e.target.value)}
                        className="form-input pl-10 pr-3 py-2"
                    />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
            </div>
        </div>
    );
};

export default DateRangeFilter;
