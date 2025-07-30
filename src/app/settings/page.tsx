'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Bell, Mail, Shield, User, Save, RefreshCw, DollarSign } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'
import { currencies } from '@/lib/currency'
import { useCurrency } from '@/hooks/useCurrency'
import AlertModal from '@/components/AlertModal'
import ConfirmModal from '@/components/ConfirmModal'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useModal } from '@/hooks/useModal'

interface BudgetAlert {
  budgetId: string
  categoryName: string
  amount: number
  currentSpending: number
  percentUsed: number
  period: string
  alertLevel: 'normal' | 'warning' | 'exceeded'
}

interface BudgetAlertsData {
  budgetAlerts: BudgetAlert[]
  totalBudgets: number
  alertsCount: number
}

export default function Settings() {
  const { data: session } = useSession()
  const { formatAmount } = useCurrency()
  const { alertModal, confirmModal, showAlert, showConfirm, closeAlert, closeConfirm } = useModal()
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlertsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [saveSettingsLoading, setSaveSettingsLoading] = useState(false)
  const [settings, setSettings] = useState({
    emailNotifications: true,
    budgetAlerts: true,
    weeklyReports: false,
    monthlyReports: true,
    currency: 'INR'
  })

  useEffect(() => {
    if (session) {
      fetchBudgetAlerts()
      loadSettings()
    }
  }, [session])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/user/settings')
      if (response.ok) {
        const data = await response.json()
        const savedCurrency = data.preferredCurrency || 'INR'
        console.log('Loading saved currency from backend:', savedCurrency) // Debug log
        setSettings(prev => ({ ...prev, currency: savedCurrency }))
      } else {
        // Fallback to default
        setSettings(prev => ({ ...prev, currency: 'INR' }))
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      // Fallback to default
      setSettings(prev => ({ ...prev, currency: 'INR' }))
    }
  }

  const fetchBudgetAlerts = async () => {
    try {
      const response = await fetch('/api/budget-alerts')
      if (response.ok) {
        const data = await response.json()
        setBudgetAlerts(data)
      }
    } catch (error) {
      console.error('Error fetching budget alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTestNotifications = async () => {
    setProcessing(true)
    try {
      const response = await fetch('/api/budget-alerts', {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        showAlert({
          title: 'Budget Alerts Processed',
          message: `${result.message}\nNotifications sent: ${result.notificationsSent}`,
          type: 'success'
        })
        fetchBudgetAlerts()
      } else {
        const error = await response.json()
        showAlert({
          title: 'Error',
          message: error.error || 'Failed to process budget alerts',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error processing budget alerts:', error)
      showAlert({
        title: 'Error',
        message: 'Something went wrong while processing budget alerts.',
        type: 'error'
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaveSettingsLoading(true)
    try {
      // Save currency preference to backend
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferredCurrency: settings.currency
        })
      })

      if (response.ok) {
        // Trigger currency update throughout the app
        window.dispatchEvent(new CustomEvent('currencyChanged', { detail: settings.currency }))
        showAlert({
          title: 'Success',
          message: 'Settings saved successfully!',
          type: 'success'
        })
      } else {
        const error = await response.json()
        showAlert({
          title: 'Error',
          message: error.error || 'Failed to save settings',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      showAlert({
        title: 'Error',
        message: 'Failed to save settings. Please try again.',
        type: 'error'
      })
    } finally {
      setSaveSettingsLoading(false)
    }
  }

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'exceeded': return 'text-status-error'
      case 'warning': return 'text-status-warning'
      default: return 'text-status-success'
    }
  }

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'exceeded': return '🚨'
      case 'warning': return '⚠️'
      default: return '✅'
    }
  }

  if (loading) {
    return <CurrencyLoader />
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-heading">Settings</h1>
        <p className="mt-2 text-sm text-body">
          Configure your account preferences and notifications
        </p>
      </div>

      <div className="space-y-8">
        {/* Profile Settings */}
        <div className="bg-card shadow-card rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <User className="h-5 w-5 text-muted mr-2" />
              <h3 className="text-lg font-medium leading-6 text-heading">
                Profile Information
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div>
                <label className="block text-sm font-medium text-input-label mb-3">
                  Name
                </label>
                <input
                  type="text"
                  value={session?.user?.name || ''}
                  disabled
                  className="block w-full px-4 py-3 border-input rounded-lg shadow-sm bg-input text-input text-base transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-input-label mb-3">
                  Email
                </label>
                <input
                  type="email"
                  value={session?.user?.email || ''}
                  disabled
                  className="block w-full px-4 py-3 border-input rounded-lg shadow-sm bg-input text-input text-base transition-all duration-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Currency Settings */}
        <div className="bg-card shadow-card rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <DollarSign className="h-5 w-5 text-muted mr-2" />
              <h3 className="text-lg font-medium leading-6 text-heading">
                Currency Settings
              </h3>
            </div>
            <div>
              <label className="block text-sm font-medium text-input-label mb-3">
                Preferred Currency
              </label>
              <p className="text-sm text-muted mb-4">
                Choose the currency symbol to display throughout the application
              </p>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({...settings, currency: e.target.value})}
                className="block w-full max-w-xs px-4 py-3 border-input rounded-lg shadow-sm bg-input text-input text-base focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none bg-arrow-down bg-no-repeat bg-right bg-origin-content"
              >
                {currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.symbol} - {currency.name} ({currency.code})
                  </option>
                ))}
              </select>
              <div className="mt-3 flex items-center text-sm text-muted">
                <span className="mr-2">Preview:</span>
                <span className="font-medium text-heading">
                  {currencies.find(c => c.code === settings.currency)?.symbol}100.00
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-card shadow-card rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-muted mr-2" />
                <h3 className="text-lg font-medium leading-6 text-heading">
                  Notification Preferences
                </h3>
              </div>
              <button
                onClick={handleTestNotifications}
                disabled={processing}
                className="inline-flex items-center px-4 py-2 border border-input text-sm font-medium rounded-md text-input-label bg-button-secondary hover:bg-button-secondary-hover disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${processing ? 'animate-spin' : ''}`} />
                {processing ? 'Processing...' : 'Test Notifications'}
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <label className="text-sm font-medium text-input-label">
                    Email Notifications
                  </label>
                  <p className="text-sm text-muted">
                    Receive notifications via email
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-input rounded transition-all duration-200"
                />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <label className="text-sm font-medium text-input-label">
                    Budget Alerts
                  </label>
                  <p className="text-sm text-muted">
                    Get notified when budgets reach 80% or are exceeded
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.budgetAlerts}
                  onChange={(e) => setSettings({...settings, budgetAlerts: e.target.checked})}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-input rounded transition-all duration-200"
                />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <label className="text-sm font-medium text-input-label">
                    Weekly Reports
                  </label>
                  <p className="text-sm text-muted">
                    Receive weekly spending summaries
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.weeklyReports}
                  onChange={(e) => setSettings({...settings, weeklyReports: e.target.checked})}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-input rounded transition-all duration-200"
                />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <div>
                  <label className="text-sm font-medium text-input-label">
                    Monthly Reports
                  </label>
                  <p className="text-sm text-muted">
                    Receive monthly spending summaries
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.monthlyReports}
                  onChange={(e) => setSettings({...settings, monthlyReports: e.target.checked})}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-input rounded transition-all duration-200"
                />
              </div>
            </div>
            
            <div className="mt-8">
              <button
                onClick={handleSaveSettings}
                disabled={saveSettingsLoading}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all duration-200"
              >
                {saveSettingsLoading ? <LoadingSpinner size="sm" /> : <Save className="h-5 w-5 mr-2" />}
                {saveSettingsLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>

        {/* Budget Alerts Status */}
        {budgetAlerts && (
          <div className="bg-card shadow-card rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center mb-4">
                <Mail className="h-5 w-5 text-muted mr-2" />
                <h3 className="text-lg font-medium leading-6 text-heading">
                  Budget Alert Status
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-heading">
                    {budgetAlerts.totalBudgets}
                  </div>
                  <div className="text-sm text-muted">
                    Total Budgets
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-status-warning">
                    {budgetAlerts.alertsCount}
                  </div>
                  <div className="text-sm text-muted">
                    Active Alerts
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-status-success">
                    {budgetAlerts.totalBudgets - budgetAlerts.alertsCount}
                  </div>
                  <div className="text-sm text-muted">
                    On Track
                  </div>
                </div>
              </div>

              {budgetAlerts.budgetAlerts.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-input-label">
                    Current Budget Status
                  </h4>
                  {budgetAlerts.budgetAlerts.map((alert) => (
                    <div key={alert.budgetId} className="flex items-center justify-between p-3 border border-card-border rounded-lg">
                      <div className="flex items-center">
                        <span className="text-lg mr-3">{getAlertIcon(alert.alertLevel)}</span>
                        <div>
                          <div className="text-sm font-medium text-heading">
                            {alert.categoryName}
                          </div>
                          <div className="text-xs text-muted">
                            {formatAmount(alert.currentSpending)} of {formatAmount(alert.amount)} ({alert.period})
                          </div>
                        </div>
                      </div>
                      <div className={`text-sm font-medium ${getAlertColor(alert.alertLevel)}`}>
                        {alert.percentUsed.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security Settings */}
        <div className="bg-card shadow-card rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <Shield className="h-5 w-5 text-muted mr-2" />
              <h3 className="text-lg font-medium leading-6 text-heading">
                Security
              </h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-input-label">
                  Change Password
                </label>
                <p className="text-sm text-muted mb-2">
                  Update your account password
                </p>
                <button className="inline-flex items-center px-4 py-2 border border-input text-sm font-medium rounded-md text-input-label bg-button-secondary hover:bg-button-secondary-hover">
                  Change Password
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-input-label">
                  Two-Factor Authentication
                </label>
                <p className="text-sm text-muted mb-2">
                  Add an extra layer of security to your account
                </p>
                <button className="inline-flex items-center px-4 py-2 border border-input text-sm font-medium rounded-md text-input-label bg-button-secondary hover:bg-button-secondary-hover">
                  Enable 2FA
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Modal */}
      {alertModal && (
        <AlertModal
          isOpen={alertModal.isOpen}
          onClose={closeAlert}
          title={alertModal.title}
          message={alertModal.message}
          type={alertModal.type}
          confirmText={alertModal.confirmText}
        />
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={closeConfirm}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          type={confirmModal.type}
          loading={confirmModal.loading}
        />
      )}
    </div>
  )
}