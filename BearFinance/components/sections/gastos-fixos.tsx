'use client'

import { useState } from 'react'
import { useData } from '@/lib/data-context'
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react'
import { GastoFixo } from '@/lib/types'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function GastosFixos() {
  const { 
    dadosGlobais, 
    getTotalGastosFixos,
    adicionarGastoFixo,
    editarGastoFixo,
    removerGastoFixo
  } = useData()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ nome: '', valor: '', categoriaId: '' })

  const totalGastosFixos = getTotalGastosFixos()

  const handleSubmit = () => {
    const valor = parseFloat(formData.valor.replace(',', '.')) || 0
    if (!formData.nome || valor <= 0) return

    if (editingId) {
      editarGastoFixo(editingId, {
        nome: formData.nome,
        valor,
        categoriaId: formData.categoriaId ? parseInt(formData.categoriaId) : null
      })
      setEditingId(null)
    } else {
      adicionarGastoFixo({
        nome: formData.nome,
        valor,
        categoriaId: formData.categoriaId ? parseInt(formData.categoriaId) : null
      })
    }
    
    setFormData({ nome: '', valor: '', categoriaId: '' })
    setShowForm(false)
  }

  const startEdit = (gasto: GastoFixo) => {
    setFormData({
      nome: gasto.nome,
      valor: String(gasto.valor),
      categoriaId: gasto.categoriaId ? String(gasto.categoriaId) : ''
    })
    setEditingId(gasto.id)
    setShowForm(true)
  }

  const handleDelete = (id: number) => {
    if (confirm('Deseja remover este gasto fixo?')) {
      removerGastoFixo(id)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Gastos Fixos</h2>
          <p className="text-sm text-muted-foreground">Aparecem em todos os meses</p>
        </div>
        <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
          Total: {formatCurrency(totalGastosFixos)}
        </span>
      </div>

      {/* List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {dadosGlobais.gastosFixos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum gasto fixo cadastrado.</p>
        ) : (
          <div className="divide-y divide-border">
            {dadosGlobais.gastosFixos.map((gasto) => {
              const categoria = dadosGlobais.categorias.find(c => c.id === gasto.categoriaId)
              return (
                <div key={gasto.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: categoria?.cor || '#64748b' }}
                    />
                    <div>
                      <p className="font-medium text-foreground">{gasto.nome}</p>
                      {categoria && (
                        <p className="text-xs text-muted-foreground">{categoria.nome}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-destructive">
                      {formatCurrency(gasto.valor)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(gasto)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(gasto.id)}
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
        )}
      </div>

      {/* Add Button */}
      <button
        onClick={() => {
          setFormData({ nome: '', valor: '', categoriaId: '' })
          setEditingId(null)
          setShowForm(true)
        }}
        className="w-full h-12 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-5 h-5" />
        Adicionar Gasto Fixo
      </button>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-card rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">
                {editingId ? 'Editar Gasto Fixo' : 'Novo Gasto Fixo'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Nome</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Aluguel"
                  className="w-full h-12 px-4 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Categoria</label>
                <select
                  value={formData.categoriaId}
                  onChange={(e) => setFormData({ ...formData, categoriaId: e.target.value })}
                  className="w-full h-12 px-4 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione</option>
                  {dadosGlobais.categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
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
    </div>
  )
}
