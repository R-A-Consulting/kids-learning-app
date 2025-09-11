import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import AIChatPanel from '../../components/canvas-chat'
import { useParams } from 'react-router-dom'
import { useRef, useState, useEffect } from 'react'

export default function TldrawApp() {
  const { id: sessionId } = useParams()
  const editorRef = useRef(null)
  const isDrawingRef = useRef(false)
  const exportTimeoutRef = useRef(null)
  
  const [canvasToImage, setCanvasToImage] = useState(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (exportTimeoutRef.current) {
        clearTimeout(exportTimeoutRef.current)
      }
    }
  }, [])

  // Export function - captures only what user is seeing
  const exportCanvasToPng = async () => {
    const editor = editorRef.current
    if (!editor) {
      return
    }
    
    try {
      // Get current viewport bounds (what user is seeing)
      const viewportBounds = editor.getViewportPageBounds()
      
      // Create 1800x1800 bounds centered on viewport
      const centerX = viewportBounds.x + viewportBounds.width / 2
      const centerY = viewportBounds.y + viewportBounds.height / 2
      
      const exportBounds = {
        x: centerX - 900,
        y: centerY - 900,
        width: 1800,
        height: 1800
      }
      
      
      // Get only shapes that are visible in the viewport
      const allShapeIds = Array.from(editor.getCurrentPageShapeIds())
      const visibleShapeIds = allShapeIds.filter(id => {
        const shapeBounds = editor.getShapePageBounds(id)
        if (!shapeBounds) return false
        
        // Check if shape intersects with export bounds
        return !(
          shapeBounds.x + shapeBounds.width < exportBounds.x ||
          shapeBounds.x > exportBounds.x + exportBounds.width ||
          shapeBounds.y + shapeBounds.height < exportBounds.y ||
          shapeBounds.y > exportBounds.y + exportBounds.height
        )
      })
      
      // Export without custom bounds to avoid bbox error
      const result = await editor.toImage(visibleShapeIds, {
        format: 'png',
        background: true,
        padding: 50,
        scale: 1
      })
      
      const blob = result?.blob
      if (blob) {
        // Convert to exactly 1800x1800 using canvas
        const img = new Image()
        const url = URL.createObjectURL(blob)
        
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = url
        })
        
        // Create 1800x1800 canvas
        const canvas = document.createElement('canvas')
        canvas.width = 1800
        canvas.height = 1800
        const ctx = canvas.getContext('2d')
        
        // Fill with white background
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, 1800, 1800)
        
        // Calculate scaling to fit image in 1800x1800 while maintaining aspect ratio
        const scale = Math.min(1800 / img.width, 1800 / img.height)
        const scaledWidth = img.width * scale
        const scaledHeight = img.height * scale
        const x = (1800 - scaledWidth) / 2
        const y = (1800 - scaledHeight) / 2
        
        // Draw the image centered
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight)
        
        // Clean up
        URL.revokeObjectURL(url)
        
        // Convert to blob
        const finalBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
        
        if (finalBlob) {
          const file = new File([finalBlob], `canvas-${Date.now()}.png`, { type: 'image/png' })
          setCanvasToImage(file)
        }
      }
    } catch (e) {
      console.error('[tldraw] Viewport export failed:', e.message)
      
      // Fallback: try without bounds
      try {
        const allShapeIds = Array.from(editor.getCurrentPageShapeIds())
        const result = await editor.toImage(allShapeIds, {
          format: 'png',
          background: true
        })
        
        const blob = result?.blob
        if (blob) {
          const file = new File([blob], `canvas-${Date.now()}.png`, { type: 'image/png' })
          setCanvasToImage(file)
        }
      } catch (fallbackError) {
        console.error('[tldraw] Fallback export also failed:', fallbackError.message)
      }
    }
  }

  // Debounced export - only export after user stops interacting
  const scheduleExport = () => {
    // Clear any existing timeout
    if (exportTimeoutRef.current) {
      clearTimeout(exportTimeoutRef.current)
    }
    
    // Schedule export after 500ms of inactivity
    exportTimeoutRef.current = setTimeout(() => {
      exportCanvasToPng()
    }, 250)
  }

  const handleEditorMount = (editor) => {
    editorRef.current = editor
    
    // Initial export
    setTimeout(() => {
      exportCanvasToPng()
    }, 100)

    // Listen to pointer events to detect when user starts/stops drawing
    const handlePointerDown = () => {
      isDrawingRef.current = true
      // Clear any pending export
      if (exportTimeoutRef.current) {
        clearTimeout(exportTimeoutRef.current)
      }
    }

    const handlePointerUp = () => {
      if (isDrawingRef.current) {
        isDrawingRef.current = false
        scheduleExport()
      }
    }

    // Listen to store changes (for any canvas modifications)
    const handleStoreChange = () => {
      scheduleExport()
    }

    try {
      // Add event listeners
      const container = document.getElementById('canvas-container')
      if (container) {
        container.addEventListener('pointerdown', handlePointerDown)
        container.addEventListener('pointerup', handlePointerUp)
      }

      // Listen to store changes
      const unsubscribe = editor.store.listen(handleStoreChange)

      // Store cleanup function
      const cleanup = () => {
        if (container) {
          container.removeEventListener('pointerdown', handlePointerDown)
          container.removeEventListener('pointerup', handlePointerUp)
        }
        unsubscribe?.()
        if (exportTimeoutRef.current) {
          clearTimeout(exportTimeoutRef.current)
        }
      }

      // Return cleanup for later use
      return cleanup
    } catch (e) {
      console.error('[tldraw] Failed to set up listeners:', e)
    }
  }

  return (
    <div className="h-screen w-screen flex flex-row bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200">
      <div id="canvas-container" className="flex-[1_1_0%] min-w-0 transition-[margin] duration-200 ease-[cubic-bezier(.2,.8,.2,1)]">
        <div className="h-full w-full bg-white shadow-inner rounded-none relative">
          <Tldraw
            onMount={handleEditorMount}
            persistenceKey={sessionId}
          />
        </div>
      </div>
      <AIChatPanel
        onDockChange={handleDockChange}
        sessionId={sessionId}
        canvasImage={canvasToImage}
      />
    </div>
  )
}

function handleDockChange({ side, width }) {
  const c = document.getElementById('canvas-container')
  if (!c) return
  c.style.marginLeft = c.style.marginRight = '0px'
  c.style.width = 'auto'
  if (side === 'left') c.style.marginLeft = `${width || 400}px`
  else if (side === 'right') c.style.marginRight = `${width || 400}px`
  window.dispatchEvent(new Event('resize'))
}