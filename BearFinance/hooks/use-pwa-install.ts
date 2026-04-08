'use client'

import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches
      const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
      setIsStandalone(standalone || iosStandalone)
      setIsInstalled(standalone || iosStandalone)
    }
    
    checkInstalled()

    // Check if iOS
    const ua = window.navigator.userAgent
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream
    setIsIOS(isIOSDevice)

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const install = useCallback(async () => {
    if (!installPrompt) return false
    
    try {
      await installPrompt.prompt()
      const result = await installPrompt.userChoice
      
      if (result.outcome === 'accepted') {
        setIsInstalled(true)
        setInstallPrompt(null)
        return true
      }
    } catch (error) {
      console.error('Error installing PWA:', error)
    }
    
    return false
  }, [installPrompt])

  return {
    canInstall: !!installPrompt && !isInstalled,
    isInstalled,
    isIOS,
    isStandalone,
    install
  }
}
