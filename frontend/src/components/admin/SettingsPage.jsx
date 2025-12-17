import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin.js';
import { useAdminStore } from '../../store/useAdminStore';
import { toast } from 'react-hot-toast';
import {
  FiSettings,
  FiSave,
  FiRefreshCw,
  FiGlobe,
  FiLock,
  FiMail,
  FiUsers,
  FiBell,
  FiShield,
  FiDatabase,
  FiUpload,
  FiImage,
  FiMoon,
  FiSun,
  FiChevronDown,
  FiChevronUp,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiEyeOff
} from 'react-icons/fi';

const SettingsPage = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [expandedSections, setExpandedSections] = useState(['general']);
  const [showSecret, setShowSecret] = useState(false);

  const { setSettings: updateStoreSettings } = useAdminStore();

  const tabs = [
    { id: 'general', name: 'General', icon: <FiGlobe /> },
    { id: 'security', name: 'Security', icon: <FiShield /> },
    { id: 'email', name: 'Email', icon: <FiMail /> },
    { id: 'users', name: 'Users', icon: <FiUsers /> },
    { id: 'notifications', name: 'Notifications', icon: <FiBell /> },
    { id: 'storage', name: 'Storage', icon: <FiDatabase /> },
    { id: 'appearance', name: 'Appearance', icon: <FiSun /> }
  ];

  const defaultSettings = {
    general: {
      siteName: 'Vorkana Platform',
      siteDescription: 'Freelance Services Marketplace',
      siteUrl: 'https://vorkana.com',
      timezone: 'UTC',
      language: 'en',
      currency: 'USD',
      maintenanceMode: false
    },
    security: {
      requireEmailVerification: true,
      require2FA: false,
      maxLoginAttempts: 5,
      sessionTimeout: 30,
      passwordMinLength: 8,
      enableRateLimiting: true,
      enableCSRF: true,
      enableCSP: true
    },
    email: {
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPass: '',
      fromEmail: 'noreply@vorkana.com',
      fromName: 'Vorkana Platform',
      emailDriver: 'smtp'
    },
    users: {
      allowRegistration: true,
      emailConfirmation: true,
      defaultUserRole: 'user',
      enableUserProfile: true,
      maxAvatarSize: 2048,
      allowedAvatarTypes: 'jpg,jpeg,png,gif'
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: false,
      adminEmailAlerts: true,
      securityAlerts: true,
      systemAlerts: true
    },
    storage: {
      storageDriver: 'local',
      s3Bucket: '',
      s3Region: '',
      s3Key: '',
      s3Secret: '',
      maxFileSize: 5120,
      allowedFileTypes: 'jpg,jpeg,png,gif,pdf,doc,docx,txt'
    },
    appearance: {
      theme: 'light',
      primaryColor: '#4F46E5',
      secondaryColor: '#10B981',
      enableDarkMode: true,
      customCSS: '',
      customLogo: '',
      favicon: ''
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getSettings();
      if (response.data.success) {
        const loadedSettings = response.data.data || {};
        setSettings({ ...defaultSettings, ...loadedSettings });
        updateStoreSettings(loadedSettings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
      // Load default settings
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await adminAPI.updateSettings(settings);
      if (response.data.success) {
        toast.success('Settings saved successfully');
        updateStoreSettings(settings);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleReset = (category) => {
    setSettings(prev => ({
      ...prev,
      [category]: defaultSettings[category]
    }));
    toast.success(`${category} settings reset to default`);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const renderSettingField = (category, key, label, type = 'text', options = []) => {
    const value = settings[category]?.[key] || '';
    
    const renderInput = () => {
      switch (type) {
        case 'textarea':
          return (
            <textarea
              value={value}
              onChange={(e) => handleSettingChange(category, key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              rows="4"
            />
          );
        
        case 'select':
          return (
            <select
              value={value}
              onChange={(e) => handleSettingChange(category, key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          );
        
        case 'checkbox':
          return (
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => handleSettingChange(category, key, e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">{label}</span>
            </div>
          );
        
        case 'password':
          return (
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={value}
                onChange={(e) => handleSettingChange(category, key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showSecret ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
              </button>
            </div>
          );
        
        default:
          return (
            <input
              type={type}
              value={value}
              onChange={(e) => handleSettingChange(category, key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          );
      }
    };

    return (
      <div className="space-y-2">
        {type !== 'checkbox' && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        {renderInput()}
      </div>
    );
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Configure system settings and preferences</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchSettings}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <FiRefreshCw className="h-4 w-4" />
            <span>Reload</span>
          </button>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <FiSave className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Settings Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
              <button
                onClick={() => handleReset('general')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Reset to Default
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderSettingField('general', 'siteName', 'Site Name')}
              {renderSettingField('general', 'siteDescription', 'Site Description')}
              {renderSettingField('general', 'siteUrl', 'Site URL')}
              {renderSettingField('general', 'timezone', 'Timezone', 'select', [
                { value: 'UTC', label: 'UTC' },
                { value: 'America/New_York', label: 'Eastern Time' },
                { value: 'America/Chicago', label: 'Central Time' },
                { value: 'America/Denver', label: 'Mountain Time' },
                { value: 'America/Los_Angeles', label: 'Pacific Time' }
              ])}
              {renderSettingField('general', 'language', 'Language', 'select', [
                { value: 'en', label: 'English' },
                { value: 'es', label: 'Spanish' },
                { value: 'fr', label: 'French' }
              ])}
              {renderSettingField('general', 'currency', 'Currency', 'select', [
                { value: 'USD', label: 'US Dollar ($)' },
                { value: 'EUR', label: 'Euro (€)' },
                { value: 'GBP', label: 'British Pound (£)' }
              ])}
            </div>
            
            <div className="border-t border-gray-200 pt-6">
              {renderSettingField('general', 'maintenanceMode', 'Enable Maintenance Mode', 'checkbox')}
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
              <button
                onClick={() => handleReset('security')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Reset to Default
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderSettingField('security', 'requireEmailVerification', 'Require Email Verification', 'checkbox')}
              {renderSettingField('security', 'require2FA', 'Require Two-Factor Authentication', 'checkbox')}
              {renderSettingField('security', 'maxLoginAttempts', 'Max Login Attempts', 'number')}
              {renderSettingField('security', 'sessionTimeout', 'Session Timeout (minutes)', 'number')}
              {renderSettingField('security', 'passwordMinLength', 'Minimum Password Length', 'number')}
              {renderSettingField('security', 'enableRateLimiting', 'Enable Rate Limiting', 'checkbox')}
              {renderSettingField('security', 'enableCSRF', 'Enable CSRF Protection', 'checkbox')}
              {renderSettingField('security', 'enableCSP', 'Enable Content Security Policy', 'checkbox')}
            </div>
          </div>
        )}

        {activeTab === 'email' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Email Settings</h3>
              <button
                onClick={() => handleReset('email')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Reset to Default
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderSettingField('email', 'emailDriver', 'Email Driver', 'select', [
                { value: 'smtp', label: 'SMTP' },
                { value: 'mailgun', label: 'Mailgun' },
                { value: 'ses', label: 'Amazon SES' }
              ])}
              {renderSettingField('email', 'smtpHost', 'SMTP Host')}
              {renderSettingField('email', 'smtpPort', 'SMTP Port', 'number')}
              {renderSettingField('email', 'smtpUser', 'SMTP Username')}
              {renderSettingField('email', 'smtpPass', 'SMTP Password', 'password')}
              {renderSettingField('email', 'fromEmail', 'From Email')}
              {renderSettingField('email', 'fromName', 'From Name')}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">User Settings</h3>
              <button
                onClick={() => handleReset('users')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Reset to Default
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderSettingField('users', 'allowRegistration', 'Allow User Registration', 'checkbox')}
              {renderSettingField('users', 'emailConfirmation', 'Require Email Confirmation', 'checkbox')}
              {renderSettingField('users', 'defaultUserRole', 'Default User Role', 'select', [
                { value: 'user', label: 'User' },
                { value: 'buyer', label: 'Buyer' },
                { value: 'seller', label: 'Seller' }
              ])}
              {renderSettingField('users', 'enableUserProfile', 'Enable User Profiles', 'checkbox')}
              {renderSettingField('users', 'maxAvatarSize', 'Max Avatar Size (KB)', 'number')}
              {renderSettingField('users', 'allowedAvatarTypes', 'Allowed Avatar Types')}
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
              <button
                onClick={() => handleReset('notifications')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Reset to Default
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              {renderSettingField('notifications', 'emailNotifications', 'Enable Email Notifications', 'checkbox')}
              {renderSettingField('notifications', 'pushNotifications', 'Enable Push Notifications', 'checkbox')}
              {renderSettingField('notifications', 'adminEmailAlerts', 'Send Admin Email Alerts', 'checkbox')}
              {renderSettingField('notifications', 'securityAlerts', 'Send Security Alerts', 'checkbox')}
              {renderSettingField('notifications', 'systemAlerts', 'Send System Alerts', 'checkbox')}
            </div>
          </div>
        )}

        {activeTab === 'storage' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Storage Settings</h3>
              <button
                onClick={() => handleReset('storage')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Reset to Default
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderSettingField('storage', 'storageDriver', 'Storage Driver', 'select', [
                { value: 'local', label: 'Local Storage' },
                { value: 's3', label: 'Amazon S3' },
                { value: 'cloudinary', label: 'Cloudinary' }
              ])}
              {renderSettingField('storage', 's3Bucket', 'S3 Bucket')}
              {renderSettingField('storage', 's3Region', 'S3 Region')}
              {renderSettingField('storage', 's3Key', 'S3 Access Key')}
              {renderSettingField('storage', 's3Secret', 'S3 Secret Key', 'password')}
              {renderSettingField('storage', 'maxFileSize', 'Max File Size (KB)', 'number')}
              {renderSettingField('storage', 'allowedFileTypes', 'Allowed File Types')}
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Appearance Settings</h3>
              <button
                onClick={() => handleReset('appearance')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Reset to Default
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderSettingField('appearance', 'theme', 'Theme', 'select', [
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'auto', label: 'Auto' }
              ])}
              {renderSettingField('appearance', 'primaryColor', 'Primary Color', 'color')}
              {renderSettingField('appearance', 'secondaryColor', 'Secondary Color', 'color')}
              {renderSettingField('appearance', 'enableDarkMode', 'Enable Dark Mode', 'checkbox')}
            </div>
            
            <div>
              {renderSettingField('appearance', 'customCSS', 'Custom CSS', 'textarea')}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Logo
                </label>
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center">
                    {settings.appearance?.customLogo ? (
                      <img src={settings.appearance.customLogo} alt="Logo" className="h-full w-full object-contain" />
                    ) : (
                      <FiImage className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <FiUpload className="h-4 w-4 inline mr-2" />
                    Upload
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Favicon
                </label>
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center">
                    {settings.appearance?.favicon ? (
                      <img src={settings.appearance.favicon} alt="Favicon" className="h-full w-full object-contain" />
                    ) : (
                      <FiImage className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <FiUpload className="h-4 w-4 inline mr-2" />
                    Upload
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Bar */}
      <div className="sticky bottom-6 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              Changes made to settings will take effect immediately after saving.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setSettings(defaultSettings)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Reset All
            </button>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving Changes...' : 'Save All Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage