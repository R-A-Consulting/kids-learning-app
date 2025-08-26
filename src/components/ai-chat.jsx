import { Bot, Bubbles, BubblesIcon, Expand, MessageCircle, Minimize, Minimize2, ZoomIn, Send, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

function generateAssistantReply(userText) {
  const prompts = [
    "Let's draw together! I can suggest shapes, colors, or entire scenes.",
    "Great idea! I’ll sketch a plan: background, characters, then details.",
    "Tip: Use the rectangle tool to frame your scene, then add stickers.",
    "How about a sunny park with trees, a bench, and a kite in the sky?",
    "We can try a space theme: planets, stars, and a friendly astronaut!",
  ]
  const seed = Math.abs([...userText].reduce((a, c) => a + c.charCodeAt(0), 0))
  return prompts[seed % prompts.length]
}

export default function AIChatOverlay() {
  const [messages, setMessages] = useState(() => [
    { role: 'assistant', text: 'Hi! I can help you brainstorm and draw. Try asking for a scene to create ✨' },
  ])

  const [minimized, setMinimized] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const LATEST_ASSISTANT_TEXT = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'assistant') return messages[i].text
    }
    return ''
  }, [messages])

  function HANDLE_SEND(userText) {
    setMessages((prev) => [...prev, { role: 'user', text: userText }])
    const reply = generateAssistantReply(userText)
    setMessages((prev) => [...prev, { role: 'assistant', text: reply }])
    setExpanded(true)
  }

  if (minimized) return (
    <div
      className="pointer-events-auto bg-white/20 backdrop-blur-sm p-2 z-[1000] rounded-md border border-slate-100 shadow-xs fixed top-2 left-1/2 -translate-x-1/2 cursor-pointer"
      onClick={() => setMinimized(false)}
    >
      <Bot className="w-5 h-5" />
    </div>
  )

  return (
    <div className="flex flex-col gap-0.5 pointer-events-auto bg-gray-100/50 backdrop-blur-md z-[1000] rounded-md border border-slate-200 shadow-xs fixed top-2 left-1/2 -translate-x-1/2">
      {!expanded && <DockedChat latestAssistantText={LATEST_ASSISTANT_TEXT} setMinimized={setMinimized} setExpanded={setExpanded} />}
      {expanded && <ExpandedChat messages={messages} onSend={HANDLE_SEND} setMinimized={setMinimized} setExpanded={setExpanded} />}
    </div>
  )
}

function DockedChat(props) {
  const { latestAssistantText, setMinimized, setExpanded } = props

  return (
    <>
      <div className="flex items-center gap-2 p-2">
        <Bubbles className="w-5 h-5" />
        <div className="text-sm text-black-500">
          {latestAssistantText}
        </div>
      </div>

      <div className="flex items-center w-full justify-between gap-1 text-sm text-slate-500 cursor-pointer">
        <div className="flex items-center gap-1 p-2" onClick={() => setExpanded(true)}>
          <MessageCircle className="w-4 h-4" />
          Chat
        </div>
        <div className="flex items-center gap-1 p-2" onClick={() => setMinimized(true)}>
          <Minimize2 className="w-4 h-4" />
        </div>
      </div>
    </>
  )
}

function ExpandedChat(props) {
  const { messages, onSend, setMinimized, setExpanded } = props

  const [draft, setDraft] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  function handleSubmit(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    onSend?.(text)
    setDraft('')
  }

  return (
    <div className='h-[50vh] flex flex-col'>
      <div className="flex items-center justify-between p-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Bubbles className="w-5 h-5" />
          <div className="text-sm text-slate-700 font-medium">Chat</div>
        </div>
        <div className="flex items-center gap-1 text-slate-500">
          <button className="p-1 hover:text-slate-700" title="Dock" onClick={() => setExpanded(false)}>
            <Minimize className="w-4 h-4" />
          </button>
          <button className="p-1 hover:text-red-600" title="Hide" onClick={() => { setMinimized(true); setExpanded(false) }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex flex-col gap-1 p-2 max-h-[45vh] overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-md px-2 py-1 text-sm ${m.role === 'user' ? 'bg-sky-500 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2 border-t border-slate-200 mt-auto">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 px-2 py-1 rounded-md border border-slate-200 bg-white/80 text-sm placeholder-slate-400 outline-none focus:ring-1 focus:ring-slate-300"
        />
        <button type="submit" className="flex items-center gap-1 px-2 py-1 rounded-md bg-sky-500 text-white text-sm hover:bg-sky-600 active:bg-sky-700">
          <Send className="w-4 h-4" />
          Send
        </button>
      </form>
    </div>
  )
}