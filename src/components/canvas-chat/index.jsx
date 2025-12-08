import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import AiChat from './ai-chat'
import { GripVertical } from 'lucide-react'
import AnimatedCharacter from '@/components/animated-character'

// Constants
const PANEL_WIDTH = 350
const MIN_PANEL_WIDTH = 250
const MAX_PANEL_WIDTH = 800
const FLOATING_PANEL_HEIGHT_VH = 90 // 60vh when floating
const MINIMIZED_HEIGHT = 36
const DOCK_THRESHOLD = 20

export default function AIChatPanel(props) {
  const { onDockChange, sessionId, canvasImage, onAiStateChange, characterMood } = props || {}
  
  // State management
  const [isMinimized, setIsMinimized] = useState(false)
  const [panelWidth, setPanelWidth] = useState(PANEL_WIDTH)
  const [position, setPosition] = useState({ x: window.innerWidth - PANEL_WIDTH, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [dockedPosition, setDockedPosition] = useState('left') // 'left' | 'right' | 'floating'
  
  // Refs
  const panelRef = useRef(null)
  const resizeStartXRef = useRef(0)
  const resizeStartWidthRef = useRef(PANEL_WIDTH)

  // Initialize position based on docked state
  useEffect(() => {
    const updatePosition = () => {
      if (dockedPosition === 'right') {
        setPosition({ x: window.innerWidth - panelWidth, y: 0 })
      } else if (dockedPosition === 'left') {
        setPosition({ x: 0, y: 0 })
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [dockedPosition, panelWidth])

  // Notify parent of dock changes
  useEffect(() => {
    if (onDockChange) {
      onDockChange({
        side: dockedPosition === 'floating' ? null : dockedPosition,
        width: panelWidth,
        isMinimized
      })
    }
  }, [dockedPosition, isMinimized, panelWidth, onDockChange])

  // Handle dragging
  const handleMouseDown = useCallback((e) => {
    // Don't start dragging if clicking on resize handle
    if (e.target.closest('.resize-handle')) return
    
    const rect = panelRef.current?.getBoundingClientRect()
    if (!rect) return
    
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }, [])

  // Handle resize start
  const handleResizeStart = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    resizeStartXRef.current = e.clientX
    resizeStartWidthRef.current = panelWidth
  }, [panelWidth])

  // Handle resize
  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - resizeStartXRef.current
      let newWidth = resizeStartWidthRef.current

      if (dockedPosition === 'left') {
        // Resizing from right edge when docked left
        newWidth = resizeStartWidthRef.current + deltaX
      } else if (dockedPosition === 'right') {
        // Resizing from left edge when docked right
        newWidth = resizeStartWidthRef.current - deltaX
      }

      // Apply min/max constraints
      newWidth = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, newWidth))
      setPanelWidth(newWidth)

      // Update position for right dock
      if (dockedPosition === 'right') {
        setPosition({ x: window.innerWidth - newWidth, y: 0 })
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, dockedPosition])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => {
      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y
      
      // Constrain to viewport
      const maxX = window.innerWidth - panelWidth
      const floatingHeightPx = Math.round((FLOATING_PANEL_HEIGHT_VH / 100) * window.innerHeight)
      const targetHeight = isMinimized
        ? MINIMIZED_HEIGHT
        : (dockedPosition === 'floating' ? floatingHeightPx : window.innerHeight)
      const maxY = window.innerHeight - targetHeight
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      })

      // Check for docking while dragging
      if (newX < DOCK_THRESHOLD) {
        setDockedPosition('left')
      } else if (newX > window.innerWidth - panelWidth - DOCK_THRESHOLD) {
        setDockedPosition('right')
      } else {
        setDockedPosition('floating')
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      
      // Snap to dock if close enough
      if (position.x < DOCK_THRESHOLD) {
        setPosition({ x: 0, y: 0 })
        setDockedPosition('left')
      } else if (position.x > window.innerWidth - panelWidth - DOCK_THRESHOLD) {
        setPosition({ x: window.innerWidth - panelWidth, y: 0 })
        setDockedPosition('right')
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset, position.x, position.y, isMinimized, dockedPosition, panelWidth])

  const isDocked = dockedPosition !== 'floating'

  return (
    <div
      ref={panelRef}
      className={cn(
        "fixed top-0 left-0 bg-white border-gray-100 flex flex-col overflow-visible", // Changed overflow-hidden to overflow-visible
        !isDragging && !isResizing && "transition-transform duration-300 ease-out",
        isDragging && "cursor-move shadow-md",
        isMinimized && "cursor-pointer",
        dockedPosition !== 'floating' && "shadow-none rounded-none",
        dockedPosition === 'floating' && "shadow-sm rounded-lg",
        dockedPosition === 'left' && "border-r",
        dockedPosition === 'right' && "border-l"
      )}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        width: isMinimized ? `200px` : `${panelWidth}px`,
        height:
          dockedPosition !== 'floating'
            ? '100vh'
            : isMinimized
              ? `${MINIMIZED_HEIGHT}px`
              : `${Math.max(500, Math.min(FLOATING_PANEL_HEIGHT_VH, window.innerHeight))}px`,
        zIndex: 50
      }}
    >
      {/* Resize handle - only show when docked and not minimized */}
      {isDocked && !isMinimized && (
        <div
          className={cn(
            "resize-handle absolute top-0 bottom-0 w-1 cursor-col-resize z-10",
            "flex items-center justify-center group",
            dockedPosition === 'left' && "right-0",
            dockedPosition === 'right' && "left-0"
          )}
          onMouseDown={handleResizeStart}
          style={{
            cursor: 'col-resize',
          }}
        >
          {/* Visual indicator */}
          <div className="absolute inset-0 bg-transparent group-hover:bg-blue-200 transition-colors" />
          <div className="relative opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <GripVertical className="h-8 w-4 text-blue-500" />
          </div>
        </div>
      )}
      
      <AiChat
        isMinimized={isMinimized}
        setIsMinimized={setIsMinimized}
        handleMouseDown={handleMouseDown}
        dockedPosition={dockedPosition}
        sessionId={sessionId}
        canvasImage={canvasImage}
        onAiStateChange={onAiStateChange}
        characterMood={characterMood}
      />
      
      {/* Animated Character - Positioned at bottom right, peeking out */}
      {!isMinimized && (
        <AnimatedCharacter 
            mood={characterMood} 
            className="absolute -right-40 bottom-10 z-50 scale-[0.85] origin-bottom-left"
        />
      )}
    </div>
  )
}
