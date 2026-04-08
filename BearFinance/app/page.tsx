'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DataProvider } from '@/lib/data-context'
import { FirebaseManager } from '@/lib/firebase'
import { Sidebar } from '@/components/sidebar'
import { MobileNav } from '@/components/mobile-nav'
import { Header } from '@/components/header'
import { Dashboard } from '@/components/sections/dashboard'
import { GastosFixos } from '@/components/sections/gastos-fixos'
import { GastosMensais } from '@/components/sections/gastos-mensais'
import { Cartoes } from '@/components/sections/cartoes'
import { Relatorios } from '@/components/sections/relatorios'
import { Loader2 } from 'lucide-react'

const sectionTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  gastos: 'Gastos Fixos',
  gastosMensais: 'Gastos Mensais',
  cartoes: 'Cartoes',
  relatorios: 'Relatorios'
}

function AppContent() {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [isSaving, setIsSaving] = useState(false)

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />
      case 'gastos':
        return <GastosFixos />
      case 'gastosMensais':
        return <GastosMensais />
      case 'cartoes':
        return <Cartoes />
      case 'relatorios':
        return <Relatorios />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection}
        isSaving={isSaving}
      />

      {/* Main Content */}
      <div className="md:ml-60 pb-20 md:pb-0">
        <Header title={sectionTitles[activeSection] || 'Dashboard'} />
        
        <main className="p-4 md:p-6">
          {renderSection()}
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await FirebaseManager.init()
        if (user && FirebaseManager.temChave()) {
          setIsAuthenticated(true)
        } else {
          router.push('/login')
        }
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  )
}
