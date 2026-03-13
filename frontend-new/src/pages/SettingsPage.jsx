import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSettings, updateSettings } from '../store/slices/settingsSlice';
import { Building, User, Bell, Shield, Save, Check, FileText, Download, Eye, Printer } from 'lucide-react';
import { useToast } from '../components/common';
import { downloadLetterheadWithContent, getLetterheadPreviewUrlWithContent } from '../utils/letterheadGenerator';

const SettingsPage = () => {
    const toast = useToast();
    const dispatch = useDispatch();
    const { data: settings, isLoading } = useSelector((state) => state.settings);
    const [activeTab, setActiveTab] = useState('company');
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

    useEffect(() => { dispatch(fetchSettings()); }, [dispatch]);
    useEffect(() => { if (settings) setFormData(prev => ({ ...prev, ...settings })); }, [settings]);

    const tabs = [
        { id: 'company', label: 'Company', icon: Building },
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'letterpad', label: 'Letter Pad', icon: FileText }
    ];

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

                /* Responsive Styles */
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
