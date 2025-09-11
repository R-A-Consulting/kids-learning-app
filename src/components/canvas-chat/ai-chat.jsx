import { Send, Maximize2, Minimize2, Paperclip, X, Sparkles, Loader2, Image } from 'lucide-react'
import { useEffect, useRef, useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useCreateStreamingMessage } from '@/services/apis/chat/useStreamingMessage'
import { useGetSessionMessages } from '@/services/apis/chat/useGetSessionMessages'
import { GlobalContext } from '@/services/contexts/global-context'
import { motion, AnimatePresence } from 'framer-motion'

// Shimmer phrases for AI thinking state
const LOADING_PHRASES = [
  'Thinking…',
  'Solving…',
  'Analyzing context…',
  'Exploring ideas…',
  'Drafting a reply…',
  'Reading the canvas…',
  'Gathering thoughts…',
]

export default function AiChat({
  isMinimized,
  setIsMinimized,
  handleMouseDown,
  sessionId,
  captureCanvas,
  dockedPosition
}) {
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const streamingMessageIdRef = useRef(null)
  
  const { user } = GlobalContext()
  const { createStreamingMessage, isStreaming: apiStreaming } = useCreateStreamingMessage()
  const { messages: apiMessages, isLoading: messagesLoading, getSessionMessages } = useGetSessionMessages()
  
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [currentStreamId, setCurrentStreamId] = useState(null)
  const [includeCanvas, setIncludeCanvas] = useState(true)
  const [streamingStatusById, setStreamingStatusById] = useState({})
  
  // Load messages when session changes
  useEffect(() => {
    if (sessionId && sessionId !== 'new') {
      getSessionMessages(sessionId)
    }
  }, [sessionId, getSessionMessages])
  
  // Update messages when API messages change
  useEffect(() => {
    if (apiMessages && apiMessages.length > 0 && !messagesLoading) {
      const formattedMessages = apiMessages
        .filter(msg => msg.messageType === 'user' || msg.messageType === 'ai')
        .map(msg => ({
          id: msg._id || msg.id,
          role: msg.messageType === 'user' ? 'user' : 'assistant',
          text: msg.message || '',
          attachments: msg.attachmentsWithUrls || []
        }));
      setMessages(formattedMessages);
    } else if (!messagesLoading && (!apiMessages || apiMessages.length === 0)) {
      // Don't show initial message for new sessions, show empty state instead
      setMessages([]);
    }
  }, [apiMessages, messagesLoading])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isMinimized])

  // Handle file selection
  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files || [])
    if (selectedFiles.length + files.length > 5) {
      alert('You can only upload up to 5 files')
      return
    }
    setSelectedFiles(prev => [...prev, ...files].slice(0, 5))
  }, [selectedFiles])

  // Remove selected file
  const removeFile = useCallback((index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Handle sending messages
  const handleSend = useCallback(async (e) => {
    e?.preventDefault()
    const text = draft.trim()
    if (!text || streamingMessageIdRef.current || !sessionId) return
    
    setDraft('')
    setSelectedFiles([])
    
    // Add user message immediately
    const userMessage = { 
      id: `user-${Date.now()}`, 
      role: 'user', 
      text 
    }
    setMessages(prev => [...prev, userMessage])

    // Create FormData
    const formData = new FormData()
    formData.append('session', sessionId)
    formData.append('user', user?._id || user?.id || '')
    formData.append('message', text)
    formData.append('messageType', 'user')
    formData.append('language', 'english')
    
    // Add files if any
    selectedFiles.forEach((file, index) => {
      formData.append('files', file)
    })
    
    // Capture canvas if checkbox is marked
    if (includeCanvas && captureCanvas) {
      try {
        const canvasBlob = await captureCanvas()
        if (canvasBlob) {
          formData.append('files', canvasBlob, 'canvas-context.png')
        }
      } catch (err) {
        console.error('Failed to capture canvas:', err)
      }
    }

    // Create assistant message placeholder
    const assistantId = `assistant-${Date.now()}`
    streamingMessageIdRef.current = assistantId
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', text: '', isStreaming: true }])
    setStreamingStatusById(prev => ({
      ...prev,
      [assistantId]: LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)],
    }))

    // Start streaming
    try {
      const result = await createStreamingMessage(formData, (chunkData, accumulated) => {
        if (chunkData.eventType === 'connected' && chunkData.streamId) {
          setCurrentStreamId(chunkData.streamId)
        }
        
        if (chunkData.eventType === 'chunk' || chunkData.eventType === 'complete') {
          setMessages(prev => prev.map(m => 
            m.id === assistantId ? { ...m, text: accumulated, isStreaming: chunkData.eventType !== 'complete' } : m
          ))
        }

        if (chunkData.eventType === 'complete') {
          streamingMessageIdRef.current = null
          setCurrentStreamId(null)
        }
      })

      if (!result.success) {
        setMessages(prev => prev.map(m => 
          m.id === assistantId ? { ...m, text: 'Sorry, I encountered an error. Please try again.', isStreaming: false } : m
        ))
      }
    } catch (error) {
      console.error('Streaming error:', error)
      setMessages(prev => prev.map(m => 
        m.id === assistantId ? { ...m, text: 'Sorry, I encountered an error. Please try again.', isStreaming: false } : m
      ))
    } finally {
      streamingMessageIdRef.current = null
      setCurrentStreamId(null)
    }
  }, [draft, setDraft, setMessages, streamingMessageIdRef, sessionId, user, selectedFiles, createStreamingMessage])

  // Focus input when expanded
  useEffect(() => {
    if (!isMinimized && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isMinimized])

  const isStreaming = Boolean(streamingMessageIdRef.current) || apiStreaming

  return (
    <>
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 border-b border-gray-100 py-2",
          "select-none cursor-move bg-white"
        )}
        onMouseDown={handleMouseDown}
        onClick={() => isMinimized && setIsMinimized(false)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-3 w-3 text-gray-600" />
          <span className="font-medium text-gray-700 text-xs">Learning Buddy</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 hover:bg-gray-100"
          onClick={(e) => {
            e.stopPropagation()
            setIsMinimized(!isMinimized)
          }}
          hidden={dockedPosition !== 'floating'}
        >
          {isMinimized && dockedPosition === 'floating' ? <Maximize2 size={12} /> : <Minimize2 size={10} />}
        </Button>
      </div>

      {/* Messages area */}
      {!isMinimized && (
        <>
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 bg-white scrollbar-hide"
          >
            {/* Loading state */}
            {messagesLoading && (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin mb-3" />
                <p className="text-sm">Loading messages...</p>
              </div>
            )}
            
            {/* Empty state */}
            {!messagesLoading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 px-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-800 text-lg mb-2">Welcome to AI Assistant</h3>
                <p className="text-center text-sm text-gray-600 mb-6">
                  I'm here to help you learn and explore. Ask me anything!
                </p>
                <div className="space-y-2 w-full">
                  <p className="text-xs font-medium text-gray-500 mb-2">Try asking:</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setDraft("Help me understand photosynthesis");
                        inputRef.current?.focus();
                      }}
                      className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      💡 "Help me understand photosynthesis"
                    </button>
                    <button
                      onClick={() => {
                        setDraft("What's 15 × 24?");
                        inputRef.current?.focus();
                      }}
                      className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      🔢 "What's 15 × 24?"
                    </button>
                    <button
                      onClick={() => {
                        setDraft("Tell me a fun fact about space");
                        inputRef.current?.focus();
                      }}
                      className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      🚀 "Tell me a fun fact about space"
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Messages */}
            {!messagesLoading && messages.length > 0 && (
              <div className="space-y-4">
                <AnimatePresence initial={false}>
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className={cn(
                        "flex",
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <motion.div
                        className={cn(
                          "max-w-[80%] rounded-lg px-4 py-2 text-xs",
                          message.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-gray-700 px-0 max-w-[90%]'
                        )}
                        initial={message.role === 'assistant' && index === messages.length - 1 ? { scale: 0.95 } : {}}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.1 }}
                      >
                        {/* Shimmer phrase for empty streaming messages */}
                        {message.role === 'assistant' && message.text === '' && streamingMessageIdRef.current === message.id ? (
                          <div className="py-1">
                            <motion.span
                              className="bg-gradient-to-r from-gray-400 via-gray-700 to-gray-400 bg-clip-text text-transparent select-none"
                              animate={{ backgroundPositionX: ['0%', '200%'] }}
                              transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                              style={{ backgroundSize: '200% 100%' }}
                            >
                              {streamingStatusById[message.id] || 'Thinking…'}
                            </motion.span>
                          </div>
                        ) : (
                          <>
                            <p className="whitespace-pre-wrap">
                              {message.text}
                              {/* Cursor for streaming messages */}
                              {message.isStreaming && streamingMessageIdRef.current === message.id && (
                                <motion.span
                                  className="inline-block w-0.5 h-4 bg-gray-800 ml-0.5"
                                  animate={{ opacity: [1, 0] }}
                                  transition={{ duration: 0.8, repeat: Infinity }}
                                />
                              )}
                            </p>
                            
                            {/* Display attachments */}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {message.attachments.map((attachment, idx) => (
                                  <div
                                    key={idx}
                                    className={cn(
                                      "flex items-center gap-2 text-xs",
                                      message.role === 'user' ? 'text-blue-100' : 'text-gray-600'
                                    )}
                                  >
                                    <Paperclip className="h-3 w-3" />
                                    <span className="truncate">{attachment.filename}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </motion.div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Selected files display */}
          {(selectedFiles.length > 0) && (
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                  >
                    <Paperclip className="h-3 w-3 text-gray-500" />
                    <span className="max-w-[100px] truncate">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-gray-100"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {/* {includeCanvas && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                    <Image className="h-3 w-3" />
                    <span>Canvas context</span>
                  </div>
                )} */}
              </div>
            </div>
          )}

          {/* Input area */}
          <form 
            onSubmit={handleSend}
            className="mx-2 rounded-full border border-gray-100 bg-slate-50 mb-2"
          >
            {/* Canvas context checkbox */}
            {/* <div className="px-3 py-2 border-b border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCanvas}
                  onChange={(e) => setIncludeCanvas(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-xs text-gray-600 flex items-center gap-1">
                  <Image className="h-3 w-3" />
                  Include canvas context
                </span>
              </label>
            </div> */}
            
            <div className="p-1">
              <div className="flex gap-0 items-center">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf,.doc,.docx,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming || selectedFiles.length >= 5}
                className="h-8 w-8 rounded-full"
              >
                <Paperclip size={18} />
              </Button>
              <Input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 h-8 text-xs placeholder:text-xs ring-none outline-none border-none shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isStreaming}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!draft.trim() || isStreaming}
                className="h-8 w-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Send size={18} />
              </Button>
              </div>
            </div>
          </form>
        </>
      )}
    </>
  )
}
