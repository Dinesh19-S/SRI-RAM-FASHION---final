import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSettings, updateSettings } from '../store/slices/settingsSlice';
import { Building, User, Bell, Shield, Save, Check, FileText, Download, Eye, Printer, Database, Trash2, AlertTriangle, Loader2, Upload, Mail, Send, X, ShieldCheck, Zap, Globe, Lock, History, HardDrive, Smartphone, Settings } from 'lucide-react';

import { useToast } from '../components/common';
import { downloadLetterheadWithContent, getLetterheadPreviewUrlWithContent } from '../utils/letterheadGenerator';
import { backupService } from '../services/backupService';
import { emailAPI } from '../services/api';

const SettingsPage = () => {
    const toast = useToast();
    const dispatch = useDispatch();
    const { data: settings, isLoading } = useSelector((state) => state.settings);
    const [activeTab, setActiveTab] = useState('company');
    const [emailStatus, setEmailStatus] = useState(null);
    const [testEmail, setTestEmail] = useState('');
    const [isSendingTest, setIsSendingTest] = useState(false);

    const [formData, setFormData] = useState({
        company: {
            name: '',
            address: '',
            gstin: '',
            state: 'Tamil Nadu',
            stateCode: '33',
            invoicePrefix: 'INV',
            voucherPrefix: 'V'
        },
        profile: { name: '', email: '', phone: '' },
        notifications: { emailNotifications: true, smsNotifications: false },
        security: { twoFactorAuth: false }
    });
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [letterContent, setLetterContent] = useState('');
    const textareaRef = useRef(null);

    useEffect(() => { 
        dispatch(fetchSettings()); 
        fetchEmailStatus();
    }, [dispatch]);

    useEffect(() => { if (settings) setFormData(prev => ({ ...prev, ...settings })); }, [settings]);

    const tabs = [
        { id: 'company', label: 'Company', icon: Building, desc: 'Company Details' },
        { id: 'profile', label: 'Profile', icon: User, desc: 'My Profile' },
        { id: 'notifications', label: 'Alerts', icon: Bell, desc: 'App Alerts' },
        { id: 'email', label: 'Email', icon: Mail, desc: 'Email Settings' },
        { id: 'security', label: 'Security', icon: Shield, desc: 'Security Settings' },
        { id: 'letterpad', label: 'Letterhead', icon: FileText, desc: 'Letterhead Design' },
        { id: 'data', label: 'Data & Backup', icon: Database, desc: 'Backup & Restore' }
    ];

    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isFlashing, setIsFlashing] = useState(false);
    const [showFlashConfirm, setShowFlashConfirm] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [isPdfBackingUp, setIsPdfBackingUp] = useState(false);
    const fileInputRef = useRef(null);

    const handlePdfBackup = async () => {
        setIsPdfBackingUp(true);
        const result = await backupService.exportPdfBackup({ company: settings?.company });
        setIsPdfBackingUp(false);
        if (result.success) toast.success('PDF Report saved');
        else toast.error('Archive failure: ' + result.message);
    };

    const handleBackup = async () => {
        setIsBackingUp(true);
        const result = await backupService.exportAllData();
        setIsBackingUp(false);
        if (result.success) toast.success('System backup saved');
        else toast.error('Backup failure: ' + result.message);
    };

    const handleFlash = async () => {
        setIsFlashing(true);
        const result = await backupService.flashAllData();
        setIsFlashing(false);
        setShowFlashConfirm(false);
        if (result.success) {
            toast.success('System flash successful. Re-initializing...');
            window.location.reload();
        } else toast.error('Flash failure: ' + result.message);
    };

    const handleRestore = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                setIsRestoring(true);
                const result = await backupService.importData(jsonData);
                setIsRestoring(false);
                if (result.success) {
                    toast.success('System restored. Reloading...');
                    window.location.reload();
                } else toast.error('Restoration failure: ' + result.message);
            } catch (err) { toast.error('Data Integrity Violation: Invalid vault signature'); }
        };
        reader.readAsText(file);
    };

    const fetchEmailStatus = async () => {
        try {
            const response = await emailAPI.getStatus();
            setEmailStatus(response.data);
        } catch (error) { console.error('Service Error:', error); }
    };

    const handleSendTestEmail = async () => {
        if (!testEmail || !testEmail.includes('@')) {
            toast.warning('Important Note: Invalid email address');
            return;
        }
        setIsSendingTest(true);
        try {
            const response = await emailAPI.sendTest(testEmail);
            if (response.data.success) toast.success('Connection test successful: Ready');
            else toast.error('Service Error: ' + response.data.message);
        } catch (error) { toast.error('Service Error: ' + (error.response?.data?.message || error.message)); }
        finally { setIsSendingTest(false); }
    };

    const handleSave = async () => {
        await dispatch(updateSettings(formData));
        setSaveSuccess(true);
        toast.success('Settings saved successfully');
        setTimeout(() => setSaveSuccess(false), 3000);
    };

    const handlePreviewLetterpad = () => window.open(getLetterheadPreviewUrlWithContent(letterContent), '_blank');
    const handleDownloadLetterpad = () => downloadLetterheadWithContent(letterContent);
    const handlePrint = () => {
        const printWindow = window.open(getLetterheadPreviewUrlWithContent(letterContent), '_blank');
        printWindow.onload = () => printWindow.print();
    };

    return (
        <div className="space-y-10 animate-fade-in p-2 pb-20">
            {/* Settings Header */}
            <div className="page-header-shell bg-white/40 backdrop-blur-md border border-white/40 shadow-xl shadow-slate-200/20 rounded-3xl p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-5">
                        <div className="w-16 h-16 rounded-3xl bg-linear-to-br from-indigo-600 to-slate-800 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <Settings size={28} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Settings</p>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Settings</h1>
                            <p className="text-sm font-bold text-slate-500 pt-1">Manage company details and security.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Navigation Sidebar */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="glass-card p-4 border-none space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-4 py-2">Categories</p>
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group ${
                                        isActive 
                                        ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10 scale-[1.02]' 
                                        : 'hover:bg-slate-50 text-slate-500'
                                    }`}
                                >
                                    <div className={`p-2.5 rounded-xl transition-all ${isActive ? 'bg-white/10' : 'bg-slate-100 group-hover:bg-white'}`}>
                                        <Icon size={18} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-black tracking-tight">{tab.label}</p>
                                        <p className={`text-[9px] font-bold uppercase tracking-widest ${isActive ? 'text-slate-400' : 'text-slate-400 group-hover:text-slate-500'}`}>{tab.desc}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="glass-card p-6 border-none bg-emerald-900 text-white overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform"></div>
                        <ShieldCheck size={48} className="text-emerald-400/20 absolute -bottom-4 -right-4" />
                        <div className="relative z-10 space-y-3">
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Security Status</p>
                            <h4 className="text-lg font-black tracking-tight">Status</h4>
                            <p className="text-[10px] font-bold text-emerald-100/60 leading-relaxed uppercase tracking-widest">Your data is safe and system is monitoring for any issues.</p>
                        </div>
                    </div>
                </div>

                {/* Configuration Panel */}
                <div className="lg:col-span-9">
                    <div className="glass-card border-none min-h-[600px] animate-scale-up overflow-hidden p-0">
                        {(() => {
                            const activeTabData = tabs.find(t => t.id === activeTab);
                            const ActiveIcon = activeTabData?.icon;
                            return (
                        <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-white shadow-xl border border-slate-100 flex items-center justify-center text-slate-900">
                                    {ActiveIcon && <ActiveIcon size={24} />}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{activeTabData?.label} Settings</h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeTabData?.desc}</p>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={isLoading}
                                className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-3 ${
                                    saveSuccess 
                                    ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/20' 
                                    : 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 hover:scale-105 active:scale-95'
                                }`}
                            >
                                {saveSuccess ? <Check size={16} strokeWidth={3} /> : <Save size={16} />}
                                {saveSuccess ? 'Saved' : 'Save Changes'}
                            </button>
                        </div>
                            );
                        })()}

                        <div className="p-10">

                            {/* Company Settings */}
                            {activeTab === 'company' && (
                                <div className="space-y-10 animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-3">
                                            <label className="form-label">Company Name</label>
                                            <div className="relative">
                                                <Building size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    className="form-input pl-12 font-black text-lg"
                                                    value={formData.company?.name || ''}
                                                    onChange={(e) => setFormData({ ...formData, company: { ...formData.company, name: e.target.value } })}
                                                    placeholder="Company Name"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="form-label">GST Number (GSTIN)</label>
                                            <div className="relative">
                                                <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    className="form-input pl-12 font-mono font-black uppercase tracking-widest"
                                                    value={formData.company?.gstin || ''}
                                                    onChange={(e) => setFormData({ ...formData, company: { ...formData.company, gstin: e.target.value } })}
                                                    placeholder="GST Number"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="form-label">Company Address</label>
                                        <textarea
                                            className="form-input min-h-[120px] py-4 font-bold"
                                            value={formData.company?.address || ''}
                                            onChange={(e) => setFormData({ ...formData, company: { ...formData.company, address: e.target.value } })}
                                            placeholder="Company Address"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-slate-50">
                                        <div className="space-y-3">
                                            <label className="form-label">State</label>
                                            <input
                                                type="text"
                                                className="form-input font-bold"
                                                value={formData.company?.state || ''}
                                                onChange={(e) => setFormData({ ...formData, company: { ...formData.company, state: e.target.value } })}
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="form-label">State Code</label>
                                            <input
                                                type="text"
                                                className="form-input font-black text-center"
                                                value={formData.company?.stateCode || ''}
                                                onChange={(e) => setFormData({ ...formData, company: { ...formData.company, stateCode: e.target.value } })}
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="form-label">Invoice & Voucher Prefix</label>
                                            <div className="flex gap-4">
                                                <input
                                                    type="text"
                                                    className="form-input font-black text-center"
                                                    value={formData.company?.invoicePrefix || ''}
                                                    onChange={(e) => setFormData({ ...formData, company: { ...formData.company, invoicePrefix: e.target.value } })}
                                                    placeholder="INV"
                                                />
                                                <input
                                                    type="text"
                                                    className="form-input font-black text-center"
                                                    value={formData.company?.voucherPrefix || ''}
                                                    onChange={(e) => setFormData({ ...formData, company: { ...formData.company, voucherPrefix: e.target.value } })}
                                                    placeholder="V"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Profile Settings */}
                            {activeTab === 'profile' && (
                                <div className="space-y-10 animate-fade-in max-w-2xl">
                                    <div className="flex items-center gap-8 pb-10 border-b border-slate-50">
                                        <div className="w-24 h-24 rounded-4xl bg-slate-900 text-white flex items-center justify-center text-4xl font-black shadow-2xl">
                                            {(formData.profile?.name || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black text-slate-900 tracking-tight">{formData.profile?.name || 'User Name'}</h4>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Admin User</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="form-label">Full Name</label>
                                            <input
                                                type="text"
                                                className="form-input font-bold"
                                                value={formData.profile?.name || ''}
                                                onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, name: e.target.value } })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <label className="form-label">Email Address</label>
                                                <input
                                                    type="email"
                                                    className="form-input font-bold"
                                                    value={formData.profile?.email || ''}
                                                    onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, email: e.target.value } })}
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="form-label">Phone Number</label>
                                                <input
                                                    type="text"
                                                    className="form-input font-bold"
                                                    value={formData.profile?.phone || ''}
                                                    onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, phone: e.target.value } })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Notifications Settings */}
                            {activeTab === 'notifications' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="glass-card p-8 border-none bg-slate-50/50 flex items-center justify-between group hover:bg-white hover:shadow-xl transition-all">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                    <Mail size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-900 tracking-tight">Email Alerts</h4>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Critical system alerts</p>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer"
                                                    checked={formData.notifications?.emailNotifications ?? true}
                                                    onChange={(e) => setFormData({ ...formData, notifications: { ...formData.notifications, emailNotifications: e.target.checked } })}
                                                />
                                                <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>

                                        <div className="glass-card p-8 border-none bg-slate-50/50 flex items-center justify-between group hover:bg-white hover:shadow-xl transition-all">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                                    <Smartphone size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-900 tracking-tight">SMS Alerts</h4>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Instant ledger updates</p>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer"
                                                    checked={formData.notifications?.smsNotifications ?? false}
                                                    onChange={(e) => setFormData({ ...formData, notifications: { ...formData.notifications, smsNotifications: e.target.checked } })}
                                                />
                                                <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Email Service */}
                            {activeTab === 'email' && (
                                <div className="space-y-10 animate-fade-in">
                                    <div className={`p-8 rounded-4xl border transition-all flex items-center justify-between ${emailStatus?.configured ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                        <div className="flex items-center gap-6">
                                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${emailStatus?.configured ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>
                                                {emailStatus?.configured ? <ShieldCheck size={32} /> : <AlertTriangle size={32} />}
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-slate-900 tracking-tight">
                                                    Email Service {emailStatus?.configured ? 'Ready' : 'Not Setup'}
                                                </h4>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                                    Provider: <span className="text-slate-900">{emailStatus?.provider || 'None'}</span>
                                                </p>
                                            </div>
                                        </div>
                                        {emailStatus?.configured && (
                                            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                                <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Ready</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-8 animate-fade-in">
                                        <div className="p-8 rounded-4xl bg-indigo-900 text-white overflow-hidden relative">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                                            <div className="relative z-10 flex gap-6">
                                                <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md">
                                                    <Lock size={24} className="text-indigo-300" />
                                                </div>
                                                <div className="space-y-2">
                                                    <h4 className="font-black uppercase tracking-widest text-[11px] text-indigo-300">Email Limitations</h4>
                                                    <p className="text-sm font-bold text-indigo-100/80 leading-relaxed uppercase tracking-widest text-[10px]">
                                                        By default, our email provider only allows sending to the registered account email. 
                                                        To send to anyone, you'll need to verify your business domain.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Test Email Delivery</label>
                                        <div className="flex gap-4">
                                            <div className="relative flex-1">
                                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="email"
                                                    className="form-input pl-12 py-4 font-bold"
                                                    placeholder="Enter email to test..."
                                                    value={testEmail}
                                                    onChange={(e) => setTestEmail(e.target.value)}
                                                />
                                            </div>
                                            <button 
                                                onClick={handleSendTestEmail}
                                                disabled={isSendingTest || !emailStatus?.configured}
                                                className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-600 transition-all flex items-center gap-3 disabled:opacity-50"
                                            >
                                                {isSendingTest ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
                                                Send Test
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Security Settings */}
                            {activeTab === 'security' && (
                                <div className="space-y-10 animate-fade-in max-w-2xl">
                                    <div className="glass-card p-10 border-none bg-slate-900 text-white overflow-hidden relative">
                                        <Shield size={100} className="absolute -bottom-10 -right-10 text-white/5 rotate-12" />
                                        <div className="relative z-10 space-y-6">
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
                                                    <Lock size={28} className="text-white" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xl font-black tracking-tight">Security Settings</h4>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protect your account</p>
                                                </div>
                                            </div>
                                            
                                            <div className="p-8 rounded-4xl bg-white/5 border border-white/5 backdrop-blur-md flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <h5 className="text-sm font-black">Two-Step Verification</h5>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Add an extra layer of security</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        className="sr-only peer"
                                                        checked={formData.security?.twoFactorAuth ?? false}
                                                        onChange={(e) => setFormData({ ...formData, security: { ...formData.security, twoFactorAuth: e.target.checked } })}
                                                    />
                                                    <div className="w-14 h-8 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Status</h4>
                                        <div className="space-y-3">
                                            <div className="p-4 rounded-2xl bg-slate-50 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><Check size={14} /></div>
                                                    <span className="text-xs font-black text-slate-900">Login Verified</span>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secure</span>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-slate-50 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><Check size={14} /></div>
                                                    <span className="text-xs font-black text-slate-900">Infrastructure Connection</span>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Encrypted</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Letter Pad Editor */}
                            {activeTab === 'letterpad' && (
                                <div className="space-y-10 animate-fade-in">
                                    <div className="p-8 rounded-4xl bg-slate-900 text-white flex items-center justify-between overflow-hidden relative">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                                        <div className="relative z-10">
                                            <h4 className="text-xl font-black tracking-tight">Letterhead Design</h4>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Sri Ram Fashions • Official Letterhead</p>
                                        </div>
                                        <div className="flex gap-3 relative z-10">
                                            <button onClick={handlePreviewLetterpad} className="w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all">
                                                <Eye size={20} />
                                            </button>
                                            <button onClick={handlePrint} className="w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all">
                                                <Printer size={20} />
                                            </button>
                                            <button onClick={handleDownloadLetterpad} className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:scale-110 transition-all">
                                                <Download size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="form-label">Letterhead Content</label>
                                        <div className="relative">
                                            <textarea
                                                ref={textareaRef}
                                                className="form-input min-h-[400px] p-10 font-bold leading-relaxed text-lg shadow-inner bg-slate-50/50"
                                                value={letterContent}
                                                onChange={(e) => setLetterContent(e.target.value)}
                                                placeholder="Start writing here..."
                                            />
                                            <div className="absolute bottom-6 right-8 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                                                {letterContent.length} Characters
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Backup & Restore */}
                            {activeTab === 'data' && (
                                <div className="space-y-10 animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="glass-card p-10 border-none bg-emerald-50 group hover:shadow-2xl transition-all">
                                            <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                                                <Download size={32} />
                                            </div>
                                            <h4 className="text-xl font-black text-slate-900 tracking-tight mb-2">Export Data</h4>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mb-10">
                                                Download all your business data including customer list, stock details, and sales history for safety.
                                            </p>
                                            <div className="space-y-4">
                                                <button 
                                                    className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/10"
                                                    onClick={handleBackup}
                                                    disabled={isBackingUp}
                                                >
                                                    {isBackingUp ? <Loader2 size={18} className="animate-spin" /> : <Database size={18} />}
                                                    Export Database
                                                </button>
                                                <button 
                                                    className="w-full py-5 bg-white text-emerald-700 border border-emerald-100 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-emerald-50 transition-all shadow-sm"
                                                    onClick={handlePdfBackup}
                                                    disabled={isPdfBackingUp}
                                                >
                                                    {isPdfBackingUp ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                                                    Download PDF Report
                                                </button>
                                            </div>
                                        </div>

                                        <div className="glass-card p-10 border-none bg-slate-900 group hover:shadow-2xl transition-all text-white">
                                            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md text-white flex items-center justify-center mb-8 shadow-xl group-hover:scale-110 transition-transform border border-white/5">
                                                <Upload size={32} />
                                            </div>
                                            <h4 className="text-xl font-black tracking-tight mb-2">Restore Data</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-10">
                                                Upload a previously saved database file to restore your business records.
                                            </p>
                                            <button 
                                                className="w-full py-5 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-slate-100 transition-all shadow-2xl"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isRestoring}
                                            >
                                                {isRestoring ? <Loader2 size={18} className="animate-spin" /> : <HardDrive size={18} />}
                                                Import Database
                                            </button>
                                            <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                className="hidden" 
                                                accept=".json" 
                                                onChange={handleRestore} 
                                            />
                                        </div>
                                    </div>

                                    <div className="p-10 rounded-5xl bg-rose-50 border border-rose-100 flex flex-col md:flex-row items-center justify-between gap-8 group">
                                        <div className="flex items-center gap-8">
                                            <div className="w-20 h-20 rounded-4xl bg-rose-500 text-white flex items-center justify-center shadow-2xl shadow-rose-500/20 group-hover:rotate-12 transition-transform">
                                                <Trash2 size={40} />
                                            </div>
                                            <div className="space-y-2">
                                                <h4 className="text-2xl font-black text-rose-900 tracking-tighter">Delete All Data</h4>
                                                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest max-w-sm leading-relaxed">
                                                    Permanently delete all records from the database. This cannot be undone.
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            className="px-10 py-5 bg-rose-500 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-rose-500/20 hover:bg-rose-600 transition-all active:scale-95"
                                            onClick={() => setShowFlashConfirm(true)}
                                        >
                                            Delete Now
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation */}
            {showFlashConfirm && (
                <div className="modal-overlay bg-slate-900/80 backdrop-blur-xl p-4" onClick={() => setShowFlashConfirm(false)}>
                    <div className="modal-content max-w-md border-none animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="p-12 text-center space-y-8">
                            <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto border-4 border-rose-100 animate-pulse">
                                <AlertTriangle size={48} />
                            </div>
                            <div className="space-y-4">
                                <h3 className="font-black uppercase tracking-[0.2em] text-[14px] text-rose-500">Are you sure?</h3>
                                <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-widest">
                                    You are about to <span className="text-rose-500 font-black">DELETE ALL BUSINESS DATA</span>. This will remove all customers, items, and sales records.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-6 pt-4">
                                <button className="py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all" onClick={() => setShowFlashConfirm(false)}>Abort</button>
                                <button 
                                    className="py-5 bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-rose-500/20 hover:bg-rose-600 transition-all active:scale-95 flex items-center justify-center gap-2" 
                                    onClick={handleFlash}
                                    disabled={isFlashing}
                                >
                                    {isFlashing ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
