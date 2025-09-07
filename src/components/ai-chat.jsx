import { Send, GripVertical, ChevronsLeft, ChevronsRight, Move, GripHorizontal, PanelLeft, PanelRight, PanelLeftClose, PanelRightClose, PanelTopDashed } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

function generateAssistantReply(userText) {
  const prompts = [
    "Let's draw together! I can suggest shapes, colors, or entire scenes.",
    "Great idea! I’ll sketch a plan: background, characters, then details.",
    "Tip: Use the rectangle tool to frame your scene, then add stickers.",
    "How about a sunny park with trees, a bench, and a kite in the sky?",
    "We can try a space theme: planets, stars, and a friendly astronaut!",
  ]
  const seed = Math.abs([...userText].reduce((acc, char) => acc + char.charCodeAt(0), 0))
  return prompts[seed % prompts.length]
}

export default function AIChatPanel(props) {
  const { onDockChange } = props || {}
  const [messages, setMessages] = useState(() => [
    { id: 'init', role: 'assistant', text: 'Hi! I can help you brainstorm and draw. Try asking for a scene to create ✨' },
  ])
  const [draft, setDraft] = useState('')
  const [panelPos, setPanelPos] = useState({ x: 16, y: 16 })
  const [dragging, setDragging] = useState(false)
  const [snapCorner, setSnapCorner] = useState(null) // 'tl' | 'tr' | 'bl' | 'br' | null
  const [lastFloatPos, setLastFloatPos] = useState({ x: 16, y: 16 })

  const scrollRef = useRef(null)
  const panelRef = useRef(null)
  const streamTimerRef = useRef(null)
  const streamingMessageIdRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current)
    }
  }, [])

  useEffect(() => {
    // Set initial position near top-right
    if (typeof window !== 'undefined') {
      const width = 400
      const margin = 16
      const x = Math.max(margin, window.innerWidth - width - margin)
      const y = margin
      setPanelPos({ x, y })
    }
  }, [])

  useEffect(() => {
    // After mount, re-measure and align near top-right as floating (not docked)
    const id = requestAnimationFrame(() => {
      if (typeof window === 'undefined') return
      const margin = 16
      const panelWidth = panelRef.current?.offsetWidth ?? 400
      setPanelPos({ x: Math.max(margin, window.innerWidth - panelWidth - margin), y: margin })
    })
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    function handleResize() {
      if (typeof window === 'undefined') return
      const dockMargin = 0
      const floatMargin = 0
      const panelWidth = panelRef.current?.offsetWidth ?? 400
      const panelHeight = panelRef.current?.offsetHeight ?? Math.round(window.innerHeight * 0.6)
      if (snapCorner === 'tl') setPanelPos({ x: dockMargin, y: dockMargin })
      if (snapCorner === 'tr') setPanelPos({ x: Math.max(dockMargin, window.innerWidth - panelWidth - dockMargin), y: dockMargin })
      if (snapCorner === 'bl') setPanelPos({ x: dockMargin, y: Math.max(dockMargin, window.innerHeight - panelHeight - dockMargin) })
      if (snapCorner === 'br') setPanelPos({ x: Math.max(dockMargin, window.innerWidth - panelWidth - dockMargin), y: Math.max(dockMargin, window.innerHeight - panelHeight - dockMargin) })
      if (!snapCorner) {
        // If free-floating, just clamp into view
        setPanelPos((prev) => {
          const clampedX = Math.min(Math.max(floatMargin, prev.x), Math.max(floatMargin, window.innerWidth - panelWidth - floatMargin))
          const clampedY = Math.min(Math.max(floatMargin, prev.y), Math.max(floatMargin, window.innerHeight - panelHeight - floatMargin))
          return { x: clampedX, y: clampedY }
        })
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [snapCorner])

  function handleSend(e) {
    e?.preventDefault?.()
    const text = draft.trim()
    if (!text) return
    setDraft('')

    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()) + 'u', role: 'user', text },
    ])

    const fullReply = generateAssistantReply(text)
    startStreamingAssistant(fullReply)
  }

  function startStreamingAssistant(fullText) {
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current)
      streamTimerRef.current = null
    }

    const id = String(Date.now()) + Math.random().toString(16).slice(2)
    streamingMessageIdRef.current = id

    setMessages((prev) => [
      ...prev,
      { id, role: 'assistant', text: '' },
    ])

    let i = 0
    streamTimerRef.current = setInterval(() => {
      i += Math.max(1, Math.floor(Math.random() * 3))
      if (i >= fullText.length) i = fullText.length

      setMessages((prev) => prev.map((m) => (
        m.id === id ? { ...m, text: fullText.slice(0, i) } : m
      )))

      if (i >= fullText.length) {
        clearInterval(streamTimerRef.current)
        streamTimerRef.current = null
        streamingMessageIdRef.current = null
      }
    }, 20)
  }

  function handleDragStart(e) {
    e.preventDefault()
    const rect = panelRef.current?.getBoundingClientRect?.()
    const offsetX = rect ? (e.clientX - rect.left) : 12
    const offsetY = rect ? (e.clientY - rect.top) : 12
    if (rect) {
      // Ensure floating starts from current screen position without jumping
      setPanelPos({ x: rect.left, y: rect.top })
      setLastFloatPos({ x: rect.left, y: rect.top })
    }
    setDragging(true)
    setSnapCorner(null)

    function onMove(ev) {
      const floatMargin = 0
      const panelWidth = panelRef.current?.offsetWidth ?? 400
      const panelHeight = panelRef.current?.offsetHeight ?? Math.round(window.innerHeight * 0.6)
      const rawX = ev.clientX - offsetX
      const rawY = ev.clientY - offsetY
      const clampedX = Math.min(Math.max(floatMargin, rawX), Math.max(floatMargin, window.innerWidth - panelWidth - floatMargin))
      const clampedY = Math.min(Math.max(floatMargin, rawY), Math.max(floatMargin, window.innerHeight - panelHeight - floatMargin))
      setPanelPos({ x: clampedX, y: clampedY })
      setLastFloatPos({ x: clampedX, y: clampedY })
    }

    function cleanup() {
      setDragging(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('blur', onCancel)
    }

    function onUp() {
      cleanup()

      // Snap to a corner only if close to both corresponding edges
      const panelWidth = panelRef.current?.offsetWidth ?? 400
      const panelHeight = panelRef.current?.offsetHeight ?? Math.round(window.innerHeight * 0.6)
      const distLeft = Math.abs(panelPos.x - 0)
      const distRight = Math.abs((window.innerWidth - panelWidth) - panelPos.x)
      const distTop = Math.abs(panelPos.y - 0)
      const distBottom = Math.abs((window.innerHeight - panelHeight) - panelPos.y)
      const THRESH = 4
      const candidates = []
      if (distLeft <= THRESH && distTop <= THRESH) candidates.push({ key: 'tl', score: Math.max(distLeft, distTop), pt: { x: 0, y: 0 } })
      if (distRight <= THRESH && distTop <= THRESH) candidates.push({ key: 'tr', score: Math.max(distRight, distTop), pt: { x: window.innerWidth - panelWidth, y: 0 } })
      if (distLeft <= THRESH && distBottom <= THRESH) candidates.push({ key: 'bl', score: Math.max(distLeft, distBottom), pt: { x: 0, y: window.innerHeight - panelHeight } })
      if (distRight <= THRESH && distBottom <= THRESH) candidates.push({ key: 'br', score: Math.max(distRight, distBottom), pt: { x: window.innerWidth - panelWidth, y: window.innerHeight - panelHeight } })
      candidates.sort((a, b) => a.score - b.score)
      if (candidates.length > 0) {
        const best = candidates[0]
        setPanelPos(best.pt)
        setSnapCorner(best.key)
      } else {
        setSnapCorner(null)
      }
    }

    function onCancel() {
      cleanup()
      setSnapCorner(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('blur', onCancel)
  }

  // Notify parent of docked state changes
  useEffect(() => {
    if (!onDockChange) return
    const side = snapCorner === 'tl' || snapCorner === 'bl' ? 'left' : snapCorner === 'tr' || snapCorner === 'br' ? 'right' : null
    const width = panelRef.current?.offsetWidth ?? 400
    onDockChange({ side, width })
  }, [snapCorner, onDockChange])

  const isDocked = Boolean(snapCorner)
  const containerClasses = [
    'fixed z-[1000] flex flex-col border border-white/30 bg-white/80 backdrop-blur-xl',
    isDocked ? 'rounded-none' : 'rounded-2xl',
    'shadow-[0_16px_40px_rgba(0,0,0,0.14),_0_6px_18px_rgba(0,0,0,0.08)]',
    dragging ? 'transition-none' : 'transition-[left,right,top,bottom] duration-200 ease-[cubic-bezier(.2,.8,.2,1)]',
    'w-[400px] max-w-[92vw]',
    isDocked ? 'inset-y-0' : 'h-[60vh] max-h-[80vh]'
  ].join(' ')
  const containerStyle = isDocked
    ? (snapCorner === 'tl' || snapCorner === 'bl'
      ? { left: 0, right: 'auto', top: 0, bottom: 0 }
      : { right: 0, left: 'auto', top: 0, bottom: 0 })
    : { left: panelPos.x, top: panelPos.y, borderRadius: '16px' }

  return (
    <div ref={panelRef} className={containerClasses} style={containerStyle}>
      <div className="flex items-center px-2 py-2 select-none text-white bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500">
        <label className="text-sm font-semibold drop-shadow">Chat</label>
        {/* {!isDocked && (
          <button aria-label="Dock left" onClick={(e) => { e.preventDefault(); setLastFloatPos(panelPos); setSnapCorner('tl'); setPanelPos({ x: 0, y: 0 }) }} title="Dock left" className="inline-flex items-center justify-center h-6 w-6 rounded-md border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100">
            <ChevronsLeft size={14} />
          </button>
        )} */}

        {!isDocked && (
          <div className="flex-1 flex justify-center">
            <button aria-label="Drag chat" onPointerDown={handleDragStart} title="Drag" className={`inline-flex items-center justify-center h-7 w-7 rounded-md border border-white/30 bg-white/10 text-white ${dragging ? 'cursor-grabbing' : 'cursor-grab'} hover:bg-white/20 active:bg-white/25`}>
              <GripHorizontal size={14} />
            </button>
          </div>
        )}

        {!isDocked && (
          <div className="flex gap-1">
            <button aria-label="Dock left" onClick={(e) => { e.preventDefault(); setLastFloatPos(panelPos); setSnapCorner('tl'); setPanelPos({ x: 0, y: 0 }) }} title="Dock left" className="inline-flex items-center justify-center h-6 w-6 rounded-md border border-white/40 bg-white/10 text-white hover:bg-white/20 active:bg-white/25">
              <PanelLeftClose size={14} />
            </button>
            <button aria-label="Dock right" onClick={(e) => { e.preventDefault(); setLastFloatPos(panelPos); const w = panelRef.current?.offsetWidth ?? 400; setSnapCorner('tr'); setPanelPos({ x: Math.max(0, window.innerWidth - w), y: 0 }) }} title="Dock right" className="inline-flex items-center justify-center h-6 w-6 rounded-md border border-white/40 bg-white/10 text-white hover:bg-white/20 active:bg-white/25">
              <PanelRightClose size={14} />
            </button>
          </div>
        )}

        {isDocked && (
          <div className="ml-auto inline-flex gap-1.5">
            {(snapCorner === 'tl' || snapCorner === 'bl') ? (
              <button aria-label="Dock right" onClick={(e) => { e.preventDefault(); const w = panelRef.current?.offsetWidth ?? 400; setSnapCorner('tr'); setPanelPos({ x: Math.max(0, window.innerWidth - w), y: 0 }) }} title="Dock right" className="inline-flex items-center justify-center h-6 w-6 rounded-md border border-white/40 bg-white/10 text-white hover:bg-white/20 active:bg-white/25">
                <PanelRightClose size={14} />
              </button>
            ) : (
              <button aria-label="Dock left" onClick={(e) => { e.preventDefault(); setSnapCorner('tl'); setPanelPos({ x: 0, y: 0 }) }} title="Dock left" className="inline-flex items-center justify-center h-6 w-6 rounded-md border border-white/40 bg-white/10 text-white hover:bg-white/20 active:bg-white/25">
                <PanelLeftClose size={14} />
              </button>
            )}
            <button aria-label="Float" onClick={(e) => { e.preventDefault(); const w = panelRef.current?.offsetWidth ?? 400; const h = panelRef.current?.offsetHeight ?? Math.round(window.innerHeight * 0.6); const x = Math.min(Math.max(0, lastFloatPos.x), Math.max(0, window.innerWidth - w)); const y = Math.min(Math.max(0, lastFloatPos.y), Math.max(0, window.innerHeight - h)); setSnapCorner(null); setPanelPos({ x, y }) }} title="Float" className="inline-flex items-center justify-center h-6 w-6 rounded-md border border-white/40 bg-white/10 text-white hover:bg-white/20 active:bg-white/25">
              <PanelTopDashed size={14} />
            </button>
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 flex flex-col gap-2 bg-gradient-to-b from-white/80 to-white/50">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg px-2 py-1 text-sm whitespace-pre-wrap shadow ${m.role === 'user' ? 'bg-gradient-to-br from-cyan-500 via-emerald-500 to-teal-500 text-white border-0' : 'bg-white/80 text-slate-900 border border-white/50 backdrop-blur-sm'}`}>
              {m.text}{(streamingMessageIdRef.current && m.id === streamingMessageIdRef.current) ? '▍' : ''}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 p-2 border-t border-white/20 bg-white/80 backdrop-blur">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 px-2 py-1 rounded-md border border-slate-200 bg-white text-sm placeholder-slate-400 outline-none focus:ring-2 focus:ring-cyan-400"
        />
        <button type="submit" aria-label="Send" className="inline-flex items-center justify-center h-[34px] w-[38px] rounded-md border-0 bg-gradient-to-br from-cyan-500 to-emerald-500 text-white hover:brightness-110 active:brightness-105">
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}