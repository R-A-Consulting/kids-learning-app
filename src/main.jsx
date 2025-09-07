import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import './global.css'
import Layout from './layout.jsx'

const root = createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <Layout />
    <Toaster />
  </BrowserRouter>
);
