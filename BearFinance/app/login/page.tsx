'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, User, Eye, EyeOff, Shield, Loader2 } from 'lucide-react'
import { InstallButton } from '@/components/install-button'
import { FirebaseManager } from '@/lib/firebase'

export default function LoginPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'login' | 'cadastro'>('login')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info', text: string } | null>(null)
  
  // Form states
  const [loginData, setLoginData] = useState({ username: '', senha: '' })
  const [cadastroData, setCadastroData] = useState({ username: '', senha: '', confirmarSenha: '' })

  const showMessage = (text: string, type: 'error' | 'success' | 'info' = 'error') => {
    setMessage({ text, type })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginData.username || !loginData.senha) {
      showMessage('Preencha todos os campos', 'error')
      return
    }

    setIsLoading(true)
    try {
      await FirebaseManager.init()
      const result = await FirebaseManager.login(loginData.username, loginData.senha)
      
      if (result.success) {
        showMessage('Login realizado! Redirecionando...', 'success')
        setTimeout(() => router.push('/'), 500)
      } else {
        showMessage(result.message || 'Erro ao fazer login', 'error')
      }
    } catch (error) {
      showMessage('Erro ao conectar. Tente novamente.', 'error')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!/^[a-zA-Z0-9_]+$/.test(cadastroData.username)) {
      showMessage('Nome de usuario deve conter apenas letras, numeros e underline', 'error')
      return
    }

    if (cadastroData.username.length < 3) {
      showMessage('Nome de usuario deve ter no minimo 3 caracteres', 'error')
      return
    }

    if (cadastroData.senha !== cadastroData.confirmarSenha) {
      showMessage('As senhas nao coincidem', 'error')
      return
    }

    if (cadastroData.senha.length < 6) {
      showMessage('A senha deve ter no minimo 6 caracteres', 'error')
      return
    }

    setIsLoading(true)
    try {
      await FirebaseManager.init()
      const result = await FirebaseManager.registrar(cadastroData.username, cadastroData.senha)
      
      if (result.success) {
        showMessage(result.message || 'Conta criada com sucesso!', 'success')
        setCadastroData({ username: '', senha: '', confirmarSenha: '' })
        setActiveTab('login')
      } else {
        showMessage(result.message || 'Erro ao criar conta', 'error')
      }
    } catch (error) {
      showMessage('Erro ao conectar. Tente novamente.', 'error')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4 safe-top safe-bottom">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-lg animate-fade-in">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Gestor de Financas
            </h1>
            <p className="text-muted-foreground text-sm">
              Controle suas financas de forma simples e segura
            </p>
            
            {/* Security Badge */}
            <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-success/10 border border-success/20 rounded-full text-success text-xs font-medium">
              <Shield className="w-4 h-4" />
              Criptografia AES-256 de ponta a ponta
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border mb-6">
            <button
              onClick={() => { setActiveTab('login'); setMessage(null) }}
              className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
                activeTab === 'login' 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Entrar
              {activeTab === 'login' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => { setActiveTab('cadastro'); setMessage(null) }}
              className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
                activeTab === 'cadastro' 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Cadastrar
              {activeTab === 'cadastro' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              message.type === 'error' ? 'bg-destructive/10 text-destructive border border-destructive/20' :
              message.type === 'success' ? 'bg-success/10 text-success border border-success/20' :
              'bg-primary/10 text-primary border border-primary/20'
            }`}>
              {message.text}
            </div>
          )}

          {/* Login Form */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Nome de Usuario
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={loginData.username}
                    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                    placeholder="Seu nome de usuario"
                    className="w-full h-12 pl-11 pr-4 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginData.senha}
                    onChange={(e) => setLoginData({ ...loginData, senha: e.target.value })}
                    placeholder="Sua senha"
                    className="w-full h-12 pl-11 pr-12 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Sua senha e usada para descriptografar seus dados
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </button>
            </form>
          )}

          {/* Cadastro Form */}
          {activeTab === 'cadastro' && (
            <form onSubmit={handleCadastro} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Nome de Usuario
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={cadastroData.username}
                    onChange={(e) => setCadastroData({ ...cadastroData, username: e.target.value })}
                    placeholder="Escolha um nome de usuario"
                    pattern="[a-zA-Z0-9_]+"
                    className="w-full h-12 pl-11 pr-4 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Apenas letras, numeros e underline
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={cadastroData.senha}
                    onChange={(e) => setCadastroData({ ...cadastroData, senha: e.target.value })}
                    placeholder="Minimo 6 caracteres"
                    minLength={6}
                    className="w-full h-12 pl-11 pr-12 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Essa senha sera usada para criptografar seus dados
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="password"
                    value={cadastroData.confirmarSenha}
                    onChange={(e) => setCadastroData({ ...cadastroData, confirmarSenha: e.target.value })}
                    placeholder="Repita a senha"
                    className="w-full h-12 pl-11 pr-4 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  'Criar Conta'
                )}
              </button>
            </form>
          )}

          {/* Crypto Notice */}
          <div className="mt-6 p-4 bg-secondary rounded-lg">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Seguranca:</strong> Seus dados financeiros sao 
              criptografados com AES-256-GCM usando sua senha como chave. Nem mesmo nos podemos 
              acessar seus dados. Se voce esquecer a senha, os dados nao poderao ser recuperados.
            </p>
          </div>

          {/* Install Button */}
          <div className="mt-6">
            <InstallButton />
          </div>
        </div>
      </div>
    </main>
  )
}
