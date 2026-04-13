import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Habilitar export estatico para hospedagem na Hostinger
  output: 'export',
  // Desabilitar otimizacao de imagens para export estatico
  images: {
    unoptimized: true
  },
  // Trailing slash para compatibilidade com .htaccess
  trailingSlash: false,
}

export default nextConfig
