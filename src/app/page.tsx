'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { CurrencyLoader } from '@/components/CurrencyLoader'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (session) {
      router.push('/dashboard')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return <CurrencyLoader />
  }

  if (session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Fina</h1>
          <p className="text-lg text-gray-600 mb-8">
            Smart personal finance management and group expense splitting made effortless.
          </p>
        </div>
        
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <Link
                href="/auth/signin"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold text-gray-900">📊 Expense Tracking</h3>
              <p className="text-sm text-gray-600">Track all your expenses with categories and accounts</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold text-gray-900">👥 Bill Splitting</h3>
              <p className="text-sm text-gray-600">Split expenses with friends and family</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold text-gray-900">📈 Analytics</h3>
              <p className="text-sm text-gray-600">View spending patterns and insights</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold text-gray-900">💰 Budgeting</h3>
              <p className="text-sm text-gray-600">Set budgets and track your progress</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}