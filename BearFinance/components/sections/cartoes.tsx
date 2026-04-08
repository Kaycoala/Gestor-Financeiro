'use client'

import { useState } from 'react'
import { useData } from '@/lib/data-context'
import { Plus, Edit2, Trash2, X, Check, CreditCard } from 'lucide-react'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function Cartoes() {
  const { 
    dadosGlobais, 
    dadosMesAtual,
    getTotalCartoes,
    adicionarItemCartao,
    editarItemCartao,
    removerItemCartao,
    adicionarBanco,
    removerBanco
  } = useData()

  const [selectedBanco, setSelectedBanco] = useState(dadosGlobais.bancos[0] || '')
  const [showForm, setShowForm] = useState(false)
  const [showBancoForm, setShowBancoForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ descricao: '', valor: '' })
  const [novoBanco, setNovoBanco] = useState('')

  const totalCartoes = getTotalCartoes()
  const itensCartao = dadosMesAtual.cartoes[selectedBanco] || []
  const totalBanco = itensCartao.reduce((acc, i) => acc + i.valor, 0)

  const handleSubmit = () => {
    const valor = parseFloat(formData.valor.replace(',', '.')) || 0
    if (!formData.descricao || valor <= 0) return

    if (editingId) {
      editarItemCartao(selectedBanco, editingId, {
        descricao: formData.descricao,
        valor
      })
      setEditingId(null)
    } else {
      adicionarItemCartao(selectedBanco, {
        descricao: formData.descricao,
        valor
      })
    }
    
    setFormData({ descricao: '', valor: '' })
    setShowForm(false)
  }

  const handleAddBanco = () => {
    if (novoBanco.trim()) {
      adicionarBanco(novoBanco.trim())
      setSelectedBanco(novoBanco.trim())
      setNovoBanco('')
      setShowBancoForm(false)
    }
  }

  const handleDeleteBanco = (banco: string) => {
    if (confirm(`Deseja remover o banco "${banco}"?`)) {
      removerBanco(banco)
      if (selectedBanco === banco) {
        setSelectedBanco(dadosGlobais.bancos[0] || '')
      }
    }
  }

  const handleDeleteItem = (id: number) => {
    if (confirm('Deseja remover este item?')) {
      removerItemCartao(selectedBanco, id)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Cartoes de Credito</h2>
          <p className="text-sm text-muted-foreground">Itens do cartao por banco</p>
        </div>
        <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
          Total: {formatCurrency(totalCartoes)}
        </span>
      </div>

      {/* Bank Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        {dadosGlobais.bancos.map((banco) => {
          const total = (dadosMesAtual.cartoes[banco] || []).reduce((acc, i) => acc + i.valor, 0)
          return (
            <button
              key={banco}
              onClick={() => setSelectedBanco(banco)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                selectedBanco === banco 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-card border border-border text-foreground hover:bg-secondary'
              }`}
            >
              {banco}
              <span className="ml-2 opacity-70">{formatCurrency(total)}</span>
            </button>
          )
        })}
        <button
          onClick={() => setShowBancoForm(true)}
          className="flex-shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium bg-card border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-solid transition-colors"
        >
          <Plus className="w-4 h-4 inline mr-1" />
          Banco
        </button>
      </div>

      {/* Selected Bank Content */}
      {selectedBanco && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Bank Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/50">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">{selectedBanco}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-destructive">{formatCurrency(totalBanco)}</span>
              <button
                onClick={() => handleDeleteBanco(selectedBanco)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Items List */}
          {itensCartao.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum item cadastrado</p>
          ) : (
            <div className="divide-y divide-border">
              {itensCartao.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4">
                  <span className="font-medium text-foreground">{item.descricao}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-destructive">
                      {formatCurrency(item.valor)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setFormData({ descricao: item.descricao, valor: String(item.valor) })
                          setEditingId(item.id)
                          setShowForm(true)
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Item Button */}
      {selectedBanco && (
        <button
          onClick={() => {
            setFormData({ descricao: '', valor: '' })
            setEditingId(null)
            setShowForm(true)
          }}
          className="w-full h-12 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Adicionar Item
        </button>
      )}

      {/* Item Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-card rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">
                {editingId ? 'Editar Item' : 'Novo Item'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Descricao</label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Ex: Netflix"
                  className="w-full h-12 px-4 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Valor</label>
                <input
                  type="number"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full h-12 px-4 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 h-12 border border-border text-foreground font-medium rounded-lg hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 h-12 bg-primary text-primary-foreground font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
              >
                <Check className="w-5 h-5" />
                {editingId ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Bank Modal */}
      {showBancoForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-card rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Novo Banco</h3>
              <button onClick={() => setShowBancoForm(false)} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Nome do Banco</label>
              <input
                type="text"
                value={novoBanco}
                onChange={(e) => setNovoBanco(e.target.value)}
                placeholder="Ex: Santander"
                className="w-full h-12 px-4 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBancoForm(false)}
                className="flex-1 h-12 border border-border text-foreground font-medium rounded-lg hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddBanco}
                className="flex-1 h-12 bg-primary text-primary-foreground font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
              >
                <Check className="w-5 h-5" />
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
