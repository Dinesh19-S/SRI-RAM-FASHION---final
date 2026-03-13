const ReportHeader = ({
    companyName = "Sri Ram Fashions",
    reportTitle,
    fromDate,
    toDate,
    additionalInfo
}) => {
    return (
        <div className="text-center mb-6 print:mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1 print:text-black">
                {companyName}
            </h2>
            <h3 className="text-lg font-semibold text-gray-700 mb-2 print:text-black">
                {reportTitle}
            </h3>
            {(fromDate || toDate) && (
                <p className="text-sm text-gray-600 print:text-black">
                    {fromDate && `From: ${fromDate}`}
                    {fromDate && toDate && ' | '}
                    {toDate && `To: ${toDate}`}
                </p>
            )}
            {additionalInfo && (
                <p className="text-sm text-gray-600 print:text-black mt-1">
                    {additionalInfo}
                </p>
            )}
        </div>
    );
};

export default ReportHeader;
