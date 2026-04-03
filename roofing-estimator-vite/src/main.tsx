import { createRoot } from 'react-dom/client'
import './index.css'
import App from './AppRouter.tsx'
import { syncArcgisApiKeyFromEnvToOrgIfNeeded } from './lib/orgSettings'

syncArcgisApiKeyFromEnvToOrgIfNeeded()

createRoot(document.getElementById('root')!).render(<App />)
