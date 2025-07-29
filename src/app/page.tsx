'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { CurrencyLoader } from '@/components/CurrencyLoader'
import LandingPage from './landing/page'

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

  return <LandingPage />
}