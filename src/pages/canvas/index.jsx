import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import AIChatPanel from '../../components/ai-chat.jsx'
import { useParams } from 'react-router-dom'

export default function TldrawApp() {
  const { id } = useParams()

  // For now, just log the ID to verify it's working
  console.log('Canvas ID:', id)
  function handleDockChange({ side, width }) {
    // This component doesn't need to re-render; we style via DOM to avoid layout thrash.
    // But we'll still keep this here in case we want stateful layout later.
    const container = document.getElementById('canvas-container')
    if (!container) return
    if (!side) {
      container.style.marginLeft = '0px'
      container.style.marginRight = '0px'
      container.style.width = 'auto'
      window.dispatchEvent(new Event('resize'))
      return
    }
    const gutter = 0
    if (side === 'left') {
      container.style.marginLeft = `${(width || 400) + gutter}px`
      container.style.marginRight = '0px'
      container.style.width = 'auto'
    } else if (side === 'right') {
      container.style.marginRight = `${(width || 400) + gutter}px`
      container.style.marginLeft = '0px'
      container.style.width = 'auto'
    }
    window.dispatchEvent(new Event('resize'))
  }
  return (
    <div className="h-screen w-screen flex flex-row bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200">
      <div id="canvas-container" className="flex-[1_1_0%] min-w-0 transition-[margin] duration-200 ease-[cubic-bezier(.2,.8,.2,1)]">
        <div className="h-full w-full bg-white shadow-inner rounded-none">
          <Tldraw />
        </div>
      </div>
      <AIChatPanel onDockChange={handleDockChange} />
    </div>
  )
}


