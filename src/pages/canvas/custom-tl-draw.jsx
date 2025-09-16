import { Tldraw, getSnapshot, loadSnapshot } from 'tldraw'
import 'tldraw/tldraw.css'
import { useRef, useState, useEffect } from 'react'
import { useUpdateSession } from '../../services/apis/sessions/useUpdateSession'
import { useGetSession } from '../../services/apis/sessions/useGetSession'

export default function CustomTldraw({ sessionId, onCanvasImageUpdate }) {
  const editorRef = useRef(null)
  const isDrawingRef = useRef(false)
  const exportTimeoutRef = useRef(null)
  const saveTimeoutRef = useRef(null)
  const hasLoadedDataRef = useRef(false)

  const [canvasToImage, setCanvasToImage] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)
  
  // API hooks for saving/loading
  const { updateSession } = useUpdateSession()
  const { getSession } = useGetSession()

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (exportTimeoutRef.current) {
        clearTimeout(exportTimeoutRef.current)
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Update parent when canvasToImage changes
  useEffect(() => {
    if (onCanvasImageUpdate) {
      onCanvasImageUpdate(canvasToImage)
    }
  }, [canvasToImage, onCanvasImageUpdate])

  // Helpers for snapshot serialization
  const parseSnapshot = (data) => {
    if (!data) return null
    try {
      return typeof data === 'string' ? JSON.parse(data) : data
    } catch {
      return null
    }
  }

  // Load existing canvas data when component mounts
  const loadCanvasData = async () => {
    if (!sessionId || hasLoadedDataRef.current) return
    
    try {
      const result = await getSession(sessionId)
      const raw = result?.session?.data?.session?.canvasData
      if (raw) {
        const editor = editorRef.current
        const snapshot = parseSnapshot(raw)
        if (editor && snapshot) loadSnapshot(editor.store, snapshot)
      }
    } catch (error) {
      console.error('[tldraw] Failed to load canvas data:', error)
    } finally {
      hasLoadedDataRef.current = true
      setIsInitializing(false)
    }
  }

  // Save canvas data to backend
  const saveCanvasData = async () => {
    const editor = editorRef.current
    if (!editor || !sessionId) return

    try {
      const snapshot = getSnapshot(editor.store)
      const snapshotString = JSON.stringify(snapshot)
      const result = await updateSession(sessionId, { canvasData: snapshotString })
      if (result.success) {
        // saved
      } else {
        console.error('[tldraw] Failed to save canvas data:', result.error)
      }
    } catch (error) {
      console.error('[tldraw] Error saving canvas data:', error)
    }
  }

  // Debounced save - only save after user stops interacting
  const scheduleSave = () => {
    if (!hasLoadedDataRef.current) return // Don't save during initial load
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Schedule save after 2 seconds of inactivity
    saveTimeoutRef.current = setTimeout(() => {
      saveCanvasData()
    }, 2000)
  }

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

    setTimeout(async () => {
      await loadCanvasData()
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
      scheduleSave() // Also schedule save when canvas changes
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
    <div id="canvas-container" className="flex-[1_1_0%] min-w-0 transition-[margin] duration-200 ease-[cubic-bezier(.2,.8,.2,1)]">
      <div className="h-full w-full bg-white shadow-inner rounded-none relative">
        {isInitializing && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
            <div className="flex items-center gap-2 text-gray-600">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
              Loading canvas...
            </div>
          </div>
        )}
        <Tldraw
          onMount={handleEditorMount}
          persistenceKey={null}
        />
      </div>
    </div>
  )
}