'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Calculator, Users, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'
import AlertModal from '@/components/AlertModal'
import ConfirmModal from '@/components/ConfirmModal'
import { useModal } from '@/hooks/useModal'

interface Group {
  id: string
  name: string
  description?: string
  members: Array<{
    id: string
    role: string
    user: {
      id: string
      name: string
    }
  }>
}

interface DebtSummary {
  userId: string
  userName: string
  totalOwed: number
  totalOwes: number
  netBalance: number
}

interface Settlement {
  from: string
  to: string
  amount: number
  fromName: string
  toName: string
}

interface DebtSettlementResult {
  userDebts: DebtSummary[]
  settlements: Settlement[]
  totalTransactions: number
  originalTransactions: number
}

export default function DebtSettlement() {
  const { data: session } = useSession()
  const { formatAmount } = useCurrency()
  const { alertModal, confirmModal, showAlert, showConfirm, closeAlert, closeConfirm } = useModal()
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [settlementResult, setSettlementResult] = useState<DebtSettlementResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [settling, setSettling] = useState(false)

  useEffect(() => {
    if (session) {
      fetchGroups()
    }
  }, [session])

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/groups')
      if (response.ok) {
        const data = await response.json()
        setGroups(data)
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
    }
  }

  const calculateDebtSettlement = async () => {
    if (!selectedGroup) return

    setLoading(true)
    try {
      const response = await fetch(`/api/debt-settlement?groupId=${selectedGroup}`)
      if (response.ok) {
        const data = await response.json()
        setSettlementResult(data)
      } else {
        const error = await response.json()
        showAlert({
          title: 'Error',
          message: error.error || 'Failed to calculate debt settlement',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error calculating debt settlement:', error)
      showAlert({
        title: 'Error',
        message: 'Something went wrong while calculating debt settlement.',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const settleDebts = async () => {
    if (!selectedGroup || !settlementResult) return

    setSettling(true)
    try {
      const response = await fetch('/api/debt-settlement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: selectedGroup,
          settlements: settlementResult.settlements
        })
      })

      if (response.ok) {
        const result = await response.json()
        showAlert({
          title: 'Success',
          message: result.message,
          type: 'success'
        })
        // Recalculate after settlement
        calculateDebtSettlement()
      } else {
        const error = await response.json()
        showAlert({
          title: 'Error',
          message: error.error || 'Failed to settle debts',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error settling debts:', error)
      showAlert({
        title: 'Error',
        message: 'Something went wrong while settling debts.',
        type: 'error'
      })
    } finally {
      setSettling(false)
    }
  }

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-status-success'
    if (balance < 0) return 'text-status-error'
    return 'text-muted'
  }

  const getBalanceText = (balance: number) => {
    if (balance > 0) return `Gets back ${formatAmount(balance)}`
    if (balance < 0) return `Owes ${formatAmount(Math.abs(balance))}`
    return 'Even'
  }

  const selectedGroupData = groups.find(g => g.id === selectedGroup)
  const isGroupAdmin = selectedGroupData?.members.find(m => m.user.id === session?.user?.id)?.role === 'ADMIN'

  return (
    <div className="px-4 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-heading">Debt Settlement</h1>
        <p className="mt-2 text-base text-muted">
          Optimize debt settlement within your groups
        </p>
      </div>

      {/* Group Selection */}
      <div className="bg-card shadow-card rounded-lg mb-8">
        <div className="px-6 py-6 sm:p-8">
          <h3 className="text-xl font-semibold leading-6 text-heading mb-6">
            Select Group
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="flex-1 block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input transition-all duration-200 appearance-none bg-arrow-down bg-no-repeat bg-right bg-origin-content"
            >
              <option value="">Select a group</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.members.length} members)
                </option>
              ))}
            </select>
            <button
              onClick={calculateDebtSettlement}
              disabled={!selectedGroup || loading}
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm sm:text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 min-w-[180px] justify-center"
            >
              <Calculator className="h-4 w-4 mr-2" />
              {loading ? 'Calculating...' : 'Calculate Settlement'}
            </button>
          </div>
        </div>
      </div>

      {/* Settlement Results */}
      {settlementResult && (
        <div className="space-y-8">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card p-6 sm:p-8 rounded-lg shadow-card hover:shadow-lg transition-all duration-200">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-status-info" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted">Total Members</p>
                  <p className="text-2xl font-semibold text-heading">
                    {settlementResult.userDebts.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-card p-6 sm:p-8 rounded-lg shadow-card hover:shadow-lg transition-all duration-200">
              <div className="flex items-center">
                <ArrowRight className="h-8 w-8 text-status-success" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted">Optimized Transactions</p>
                  <p className="text-2xl font-semibold text-heading">
                    {settlementResult.totalTransactions}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-card p-6 sm:p-8 rounded-lg shadow-card hover:shadow-lg transition-all duration-200">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-status-warning" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted">Original Transactions</p>
                  <p className="text-2xl font-semibold text-heading">
                    {settlementResult.originalTransactions}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* User Debt Summary */}
          <div className="bg-card shadow-card rounded-lg">
            <div className="px-6 py-6 sm:p-8">
              <h3 className="text-xl font-semibold leading-6 text-heading mb-6">
                Current Debt Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {settlementResult.userDebts.map((debt) => (
                  <div key={debt.userId} className="border border-card-border rounded-lg p-6 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-heading">
                        {debt.userName}
                      </h4>
                      <span className={`text-sm font-medium ${getBalanceColor(debt.netBalance)}`}>
                        {getBalanceText(debt.netBalance)}
                      </span>
                    </div>
                    <div className="text-base text-muted space-y-2">
                      <div>Owed: {formatAmount(debt.totalOwed)}</div>
                      <div>Owes: {formatAmount(debt.totalOwes)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Optimized Settlements */}
          {settlementResult.settlements.length > 0 ? (
            <div className="bg-card shadow-card rounded-lg">
              <div className="px-6 py-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                  <h3 className="text-xl font-semibold leading-6 text-heading">
                    Optimized Settlement Plan
                  </h3>
                  {isGroupAdmin && (
                    <button
                      onClick={settleDebts}
                      disabled={settling}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-sm sm:text-base font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 min-w-[160px] justify-center"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {settling ? 'Settling...' : 'Settle All Debts'}
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {settlementResult.settlements.map((settlement, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border border-card-border rounded-lg hover:shadow-md transition-all duration-200 gap-4">
                      <div className="flex items-center space-x-4">
                        <div className="text-base">
                          <span className="font-semibold text-heading">
                            {settlement.fromName}
                          </span>
                          <span className="text-muted mx-2">pays</span>
                          <span className="font-semibold text-heading">
                            {settlement.toName}
                          </span>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="text-xl font-semibold text-status-success">
                        {formatAmount(settlement.amount)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-6 bg-status-info rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-6 w-6 text-status-info mr-3" />
                    <span className="text-base text-status-info">
                      This plan reduces {settlementResult.originalTransactions} transactions to {settlementResult.totalTransactions} optimized settlements.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card shadow-card rounded-lg">
              <div className="px-6 py-6 sm:p-8">
                <div className="text-center py-12">
                  <CheckCircle className="mx-auto h-16 w-16 text-green-400" />
                  <h3 className="mt-4 text-lg font-semibold text-heading">
                    All Debts Settled!
                  </h3>
                  <p className="mt-2 text-base text-muted">
                    No outstanding debts in this group.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!settlementResult && (
        <div className="text-center py-12">
          <Calculator className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-heading">
            No Settlement Calculated
          </h3>
          <p className="mt-1 text-sm text-muted">
            Select a group and calculate debt settlement to see optimization results.
          </p>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal && (
        <AlertModal
          isOpen={alertModal?.isOpen || false}
          onClose={closeAlert}
          title={alertModal?.title || ''}
          message={alertModal?.message || ''}
          type={alertModal?.type || 'info'}
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