'use client'

import { LayoutDashboard, Receipt, Calendar, CreditCard, BarChart3, Sun, Moon } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

interface SidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
  isSaving: boolean
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'gastos', label: 'Gastos Fixos', icon: Receipt },
  { id: 'gastosMensais', label: 'Gastos Mensais', icon: Calendar },
  { id: 'cartoes', label: 'Cartões', icon: CreditCard },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
]

export function Sidebar({ activeSection, onSectionChange, isSaving }: SidebarProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = saved === 'dark' || (!saved && prefersDark)
    setIsDark(shouldBeDark)
    document.documentElement.setAttribute('data-theme', shouldBeDark ? 'dark' : 'light')
  }, [])

  const toggleTheme = useCallback(() => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    document.documentElement.setAttribute('data-theme', newIsDark ? 'dark' : 'light')
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light')
    // Disparar evento customizado para sincronizar com outros componentes
    window.dispatchEvent(new CustomEvent('themeChange', { detail: { isDark: newIsDark } }))
  }, [isDark])

  useEffect(() => {
    const handleThemeChange = (e: CustomEvent<{ isDark: boolean }>) => {
      setIsDark(e.detail.isDark)
    }
    window.addEventListener('themeChange', handleThemeChange as EventListener)
    return () => window.removeEventListener('themeChange', handleThemeChange as EventListener)
  }, [])

  return (
    <aside className="hidden md:flex fixed top-0 left-0 h-screen w-60 bg-card border-r border-border flex-col z-50">
      {/* Header */}
      <div className="p-5 border-b border-border flex justify-center">
        <img 
          src="/images/logo-gante.png" 
          alt="Gante" 
          className="h-10 w-auto"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                isActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${isSaving ? 'bg-warning animate-pulse' : 'bg-success'}`} />
            {isSaving ? 'Salvando...' : 'Salvo'}
          </div>
          
          <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  )
}
