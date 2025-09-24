import {
  Tldraw,
  getSnapshot,
  loadSnapshot,
  DefaultColorStyle,
  DefaultDashStyle,
  DefaultFillStyle,
  DefaultSizeStyle,
  GeoShapeGeoStyle
} from 'tldraw'
import 'tldraw/tldraw.css'
import { useRef, useState, useEffect, useCallback } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '../../components/ui/dropdown-menu'
import { Button } from '../../components/ui/button'
import {
  ArrowUpRight,
  ChevronDown,
  Circle,
  Eraser,
  Image as ImageIcon,
  Maximize,
  Minus,
  MousePointer2,
  PenLine,
  Redo2,
  Shapes,
  Square,
  Trash2,
  Triangle,
  Type as TypeIcon,
  Undo2,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import { useUpdateSession } from '../../services/apis/sessions/useUpdateSession'
import { useGetSession } from '../../services/apis/sessions/useGetSession'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

const COLOR_OPTIONS = [
  { value: 'black', label: 'Black', swatch: '#111827' },
  { value: 'grey', label: 'Grey', swatch: '#6B7280' },
  { value: 'light-violet', label: 'Lavender', swatch: '#C7D2FE' },
  { value: 'violet', label: 'Violet', swatch: '#7C3AED' },
  { value: 'blue', label: 'Blue', swatch: '#2563EB' },
  { value: 'light-blue', label: 'Sky', swatch: '#38BDF8' },
  { value: 'green', label: 'Green', swatch: '#22C55E' },
  { value: 'light-green', label: 'Mint', swatch: '#86EFAC' },
  { value: 'yellow', label: 'Yellow', swatch: '#EAB308' },
  { value: 'orange', label: 'Orange', swatch: '#F97316' },
  { value: 'light-red', label: 'Blush', swatch: '#FCA5A5' },
  { value: 'red', label: 'Red', swatch: '#EF4444' }
]

const FILL_OPTIONS = [
  { value: 'none', label: 'No fill' },
  { value: 'semi', label: 'Soft' },
  { value: 'solid', label: 'Solid' }
]

const DASH_OPTIONS = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dash' },
  { value: 'dotted', label: 'Dot' },
  { value: 'draw', label: 'Sketch' }
]

const SIZE_OPTIONS = [
  { value: 's', label: 'S' },
  { value: 'm', label: 'M' },
  { value: 'l', label: 'L' },
  { value: 'xl', label: 'XL' }
]

const GEO_OPTIONS = [
  { value: 'rectangle', title: 'Rectangle' },
  { value: 'ellipse', title: 'Ellipse' },
  { value: 'triangle', title: 'Triangle' }
]

const GeoIcon = ({ type, size = 16 }) => {
  const style = { width: size, height: size }
  switch (type) {
    case 'ellipse':
      return <Circle style={style} />
    case 'triangle':
      return <Triangle style={style} />
    case 'rectangle':
    default:
      return <Square style={style} />
  }
}

const toolButtonClass = (active) =>
  `flex h-9 w-9 items-center justify-center rounded-sm border text-slate-700 transition aspect-square ${
    active
      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
      : 'border-gray-300 bg-white hover:border-slate-400 hover:bg-slate-50'
  }`

const styleButtonClass = (active) =>
  `flex items-center gap-2 rounded-sm border px-1 py-1 text-[11px] transition ${
    active
      ? 'border-none bg-white text-slate-900 shadow-none'
      : 'border-none bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50'
  }`

const CustomCanvasToolbar = ({ editor }) => {
  const [selectedTool, setSelectedTool] = useState('select')
  const [selectedGeo, setSelectedGeo] = useState('rectangle')
  const [selectedColor, setSelectedColor] = useState('black')
  const [selectedFill, setSelectedFill] = useState('none')
  const [selectedDash, setSelectedDash] = useState('solid')
  const [selectedSize, setSelectedSize] = useState('m')
  const [openPopover, setOpenPopover] = useState(null)

  const applyStyle = useCallback(
    (style, value) => {
      if (!editor) return
      editor.run(() => {
        editor.setStyleForSelectedShapes(style, value)
        editor.setStyleForNextShapes(style, value)
      })
    },
    [editor]
  )

  const syncStylesFromEditor = useCallback(() => {
    if (!editor) return

    const instanceState = editor.getInstanceState?.() ?? {}
    const shared = editor.getSharedStyles?.() ?? new Map()
    const next = instanceState.stylesForNextShape ?? {}

    const selectedShapes = editor.getSelectedShapes?.() ?? []

    let color = shared.get?.(DefaultColorStyle) ?? next[DefaultColorStyle.id] ?? 'black'
    let fill = shared.get?.(DefaultFillStyle) ?? next[DefaultFillStyle.id] ?? 'none'
    let dash = shared.get?.(DefaultDashStyle) ?? next[DefaultDashStyle.id] ?? 'solid'
    let size = shared.get?.(DefaultSizeStyle) ?? next[DefaultSizeStyle.id] ?? 'm'
    let geo = shared.get?.(GeoShapeGeoStyle) ?? next[GeoShapeGeoStyle.id] ?? 'rectangle'

    let inferredTool = instanceState.currentToolId ?? 'select'

    if (selectedShapes.length > 0) {
      const primary = selectedShapes[0]
      color = primary.props?.color ?? color
      fill = primary.props?.fill ?? fill
      dash = primary.props?.dash ?? dash
      size = primary.props?.size ?? size

      switch (primary.type) {
        case 'geo': {
          geo = primary.props?.geo ?? geo
          inferredTool = `geo-${geo}`
          break
        }
        case 'draw':
          inferredTool = 'draw'
          break
        case 'arrow':
          inferredTool = 'arrow'
          break
        case 'line':
          inferredTool = 'line'
          break
        case 'text':
          inferredTool = 'text'
          break
        case 'note':
          inferredTool = 'text'
          break
        case 'highlight':
          inferredTool = 'draw'
          break
        default: {
          if (inferredTool === 'geo') {
            inferredTool = `geo-${geo}`
          }
          break
        }
      }
    } else if (inferredTool === 'geo') {
      inferredTool = `geo-${geo}`
    }

    setSelectedColor(color)
    setSelectedFill(fill)
    setSelectedDash(dash)
    setSelectedSize(size)
    setSelectedGeo(geo)
    setSelectedTool(inferredTool)
  }, [editor])

  useEffect(() => {
    if (!editor) return
    syncStylesFromEditor()
    const unsubscribe = editor.store.listen(syncStylesFromEditor, { source: 'user' })
    return () => unsubscribe?.()
  }, [editor, syncStylesFromEditor])

  const handleToolChange = useCallback(
    (toolId) => {
      if (!editor) return

      if (toolId.startsWith('geo-')) {
        const geoValue = toolId.replace('geo-', '')
        setSelectedTool(toolId)
        setSelectedGeo(geoValue)
        editor.run(() => {
          editor.setStyleForSelectedShapes(GeoShapeGeoStyle, geoValue)
          editor.setStyleForNextShapes(GeoShapeGeoStyle, geoValue)
          editor.setCurrentTool('geo')
        })
        editor.updateInstanceState({ isToolLocked: true })
        return
      }

      setSelectedTool(toolId)
      editor.setCurrentTool(toolId)
      editor.updateInstanceState({ isToolLocked: toolId !== 'select' })
    },
    [editor]
  )

  const handleColorChange = useCallback(
    (value) => {
      setSelectedColor(value)
      applyStyle(DefaultColorStyle, value)
    },
    [applyStyle]
  )

  const handleFillChange = useCallback(
    (value) => {
      setSelectedFill(value)
      applyStyle(DefaultFillStyle, value)
    },
    [applyStyle]
  )

  const handleDashChange = useCallback(
    (value) => {
      setSelectedDash(value)
      applyStyle(DefaultDashStyle, value)
    },
    [applyStyle]
  )

  const handleSizeChange = useCallback(
    (value) => {
      setSelectedSize(value)
      applyStyle(DefaultSizeStyle, value)
    },
    [applyStyle]
  )

  const handleImageUpload = useCallback(() => {
    if (!editor) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (event) => {
      const files = Array.from(event.target.files || [])
      if (!files.length) return
      editor.putExternalContent({
        type: 'files',
        files,
        point: editor.getViewportPageBounds().center
      })
    }
    input.click()
  }, [editor])

  const handleClearCanvas = useCallback(() => {
    if (!editor) return
    const shapeIds = Array.from(editor.getCurrentPageShapeIds())
    if (!shapeIds.length) return
    editor.run(() => {
      editor.deleteShapes(shapeIds)
      editor.markHistoryStoppingPoint('clear-canvas')
    })
  }, [editor])

  const handleUndo = useCallback(() => editor?.undo(), [editor])
  const handleRedo = useCallback(() => editor?.redo(), [editor])
  const handleZoomIn = useCallback(() => {
    if (!editor) return
    editor.zoomIn(editor.getViewportPageBounds().center, 0.4)
  }, [editor])
  const handleZoomOut = useCallback(() => {
    if (!editor) return
    editor.zoomOut(editor.getViewportPageBounds().center, 0.4)
  }, [editor])
  const handleZoomFit = useCallback(() => editor?.zoomToFit(), [editor])

  return (
    <>
      <div className="pointer-events-auto fixed -bottom-1 pb-1 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-0 text-[11px] font-medium text-slate-600">
        <div className="flex h-12 items-center justify-between gap-2 rounded-t-sm w-full border-1 border-b-0 border-gray-300 bg-white/95 px-2 py-1 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.7)] backdrop-blur">
          <Popover open={openPopover === 'color'} onOpenChange={(open) => setOpenPopover(open ? 'color' : null)}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={styleButtonClass(true)}
                title="Stroke color"
              >
                <span
                  className="h-5 w-5 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: COLOR_OPTIONS.find((c) => c.value === selectedColor)?.swatch || '#111827' }}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent className="grid w-[260px] grid-cols-6 gap-3 p-4" align="center">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    handleColorChange(option.value)
                    setOpenPopover(null)
                  }}
                  className={`group relative h-8 w-8 cursor-pointer rounded-full border border-white/80 shadow ring-offset-2 transition ${
                    selectedColor === option.value ? 'ring-2 ring-slate-500' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: option.swatch }}
                >
                  <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100 z-[100]">
                    {option.label}
                  </span>
                </button>
              ))}
            </PopoverContent>
          </Popover>
          <Separator orientation="vertical" className="data-[orientation=vertical]:h-[60%]" />
          <DropdownMenu open={openPopover === 'fill'} onOpenChange={(open) => setOpenPopover(open ? 'fill' : null)}>
            <DropdownMenuTrigger asChild>
              <button type="button" className={styleButtonClass(true)} title="Fill">
                Fill: {FILL_OPTIONS.find((o) => o.value === selectedFill)?.label || 'None'}
                <ChevronDown className="size-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-44 p-3">
              <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-slate-400">Fill</div>
              <DropdownMenuRadioGroup value={selectedFill} onValueChange={(value) => {
                handleFillChange(value)
                setOpenPopover(null)
              }}>
                {FILL_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value} className="rounded-lg px-4 py-2 text-[12px] cursor-pointer flex items-center">
                    <div className="ml-6 flex-1">{option.label}</div>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Separator orientation="vertical" className="data-[orientation=vertical]:h-[60%]" />
          <DropdownMenu open={openPopover === 'stroke'} onOpenChange={(open) => setOpenPopover(open ? 'stroke' : null)}>
            <DropdownMenuTrigger asChild>
              <button type="button" className={styleButtonClass(true)} title="Stroke style">
                Style: {DASH_OPTIONS.find((o) => o.value === selectedDash)?.label || 'Solid'}
                <ChevronDown className="size-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-44 p-3">
              <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-slate-400">Stroke style</div>
              <DropdownMenuRadioGroup value={selectedDash} onValueChange={(value) => {
                handleDashChange(value)
                setOpenPopover(null)
              }}>
                {DASH_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value} className="rounded-lg px-4 py-2 text-[12px] cursor-pointer flex items-center">
                    <div className="ml-6 flex-1">{option.label}</div>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Separator orientation="vertical" className="data-[orientation=vertical]:h-[60%]" />
          <DropdownMenu open={openPopover === 'size'} onOpenChange={(open) => setOpenPopover(open ? 'size' : null)}>
            <DropdownMenuTrigger asChild>
              <button type="button" className={styleButtonClass(true)} title="Stroke size">
                Size: {SIZE_OPTIONS.find((o) => o.value === selectedSize)?.label || 'M'}
                <ChevronDown className="size-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-44 p-3">
              <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-slate-400">Stroke weight</div>
              <DropdownMenuRadioGroup value={selectedSize} onValueChange={(value) => {
                handleSizeChange(value)
                setOpenPopover(null)
              }}>
                {SIZE_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value} className="rounded-lg px-4 py-2 text-[12px] cursor-pointer flex items-center">
                    <div className="ml-6 flex-1">{option.label}</div>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex h-12 items-center justify-center gap-2 rounded-none w-full border-1 border-t-0 border-gray-300 bg-white/95 px-2 py-1 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.7)] backdrop-blur">
          <button type="button" onClick={() => handleToolChange('select')} className={toolButtonClass(selectedTool === 'select')} title="Select (V)">
            <MousePointer2 className="size-4" />
          </button>
          <button type="button" onClick={() => handleToolChange('draw')} className={toolButtonClass(selectedTool === 'draw')} title="Pen (P)">
            <PenLine className="size-4" />
          </button>
          <button type="button" onClick={() => handleToolChange('arrow')} className={toolButtonClass(selectedTool === 'arrow')} title="Arrow (A)">
            <ArrowUpRight className="size-4" />
          </button>
          <button type="button" onClick={() => handleToolChange('line')} className={toolButtonClass(selectedTool === 'line')} title="Line (L)">
            <Minus className="size-4" />
          </button>
          <button type="button" onClick={() => handleToolChange('text')} className={toolButtonClass(selectedTool === 'text')} title="Text (T)">
            <TypeIcon className="size-4" />
          </button>
          <button type="button" onClick={() => handleToolChange('eraser')} className={toolButtonClass(selectedTool === 'eraser')} title="Eraser (E)">
            <Eraser className="size-4" />
          </button>
          <Popover open={openPopover === 'shapes'} onOpenChange={(open) => setOpenPopover(open ? 'shapes' : null)}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={toolButtonClass(selectedTool?.startsWith('geo-'))}
                title="Shapes"
              >
                <GeoIcon type={selectedGeo} size={14} />
                <ChevronDown className="size-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="flex w-auto gap-3 p-4">
              {GEO_OPTIONS.map((option) => {
                const isActive = selectedGeo === option.value || selectedTool === `geo-${option.value}`
                const IconComponent = option.value === 'rectangle' ? Square : option.value === 'ellipse' ? Circle : Triangle
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      handleToolChange(`geo-${option.value}`)
                      setOpenPopover(null)
                    }}
                    className={toolButtonClass(isActive)}
                    title={option.title}
                  >
                    <IconComponent className="size-4" />
                  </button>
                )
              })}
            </PopoverContent>
          </Popover>
          <button type="button" onClick={handleImageUpload} className={toolButtonClass(false)} title="Insert image">
            <ImageIcon className="size-4" />
          </button>
        </div>
      </div>

      <div className="pointer-events-auto fixed right-0 top-0 z-50 flex items-center gap-2 rounded-bl-sm border-slate-300 bg-none px-2 py-2 text-xs text-slate-600 shadow-none backdrop-blur">
        <Button onClick={handleUndo} size="icon" variant="outline" className="h-8 w-8 rounded-sm border-gray-300" title="Undo (⌘Z)">
          <Undo2 className="size-4" />
        </Button>
        <Button onClick={handleRedo} size="icon" variant="outline" className="h-8 w-8 rounded-sm border-gray-300" title="Redo (⌘⇧Z)">
          <Redo2 className="size-4" />
        </Button>
        <Button onClick={handleZoomOut} size="icon" variant="outline" className="h-8 w-8 rounded-sm border-gray-300" title="Zoom out (⌘-)">
          <ZoomOut className="size-4" />
        </Button>
        <Button onClick={handleZoomIn} size="icon" variant="outline" className="h-8 w-8 rounded-sm border-gray-300" title="Zoom in (⌘+)">
          <ZoomIn className="size-4" />
        </Button>
        <Button onClick={handleZoomFit} size="icon" variant="outline" className="h-8 w-8 rounded-sm border-gray-300" title="Fit to screen">
          <Maximize className="size-4" />
        </Button>
        <Button onClick={handleClearCanvas} size="sm" variant="destructive" className="h-8 rounded-sm px-3 text-[11px] font-semibold" title="Clear canvas">
          <Trash2 className="mr-1 size-3" />
          Clear
        </Button>
      </div>
    </>
  )
}

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

      // Add keyboard listener for delete/backspace
      document.addEventListener('keydown', handleKeyDown)

      // Listen to store changes
      const unsubscribe = editor.store.listen(handleStoreChange)

      // Store cleanup function
      const cleanup = () => {
        if (container) {
          container.removeEventListener('pointerdown', handlePointerDown)
          container.removeEventListener('pointerup', handlePointerUp)
        }
        document.removeEventListener('keydown', handleKeyDown)
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
          hideUi={true}
        />

        <CustomCanvasToolbar editor={editorRef.current} />
      </div>
    </div>
  )
}