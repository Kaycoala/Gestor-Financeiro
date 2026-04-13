'use client'

import { useState } from 'react'
import { useData } from '@/lib/data-context'
import { TrendingDown, TrendingUp, PiggyBank, Edit2, X, Check, Plus, Minus } from 'lucide-react'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function Dashboard() {
  const { 
    dadosGlobais, 
    dadosMesAtual,
    getTotalGastosFixos,
    getTotalGastosMensais,
    getTotalCartoes,
    getTotalParcelas,
    getTotalGastos,
    getSobra,
    setSalario,
    setPoupancaTotal,
    adicionarParaPoupanca
  } = useData()

  const [editingSalario, setEditingSalario] = useState(false)
  const [editingPoupanca, setEditingPoupanca] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [salarioInput, setSalarioInput] = useState('')
  const [poupancaInput, setPoupancaInput] = useState('')
  const [depositoInput, setDepositoInput] = useState('')
  const [depositoTipo, setDepositoTipo] = useState<'depositar' | 'retirar'>('depositar')

  const totalGastos = getTotalGastos()
  const sobra = getSobra()

  const handleSaveSalario = () => {
    const valor = parseFloat(salarioInput.replace(',', '.')) || 0
    setSalario(valor)
    setEditingSalario(false)
  }

  const handleSavePoupanca = () => {
    const valor = parseFloat(poupancaInput.replace(',', '.')) || 0
    setPoupancaTotal(valor)
    setEditingPoupanca(false)
  }

  const handleDeposito = () => {
    const valor = parseFloat(depositoInput.replace(',', '.')) || 0
    if (valor <= 0) return

    if (depositoTipo === 'depositar') {
      // Verifica se há saldo suficiente na sobra
      if (valor > sobra) {
        alert('Valor maior que a sobra disponível!')
        return
      }
      adicionarParaPoupanca(valor)
    } else {
      // Retirar da poupança
      if (valor > dadosGlobais.poupancaTotal) {
        alert('Valor maior que o saldo da poupança!')
        return
      }
      adicionarParaPoupanca(-valor)
    }
    
    setDepositoInput('')
    setShowDepositModal(false)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Salário */}
        <div 
          className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {
            setSalarioInput(String(dadosMesAtual.salario || ''))
            setEditingSalario(true)
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Salário</span>
            <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <p className="text-xl md:text-2xl font-bold text-foreground">
            {formatCurrency(dadosMesAtual.salario || 0)}
          </p>
          <div className="h-1 bg-success/20 rounded-full mt-3">
            <div className="h-full bg-success rounded-full" style={{ width: '100%' }} />
          </div>
        </div>

        {/* Total Gastos */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Gastos</span>
            <TrendingDown className="w-3.5 h-3.5 text-destructive" />
          </div>
          <p className="text-xl md:text-2xl font-bold text-destructive">
            {formatCurrency(totalGastos)}
          </p>
          <div className="h-1 bg-destructive/20 rounded-full mt-3">
            <div 
              className="h-full bg-destructive rounded-full" 
              style={{ width: dadosMesAtual.salario ? `${Math.min((totalGastos / dadosMesAtual.salario) * 100, 100)}%` : '0%' }} 
            />
          </div>
        </div>

        {/* Sobra */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sobra</span>
            <TrendingUp className={`w-3.5 h-3.5 ${sobra >= 0 ? 'text-success' : 'text-destructive'}`} />
          </div>
          <p className={`text-xl md:text-2xl font-bold ${sobra >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(sobra)}
          </p>
          <div className="h-1 bg-primary/20 rounded-full mt-3">
            <div 
              className="h-full bg-primary rounded-full" 
              style={{ width: dadosMesAtual.salario && sobra > 0 ? `${(sobra / dadosMesAtual.salario) * 100}%` : '0%' }} 
            />
          </div>
        </div>

        {/* Poupança */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Poupança</span>
            <PiggyBank className="w-3.5 h-3.5 text-primary" />
          </div>
          <p className="text-xl md:text-2xl font-bold text-primary">
            {formatCurrency(dadosGlobais.poupancaTotal || 0)}
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                setDepositoTipo('depositar')
                setDepositoInput('')
                setShowDepositModal(true)
              }}
              className="flex-1 h-8 flex items-center justify-center gap-1 bg-success/10 text-success text-xs font-medium rounded-lg hover:bg-success/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Depositar
            </button>
            <button
              onClick={() => {
                setDepositoTipo('retirar')
                setDepositoInput('')
                setShowDepositModal(true)
              }}
              className="flex-1 h-8 flex items-center justify-center gap-1 bg-destructive/10 text-destructive text-xs font-medium rounded-lg hover:bg-destructive/20 transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
              Retirar
            </button>
          </div>
        </div>
      </div>

      {/* Resumos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Resumo de Gastos */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Resumo de Gastos</h3>
            <span className="text-xs bg-secondary px-2 py-1 rounded-full text-muted-foreground">
              {dadosGlobais.gastosFixos.length} fixos
            </span>
          </div>
          <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
            {dadosGlobais.gastosFixos.length === 0 && dadosMesAtual.gastosMensais.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum gasto cadastrado</p>
            ) : (
              <>
                {dadosGlobais.gastosFixos.slice(0, 5).map((gasto) => {
                  const categoria = dadosGlobais.categorias.find(c => c.id === gasto.categoriaId)
                  return (
                    <div key={gasto.id} className="flex items-center justify-between py-2 px-3 bg-secondary/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: categoria?.cor || '#64748b' }}
                        />
                        <span className="text-sm font-medium text-foreground">{gasto.nome}</span>
                      </div>
                      <span className="text-sm font-semibold text-destructive">
                        {formatCurrency(gasto.valor)}
                      </span>
                    </div>
                  )
                })}
                {dadosGlobais.gastosFixos.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{dadosGlobais.gastosFixos.length - 5} mais...
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Resumo por Banco */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Resumo por Banco</h3>
            <span className="text-xs bg-secondary px-2 py-1 rounded-full text-muted-foreground">
              {dadosGlobais.bancos.length} bancos
            </span>
          </div>
          <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
            {dadosGlobais.bancos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum banco cadastrado</p>
            ) : (
              dadosGlobais.bancos.map((banco) => {
                const itens = dadosMesAtual.cartoes[banco] || []
                const total = itens.reduce((acc, i) => acc + i.valor, 0)
                return (
                  <div key={banco} className="flex items-center justify-between py-2 px-3 bg-secondary/50 rounded-lg">
                    <span className="text-sm font-medium text-foreground">{banco}</span>
                    <span className="text-sm font-semibold text-destructive">
                      {formatCurrency(total)}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Edit Salário Modal */}
      {editingSalario && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Editar Salário</h3>
              <button onClick={() => setEditingSalario(false)} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="number"
              value={salarioInput}
              onChange={(e) => setSalarioInput(e.target.value)}
              placeholder="0.00"
              className="w-full h-12 px-4 bg-background border border-input rounded-lg text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <button
              onClick={handleSaveSalario}
              className="w-full h-12 mt-4 bg-primary text-primary-foreground font-medium rounded-lg flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Salvar
            </button>
          </div>
        </div>
      )}

      {/* Edit Poupança Modal */}
      {editingPoupanca && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Editar Poupança Total</h3>
              <button onClick={() => setEditingPoupanca(false)} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="number"
              value={poupancaInput}
              onChange={(e) => setPoupancaInput(e.target.value)}
              placeholder="0.00"
              className="w-full h-12 px-4 bg-background border border-input rounded-lg text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <button
              onClick={handleSavePoupanca}
              className="w-full h-12 mt-4 bg-primary text-primary-foreground font-medium rounded-lg flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Salvar
            </button>
          </div>
        </div>
      )}

      {/* Depósito/Retirada Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {depositoTipo === 'depositar' ? 'Depositar na Poupança' : 'Retirar da Poupança'}
              </h3>
              <button onClick={() => setShowDepositModal(false)} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-secondary rounded-lg">
              {depositoTipo === 'depositar' ? (
                <p className="text-sm text-muted-foreground">
                  Sobra disponível: <span className="font-semibold text-success">{formatCurrency(sobra)}</span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Saldo da poupança: <span className="font-semibold text-primary">{formatCurrency(dadosGlobais.poupancaTotal)}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Valor</label>
              <input
                type="number"
                value={depositoInput}
                onChange={(e) => setDepositoInput(e.target.value)}
                placeholder="0.00"
                step="0.01"
                className="w-full h-12 px-4 bg-background border border-input rounded-lg text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDepositModal(false)}
                className="flex-1 h-12 border border-border text-foreground font-medium rounded-lg hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeposito}
                className={`flex-1 h-12 font-medium rounded-lg flex items-center justify-center gap-2 transition-colors ${
                  depositoTipo === 'depositar' 
                    ? 'bg-success text-success-foreground hover:bg-success/90' 
                    : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                }`}
              >
                <Check className="w-5 h-5" />
                {depositoTipo === 'depositar' ? 'Depositar' : 'Retirar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
