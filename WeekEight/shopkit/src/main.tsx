import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import EngineAtlas from './engine/EngineAtlas.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EngineAtlas />
  </StrictMode>,
)