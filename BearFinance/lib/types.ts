export interface Categoria {
  id: number
  nome: string
  emoji: string
  cor: string
}

export interface GastoFixo {
  id: number
  nome: string
  valor: number
  categoriaId: number | null
}

export interface GastoMensal {
  id: number
  nome: string
  valor: number
  categoriaId: number | null
}

export interface ItemCartao {
  id: number
  descricao: string
  valor: number
}

export interface Parcela {
  id: number
  descricao: string
  valorTotal: number
  numParcelas: number
  mesInicio: number
  anoInicio: number
  banco: string
}

export interface DadosMes {
  cartoes: Record<string, ItemCartao[]>
  parcelas: Parcela[]
  salario: number
  gastosMensais: GastoMensal[]
}

export interface DadosGlobais {
  gastosFixos: GastoFixo[]
  bancos: string[]
  poupancaTotal: number
  poupancaPorMes: Record<string, number>
  categorias: Categoria[]
}

export interface AppData {
  dadosGlobais: DadosGlobais
  dadosMeses: Record<string, DadosMes>
}

export const defaultDadosGlobais: DadosGlobais = {
  gastosFixos: [],
  bancos: ['Nubank', 'Itau', 'Inter', 'Outros'],
  poupancaTotal: 0,
  poupancaPorMes: {},
  categorias: [
    { id: 1, nome: 'Moradia', emoji: '', cor: '#0066ff' },
    { id: 2, nome: 'Transporte', emoji: '', cor: '#059669' },
    { id: 3, nome: 'Alimentacao', emoji: '', cor: '#dc2626' },
    { id: 4, nome: 'Saude', emoji: '', cor: '#7c3aed' },
    { id: 5, nome: 'Educacao', emoji: '', cor: '#d97706' },
    { id: 6, nome: 'Lazer', emoji: '', cor: '#0891b2' },
    { id: 7, nome: 'Servicos', emoji: '', cor: '#be185d' },
    { id: 8, nome: 'Outros', emoji: '', cor: '#64748b' }
  ]
}

export const defaultDadosMes: DadosMes = {
  cartoes: {},
  parcelas: [],
  salario: 0,
  gastosMensais: []
}
