// This is a fragment — the CREATE view for BillingPage
// It replaces lines 755-1168 of BillingPage.jsx

export const createViewJSX = `
                <div className="flex flex-col h-screen -m-6 bg-slate-50/50 overflow-hidden">
                    {/* Invoice Builder Header */}
                    <div className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-50 shadow-sm">
                        <div className="flex items-center justify-between max-w-[1400px] mx-auto w-full">
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <Receipt size={24} />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create Invoice</h1>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SRI RAM FASHIONS • Rugged & Urban</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsEditable(!isEditable)}
                                    className={\`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all \${isEditable ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}\`}
                                >
                                    {isEditable ? <Save size={16} /> : <Edit3 size={16} />}
                                    {isEditable ? 'Preview' : 'Edit Mode'}
                                </button>
                                <button
                                    onClick={() => handleDownloadPDF(currentBillForPreview)}
                                    className="px-6 py-3 bg-red-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all"
                                >
                                    <FileDown size={16} /> PDF
                                </button>
                                <button
                                    onClick={resetForm}
                                    className="w-12 h-12 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 flex items-center justify-center transition-all"
                                    title="Reset Draft"
                                >
                                    <RotateCcw size={20} />
                                </button>
                                <div className="w-px h-8 bg-slate-200 mx-2"></div>
                                <button onClick={() => setView('LIST')} className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <AnimatePresence mode="wait">
                            {isEditable ? (
                                <motion.div 
                                    key="editor"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex flex-col xl:flex-row h-full overflow-hidden"
                                >
                                    {/* Left Side: Form Editor */}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
                                        <div className="max-w-3xl mx-auto p-8 space-y-8 pb-32">
                                            {/* Customer Details */}
                                            <div className="bg-white rounded-[2rem] border border-slate-100 p-8 space-y-6 shadow-sm">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="text-lg font-black text-slate-900 tracking-tight">Customer Details</h4>
                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">Required *</span>
                                                </div>
                                                <div className="relative">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Search Customer</label>
                                                    <div className="relative">
                                                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input type="text" placeholder="Company, Name or Phone..." className="form-input pl-12 py-3.5 text-sm border-slate-100 rounded-2xl bg-slate-50/50" value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }} />
                                                    </div>
                                                    {showCustomerDropdown && customerSuggestions.length > 0 && (
                                                        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-64 overflow-y-auto p-2">
                                                            {customerSuggestions.map((cust) => (
                                                                <div key={cust._id} className="px-4 py-3 cursor-pointer hover:bg-blue-50 rounded-xl transition-colors mb-1 last:mb-0" onClick={() => selectCustomer(cust)}>
                                                                    <p className="text-sm font-bold text-slate-900">{cust.companyName}</p>
                                                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">{cust.mobile} {cust.gstin ? \`• \${cust.gstin}\` : ''}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Buyer Name *</label><input className="form-input py-3.5 text-sm border-slate-100 rounded-2xl bg-slate-50/50" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value.toUpperCase() })} /></div>
                                                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Phone Number *</label><input className="form-input py-3.5 text-sm border-slate-100 rounded-2xl bg-slate-50/50" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} /></div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Address</label>
                                                    <textarea 
                                                        className="form-input py-3.5 text-sm border-slate-100 rounded-2xl bg-slate-50/50 w-full resize-none h-20" 
                                                        placeholder="Full Address..."
                                                        value={customer.address} 
                                                        onChange={(e) => setCustomer({ ...customer, address: e.target.value.toUpperCase() })}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">GSTIN</label><input className="form-input py-3.5 text-sm border-slate-100 rounded-2xl bg-slate-50/50 uppercase" value={customer.gstin} onChange={(e) => setCustomer({ ...customer, gstin: e.target.value.toUpperCase() })} /></div>
                                                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Transport</label><input className="form-input py-3.5 text-sm border-slate-100 rounded-2xl bg-slate-50/50 uppercase" value={transport} onChange={(e) => setTransport(e.target.value.toUpperCase())} /></div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-6">
                                                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">From</label><input className="form-input py-3.5 text-sm border-slate-100 rounded-2xl bg-slate-50/50 uppercase" value={fromText} onChange={(e) => setFromText(e.target.value.toUpperCase())} /></div>
                                                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">To</label><input className="form-input py-3.5 text-sm border-slate-100 rounded-2xl bg-slate-50/50 uppercase" value={toText} onChange={(e) => setToText(e.target.value.toUpperCase())} /></div>
                                                    <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Bundles</label><input type="number" className="form-input py-3.5 text-sm border-slate-100 rounded-2xl bg-slate-50/50" value={numOfBundles} onChange={(e) => setNumOfBundles(Number(e.target.value))} /></div>
                                                </div>
                                            </div>

                                            {/* Select Products */}
                                            <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
                                                <div className="flex items-center justify-between mb-6">
                                                    <h4 className="text-lg font-black text-slate-900 tracking-tight">Select Products</h4>
                                                    <div className="relative">
                                                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input type="text" className="form-input py-2.5 pl-12 text-sm w-64 border-slate-100 rounded-2xl bg-slate-50/50" placeholder="Search products..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
                                                    </div>
                                                </div>
                                                <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                                                    {products.map((product) => (
                                                        <div key={product._id} className="flex items-center justify-between py-4 hover:bg-slate-50 px-4 rounded-2xl transition-all group">
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-900 uppercase">{product.name}</p>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">HSN: {product.hsn || '61034300'}</p>
                                                            </div>
                                                            <div className="text-right flex flex-col items-end gap-1">
                                                                <span className="text-base font-black text-blue-600">{formatCurrency(product.sellingPrice)}</span>
                                                                <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline" onClick={() => addItemToBill(product)}>+ Add Item</button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side: Cart Summary */}
                                    <div className="w-full xl:w-[480px] bg-white flex flex-col border-l border-slate-200 shadow-2xl z-40">
                                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                            <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cart Items ({billItems.length})</h4>
                                                    <button className="text-[10px] font-black text-red-500 uppercase tracking-widest" onClick={() => setBillItems([])}>Clear</button>
                                                </div>
                                                <div className="space-y-3">
                                                    {billItems.map((item) => (
                                                        <div key={item.uniqueId} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                                                            <div className="flex justify-between items-start">
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-black text-slate-900 uppercase truncate">{item.name}</p>
                                                                    <input 
                                                                        className="text-[10px] font-bold text-blue-600 bg-blue-50/50 rounded px-1 mt-1 border-none focus:ring-0 w-24" 
                                                                        placeholder="Sizes (e.g. M/5)" 
                                                                        value={item.sizesOrPieces} 
                                                                        onChange={(e) => updateItemField(item.uniqueId, 'sizesOrPieces', e.target.value)} 
                                                                    />
                                                                </div>
                                                                <button className="text-slate-300 hover:text-red-500" onClick={() => updateItemQuantity(item.uniqueId, 0)}><Trash2 size={14} /></button>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1">
                                                                    <button className="w-6 h-6 rounded bg-white text-slate-600 shadow-sm text-xs font-black" onClick={() => updateItemQuantity(item.uniqueId, item.noOfPacks - 1)}>-</button>
                                                                    <span className="text-[10px] font-black w-6 text-center">{item.noOfPacks}</span>
                                                                    <button className="w-6 h-6 rounded bg-white text-slate-600 shadow-sm text-xs font-black" onClick={() => updateItemQuantity(item.uniqueId, item.noOfPacks + 1)}>+</button>
                                                                </div>
                                                                <div className="text-right">
                                                                    <input 
                                                                        type="number" 
                                                                        className="text-[10px] font-black text-slate-400 text-right w-16 bg-transparent border-none focus:ring-0 p-0" 
                                                                        value={item.ratePerPack} 
                                                                        onChange={(e) => updateItemField(item.uniqueId, 'ratePerPack', Number(e.target.value))} 
                                                                    />
                                                                    <p className="text-sm font-black text-slate-900">{formatCurrency(item.ratePerPack * item.noOfPacks)}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="bg-blue-600 rounded-3xl p-8 text-white shadow-xl shadow-blue-500/20">
                                                <div className="flex justify-between items-center mb-6">
                                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Grand Total</span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-1 rounded">Tax Included</span>
                                                </div>
                                                <div className="text-4xl font-black tracking-tighter mb-8">{formatCurrency(grandTotal)}</div>
                                                <div className="space-y-3 pt-6 border-t border-white/10">
                                                    <div className="flex justify-between text-xs font-bold"><span className="opacity-60">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                                                    <div className="flex justify-between text-xs font-bold"><span className="opacity-60">GST (5%)</span><span>{formatCurrency(totalTax)}</span></div>
                                                    <div className="flex justify-between text-xs font-bold"><span className="opacity-60">Total Items</span><span>{totalPacks} Packs</span></div>
                                                </div>
                                            </div>
                                            
                                            {/* Payment Status Toggle */}
                                            <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Payment Status</h4>
                                                <div className="flex gap-2">
                                                    {['pending', 'paid'].map(s => (
                                                        <button 
                                                            key={s} 
                                                            onClick={() => setBillPaymentStatus(s)}
                                                            className={\`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all \${billPaymentStatus === s ? 'bg-white text-blue-600 border-blue-100 shadow-sm' : 'bg-transparent text-slate-400 border-transparent hover:bg-white'}\`}
                                                        >
                                                            {s === 'pending' ? 'Unpaid' : 'Paid'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-8 border-t border-slate-100 bg-white flex gap-4">
                                            <button className="flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 border border-slate-200 hover:bg-slate-50 transition-all" onClick={() => { resetForm(); setView('LIST'); }}>Cancel</button>
                                            <button className="flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 shadow-2xl shadow-blue-500/30 transition-all disabled:opacity-50" onClick={handleCreateBill} disabled={billItems.length === 0}>Create Bill</button>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="preview"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    className="h-full overflow-y-auto bg-slate-200/50 flex justify-center p-12 custom-scrollbar"
                                >
                                    <div className="max-w-[210mm] w-full">
                                        <BillTemplate bill={currentBillForPreview} settings={settings} />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
`;
