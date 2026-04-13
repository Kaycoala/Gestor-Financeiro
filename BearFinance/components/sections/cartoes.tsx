'use client'

import { useState } from 'react'
import { useData } from '@/lib/data-context'
import { Plus, Edit2, Trash2, X, Check, CreditCard, Calendar } from 'lucide-react'
import { Parcela } from '@/lib/types'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export function Cartoes() {
  const { 
    dadosGlobais, 
    dadosMesAtual,
    mesAtual,
    anoAtual,
    getTotalCartoes,
    getParcelasAtivas,
    adicionarItemCartao,
    editarItemCartao,
    removerItemCartao,
    adicionarBanco,
    removerBanco,
    adicionarParcela,
    editarParcela,
    removerParcela
  } = useData()

  const [selectedBanco, setSelectedBanco] = useState(dadosGlobais.bancos[0] || '')
  const [showForm, setShowForm] = useState(false)
  const [showBancoForm, setShowBancoForm] = useState(false)
  const [showParcelaForm, setShowParcelaForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingParcelaId, setEditingParcelaId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ descricao: '', valor: '' })
  const [parcelaData, setParcelaData] = useState({ 
    descricao: '', 
    valorTotal: '', 
    numParcelas: '2',
    banco: ''
  })
  const [novoBanco, setNovoBanco] = useState('')

  const parcelasAtivas = getParcelasAtivas()
  const totalCartoes = getTotalCartoes()
  const itensCartao = dadosMesAtual.cartoes[selectedBanco] || []
  const totalBanco = itensCartao.reduce((acc, i) => acc + i.valor, 0)
  const totalParcelas = parcelasAtivas.reduce((acc, p) => acc + (p.valorTotal / p.numParcelas), 0)

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

  const handleSubmitParcela = () => {
    const valorTotal = parseFloat(parcelaData.valorTotal.replace(',', '.')) || 0
    const numParcelas = parseInt(parcelaData.numParcelas) || 2
    
    if (!parcelaData.descricao || valorTotal <= 0 || numParcelas < 2) return

    if (editingParcelaId) {
      editarParcela(editingParcelaId, {
        descricao: parcelaData.descricao,
        valorTotal,
        numParcelas,
        banco: parcelaData.banco || selectedBanco
      })
      setEditingParcelaId(null)
    } else {
      adicionarParcela({
        descricao: parcelaData.descricao,
        valorTotal,
        numParcelas,
        mesInicio: mesAtual,
        anoInicio: anoAtual,
        banco: parcelaData.banco || selectedBanco
      })
    }
    
    setParcelaData({ descricao: '', valorTotal: '', numParcelas: '2', banco: '' })
    setShowParcelaForm(false)
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

  const handleDeleteParcela = (id: number) => {
    if (confirm('Deseja remover esta parcela?')) {
      removerParcela(id)
    }
  }

  const startEditParcela = (parcela: Parcela) => {
    setParcelaData({
      descricao: parcela.descricao,
      valorTotal: String(parcela.valorTotal),
      numParcelas: String(parcela.numParcelas),
      banco: parcela.banco
    })
    setEditingParcelaId(parcela.id)
    setShowParcelaForm(true)
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
          Total: {formatCurrency(totalCartoes + totalParcelas)}
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

      {/* Parcelas Section */}
      {parcelasAtivas.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border bg-warning/10">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-warning" />
              <span className="font-semibold text-foreground">Parcelas Ativas</span>
            </div>
            <span className="font-bold text-warning">{formatCurrency(totalParcelas)}</span>
          </div>
          
          <div className="divide-y divide-border">
            {parcelasAtivas.map((parcela) => {
              const valorParcela = parcela.valorTotal / parcela.numParcelas
              return (
                <div key={parcela.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-foreground">{parcela.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      Parcela {parcela.parcelaAtual}/{parcela.numParcelas} 
                      {parcela.banco && ` - ${parcela.banco}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-warning">
                      {formatCurrency(valorParcela)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEditParcela(parcela)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteParcela(parcela.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {selectedBanco && (
          <button
            onClick={() => {
              setFormData({ descricao: '', valor: '' })
              setEditingId(null)
              setShowForm(true)
            }}
            className="flex-1 h-12 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Item
          </button>
        )}
        <button
          onClick={() => {
            setParcelaData({ descricao: '', valorTotal: '', numParcelas: '2', banco: selectedBanco })
            setEditingParcelaId(null)
            setShowParcelaForm(true)
          }}
          className="flex-1 h-12 flex items-center justify-center gap-2 border-2 border-warning text-warning font-medium rounded-xl hover:bg-warning/10 transition-colors"
        >
          <Calendar className="w-5 h-5" />
          Nova Parcela
        </button>
      </div>

      {/* Item Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl w-full max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
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

      {/* Parcela Form Modal */}
      {showParcelaForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl w-full max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">
                {editingParcelaId ? 'Editar Parcela' : 'Nova Parcela'}
              </h3>
              <button onClick={() => setShowParcelaForm(false)} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Descricao</label>
                <input
                  type="text"
                  value={parcelaData.descricao}
                  onChange={(e) => setParcelaData({ ...parcelaData, descricao: e.target.value })}
                  placeholder="Ex: TV Nova"
                  className="w-full h-12 px-4 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Valor Total</label>
                <input
                  type="number"
                  value={parcelaData.valorTotal}
                  onChange={(e) => setParcelaData({ ...parcelaData, valorTotal: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full h-12 px-4 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Numero de Parcelas</label>
                <input
                  type="number"
                  value={parcelaData.numParcelas}
                  onChange={(e) => setParcelaData({ ...parcelaData, numParcelas: e.target.value })}
                  placeholder="2"
                  min="2"
                  max="48"
                  className="w-full h-12 px-4 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Banco/Cartao</label>
                <select
                  value={parcelaData.banco}
                  onChange={(e) => setParcelaData({ ...parcelaData, banco: e.target.value })}
                  className="w-full h-12 px-4 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione</option>
                  {dadosGlobais.bancos.map((banco) => (
                    <option key={banco} value={banco}>{banco}</option>
                  ))}
                </select>
              </div>

              {parcelaData.valorTotal && parcelaData.numParcelas && (
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Valor por parcela:</p>
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency((parseFloat(parcelaData.valorTotal) || 0) / (parseInt(parcelaData.numParcelas) || 1))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Inicio: {meses[mesAtual]} {anoAtual}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowParcelaForm(false)}
                className="flex-1 h-12 border border-border text-foreground font-medium rounded-lg hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitParcela}
                className="flex-1 h-12 bg-warning text-warning-foreground font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-warning/90 transition-colors"
              >
                <Check className="w-5 h-5" />
                {editingParcelaId ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Bank Modal */}
      {showBancoForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl w-full max-w-md p-6 animate-slide-up">
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
