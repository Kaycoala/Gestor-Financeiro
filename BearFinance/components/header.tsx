'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, LogOut, Cloud, Sun, Moon } from 'lucide-react'
import { FirebaseManager } from '@/lib/firebase'
import { useData } from '@/lib/data-context'

const meses = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const router = useRouter()
  const { mesAtual, anoAtual, setMes, carregarDados } = useData()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [usuario, setUsuario] = useState<{ username: string } | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setIsDark(saved === 'dark' || (!saved && prefersDark))
    
    const user = FirebaseManager.getUsuario()
    if (user) setUsuario(user)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const anos = []
  const currentYear = new Date().getFullYear()
  for (let i = currentYear - 2; i <= currentYear + 2; i++) {
    anos.push(i)
  }

  const handleLogout = async () => {
    await FirebaseManager.logout()
    router.push('/login')
  }

  const handleCarregarNuvem = async () => {
    await carregarDados()
    setShowUserMenu(false)
  }

  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border safe-top">
      <div className="flex items-center justify-between h-14 px-4 md:px-6">
        {/* Title - visible on mobile */}
        <h2 className="text-lg font-semibold text-foreground md:hidden">{title}</h2>
        
        {/* Month/Year selector - desktop */}
        <div className="hidden md:flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Month/Year Picker */}
          <div className="relative">
            <button
              onClick={() => setShowMonthPicker(!showMonthPicker)}
              className="flex items-center gap-2 h-9 px-3 bg-secondary rounded-lg text-sm font-medium text-foreground"
            >
              <span className="hidden sm:inline">{meses[mesAtual]}</span>
              <span className="sm:hidden">{meses[mesAtual].substring(0, 3)}</span>
              <span>{anoAtual}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>

            {showMonthPicker && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowMonthPicker(false)} 
                />
                <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-lg shadow-lg z-50 p-4 w-72">
                  {/* Year selector */}
                  <div className="flex items-center justify-between mb-4">
                    <button 
                      onClick={() => setMes(mesAtual, anoAtual - 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground"
                    >
                      &lt;
                    </button>
                    <span className="font-semibold text-foreground">{anoAtual}</span>
                    <button 
                      onClick={() => setMes(mesAtual, anoAtual + 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground"
                    >
                      &gt;
                    </button>
                  </div>
                  
                  {/* Month grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {meses.map((mes, index) => (
                      <button
                        key={mes}
                        onClick={() => {
                          setMes(index, anoAtual)
                          setShowMonthPicker(false)
                        }}
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          index === mesAtual 
                            ? 'bg-primary text-primary-foreground' 
                            : 'hover:bg-secondary text-foreground'
                        }`}
                      >
                        {mes.substring(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Theme toggle - mobile only */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg bg-secondary text-muted-foreground"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 h-9 pl-1 pr-3 bg-secondary rounded-full"
            >
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                {usuario?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="hidden sm:inline text-sm font-medium text-foreground">
                {usuario?.username || 'Usuario'}
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>

            {showUserMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowUserMenu(false)} 
                />
                <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-lg shadow-lg z-50 w-56 overflow-hidden">
                  <div className="p-3 border-b border-border">
                    <p className="text-xs text-muted-foreground">@{usuario?.username}</p>
                  </div>
                  
                  <div className="p-1">
                    <button
                      onClick={handleCarregarNuvem}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
                    >
                      <Cloud className="w-4 h-4" />
                      Carregar da Nuvem
                    </button>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sair
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
