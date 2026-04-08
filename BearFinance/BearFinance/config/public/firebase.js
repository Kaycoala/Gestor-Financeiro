/**
 * Firebase Configuration Module
 * Sistema completo de autenticacao e criptografia de dados
 * 
 * RECURSOS:
 * - Autenticacao com nome de usuario e senha (usando Firestore)
 * - Criptografia AES-256-GCM de ponta a ponta
 * - Salvamento automatico apos inatividade
 * - Todos os dados financeiros sao criptografados antes de salvar
 */

// ========================================
// CREDENCIAIS DO FIREBASE
// ========================================
const firebaseConfig = {
    apiKey: "AIzaSyAUdxfRrw1D6hYi_iG8DYCFIj5jQEh2TVw",
    authDomain: "gestor-financa.firebaseapp.com",
    projectId: "gestor-financa",
    storageBucket: "gestor-financa.firebasestorage.app",
    messagingSenderId: "132905908850",
    appId: "1:132905908850:web:da487fdbfb6f69c116e0eb"
};

// ========================================
// VARIAVEIS GLOBAIS
// ========================================
let firebaseApp = null;
let firebaseDb = null;
let currentUser = null; // { uid, username, senhaHash }
let userEncryptionKey = null; // Chave de criptografia derivada da senha
const SESSION_KEY = 'gestor_financas_session';

// Timer para salvamento automatico
let autoSaveTimer = null;
const AUTO_SAVE_DELAY = 5000; // 5 segundos de inatividade

// Cache dos modulos Firebase para carregamento mais rapido
let firebaseModulesCache = null;

// Pre-carregar modulos Firebase em paralelo (melhora tempo de carregamento)
const preloadFirebaseModules = (async () => {
    try {
        const [appModule, firestoreModule] = await Promise.all([
            import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"),
            import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js")
        ]);
        firebaseModulesCache = { appModule, firestoreModule };
        return firebaseModulesCache;
    } catch (e) {
        console.error('Erro ao pre-carregar Firebase:', e);
        return null;
    }
})();

// ========================================
// SISTEMA DE CRIPTOGRAFIA AES-256-GCM
// ========================================

/**
 * Converte string para ArrayBuffer
 */
function stringToArrayBuffer(str) {
    return new TextEncoder().encode(str);
}

/**
 * Converte ArrayBuffer para string
 */
function arrayBufferToString(buffer) {
    return new TextDecoder().decode(buffer);
}

/**
 * Converte ArrayBuffer para Base64
 */
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Converte Base64 para ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Deriva uma chave de criptografia a partir da senha do usuario
 * Usa PBKDF2 com 100.000 iteracoes para seguranca
 * @param {string} password - Senha do usuario
 * @param {string} salt - Salt unico (uid do usuario)
 * @returns {Promise<CryptoKey>} - Chave derivada
 */
async function deriveEncryptionKey(password, salt) {
    // Importar a senha como chave base
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        stringToArrayBuffer(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    // Derivar chave AES-256 usando PBKDF2
    const derivedKey = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: stringToArrayBuffer(salt),
            iterations: 100000, // Alto numero de iteracoes para seguranca
            hash: 'SHA-256'
        },
        passwordKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );

    return derivedKey;
}

/**
 * Criptografa dados usando AES-256-GCM
 * @param {string} plaintext - Dados em texto plano
 * @param {CryptoKey} key - Chave de criptografia
 * @returns {Promise<string>} - Dados criptografados em Base64 (iv:ciphertext)
 */
async function encryptData(plaintext, key) {
    if (!key) {
        console.error('Chave de criptografia nao definida');
        return null;
    }

    try {
        // Gerar IV aleatorio (12 bytes para GCM)
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        // Criptografar
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            stringToArrayBuffer(plaintext)
        );

        // Combinar IV + ciphertext e converter para Base64
        const combined = new Uint8Array(iv.length + ciphertext.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(ciphertext), iv.length);

        return arrayBufferToBase64(combined.buffer);
    } catch (error) {
        console.error('Erro ao criptografar:', error);
        return null;
    }
}

/**
 * Descriptografa dados usando AES-256-GCM
 * @param {string} encryptedBase64 - Dados criptografados em Base64
 * @param {CryptoKey} key - Chave de criptografia
 * @returns {Promise<string>} - Dados descriptografados
 */
async function decryptData(encryptedBase64, key) {
    if (!key) {
        console.error('Chave de criptografia nao definida');
        return null;
    }

    try {
        // Converter de Base64
        const combined = new Uint8Array(base64ToArrayBuffer(encryptedBase64));
        
        // Extrair IV (primeiros 12 bytes) e ciphertext
        const iv = combined.slice(0, 12);
        const ciphertext = combined.slice(12);

        // Descriptografar
        const plaintext = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            ciphertext
        );

        return arrayBufferToString(plaintext);
    } catch (error) {
        console.error('Erro ao descriptografar:', error);
        return null;
    }
}

/**
 * Hash de senha usando SHA-256 (para verificacao)
 * @param {string} password - Senha
 * @returns {Promise<string>} - Hash em hex
 */
async function hashPassword(password) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', stringToArrayBuffer(password));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ========================================
// INICIALIZACAO
// ========================================

/**
 * Inicializa o Firebase e restaura sessao se existir
 */
async function initFirebase() {
    try {
        // Usar cache de modulos pre-carregados se disponivel
        let modules = firebaseModulesCache;
        if (!modules) {
            modules = await preloadFirebaseModules;
        }
        
        if (!modules) {
            throw new Error('Falha ao carregar modulos Firebase');
        }

        const { initializeApp } = modules.appModule;
        const { getFirestore } = modules.firestoreModule;

        firebaseApp = initializeApp(firebaseConfig);
        firebaseDb = getFirestore(firebaseApp);

        // Tentar restaurar sessao do sessionStorage
        const savedSession = sessionStorage.getItem(SESSION_KEY);
        if (savedSession) {
            try {
                const sessionData = JSON.parse(savedSession);
                currentUser = {
                    uid: sessionData.uid,
                    username: sessionData.username
                };
                // Restaurar chave de criptografia
                if (sessionData.uid && sessionData.keyData) {
                    userEncryptionKey = await deriveEncryptionKey(sessionData.keyData, sessionData.uid);
                }
                return currentUser;
            } catch (e) {
                console.error('Erro ao restaurar sessao:', e);
                sessionStorage.removeItem(SESSION_KEY);
            }
        }

        return null;
    } catch (error) {
        console.error('Erro ao inicializar Firebase:', error);
        return null;
    }
}

// ========================================
// AUTENTICACAO
// ========================================

/**
 * Registra um novo usuario
 * @param {string} username - Nome de usuario (unico)
 * @param {string} senha - Senha (sera usada para criptografia)
 */
async function registrarUsuario(username, senha) {
    try {
        // Garantir que Firebase esta inicializado
        if (!firebaseDb) {
            await initFirebase();
        }
        
        const modules = firebaseModulesCache || await preloadFirebaseModules;
        const { doc, setDoc, getDoc } = modules.firestoreModule;

        // Normalizar username
        const usernameNormalizado = username.toLowerCase().trim();
        
        console.log('[v0] Tentando registrar usuario:', usernameNormalizado);

        // Verificar se username ja existe
        const userDocRef = doc(firebaseDb, 'usuarios', usernameNormalizado);
        const existingUser = await getDoc(userDocRef);
        
        if (existingUser.exists()) {
            return { success: false, message: 'Este nome de usuario ja esta em uso' };
        }

        // Hash da senha para armazenamento
        const senhaHash = await hashPassword(senha);

        // Criar documento do usuario no Firestore (usando username como ID)
        console.log('[v0] Criando documento no Firestore...');
        await setDoc(userDocRef, {
            username: usernameNormalizado,
            senhaHash: senhaHash,
            criadoEm: new Date().toISOString(),
            dadosCriptografados: '',
            ultimaAtualizacao: null
        });

        console.log('[v0] Usuario registrado com sucesso!');
        return { success: true, message: 'Conta criada com sucesso! Faca login para continuar.' };
    } catch (error) {
        console.error('[v0] Erro ao registrar:', error);
        console.error('[v0] Codigo do erro:', error.code);
        console.error('[v0] Mensagem do erro:', error.message);
        return { success: false, message: 'Erro ao criar conta: ' + (error.message || 'Tente novamente.') };
    }
}

/**
 * Login com username e senha
 * @param {string} username - Nome de usuario
 * @param {string} senha - Senha (sera usada para descriptografia)
 */
async function loginComUsername(username, senha) {
    try {
        // Garantir que Firebase esta inicializado
        if (!firebaseDb) {
            await initFirebase();
        }
        
        const modules = firebaseModulesCache || await preloadFirebaseModules;
        const { doc, getDoc } = modules.firestoreModule;

        // Normalizar username
        const usernameNormalizado = username.toLowerCase().trim();
        console.log('[v0] Tentando login para:', usernameNormalizado);

        // Buscar usuario no Firestore
        const userDocRef = doc(firebaseDb, 'usuarios', usernameNormalizado);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
            return { success: false, message: 'Usuario nao encontrado' };
        }

        const userData = userDoc.data();

        // Verificar senha
        const senhaHash = await hashPassword(senha);
        if (senhaHash !== userData.senhaHash) {
            return { success: false, message: 'Senha incorreta' };
        }

        // Definir usuario atual
        currentUser = {
            uid: usernameNormalizado,
            username: usernameNormalizado
        };

        // Derivar chave de criptografia da senha
        userEncryptionKey = await deriveEncryptionKey(senha, usernameNormalizado);

        // Salvar sessao no sessionStorage
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
            uid: usernameNormalizado,
            username: usernameNormalizado,
            keyData: senha // Para restaurar a chave de criptografia
        }));

        return { success: true, user: currentUser };
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        return { success: false, message: 'Erro ao fazer login. Tente novamente.' };
    }
}



/**
 * Define a chave de criptografia apos login
 * @param {string} senha - Senha do usuario para derivar a chave
 */
async function definirChaveCriptografia(senha) {
    if (!currentUser) {
        return { success: false, message: 'Usuario nao autenticado' };
    }
    
    userEncryptionKey = await deriveEncryptionKey(senha, currentUser.uid);
    return { success: true };
}

/**
 * Verifica se o usuario esta autenticado
 * Redireciona para login se nao estiver
 */
async function verificarAutenticacao() {
    const user = await initFirebase();
    
    if (!user) {
        window.location.href = 'login.html';
        return null;
    }

    return user;
}

/**
 * Faz logout do usuario
 */
async function logout() {
    try {
        // Salvar dados antes de sair
        if (typeof gerarXMLCompleto === 'function' && currentUser && userEncryptionKey) {
            await salvarDadosCriptografados(gerarXMLCompleto());
        }
        
        // Limpar sessao
        sessionStorage.removeItem(SESSION_KEY);
        
        // Limpar variaveis
        userEncryptionKey = null;
        currentUser = null;
        
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        sessionStorage.removeItem(SESSION_KEY);
        window.location.href = 'login.html';
    }
}



// ========================================
// SALVAMENTO AUTOMATICO
// ========================================

/**
 * Agenda o salvamento automatico apos periodo de inatividade
 */
function agendarSalvamentoAutomatico() {
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
    }
    
    autoSaveTimer = setTimeout(async () => {
        await executarSalvamentoAutomatico();
    }, AUTO_SAVE_DELAY);
}

/**
 * Executa o salvamento automatico com criptografia
 */
async function executarSalvamentoAutomatico() {
    if (!currentUser || !userEncryptionKey) {
        console.log('Usuario nao autenticado ou chave nao definida - salvamento ignorado');
        return;
    }
    
    if (typeof gerarXMLCompleto !== 'function') {
        console.log('Funcao gerarXMLCompleto nao encontrada');
        return;
    }
    
    if (typeof dadosAlterados !== 'undefined' && !dadosAlterados) {
        return;
    }
    
    try {
        if (typeof atualizarStatusSalvo === 'function') {
            atualizarStatusSalvo(false, 'Criptografando...');
        }
        
        const xmlString = gerarXMLCompleto();
        const sucesso = await salvarDadosCriptografados(xmlString);
        
        if (sucesso) {
            if (typeof window !== 'undefined') {
                window.dadosAlterados = false;
            }
            
            if (typeof atualizarStatusSalvo === 'function') {
                atualizarStatusSalvo(true, 'Salvo (criptografado)');
            }
            
            console.log('Dados salvos e criptografados automaticamente');
        } else {
            if (typeof atualizarStatusSalvo === 'function') {
                atualizarStatusSalvo(false, 'Erro ao salvar');
            }
        }
    } catch (error) {
        console.error('Erro no salvamento automatico:', error);
        if (typeof atualizarStatusSalvo === 'function') {
            atualizarStatusSalvo(false, 'Erro ao salvar');
        }
    }
}

/**
 * Cancela o salvamento automatico pendente
 */
function cancelarSalvamentoAutomatico() {
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
    }
}

// ========================================
// OPERACOES NO FIRESTORE (COM CRIPTOGRAFIA)
// ========================================

/**
 * Salva os dados financeiros CRIPTOGRAFADOS no Firestore
 * @param {string} dadosXML - String XML com os dados financeiros
 */
async function salvarDadosCriptografados(dadosXML) {
    if (!currentUser) {
        console.error('Usuario nao autenticado');
        return false;
    }

    if (!userEncryptionKey) {
        console.error('Chave de criptografia nao definida');
        return false;
    }

    try {
        const modules = firebaseModulesCache || await preloadFirebaseModules;
        const { doc, updateDoc, setDoc, getDoc } = modules.firestoreModule;
        
        // Criptografar os dados
        const dadosCriptografados = await encryptData(dadosXML, userEncryptionKey);
        
        if (!dadosCriptografados) {
            console.error('Falha ao criptografar dados');
            return false;
        }

        const userDocRef = doc(firebaseDb, 'usuarios', currentUser.uid);
        const docSnap = await getDoc(userDocRef);

        const dadosParaSalvar = {
            dadosCriptografados: dadosCriptografados,
            ultimaAtualizacao: new Date().toISOString(),
            versaoCriptografia: 'AES-256-GCM-v1' // Para compatibilidade futura
        };

        if (docSnap.exists()) {
            await updateDoc(userDocRef, dadosParaSalvar);
        } else {
            await setDoc(userDocRef, {
                username: currentUser.username,
                criadoEm: new Date().toISOString(),
                ...dadosParaSalvar
            });
        }

        return true;
    } catch (error) {
        console.error('Erro ao salvar dados criptografados:', error);
        return false;
    }
}

/**
 * Carrega e DESCRIPTOGRAFA os dados financeiros do Firestore
 * @returns {string|null} - String XML com os dados ou null
 */
async function carregarDadosCriptografados() {
    if (!currentUser) {
        console.error('Usuario nao autenticado');
        return null;
    }

    if (!userEncryptionKey) {
        console.error('Chave de criptografia nao definida');
        return null;
    }

    try {
        const modules = firebaseModulesCache || await preloadFirebaseModules;
        const { doc, getDoc } = modules.firestoreModule;
        
        const userDocRef = doc(firebaseDb, 'usuarios', currentUser.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            const dados = docSnap.data();
            
            // Verificar se existem dados criptografados
            if (dados.dadosCriptografados) {
                const dadosDescriptografados = await decryptData(dados.dadosCriptografados, userEncryptionKey);
                
                if (!dadosDescriptografados) {
                    console.error('Falha ao descriptografar - senha pode estar incorreta');
                    return null;
                }
                
                return dadosDescriptografados;
            }
            
            // Fallback para dados antigos nao criptografados (migracao)
            if (dados.dadosXML) {
                console.log('Migrando dados antigos para formato criptografado...');
                // Salvar em formato criptografado
                await salvarDadosCriptografados(dados.dadosXML);
                return dados.dadosXML;
            }
        }

        return null;
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        return null;
    }
}

/**
 * Retorna informacoes do usuario atual
 */
function getUsuarioAtual() {
    if (!currentUser) return null;
    
    return {
        uid: currentUser.uid,
        username: currentUser.username,
        nome: currentUser.username,
        criptografiaAtiva: !!userEncryptionKey
    };
}

/**
 * Verifica se a chave de criptografia esta definida
 */
function temChaveCriptografia() {
    return !!userEncryptionKey;
}

// ========================================
// SALVAMENTO AO FECHAR PAGINA
// ========================================

window.addEventListener('beforeunload', async (event) => {
    if (typeof dadosAlterados !== 'undefined' && dadosAlterados && currentUser && userEncryptionKey) {
        cancelarSalvamentoAutomatico();
        event.preventDefault();
        event.returnValue = 'Voce tem alteracoes nao salvas. Deseja sair?';
    }
});

// ========================================
// EXPORTACAO GLOBAL
// ========================================

window.FirebaseManager = {
    // Inicializacao
    init: initFirebase,
    
    // Autenticacao
    registrar: registrarUsuario,
    login: loginComUsername,
    logout: logout,
    verificarAutenticacao: verificarAutenticacao,
    
    // Criptografia
    definirChave: definirChaveCriptografia,
    temChave: temChaveCriptografia,
    
    // Dados (criptografados)
    salvarDados: salvarDadosCriptografados,
    carregarDados: carregarDadosCriptografados,
    
    // Usuario
    getUsuario: getUsuarioAtual,
    getConfig: () => firebaseConfig,
    
    // Salvamento automatico
    agendarSalvamento: agendarSalvamentoAutomatico,
    cancelarSalvamento: cancelarSalvamentoAutomatico,
    salvarAgora: executarSalvamentoAutomatico
};

/* ========================================
   DOCUMENTACAO DO SISTEMA DE CRIPTOGRAFIA
   ========================================

   ALGORITMO: AES-256-GCM
   -----------------------
   - Criptografia simetrica de 256 bits
   - Modo GCM (Galois/Counter Mode) com autenticacao
   - IV (Initialization Vector) aleatorio de 12 bytes
   
   DERIVACAO DE CHAVE: PBKDF2
   --------------------------
   - 100.000 iteracoes (protecao contra brute-force)
   - Salt = username do usuario (unico por conta)
   - Hash: SHA-256
   
   FLUXO DE SEGURANCA:
   -------------------
   1. Usuario faz login com username/senha
   2. Senha e usada para derivar chave de criptografia (PBKDF2)
   3. Chave e mantida na sessao para persistir durante navegacao
   4. Dados XML sao criptografados com AES-256-GCM
   5. Apenas o usuario com a senha correta pode descriptografar
   
   IMPORTANTE:
   -----------
   - Se o usuario esquecer a senha, os dados NAO podem ser recuperados
   - A senha nunca e enviada ao servidor (apenas o hash SHA-256 para verificacao)
   - Cada usuario tem uma chave unica derivada de sua senha + username

*/
