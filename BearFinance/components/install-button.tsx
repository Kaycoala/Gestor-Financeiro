'use client'

import { Download, Smartphone, Share, Plus } from 'lucide-react'
import { usePWAInstall } from '@/hooks/use-pwa-install'
import { useState } from 'react'

export function InstallButton() {
  const { canInstall, isInstalled, isIOS, isStandalone, install } = usePWAInstall()
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  // Already running as installed app
  if (isStandalone || isInstalled) {
    return null
  }

  // iOS device - show instructions
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="w-full flex items-center justify-center gap-3 h-12 bg-card border border-border text-foreground font-medium rounded-lg hover:bg-secondary transition-colors"
        >
          <Download className="w-5 h-5" />
          Instalar Aplicativo
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-card w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                Instalar no iOS
              </h3>
              
              <div className="space-y-4 text-muted-foreground">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-semibold">
                    1
                  </div>
                  <p>
                    Toque no botao <Share className="w-4 h-4 inline mx-1" /> <strong>Compartilhar</strong> na barra do Safari
                  </p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-semibold">
                    2
                  </div>
                  <p>
                    Role para baixo e toque em <Plus className="w-4 h-4 inline mx-1" /> <strong>Adicionar a Tela de Inicio</strong>
                  </p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-semibold">
                    3
                  </div>
                  <p>
                    Toque em <strong>Adicionar</strong> no canto superior direito
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full mt-6 h-12 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  // Android/Desktop - show install button
  if (canInstall) {
    return (
      <button
        onClick={install}
        className="w-full flex items-center justify-center gap-3 h-12 bg-card border border-border text-foreground font-medium rounded-lg hover:bg-secondary transition-colors"
      >
        <Download className="w-5 h-5" />
        Instalar Aplicativo
      </button>
    )
  }

  return null
}
