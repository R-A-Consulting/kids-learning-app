import CustomTldraw from './custom-tl-draw'
import AIChatPanel from '../../components/canvas-chat'
import { useParams } from 'react-router-dom'
import { useState } from 'react'

export default function TldrawApp() {
  const { id: sessionId } = useParams()
  const [canvasToImage, setCanvasToImage] = useState(null)

  return (
    <div className="h-screen w-screen flex flex-row bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200">
      <AIChatPanel
        onDockChange={handleDockChange}
        sessionId={sessionId}
        canvasImage={canvasToImage}
      />
      <CustomTldraw
        sessionId={sessionId}
        onCanvasImageUpdate={setCanvasToImage}
      />
    </div>
  )
}

function handleDockChange({ side, width }) {
  const c = document.getElementById('canvas-container')
  if (!c) return
  c.style.marginLeft = c.style.marginRight = '0px'
  c.style.width = 'auto'
  if (side === 'left') c.style.marginLeft = `${width || 400}px`
  else if (side === 'right') c.style.marginRight = `${width || 400}px`
  window.dispatchEvent(new Event('resize'))
}