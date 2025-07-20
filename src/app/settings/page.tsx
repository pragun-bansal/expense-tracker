'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Bell, Mail, Shield, User, Save, RefreshCw } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'

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
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlertsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [settings, setSettings] = useState({
    emailNotifications: true,
    budgetAlerts: true,
    weeklyReports: false,
    monthlyReports: true
  })

  useEffect(() => {
    if (session) {
      fetchBudgetAlerts()
    }
  }, [session])

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
        alert(`${result.message}\nNotifications sent: ${result.notificationsSent}`)
        fetchBudgetAlerts()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to process budget alerts')
      }
    } catch (error) {
      console.error('Error processing budget alerts:', error)
      alert('Something went wrong')
    } finally {
      setProcessing(false)
    }
  }

  const handleSaveSettings = async () => {
    // In a real app, you would save these settings to the database
    alert('Settings saved successfully! (Note: This is a demo - settings are not actually persisted)')
  }

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'exceeded': return 'text-red-600 dark:text-red-400'
      case 'warning': return 'text-yellow-600 dark:text-yellow-400'
      default: return 'text-green-600 dark:text-green-400'
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Configure your account preferences and notifications
        </p>
      </div>

      <div className="space-y-8">
        {/* Profile Settings */}
        <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/20 rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <User className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                Profile Information
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name
                </label>
                <input
                  type="text"
                  value={session?.user?.name || ''}
                  disabled
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  value={session?.user?.email || ''}
                  disabled
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/20 rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                  Notification Preferences
                </h3>
              </div>
              <button
                onClick={handleTestNotifications}
                disabled={processing}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${processing ? 'animate-spin' : ''}`} />
                {processing ? 'Processing...' : 'Test Notifications'}
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email Notifications
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Receive notifications via email
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Budget Alerts
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Get notified when budgets reach 80% or are exceeded
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.budgetAlerts}
                  onChange={(e) => setSettings({...settings, budgetAlerts: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Weekly Reports
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Receive weekly spending summaries
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.weeklyReports}
                  onChange={(e) => setSettings({...settings, weeklyReports: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Monthly Reports
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Receive monthly spending summaries
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.monthlyReports}
                  onChange={(e) => setSettings({...settings, monthlyReports: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
            </div>
            
            <div className="mt-6">
              <button
                onClick={handleSaveSettings}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </button>
            </div>
          </div>
        </div>

        {/* Budget Alerts Status */}
        {budgetAlerts && (
          <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/20 rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center mb-4">
                <Mail className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                  Budget Alert Status
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {budgetAlerts.totalBudgets}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Total Budgets
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {budgetAlerts.alertsCount}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Active Alerts
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {budgetAlerts.totalBudgets - budgetAlerts.alertsCount}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    On Track
                  </div>
                </div>
              </div>

              {budgetAlerts.budgetAlerts.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Current Budget Status
                  </h4>
                  {budgetAlerts.budgetAlerts.map((alert) => (
                    <div key={alert.budgetId} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center">
                        <span className="text-lg mr-3">{getAlertIcon(alert.alertLevel)}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {alert.categoryName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ${alert.currentSpending.toFixed(2)} of ${alert.amount.toFixed(2)} ({alert.period})
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
        <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/20 rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <Shield className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                Security
              </h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Change Password
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Update your account password
                </p>
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  Change Password
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Two-Factor Authentication
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Add an extra layer of security to your account
                </p>
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  Enable 2FA
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}