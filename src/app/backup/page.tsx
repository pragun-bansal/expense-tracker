'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Download, Upload, Shield, AlertTriangle, CheckCircle, FileText, Database } from 'lucide-react'

interface RestoreResult {
  message: string
  results: {
    accounts: number
    categories: number
    expenses: number
    incomes: number
    budgets: number
    recurringExpenses: number
    errors: string[]
  }
  totalRestored: number
}

export default function BackupRestore() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleExportBackup = async (format: 'json' | 'csv') => {
    setLoading(true)
    try {
      const response = await fetch(`/api/backup?format=${format}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `expense-tracker-backup-${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to export backup')
      }
    } catch (error) {
      console.error('Error exporting backup:', error)
      alert('Something went wrong during export')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleRestoreBackup = async () => {
    if (!selectedFile) return

    setLoading(true)
    setRestoreResult(null)

    try {
      const fileContent = await selectedFile.text()
      const backupData = JSON.parse(fileContent)

      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupData)
      })

      if (response.ok) {
        const result = await response.json()
        setRestoreResult(result)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to restore backup')
      }
    } catch (error) {
      console.error('Error restoring backup:', error)
      alert('Invalid backup file or restore failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-heading">Backup & Restore</h1>
        <p className="mt-2 text-sm text-muted">
          Export your data or restore from a previous backup
        </p>
      </div>

      <div className="space-y-8">
        {/* Warning Notice */}
        <div className="bg-status-warning border border-status-warning rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-status-warning mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-status-warning">
                Important Notice
              </h3>
              <p className="mt-1 text-sm text-status-warning">
                Always create a backup before restoring data. Restoring will overwrite existing data with the same IDs.
                Make sure to keep your backup files secure as they contain sensitive financial information.
              </p>
            </div>
          </div>
        </div>

        {/* Export Backup */}
        <div className="bg-card shadow-card rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <Download className="h-5 w-5 text-muted mr-2" />
              <h3 className="text-lg font-medium leading-6 text-heading">
                Export Backup
              </h3>
            </div>
            <p className="text-sm text-muted mb-6">
              Create a backup of all your expense tracking data including accounts, categories, expenses, income, budgets, and groups.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-card-border rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Database className="h-5 w-5 text-status-info mr-2" />
                  <h4 className="font-medium text-heading">
                    Complete Backup (JSON)
                  </h4>
                </div>
                <p className="text-sm text-muted mb-4">
                  Full backup with all data and relationships. Use this for complete restoration.
                </p>
                <button
                  onClick={() => handleExportBackup('json')}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {loading ? 'Exporting...' : 'Export JSON'}
                </button>
              </div>

              <div className="border border-card-border rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <FileText className="h-5 w-5 text-status-success mr-2" />
                  <h4 className="font-medium text-heading">
                    Simple Export (CSV)
                  </h4>
                </div>
                <p className="text-sm text-muted mb-4">
                  Basic expense and income data in CSV format. Good for spreadsheet analysis.
                </p>
                <button
                  onClick={() => handleExportBackup('csv')}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {loading ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Restore Backup */}
        <div className="bg-card shadow-card rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <Upload className="h-5 w-5 text-muted mr-2" />
              <h3 className="text-lg font-medium leading-6 text-heading">
                Restore Backup
              </h3>
            </div>
            <p className="text-sm text-muted mb-6">
              Restore your data from a previous backup file. Only JSON backup files are supported for restoration.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-input-label mb-2">
                  Select Backup File
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300 dark:hover:file:bg-blue-800"
                />
              </div>

              {selectedFile && (
                <div className="flex items-center p-3 bg-muted rounded-lg">
                  <FileText className="h-5 w-5 text-muted mr-2" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-heading">
                      {selectedFile.name}
                    </div>
                    <div className="text-xs text-muted">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <button
                    onClick={handleRestoreBackup}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {loading ? 'Restoring...' : 'Restore Backup'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Restore Results */}
        {restoreResult && (
          <div className="bg-card shadow-card rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center mb-4">
                <CheckCircle className="h-5 w-5 text-status-success mr-2" />
                <h3 className="text-lg font-medium leading-6 text-heading">
                  Restore Results
                </h3>
              </div>

              <div className="bg-status-success border border-green-200 rounded-lg p-4 mb-6">
                <div className="text-sm text-status-success">
                  <strong>{restoreResult.message}</strong>
                </div>
                <div className="text-sm text-status-success mt-1">
                  Total items restored: {restoreResult.totalRestored}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-bold text-heading">
                    {restoreResult.results.accounts}
                  </div>
                  <div className="text-sm text-muted">
                    Accounts
                  </div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-bold text-heading">
                    {restoreResult.results.categories}
                  </div>
                  <div className="text-sm text-muted">
                    Categories
                  </div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-bold text-heading">
                    {restoreResult.results.expenses}
                  </div>
                  <div className="text-sm text-muted">
                    Expenses
                  </div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-bold text-heading">
                    {restoreResult.results.incomes}
                  </div>
                  <div className="text-sm text-muted">
                    Incomes
                  </div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-bold text-heading">
                    {restoreResult.results.budgets}
                  </div>
                  <div className="text-sm text-muted">
                    Budgets
                  </div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-bold text-heading">
                    {restoreResult.results.recurringExpenses}
                  </div>
                  <div className="text-sm text-muted">
                    Recurring
                  </div>
                </div>
              </div>

              {restoreResult.results.errors.length > 0 && (
                <div className="bg-status-error border border-status-error rounded-lg p-4">
                  <h4 className="text-sm font-medium text-status-error mb-2">
                    Errors ({restoreResult.results.errors.length})
                  </h4>
                  <ul className="text-sm text-status-error space-y-1">
                    {restoreResult.results.errors.map((error, index) => (
                      <li key={index} className="list-disc list-inside">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security Information */}
        <div className="bg-card shadow-card rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <Shield className="h-5 w-5 text-muted mr-2" />
              <h3 className="text-lg font-medium leading-6 text-heading">
                Security & Privacy
              </h3>
            </div>
            <div className="space-y-3 text-sm text-muted">
              <div className="flex items-start">
                <CheckCircle className="h-4 w-4 text-status-success mr-2 mt-0.5 flex-shrink-0" />
                <span>Backup files are generated locally and not stored on our servers</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-4 w-4 text-status-success mr-2 mt-0.5 flex-shrink-0" />
                <span>All sensitive data remains encrypted and secure</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-4 w-4 text-status-success mr-2 mt-0.5 flex-shrink-0" />
                <span>You have full control over your backup files</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="h-4 w-4 text-status-success mr-2 mt-0.5 flex-shrink-0" />
                <span>Restore only works with backups from the same user account</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}