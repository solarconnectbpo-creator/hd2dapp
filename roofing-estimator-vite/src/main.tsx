import "./canonicalRedirect";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from './AppRouter.tsx'

createRoot(document.getElementById('root')!).render(<App />)
