import { useMemo } from 'react'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import AIChatOverlay from '../../components/ai-chat.jsx'

export default function TldrawApp() {
  const components = useMemo(() => ({
    TopPanel: () => <AIChatOverlay />,
  }), [])

  return (
    <div style={{height:'100%'}}>
      <Tldraw components={components} />
    </div>
  )
}


