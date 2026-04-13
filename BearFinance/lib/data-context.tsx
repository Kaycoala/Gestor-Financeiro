'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { 
  DadosGlobais, 
  DadosMes, 
  GastoFixo, 
  GastoMensal, 
  ItemCartao, 
  Parcela,
  defaultDadosGlobais, 
  defaultDadosMes 
} from './types'
import { FirebaseManager } from './firebase'

interface DataContextType {
  dadosGlobais: DadosGlobais
  dadosMesAtual: DadosMes
  mesAtual: number
  anoAtual: number
  isLoading: boolean
  isSaving: boolean
  setMes: (mes: number, ano: number) => void
  
  // Salario
  setSalario: (valor: number) => void
  
  // Gastos Fixos
  adicionarGastoFixo: (gasto: Omit<GastoFixo, 'id'>) => void
  editarGastoFixo: (id: number, gasto: Partial<GastoFixo>) => void
  removerGastoFixo: (id: number) => void
  removerGastoFixoMes: (id: number, mes: number, ano: number) => void
  removerGastoFixoAPartirDe: (id: number, mes: number, ano: number) => void
  
  // Gastos Mensais
  adicionarGastoMensal: (gasto: Omit<GastoMensal, 'id'>) => void
  editarGastoMensal: (id: number, gasto: Partial<GastoMensal>) => void
  removerGastoMensal: (id: number) => void
  
  // Cartoes
  adicionarItemCartao: (banco: string, item: Omit<ItemCartao, 'id'>) => void
  editarItemCartao: (banco: string, id: number, item: Partial<ItemCartao>) => void
  removerItemCartao: (banco: string, id: number) => void
  
  // Parcelas
  adicionarParcela: (parcela: Omit<Parcela, 'id'>) => void
  editarParcela: (id: number, parcela: Partial<Parcela>) => void
  removerParcela: (id: number) => void
  
  // Bancos
  adicionarBanco: (nome: string) => void
  removerBanco: (nome: string) => void
  
  // Poupança
  setPoupancaTotal: (valor: number) => void
  setPoupancaMes: (valor: number) => void
  adicionarParaPoupanca: (valor: number) => void
  
  // Calculos
  getGastosFixosFiltrados: () => GastoFixo[]
  getParcelasAtivas: () => (Parcela & { parcelaAtual: number })[]
  getTotalGastosFixos: () => number
  getTotalGastosMensais: () => number
  getTotalCartoes: () => number
  getTotalParcelas: () => number
  getTotalGastos: () => number
  getSobra: () => number
  
  // Sync
  salvarDados: () => Promise<boolean>
  carregarDados: () => Promise<boolean>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

function getChaveMes(mes: number, ano: number): string {
  return `${ano}_${mes}`
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [dadosGlobais, setDadosGlobais] = useState<DadosGlobais>(defaultDadosGlobais)
  const [dadosMeses, setDadosMeses] = useState<Record<string, DadosMes>>({})
  const [mesAtual, setMesAtual] = useState(new Date().getMonth())
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [dadosAlterados, setDadosAlterados] = useState(false)

  const chaveMes = getChaveMes(mesAtual, anoAtual)
  const dadosMesAtual = dadosMeses[chaveMes] || { ...defaultDadosMes }

  // Generate XML
  const gerarXML = useCallback(() => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<financas>\n'
    
    // Dados Globais
    xml += '  <dadosGlobais>\n'
    xml += '    <bancos>\n'
    dadosGlobais.bancos.forEach(banco => {
      xml += `      <banco>${escapeXml(banco)}</banco>\n`
    })
    xml += '    </bancos>\n'
    xml += `    <poupancaTotal>${dadosGlobais.poupancaTotal}</poupancaTotal>\n`
    
    xml += '    <poupancaPorMes>\n'
    for (const chave in dadosGlobais.poupancaPorMes) {
      xml += `      <mes chave="${chave}">${dadosGlobais.poupancaPorMes[chave]}</mes>\n`
    }
    xml += '    </poupancaPorMes>\n'
    
    xml += '    <categorias>\n'
    dadosGlobais.categorias.forEach(c => {
      xml += `      <categoria id="${c.id}">\n`
      xml += `        <nome>${escapeXml(c.nome)}</nome>\n`
      xml += `        <emoji>${escapeXml(c.emoji)}</emoji>\n`
      xml += `        <cor>${escapeXml(c.cor)}</cor>\n`
      xml += '      </categoria>\n'
    })
    xml += '    </categorias>\n'
    
    xml += '    <gastosFixos>\n'
    dadosGlobais.gastosFixos.forEach(g => {
      xml += `      <gasto id="${g.id}">\n`
      xml += `        <nome>${escapeXml(g.nome)}</nome>\n`
      xml += `        <valor>${g.valor}</valor>\n`
      xml += `        <categoriaId>${g.categoriaId || ''}</categoriaId>\n`
      xml += '      </gasto>\n'
    })
    xml += '    </gastosFixos>\n'
    
    xml += '    <gastosFixosExcluidos>\n'
    for (const chave in dadosGlobais.gastosFixosExcluidos) {
      const ids = dadosGlobais.gastosFixosExcluidos[chave]
      if (ids.length > 0) {
        xml += `      <mes chave="${chave}">${ids.join(',')}</mes>\n`
      }
    }
    xml += '    </gastosFixosExcluidos>\n'
    
    xml += '    <gastosFixosExcluidosAPartirDe>\n'
    for (const id in dadosGlobais.gastosFixosExcluidosAPartirDe) {
      xml += `      <item id="${id}">${dadosGlobais.gastosFixosExcluidosAPartirDe[Number(id)]}</item>\n`
    }
    xml += '    </gastosFixosExcluidosAPartirDe>\n'
    
    xml += '  </dadosGlobais>\n'
    
    // Dados por mes
    xml += '  <meses>\n'
    for (const chave in dadosMeses) {
      const mesDados = dadosMeses[chave]
      xml += `    <mes chave="${chave}">\n`
      xml += `      <salario>${mesDados.salario || 0}</salario>\n`
      
      xml += '      <gastosMensais>\n'
      mesDados.gastosMensais.forEach(g => {
        xml += `        <gasto id="${g.id}">\n`
        xml += `          <nome>${escapeXml(g.nome)}</nome>\n`
        xml += `          <valor>${g.valor}</valor>\n`
        xml += `          <categoriaId>${g.categoriaId || ''}</categoriaId>\n`
        xml += '        </gasto>\n'
      })
      xml += '      </gastosMensais>\n'
      
      xml += '      <cartoes>\n'
      for (const banco in mesDados.cartoes) {
        xml += `        <banco nome="${escapeXml(banco)}">\n`
        mesDados.cartoes[banco].forEach(item => {
          xml += `          <item id="${item.id}">\n`
          xml += `            <descricao>${escapeXml(item.descricao)}</descricao>\n`
          xml += `            <valor>${item.valor}</valor>\n`
          xml += '          </item>\n'
        })
        xml += '        </banco>\n'
      }
      xml += '      </cartoes>\n'
      
      xml += '      <parcelas>\n'
      mesDados.parcelas.forEach(p => {
        xml += `        <parcela id="${p.id}">\n`
        xml += `          <descricao>${escapeXml(p.descricao)}</descricao>\n`
        xml += `          <valorTotal>${p.valorTotal}</valorTotal>\n`
        xml += `          <numParcelas>${p.numParcelas}</numParcelas>\n`
        xml += `          <mesInicio>${p.mesInicio}</mesInicio>\n`
        xml += `          <anoInicio>${p.anoInicio}</anoInicio>\n`
        xml += `          <banco>${escapeXml(p.banco)}</banco>\n`
        xml += '        </parcela>\n'
      })
      xml += '      </parcelas>\n'
      
      xml += '    </mes>\n'
    }
    xml += '  </meses>\n'
    xml += '</financas>'
    
    return xml
  }, [dadosGlobais, dadosMeses])

  // Parse XML
  const parseXML = useCallback((xmlString: string) => {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml')
    
    if (xmlDoc.querySelector('parsererror')) {
      console.error('XML parse error')
      return null
    }

    const novosDadosGlobais: DadosGlobais = { ...defaultDadosGlobais }
    const novosDadosMeses: Record<string, DadosMes> = {}

    // Parse dadosGlobais
    const dadosGlobaisEl = xmlDoc.querySelector('dadosGlobais')
    if (dadosGlobaisEl) {
      const bancosEl = dadosGlobaisEl.querySelectorAll('bancos > banco')
      if (bancosEl.length > 0) {
        novosDadosGlobais.bancos = Array.from(bancosEl).map(b => b.textContent || '')
      }

      const poupancaEl = dadosGlobaisEl.querySelector('poupancaTotal')
      if (poupancaEl) {
        novosDadosGlobais.poupancaTotal = parseFloat(poupancaEl.textContent || '0') || 0
      }

      const poupancaMesesEls = dadosGlobaisEl.querySelectorAll('poupancaPorMes > mes')
      poupancaMesesEls.forEach(pEl => {
        const chave = pEl.getAttribute('chave')
        if (chave) {
          novosDadosGlobais.poupancaPorMes[chave] = parseFloat(pEl.textContent || '0') || 0
        }
      })

      const categoriasEls = dadosGlobaisEl.querySelectorAll('categorias > categoria')
      if (categoriasEls.length > 0) {
        novosDadosGlobais.categorias = []
        categoriasEls.forEach(c => {
          const id = parseInt(c.getAttribute('id') || '0') || Date.now() + Math.random()
          const nome = c.querySelector('nome')?.textContent || ''
          const emoji = c.querySelector('emoji')?.textContent || ''
          const cor = c.querySelector('cor')?.textContent || '#64748b'
          if (nome) {
            novosDadosGlobais.categorias.push({ id, nome, emoji, cor })
          }
        })
      }

      const gastosEls = dadosGlobaisEl.querySelectorAll('gastosFixos > gasto')
      novosDadosGlobais.gastosFixos = []
      gastosEls.forEach(g => {
        const id = parseInt(g.getAttribute('id') || '0') || Date.now() + Math.random()
        const nome = g.querySelector('nome')?.textContent || ''
        const valor = parseFloat(g.querySelector('valor')?.textContent || '0') || 0
        const categoriaId = parseInt(g.querySelector('categoriaId')?.textContent || '0') || null
        if (nome && valor > 0) {
          novosDadosGlobais.gastosFixos.push({ id, nome, valor, categoriaId })
        }
      })

      // Parse gastosFixosExcluidos
      const excMesesEls = dadosGlobaisEl.querySelectorAll('gastosFixosExcluidos > mes')
      excMesesEls.forEach(el => {
        const chave = el.getAttribute('chave')
        const idsStr = el.textContent || ''
        if (chave && idsStr) {
          novosDadosGlobais.gastosFixosExcluidos[chave] = idsStr.split(',').map(Number).filter(n => !isNaN(n))
        }
      })

      // Parse gastosFixosExcluidosAPartirDe
      const excAPartirDeEls = dadosGlobaisEl.querySelectorAll('gastosFixosExcluidosAPartirDe > item')
      excAPartirDeEls.forEach(el => {
        const id = parseInt(el.getAttribute('id') || '0')
        const chave = el.textContent || ''
        if (id && chave) {
          novosDadosGlobais.gastosFixosExcluidosAPartirDe[id] = chave
        }
      })
    }

    // Parse meses
    const mesesEls = xmlDoc.querySelectorAll('meses > mes')
    mesesEls.forEach(mesEl => {
      const chave = mesEl.getAttribute('chave')
      if (!chave) return

      const mesDados: DadosMes = {
        cartoes: {},
        parcelas: [],
        salario: 0,
        gastosMensais: []
      }

      const salarioMesEl = mesEl.querySelector('salario')
      if (salarioMesEl) {
        mesDados.salario = parseFloat(salarioMesEl.textContent || '0') || 0
      }

      const gastosMensaisEls = mesEl.querySelectorAll('gastosMensais > gasto')
      gastosMensaisEls.forEach(g => {
        const id = parseInt(g.getAttribute('id') || '0') || Date.now() + Math.random()
        const nome = g.querySelector('nome')?.textContent || ''
        const valor = parseFloat(g.querySelector('valor')?.textContent || '0') || 0
        const categoriaId = parseInt(g.querySelector('categoriaId')?.textContent || '0') || null
        if (nome && valor > 0) {
          mesDados.gastosMensais.push({ id, nome, valor, categoriaId })
        }
      })

      const bancosEls = mesEl.querySelectorAll('cartoes > banco')
      bancosEls.forEach(bancoEl => {
        const nomeBanco = bancoEl.getAttribute('nome')
        if (nomeBanco) {
          mesDados.cartoes[nomeBanco] = []
          const itensEls = bancoEl.querySelectorAll('item')
          itensEls.forEach(itemEl => {
            const id = parseInt(itemEl.getAttribute('id') || '0') || Date.now() + Math.random()
            const descricao = itemEl.querySelector('descricao')?.textContent || ''
            const valor = parseFloat(itemEl.querySelector('valor')?.textContent || '0') || 0
            if (descricao && valor > 0) {
              mesDados.cartoes[nomeBanco].push({ id, descricao, valor })
            }
          })
        }
      })

      const parcelasEls = mesEl.querySelectorAll('parcelas > parcela')
      parcelasEls.forEach(pEl => {
        const id = parseInt(pEl.getAttribute('id') || '0') || Date.now() + Math.random()
        const descricao = pEl.querySelector('descricao')?.textContent || ''
        const valorTotal = parseFloat(pEl.querySelector('valorTotal')?.textContent || '0') || 0
        const numParcelas = parseInt(pEl.querySelector('numParcelas')?.textContent || '1') || 1
        const mesInicio = parseInt(pEl.querySelector('mesInicio')?.textContent || '0') || 0
        const anoInicio = parseInt(pEl.querySelector('anoInicio')?.textContent || String(anoAtual)) || anoAtual
        const banco = pEl.querySelector('banco')?.textContent || ''

        if (descricao && valorTotal > 0) {
          mesDados.parcelas.push({ id, descricao, valorTotal, numParcelas, mesInicio, anoInicio, banco })
        }
      })

      novosDadosMeses[chave] = mesDados
    })

    return { dadosGlobais: novosDadosGlobais, dadosMeses: novosDadosMeses }
  }, [anoAtual])

  // Auto save
  useEffect(() => {
    if (!dadosAlterados) return

    const timer = setTimeout(async () => {
      if (FirebaseManager.temChave()) {
        setIsSaving(true)
        await FirebaseManager.salvarDados(gerarXML())
        setIsSaving(false)
        setDadosAlterados(false)
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [dadosAlterados, gerarXML])

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const user = await FirebaseManager.verificarAutenticacao()
        if (user && FirebaseManager.temChave()) {
          const xmlData = await FirebaseManager.carregarDados()
          if (xmlData) {
            const parsed = parseXML(xmlData)
            if (parsed) {
              setDadosGlobais(parsed.dadosGlobais)
              setDadosMeses(parsed.dadosMeses)
            }
          }
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [parseXML])

  const marcarAlterado = () => setDadosAlterados(true)

  const atualizarMesAtual = (dados: Partial<DadosMes>) => {
    setDadosMeses(prev => ({
      ...prev,
      [chaveMes]: { ...dadosMesAtual, ...dados }
    }))
    marcarAlterado()
  }

  // Context value
  const value: DataContextType = {
    dadosGlobais,
    dadosMesAtual,
    mesAtual,
    anoAtual,
    isLoading,
    isSaving,

    setMes: (mes, ano) => {
      setMesAtual(mes)
      setAnoAtual(ano)
    },

    setSalario: (valor) => {
      atualizarMesAtual({ salario: valor })
    },

    adicionarGastoFixo: (gasto) => {
      setDadosGlobais(prev => ({
        ...prev,
        gastosFixos: [...prev.gastosFixos, { ...gasto, id: Date.now() }]
      }))
      marcarAlterado()
    },

    editarGastoFixo: (id, gasto) => {
      setDadosGlobais(prev => ({
        ...prev,
        gastosFixos: prev.gastosFixos.map(g => g.id === id ? { ...g, ...gasto } : g)
      }))
      marcarAlterado()
    },

    removerGastoFixo: (id) => {
      setDadosGlobais(prev => ({
        ...prev,
        gastosFixos: prev.gastosFixos.filter(g => g.id !== id)
      }))
      marcarAlterado()
    },

    removerGastoFixoMes: (id, mes, ano) => {
      const chave = getChaveMes(mes, ano)
      setDadosGlobais(prev => {
        const excluidos = { ...prev.gastosFixosExcluidos }
        if (!excluidos[chave]) {
          excluidos[chave] = []
        }
        if (!excluidos[chave].includes(id)) {
          excluidos[chave] = [...excluidos[chave], id]
        }
        return { ...prev, gastosFixosExcluidos: excluidos }
      })
      marcarAlterado()
    },

    removerGastoFixoAPartirDe: (id, mes, ano) => {
      const chave = getChaveMes(mes, ano)
      setDadosGlobais(prev => ({
        ...prev,
        gastosFixosExcluidosAPartirDe: { ...prev.gastosFixosExcluidosAPartirDe, [id]: chave }
      }))
      marcarAlterado()
    },

    adicionarGastoMensal: (gasto) => {
      atualizarMesAtual({
        gastosMensais: [...dadosMesAtual.gastosMensais, { ...gasto, id: Date.now() }]
      })
    },

    editarGastoMensal: (id, gasto) => {
      atualizarMesAtual({
        gastosMensais: dadosMesAtual.gastosMensais.map(g => g.id === id ? { ...g, ...gasto } : g)
      })
    },

    removerGastoMensal: (id) => {
      atualizarMesAtual({
        gastosMensais: dadosMesAtual.gastosMensais.filter(g => g.id !== id)
      })
    },

    adicionarItemCartao: (banco, item) => {
      const cartoes = { ...dadosMesAtual.cartoes }
      if (!cartoes[banco]) cartoes[banco] = []
      cartoes[banco] = [...cartoes[banco], { ...item, id: Date.now() }]
      atualizarMesAtual({ cartoes })
    },

    editarItemCartao: (banco, id, item) => {
      const cartoes = { ...dadosMesAtual.cartoes }
      if (cartoes[banco]) {
        cartoes[banco] = cartoes[banco].map(i => i.id === id ? { ...i, ...item } : i)
        atualizarMesAtual({ cartoes })
      }
    },

    removerItemCartao: (banco, id) => {
      const cartoes = { ...dadosMesAtual.cartoes }
      if (cartoes[banco]) {
        cartoes[banco] = cartoes[banco].filter(i => i.id !== id)
        atualizarMesAtual({ cartoes })
      }
    },

    adicionarParcela: (parcela) => {
      atualizarMesAtual({
        parcelas: [...dadosMesAtual.parcelas, { ...parcela, id: Date.now() }]
      })
    },

    editarParcela: (id, parcela) => {
      atualizarMesAtual({
        parcelas: dadosMesAtual.parcelas.map(p => p.id === id ? { ...p, ...parcela } : p)
      })
    },

    removerParcela: (id) => {
      atualizarMesAtual({
        parcelas: dadosMesAtual.parcelas.filter(p => p.id !== id)
      })
    },

    adicionarBanco: (nome) => {
      if (!dadosGlobais.bancos.includes(nome)) {
        setDadosGlobais(prev => ({
          ...prev,
          bancos: [...prev.bancos, nome]
        }))
        marcarAlterado()
      }
    },

    removerBanco: (nome) => {
      setDadosGlobais(prev => ({
        ...prev,
        bancos: prev.bancos.filter(b => b !== nome)
      }))
      marcarAlterado()
    },

    setPoupancaTotal: (valor) => {
      setDadosGlobais(prev => ({ ...prev, poupancaTotal: valor }))
      marcarAlterado()
    },

    setPoupancaMes: (valor) => {
      setDadosGlobais(prev => ({
        ...prev,
        poupancaPorMes: { ...prev.poupancaPorMes, [chaveMes]: valor }
      }))
      marcarAlterado()
    },

    adicionarParaPoupanca: (valor) => {
      // Adiciona o valor na poupança total e registra como gasto mensal para descontar do salário
      setDadosGlobais(prev => ({
        ...prev,
        poupancaTotal: (prev.poupancaTotal || 0) + valor,
        poupancaPorMes: { 
          ...prev.poupancaPorMes, 
          [chaveMes]: (prev.poupancaPorMes[chaveMes] || 0) + valor 
        }
      }))
      
      // Se for depósito (valor positivo), adiciona como gasto mensal para descontar da sobra
      if (valor > 0) {
        const gastoDescricao = `Depósito Poupança`
        atualizarMesAtual({
          gastosMensais: [...dadosMesAtual.gastosMensais, { 
            id: Date.now(), 
            nome: gastoDescricao, 
            valor: valor,
            categoriaId: null 
          }]
        })
      } else {
        // Se for retirada (valor negativo), remove o gasto correspondente se existir
        // ou apenas atualiza a poupança
        marcarAlterado()
      }
    },

    getGastosFixosFiltrados: () => {
      const excluidos = dadosGlobais.gastosFixosExcluidos[chaveMes] || []
      return dadosGlobais.gastosFixos.filter(g => {
        // Verifica se foi excluído neste mês específico
        if (excluidos.includes(g.id)) return false
        // Verifica se foi excluído a partir de algum mês anterior
        const excAPartirDe = dadosGlobais.gastosFixosExcluidosAPartirDe[g.id]
        if (excAPartirDe) {
          const [anoExc, mesExc] = excAPartirDe.split('_').map(Number)
          if (anoAtual > anoExc || (anoAtual === anoExc && mesAtual >= mesExc)) {
            return false
          }
        }
        return true
      })
    },
    getTotalGastosFixos: () => {
      return value.getGastosFixosFiltrados().reduce((acc, g) => acc + g.valor, 0)
    },
    getParcelasAtivas: () => {
      const todasParcelas: (Parcela & { parcelaAtual: number })[] = []
      
      // Itera por todos os meses para encontrar parcelas ativas
      for (const chave in dadosMeses) {
        const mesDados = dadosMeses[chave]
        mesDados.parcelas.forEach(parcela => {
          const mesesPassados = (anoAtual - parcela.anoInicio) * 12 + (mesAtual - parcela.mesInicio)
          const parcelaAtual = mesesPassados + 1
          
          if (parcelaAtual >= 1 && parcelaAtual <= parcela.numParcelas) {
            todasParcelas.push({ ...parcela, parcelaAtual })
          }
        })
      }
      
      return todasParcelas
    },
    getTotalGastosMensais: () => dadosMesAtual.gastosMensais.reduce((acc, g) => acc + g.valor, 0),
    getTotalCartoes: () => {
      let total = 0
      for (const banco in dadosMesAtual.cartoes) {
        total += dadosMesAtual.cartoes[banco].reduce((acc, i) => acc + i.valor, 0)
      }
      return total
    },
    getTotalParcelas: () => value.getParcelasAtivas().reduce((acc, p) => acc + (p.valorTotal / p.numParcelas), 0),
    getTotalGastos: () => {
      return value.getTotalGastosFixos() + value.getTotalGastosMensais() + value.getTotalCartoes() + value.getTotalParcelas()
    },
    getSobra: () => dadosMesAtual.salario - value.getTotalGastos(),

    salvarDados: async () => {
      setIsSaving(true)
      const result = await FirebaseManager.salvarDados(gerarXML())
      setIsSaving(false)
      setDadosAlterados(false)
      return result
    },

    carregarDados: async () => {
      setIsLoading(true)
      const xmlData = await FirebaseManager.carregarDados()
      if (xmlData) {
        const parsed = parseXML(xmlData)
        if (parsed) {
          setDadosGlobais(parsed.dadosGlobais)
          setDadosMeses(parsed.dadosMeses)
          setIsLoading(false)
          return true
        }
      }
      setIsLoading(false)
      return false
    }
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
