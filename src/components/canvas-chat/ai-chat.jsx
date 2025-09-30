/* eslint-disable no-unused-vars */
import { Send, Maximize2, Minimize2, Paperclip, X, Sparkles, Loader2, Image, Download, StopCircle, ArrowLeft, Mic, Square, Play, Pause } from 'lucide-react'
import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
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

const SUPPORTED_AUDIO_EXTENSIONS = ['mp3', 'wav']
const SUPPORTED_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
]

const getFileExtension = (filename = '') => {
  const parts = filename.split('.')
  if (parts.length <= 1) return ''
  return parts.pop().toLowerCase()
}

const sanitizeMimeType = (mime = '') => (mime || '').split(';')[0].toLowerCase()

const encodeAudioBufferToWav = (audioBuffer) => {
  const numChannels = audioBuffer.numberOfChannels || 1
  const sampleRate = audioBuffer.sampleRate
  const samples = audioBuffer.length
  const bytesPerSample = 2 // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample
  const dataSize = samples * blockAlign
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  let offset = 0
  const writeString = (string) => {
    for (let i = 0; i < string.length; i += 1) {
      view.setUint8(offset, string.charCodeAt(i))
      offset += 1
    }
  }

  writeString('RIFF')
  view.setUint32(offset, 36 + dataSize, true)
  offset += 4
  writeString('WAVE')
  writeString('fmt ')
  view.setUint32(offset, 16, true)
  offset += 4
  view.setUint16(offset, 1, true) // PCM format
  offset += 2
  view.setUint16(offset, numChannels, true)
  offset += 2
  view.setUint32(offset, sampleRate, true)
  offset += 4
  view.setUint32(offset, sampleRate * blockAlign, true)
  offset += 4
  view.setUint16(offset, blockAlign, true)
  offset += 2
  view.setUint16(offset, bytesPerSample * 8, true)
  offset += 2
  writeString('data')
  view.setUint32(offset, dataSize, true)
  offset += 4

  const channelData = []
  for (let channel = 0; channel < numChannels; channel += 1) {
    channelData[channel] = audioBuffer.getChannelData(channel)
  }

  for (let i = 0; i < samples; i += 1) {
    for (let channel = 0; channel < numChannels; channel += 1) {
      let sample = channelData[channel][i]
      sample = Math.max(-1, Math.min(1, sample))
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      view.setInt16(offset, intSample, true)
      offset += 2
    }
  }

  return buffer
}

// Streaming Message Component with smooth animation
const StreamingMessage = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const targetTextRef = useRef('')
  const displayedPosRef = useRef(0)
  const animationFrameRef = useRef()
  const lastFrameTimeRef = useRef(0)
  const charsPerSecond = 25 // Characters per second (adjust for speed)
  
  useEffect(() => {
    // Update target text whenever prop changes
    targetTextRef.current = text || ''
    
    // Start or continue animation
    const startAnimation = () => {
      if (animationFrameRef.current) return // Already animating
      
      const animate = (timestamp) => {
        // Initialize timestamp on first frame
        if (!lastFrameTimeRef.current) {
          lastFrameTimeRef.current = timestamp
        }
        
        // Calculate how many characters to show based on elapsed time
        const elapsed = timestamp - lastFrameTimeRef.current
        const charsToAdd = Math.floor((elapsed / 1000) * charsPerSecond)
        
        if (charsToAdd > 0 && displayedPosRef.current < targetTextRef.current.length) {
          // Update position and displayed text
          const newPos = Math.min(
            displayedPosRef.current + charsToAdd,
            targetTextRef.current.length
          )
          displayedPosRef.current = newPos
          setDisplayedText(targetTextRef.current.slice(0, newPos))
          lastFrameTimeRef.current = timestamp
        }
        
        // Continue animation if there's more to show
        if (displayedPosRef.current < targetTextRef.current.length) {
          animationFrameRef.current = requestAnimationFrame(animate)
        } else {
          // Animation complete
          animationFrameRef.current = null
          setShowCursor(false)
        }
      }
      
      // Start the animation
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    
    // Check if we need to animate
    if (targetTextRef.current.length > displayedPosRef.current) {
      setShowCursor(true)
      startAnimation()
    }
    
    // Handle edge case: text shortened (shouldn't happen in streaming)
    if (text && text.length < displayedPosRef.current) {
      displayedPosRef.current = text.length
      setDisplayedText(text)
      lastFrameTimeRef.current = 0
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      setShowCursor(false)
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [text])
  
  return (
    <div className="relative inline">
      <MessageFormatter className="text-xs inline">
        {displayedText}
      </MessageFormatter>
      {showCursor && (
        <motion.span
          className="inline-block ml-0.5 w-[2px] h-[14px] bg-blue-500 align-text-bottom"
          animate={{
            opacity: [1, 0.2, 1],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </div>
  )
}

const decodeAudioDataAsync = (audioContext, arrayBuffer) =>
  new Promise((resolve, reject) => {
    audioContext.decodeAudioData(arrayBuffer, resolve, reject)
  })

const convertBlobToWav = async (blob) => {
  const AudioCtx = window?.AudioContext || window?.webkitAudioContext
  if (!AudioCtx) {
    throw new Error('AudioContextNotSupported')
  }

  const arrayBuffer = await blob.arrayBuffer()
  const audioContext = new AudioCtx()
  try {
    const audioBuffer = await decodeAudioDataAsync(audioContext, arrayBuffer)
    const wavBuffer = encodeAudioBufferToWav(audioBuffer)
    return new Blob([wavBuffer], { type: 'audio/wav' })
  } finally {
    if (audioContext?.state !== 'closed') {
      try {
        await audioContext.close()
      } catch (error) {
        console.warn('Failed to close AudioContext:', error)
      }
    }
  }
}

const normalizeAudioBlobToSupportedFormat = async (blob) => {
  const incomingMime = sanitizeMimeType(blob?.type)

  if (SUPPORTED_AUDIO_MIME_TYPES.includes(incomingMime)) {
    const extension = incomingMime.includes('mpeg') || incomingMime.includes('mp3') ? 'mp3' : 'wav'
    return {
      blob,
      mimeType: incomingMime,
      extension,
    }
  }

  const wavBlob = await convertBlobToWav(blob)
  return {
    blob: wavBlob,
    mimeType: 'audio/wav',
    extension: 'wav',
  }
}

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
  const [playingAudioKey, setPlayingAudioKey] = useState(null)
  const [audioPreviews, setAudioPreviews] = useState({})
  const [shouldAutoSendAfterRecording, setShouldAutoSendAfterRecording] = useState(false)
  const isStreaming = Boolean(streamingMessageIdRef.current) || apiStreaming
  const audioRefs = useRef({})
  const audioPreviewsRef = useRef(audioPreviews)

  const isAudioFile = useCallback((file) => {
    if (!file) return false
    const name = (file?.name || '').toLowerCase()
    const mimeType = sanitizeMimeType(file?.type)
    const extension = getFileExtension(name)

    if (SUPPORTED_AUDIO_MIME_TYPES.includes(mimeType)) return true
    if (SUPPORTED_AUDIO_EXTENSIONS.includes(extension)) return true
    if (name.startsWith('voice-query-')) {
      return SUPPORTED_AUDIO_EXTENSIONS.some(ext => name.endsWith(`.${ext}`))
    }

    return false
  }, [])

  const getAudioKey = useCallback((file) => {
    if (!file) return ''
    const name = file?.name || 'file'
    const modified = file?.lastModified || 'na'
    const size = file?.size || 'size'
    return `${name}-${modified}-${size}`
  }, [])

  useEffect(() => {
    audioPreviewsRef.current = audioPreviews
  }, [audioPreviews])

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
  const handleFileSelect = useCallback((event) => {
    const input = event?.target
    const fileList = Array.from(input?.files || [])

    // Allow re-selecting the same file by clearing the input value
    if (input) {
      input.value = ''
    }

    if (fileList.length === 0) return

    const processFiles = async () => {
      const processedFiles = []

      for (const file of fileList) {
        if (!file) continue

        // Just add all files without audio format restrictions
        processedFiles.push(file)
      }

      if (processedFiles.length === 0) return

      setSelectedFiles(prev => {
        const combined = [...prev, ...processedFiles]
        if (combined.length > 5) {
          alert('You can only upload up to 5 files')
        }
        return combined.slice(0, 5)
      })
    }

    processFiles()
  }, [])

  // Remove selected file
  const removeFile = useCallback((index) => {
    setSelectedFiles(prev => {
      const next = prev.filter((_, i) => i !== index)
      const removed = prev[index]
      if (isAudioFile(removed)) {
        const key = getAudioKey(removed)
        const audioEl = audioRefs.current[key]
        if (audioEl) {
          audioEl.pause()
          audioEl.currentTime = 0
        }
        if (playingAudioKey === key) {
          setPlayingAudioKey(null)
        }
      }
      return next
    })
  }, [getAudioKey, isAudioFile, playingAudioKey])

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

      const options = { mimeType: 'audio/webm' }
      if (!MediaRecorder.isTypeSupported || !MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'audio/mp4'
      }

      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const mimeType = sanitizeMimeType(mediaRecorder.mimeType || audioChunksRef.current[0]?.type) || 'audio/webm'
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: mimeType })

          const processRecording = async () => {
            try {
              const { blob: normalizedBlob, mimeType: normalizedMime, extension } = await normalizeAudioBlobToSupportedFormat(blob)
              const randomSuffix = Math.random().toString(36).slice(2, 6)
              const audioFile = new File([normalizedBlob], `voice-query-${randomSuffix}.${extension}`, {
                type: normalizedMime,
              })

              setSelectedFiles(prev => {
                if (prev.length >= 5) {
                  alert('You can only upload up to 5 files')
                  return prev
                }
                return [...prev, audioFile].slice(0, 5)
              })

              setDraft(prevDraft => {
                if (!prevDraft || prevDraft.trim().length === 0 || prevDraft === 'analyse audio and respond accordingly' || prevDraft === 'help') {
                  return 'help'
                }
                return prevDraft
              })
              
              // Auto-send if flagged
              if (shouldAutoSendAfterRecording) {
                setTimeout(() => {
                  const sendButton = document.querySelector('[data-send-button="true"]')
                  if (sendButton) {
                    sendButton.click()
                  }
                  setShouldAutoSendAfterRecording(false)
                }, 100)
              }
            } catch (error) {
              console.error('Failed to normalize recording:', error)
              alert('Recording failed to process. Please try again.')
            }
          }

          processRecording()

          audioChunksRef.current = []
          cleanupAudioStream()
          mediaRecorderRef.current = null
          setIsRecording(false)
          return
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
  }, [cleanupAudioStream, isStreaming, selectedFiles.length, shouldAutoSendAfterRecording])

  const stopRecording = useCallback((shouldSave = true) => {
    const recorder = mediaRecorderRef.current
    
    if (!shouldSave) {
      // Cancel recording - discard everything
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = () => {
          audioChunksRef.current = []
          cleanupAudioStream()
          mediaRecorderRef.current = null
          setIsRecording(false)
        }
        recorder.stop()
      } else {
        audioChunksRef.current = []
        cleanupAudioStream()
        mediaRecorderRef.current = null
        setIsRecording(false)
      }
    } else {
      // Normal stop - save the recording
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop()
      } else {
        cleanupAudioStream()
        setIsRecording(false)
      }
    }
  }, [cleanupAudioStream])
  
  const cancelRecording = useCallback(() => {
    stopRecording(false)
  }, [stopRecording])
  
  const sendRecording = useCallback(() => {
    setShouldAutoSendAfterRecording(true)
    stopRecording(true)
    // The audio will be added to selectedFiles via the onstop handler
    // We'll trigger send after the recording is processed
  }, [stopRecording])

  // Handle PDF export
  const handleExportPdf = useCallback(async () => {
    if (!sessionId || sessionId === 'new') return

    await exportSessionPdf(sessionId)
  }, [sessionId, exportSessionPdf])

  // Handle sending messages
  const hasAudioAttachment = useMemo(
    () => selectedFiles.some(file => isAudioFile(file)),
    [selectedFiles, isAudioFile]
  )

  const handleSend = useCallback(async (e) => {
    e?.preventDefault()
    const text = draft.trim()
    if ((!text && !hasAudioAttachment) || streamingMessageIdRef.current || !sessionId) return
    
    // Add user message immediately
    const visibleAttachments = selectedFiles
      .filter(file => !file?.name?.startsWith('canvas-'))
      .map(file => ({ filename: file?.name || 'file' }))
    const userMessage = { 
      id: `user-${Date.now()}`, 
      role: 'user', 
      text,
      attachments: visibleAttachments
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
          // Clear the loading status when actual content arrives
          if (accumulated && accumulated.trim()) {
            setStreamingStatusById(prev => {
              const newStatus = { ...prev }
              delete newStatus[assistantId]
              return newStatus
            })
          }
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
  }, [draft, hasAudioAttachment, sessionId, user?._id, user?.id, selectedFiles, createStreamingMessage])

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
      Object.values(audioPreviewsRef.current).forEach(entry => {
        if (entry?.url) {
          URL.revokeObjectURL(entry.url)
        }
      })
    }
  }, [cleanupAudioStream])

  useEffect(() => {
    const previousMap = audioPreviewsRef.current || {}
    const nextMap = {}
    const activeKeys = new Set()

    selectedFiles.forEach(file => {
      if (!isAudioFile(file)) return
      const key = getAudioKey(file)
      if (!key) return
      activeKeys.add(key)

      const existing = previousMap[key]
      if (existing && existing.file === file) {
        nextMap[key] = existing
      } else {
        const url = URL.createObjectURL(file)
        nextMap[key] = { file, url }
      }
    })

    Object.keys(previousMap).forEach(key => {
      if (!activeKeys.has(key)) {
        const entry = previousMap[key]
        if (entry?.url) {
          URL.revokeObjectURL(entry.url)
        }
      }
    })

    audioPreviewsRef.current = nextMap
    setAudioPreviews(nextMap)

    Object.keys(audioRefs.current).forEach(key => {
      if (!activeKeys.has(key)) {
        delete audioRefs.current[key]
      }
    })

    if (playingAudioKey && !activeKeys.has(playingAudioKey)) {
      setPlayingAudioKey(null)
    }
  }, [selectedFiles, getAudioKey, isAudioFile, playingAudioKey])

  const handleToggleAudioPlayback = useCallback((key) => {
    if (!key) return
    const audioElement = audioRefs.current[key]
    if (!audioElement) return

    const isCurrentPlaying = playingAudioKey === key && !audioElement.paused

    if (isCurrentPlaying) {
      audioElement.pause()
      audioElement.currentTime = 0
      setPlayingAudioKey(null)
      return
    }

    if (playingAudioKey && playingAudioKey !== key) {
      const current = audioRefs.current[playingAudioKey]
      if (current) {
        current.pause()
        current.currentTime = 0
      }
    }

    const playPromise = audioElement.play()
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => {
          setPlayingAudioKey(key)
        })
        .catch(error => {
          console.error('Audio playback failed:', error)
        })
    } else {
      setPlayingAudioKey(key)
    }
  }, [playingAudioKey])

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
                            {/* Message content with smooth streaming animation */}
                            <motion.div
                              className="relative"
                              initial={false}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.3 }}
                            >
                              {message.isStreaming && streamingMessageIdRef.current === message.id ? (
                                <StreamingMessage text={message.text} />
                              ) : (
                                <MessageFormatter className="text-xs">
                                  {message.text}
                                </MessageFormatter>
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
          {(selectedFiles.filter(file => !file?.name?.startsWith('canvas-')).length > 0) && (
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
              <div className="flex flex-wrap gap-2">
                {selectedFiles
                  .filter(file => !file?.name?.startsWith('canvas-'))
                  .map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                  >
                    {isAudioFile(file) ? null : <Paperclip className="h-3 w-3 text-gray-500" />}
                    {isAudioFile(file) && (() => {
                      const key = getAudioKey(file)
                      const previewEntry = key ? audioPreviews[key] : null

                      if (!key || !previewEntry?.url) {
                        return null
                      }

                      return (
                        <>
                          <audio
                            ref={node => {
                              if (node) {
                                audioRefs.current[key] = node
                              } else {
                                delete audioRefs.current[key]
                              }
                            }}
                            src={previewEntry.url}
                            className="hidden"
                            onEnded={() => {
                              setPlayingAudioKey(prev => (prev === key ? null : prev))
                            }}
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5"
                            onClick={() => handleToggleAudioPlayback(key)}
                          >
                            {playingAudioKey === key ? <Pause className="h-2.5 w-2.5" strokeWidth={1.5} /> : <Play className="h-2.5 w-2.5" strokeWidth={1.5} />}
                          </Button>
                        </>
                      )
                    })()}
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
              isRecording && "border-red-400 bg-red-50"
            )}
          >
            
            <div className="p-1">
              <div className="flex gap-0 items-center">
              {!isRecording ? (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={startRecording}
                  disabled={isStreaming}
                  className="h-8 w-8 rounded-full mr-1"
                >
                  <Mic size={18} />
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelRecording}
                    className="px-3 py-1 h-8 rounded-full mr-1 bg-gray-100 hover:bg-gray-200 text-xs"
                    title="Cancel recording"
                  >
                    <X size={14} className="mr-1" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={sendRecording}
                    className="px-3 py-1 h-8 rounded-full mr-1 bg-blue-500 hover:bg-blue-600 text-white border-blue-500 text-xs"
                    title="Send recording"
                  >
                    <Send size={14} className="mr-1" />
                    Send
                  </Button>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,audio/*,application/pdf,.doc,.docx,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              {!isRecording && (
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
              )}
              <div className="relative flex-1 h-8 flex items-center">
                <Input
                  ref={inputRef}
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={isRecording ? "" : "Type your message..."}
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
              {!isRecording && (
                <Button
                  type={isStreaming ? "button" : "submit"}
                  size="icon"
                  disabled={(!draft.trim() && !hasAudioAttachment && !isStreaming)}
                  onClick={isStreaming ? () => {
                    // TODO: Implement stop streaming functionality
                    console.log('Stop streaming clicked')
                  } : undefined}
                  className="h-8 w-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
                  data-send-button="true"
                >
                  {isStreaming ? <StopCircle size={18} /> : <Send size={18} />}
                </Button>
              )}
              </div>
            </div>
          </form>
        </>
      )}
    </>
  )
}
