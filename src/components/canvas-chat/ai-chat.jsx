/* eslint-disable no-unused-vars */
import { Send, Maximize2, Minimize2, Paperclip, X, Sparkles, Loader2, Image, Download, StopCircle, ArrowLeft, Mic, Square } from 'lucide-react'
import { useEffect, useRef, useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useCreateStreamingMessage } from '@/services/apis/chat/useStreamingMessage'
import { useGetSessionMessages } from '@/services/apis/chat/useGetSessionMessages'
import { useExportSessionPdf } from '@/services/apis/sessions'
import { GlobalContext } from '@/services/contexts/global-context'
import { motion, AnimatePresence } from 'framer-motion'
import MessageFormatter from '@/components/canvas-chat/message-formatter'
import { useNavigate } from 'react-router-dom'

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

const RECORDING_WAVE_BARS = Array.from({ length: 7 })

export default function AiChat({
  isMinimized,
  setIsMinimized,
  handleMouseDown,
  sessionId,
  dockedPosition,
  canvasImage,
}) {
  const navigate = useNavigate()
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const streamingMessageIdRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const audioStreamRef = useRef(null)
  
  const { user } = GlobalContext()
  const { createStreamingMessage, isStreaming: apiStreaming } = useCreateStreamingMessage()
  const { messages: apiMessages, isLoading: messagesLoading, getSessionMessages } = useGetSessionMessages()
  const { exportSessionPdf, isLoading: exportLoading } = useExportSessionPdf()
  
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [currentStreamId, setCurrentStreamId] = useState(null)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [streamingStatusById, setStreamingStatusById] = useState({})
  const [isRecording, setIsRecording] = useState(false)
  const isStreaming = Boolean(streamingMessageIdRef.current) || apiStreaming

  useEffect(() => {
    setSelectedFiles(prev => {
      let filteredFiles = prev.filter(file => !file?.name?.startsWith('canvas-') || !file?.name)
      if (canvasImage) {
        filteredFiles.push(canvasImage)
      }
      return filteredFiles
    })
  }, [canvasImage])
  
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

  const cleanupAudioStream = useCallback(() => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop())
      audioStreamRef.current = null
    }
  }, [])

  const startRecording = useCallback(async () => {
    if (isStreaming) return
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      alert('Audio recording is not supported in this browser')
      return
    }

    if (selectedFiles.length >= 5) {
      alert('You can only upload up to 5 files')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm'
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: mimeType })
          const randomSuffix = Math.random().toString(36).slice(2, 6)
          const fileExtension = mimeType.includes('mp4') ? 'm4a' : mimeType.split('/')[1] || 'webm'
          const audioFile = new File([blob], `voice-query-${randomSuffix}.${fileExtension}`, {
            type: mimeType,
          })

          setSelectedFiles(prev => {
            if (prev.length >= 5) {
              alert('You can only upload up to 5 files')
              return prev
            }
            return [...prev, audioFile].slice(0, 5)
          })
        }

        audioChunksRef.current = []
        cleanupAudioStream()
        mediaRecorderRef.current = null
        setIsRecording(false)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('Unable to start recording. Please check microphone permissions.')
      cleanupAudioStream()
      mediaRecorderRef.current = null
      audioChunksRef.current = []
      setIsRecording(false)
    }
  }, [cleanupAudioStream, isStreaming, selectedFiles.length])

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    } else {
      cleanupAudioStream()
      setIsRecording(false)
    }
  }, [cleanupAudioStream])

  // Handle PDF export
  const handleExportPdf = useCallback(async () => {
    if (!sessionId || sessionId === 'new') return

    await exportSessionPdf(sessionId)
  }, [sessionId, exportSessionPdf])

  // Handle sending messages
  const handleSend = useCallback(async (e) => {
    e?.preventDefault()
    const text = draft.trim()
    if (!text || streamingMessageIdRef.current || !sessionId) return
    
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
            m.id === assistantId ? {
              ...m,
              text: accumulated,
              isStreaming: chunkData.eventType !== 'complete'
            } : m
          ))
        }

        if (chunkData.eventType === 'complete') {
          streamingMessageIdRef.current = null
          setCurrentStreamId(null)
        }
      })

      if (!result.success) {
        const errorText = 'Sorry, I encountered an error. Please try again.'
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, text: errorText, isStreaming: false } : m
        ))
      }
    } catch (error) {
      console.error('Streaming error:', error)
      const errorText = 'Sorry, I encountered an error. Please try again.'
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, text: errorText, isStreaming: false } : m
      ))
    } finally {
      streamingMessageIdRef.current = null
      setCurrentStreamId(null)
    }
  }, [draft, sessionId, user?._id, user?.id, selectedFiles, createStreamingMessage])

  // Focus input when expanded
  useEffect(() => {
    if (!isMinimized && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isMinimized])

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      cleanupAudioStream()
    }
  }, [cleanupAudioStream])

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
          <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-gray-100" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-3 w-3 text-gray-600" />
          </Button>
          <span className="font-medium text-gray-700 text-xs">Learning Buddy</span>
        </div>
        <div className="flex items-center gap-1">
          {/* PDF Export Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation()
              handleExportPdf()
            }}
            disabled={exportLoading || !sessionId || sessionId === 'new'}
            title="Export as PDF"
          >
            <Download size={12} />
          </Button>
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
                            {/* Message content with instant streaming */}
                            <motion.div
                              className="relative"
                              initial={false}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.3 }}
                            >
                              <MessageFormatter className="text-xs">
                                {message.text}
                              </MessageFormatter>

                              {/* Streaming indicator */}
                              {message.isStreaming && streamingMessageIdRef.current === message.id && (
                                <motion.div className="relative inline-block ml-0.5">
                                  <motion.span
                                    className="inline-block w-0.5 h-4 bg-gradient-to-b from-cyan-300 via-blue-400 to-purple-500"
                                    animate={{
                                      opacity: [0.4, 1, 0.4],
                                      scaleY: [0.7, 1.3, 0.7]
                                    }}
                                    transition={{
                                      duration: 1,
                                      repeat: Infinity,
                                      ease: "easeInOut"
                                    }}
                                    style={{
                                      backgroundSize: '200% 200%',
                                      backgroundImage: 'linear-gradient(45deg, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #06b6d4)'
                                    }}
                                  />
                                  {/* Glow effect */}
                                  <motion.div
                                    className="absolute inset-0 w-0.5 h-4 bg-gradient-to-b from-cyan-200 to-purple-300 blur-sm opacity-60"
                                    animate={{
                                      opacity: [0.3, 0.8, 0.3],
                                      scaleY: [0.8, 1.2, 0.8]
                                    }}
                                    transition={{
                                      duration: 1,
                                      repeat: Infinity,
                                      ease: "easeInOut",
                                      delay: 0.2
                                    }}
                                  />
                                </motion.div>
                              )}
                            </motion.div>

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
          {(selectedFiles.filter(file => !file?.name || !file?.name?.startsWith('canvas-')).length > 0) && (
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
              <div className="flex flex-wrap gap-2">
                {selectedFiles
                  .filter(file => !file?.name || !file?.name?.startsWith('canvas-'))
                  .map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                  >
                    <Paperclip className="h-3 w-3 text-gray-500" />
                    <span className="max-w-[100px] truncate">{file?.name || 'file'}</span>
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
              </div>
            </div>
          )}

          {/* Input area */}
          <form 
            onSubmit={(e) => {
              e.preventDefault()
              handleSend(e, true)
              setSelectedFiles(canvasImage ? [canvasImage] : [])
              setDraft('')
            }}
            className={cn(
              "mx-2 rounded-full border border-gray-100 bg-slate-50 mb-2",
              isRecording && "border-red-400 bg-red-50 animate-pulse"
            )}
          >
            
            <div className="p-1">
              <div className="flex gap-0 items-center">
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isStreaming}
                className={cn(
                  "h-8 w-8 rounded-full mr-1",
                  isRecording ? "bg-red-500 hover:bg-red-600 text-white border-red-500" : ""
                )}
              >
                {isRecording ? <Square size={18} /> : <Mic size={18} />}
              </Button>
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
                disabled={isStreaming || selectedFiles.length >= 5 || isRecording}
                className="h-8 w-8 rounded-full"
              >
                <Paperclip size={18} />
              </Button>
              <div className="relative flex-1 h-8 flex items-center">
                <Input
                  ref={inputRef}
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={isRecording ? "Recording..." : "Type your message..."}
                  className={cn(
                    "flex-1 h-8 text-xs placeholder:text-xs ring-none outline-none border-none shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                    isRecording && "opacity-0 pointer-events-none select-none"
                  )}
                  disabled={isStreaming || isRecording}
                />
                {isRecording && (
                  <div className="absolute inset-0 flex items-center justify-center gap-1 px-3">
                    {RECORDING_WAVE_BARS.map((_, index) => (
                      <motion.span
                        key={index}
                        className="w-[3px] h-4 rounded-full bg-red-500"
                        animate={{
                          scaleY: [0.4, 1.2, 0.6],
                          opacity: [0.6, 1, 0.6],
                        }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: index * 0.1,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <Button
                type={isStreaming ? "button" : "submit"}
                size="icon"
                disabled={(!draft.trim() && !isStreaming) || isRecording}
                onClick={isStreaming ? () => {
                  // TODO: Implement stop streaming functionality
                  console.log('Stop streaming clicked')
                } : undefined}
                className="h-8 w-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
              >
                {isStreaming ? <StopCircle size={18} /> : <Send size={18} />}
              </Button>
              </div>
            </div>
          </form>
        </>
      )}
    </>
  )
}
