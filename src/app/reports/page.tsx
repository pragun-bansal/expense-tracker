'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Download, FileText, Calendar, Filter, TrendingUp, DollarSign, PieChart } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'

export default function Reports() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [reportType, setReportType] = useState('summary')
  const [reportData, setReportData] = useState<any>(null)

  useEffect(() => {
    if (session) {
      setLoading(false)
      generateReport('json') // Load initial report data
    }
  }, [session])

  const generateReport = async (format: 'json' | 'csv' = 'json') => {
    if (!session) return

    setGenerating(true)
    try {
      const params = new URLSearchParams({
        type: reportType,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format
      })

      const response = await fetch(`/api/reports?${params}`)
      
      if (format === 'csv') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        const data = await response.json()
        setReportData(data)
      }
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Error generating report. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const downloadPredefinedReport = async (type: string, format: 'csv' | 'pdf' = 'csv') => {
    setGenerating(true)
    
    // For predefined reports, use current month for monthly, current year for yearly
    const now = new Date()
    let startDate: string
    let endDate: string

    if (type === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    } else if (type === 'yearly') {
      startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
      endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
    } else {
      startDate = dateRange.startDate
      endDate = dateRange.endDate
    }

    try {
      const params = new URLSearchParams({
        type: type === 'monthly' || type === 'yearly' ? 'summary' : 'category',
        startDate,
        endDate,
        format: 'csv'
      })

      const response = await fetch(`/api/reports?${params}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-report-${startDate}-to-${endDate}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading report:', error)
      alert('Error downloading report. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return <CurrencyLoader />
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Generate detailed financial reports and export your data
        </p>
      </div>

      {/* Report Generation Form */}
      <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/20 rounded-lg mb-8">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
            Generate Report
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label htmlFor="reportType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Report Type
              </label>
              <select
                id="reportType"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="summary">Summary Report</option>
                <option value="detailed">Detailed Transactions</option>
                <option value="category">Category Breakdown</option>
                <option value="budget">Budget Analysis</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => generateReport('json')}
              disabled={generating}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {generating ? 'Loading...' : 'Preview Report'}
            </button>
            <button
              onClick={() => generateReport('csv')}
              disabled={generating}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-2" />
              {generating ? 'Generating...' : 'Download CSV'}
            </button>
          </div>
        </div>
      </div>

      {/* Report Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/20">
          <div className="flex items-center mb-4">
            <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <h3 className="ml-3 text-lg font-medium text-gray-900 dark:text-white">
              Monthly Summary
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Overview of income, expenses, and savings for the current month
          </p>
          <button 
            onClick={() => downloadPredefinedReport('monthly')}
            disabled={generating}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Download CSV'}
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/20">
          <div className="flex items-center mb-4">
            <Calendar className="h-8 w-8 text-green-600 dark:text-green-400" />
            <h3 className="ml-3 text-lg font-medium text-gray-900 dark:text-white">
              Yearly Report
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Complete financial overview for the entire year with trends
          </p>
          <button 
            onClick={() => downloadPredefinedReport('yearly')}
            disabled={generating}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Download CSV'}
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/20">
          <div className="flex items-center mb-4">
            <Filter className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            <h3 className="ml-3 text-lg font-medium text-gray-900 dark:text-white">
              Category Analysis
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Detailed breakdown of spending by category with insights
          </p>
          <button 
            onClick={() => downloadPredefinedReport('category')}
            disabled={generating}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Download CSV'}
          </button>
        </div>
      </div>

      {/* Report Preview */}
      {reportData && (
        <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/20 rounded-lg mt-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
              Report Preview - {reportType.charAt(0).toUpperCase() + reportType.slice(1)}
            </h3>
            
            {reportType === 'summary' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="flex items-center">
                      <DollarSign className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Income</p>
                        <p className="text-2xl font-semibold text-blue-800 dark:text-blue-200">
                          ${reportData.summary.totalIncome.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                    <div className="flex items-center">
                      <TrendingUp className="h-8 w-8 text-red-600 dark:text-red-400" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">Total Expenses</p>
                        <p className="text-2xl font-semibold text-red-800 dark:text-red-200">
                          ${reportData.summary.totalExpenses.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`${reportData.summary.netAmount >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} p-4 rounded-lg`}>
                    <div className="flex items-center">
                      <PieChart className={`h-8 w-8 ${reportData.summary.netAmount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                      <div className="ml-4">
                        <p className={`text-sm font-medium ${reportData.summary.netAmount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>Net Amount</p>
                        <p className={`text-2xl font-semibold ${reportData.summary.netAmount >= 0 ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                          ${reportData.summary.netAmount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Transactions</p>
                        <p className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                          {reportData.summary.transactionCount}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {reportData.budgetStatus && reportData.budgetStatus.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Budget Status</h4>
                    <div className="space-y-2">
                      {reportData.budgetStatus.map((budget: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">{budget.category}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                              ${budget.spent.toFixed(2)} / ${budget.budgetAmount.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-medium ${parseFloat(budget.percentageUsed) >= 100 ? 'text-red-600 dark:text-red-400' : parseFloat(budget.percentageUsed) >= 80 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                              {budget.percentageUsed}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {reportType === 'detailed' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {reportData.transactions.slice(0, 10).map((transaction: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {new Date(transaction.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${transaction.type === 'income' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                            {transaction.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {transaction.description || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {transaction.category.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className={transaction.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            ${Math.abs(transaction.amount).toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reportData.transactions.length > 10 && (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                    Showing first 10 transactions. Download CSV for complete report.
                  </p>
                )}
              </div>
            )}
            
            {reportType === 'category' && (
              <div className="space-y-4">
                {reportData.categoryBreakdown.map((category: any, index: number) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">{category.category}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${category.type === 'INCOME' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                        {category.type}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Expenses: </span>
                        <span className="font-medium text-red-600 dark:text-red-400">${category.totalExpenses.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Income: </span>
                        <span className="font-medium text-green-600 dark:text-green-400">${category.totalIncome.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Net: </span>
                        <span className={`font-medium ${category.netAmount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          ${category.netAmount.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Transactions: </span>
                        <span className="font-medium text-gray-900 dark:text-white">{category.transactionCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {reportType === 'budget' && (
              <div className="space-y-4">
                {reportData.budgets.map((budget: any, index: number) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">{budget.category}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${budget.status === 'good' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : budget.status === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                        {budget.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Budget: </span>
                        <span className="font-medium text-gray-900 dark:text-white">${budget.budgetAmount.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Spent: </span>
                        <span className="font-medium text-red-600 dark:text-red-400">${budget.spent.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Remaining: </span>
                        <span className={`font-medium ${budget.remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          ${budget.remaining.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Used: </span>
                        <span className="font-medium text-gray-900 dark:text-white">{budget.percentageUsed}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}