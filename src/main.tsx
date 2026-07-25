import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RootApp } from './RootApp'
import './styles/fonts.css'
import './styles/tokens.css'
import './styles/global.css'
import './styles/pixel.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Missing application root')
}

createRoot(root).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
)
