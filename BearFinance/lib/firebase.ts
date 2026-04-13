/**
 * Database Manager - MySQL/Hostinger Backend
 * Sistema completo de autenticacao e criptografia de dados
 */

// API Base URL - Altere para o seu dominio na Hostinger
const API_BASE_URL = typeof window !== 'undefined' 
  ? `${window.location.origin}/api` 
  : '/api'

// Global state
let currentUser: { uid: string; username: string } | null = null
let userEncryptionKey: CryptoKey | null = null
let sessionToken: string | null = null
const SESSION_KEY = 'gante_session'
const TOKEN_KEY = 'gante_token'

// ========================================
// CRYPTO UTILITIES
// ========================================

function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder()
  const uint8Array = encoder.encode(str)
  return uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength)
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

    const resultBuffer = combined.buffer.slice(combined.byteOffset, combined.byteOffset + combined.byteLength)
    return arrayBufferToBase64(resultBuffer)
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

// ========================================
// API HELPERS
// ========================================

async function apiCall(endpoint: string, action: string, data: object = {}): Promise<Response> {
  const url = `${API_BASE_URL}/${endpoint}.php?action=${action}`
  
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  })
}

// ========================================
// FIREBASE MANAGER (Renamed but kept for compatibility)
// ========================================

export const FirebaseManager = {
  async init(): Promise<{ uid: string; username: string } | null> {
    try {
      // Try to restore session from localStorage
      if (typeof window !== 'undefined') {
        const savedSession = localStorage.getItem(SESSION_KEY)
        const savedToken = localStorage.getItem(TOKEN_KEY)
        
        if (savedSession && savedToken) {
          try {
            const sessionData = JSON.parse(savedSession)
            sessionToken = savedToken
            
            // Verify token with backend
            const response = await apiCall('auth', 'verify', { token: savedToken })
            const result = await response.json()
            
            if (result.success) {
              currentUser = {
                uid: result.user.uid,
                username: result.user.username
              }
              
              // Restore encryption key
              if (sessionData.keyData) {
                userEncryptionKey = await deriveEncryptionKey(sessionData.keyData, sessionData.uid)
              }
              
              return currentUser
            } else {
              // Session expired, clean up
              localStorage.removeItem(SESSION_KEY)
              localStorage.removeItem(TOKEN_KEY)
            }
          } catch {
            localStorage.removeItem(SESSION_KEY)
            localStorage.removeItem(TOKEN_KEY)
          }
        }
      }

      return null
    } catch (error) {
      console.error('Init error:', error)
      return null
    }
  },

  async registrar(username: string, senha: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiCall('auth', 'register', { username, password: senha })
      const result = await response.json()
      return result
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, message: 'Erro ao criar conta. Tente novamente.' }
    }
  },

  async login(username: string, senha: string): Promise<{ success: boolean; message?: string; user?: typeof currentUser }> {
    try {
      const response = await apiCall('auth', 'login', { username, password: senha })
      const result = await response.json()

      if (!result.success) {
        return { success: false, message: result.message }
      }

      currentUser = {
        uid: result.user.uid,
        username: result.user.username
      }
      sessionToken = result.token

      // Derive encryption key from password
      userEncryptionKey = await deriveEncryptionKey(senha, result.user.uid)

      // Save session
      if (typeof window !== 'undefined') {
        localStorage.setItem(SESSION_KEY, JSON.stringify({
          uid: result.user.uid,
          username: result.user.username,
          keyData: senha
        }))
        localStorage.setItem(TOKEN_KEY, result.token)
      }

      return { success: true, user: currentUser }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, message: 'Erro ao fazer login. Tente novamente.' }
    }
  },

  async logout(): Promise<void> {
    try {
      if (sessionToken) {
        await apiCall('auth', 'logout', { token: sessionToken })
      }
    } catch (error) {
      console.error('Logout error:', error)
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY)
      localStorage.removeItem(TOKEN_KEY)
    }
    
    userEncryptionKey = null
    currentUser = null
    sessionToken = null
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
    if (!currentUser || !userEncryptionKey || !sessionToken) return false

    try {
      const dadosCriptografados = await encryptData(dadosXML, userEncryptionKey)
      if (!dadosCriptografados) return false

      const response = await apiCall('dados', 'save', {
        token: sessionToken,
        dados: dadosCriptografados
      })
      
      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Save error:', error)
      return false
    }
  },

  async carregarDados(): Promise<string | null> {
    if (!currentUser || !userEncryptionKey || !sessionToken) return null

    try {
      const response = await apiCall('dados', 'load', { token: sessionToken })
      const result = await response.json()

      if (result.success && result.dados) {
        return await decryptData(result.dados, userEncryptionKey)
      }

      return null
    } catch (error) {
      console.error('Load error:', error)
      return null
    }
  }
}
