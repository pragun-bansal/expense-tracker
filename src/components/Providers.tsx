'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'
import { ThemeProvider } from './ThemeProvider'
import { ToastProvider } from '@/contexts/ToastContext'
import Layout from './Layout'
import ToastContainer from './ToastContainer'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem={true}
        disableTransitionOnChange={false}
        themes={['light', 'soft','dark-2','forest','harvest','deepForest','earthyDark','finDark','freshLight','playful','luxProfessional','luxProfessionalLight' ,'dark' ,'system']}
        storageKey="theme"
      >
        <ToastProvider>
          <Layout>
            {children}
          </Layout>
          <ToastContainer />
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}