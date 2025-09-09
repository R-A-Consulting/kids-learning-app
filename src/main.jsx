import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { GlobalProvider } from './services/contexts/global-context'
import './global.css'
import Layout from './layout.jsx'

const root = createRoot(document.getElementById('root'));
root.render(
  <GlobalProvider>
    <BrowserRouter>
      <Layout />
      <Toaster />
    </BrowserRouter>
  </GlobalProvider>
);
