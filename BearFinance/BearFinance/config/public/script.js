/**
 * Finance Manager - JavaScript Puro
 * Com integracao Firebase para salvar na nuvem
 * Importar/Exportar XML manualmente
 */

// ========================================
// Estado da Aplicacao
// ========================================

// Dados globais (persistem entre meses)
let dadosGlobais = {
    gastosFixos: [],      // Gastos fixos aparecem em todos os meses
    bancos: ['Nubank', 'Itau', 'Inter', 'Outros'],
    poupancaTotal: 0,
    poupancaPorMes: {},   // { "2024_0": 500, ... } - valor guardado na poupanca por mes
    categorias: [         // Categorias para gastos fixos
        { id: 1, nome: 'Moradia', emoji: '🏠', cor: '#0066ff' },
        { id: 2, nome: 'Transporte', emoji: '🚗', cor: '#059669' },
        { id: 3, nome: 'Alimentacao', emoji: '🍔', cor: '#dc2626' },
        { id: 4, nome: 'Saude', emoji: '💊', cor: '#7c3aed' },
        { id: 5, nome: 'Educacao', emoji: '📚', cor: '#d97706' },
        { id: 6, nome: 'Lazer', emoji: '🎮', cor: '#0891b2' },
        { id: 7, nome: 'Servicos', emoji: '📱', cor: '#be185d' },
        { id: 8, nome: 'Outros', emoji: '📦', cor: '#64748b' }
    ]
};

// Dados por mes
let dadosMeses = {};      // { "2024_0": { cartoes: {}, parcelas: [], salario: 0, gastosMensais: [] }, ... }

// Dados do mes atual (referencia ao dadosMeses)
let dadosMesAtual = {
    cartoes: {},
    parcelas: [],         // { id, descricao, valorTotal, numParcelas, parcelaAtual, mesInicio, anoInicio, banco }
    salario: 0,           // Salario do mes atual
    gastosMensais: []     // Gastos que aparecem apenas neste mes { id, nome, valor, categoriaId }
};

let bancoAtual = '';
let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();
let grafico = null;
let tipoGrafico = 'pie';
let dadosAlterados = false;
let usuarioLogado = null;
let salvamentoTimeout = null;

// ========================================
// Inicializacao
// ========================================

document.addEventListener('DOMContentLoaded', async function() {
    // Mostrar estado de carregamento
    mostrarCarregando(true);
    
    preencherAnos();
    
    document.getElementById('mesSelect').value = mesAtual;
    document.getElementById('anoSelect').value = anoAtual;
    
    carregarTema();
    configurarEventos();
    configurarSalvamentoAutomatico();
    
    // Tentar carregar dados do Firebase PRIMEIRO (antes de inicializar interface)
    await inicializarFirebase();
    
    // Inicializar dados do mes atual (apos carregar da nuvem)
    inicializarMesAtual();
    
    renderizarTabsBancos();
    
    if (dadosGlobais.bancos.length > 0) {
        selecionarBanco(dadosGlobais.bancos[0]);
    }
    
    atualizarInterface();
    inicializarGrafico();
    
    // Esconder estado de carregamento
    mostrarCarregando(false);
});

function mostrarCarregando(mostrar) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = mostrar ? 'flex' : 'none';
    }
}

// ========================================
// Firebase - Autenticacao e Dados
// ========================================

async function inicializarFirebase() {
    // Verificar se FirebaseManager existe (arquivo firebase.js carregado)
    if (typeof FirebaseManager === 'undefined') {
        console.log('Firebase nao configurado - modo offline');
        esconderElementosFirebase();
        atualizarStatusSalvo(true, 'Modo offline');
        return;
    }
    
    try {
        atualizarStatusSalvo(false, 'Conectando...');
        usuarioLogado = await FirebaseManager.verificarAutenticacao();
        
        if (usuarioLogado) {
            atualizarUIUsuario();
            atualizarStatusSalvo(false, 'Carregando dados...');
            // Carregar dados da nuvem automaticamente
            await carregarDaNuvem(true); // silencioso
        }
    } catch (err) {
        console.log('Erro ao inicializar Firebase:', err);
        esconderElementosFirebase();
    }
}

function esconderElementosFirebase() {
    // Esconder elementos de nuvem se Firebase nao estiver disponivel
    const btnSaveCloud = document.querySelector('.btn-save-cloud');
    const userMenu = document.querySelector('.user-menu');
    
    if (btnSaveCloud) btnSaveCloud.style.display = 'none';
    if (userMenu) userMenu.style.display = 'none';
}

function atualizarUIUsuario() {
    const usuario = FirebaseManager.getUsuario();
    if (!usuario) return;
    
    const avatarEl = document.getElementById('userAvatar');
    const nameEl = document.getElementById('userName');
    const emailEl = document.getElementById('userEmail');
    
    if (avatarEl) {
        avatarEl.textContent = (usuario.username || 'U').charAt(0).toUpperCase();
    }
    if (nameEl) {
        nameEl.textContent = usuario.username || 'Usuario';
    }
    if (emailEl) {
        emailEl.textContent = '@' + (usuario.username || '');
    }
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
    // Fechar menu de configuracoes
    closeSettingsMenu();
}

function toggleSettingsMenu() {
    const dropdown = document.getElementById('settingsDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
    // Fechar menu de usuario
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown) {
        userDropdown.classList.remove('active');
    }
}

function closeSettingsMenu() {
    const dropdown = document.getElementById('settingsDropdown');
    if (dropdown) {
        dropdown.classList.remove('active');
    }
}

// Fechar dropdowns ao clicar fora
document.addEventListener('click', function(e) {
    const userMenu = document.querySelector('.user-menu');
    const userDropdown = document.getElementById('userDropdown');
    const settingsMenu = document.querySelector('.settings-menu');
    const settingsDropdown = document.getElementById('settingsDropdown');
    
    if (userMenu && userDropdown && !userMenu.contains(e.target)) {
        userDropdown.classList.remove('active');
    }
    
    if (settingsMenu && settingsDropdown && !settingsMenu.contains(e.target)) {
        settingsDropdown.classList.remove('active');
    }
});

async function salvarNaNuvem() {
    if (typeof FirebaseManager === 'undefined' || !usuarioLogado) {
        mostrarToast('Firebase nao configurado!', true);
        return;
    }
    
    // Verificar se tem chave de criptografia
    if (!FirebaseManager.temChave()) {
        mostrarToast('Chave de criptografia nao definida. Faca login novamente.', true);
        return;
    }
    
    atualizarStatusSalvo(false, 'Criptografando...');
    
    try {
        // Gerar XML com todos os dados
        const xmlString = gerarXMLCompleto();
        
        const sucesso = await FirebaseManager.salvarDados(xmlString);
        
        if (sucesso) {
            dadosAlterados = false;
            atualizarStatusSalvo(true, 'Salvo (criptografado)');
            mostrarToast('Dados criptografados e salvos!');
        } else {
            atualizarStatusSalvo(false, 'Erro ao salvar');
            mostrarToast('Erro ao salvar na nuvem!', true);
        }
    } catch (err) {
        console.error('Erro ao salvar:', err);
        atualizarStatusSalvo(false, 'Erro ao salvar');
        mostrarToast('Erro ao salvar na nuvem!', true);
    }
}

async function carregarDaNuvem(silencioso = false) {
    if (typeof FirebaseManager === 'undefined' || !usuarioLogado) {
        if (!silencioso) mostrarToast('Firebase nao configurado!', true);
        return;
    }
    
    // Verificar se tem chave de criptografia
    if (!FirebaseManager.temChave()) {
        if (!silencioso) mostrarToast('Chave de criptografia nao definida. Faca login novamente.', true);
        return;
    }
    
    if (!silencioso) atualizarStatusSalvo(false, 'Descriptografando...');
    
    try {
        const xmlString = await FirebaseManager.carregarDados();
        
        if (xmlString && xmlString.trim()) {
            importarXMLString(xmlString);
            dadosAlterados = false;
            atualizarStatusSalvo(true, 'Dados descriptografados');
            if (!silencioso) mostrarToast('Dados carregados e descriptografados!');
        } else {
            if (!silencioso) {
                atualizarStatusSalvo(true, 'Sem dados na nuvem');
                mostrarToast('Nenhum dado encontrado na nuvem');
            }
        }
    } catch (err) {
        console.error('Erro ao carregar:', err);
        if (!silencioso) {
            atualizarStatusSalvo(false, 'Erro ao descriptografar');
            mostrarToast('Erro ao descriptografar dados! Verifique sua senha.', true);
        }
    }
    
    // Fechar dropdown
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.classList.remove('active');
}

async function fazerLogout() {
    if (typeof FirebaseManager === 'undefined') return;
    
    if (dadosAlterados) {
        if (!confirm('Voce tem alteracoes nao salvas. Deseja sair mesmo assim?')) {
            return;
        }
    }
    
    await FirebaseManager.logout();
}

function gerarXMLCompleto() {
    // Salvar mes atual antes de gerar XML
    const chaveAtual = getChaveMes();
    dadosMeses[chaveAtual] = dadosMesAtual;
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<financas>\n';
    
    // Dados Globais
    xml += '  <dadosGlobais>\n';
    xml += '    <bancos>\n';
    dadosGlobais.bancos.forEach(banco => {
        xml += `      <banco>${escapeXml(banco)}</banco>\n`;
    });
    xml += '    </bancos>\n';
    xml += `    <poupancaTotal>${dadosGlobais.poupancaTotal}</poupancaTotal>\n`;
    
    // Poupanca por mes
    xml += '    <poupancaPorMes>\n';
    for (const chave in (dadosGlobais.poupancaPorMes || {})) {
        xml += `      <mes chave="${chave}">${dadosGlobais.poupancaPorMes[chave]}</mes>\n`;
    }
    xml += '    </poupancaPorMes>\n';
    
    // Categorias
    xml += '    <categorias>\n';
    dadosGlobais.categorias.forEach(c => {
        xml += `      <categoria id="${c.id}">\n`;
        xml += `        <nome>${escapeXml(c.nome)}</nome>\n`;
        xml += `        <emoji>${escapeXml(c.emoji)}</emoji>\n`;
        xml += `        <cor>${escapeXml(c.cor)}</cor>\n`;
        xml += '      </categoria>\n';
    });
    xml += '    </categorias>\n';
    
    // Gastos Fixos (globais - aparecem em todos os meses)
    xml += '    <gastosFixos>\n';
    dadosGlobais.gastosFixos.forEach(g => {
        xml += `      <gasto id="${g.id}">\n`;
        xml += `        <nome>${escapeXml(g.nome)}</nome>\n`;
        xml += `        <valor>${g.valor}</valor>\n`;
        xml += `        <categoriaId>${g.categoriaId || ''}</categoriaId>\n`;
        xml += '      </gasto>\n';
    });
    xml += '    </gastosFixos>\n';
    xml += '  </dadosGlobais>\n';
    
    // Dados por mes
    xml += '  <meses>\n';
    for (const chave in dadosMeses) {
        const mesDados = dadosMeses[chave];
        xml += `    <mes chave="${chave}">\n`;
        
        // Salario do mes
        xml += `      <salario>${mesDados.salario || 0}</salario>\n`;
        
        // Gastos Mensais (apenas deste mes)
        xml += '      <gastosMensais>\n';
        (mesDados.gastosMensais || []).forEach(g => {
            xml += `        <gasto id="${g.id}">\n`;
            xml += `          <nome>${escapeXml(g.nome)}</nome>\n`;
            xml += `          <valor>${g.valor}</valor>\n`;
            xml += `          <categoriaId>${g.categoriaId || ''}</categoriaId>\n`;
            xml += '        </gasto>\n';
        });
        xml += '      </gastosMensais>\n';
        
        // Cartoes por banco
        xml += '      <cartoes>\n';
        for (const banco in mesDados.cartoes) {
            xml += `        <banco nome="${escapeXml(banco)}">\n`;
            (mesDados.cartoes[banco] || []).forEach(item => {
                xml += `          <item id="${item.id}">\n`;
                xml += `            <descricao>${escapeXml(item.descricao)}</descricao>\n`;
                xml += `            <valor>${item.valor}</valor>\n`;
                xml += '          </item>\n';
            });
            xml += '        </banco>\n';
        }
        xml += '      </cartoes>\n';
        
        // Parcelas
        xml += '      <parcelas>\n';
        (mesDados.parcelas || []).forEach(p => {
            xml += `        <parcela id="${p.id}">\n`;
            xml += `          <descricao>${escapeXml(p.descricao)}</descricao>\n`;
            xml += `          <valorTotal>${p.valorTotal}</valorTotal>\n`;
            xml += `          <numParcelas>${p.numParcelas}</numParcelas>\n`;
            xml += `          <mesInicio>${p.mesInicio}</mesInicio>\n`;
            xml += `          <anoInicio>${p.anoInicio}</anoInicio>\n`;
            xml += `          <banco>${escapeXml(p.banco)}</banco>\n`;
            xml += '        </parcela>\n';
        });
        xml += '      </parcelas>\n';
        
        xml += '    </mes>\n';
    }
    xml += '  </meses>\n';
    xml += '</financas>';
    
    return xml;
}

function importarXMLString(conteudo) {
    try {
        // Parsear XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(conteudo, 'text/xml');
        
        // Verificar erros de parse
        if (xmlDoc.querySelector('parsererror')) {
            console.error('Erro ao parsear XML');
            return false;
        }
        
        // Novo formato (dadosGlobais)
        const dadosGlobaisEl = xmlDoc.querySelector('dadosGlobais');
        if (dadosGlobaisEl) {
            // Bancos
            const bancosEl = dadosGlobaisEl.querySelectorAll('bancos > banco');
            if (bancosEl.length > 0) {
                dadosGlobais.bancos = Array.from(bancosEl).map(b => b.textContent);
            }
            
            // Poupanca
            const poupancaEl = dadosGlobaisEl.querySelector('poupancaTotal');
            if (poupancaEl) {
                dadosGlobais.poupancaTotal = parseFloat(poupancaEl.textContent) || 0;
            }
            
            // Poupanca por mes
            dadosGlobais.poupancaPorMes = {};
            const poupancaMesesEls = dadosGlobaisEl.querySelectorAll('poupancaPorMes > mes');
            poupancaMesesEls.forEach(pEl => {
                const chave = pEl.getAttribute('chave');
                if (chave) {
                    dadosGlobais.poupancaPorMes[chave] = parseFloat(pEl.textContent) || 0;
                }
            });
            
            // Categorias
            const categoriasEls = dadosGlobaisEl.querySelectorAll('categorias > categoria');
            if (categoriasEls.length > 0) {
                dadosGlobais.categorias = [];
                categoriasEls.forEach(c => {
                    const id = parseInt(c.getAttribute('id')) || Date.now() + Math.random();
                    const nome = c.querySelector('nome')?.textContent || '';
                    const emoji = c.querySelector('emoji')?.textContent || '';
                    const cor = c.querySelector('cor')?.textContent || '#64748b';
                    if (nome) {
                        dadosGlobais.categorias.push({ id, nome, emoji, cor });
                    }
                });
            }
            
            // Gastos Fixos (globais)
            dadosGlobais.gastosFixos = [];
            const gastosEls = dadosGlobaisEl.querySelectorAll('gastosFixos > gasto');
            gastosEls.forEach(g => {
                const id = parseInt(g.getAttribute('id')) || Date.now() + Math.random();
                const nome = g.querySelector('nome')?.textContent || '';
                const valor = parseFloat(g.querySelector('valor')?.textContent) || 0;
                const categoriaId = parseInt(g.querySelector('categoriaId')?.textContent) || null;
                if (nome && valor > 0) {
                    dadosGlobais.gastosFixos.push({ id, nome, valor, categoriaId });
                }
            });
        } else {
            // Formato antigo (compatibilidade)
            const configEl = xmlDoc.querySelector('config');
            if (configEl) {
                const bancosEl = configEl.querySelectorAll('bancos > banco');
                if (bancosEl.length > 0) {
                    dadosGlobais.bancos = Array.from(bancosEl).map(b => b.textContent);
                }
                
                const poupancaEl = configEl.querySelector('poupancaTotal');
                if (poupancaEl) {
                    dadosGlobais.poupancaTotal = parseFloat(poupancaEl.textContent) || 0;
                }
            }
        }
        
        // Carregar todos os meses
        dadosMeses = {};
        const mesesEls = xmlDoc.querySelectorAll('mes');
        mesesEls.forEach(mesEl => {
            const chave = mesEl.getAttribute('chave');
            if (!chave) return;
            
            const mesDados = {
                cartoes: {},
                parcelas: [],
                salario: 0,
                gastosMensais: []
            };
            
            // Salario do mes
            const salarioMesEl = mesEl.querySelector('salario');
            if (salarioMesEl) {
                mesDados.salario = parseFloat(salarioMesEl.textContent) || 0;
            }
            
            // Gastos Mensais
            const gastosMensaisEls = mesEl.querySelectorAll('gastosMensais > gasto');
            gastosMensaisEls.forEach(g => {
                const id = parseInt(g.getAttribute('id')) || Date.now() + Math.random();
                const nome = g.querySelector('nome')?.textContent || '';
                const valor = parseFloat(g.querySelector('valor')?.textContent) || 0;
                const categoriaId = parseInt(g.querySelector('categoriaId')?.textContent) || null;
                if (nome && valor > 0) {
                    mesDados.gastosMensais.push({ id, nome, valor, categoriaId });
                }
            });
            
            // Cartoes
            const bancosEls = mesEl.querySelectorAll('cartoes > banco');
            bancosEls.forEach(bancoEl => {
                const nomeBanco = bancoEl.getAttribute('nome');
                if (nomeBanco) {
                    mesDados.cartoes[nomeBanco] = [];
                    const itensEls = bancoEl.querySelectorAll('item');
                    itensEls.forEach(itemEl => {
                        const id = parseInt(itemEl.getAttribute('id')) || Date.now() + Math.random();
                        const descricao = itemEl.querySelector('descricao')?.textContent || '';
                        const valor = parseFloat(itemEl.querySelector('valor')?.textContent) || 0;
                        if (descricao && valor > 0) {
                            mesDados.cartoes[nomeBanco].push({ id, descricao, valor });
                        }
                    });
                }
            });
            
            // Parcelas
            const parcelasEls = mesEl.querySelectorAll('parcelas > parcela');
            parcelasEls.forEach(pEl => {
                const id = parseInt(pEl.getAttribute('id')) || Date.now() + Math.random();
                const descricao = pEl.querySelector('descricao')?.textContent || '';
                const valorTotal = parseFloat(pEl.querySelector('valorTotal')?.textContent) || 0;
                const numParcelas = parseInt(pEl.querySelector('numParcelas')?.textContent) || 1;
                const mesInicio = parseInt(pEl.querySelector('mesInicio')?.textContent) || 0;
                const anoInicio = parseInt(pEl.querySelector('anoInicio')?.textContent) || anoAtual;
                const banco = pEl.querySelector('banco')?.textContent || '';
                
                if (descricao && valorTotal > 0) {
                    mesDados.parcelas.push({
                        id, descricao, valorTotal, numParcelas, mesInicio, anoInicio, banco
                    });
                }
            });
            
            // Compatibilidade: gastosFixos no mes -> global
            if (!dadosGlobaisEl) {
                const gastosEls = mesEl.querySelectorAll('gastosFixos > gasto');
                gastosEls.forEach(g => {
                    const id = parseInt(g.getAttribute('id')) || Date.now() + Math.random();
                    const nome = g.querySelector('nome')?.textContent || '';
                    const valor = parseFloat(g.querySelector('valor')?.textContent) || 0;
                    if (nome && valor > 0 && !dadosGlobais.gastosFixos.some(gf => gf.nome === nome)) {
                        dadosGlobais.gastosFixos.push({ id, nome, valor });
                    }
                });
            }
            
            dadosMeses[chave] = mesDados;
        });
        
        // Inicializar mes atual
        inicializarMesAtual();
        
        // Atualizar interface
        renderizarTabsBancos();
        if (dadosGlobais.bancos.length > 0) {
            selecionarBanco(dadosGlobais.bancos[0]);
        }
        atualizarInterface();
        
        return true;
    } catch (err) {
        console.error('Erro ao importar XML:', err);
        return false;
    }
}

// ========================================
// Exportar/Importar XML
// ========================================

function exportarXML() {
    const chave = `${anoAtual}_${mesAtual}`;
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<financas>\n';
    
    // Config
    xml += '  <config>\n';
    xml += '    <bancos>\n';
    config.bancos.forEach(banco => {
        xml += `      <banco>${escapeXml(banco)}</banco>\n`;
    });
    xml += '    </bancos>\n';
    xml += `    <poupancaTotal>${config.poupancaTotal}</poupancaTotal>\n`;
    xml += '  </config>\n';
    
    // Dados do mes
    xml += '  <meses>\n';
    xml += `    <mes chave="${chave}">\n`;
    xml += `      <salario>${dados.salario}</salario>\n`;
    
    // Gastos Fixos
    xml += '      <gastosFixos>\n';
    dados.gastosFixos.forEach(g => {
        xml += `        <gasto id="${g.id}">\n`;
        xml += `          <nome>${escapeXml(g.nome)}</nome>\n`;
        xml += `          <valor>${g.valor}</valor>\n`;
        xml += '        </gasto>\n';
    });
    xml += '      </gastosFixos>\n';
    
    // Cartoes por banco
    xml += '      <cartoes>\n';
    Object.keys(dados.cartoes).forEach(banco => {
        xml += `        <banco nome="${escapeXml(banco)}">\n`;
        (dados.cartoes[banco] || []).forEach(item => {
            xml += `          <item id="${item.id}">\n`;
            xml += `            <descricao>${escapeXml(item.descricao)}</descricao>\n`;
            xml += `            <valor>${item.valor}</valor>\n`;
            xml += '          </item>\n';
        });
        xml += '        </banco>\n';
    });
    xml += '      </cartoes>\n';
    
    xml += '    </mes>\n';
    xml += '  </meses>\n';
    xml += '</financas>';
    
    // Criar e baixar arquivo
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financas_${anoAtual}_${mesAtual + 1}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    dadosAlterados = false;
    atualizarStatusSalvo(true, 'Exportado');
    mostrarToast('Arquivo XML exportado!');
}

function importarXML(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const conteudo = e.target.result;
            
            // Verificar se e XML
            if (!conteudo.includes('<?xml') && !conteudo.includes('<financas>')) {
                // Tentar como JSON (compatibilidade)
                try {
                    const jsonData = JSON.parse(conteudo);
                    importarJSON(jsonData);
                    return;
                } catch (jsonErr) {
                    mostrarToast('Formato de arquivo invalido!', true);
                    return;
                }
            }
            
            // Parsear XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(conteudo, 'text/xml');
            
            // Verificar erros de parse
            if (xmlDoc.querySelector('parsererror')) {
                mostrarToast('Erro ao ler arquivo XML!', true);
                return;
            }
            
            // Config
            const configEl = xmlDoc.querySelector('config');
            if (configEl) {
                const bancosEl = configEl.querySelectorAll('bancos > banco');
                if (bancosEl.length > 0) {
                    config.bancos = Array.from(bancosEl).map(b => b.textContent);
                }
                
                const poupancaEl = configEl.querySelector('poupancaTotal');
                if (poupancaEl) {
                    config.poupancaTotal = parseFloat(poupancaEl.textContent) || 0;
                }
            }
            
            // Dados do mes (pegar o primeiro ou o que corresponde ao mes atual)
            const chaveAtual = `${anoAtual}_${mesAtual}`;
            let mesEl = xmlDoc.querySelector(`mes[chave="${chaveAtual}"]`);
            
            if (!mesEl) {
                mesEl = xmlDoc.querySelector('mes');
            }
            
            if (mesEl) {
                // Salario
                const salarioEl = mesEl.querySelector('salario');
                dados.salario = salarioEl ? parseFloat(salarioEl.textContent) || 0 : 0;
                
                // Gastos Fixos
                dados.gastosFixos = [];
                const gastosEls = mesEl.querySelectorAll('gastosFixos > gasto');
                gastosEls.forEach(g => {
                    const id = parseInt(g.getAttribute('id')) || Date.now() + Math.random();
                    const nome = g.querySelector('nome')?.textContent || '';
                    const valor = parseFloat(g.querySelector('valor')?.textContent) || 0;
                    if (nome && valor > 0) {
                        dados.gastosFixos.push({ id, nome, valor });
                    }
                });
                
                // Cartoes
                dados.cartoes = {};
                const bancosEls = mesEl.querySelectorAll('cartoes > banco');
                bancosEls.forEach(bancoEl => {
                    const nomeBanco = bancoEl.getAttribute('nome');
                    if (nomeBanco) {
                        dados.cartoes[nomeBanco] = [];
                        const itensEls = bancoEl.querySelectorAll('item');
                        itensEls.forEach(itemEl => {
                            const id = parseInt(itemEl.getAttribute('id')) || Date.now() + Math.random();
                            const descricao = itemEl.querySelector('descricao')?.textContent || '';
                            const valor = parseFloat(itemEl.querySelector('valor')?.textContent) || 0;
                            if (descricao && valor > 0) {
                                dados.cartoes[nomeBanco].push({ id, descricao, valor });
                            }
                        });
                    }
                });
            }
            
            // Atualizar interface
            renderizarTabsBancos();
            if (config.bancos.length > 0) {
                selecionarBanco(config.bancos[0]);
            }
            atualizarInterface();
            dadosAlterados = false;
            atualizarStatusSalvo(true, 'Importado');
            mostrarToast('Dados importados com sucesso!');
            
        } catch (err) {
            console.error('Erro ao importar:', err);
            mostrarToast('Erro ao importar arquivo!', true);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function importarJSON(jsonData) {
    // Compatibilidade com formato JSON antigo
    if (jsonData.config) {
        config = jsonData.config;
        if (!config.bancos) config.bancos = ['Nubank', 'Itau', 'Inter', 'Outros'];
        if (typeof config.poupancaTotal !== 'number') config.poupancaTotal = 0;
    }
    
    if (jsonData.dados) {
        dados = jsonData.dados;
    } else if (jsonData.salario !== undefined) {
        dados = {
            salario: jsonData.salario || 0,
            gastosFixos: jsonData.gastosFixos || [],
            cartoes: jsonData.cartoes || {}
        };
    }
    
    if (!dados.cartoes) dados.cartoes = {};
    if (!dados.gastosFixos) dados.gastosFixos = [];
    
    renderizarTabsBancos();
    if (config.bancos.length > 0) {
        selecionarBanco(config.bancos[0]);
    }
    atualizarInterface();
    dadosAlterados = false;
    atualizarStatusSalvo(true, 'Importado');
    mostrarToast('Dados importados com sucesso!');
}

function escapeXml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// ========================================
// Status
// ========================================

function marcarAlterado() {
    dadosAlterados = true;
    atualizarStatusSalvo(false, 'Nao salvo');
    
    // Agendar salvamento automatico apos 2 segundos de inatividade
    agendarSalvamentoAutomatico();
}

function agendarSalvamentoAutomatico() {
    if (salvamentoTimeout) {
        clearTimeout(salvamentoTimeout);
    }
    
    salvamentoTimeout = setTimeout(async () => {
        if (dadosAlterados && typeof FirebaseManager !== 'undefined' && usuarioLogado) {
            await salvarNaNuvem();
        }
    }, 2000);
}

function configurarSalvamentoAutomatico() {
    // Adicionar listeners para salvar ao perder foco dos inputs
    document.addEventListener('focusout', (e) => {
        if (e.target.matches('input, select, textarea')) {
            if (dadosAlterados) {
                agendarSalvamentoAutomatico();
            }
        }
    });
    
    // Salvar antes de fechar a pagina
    window.addEventListener('beforeunload', (e) => {
        if (dadosAlterados && typeof FirebaseManager !== 'undefined' && usuarioLogado) {
            // Tentar salvar sincronamente
            const xmlString = gerarXMLCompleto();
            FirebaseManager.salvarDados(xmlString);
        }
    });
}

function atualizarStatusSalvo(salvo, texto = null) {
    const dot = document.querySelector('.status-dot');
    const text = document.querySelector('.status-text');
    
    if (salvo) {
        dot.classList.remove('saving');
        text.textContent = texto || 'Salvo';
    } else {
        dot.classList.add('saving');
        text.textContent = texto || 'Nao salvo';
    }
}

// ========================================
// Navegacao
// ========================================

function configurarEventos() {
    // Navegacao
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const section = this.dataset.section;
            
            // Atualizar nav
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            this.classList.add('active');
            
            // Atualizar titulo
            const titles = {
                dashboard: 'Dashboard',
                gastos: 'Gastos Fixos',
                gastosMensais: 'Gastos Mensais',
                cartoes: 'Cartoes de Credito',
                relatorios: 'Relatorios'
            };
            document.getElementById('pageTitle').textContent = titles[section];
            
            // Mostrar secao
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById(`section-${section}`).classList.add('active');
            
            // Atualizar grafico se necessario
            if (section === 'relatorios') {
                setTimeout(() => atualizarGrafico(), 100);
            }
        });
    });

    // Selects de mes/ano
    document.getElementById('mesSelect').addEventListener('change', function() {
        const novoMes = parseInt(this.value);
        trocarMes(novoMes, anoAtual);
    });

    document.getElementById('anoSelect').addEventListener('change', function() {
        const novoAno = parseInt(this.value);
        trocarMes(mesAtual, novoAno);
    });

    // Tema
    document.getElementById('btnTema').addEventListener('click', alternarTema);

    // Enter para adicionar
    document.getElementById('novoGastoValor').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') adicionarGastoFixo();
    });

    const novoGastoMensalValor = document.getElementById('novoGastoMensalValor');
    if (novoGastoMensalValor) {
        novoGastoMensalValor.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') adicionarGastoMensal();
        });
    }

    document.getElementById('novoValorCartao').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') adicionarItemCartao();
    });

    document.getElementById('novoBancoNome').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') adicionarBanco();
    });
    
    const novaCategoriaNome = document.getElementById('novaCategoriaNome');
    if (novaCategoriaNome) {
        novaCategoriaNome.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') adicionarCategoria();
        });
    }

    // Importar arquivo XML
    document.getElementById('importarArquivo').addEventListener('change', importarXML);

    // Fechar modais ao clicar fora
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
}

// ========================================
// Anos
// ========================================

function preencherAnos() {
    const select = document.getElementById('anoSelect');
    const anoAtualReal = new Date().getFullYear();
    
    for (let ano = anoAtualReal - 2; ano <= anoAtualReal + 2; ano++) {
        const option = document.createElement('option');
        option.value = ano;
        option.textContent = ano;
        select.appendChild(option);
    }
}

// ========================================
// Tema
// ========================================

function carregarTema() {
    const tema = localStorage.getItem('financas_tema') || 'claro';
    document.documentElement.setAttribute('data-tema', tema);
}

function alternarTema() {
    const temaAtual = document.documentElement.getAttribute('data-tema');
    const novoTema = temaAtual === 'escuro' ? 'claro' : 'escuro';
    document.documentElement.setAttribute('data-tema', novoTema);
    localStorage.setItem('financas_tema', novoTema);
}

// ========================================
// Dados
// ========================================

function getChaveMes(mes = mesAtual, ano = anoAtual) {
    return `${ano}_${mes}`;
}

function inicializarMesAtual() {
    const chave = getChaveMes();
    
    if (!dadosMeses[chave]) {
        dadosMeses[chave] = {
            cartoes: {},
            parcelas: [],
            salario: 0,
            gastosMensais: []
        };
    }
    
    // Garantir que o salario existe (compatibilidade com dados antigos)
    if (dadosMeses[chave].salario === undefined) {
        dadosMeses[chave].salario = 0;
    }
    
    // Garantir que gastosMensais existe (compatibilidade com dados antigos)
    if (!dadosMeses[chave].gastosMensais) {
        dadosMeses[chave].gastosMensais = [];
    }
    
    // Atribuir referencia - dadosMesAtual aponta para dadosMeses[chave]
    dadosMesAtual = dadosMeses[chave];
    
    // Calcular parcelas ativas para este mes
    atualizarParcelasDoMes();
}

function atualizarParcelasDoMes() {
    // Percorrer todas as parcelas de todos os meses e verificar quais estao ativas neste mes
    // Uma parcela esta ativa se: mesAtual >= mesInicio && parcelaAtual <= numParcelas
}

function trocarMes(novoMes, novoAno) {
    // Salvar dados do mes atual antes de trocar
    const chaveAtual = getChaveMes();
    dadosMeses[chaveAtual] = dadosMesAtual;
    
    // Atualizar mes/ano
    mesAtual = novoMes;
    anoAtual = novoAno;
    
    // Atualizar selects na interface
    document.getElementById('mesSelect').value = mesAtual;
    document.getElementById('anoSelect').value = anoAtual;
    
    // Carregar ou criar dados do novo mes
    inicializarMesAtual();
    
    // Atualizar interface completamente
    renderizarTabsBancos();
    if (dadosGlobais.bancos.length > 0) {
        selecionarBanco(bancoAtual || dadosGlobais.bancos[0]);
    }
    
    // Forcar atualizacao de todos os elementos
    atualizarResumo();
    renderizarGastosFixos();
    renderizarGastosMensais();
    renderizarCartao();
    atualizarQuickLists();
    atualizarGrafico();
}

// ========================================
// Interface
// ========================================

function atualizarInterface() {
    atualizarResumo();
    renderizarGastosFixos();
    renderizarGastosMensais();
    renderizarCartao();
    atualizarQuickLists();
    atualizarGrafico();
}

function atualizarResumo() {
    const totalGastosFixos = calcularTotalGastosFixos();
    const totalGastosMensais = calcularTotalGastosMensais();
    const totalCartoes = calcularTotalCartoes();
    const totalParcelas = calcularTotalParcelas();
    const totalGastos = totalGastosFixos + totalGastosMensais + totalCartoes + totalParcelas;
    const salarioMes = dadosMesAtual.salario || 0;
    const sobra = salarioMes - totalGastos;
    
    document.getElementById('salarioDisplay').textContent = formatarMoeda(salarioMes);
    document.getElementById('totalGastos').textContent = formatarMoeda(totalGastos);
    document.getElementById('poupancaDisplay').textContent = formatarMoeda(dadosGlobais.poupancaTotal);
    
    const sobraEl = document.getElementById('sobra');
    sobraEl.textContent = formatarMoeda(sobra);
    sobraEl.className = 'kpi-value ' + (sobra >= 0 ? 'kpi-green' : 'kpi-red');
    
document.getElementById('totalGastosFixos').textContent = `Total: ${formatarMoeda(totalGastosFixos)}`;
    const totalGastosMensaisEl = document.getElementById('totalGastosMensais');
    if (totalGastosMensaisEl) {
        totalGastosMensaisEl.textContent = `Total: ${formatarMoeda(totalGastosMensais)}`;
    }
    document.getElementById('totalCartoes').textContent = `Total: ${formatarMoeda(totalCartoes + totalParcelas)}`;
}

function atualizarQuickLists() {
    // Quick Gastos Fixos
    const quickGastos = document.getElementById('quickGastosFixos');
    const countGastos = document.getElementById('countGastosFixos');
    
    // Combinar gastos fixos e mensais para exibir no resumo
    const todosGastos = [
        ...dadosGlobais.gastosFixos.map(g => ({ ...g, tipo: 'fixo' })),
        ...(dadosMesAtual.gastosMensais || []).map(g => ({ ...g, tipo: 'mensal' }))
    ];
    
    if (todosGastos.length === 0) {
        quickGastos.innerHTML = '<p class="empty">Nenhum gasto cadastrado</p>';
        countGastos.textContent = '0 itens';
    } else {
        const top5 = todosGastos.slice(0, 5);
        quickGastos.innerHTML = top5.map(g => {
            const categoria = getCategoria(g.categoriaId);
            const categoriaIcon = categoria ? categoria.emoji + ' ' : '';
            const tipoLabel = g.tipo === 'mensal' ? ' <span class="tipo-mensal-badge">Mensal</span>' : '';
            return `
                <div class="quick-item">
                    <span class="quick-item-name">${categoriaIcon}${escapeHtml(g.nome)}${tipoLabel}</span>
                    <span class="quick-item-value">${formatarMoeda(g.valor)}</span>
                </div>
            `;
        }).join('');
        countGastos.textContent = `${todosGastos.length} itens`;
    }
    
    // Quick Bancos
    const quickBancos = document.getElementById('quickBancos');
    const countBancos = document.getElementById('countBancos');
    
    if (dadosGlobais.bancos.length === 0) {
        quickBancos.innerHTML = '<p class="empty">Nenhum banco cadastrado</p>';
        countBancos.textContent = '0 bancos';
    } else {
        quickBancos.innerHTML = dadosGlobais.bancos.map(banco => {
            const total = calcularTotalBanco(banco);
            return `
                <div class="quick-item">
                    <span class="quick-item-name">${escapeHtml(banco)}</span>
                    <span class="quick-item-value">${formatarMoeda(total)}</span>
                </div>
            `;
        }).join('');
        countBancos.textContent = `${dadosGlobais.bancos.length} bancos`;
    }
}

// ========================================
// Calculos
// ========================================

function calcularTotalGastosFixos() {
    return dadosGlobais.gastosFixos.reduce((sum, g) => sum + g.valor, 0);
}

function calcularTotalGastosMensais() {
    return (dadosMesAtual.gastosMensais || []).reduce((sum, g) => sum + g.valor, 0);
}

function calcularTotalCartoes() {
    let total = 0;
    for (const banco of dadosGlobais.bancos) {
        total += calcularTotalBanco(banco);
    }
    return total;
}

function calcularTotalBanco(banco) {
    const itens = dadosMesAtual.cartoes[banco] || [];
    const parcelasBanco = getParcelasAtivasDoBanco(banco);
    const totalItens = itens.reduce((sum, i) => sum + i.valor, 0);
    const totalParcelas = parcelasBanco.reduce((sum, p) => sum + (p.valorTotal / p.numParcelas), 0);
    return totalItens + totalParcelas;
}

function calcularTotalParcelas() {
    const parcelasAtivas = getParcelasAtivas();
    return parcelasAtivas.reduce((sum, p) => sum + (p.valorTotal / p.numParcelas), 0);
}

function getParcelasAtivas() {
    // Retorna parcelas que ainda estao ativas no mes atual
    const parcelas = [];
    const parcelasJaAdicionadas = new Set(); // Evitar duplicatas
    
    // Percorrer todos os meses para encontrar parcelas
    for (const chave in dadosMeses) {
        const mesDados = dadosMeses[chave];
        if (mesDados.parcelas) {
            mesDados.parcelas.forEach(p => {
                // Evitar adicionar a mesma parcela duas vezes
                if (parcelasJaAdicionadas.has(p.id)) return;
                
                const parcelaNoMes = calcularParcelaNoMes(p, mesAtual, anoAtual);
                // Parcela ativa: numero da parcela > 0 e <= total de parcelas
                if (parcelaNoMes > 0 && parcelaNoMes <= p.numParcelas) {
                    parcelas.push({ 
                        ...p, 
                        parcelaAtual: parcelaNoMes,
                        valorParcela: p.valorTotal / p.numParcelas,
                        parcelasRestantes: p.numParcelas - parcelaNoMes
                    });
                    parcelasJaAdicionadas.add(p.id);
                }
            });
        }
    }
    
    return parcelas;
}

function getParcelasAtivasDoBanco(banco) {
    return getParcelasAtivas().filter(p => p.banco === banco);
}

function calcularParcelaNoMes(parcela, mes, ano) {
    // Calcula qual parcela esta sendo paga no mes/ano especificado
    const mesInicio = parcela.mesInicio;
    const anoInicio = parcela.anoInicio;
    
    const mesesPassados = (ano - anoInicio) * 12 + (mes - mesInicio);
    return mesesPassados + 1; // Parcela 1 no mes de inicio
}

function calcularSobra() {
    const chaveMes = getChaveMes();
    const poupancaDoMes = dadosGlobais.poupancaPorMes?.[chaveMes] || 0;
    const salarioMes = dadosMesAtual.salario || 0;
    return salarioMes - (calcularTotalGastosFixos() + calcularTotalGastosMensais() + calcularTotalCartoes() + calcularTotalParcelas() + poupancaDoMes);
}

function getPoupancaDoMes() {
    const chaveMes = getChaveMes();
    return dadosGlobais.poupancaPorMes?.[chaveMes] || 0;
}

// ========================================
// Modais
// ========================================

function abrirModal(id) {
    document.getElementById(id).classList.add('active');
}

function fecharModal(id) {
    document.getElementById(id).classList.remove('active');
}

// Salario (por mes)
function abrirModalSalario() {
    document.getElementById('inputSalarioModal').value = dadosMesAtual.salario || '';
    salarioAnterior = dadosMesAtual.salario || 0;
    abrirModal('modalSalario');
    document.getElementById('inputSalarioModal').focus();
}

function salvarSalario() {
    const valor = parseFloat(document.getElementById('inputSalarioModal').value) || 0;
    dadosMesAtual.salario = valor;
    atualizarResumo();
    atualizarQuickLists();
    marcarAlterado();
    fecharModal('modalSalario');
    mostrarToast('Salario atualizado!');
}

// Funcao para salvamento automatico do salario no blur
let salarioAnterior = null;

function salvarSalarioAuto() {
    const valor = parseFloat(document.getElementById('inputSalarioModal').value) || 0;
    
    // So salvar se o valor mudou
    if (salarioAnterior !== null && salarioAnterior === valor) {
        return;
    }
    
    if (valor !== dadosMesAtual.salario) {
        dadosMesAtual.salario = valor;
        atualizarResumo();
        atualizarQuickLists();
        marcarAlterado();
        mostrarToast('Salario salvo automaticamente!');
    }
    
    salarioAnterior = valor;
}

// Poupanca
function abrirModalPoupanca() {
    const sobra = calcularSobra();
    const chaveMes = getChaveMes();
    const poupancaMes = dadosGlobais.poupancaPorMes?.[chaveMes] || 0;
    
    document.getElementById('poupancaTotalModal').textContent = formatarMoeda(dadosGlobais.poupancaTotal);
    document.getElementById('poupancaMesModal').textContent = formatarMoeda(poupancaMes);
    document.getElementById('sobraMesModal').textContent = formatarMoeda(sobra);
    document.getElementById('inputPoupancaModal').value = '';
    abrirModal('modalPoupanca');
}

function adicionarPoupanca() {
    const valor = parseFloat(document.getElementById('inputPoupancaModal').value);
    if (isNaN(valor) || valor <= 0) {
        mostrarToast('Digite um valor valido!', true);
        return;
    }
    
    // Verificar se tem sobra suficiente para adicionar a poupanca
    const sobra = calcularSobra();
    if (valor > sobra) {
        mostrarToast('Valor maior que a sobra disponivel!', true);
        return;
    }
    
    // Registrar poupanca do mes atual
    const chaveMes = getChaveMes();
    if (!dadosGlobais.poupancaPorMes) {
        dadosGlobais.poupancaPorMes = {};
    }
    dadosGlobais.poupancaPorMes[chaveMes] = (dadosGlobais.poupancaPorMes[chaveMes] || 0) + valor;
    
    // Adicionar ao total
    dadosGlobais.poupancaTotal += valor;
    
    document.getElementById('poupancaTotalModal').textContent = formatarMoeda(dadosGlobais.poupancaTotal);
    document.getElementById('poupancaMesModal').textContent = formatarMoeda(dadosGlobais.poupancaPorMes[chaveMes]);
    document.getElementById('sobraMesModal').textContent = formatarMoeda(calcularSobra());
    document.getElementById('inputPoupancaModal').value = '';
    atualizarInterface();
    marcarAlterado();
    mostrarToast('Valor adicionado a poupanca!');
}

function removerPoupanca() {
    const valor = parseFloat(document.getElementById('inputPoupancaModal').value);
    if (isNaN(valor) || valor <= 0) {
        mostrarToast('Digite um valor valido!', true);
        return;
    }
    
    if (valor > dadosGlobais.poupancaTotal) {
        mostrarToast('Valor maior que disponivel!', true);
        return;
    }
    
    dadosGlobais.poupancaTotal -= valor;
    document.getElementById('poupancaTotalModal').textContent = formatarMoeda(dadosGlobais.poupancaTotal);
    document.getElementById('inputPoupancaModal').value = '';
    atualizarInterface();
    marcarAlterado();
    mostrarToast('Valor removido da poupanca!');
}

function transferirSobra() {
    const sobra = calcularSobra();
    if (sobra <= 0) {
        mostrarToast('Nao ha sobra para transferir!', true);
        return;
    }
    
    if (confirm(`Transferir ${formatarMoeda(sobra)} para poupanca?`)) {
        const chaveMes = getChaveMes();
        if (!dadosGlobais.poupancaPorMes) {
            dadosGlobais.poupancaPorMes = {};
        }
        dadosGlobais.poupancaPorMes[chaveMes] = (dadosGlobais.poupancaPorMes[chaveMes] || 0) + sobra;
        dadosGlobais.poupancaTotal += sobra;
        
        document.getElementById('poupancaTotalModal').textContent = formatarMoeda(dadosGlobais.poupancaTotal);
        document.getElementById('poupancaMesModal').textContent = formatarMoeda(dadosGlobais.poupancaPorMes[chaveMes]);
        document.getElementById('sobraMesModal').textContent = formatarMoeda(0);
        atualizarInterface();
        marcarAlterado();
        mostrarToast('Sobra transferida para poupanca!');
    }
}

// ========================================
// Bancos
// ========================================

function abrirModalBanco() {
    renderizarListaBancos();
    document.getElementById('novoBancoNome').value = '';
    abrirModal('modalBancos');
}

function renderizarListaBancos() {
    const container = document.getElementById('listaBancosModal');
    
    if (dadosGlobais.bancos.length === 0) {
        container.innerHTML = '<p class="empty">Nenhum banco cadastrado</p>';
        return;
    }
    
    container.innerHTML = dadosGlobais.bancos.map((banco, index) => `
        <div class="banco-item">
            <span>${escapeHtml(banco)}</span>
            <button class="btn btn-danger btn-xs" onclick="removerBanco(${index})">Remover</button>
        </div>
    `).join('');
}

function adicionarBanco() {
    const nome = document.getElementById('novoBancoNome').value.trim();
    
    if (!nome) {
        mostrarToast('Digite o nome do banco!', true);
        return;
    }
    
    if (dadosGlobais.bancos.some(b => b.toLowerCase() === nome.toLowerCase())) {
        mostrarToast('Banco ja existe!', true);
        return;
    }
    
    dadosGlobais.bancos.push(nome);
    dadosMesAtual.cartoes[nome] = [];
    
    document.getElementById('novoBancoNome').value = '';
    renderizarListaBancos();
    renderizarTabsBancos();
    atualizarQuickLists();
    marcarAlterado();
    mostrarToast('Banco adicionado!');
}

function removerBanco(index) {
    const banco = dadosGlobais.bancos[index];
    const itens = dadosMesAtual.cartoes[banco] || [];
    
    if (itens.length > 0) {
        if (!confirm(`"${banco}" possui ${itens.length} item(s). Remover?`)) {
            return;
        }
    }
    
    dadosGlobais.bancos.splice(index, 1);
    delete dadosMesAtual.cartoes[banco];
    
    renderizarListaBancos();
    renderizarTabsBancos();
    
    if (bancoAtual === banco) {
        if (dadosGlobais.bancos.length > 0) {
            selecionarBanco(dadosGlobais.bancos[0]);
        } else {
            bancoAtual = '';
            document.getElementById('bancoNome').textContent = '-';
            document.getElementById('bancoTotal').textContent = 'R$ 0,00';
            document.getElementById('cartaoBody').innerHTML = '<tr><td colspan="4" class="empty">Nenhum banco</td></tr>';
        }
    }
    
    atualizarResumo();
    atualizarQuickLists();
    atualizarGrafico();
    marcarAlterado();
    mostrarToast('Banco removido!');
}

function renderizarTabsBancos() {
    const container = document.getElementById('tabsBancos');
    
    if (dadosGlobais.bancos.length === 0) {
        container.innerHTML = '<span class="empty-tabs">Nenhum banco cadastrado</span>';
        return;
    }
    
    container.innerHTML = dadosGlobais.bancos.map(banco => `
        <button class="tab ${banco === bancoAtual ? 'active' : ''}" 
                onclick="selecionarBanco('${escapeHtml(banco)}')">
            ${escapeHtml(banco)}
        </button>
    `).join('');
}

function selecionarBanco(banco) {
    bancoAtual = banco;
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.textContent.trim() === banco);
    });
    
    document.getElementById('bancoNome').textContent = banco;
    renderizarCartao();
}

// ========================================
// Gastos Fixos
// ========================================

function adicionarGastoFixo() {
    const nomeInput = document.getElementById('novoGastoNome');
    const valorInput = document.getElementById('novoGastoValor');
    const categoriaSelect = document.getElementById('novoGastoCategoria');
    
    const nome = nomeInput.value.trim();
    const valor = parseFloat(valorInput.value);
    const categoriaId = parseInt(categoriaSelect?.value) || null;
    
    if (!nome) {
        mostrarToast('Digite o nome!', true);
        nomeInput.focus();
        return;
    }
    
    if (isNaN(valor) || valor <= 0) {
        mostrarToast('Digite um valor valido!', true);
        valorInput.focus();
        return;
    }
    
    dadosGlobais.gastosFixos.push({
        id: Date.now(),
        nome: nome,
        valor: valor,
        categoriaId: categoriaId
    });
    
    nomeInput.value = '';
    valorInput.value = '';
    if (categoriaSelect) categoriaSelect.value = '';
    nomeInput.focus();
    
    renderizarGastosFixos();
    atualizarResumo();
    atualizarQuickLists();
    atualizarGrafico();
    marcarAlterado();
}

function editarGastoFixo(id) {
    const gasto = dadosGlobais.gastosFixos.find(g => g.id === id);
    if (!gasto) return;
    
    const novoNome = prompt('Nome:', gasto.nome);
    if (novoNome === null) return;
    
    const novoValor = prompt('Valor:', gasto.valor);
    if (novoValor === null) return;
    
    const valorNum = parseFloat(novoValor);
    if (isNaN(valorNum) || valorNum <= 0) {
        mostrarToast('Valor invalido!', true);
        return;
    }
    
    gasto.nome = novoNome.trim() || gasto.nome;
    gasto.valor = valorNum;
    
    renderizarGastosFixos();
    atualizarResumo();
    atualizarQuickLists();
    atualizarGrafico();
    marcarAlterado();
}

function removerGastoFixo(id) {
    if (!confirm('Remover este gasto?')) return;
    
    dadosGlobais.gastosFixos = dadosGlobais.gastosFixos.filter(g => g.id !== id);
    
    renderizarGastosFixos();
    atualizarResumo();
    atualizarQuickLists();
    atualizarGrafico();
    marcarAlterado();
}

function renderizarGastosFixos() {
    const tbody = document.getElementById('gastosFixosBody');
    
    // Renderizar select de categorias no formulario
    renderizarSelectCategorias('novoGastoCategoria');
    
    if (dadosGlobais.gastosFixos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty">Nenhum gasto fixo cadastrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = dadosGlobais.gastosFixos.map(g => {
        const categoria = getCategoria(g.categoriaId);
        const categoriaHtml = categoria 
            ? `<span class="categoria-badge" style="background-color: ${categoria.cor}20; color: ${categoria.cor}; border: 1px solid ${categoria.cor}40;">${categoria.emoji} ${categoria.nome}</span>`
            : '<span class="categoria-badge categoria-sem">Sem categoria</span>';
        
        return `
            <tr>
                <td>
                    <div class="gasto-nome-container">
                        ${categoriaHtml}
                        <span class="gasto-nome">${escapeHtml(g.nome)}</span>
                    </div>
                </td>
                <td>${formatarMoeda(g.valor)}</td>
                <td>
                    <div class="actions">
                        <button class="btn btn-ghost btn-xs" onclick="editarGastoFixo(${g.id})">Editar</button>
                        <button class="btn btn-danger btn-xs" onclick="removerGastoFixo(${g.id})">Remover</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getCategoria(id) {
    if (!id) return null;
    return dadosGlobais.categorias.find(c => c.id === id);
}

function renderizarSelectCategorias(selectId, selectedValue = '') {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione uma categoria</option>' +
        dadosGlobais.categorias.map(c => `
            <option value="${c.id}" ${selectedValue == c.id ? 'selected' : ''}>${c.emoji} ${c.nome}</option>
        `).join('');
}

// ========================================
// Gastos Mensais
// ========================================

function adicionarGastoMensal() {
    const nomeInput = document.getElementById('novoGastoMensalNome');
    const valorInput = document.getElementById('novoGastoMensalValor');
    const categoriaSelect = document.getElementById('novoGastoMensalCategoria');
    
    const nome = nomeInput.value.trim();
    const valor = parseFloat(valorInput.value);
    const categoriaId = parseInt(categoriaSelect?.value) || null;
    
    if (!nome) {
        mostrarToast('Digite o nome!', true);
        nomeInput.focus();
        return;
    }
    
    if (isNaN(valor) || valor <= 0) {
        mostrarToast('Digite um valor valido!', true);
        valorInput.focus();
        return;
    }
    
    // Garantir que dadosMesAtual esta sincronizado com dadosMeses
    const chave = getChaveMes();
    if (!dadosMeses[chave]) {
        dadosMeses[chave] = {
            cartoes: {},
            parcelas: [],
            salario: 0,
            gastosMensais: []
        };
    }
    if (!dadosMeses[chave].gastosMensais) {
        dadosMeses[chave].gastosMensais = [];
    }
    dadosMesAtual = dadosMeses[chave];
    
    dadosMesAtual.gastosMensais.push({
        id: Date.now(),
        nome: nome,
        valor: valor,
        categoriaId: categoriaId
    });
    
    nomeInput.value = '';
    valorInput.value = '';
    if (categoriaSelect) categoriaSelect.value = '';
    nomeInput.focus();
    
    renderizarGastosMensais();
    atualizarResumo();
    atualizarQuickLists();
    atualizarGrafico();
    marcarAlterado();
}

function editarGastoMensal(id) {
    const gasto = (dadosMesAtual.gastosMensais || []).find(g => g.id === id);
    if (!gasto) return;
    
    const novoNome = prompt('Nome:', gasto.nome);
    if (novoNome === null) return;
    
    const novoValor = prompt('Valor:', gasto.valor);
    if (novoValor === null) return;
    
    const valorNum = parseFloat(novoValor);
    if (isNaN(valorNum) || valorNum <= 0) {
        mostrarToast('Valor invalido!', true);
        return;
    }
    
    gasto.nome = novoNome.trim() || gasto.nome;
    gasto.valor = valorNum;
    
    renderizarGastosMensais();
    atualizarResumo();
    atualizarQuickLists();
    atualizarGrafico();
    marcarAlterado();
}

function removerGastoMensal(id) {
    if (!confirm('Remover este gasto?')) return;
    
    dadosMesAtual.gastosMensais = (dadosMesAtual.gastosMensais || []).filter(g => g.id !== id);
    
    renderizarGastosMensais();
    atualizarResumo();
    atualizarQuickLists();
    atualizarGrafico();
    marcarAlterado();
}

function renderizarGastosMensais() {
    const tbody = document.getElementById('gastosMensaisBody');
    if (!tbody) return;
    
    // Renderizar select de categorias no formulario
    renderizarSelectCategorias('novoGastoMensalCategoria');
    
    const gastosMensais = dadosMesAtual.gastosMensais || [];
    
    if (gastosMensais.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty">Nenhum gasto mensal cadastrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = gastosMensais.map(g => {
        const categoria = getCategoria(g.categoriaId);
        const categoriaHtml = categoria 
            ? `<span class="categoria-badge" style="background-color: ${categoria.cor}20; color: ${categoria.cor}; border: 1px solid ${categoria.cor}40;">${categoria.emoji} ${categoria.nome}</span>`
            : '<span class="categoria-badge categoria-sem">Sem categoria</span>';
        
        return `
            <tr>
                <td>
                    <div class="gasto-nome-container">
                        ${categoriaHtml}
                        <span class="gasto-nome">${escapeHtml(g.nome)}</span>
                    </div>
                </td>
                <td>${formatarMoeda(g.valor)}</td>
                <td>
                    <div class="actions">
                        <button class="btn btn-ghost btn-xs" onclick="editarGastoMensal(${g.id})">Editar</button>
                        <button class="btn btn-danger btn-xs" onclick="removerGastoMensal(${g.id})">Remover</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ========================================
// Categorias
// ========================================

function abrirModalCategorias() {
    renderizarListaCategorias();
    document.getElementById('novaCategoriaEmoji').value = '';
    document.getElementById('novaCategoriaNome').value = '';
    document.getElementById('novaCategoriaCor').value = '#0066ff';
    abrirModal('modalCategorias');
}

function renderizarListaCategorias() {
    const container = document.getElementById('listaCategoriasModal');
    
    if (dadosGlobais.categorias.length === 0) {
        container.innerHTML = '<p class="empty">Nenhuma categoria cadastrada</p>';
        return;
    }
    
    container.innerHTML = dadosGlobais.categorias.map((cat, index) => `
        <div class="categoria-item">
            <div class="categoria-info">
                <span class="categoria-preview" style="background-color: ${cat.cor}20; color: ${cat.cor}; border: 1px solid ${cat.cor}40;">
                    ${cat.emoji} ${cat.nome}
                </span>
            </div>
            <div class="categoria-actions">
                <button class="btn btn-ghost btn-xs" onclick="editarCategoria(${cat.id})">Editar</button>
                <button class="btn btn-danger btn-xs" onclick="removerCategoria(${cat.id})">Remover</button>
            </div>
        </div>
    `).join('');
}

function adicionarCategoria() {
    const emoji = document.getElementById('novaCategoriaEmoji').value.trim();
    const nome = document.getElementById('novaCategoriaNome').value.trim();
    const cor = document.getElementById('novaCategoriaCor').value;
    
    if (!nome) {
        mostrarToast('Digite o nome da categoria!', true);
        return;
    }
    
    if (!emoji) {
        mostrarToast('Digite um emoji para a categoria!', true);
        return;
    }
    
    const novoId = Math.max(...dadosGlobais.categorias.map(c => c.id), 0) + 1;
    
    dadosGlobais.categorias.push({
        id: novoId,
        nome: nome,
        emoji: emoji,
        cor: cor
    });
    
    document.getElementById('novaCategoriaEmoji').value = '';
    document.getElementById('novaCategoriaNome').value = '';
    document.getElementById('novaCategoriaCor').value = '#0066ff';
    
    renderizarListaCategorias();
    renderizarGastosFixos();
    renderizarGastosMensais();
    marcarAlterado();
    mostrarToast('Categoria adicionada!');
}

function editarCategoria(id) {
    const categoria = dadosGlobais.categorias.find(c => c.id === id);
    if (!categoria) return;
    
    const novoEmoji = prompt('Emoji:', categoria.emoji);
    if (novoEmoji === null) return;
    
    const novoNome = prompt('Nome:', categoria.nome);
    if (novoNome === null) return;
    
    const novaCor = prompt('Cor (hex):', categoria.cor);
    if (novaCor === null) return;
    
    categoria.emoji = novoEmoji.trim() || categoria.emoji;
    categoria.nome = novoNome.trim() || categoria.nome;
    categoria.cor = novaCor.trim() || categoria.cor;
    
    renderizarListaCategorias();
    renderizarGastosFixos();
    renderizarGastosMensais();
    marcarAlterado();
    mostrarToast('Categoria atualizada!');
}

function removerCategoria(id) {
    // Verificar se categoria esta em uso
    const emUsoFixos = dadosGlobais.gastosFixos.some(g => g.categoriaId === id);
    const emUsoMensais = (dadosMesAtual.gastosMensais || []).some(g => g.categoriaId === id);
    
    if (emUsoFixos || emUsoMensais) {
        if (!confirm('Esta categoria esta em uso. Remover mesmo assim? Os gastos ficarao sem categoria.')) {
            return;
        }
        // Remover categoria dos gastos
        dadosGlobais.gastosFixos.forEach(g => {
            if (g.categoriaId === id) g.categoriaId = null;
        });
        (dadosMesAtual.gastosMensais || []).forEach(g => {
            if (g.categoriaId === id) g.categoriaId = null;
        });
    } else {
        if (!confirm('Remover esta categoria?')) return;
    }
    
    dadosGlobais.categorias = dadosGlobais.categorias.filter(c => c.id !== id);
    
    renderizarListaCategorias();
    renderizarGastosFixos();
    renderizarGastosMensais();
    marcarAlterado();
    mostrarToast('Categoria removida!');
}

// ========================================
// Cartoes
// ========================================

function adicionarItemCartao() {
    if (!bancoAtual) {
        mostrarToast('Selecione um banco!', true);
        return;
    }
    
    const descInput = document.getElementById('novaDescricaoCartao');
    const valorInput = document.getElementById('novoValorCartao');
    const parcelasInput = document.getElementById('novoParcelas');
    
    const descricao = descInput.value.trim();
    const valor = parseFloat(valorInput.value);
    const parcelas = parseInt(parcelasInput?.value) || 1;
    
    if (!descricao) {
        mostrarToast('Digite a descricao!', true);
        descInput.focus();
        return;
    }
    
    if (isNaN(valor) || valor <= 0) {
        mostrarToast('Digite um valor valido!', true);
        valorInput.focus();
        return;
    }
    
    if (!dadosMesAtual.cartoes[bancoAtual]) {
        dadosMesAtual.cartoes[bancoAtual] = [];
    }
    
    if (parcelas > 1) {
        // Adicionar como parcela
        if (!dadosMesAtual.parcelas) {
            dadosMesAtual.parcelas = [];
        }
        
        dadosMesAtual.parcelas.push({
            id: Date.now(),
            descricao: descricao,
            valorTotal: valor,
            numParcelas: parcelas,
            parcelaAtual: 1,
            mesInicio: mesAtual,
            anoInicio: anoAtual,
            banco: bancoAtual
        });
    } else {
        // Adicionar como item normal
        dadosMesAtual.cartoes[bancoAtual].push({
            id: Date.now(),
            descricao: descricao,
            valor: valor
        });
    }
    
    descInput.value = '';
    valorInput.value = '';
    if (parcelasInput) parcelasInput.value = '1';
    descInput.focus();
    
    renderizarCartao();
    atualizarResumo();
    atualizarQuickLists();
    atualizarGrafico();
    marcarAlterado();
}

function editarItemCartao(id) {
    const item = dadosMesAtual.cartoes[bancoAtual].find(i => i.id === id);
    if (!item) return;
    
    const novaDesc = prompt('Descricao:', item.descricao);
    if (novaDesc === null) return;
    
    const novoValor = prompt('Valor:', item.valor);
    if (novoValor === null) return;
    
    const valorNum = parseFloat(novoValor);
    if (isNaN(valorNum) || valorNum <= 0) {
        mostrarToast('Valor invalido!', true);
        return;
    }
    
    item.descricao = novaDesc.trim() || item.descricao;
    item.valor = valorNum;
    
    renderizarCartao();
    atualizarResumo();
    atualizarQuickLists();
    atualizarGrafico();
    marcarAlterado();
}

function removerItemCartao(id) {
    if (!confirm('Remover este item?')) return;
    
    dadosMesAtual.cartoes[bancoAtual] = dadosMesAtual.cartoes[bancoAtual].filter(i => i.id !== id);
    
    renderizarCartao();
    atualizarResumo();
    atualizarQuickLists();
    atualizarGrafico();
    marcarAlterado();
}

function removerParcela(id) {
    if (!confirm('Remover esta parcela? Sera removida de todos os meses.')) return;
    
    // Remover parcela do mes onde foi criada
    for (const chave in dadosMeses) {
        const mesDados = dadosMeses[chave];
        if (mesDados.parcelas) {
            mesDados.parcelas = mesDados.parcelas.filter(p => p.id !== id);
        }
    }
    
    renderizarCartao();
    atualizarResumo();
    atualizarQuickLists();
    atualizarGrafico();
    marcarAlterado();
}

function renderizarCartao() {
    const tbody = document.getElementById('cartaoBody');
    const itens = dadosMesAtual.cartoes[bancoAtual] || [];
    const parcelasBanco = getParcelasAtivasDoBanco(bancoAtual);
    const total = calcularTotalBanco(bancoAtual);
    
    document.getElementById('bancoTotal').textContent = formatarMoeda(total);
    
    if (itens.length === 0 && parcelasBanco.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty">Nenhum item cadastrado</td></tr>';
        return;
    }
    
    let html = '';
    
    // Itens normais
    html += itens.map(i => `
        <tr>
            <td>${escapeHtml(i.descricao)}</td>
            <td>${formatarMoeda(i.valor)}</td>
            <td>-</td>
            <td>
                <div class="actions">
                    <button class="btn btn-ghost btn-xs" onclick="editarItemCartao(${i.id})">Editar</button>
                    <button class="btn btn-danger btn-xs" onclick="removerItemCartao(${i.id})">Remover</button>
                </div>
            </td>
        </tr>
    `).join('');
    
    // Parcelas
    html += parcelasBanco.map(p => {
        const isUltimaParcela = p.parcelaAtual === p.numParcelas;
        return `
        <tr class="parcela-row ${isUltimaParcela ? 'ultima-parcela' : ''}">
            <td>
                ${escapeHtml(p.descricao)}
                ${isUltimaParcela ? '<span class="parcela-final-tag">Ultima!</span>' : ''}
            </td>
            <td>
                <span class="valor-parcela">${formatarMoeda(p.valorParcela)}</span>
                <span class="valor-total-info">(Total: ${formatarMoeda(p.valorTotal)})</span>
            </td>
            <td><span class="parcela-badge">${p.parcelaAtual}/${p.numParcelas}</span></td>
            <td>
                <div class="actions">
                    <button class="btn btn-danger btn-xs" onclick="removerParcela(${p.id})">Remover</button>
                </div>
            </td>
        </tr>
    `;
    }).join('');
    
    tbody.innerHTML = html;
}

// ========================================
// Grafico
// ========================================

function inicializarGrafico() {
    const ctx = document.getElementById('graficoGastos').getContext('2d');
    
    grafico = new Chart(ctx, {
        type: tipoGrafico === 'pie' ? 'doughnut' : 'bar',
        data: {
            labels: [],
            datasets: [{
                data: [],
backgroundColor: [
    '#0066ff',
    '#f59e0b',
    '#059669',
    '#dc2626',
    '#d97706',
    '#7c3aed',
    '#0891b2',
    '#be185d',
    '#4f46e5',
    '#10b981'
],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            family: "'Inter', sans-serif",
                            size: 12
                        }
                    }
                }
            },
            scales: tipoGrafico === 'bar' ? {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatarMoeda(value);
                        }
                    }
                }
            } : {}
        }
    });
    
    atualizarGrafico();
}

function alternarTipoGrafico(tipo) {
    tipoGrafico = tipo;
    
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === tipo);
    });
    
    if (grafico) {
        grafico.destroy();
    }
    
    inicializarGrafico();
}

function atualizarGrafico() {
    if (!grafico) return;
    
    const labels = [];
    const valores = [];
    
    // Gastos Fixos
    const totalGastosFixos = calcularTotalGastosFixos();
    if (totalGastosFixos > 0) {
        labels.push('Gastos Fixos');
        valores.push(totalGastosFixos);
    }
    
    // Gastos Mensais
    const totalGastosMensais = calcularTotalGastosMensais();
    if (totalGastosMensais > 0) {
        labels.push('Gastos Mensais');
        valores.push(totalGastosMensais);
    }
    
    // Bancos
    dadosGlobais.bancos.forEach(banco => {
        const total = calcularTotalBanco(banco);
        if (total > 0) {
            labels.push(banco);
            valores.push(total);
        }
    });
    
    grafico.data.labels = labels;
    grafico.data.datasets[0].data = valores;
    grafico.update();
}

// ========================================
// Utilitarios
// ========================================

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function mostrarToast(mensagem, erro = false) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${erro ? 'error' : 'success'}`;
    toast.textContent = mensagem;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}
