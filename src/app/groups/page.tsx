'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Plus, Users, DollarSign, UserPlus, Settings } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'
import { useCurrency } from '@/hooks/useCurrency'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useModal } from '@/hooks/useModal'

// Lazy load modal components
const AlertModal = lazy(() => import('@/components/AlertModal'))
const ConfirmModal = lazy(() => import('@/components/ConfirmModal'))

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
      email: string
    }
  }>
  expenses: Array<{
    id: string
    description: string
    amount: number
    date: string
    paidBy: {
      id: string
      name: string
      email: string
    }
    splits: Array<{
      id: string
      amount: number
      settled: boolean
      userId: string
    }>
  }>
  createdAt: string
}

export default function Groups() {
  const { data: session } = useSession()
  const { formatAmount } = useCurrency()
  const { alertModal, confirmModal, showAlert, showConfirm, closeAlert, closeConfirm } = useModal()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [createLoading, setCreateLoading] = useState(false)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    memberEmails: ['']
  })
  const [editGroup, setEditGroup] = useState({
    name: '',
    description: '',
    newMemberEmails: ['']
  })

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
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroup.name,
          description: newGroup.description,
          memberEmails: newGroup.memberEmails.filter(email => email.trim())
        })
      })

      if (response.ok) {
        setShowCreateModal(false)
        setNewGroup({ name: '', description: '', memberEmails: [''] })
        await fetchGroups()
        showAlert({
          title: 'Success',
          message: 'Group created successfully!',
          type: 'success'
        })
      } else {
        showAlert({
          title: 'Error',
          message: 'Failed to create group. Please try again.',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error creating group:', error)
      showAlert({
        title: 'Error',
        message: 'An error occurred while creating the group.',
        type: 'error'
      })
    } finally {
      setCreateLoading(false)
    }
  }

  const addMemberEmailField = () => {
    setNewGroup(prev => ({
      ...prev,
      memberEmails: [...prev.memberEmails, '']
    }))
  }

  const updateMemberEmail = (index: number, email: string) => {
    setNewGroup(prev => ({
      ...prev,
      memberEmails: prev.memberEmails.map((e, i) => i === index ? email : e)
    }))
  }

  const removeMemberEmailField = (index: number) => {
    setNewGroup(prev => ({
      ...prev,
      memberEmails: prev.memberEmails.filter((_, i) => i !== index)
    }))
  }

  const openSettingsModal = (group: Group) => {
    setSelectedGroup(group)
    setEditGroup({
      name: group.name,
      description: group.description || '',
      newMemberEmails: ['']
    })
    setShowSettingsModal(true)
  }

  const addNewMemberEmailField = () => {
    setEditGroup(prev => ({
      ...prev,
      newMemberEmails: [...prev.newMemberEmails, '']
    }))
  }

  const updateNewMemberEmail = (index: number, email: string) => {
    setEditGroup(prev => ({
      ...prev,
      newMemberEmails: prev.newMemberEmails.map((e, i) => i === index ? email : e)
    }))
  }

  const removeNewMemberEmailField = (index: number) => {
    setEditGroup(prev => ({
      ...prev,
      newMemberEmails: prev.newMemberEmails.filter((_, i) => i !== index)
    }))
  }

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGroup) return
    setUpdateLoading(true)

    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editGroup.name,
          description: editGroup.description,
          memberEmails: editGroup.newMemberEmails.filter(email => email.trim())
        })
      })

      if (response.ok) {
        setShowSettingsModal(false)
        setSelectedGroup(null)
        await fetchGroups()
        showAlert({
          title: 'Success',
          message: 'Group updated successfully!',
          type: 'success'
        })
      } else {
        showAlert({
          title: 'Error',
          message: 'Failed to update group. Please try again.',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error updating group:', error)
      showAlert({
        title: 'Error',
        message: 'An error occurred while updating the group.',
        type: 'error'
      })
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return
    
    const confirmed = await showConfirm({
      title: 'Delete Group',
      message: `Are you sure you want to delete "${selectedGroup.name}"? This action cannot be undone and will remove all associated expenses.`,
      confirmText: 'Delete',
      type: 'danger'
    })

    if (!confirmed) {
      closeConfirm()
      return
    }

    setDeleteLoading(true)

    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setShowSettingsModal(false)
        setSelectedGroup(null)
        await fetchGroups()
        showAlert({
          title: 'Success',
          message: 'Group deleted successfully.',
          type: 'success'
        })
      } else {
        showAlert({
          title: 'Error',
          message: 'Failed to delete group. Please try again.',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error deleting group:', error)
      showAlert({
        title: 'Error',
        message: 'An error occurred while deleting the group.',
        type: 'error'
      })
    } finally {
      setDeleteLoading(false)
      closeConfirm()
    }
  }

  if (loading) {
    return <CurrencyLoader />
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-heading">Groups</h1>
          <p className="mt-2 text-sm text-body">
            Manage shared expenses with friends and family
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 ring-focus focus:ring-offset-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </button>
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {groups.map((group) => {
          const totalExpenses = group.expenses.reduce((sum, expense) => sum + expense.amount, 0)
          const myUnsettledSplits = group.expenses.flatMap(expense => 
            expense.splits.filter(split => 
              split.userId === session?.user?.id && !split.settled
            )
          )
          const myOwedAmount = myUnsettledSplits.reduce((sum, split) => sum + split.amount, 0)
          const myRole = group.members.find(member => member.user.id === session?.user?.id)?.role

          return (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="block bg-card rounded-xl shadow-card hover:shadow-lg transition-all duration-200 overflow-hidden group"
            >
              <div className="p-4 sm:p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-heading truncate group-hover:text-blue-600 transition-colors duration-200">
                      {group.name}
                    </h3>
                    {group.description && (
                      <p className="text-xs sm:text-sm text-muted mt-1 line-clamp-2">
                        {group.description}
                      </p>
                    )}
                  </div>
                  {myRole === 'ADMIN' && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        openSettingsModal(group)
                      }}
                      className="p-1 text-muted hover:text-body rounded-md hover:bg-gray-100 transition-colors duration-200 flex-shrink-0 ml-2"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Members & Total */}
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex -space-x-1.5 sm:-space-x-2">
                      {group.members.slice(0, 3).map((member) => (
                        <div
                          key={member.id}
                          className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium border-2 border-card flex-shrink-0"
                          title={member.user.name}
                        >
                          {member.user.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      ))}
                      {group.members.length > 3 && (
                        <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-medium border-2 border-card flex-shrink-0">
                          +{group.members.length - 3}
                        </div>
                      )}
                    </div>
                    <span className="text-xs sm:text-sm text-muted">
                      {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm sm:text-base font-semibold text-heading">
                      {formatAmount(totalExpenses)}
                    </div>
                    <div className="text-xs text-muted">
                      total spent
                    </div>
                  </div>
                </div>

                {/* You Owe Section */}
                {myOwedAmount > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3 mb-3 sm:mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-medium text-red-700">
                        You owe
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-red-700">
                        {formatAmount(myOwedAmount)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Status Indicator */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`h-2 w-2 rounded-full ${
                      group.expenses.length > 0 ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                    <span className="text-xs text-muted">
                      {group.expenses.length} expense{group.expenses.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-xs text-blue-600 font-medium group-hover:text-blue-700 transition-colors duration-200">
                    View Details →
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-heading">No groups</h3>
          <p className="mt-1 text-sm text-muted">
            Get started by creating a new group to share expenses.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-button-primary bg-button-primary:hover focus:outline-none focus:ring-2 focus:ring-offset-2 ring-focus"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </button>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-modal-overlay overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-card">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-heading mb-4">
                Create New Group
              </h3>
              <form onSubmit={handleCreateGroup} className="space-y-6 sm:space-y-8">
                <div>
                  <label className="block text-sm font-medium text-input-label mb-3">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newGroup.name}
                    onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                    className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input placeholder-gray-400 transition-all duration-200"
                    placeholder="e.g., Roommates, Vacation Trip"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-input-label mb-3">
                    Description
                  </label>
                  <textarea
                    value={newGroup.description}
                    onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                    className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input placeholder-gray-400 transition-all duration-200 resize-none"
                    rows={3}
                    placeholder="Optional description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-input-label mb-3">
                    Member Emails
                  </label>
                  <div className="space-y-3">
                    {newGroup.memberEmails.map((email, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => updateMemberEmail(index, e.target.value)}
                          className="flex-1 px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input placeholder-gray-400 transition-all duration-200"
                          placeholder="member@example.com"
                        />
                        {newGroup.memberEmails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMemberEmailField(index)}
                            className="px-3 py-2 text-red-600 hover:text-red-800 text-sm font-medium transition-colors duration-200"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addMemberEmailField}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200"
                  >
                    + Add another member
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="bg-input py-3 px-6 border border-input rounded-lg shadow-sm text-sm sm:text-base font-medium text-input-label hover:bg-button-secondary-hover transition-all duration-200 text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="bg-blue-600 border border-transparent rounded-lg shadow-sm py-3 px-6 text-sm sm:text-base font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 flex items-center justify-center min-w-[140px]"
                  >
                    {createLoading ? <LoadingSpinner size="sm" /> : 'Create Group'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Group Settings Modal */}
      {showSettingsModal && selectedGroup && (
        <div className="fixed inset-0 bg-modal-overlay overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-card">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-heading mb-4">
                Group Settings
              </h3>
              
              <form onSubmit={handleUpdateGroup} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-input-label mb-3">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editGroup.name}
                    onChange={(e) => setEditGroup(prev => ({ ...prev, name: e.target.value }))}
                    className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input placeholder-gray-400 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-input-label mb-3">
                    Description
                  </label>
                  <textarea
                    value={editGroup.description}
                    onChange={(e) => setEditGroup(prev => ({ ...prev, description: e.target.value }))}
                    className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input placeholder-gray-400 transition-all duration-200 resize-none"
                    rows={3}
                  />
                </div>

                {/* Current Members */}
                <div>
                  <label className="block text-sm font-medium text-input-label mb-2">
                    Current Members
                  </label>
                  <div className="space-y-2 mb-3">
                    {selectedGroup.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium mr-3">
                            {member.user.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-heading">
                              {member.user.name}
                            </div>
                            <div className="text-xs text-muted">
                              {member.user.email}
                            </div>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          member.role === 'ADMIN' 
                            ? 'bg-status-info text-status-info' 
                            : 'bg-muted text-body'
                        }`}>
                          {member.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add New Members */}
                <div>
                  <label className="block text-sm font-medium text-input-label mb-3">
                    Add New Members
                  </label>
                  <div className="space-y-3">
                    {editGroup.newMemberEmails.map((email, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => updateNewMemberEmail(index, e.target.value)}
                          className="flex-1 px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input placeholder-gray-400 transition-all duration-200"
                          placeholder="member@example.com"
                        />
                        {editGroup.newMemberEmails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeNewMemberEmailField(index)}
                            className="px-3 py-2 text-red-600 hover:text-red-800 text-sm font-medium transition-colors duration-200"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addNewMemberEmailField}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200 mt-3"
                  >
                    + Add another member
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center pt-6 gap-4">
                  <button
                    type="button"
                    onClick={handleDeleteGroup}
                    disabled={deleteLoading}
                    className="bg-red-600 border border-transparent rounded-lg shadow-sm py-3 px-6 text-base font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-all duration-200 w-full sm:w-auto"
                  >
                    {deleteLoading ? <LoadingSpinner size="sm" /> : 'Delete Group'}
                  </button>
                  
                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setShowSettingsModal(false)}
                      className="bg-input py-3 px-6 border border-input rounded-lg shadow-sm text-base font-medium text-input-label hover:bg-button-secondary-hover transition-all duration-200 text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updateLoading}
                      className="bg-blue-600 border border-transparent rounded-lg shadow-sm py-3 px-6 text-base font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-all duration-200"
                    >
                      {updateLoading ? <LoadingSpinner size="sm" /> : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal && (
        <Suspense fallback={<div />}>
          <AlertModal
            isOpen={alertModal?.isOpen || false}
            onClose={closeAlert}
            title={alertModal?.title || ''}
            message={alertModal?.message || ''}
            type={alertModal?.type || 'info'}
            confirmText={alertModal.confirmText}
          />
        </Suspense>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <Suspense fallback={<div />}>
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
        </Suspense>
      )}
    </div>
  )
}