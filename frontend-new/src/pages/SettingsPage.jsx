import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSettings, updateSettings } from '../store/slices/settingsSlice';
import { Building, User, Bell, Shield, Save, Check, FileText, Download, Eye, Printer, Database, Trash2, AlertTriangle, Loader2, Upload, Mail, Send, X } from 'lucide-react';

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
        { id: 'company', label: 'Company', icon: Building },
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'email', label: 'Email Service', icon: Mail },

        { id: 'security', label: 'Security', icon: Shield },
        { id: 'letterpad', label: 'Letter Pad', icon: FileText },
        { id: 'data', label: 'Backup', icon: Database }
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
        if (result.success) {
            toast.success(result.message);
        } else {
            toast.error(result.message);
        }
    };

    const handleBackup = async () => {

        setIsBackingUp(true);
        const result = await backupService.exportAllData();
        setIsBackingUp(false);
        if (result.success) {
            toast.success(result.message);
        } else {
            toast.error(result.message);
        }
    };

    const handleFlash = async () => {
        setIsFlashing(true);
        const result = await backupService.flashAllData();
        setIsFlashing(false);
        setShowFlashConfirm(false);
        if (result.success) {
            toast.success(result.message);
            window.location.reload();
        } else {
            toast.error(result.message);
        }
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
                    toast.success(result.message);
                    window.location.reload();
                } else {
                    toast.error(result.message);
                }
            } catch (err) {
                toast.error('Invalid backup file format');
            }
        };
        reader.readAsText(file);
    };

    const fetchEmailStatus = async () => {
        try {
            const response = await emailAPI.getStatus();
            setEmailStatus(response.data);
        } catch (error) {
            console.error('Error fetching email status:', error);
        }
    };

    const handleSendTestEmail = async () => {
        if (!testEmail || !testEmail.includes('@')) {
            toast.warning('Please enter a valid email address');
            return;
        }

        setIsSendingTest(true);
        try {
            const response = await emailAPI.sendTest(testEmail);
            if (response.data.success) {
                toast.success(response.data.message || 'Test email sent successfully!');
            } else {
                toast.error(response.data.message || 'Failed to send test email');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error sending test email');
        } finally {
            setIsSendingTest(false);
        }
    };

    const handleSave = async () => {

        await dispatch(updateSettings(formData));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    };

    const handlePreviewLetterpad = () => {
        const url = getLetterheadPreviewUrlWithContent(letterContent);
        window.open(url, '_blank');
    };

    const handleDownloadLetterpad = () => {
        downloadLetterheadWithContent(letterContent);
    };

    const handlePrint = () => {
        const url = getLetterheadPreviewUrlWithContent(letterContent);
        const printWindow = window.open(url, '_blank');
        printWindow.onload = () => {
            printWindow.print();
        };
    };

    return (
        <div className="settings-page-wrapper">
            {/* Page Header */}
            <div className="settings-page-header">
                <h1 className="settings-page-title">Settings</h1>
                <p className="settings-page-subtitle">Manage your account and preferences</p>
            </div>

            {/* Settings Layout */}
            <div className="settings-container-grid">
                {/* Sidebar Navigation */}
                <div className="settings-sidebar-nav">
                    <nav className="settings-nav-list">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    className={`settings-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    <Icon size={20} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Main Content Area */}
                <div className="settings-content-area">
                    {/* Company Settings Tab */}
                    {activeTab === 'company' && (
                        <div className="settings-panel">
                            <div className="settings-panel-header">
                                <Building size={24} className="panel-icon" />
                                <div>
                                    <h2 className="settings-panel-title">Company Settings</h2>
                                    <p className="settings-panel-desc">Manage your company information</p>
                                </div>
                            </div>

                            <div className="settings-panel-body">
                                <div className="settings-form-group">
                                    <label className="settings-label">Company Name</label>
                                    <input
                                        type="text"
                                        className="settings-input"
                                        value={formData.company?.name || ''}
                                        onChange={(e) => setFormData({ ...formData, company: { ...formData.company, name: e.target.value } })}
                                        placeholder="Enter company name"
                                    />
                                </div>

                                <div className="settings-form-group">
                                    <label className="settings-label">Address</label>
                                    <textarea
                                        className="settings-textarea"
                                        value={formData.company?.address || ''}
                                        onChange={(e) => setFormData({ ...formData, company: { ...formData.company, address: e.target.value } })}
                                        placeholder="Enter full address"
                                        rows={3}
                                    />
                                </div>

                                <div className="settings-form-row">
                                    <div className="settings-form-group">
                                        <label className="settings-label">GSTIN</label>
                                        <input
                                            type="text"
                                            className="settings-input"
                                            value={formData.company?.gstin || ''}
                                            onChange={(e) => setFormData({ ...formData, company: { ...formData.company, gstin: e.target.value } })}
                                            placeholder="Enter GSTIN"
                                        />
                                    </div>
                                    <div className="settings-form-group">
                                        <label className="settings-label">State</label>
                                        <input
                                            type="text"
                                            className="settings-input"
                                            value={formData.company?.state || ''}
                                            onChange={(e) => setFormData({ ...formData, company: { ...formData.company, state: e.target.value } })}
                                            placeholder="Enter state"
                                        />
                                    </div>
                                    <div className="settings-form-group settings-form-group-sm">
                                        <label className="settings-label">Code</label>
                                        <input
                                            type="text"
                                            className="settings-input"
                                            value={formData.company?.stateCode || ''}
                                            onChange={(e) => setFormData({ ...formData, company: { ...formData.company, stateCode: e.target.value } })}
                                            placeholder="33"
                                        />
                                    </div>
                                </div>

                                <div className="settings-form-row settings-form-row-2">
                                    <div className="settings-form-group">
                                        <label className="settings-label">Invoice Prefix</label>
                                        <input
                                            type="text"
                                            className="settings-input"
                                            value={formData.company?.invoicePrefix || ''}
                                            onChange={(e) => setFormData({ ...formData, company: { ...formData.company, invoicePrefix: e.target.value } })}
                                            placeholder="INV"
                                        />
                                    </div>
                                    <div className="settings-form-group">
                                        <label className="settings-label">Voucher Prefix</label>
                                        <input
                                            type="text"
                                            className="settings-input"
                                            value={formData.company?.voucherPrefix || ''}
                                            onChange={(e) => setFormData({ ...formData, company: { ...formData.company, voucherPrefix: e.target.value } })}
                                            placeholder="V"
                                        />
                                    </div>
                                </div>

                                <div className="settings-actions">
                                    <button
                                        className={`settings-save-btn ${saveSuccess ? 'success' : ''}`}
                                        onClick={handleSave}
                                        disabled={isLoading}
                                    >
                                        {saveSuccess ? (
                                            <>
                                                <Check size={18} />
                                                Saved Successfully!
                                            </>
                                        ) : (
                                            <>
                                                <Save size={18} />
                                                {isLoading ? 'Saving...' : 'Save Changes'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <div className="settings-panel">
                            <div className="settings-panel-header">
                                <User size={24} className="panel-icon" />
                                <div>
                                    <h2 className="settings-panel-title">Profile Settings</h2>
                                    <p className="settings-panel-desc">Update your personal information</p>
                                </div>
                            </div>

                            <div className="settings-panel-body">
                                <div className="settings-form-group">
                                    <label className="settings-label">Full Name</label>
                                    <input
                                        type="text"
                                        className="settings-input"
                                        value={formData.profile?.name || ''}
                                        onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, name: e.target.value } })}
                                        placeholder="Enter your full name"
                                    />
                                </div>

                                <div className="settings-form-row settings-form-row-2">
                                    <div className="settings-form-group">
                                        <label className="settings-label">Email Address</label>
                                        <input
                                            type="email"
                                            className="settings-input"
                                            value={formData.profile?.email || ''}
                                            onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, email: e.target.value } })}
                                            placeholder="Enter email"
                                        />
                                    </div>
                                    <div className="settings-form-group">
                                        <label className="settings-label">Phone Number</label>
                                        <input
                                            type="text"
                                            className="settings-input"
                                            value={formData.profile?.phone || ''}
                                            onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, phone: e.target.value } })}
                                            placeholder="Enter phone number"
                                        />
                                    </div>
                                </div>

                                <div className="settings-actions">
                                    <button
                                        className={`settings-save-btn ${saveSuccess ? 'success' : ''}`}
                                        onClick={handleSave}
                                        disabled={isLoading}
                                    >
                                        {saveSuccess ? (
                                            <>
                                                <Check size={18} />
                                                Saved Successfully!
                                            </>
                                        ) : (
                                            <>
                                                <Save size={18} />
                                                {isLoading ? 'Saving...' : 'Save Changes'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                        <div className="settings-panel">
                            <div className="settings-panel-header">
                                <Bell size={24} className="panel-icon" />
                                <div>
                                    <h2 className="settings-panel-title">Notification Preferences</h2>
                                    <p className="settings-panel-desc">Choose how you want to be notified</p>
                                </div>
                            </div>

                            <div className="settings-panel-body">
                                <div className="settings-toggle-group">
                                    <div className="settings-toggle-item">
                                        <div className="toggle-content">
                                            <span className="toggle-title">Email Notifications</span>
                                            <span className="toggle-desc">Receive notifications via email</span>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={formData.notifications?.emailNotifications ?? true}
                                                onChange={(e) => setFormData({ ...formData, notifications: { ...formData.notifications, emailNotifications: e.target.checked } })}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>

                                    <div className="settings-toggle-item">
                                        <div className="toggle-content">
                                            <span className="toggle-title">SMS Notifications</span>
                                            <span className="toggle-desc">Receive notifications via SMS</span>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={formData.notifications?.smsNotifications ?? false}
                                                onChange={(e) => setFormData({ ...formData, notifications: { ...formData.notifications, smsNotifications: e.target.checked } })}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>

                                <div className="settings-actions">
                                    <button
                                        className={`settings-save-btn ${saveSuccess ? 'success' : ''}`}
                                        onClick={handleSave}
                                        disabled={isLoading}
                                    >
                                        {saveSuccess ? (
                                            <>
                                                <Check size={18} />
                                                Saved Successfully!
                                            </>
                                        ) : (
                                            <>
                                                <Save size={18} />
                                                {isLoading ? 'Saving...' : 'Save Changes'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Email Service Tab */}
                    {activeTab === 'email' && (
                        <div className="settings-panel">
                            <div className="settings-panel-header">
                                <Mail size={24} className="panel-icon" />
                                <div>
                                    <h2 className="settings-panel-title">Email Configuration</h2>
                                    <p className="settings-panel-desc">Manage and test your email delivery service</p>
                                </div>
                            </div>

                            <div className="settings-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                {/* Configuration Status */}
                                <div style={{ padding: '24px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                    <h3 style={{ fontSize: '12px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Service Status</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{ padding: '12px', borderRadius: '9999px', background: emailStatus?.configured ? '#ecfdf5' : '#fffbeb', color: emailStatus?.configured ? '#059669' : '#d97706' }}>
                                                {emailStatus?.configured ? <Check size={24} /> : <AlertTriangle size={24} />}
                                            </div>
                                            <div>
                                                <p style={{ fontWeight: '700', color: '#0f172a' }}>{emailStatus?.configured ? 'Service Configured' : 'Service Not Configured'}</p>
                                                <p style={{ fontSize: '12px', color: '#64748b' }}>Provider: <span style={{ fontWeight: '700', textTransform: 'uppercase' }}>{emailStatus?.provider || 'None'}</span></p>
                                            </div>
                                        </div>
                                        {emailStatus?.configured && (
                                            <span style={{ padding: '4px 12px', borderRadius: '9999px', background: '#10b981', color: 'white', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}>Active</span>
                                        )}
                                    </div>
                                </div>

                                {/* Sandbox Warning if using Resend */}
                                {emailStatus?.provider === 'resend' && (
                                    <div style={{ padding: '24px', borderRadius: '16px', background: '#fffbeb', border: '1px solid #fef3c7', display: 'flex', gap: '16px' }}>
                                        <AlertTriangle style={{ color: '#d97706', flexShrink: 0 }} size={24} />
                                        <div>
                                            <h4 style={{ fontWeight: '700', color: '#92400e', fontSize: '14px' }}>Resend Sandbox Limitation</h4>
                                            <p style={{ fontSize: '12px', color: '#b45309', marginTop: '4px', lineHeight: '1.6' }}>
                                                By default, Resend only allows sending emails to the account owner's address. 
                                                To send to "real persons" (customers/suppliers), you must <strong>verify your domain</strong> in the Resend dashboard or use the configured <strong>SMTP fallback</strong>.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Test Email Section */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <h3 style={{ fontSize: '12px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Verify Delivery</h3>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <div style={{ position: 'relative', flex: 1 }}>
                                            <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                            <input
                                                type="email"
                                                className="settings-input"
                                                style={{ paddingLeft: '48px' }}
                                                placeholder="Enter recipient email (e.g. your personal email)"
                                                value={testEmail}
                                                onChange={(e) => setTestEmail(e.target.value)}
                                            />
                                        </div>
                                        <button 
                                            className="btn btn-primary"
                                            style={{ padding: '0 32px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                            onClick={handleSendTestEmail}
                                            disabled={isSendingTest || !emailStatus?.configured}
                                        >
                                            {isSendingTest ? (
                                                <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                            ) : <Send size={18} />}
                                            {isSendingTest ? 'Sending...' : 'Send Test Email'}
                                        </button>
                                    </div>
                                    <p style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', fontStyle: 'italic' }}>
                                        Use this to confirm that your emails are actually reaching real inboxes.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Security Tab */}

                    {activeTab === 'security' && (
                        <div className="settings-panel">
                            <div className="settings-panel-header">
                                <Shield size={24} className="panel-icon" />
                                <div>
                                    <h2 className="settings-panel-title">Security Settings</h2>
                                    <p className="settings-panel-desc">Manage your account security</p>
                                </div>
                            </div>

                            <div className="settings-panel-body">
                                <div className="settings-toggle-group">
                                    <div className="settings-toggle-item">
                                        <div className="toggle-content">
                                            <span className="toggle-title">Two-Factor Authentication</span>
                                            <span className="toggle-desc">Add an extra layer of security to your account</span>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={formData.security?.twoFactorAuth ?? false}
                                                onChange={(e) => setFormData({ ...formData, security: { ...formData.security, twoFactorAuth: e.target.checked } })}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>

                                <div className="settings-actions">
                                    <button
                                        className={`settings-save-btn ${saveSuccess ? 'success' : ''}`}
                                        onClick={handleSave}
                                        disabled={isLoading}
                                    >
                                        {saveSuccess ? (
                                            <>
                                                <Check size={18} />
                                                Saved Successfully!
                                            </>
                                        ) : (
                                            <>
                                                <Save size={18} />
                                                {isLoading ? 'Saving...' : 'Save Changes'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Letter Pad Tab */}
                    {activeTab === 'letterpad' && (
                        <div className="settings-panel letterpad-panel">
                            <div className="settings-panel-header">
                                <FileText size={24} className="panel-icon" />
                                <div>
                                    <h2 className="settings-panel-title">Letter Pad</h2>
                                    <p className="settings-panel-desc">Write and generate official letterhead documents</p>
                                </div>
                            </div>

                            <div className="settings-panel-body">
                                {/* Company Info Banner */}
                                <div className="letterpad-company-banner">
                                    <div className="company-banner-content">
                                        <h3 className="company-banner-title">Sri Ram Fashions</h3>
                                        <div className="company-banner-details">
                                            <span><strong>GSTIN:</strong> 33AZRPM4425F2ZA</span>
                                            <span><strong>Mobile:</strong> 90805 73831 / 94428 07770</span>
                                            <span><strong>Email:</strong> sriramfashionstrp@gmail.com</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Letter Content Editor */}
                                <div className="letterpad-editor-section">
                                    <label className="settings-label">Write Your Letter Content</label>
                                    <div className="letterpad-editor-wrapper">
                                        <textarea
                                            ref={textareaRef}
                                            className="letterpad-textarea"
                                            value={letterContent}
                                            onChange={(e) => setLetterContent(e.target.value)}
                                            placeholder="Start typing your letter content here...&#10;&#10;Example:&#10;&#10;Sub: Order Confirmation&#10;&#10;Dear Sir/Madam,&#10;&#10;We are pleased to confirm your order for the following items...&#10;&#10;Thank you for your business.&#10;&#10;Regards,&#10;Sri Ram Fashions"
                                            rows={16}
                                        />
                                        <div className="letterpad-char-count">
                                            {letterContent.length} characters
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="letterpad-action-buttons">
                                    <button
                                        className="letterpad-action-btn preview"
                                        onClick={handlePreviewLetterpad}
                                    >
                                        <Eye size={18} />
                                        Preview
                                    </button>
                                    <button
                                        className="letterpad-action-btn print"
                                        onClick={handlePrint}
                                    >
                                        <Printer size={18} />
                                        Print
                                    </button>
                                    <button
                                        className="letterpad-action-btn download"
                                        onClick={handleDownloadLetterpad}
                                    >
                                        <Download size={18} />
                                        Download PDF
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Data Management Tab */}
                    {activeTab === 'data' && (
                        <div className='settings-panel'>
                            <div className='settings-panel-header'>
                                <Database size={24} className='panel-icon' />
                                <div>
                                    <h2 className='settings-panel-title'>Data Management</h2>
                                    <p className='settings-panel-desc'>Backup and manage your application data</p>
                                </div>
                            </div>

                            <div className='settings-panel-body'>
                                <div className='data-management-grid'>
                                    <div className='data-action-card'>
                                        <div className='action-card-icon backup'>
                                            <Download size={24} />
                                        </div>
                                        <div className='action-card-content'>
                                            <h3 className='action-title'>Backup All Data</h3>
                                            <p className='action-desc'>Download a complete backup of all your customers, products, and bills in JSON format.</p>
                                            <button 
                                                className='btn btn-primary mt-4' 
                                                onClick={handleBackup}

                                                disabled={isBackingUp}
                                            >
                                                {isBackingUp ? <Loader2 size={18} className='animate-spin' /> : <Download size={18} />}
                                                {isBackingUp ? 'Backing up...' : 'Download Backup'}
                                            </button>
                                            <button 
                                                className='btn btn-ghost border mt-2 w-full flex items-center justify-center gap-2' 
                                                onClick={handlePdfBackup}
                                                disabled={isPdfBackingUp}
                                            >
                                                {isPdfBackingUp ? <Loader2 size={18} className='animate-spin' /> : <FileText size={18} />}
                                                {isPdfBackingUp ? 'Generating PDF...' : 'Download PDF Report'}
                                            </button>

                                        </div>
                                    </div>

                                    <div className='data-action-card'>
                                        <div className='action-card-icon restore'>
                                            <Upload size={24} />
                                        </div>
                                        <div className='action-card-content'>
                                            <h3 className='action-title'>Restore Backup</h3>
                                            <p className='action-desc'>Upload a previously saved backup file to restore your data. <strong>Warning: This may overwrite existing data.</strong></p>
                                            <button 
                                                className='btn btn-ghost border mt-4'
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isRestoring}
                                            >
                                                {isRestoring ? <Loader2 size={18} className='animate-spin' /> : <Upload size={18} />}
                                                {isRestoring ? 'Restoring...' : 'Upload & Restore'}
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

                                    <div className='data-action-card danger'>
                                        <div className='action-card-icon flash'>
                                            <Trash2 size={24} />
                                        </div>
                                        <div className='action-card-content'>
                                            <h3 className='action-title'>Flash (Clear All Data)</h3>
                                            <p className='action-desc'>Permanently delete all records from the database. This action cannot be undone.</p>
                                            <button 
                                                className='btn btn-danger mt-4'
                                                onClick={() => setShowFlashConfirm(true)}
                                            >
                                                <Trash2 size={18} />
                                                Flash Data
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {showFlashConfirm && (
                                    <div className='modal-backdrop'>
                                        <div className='modal-content max-w-md'>
                                            <div className='flex items-center gap-3 text-red-600 mb-4'>
                                                <AlertTriangle size={24} />
                                                <h3 className='text-xl font-bold'>Dangerous Action!</h3>
                                            </div>
                                            <p className='text-gray-600 mb-6'>
                                                Are you absolutely sure you want to <strong>FLASH ALL DATA</strong>? This will delete all customers, bills, products, and settings. This cannot be undone.
                                            </p>
                                            <div className='flex justify-end gap-3'>
                                                <button className='btn btn-secondary' onClick={() => setShowFlashConfirm(false)}>Cancel</button>
                                                <button 
                                                    className='btn btn-danger' 
                                                    onClick={handleFlash}
                                                    disabled={isFlashing}
                                                >
                                                    {isFlashing ? <Loader2 size={18} className='animate-spin' /> : 'Yes, Flash All Data'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .settings-page-wrapper {
                    padding: 24px;
                    max-width: 1400px;
                    margin: 0 auto;
                }

                .settings-page-header {
                    margin-bottom: 32px;
                }

                .settings-page-title {
                    font-size: 28px;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0 0 8px 0;
                }

                .settings-page-subtitle {
                    font-size: 15px;
                    color: #64748b;
                    margin: 0;
                }

                .settings-container-grid {
                    display: grid;
                    grid-template-columns: 240px 1fr;
                    gap: 32px;
                    align-items: start;
                }

                /* Sidebar Navigation */
                .settings-sidebar-nav {
                    position: sticky;
                    top: 24px;
                }

                .settings-nav-list {
                    background: white;
                    border-radius: 16px;
                    padding: 8px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05);
                    border: 1px solid #e2e8f0;
                }

                .settings-nav-btn {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px 16px;
                    background: transparent;
                    border: none;
                    border-radius: 10px;
                    font-size: 15px;
                    font-weight: 500;
                    color: #64748b;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-align: left;
                }

                .settings-nav-btn:hover {
                    background: #f1f5f9;
                    color: #334155;
                }

                .settings-nav-btn.active {
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color: white;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                }

                .settings-nav-btn.active svg {
                    color: white;
                }

                /* Content Area */
                .settings-content-area {
                    min-height: 500px;
                }

                .settings-panel {
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05);
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                }

                .settings-panel-header {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 24px;
                    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                    border-bottom: 1px solid #e2e8f0;
                }

                .panel-icon {
                    color: #3b82f6;
                    flex-shrink: 0;
                }

                .settings-panel-title {
                    font-size: 20px;
                    font-weight: 600;
                    color: #1e293b;
                    margin: 0;
                }

                .settings-panel-desc {
                    font-size: 14px;
                    color: #64748b;
                    margin: 4px 0 0 0;
                }

                .settings-panel-body {
                    padding: 24px;
                }

                /* Form Styles */
                .settings-form-group {
                    margin-bottom: 20px;
                }

                .settings-form-group-sm {
                    max-width: 100px;
                }

                .settings-label {
                    display: block;
                    font-size: 14px;
                    font-weight: 600;
                    color: #334155;
                    margin-bottom: 8px;
                }

                .settings-input {
                    width: 100%;
                    padding: 12px 16px;
                    font-size: 15px;
                    border: 2px solid #e2e8f0;
                    border-radius: 10px;
                    background: #f8fafc;
                    color: #1e293b;
                    transition: all 0.2s ease;
                }

                .settings-input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    background: white;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .settings-input::placeholder {
                    color: #94a3b8;
                }

                .settings-textarea {
                    width: 100%;
                    padding: 12px 16px;
                    font-size: 15px;
                    border: 2px solid #e2e8f0;
                    border-radius: 10px;
                    background: #f8fafc;
                    color: #1e293b;
                    resize: vertical;
                    font-family: inherit;
                    transition: all 0.2s ease;
                }

                .settings-textarea:focus {
                    outline: none;
                    border-color: #3b82f6;
                    background: white;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .settings-form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr 100px;
                    gap: 16px;
                }

                .settings-form-row-2 {
                    grid-template-columns: 1fr 1fr;
                }

                /* Toggle Styles */
                .settings-toggle-group {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .settings-toggle-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 20px;
                    background: #f8fafc;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                }

                .toggle-content {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .toggle-title {
                    font-size: 15px;
                    font-weight: 600;
                    color: #1e293b;
                }

                .toggle-desc {
                    font-size: 13px;
                    color: #64748b;
                }

                .toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 52px;
                    height: 28px;
                }

                .toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #cbd5e1;
                    border-radius: 28px;
                    transition: 0.3s;
                }

                .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 22px;
                    width: 22px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    border-radius: 50%;
                    transition: 0.3s;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }

                .toggle-switch input:checked + .toggle-slider {
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                }

                .toggle-switch input:checked + .toggle-slider:before {
                    transform: translateX(24px);
                }

                /* Action Buttons */
                .settings-actions {
                    margin-top: 28px;
                    padding-top: 20px;
                    border-top: 1px solid #e2e8f0;
                }

                .settings-save-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    padding: 14px 28px;
                    font-size: 15px;
                    font-weight: 600;
                    color: white;
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
                }

                .settings-save-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
                }

                .settings-save-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }

                .settings-save-btn.success {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
                }

                /* Letter Pad Specific Styles */
                .letterpad-panel .settings-panel-body {
                    padding: 0;
                }

                .letterpad-company-banner {
                    background: linear-gradient(135deg, #1e3a5f 0%, #283c5c 100%);
                    padding: 24px;
                    color: white;
                }

                .company-banner-title {
                    font-size: 24px;
                    font-weight: 700;
                    margin: 0 0 12px 0;
                    font-style: italic;
                }

                .company-banner-details {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 20px;
                    font-size: 14px;
                    opacity: 0.9;
                }

                .company-banner-details span {
                    display: inline-flex;
                    gap: 6px;
                }

                .letterpad-editor-section {
                    padding: 24px;
                }

                .letterpad-editor-wrapper {
                    position: relative;
                }

                .letterpad-textarea {
                    width: 100%;
                    min-height: 400px;
                    padding: 20px;
                    font-size: 15px;
                    line-height: 1.8;
                    border: 2px solid #e2e8f0;
                    border-radius: 12px;
                    background: #fefefe;
                    color: #1e293b;
                    resize: vertical;
                    font-family: 'Georgia', serif;
                    transition: all 0.2s ease;
                }

                .letterpad-textarea:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .letterpad-textarea::placeholder {
                    color: #94a3b8;
                    font-style: italic;
                }

                .letterpad-char-count {
                    position: absolute;
                    bottom: 12px;
                    right: 16px;
                    font-size: 12px;
                    color: #94a3b8;
                    background: #f8fafc;
                    padding: 4px 10px;
                    border-radius: 6px;
                }

                .letterpad-action-buttons {
                    display: flex;
                    gap: 12px;
                    padding: 20px 24px;
                    background: #f8fafc;
                    border-top: 1px solid #e2e8f0;
                }

                .letterpad-action-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    padding: 14px 24px;
                    font-size: 15px;
                    font-weight: 600;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .letterpad-action-btn.preview {
                    background: white;
                    color: #475569;
                    border: 2px solid #e2e8f0;
                }

                .letterpad-action-btn.preview:hover {
                    background: #f1f5f9;
                    border-color: #cbd5e1;
                }

                .letterpad-action-btn.print {
                    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                    color: white;
                    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
                }

                .letterpad-action-btn.print:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 16px rgba(139, 92, 246, 0.35);
                }

                .letterpad-action-btn.download {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
                }

                .letterpad-action-btn.download:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);
                }

                .data-management-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 24px;
                    margin-top: 20px;
                }

                .data-action-card {
                    display: flex;
                    gap: 20px;
                    padding: 24px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    transition: all 0.2s ease;
                }

                .data-action-card:hover {
                    border-color: #cbd5e1;
                    background: #f1f5f9;
                    transform: translateY(-2px);
                }

                .data-action-card.danger:hover {
                    border-color: #fee2e2;
                    background: #fffafa;
                }

                .action-card-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .action-card-icon.backup {
                    background: #e0f2fe;
                    color: #0284c7;
                }

                .action-card-icon.restore {
                    background: #f0f9ff;
                    color: #0ea5e9;
                }

                .action-card-icon.flash {
                    background: #fee2e2;
                    color: #dc2626;
                }

                .action-card-content {
                    flex: 1;
                }

                .action-title {
                    font-size: 16px;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0 0 8px 0;
                }

                .action-desc {
                    font-size: 14px;
                    color: #64748b;
                    margin: 0;
                    line-height: 1.5;
                }

                .modal-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(4px);
                }

                .modal-content {
                    background: white;
                    padding: 32px;
                    border-radius: 20px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                }

                /* Responsive Styles */
                @media (max-width: 1024px) {
                    .data-management-grid {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 900px) {
                    .settings-container-grid {
                        grid-template-columns: 1fr;
                        gap: 20px;
                    }

                    .settings-sidebar-nav {
                        position: static;
                    }

                    .settings-nav-list {
                        display: flex;
                        overflow-x: auto;
                        gap: 8px;
                        padding: 8px;
                    }

                    .settings-nav-btn {
                        flex-shrink: 0;
                        padding: 12px 16px;
                    }

                    .settings-form-row {
                        grid-template-columns: 1fr;
                    }

                    .settings-form-row-2 {
                        grid-template-columns: 1fr;
                    }

                    .letterpad-action-buttons {
                        flex-direction: column;
                    }

                    .letterpad-action-btn {
                        justify-content: center;
                    }

                    .company-banner-details {
                        flex-direction: column;
                        gap: 8px;
                    }
                }

                @media (max-width: 640px) {
                    .settings-page-wrapper {
                        padding: 16px;
                    }

                    .settings-page-title {
                        font-size: 24px;
                    }

                    .settings-panel-header {
                        padding: 16px;
                    }

                    .settings-panel-body {
                        padding: 16px;
                    }

                    .letterpad-editor-section {
                        padding: 16px;
                    }

                    .letterpad-action-buttons {
                        padding: 16px;
                    }
                }
            `}</style>
        </div>
    );
};

export default SettingsPage;
