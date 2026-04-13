'use client'

import { LayoutDashboard, Receipt, Calendar, CreditCard, BarChart3 } from 'lucide-react'

interface MobileNavProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

const navItems = [
  { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
  { id: 'gastos', label: 'Fixos', icon: Receipt },
  { id: 'gastosMensais', label: 'Mensais', icon: Calendar },
  { id: 'cartoes', label: 'Cartões', icon: CreditCard },
  { id: 'relatorios', label: 'Gráficos', icon: BarChart3 },
]

export function MobileNav({ activeSection, onSectionChange }: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-bottom z-50 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
