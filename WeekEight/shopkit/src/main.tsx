import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Site from './site/Site.tsx'
//import App from './App.tsx'
//import Greeting from './components/Greetings.tsx'
//import Header from './components/Header.tsx'
import Hero from './components/Hero.tsx'
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Site />
  </StrictMode>,
)
