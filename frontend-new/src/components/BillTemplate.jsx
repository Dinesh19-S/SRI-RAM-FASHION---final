import { useMemo } from 'react';
import './BillTemplate.css';

// Convert number to words in Indian format
const numberToWords = (num) => {
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const scales = ['', 'Thousand', 'Lakh', 'Crore'];

    if (num === 0) return 'Zero';

    const convertChunk = (n) => {
        let str = '';
        if (n >= 100) {
            str += units[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
        }
        if (n >= 20) {
            str += tens[Math.floor(n / 10)] + ' ';
            n %= 10;
        }
        if (n > 0) {
            str += units[n] + ' ';
        }
        return str;
    };

    let result = '';
    let scaleIdx = 0;
    let n = Math.floor(num);
    
    // First chunk (hundreds)
    result = convertChunk(n % 1000) + result;
    n = Math.floor(n / 1000);
    scaleIdx = 1;

    while (n > 0) {
        const chunk = n % 100;
        if (chunk > 0) {
            result = convertChunk(chunk) + (scales[scaleIdx] || '') + ' ' + result;
        }
        n = Math.floor(n / 100);
        scaleIdx++;
    }

    return result.trim() + ' Only';
};

const toAmount = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const BillTemplate = ({ bill, settings, forPrint = false }) => {
    if (!bill) return null;

    const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('en-GB');
    };

    const items = bill.items || [];
    const productAmt = toAmount(bill.subtotal);
    const discount = toAmount(bill.discountAmount);
    const taxableAmt = toAmount(bill.taxableAmount, productAmt - discount);
    const cgstAmt = toAmount(bill.cgst);
    const sgstAmt = toAmount(bill.sgst);
    const igstAmt = toAmount(bill.igst);
    const totalGst = toAmount(bill.totalTax, cgstAmt + sgstAmt + igstAmt);
    const finalAmt = toAmount(bill.grandTotal, Math.round(taxableAmt + totalGst));
    const totalPacks = bill.totalPacks || items.reduce((sum, item) => sum + toAmount(item.quantity || item.noOfPacks), 0);
    const numBundles = bill.numOfBundles || 0;

    // Company details from settings or fallback
    const companyName = settings?.company?.name || 'SRI RAM FASHIONS';
    const companyGstin = settings?.company?.gstin || '33AZRPM4425F2ZA';
    
    return (
        <div className={`w-[210mm] min-h-[297mm] bg-white border border-gray-200 overflow-hidden text-black font-sans ${forPrint ? 'print:m-0 print:w-full print:border-none' : 'shadow-2xl'}`} id="invoice-paper">
            {/* Main Header */}
            <div className="bg-blue-900 text-white p-4 flex justify-between items-center border-b-2 border-black">
                <div className="flex-1">
                    <h1 className="text-4xl font-extrabold tracking-tighter uppercase leading-none">{companyName}</h1>
                    <div className="text-xs mt-1 flex items-center space-x-4 opacity-90">
                        <span className="font-bold">GSTIN: {companyGstin}</span>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end">
                    <div className="flex flex-col items-center">
                        <svg width="60" height="60" viewBox="0 0 100 100" className="mb-1 bg-white p-1 rounded-full border-2 border-blue-900 overflow-visible shadow-sm">
                            <circle cx="50" cy="50" r="46" fill="white" stroke="#1e3a8a" strokeWidth="2" />
                            <path 
                                d="M35 25 H55 C65 25 75 30 75 42.5 C75 55 65 60 55 60 H45 V75 M45 60 L75 75" 
                                fill="none" 
                                stroke="#1e3a8a" 
                                strokeWidth="8" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                            />
                            <circle cx="50" cy="50" r="38" fill="none" stroke="#1e3a8a" strokeWidth="1" strokeDasharray="4 4" />
                        </svg>
                        <div className="flex flex-col items-center leading-none">
                            <span className="font-black tracking-widest text-[9px] text-white uppercase">Rugged & Urban</span>
                            <div className="w-full h-px bg-white/40"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Addresses & Contact */}
            <div className="grid grid-cols-2 text-[10px] border-b border-black divide-x divide-black">
                <div className="p-3 space-y-1">
                    <p><span className="font-bold">OFF :</span> 61C9, Anupparpalayam Puthur, Tirupur. 641652</p>
                    <p><span className="font-bold">OFF :</span> 81 K, Madurai Road, SankerNager, Tirunelveli Dt. 627357</p>
                    <p><span className="font-bold">State :</span> Tamilnadu (Code 33)</p>
                    <p><span className="font-bold">Email :</span> sriramfashionstrp@gmail.com</p>
                    <p><span className="font-bold">Mob :</span> 9080573831</p>
                </div>
                <div className="p-3 grid grid-cols-2 gap-x-2 h-full">
                    <div className="space-y-1">
                        <p className="font-bold uppercase">Invoice Number</p>
                        <p className="font-bold uppercase">Invoice Date</p>
                        <p className="font-bold uppercase">From</p>
                        <p className="font-bold uppercase">To</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="font-bold flex items-center justify-end"><span className="mr-1">:</span> {bill.billNumber || '---'}</p>
                        <p className="font-bold flex items-center justify-end"><span className="mr-1">:</span> {formatDate(bill.date || bill.createdAt)}</p>
                        <p className="font-bold flex items-center justify-end"><span className="mr-1">:</span> {bill.fromText || 'TIRUPPUR'}</p>
                        <p className="font-bold flex items-center justify-end"><span className="mr-1">:</span> {bill.toText || '---'}</p>
                    </div>
                </div>
            </div>

            {/* Tax Invoice Label */}
            <div className="bg-white border-b border-black py-1 text-center">
                <h2 className="text-2xl font-bold text-blue-800 tracking-[0.2em] relative inline-block">
                    TAX INVOICE
                    <div className="absolute -bottom-1 left-0 w-full border-t border-blue-800"></div>
                    <div className="absolute -bottom-[2px] left-0 w-full border-t border-blue-800"></div>
                </h2>
            </div>

            {/* Buyer Info */}
            <div className="grid grid-cols-2 text-[11px] border-b border-black divide-x divide-black uppercase">
                <div className="p-3 space-y-2">
                    <p className="text-[9px] font-bold text-gray-500 mb-1">Consignee Copy</p>
                    <div className="flex items-start">
                        <span className="w-20 font-bold">BUYER</span>
                        <span className="mx-2">:</span>
                        <span className="flex-1 font-bold">{bill.customer?.name || "____________________"}</span>
                    </div>
                    <div className="flex items-start">
                        <span className="w-20 font-bold text-[9px]">ADDRESS</span>
                        <span className="mx-2 text-[9px]">:</span>
                        <span className="flex-1 text-[9px] lowercase leading-tight">{bill.customer?.address || "---"}</span>
                    </div>
                    <div className="flex items-start">
                        <span className="w-20 font-bold">STATE</span>
                        <span className="mx-2">:</span>
                        <span className="flex-1">{bill.customer?.state || 'TAMILNADU'}</span>
                    </div>
                    <div className="flex items-start">
                        <span className="w-20 font-bold">TRANSPORT</span>
                        <span className="mx-2">:</span>
                        <span className="flex-1">{bill.transport || "---"}</span>
                    </div>
                </div>
                <div className="p-3 space-y-2 pt-6">
                    <div className="flex items-start">
                        <span className="w-16 font-bold uppercase">Mob</span>
                        <span className="mx-2">:</span>
                        <span className="flex-1">{bill.customer?.phone || "---"}</span>
                    </div>
                    <div className="flex items-start">
                        <span className="w-16 font-bold uppercase">Gstin</span>
                        <span className="mx-2">:</span>
                        <span className="flex-1">{bill.customer?.gstin || "---"}</span>
                    </div>
                    <div className="flex items-start">
                        <span className="w-16 font-bold uppercase">Code</span>
                        <span className="mx-2">:</span>
                        <span className="flex-1">{bill.customer?.stateCode || '33'}</span>
                    </div>
                </div>
            </div>

            {/* Product Table */}
            <div className="border-b border-black min-h-[450px]">
                <table className="w-full border-collapse text-[10px]">
                    <thead>
                        <tr className="border-b border-black text-center font-bold divide-x divide-black uppercase">
                            <th className="py-2 w-10">S.No</th>
                            <th className="py-2 px-2 text-left">Product Description</th>
                            <th className="py-2 w-32 px-1">Sizes / Pieces</th>
                            <th className="py-2 w-24">HSN Code</th>
                            <th className="py-2 w-24 text-right pr-2">Rate Per Piece</th>
                            <th className="py-2 w-20">No Of Packs</th>
                            <th className="py-2 w-24 text-right pr-2">Amount Rs.</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                        {items.map((item, idx) => (
                            <tr key={idx} className="divide-x divide-black h-8 align-middle">
                                <td className="text-center font-bold py-1">{idx + 1}</td>
                                <td className="px-2 font-bold uppercase">{item.productName || item.name}</td>
                                <td className="px-1 text-center font-bold">{item.sizesOrPieces || '---'}</td>
                                <td className="text-center font-bold">{item.hsnCode || '61034300'}</td>
                                <td className="text-right pr-2 font-bold">{toAmount(item.ratePerPiece, item.price).toFixed(2)}</td>
                                <td className="text-center font-bold">{toAmount(item.noOfPacks, item.quantity)}</td>
                                <td className="text-right pr-2 font-bold">{toAmount(item.total, toAmount(item.ratePerPiece, item.price) * toAmount(item.noOfPacks, item.quantity)).toFixed(2)}</td>
                            </tr>
                        ))}
                        {/* Spacer rows */}
                        {items.length < 15 && Array.from({ length: 15 - items.length }).map((_, idx) => (
                            <tr key={`spacer-${idx}`} className="divide-x divide-black h-8">
                                <td colSpan={7}></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals Section */}
            <div className="grid grid-cols-12 border-b border-black divide-x divide-black">
                {/* Left Summary */}
                <div className="col-span-4 p-2 text-[10px] space-y-2">
                    <div className="flex items-center text-xs font-bold">
                        <span className="w-24 uppercase">Total Packs</span>
                        <span className="mx-2">:</span>
                        <span>{totalPacks}</span>
                    </div>
                    <div className="flex items-center text-xs font-bold">
                        <span className="w-24 uppercase">Bill Amount</span>
                        <span className="mx-2">:</span>
                        <span className="border-b border-black min-w-[60px]">{finalAmt.toFixed(2)}</span>
                    </div>
                    <div className="flex items-start">
                        <span className="w-20 font-bold whitespace-nowrap uppercase">In words</span>
                        <span className="mx-1">:</span>
                        <span className="text-[9px] font-bold italic border-b border-dotted border-black flex-1 min-h-[40px]">
                            Rupees {numberToWords(finalAmt)}
                        </span>
                    </div>
                </div>

                {/* Middle Stats */}
                <div className="col-span-4 p-2 border-r border-black flex flex-col justify-between">
                    <div className="flex items-center justify-between font-bold text-[11px] mb-4">
                        <span className="uppercase">Num Of Bundles</span>
                        <span className="mx-2">:</span>
                        <span className="border border-black px-4 py-1">{numBundles}</span>
                    </div>

                    <div className="border border-red-500 p-2 flex items-center justify-between rounded-sm">
                        <span className="text-red-600 font-extrabold text-lg tracking-widest uppercase">Total GST</span>
                        <span className="text-red-600 font-extrabold text-2xl">5%</span>
                    </div>
                </div>

                {/* Right Calc */}
                <div className="col-span-4 text-[11px] font-bold flex flex-col divide-y divide-black">
                    <div className="grid grid-cols-2 p-1 px-2">
                        <span>Product Amt</span>
                        <span className="text-right">{productAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="grid grid-cols-2 p-1 px-2">
                        <span>Discount</span>
                        <span className="text-right">{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="grid grid-cols-2 p-1 px-2">
                        <span>Taxable Amt</span>
                        <span className="text-right">{taxableAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="grid grid-cols-2 p-1 px-2 text-red-600 font-bold">
                        <span>CGST @ 2.50%</span>
                        <span className="text-right">{cgstAmt.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-2 p-1 px-2 text-red-600 font-bold">
                        <span>SGST @ 2.50%</span>
                        <span className="text-right">{sgstAmt.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-2 p-1 px-2">
                        <span>Round Off</span>
                        <span className="text-right">{toAmount(bill.roundOff).toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-2 p-1 px-2 text-sm bg-gray-50 uppercase font-black border-t border-black">
                        <span>Total Amt</span>
                        <span className="text-right">{finalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            {/* Terms and Bottom */}
            <div className="grid grid-cols-2 text-[8px] border-b border-black divide-x divide-black">
                <div className="p-3 space-y-1">
                    <h3 className="font-bold border-b border-black w-fit mb-1 uppercase">Terms And Conditions</h3>
                    <ol className="list-decimal pl-4 space-y-0.5">
                        <li>Subject to Tirupur Jurisdiction.</li>
                        <li>Payment by Cheque/DD only, payable at Tirupur.</li>
                        <li>Cheques made in favour of {companyName} to be sent to Tirunelveli Address</li>
                        <li>All disputes are subjected to Tirunelveli Jurisdiction</li>
                    </ol>
                    
                    <div className="mt-4 border border-orange-200 p-2 rounded-sm text-[9px] bg-orange-50/30">
                        <h4 className="text-red-600 font-black mb-1 italic">Bank Details:</h4>
                        <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-0.5 uppercase">
                            <span className="font-bold">ACC NAME</span>
                            <span>: {companyName}</span>
                            <span className="font-bold">BANK</span>
                            <span>: SOUTH INDIAN BANK</span>
                            <span className="font-bold">ACC NUM</span>
                            <span>: 0338073000002328</span>
                            <span className="font-bold">BRANCH</span>
                            <div className="flex justify-between">
                                <span>: TIRUPUR</span>
                                <div className="flex">
                                    <span className="font-bold mr-1">IFSC :</span>
                                    <span>SIBL0000338</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-3 flex flex-col justify-between items-center text-center">
                    <p className="italic font-bold">Certified that above particulars are true and correct</p>
                    <div className="mt-auto space-y-12 w-full">
                        <p className="text-blue-900 font-black uppercase text-xs">For {companyName}</p>
                        <div className="flex flex-col items-center">
                            <div className="w-40 border-t border-black"></div>
                            <p className="font-bold mt-1 uppercase text-[9px]">Authorized Signature</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BillTemplate;
