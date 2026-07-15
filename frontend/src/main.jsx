import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Standard Leaflet stylesheet import. Vital to render markers and maps grids correctly.
import 'leaflet/dist/leaflet.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
