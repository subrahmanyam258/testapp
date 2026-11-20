import React from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor, SystemBars, SystemBarsStyle, SystemBarType } from '@capacitor/core'
import '@fontsource-variable/plus-jakarta-sans'
import './styles.css'
import App from './App'

const native = Capacitor.isNativePlatform()
if (native) {
  // Teal headers -> light status-bar icons; white bottom nav -> dark gesture-bar icons
  SystemBars.setStyle({ style: SystemBarsStyle.Dark, bar: SystemBarType.StatusBar }).catch(() => {})
  SystemBars.setStyle({ style: SystemBarsStyle.Light, bar: SystemBarType.NavigationBar }).catch(() => {})
}

createRoot(document.getElementById('root')).render(<App />)

if (!native && 'serviceWorker' in navigator && import.meta.env.PROD && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}))
}
