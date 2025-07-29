'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Plus, Users, DollarSign, UserPlus, Settings } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'
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
        fetchGroups()
      }
    } catch (error) {
      console.error('Error creating group:', error)
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
        fetchGroups()
      }
    } catch (error) {
      console.error('Error updating group:', error)
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

    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setShowSettingsModal(false)
        setSelectedGroup(null)
        fetchGroups()
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
      closeConfirm()
    }
  }

  if (loading) {
    return <CurrencyLoader />
  }

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-heading">Groups</h1>
          <p className="mt-2 text-sm text-body">
            Manage shared expenses with friends and family
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 ring-focus focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </button>
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <div key={group.id} className="bg-card rounded-lg shadow-card overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-heading">
                    {group.name}
                  </h3>
                  {myRole === 'ADMIN' && (
                    <Settings 
                      className="h-5 w-5 text-muted hover:text-body cursor-pointer" 
                      onClick={() => openSettingsModal(group)}
                    />
                  )}
                </div>
                
                {group.description && (
                  <p className="text-body text-sm mb-4">
                    {group.description}
                  </p>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-body">
                        {group.members.length} members
                      </span>
                    </div>
                    <div className="flex -space-x-2">
                      {group.members.slice(0, 3).map((member) => (
                        <div
                          key={member.id}
                          className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium border-2 border-card"
                          title={member.user.name}
                        >
                          {member.user.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      ))}
                      {group.members.length > 3 && (
                        <div className="h-8 w-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-medium border-2 border-card">
                          +{group.members.length - 3}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-body">
                        Total spent
                      </span>
                    </div>
                    <span className="text-sm font-medium text-heading">
                      {formatAmount(totalExpenses)}
                    </span>
                  </div>

                  {myOwedAmount > 0 && (
                    <div className="bg-status-error border border-status-error rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-status-error">
                          You owe
                        </span>
                        <span className="text-sm font-medium text-status-error">
                          {formatAmount(myOwedAmount)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-card-border">
                  <Link
                    href={`/groups/${group.id}`}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-button-primary bg-button-primary:hover focus:outline-none focus:ring-2 focus:ring-offset-2 ring-focus"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
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
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-card">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-heading mb-4">
                Create New Group
              </h3>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-input-label mb-1">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newGroup.name}
                    onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-input rounded-md px-3 py-2 bg-input text-heading"
                    placeholder="e.g., Roommates, Vacation Trip"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-input-label mb-1">
                    Description
                  </label>
                  <textarea
                    value={newGroup.description}
                    onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border border-input rounded-md px-3 py-2 bg-input text-heading"
                    rows={2}
                    placeholder="Optional description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-input-label mb-1">
                    Member Emails
                  </label>
                  {newGroup.memberEmails.map((email, index) => (
                    <div key={index} className="flex items-center mb-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => updateMemberEmail(index, e.target.value)}
                        className="flex-1 border border-input rounded-md px-3 py-2 bg-input text-heading"
                        placeholder="member@example.com"
                      />
                      {newGroup.memberEmails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMemberEmailField(index)}
                          className="ml-2 text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addMemberEmailField}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + Add another member
                  </button>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-input-label border border-input rounded-md hover:bg-button-secondary-hover"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Group
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
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-card">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-heading mb-4">
                Group Settings
              </h3>
              
              <form onSubmit={handleUpdateGroup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-input-label mb-1">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editGroup.name}
                    onChange={(e) => setEditGroup(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-input rounded-md px-3 py-2 bg-input text-heading"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-input-label mb-1">
                    Description
                  </label>
                  <textarea
                    value={editGroup.description}
                    onChange={(e) => setEditGroup(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border border-input rounded-md px-3 py-2 bg-input text-heading"
                    rows={2}
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
                  <label className="block text-sm font-medium text-input-label mb-1">
                    Add New Members
                  </label>
                  {editGroup.newMemberEmails.map((email, index) => (
                    <div key={index} className="flex items-center mb-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => updateNewMemberEmail(index, e.target.value)}
                        className="flex-1 border border-input rounded-md px-3 py-2 bg-input text-heading"
                        placeholder="member@example.com"
                      />
                      {editGroup.newMemberEmails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeNewMemberEmailField(index)}
                          className="ml-2 text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addNewMemberEmailField}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + Add another member
                  </button>
                </div>

                <div className="flex justify-between items-center pt-4">
                  <button
                    type="button"
                    onClick={handleDeleteGroup}
                    disabled={deleteLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleteLoading ? <LoadingSpinner size="sm" /> : 'Delete Group'}
                  </button>
                  
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowSettingsModal(false)}
                      className="px-4 py-2 text-input-label border border-input rounded-md hover:bg-button-secondary-hover"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updateLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
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