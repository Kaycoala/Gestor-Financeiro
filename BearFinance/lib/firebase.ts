/**
 * Firebase Manager - Firebase Auth + Firestore
 * Sistema completo de autenticacao e criptografia de dados
 */

import { initializeApp, getApps } from 'firebase/app'
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth'
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from 'firebase/firestore'

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAUdxfRrw1D6hYi_iG8DYCFIj5jQEh2TVw",
  authDomain: "gestor-financa.firebaseapp.com",
  projectId: "gestor-financa",
  storageBucket: "gestor-financa.firebasestorage.app",
  messagingSenderId: "132905908850",
  appId: "1:132905908850:web:da487fdbfb6f69c116e0eb"
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const auth = getAuth(app)
const db = getFirestore(app)

// Global state
let currentUser: { uid: string; username: string } | null = null
let userEncryptionKey: CryptoKey | null = null
const SESSION_KEY = 'gante_session'

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

// Helper to convert username to email format for Firebase Auth
function usernameToEmail(username: string): string {
  return `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@gestorfinanca.app`
}

// ========================================
// FIREBASE MANAGER
// ========================================

export const FirebaseManager = {
  async init(): Promise<{ uid: string; username: string } | null> {
    return new Promise((resolve) => {
      // Check for saved session first
      if (typeof window !== 'undefined') {
        const savedSession = localStorage.getItem(SESSION_KEY)
        if (savedSession) {
          try {
            const sessionData = JSON.parse(savedSession)
            // We have saved session data, wait for Firebase auth state
            const unsubscribe = onAuthStateChanged(auth, async (user) => {
              unsubscribe()
              if (user) {
                currentUser = {
                  uid: user.uid,
                  username: sessionData.username || user.email?.split('@')[0] || 'Usuario'
                }
                
                // Restore encryption key if we have the password stored
                if (sessionData.keyData) {
                  userEncryptionKey = await deriveEncryptionKey(sessionData.keyData, user.uid)
                }
                
                resolve(currentUser)
              } else {
                localStorage.removeItem(SESSION_KEY)
                resolve(null)
              }
            })
          } catch {
            localStorage.removeItem(SESSION_KEY)
            resolve(null)
          }
        } else {
          // No saved session, check current auth state
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe()
            if (user) {
              currentUser = {
                uid: user.uid,
                username: user.email?.split('@')[0] || 'Usuario'
              }
              resolve(currentUser)
            } else {
              resolve(null)
            }
          })
        }
      } else {
        resolve(null)
      }
    })
  },

  async registrar(username: string, senha: string): Promise<{ success: boolean; message: string }> {
    try {
      const email = usernameToEmail(username)
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, senha)
      const user = userCredential.user
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        username: username,
        createdAt: new Date().toISOString()
      })
      
      return { success: true, message: 'Conta criada com sucesso!' }
    } catch (error: unknown) {
      console.error('Registration error:', error)
      
      const firebaseError = error as { code?: string }
      if (firebaseError.code === 'auth/email-already-in-use') {
        return { success: false, message: 'Este usuario ja existe.' }
      }
      if (firebaseError.code === 'auth/weak-password') {
        return { success: false, message: 'A senha deve ter pelo menos 6 caracteres.' }
      }
      
      return { success: false, message: 'Erro ao criar conta. Tente novamente.' }
    }
  },

  async login(username: string, senha: string): Promise<{ success: boolean; message?: string; user?: typeof currentUser }> {
    try {
      const email = usernameToEmail(username)
      
      const userCredential = await signInWithEmailAndPassword(auth, email, senha)
      const user = userCredential.user
      
      // Get username from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      const userData = userDoc.data()
      
      currentUser = {
        uid: user.uid,
        username: userData?.username || username
      }

      // Derive encryption key from password
      userEncryptionKey = await deriveEncryptionKey(senha, user.uid)

      // Save session
      if (typeof window !== 'undefined') {
        localStorage.setItem(SESSION_KEY, JSON.stringify({
          uid: user.uid,
          username: currentUser.username,
          keyData: senha
        }))
      }

      return { success: true, user: currentUser }
    } catch (error: unknown) {
      console.error('Login error:', error)
      
      const firebaseError = error as { code?: string }
      if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/invalid-credential') {
        return { success: false, message: 'Usuario ou senha incorretos.' }
      }
      if (firebaseError.code === 'auth/wrong-password') {
        return { success: false, message: 'Senha incorreta.' }
      }
      
      return { success: false, message: 'Erro ao fazer login. Tente novamente.' }
    }
  },

  async logout(): Promise<void> {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Logout error:', error)
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY)
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
    if (!currentUser || !userEncryptionKey) return false

    try {
      const dadosCriptografados = await encryptData(dadosXML, userEncryptionKey)
      if (!dadosCriptografados) return false

      await setDoc(doc(db, 'userData', currentUser.uid), {
        dados: dadosCriptografados,
        updatedAt: new Date().toISOString()
      })
      
      return true
    } catch (error) {
      console.error('Save error:', error)
      return false
    }
  },

  async carregarDados(): Promise<string | null> {
    if (!currentUser || !userEncryptionKey) return null

    try {
      const docRef = doc(db, 'userData', currentUser.uid)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists() && docSnap.data().dados) {
        return await decryptData(docSnap.data().dados, userEncryptionKey)
      }

      return null
    } catch (error) {
      console.error('Load error:', error)
      return null
    }
  }
}
