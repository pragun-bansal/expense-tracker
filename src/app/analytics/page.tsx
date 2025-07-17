'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon } from 'lucide-react'

interface AnalyticsData {
  period: string
  summary: {
    totalExpenses: number
    totalIncome: number
    netIncome: number
    netWorth: number
  }
  expensesByCategory: Array<{
    name: string
    value: number
    color: string
  }>
  incomesByCategory: Array<{
    name: string
    value: number
    color: string
  }>
  monthlyTrends: Array<{
    month: string
    expenses: number
    income: number
    net: number
  }>
  accountBalances: Array<{
    name: string
    balance: number
    type: string
    color: string
  }>
}

export default function Analytics() {
  const { data: session } = useSession()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')

  useEffect(() => {
    if (session) {
      fetchAnalytics()
    }
  }, [session, period])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics?period=${period}`)
      if (response.ok) {
        const analyticsData = await response.json()
        setData(analyticsData)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow">
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          {payload.map((item: any, index: number) => (
            <p key={index} style={{ color: item.color }} className="text-sm">
              {item.name}: {formatCurrency(item.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading analytics...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">No data available</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Financial insights and trends
            </p>
          </div>
          <div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="month">This Month</option>
              <option value="quarter">Last 3 Months</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/20">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Income</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {formatCurrency(data.summary.totalIncome)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/20">
          <div className="flex items-center">
            <TrendingDown className="h-8 w-8 text-red-600 dark:text-red-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Expenses</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {formatCurrency(data.summary.totalExpenses)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/20">
          <div className="flex items-center">
            <DollarSign className={`h-8 w-8 ${data.summary.netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Income</p>
              <p className={`text-2xl font-semibold ${data.summary.netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(data.summary.netIncome)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/20">
          <div className="flex items-center">
            <PieChartIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Worth</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {formatCurrency(data.summary.netWorth)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Expense by Category Pie Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/20">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Expenses by Category
          </h3>
          {data.expensesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.expensesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
              No expense data available
            </div>
          )}
        </div>

        {/* Income by Category Pie Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/20">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Income by Category
          </h3>
          {data.incomesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.incomesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.incomesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
              No income data available
            </div>
          )}
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/20 mb-8">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Monthly Trends (Last 12 Months)
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data.monthlyTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" stroke="#6B7280" />
            <YAxis stroke="#6B7280" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} name="Income" />
            <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} name="Expenses" />
            <Line type="monotone" dataKey="net" stroke="#3B82F6" strokeWidth={2} name="Net" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Account Balances */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/20">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Account Balances
        </h3>
        {data.accountBalances.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.accountBalances}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="balance" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
            No account data available
          </div>
        )}
      </div>
    </div>
  )
}