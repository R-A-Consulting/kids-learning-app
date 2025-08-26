import { Send } from 'lucide-react'
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

export default function AIChatPanel() {
  const [messages, setMessages] = useState(() => [
    { id: 'init', role: 'assistant', text: 'Hi! I can help you brainstorm and draw. Try asking for a scene to create ✨' },
  ])
  const [draft, setDraft] = useState('')

  const scrollRef = useRef(null)
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      <div style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
        Chat
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 10, background: '#fff' }}>
        {messages.map((m) => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%',
              borderRadius: 10,
              padding: '8px 10px',
              fontSize: 14,
              lineHeight: 1.45,
              color: '#0f172a',
              background: m.role === 'user' ? '#f8fafc' : '#ffffff',
              border: '1px solid #e5e7eb',
              whiteSpace: 'pre-wrap',
            }}>
              {m.text}{(streamingMessageIdRef.current && m.id === streamingMessageIdRef.current) ? '▍' : ''}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid #f1f5f9', background: '#fff' }}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type your message..."
          style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', background: '#fff', color: '#0f172a' }}
        />
        <button type="submit" aria-label="Send" style={{ height: 34, width: 38, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: '#fff', color: '#0f172a', border: '1px solid #e5e7eb', cursor: 'pointer' }}>
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}