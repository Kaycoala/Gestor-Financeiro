/**
 * Firebase Configuration Module
 * Sistema completo de autenticacao e criptografia de dados
 */

import { initializeApp, FirebaseApp } from 'firebase/app'
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  Firestore 
} from 'firebase/firestore'

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAUdxfRrw1D6hYi_iG8DYCFIj5jQEh2TVw",
  authDomain: "gestor-financa.firebaseapp.com",
  projectId: "gestor-financa",
  storageBucket: "gestor-financa.firebasestorage.app",
  messagingSenderId: "132905908850",
  appId: "1:132905908850:web:da487fdbfb6f69c116e0eb"
}

// Global state
let firebaseApp: FirebaseApp | null = null
let firebaseDb: Firestore | null = null
let currentUser: { uid: string; username: string } | null = null
let userEncryptionKey: CryptoKey | null = null
const SESSION_KEY = 'gestor_financas_session'

// ========================================
// CRYPTO UTILITIES
// ========================================

function stringToArrayBuffer(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

function arrayBufferToString(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer)
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

async function deriveEncryptionKey(password: string, salt: string): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    stringToArrayBuffer(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: stringToArrayBuffer(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

async function encryptData(plaintext: string, key: CryptoKey): Promise<string | null> {
  if (!key) return null

  try {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      stringToArrayBuffer(plaintext)
    )

    const combined = new Uint8Array(iv.length + ciphertext.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(ciphertext), iv.length)

    return arrayBufferToBase64(combined.buffer)
  } catch (error) {
    console.error('Encryption error:', error)
    return null
  }
}

async function decryptData(encryptedBase64: string, key: CryptoKey): Promise<string | null> {
  if (!key) return null

  try {
    const combined = new Uint8Array(base64ToArrayBuffer(encryptedBase64))
    const iv = combined.slice(0, 12)
    const ciphertext = combined.slice(12)

    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    )

    return arrayBufferToString(plaintext)
  } catch (error) {
    console.error('Decryption error:', error)
    return null
  }
}

async function hashPassword(password: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', stringToArrayBuffer(password))
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ========================================
// FIREBASE MANAGER
// ========================================

export const FirebaseManager = {
  async init(): Promise<{ uid: string; username: string } | null> {
    try {
      if (!firebaseApp) {
        firebaseApp = initializeApp(firebaseConfig)
        firebaseDb = getFirestore(firebaseApp)
      }

      // Try to restore session
      if (typeof window !== 'undefined') {
        const savedSession = sessionStorage.getItem(SESSION_KEY)
        if (savedSession) {
          try {
            const sessionData = JSON.parse(savedSession)
            currentUser = {
              uid: sessionData.uid,
              username: sessionData.username
            }
            if (sessionData.uid && sessionData.keyData) {
              userEncryptionKey = await deriveEncryptionKey(sessionData.keyData, sessionData.uid)
            }
            return currentUser
          } catch {
            sessionStorage.removeItem(SESSION_KEY)
          }
        }
      }

      return null
    } catch (error) {
      console.error('Firebase init error:', error)
      return null
    }
  },

  async registrar(username: string, senha: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!firebaseDb) await this.init()
      if (!firebaseDb) throw new Error('Database not initialized')

      const usernameNormalizado = username.toLowerCase().trim()
      const userDocRef = doc(firebaseDb, 'usuarios', usernameNormalizado)
      const existingUser = await getDoc(userDocRef)

      if (existingUser.exists()) {
        return { success: false, message: 'Este nome de usuario ja esta em uso' }
      }

      const senhaHash = await hashPassword(senha)

      await setDoc(userDocRef, {
        username: usernameNormalizado,
        senhaHash,
        criadoEm: new Date().toISOString(),
        dadosCriptografados: '',
        ultimaAtualizacao: null
      })

      return { success: true, message: 'Conta criada com sucesso! Faca login para continuar.' }
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, message: 'Erro ao criar conta. Tente novamente.' }
    }
  },

  async login(username: string, senha: string): Promise<{ success: boolean; message?: string; user?: typeof currentUser }> {
    try {
      if (!firebaseDb) await this.init()
      if (!firebaseDb) throw new Error('Database not initialized')

      const usernameNormalizado = username.toLowerCase().trim()
      const userDocRef = doc(firebaseDb, 'usuarios', usernameNormalizado)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        return { success: false, message: 'Usuario nao encontrado' }
      }

      const userData = userDoc.data()
      const senhaHash = await hashPassword(senha)

      if (senhaHash !== userData.senhaHash) {
        return { success: false, message: 'Senha incorreta' }
      }

      currentUser = {
        uid: usernameNormalizado,
        username: usernameNormalizado
      }

      userEncryptionKey = await deriveEncryptionKey(senha, usernameNormalizado)

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          uid: usernameNormalizado,
          username: usernameNormalizado,
          keyData: senha
        }))
      }

      return { success: true, user: currentUser }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, message: 'Erro ao fazer login. Tente novamente.' }
    }
  },

  async logout(): Promise<void> {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SESSION_KEY)
    }
    userEncryptionKey = null
    currentUser = null
  },

  async verificarAutenticacao(): Promise<typeof currentUser> {
    if (currentUser) return currentUser
    return this.init()
  },

  getUsuario() {
    return currentUser ? {
      uid: currentUser.uid,
      username: currentUser.username,
      criptografiaAtiva: !!userEncryptionKey
    } : null
  },

  temChave(): boolean {
    return !!userEncryptionKey
  },

  async salvarDados(dadosXML: string): Promise<boolean> {
    if (!currentUser || !userEncryptionKey || !firebaseDb) return false

    try {
      const dadosCriptografados = await encryptData(dadosXML, userEncryptionKey)
      if (!dadosCriptografados) return false

      const userDocRef = doc(firebaseDb, 'usuarios', currentUser.uid)
      const docSnap = await getDoc(userDocRef)

      const dadosParaSalvar = {
        dadosCriptografados,
        ultimaAtualizacao: new Date().toISOString(),
        versaoCriptografia: 'AES-256-GCM-v1'
      }

      if (docSnap.exists()) {
        await updateDoc(userDocRef, dadosParaSalvar)
      } else {
        await setDoc(userDocRef, {
          username: currentUser.username,
          criadoEm: new Date().toISOString(),
          ...dadosParaSalvar
        })
      }

      return true
    } catch (error) {
      console.error('Save error:', error)
      return false
    }
  },

  async carregarDados(): Promise<string | null> {
    if (!currentUser || !userEncryptionKey || !firebaseDb) return null

    try {
      const userDocRef = doc(firebaseDb, 'usuarios', currentUser.uid)
      const docSnap = await getDoc(userDocRef)

      if (docSnap.exists()) {
        const dados = docSnap.data()
        
        if (dados.dadosCriptografados) {
          return await decryptData(dados.dadosCriptografados, userEncryptionKey)
        }
        
        // Fallback for old unencrypted data
        if (dados.dadosXML) {
          await this.salvarDados(dados.dadosXML)
          return dados.dadosXML
        }
      }

      return null
    } catch (error) {
      console.error('Load error:', error)
      return null
    }
  }
}
