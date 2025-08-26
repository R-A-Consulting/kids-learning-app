import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import AIChatPanel from '../../components/ai-chat.jsx'

export default function TldrawApp() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'row' }}>
      <div style={{ width: 400, borderRight: '1px solid #f1f5f9', background: '#ffffff' }}>
        <AIChatPanel />
      </div>
      <div style={{ flex: '1 1 0%', minWidth: 0 }}>
        <Tldraw />
      </div>
    </div>
  )
}


