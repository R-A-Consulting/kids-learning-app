import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import AiChat from './ai-chat'

// Constants
const PANEL_WIDTH = 350
const FLOATING_PANEL_HEIGHT_VH = 90 // 60vh when floating
const MINIMIZED_HEIGHT = 36
const DOCK_THRESHOLD = 20

export default function AIChatPanel(props) {
  const { onDockChange, sessionId, canvasImage } = props || {}
  
  // State management
  const [isMinimized, setIsMinimized] = useState(false)
  const [position, setPosition] = useState({ x: window.innerWidth - PANEL_WIDTH, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [dockedPosition, setDockedPosition] = useState('left') // 'left' | 'right' | 'floating'
  
  // Refs
  const panelRef = useRef(null)

  // Initialize position based on docked state
  useEffect(() => {
    const updatePosition = () => {
      if (dockedPosition === 'right') {
        setPosition({ x: window.innerWidth - PANEL_WIDTH, y: 0 })
      } else if (dockedPosition === 'left') {
        setPosition({ x: 0, y: 0 })
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [dockedPosition])

  // Notify parent of dock changes
  useEffect(() => {
    if (onDockChange) {
      onDockChange({
        side: dockedPosition === 'floating' ? null : dockedPosition,
        width: PANEL_WIDTH,
        isMinimized
      })
    }
  }, [dockedPosition, isMinimized, onDockChange])

  // Handle dragging
  const handleMouseDown = useCallback((e) => {
    const rect = panelRef.current?.getBoundingClientRect()
    if (!rect) return
    
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => {
      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y
      
      // Constrain to viewport
      const maxX = window.innerWidth - PANEL_WIDTH
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
      } else if (newX > window.innerWidth - PANEL_WIDTH - DOCK_THRESHOLD) {
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
      } else if (position.x > window.innerWidth - PANEL_WIDTH - DOCK_THRESHOLD) {
        setPosition({ x: window.innerWidth - PANEL_WIDTH, y: 0 })
        setDockedPosition('right')
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset, position.x, position.y, isMinimized, dockedPosition])

  return (
    <div
      ref={panelRef}
      className={cn(
        "fixed top-0 left-0 bg-white border-gray-100 flex flex-col overflow-hidden",
        !isDragging && "transition-transform duration-300 ease-out",
        isDragging && "cursor-move shadow-md",
        isMinimized && "cursor-pointer",
        dockedPosition !== 'floating' && "shadow-none rounded-none",
        dockedPosition === 'floating' && "shadow-sm rounded-lg",
        dockedPosition === 'left' && "border-r",
        dockedPosition === 'right' && "border-l"
      )}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        width: isMinimized ? `200px` : `${PANEL_WIDTH}px`,
        height:
          dockedPosition !== 'floating'
            ? '100vh'
            : isMinimized
              ? `${MINIMIZED_HEIGHT}px`
              : `${Math.max(500, Math.min(FLOATING_PANEL_HEIGHT_VH, window.innerHeight))}px`,
        zIndex: 50
      }}
    >
      <AiChat
        isMinimized={isMinimized}
        setIsMinimized={setIsMinimized}
        handleMouseDown={handleMouseDown}
        dockedPosition={dockedPosition}
        sessionId={sessionId}
        canvasImage={canvasImage}
      />
    </div>
  )
}
