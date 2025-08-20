
import { ReactSketchCanvas } from "react-sketch-canvas";
import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from 'react-markdown';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Grid,
  Paper,
  Typography,
  ButtonGroup,
  Button,
  Box,
  TextField,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Chip,
  Stack,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Fab,
  Tooltip
} from '@mui/material';
import {
  Palette as PaletteIcon,
  Brush as BrushIcon,
  Clear as ClearIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Chat as ChatIcon,
  AutoAwesome as AutoAwesomeIcon,
  SmartToy as SmartToyIcon
} from '@mui/icons-material';

// Create a professional, modern theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
      color: '#1976d2',
      fontSize: '2rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h6: {
      fontWeight: 500,
      fontSize: '1.25rem',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          padding: '8px 16px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        },
      },
    },
  },
});

function App() {
  const canvasRef = useRef(null);
  const drawingTimerRef = useRef(null);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [isErasing, setIsErasing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [lastCanvasHash, setLastCanvasHash] = useState(null);
  const [canvasIsEmpty, setCanvasIsEmpty] = useState(true);
  const [messages, setMessages] = useState([
    { id: 1, text: "Welcome to the Digital Workspace", sender: "bot", time: "now" },
    { id: 2, text: "Use the drawing tools to collaborate and create", sender: "bot", time: "now" }
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [apiStatus, setApiStatus] = useState("ready"); // ready, calling, success, error

  // Function to get or generate persistent session ID
  const getSessionId = useCallback(() => {
    let sessionId = localStorage.getItem('canvas_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('canvas_session_id', sessionId);
      console.log('Generated new session ID:', sessionId);
    }
    return sessionId;
  }, []);

  // Function to get or generate persistent user ID
  const getUserId = useCallback(() => {
    let userId = localStorage.getItem('canvas_user_id');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('canvas_user_id', userId);
      console.log('Generated new user ID:', userId);
    }
    return userId;
  }, []);

  const colors = [
    { color: "#000000", name: "Black" },
    { color: "#1976d2", name: "Blue" },
    { color: "#dc004e", name: "Red" },
    { color: "#388e3c", name: "Green" },
    { color: "#f57c00", name: "Orange" },
    { color: "#7b1fa2", name: "Purple" },
    { color: "#5d4037", name: "Brown" },
    { color: "#616161", name: "Grey" }
  ];
  const brushSizes = [2, 5, 10, 15, 20];

  // API URL - Learn Agent endpoint
  const API_URL = "http://192.168.31.89:8000/learn/playground/agents/learn_agent/runs";

  // Function to export canvas as base64 image
  const exportCanvasImage = useCallback(async () => {
    try {
      if (canvasRef.current) {
        const canvasImage = await canvasRef.current.exportImage("png");
        return canvasImage;
      }
      return null;
    } catch (error) {
      console.error('Error exporting canvas:', error);
      return null;
    }
  }, []);

  // Function to convert base64 to blob for file upload
  const base64ToBlob = useCallback((base64, mimeType = 'image/png') => {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }, []);

  // Function to generate a simple hash of canvas content
  const generateCanvasHash = useCallback((base64Image) => {
    if (!base64Image) return null;
    // Simple hash using the length and a sample of characters
    const content = base64Image.split(',')[1] || '';
    let hash = content.length;
    for (let i = 0; i < Math.min(content.length, 100); i += 10) {
      hash = hash * 31 + content.charCodeAt(i);
    }
    return hash.toString();
  }, []);

  // Function to check if canvas is empty
  const checkCanvasEmpty = useCallback(async () => {
    try {
      if (canvasRef.current) {
        const paths = await canvasRef.current.exportPaths();
        const isEmpty = !paths || paths.length === 0;
        setCanvasIsEmpty(isEmpty);
        return isEmpty;
      }
      return true;
    } catch (error) {
      console.warn('Error checking canvas emptiness:', error);
      return false;
    }
  }, []);

  // Function to check if canvas has changed since last API call
  const hasCanvasChanged = useCallback(async () => {
    try {
      const isEmpty = await checkCanvasEmpty();
      if (isEmpty) {
        return false; // No need to send empty canvas
      }

      const currentImage = await exportCanvasImage();
      if (!currentImage) {
        return false;
      }

      const currentHash = generateCanvasHash(currentImage);
      const hasChanged = currentHash !== lastCanvasHash;
      
      if (hasChanged) {
        setLastCanvasHash(currentHash);
      }
      
      return hasChanged;
    } catch (error) {
      console.warn('Error checking canvas changes:', error);
      return true; // Default to sending image if we can't determine changes
    }
  }, [checkCanvasEmpty, exportCanvasImage, generateCanvasHash, lastCanvasHash]);

  // Function to call the API with canvas image using multipart/form-data and handle streaming
  const callAPI = useCallback(async (eventType, data = {}) => {
    try {
      setApiStatus("calling");
      
      // Check if we need to send canvas image
      const shouldSendImage = await hasCanvasChanged();
      let canvasImage = null;
      
      if (shouldSendImage) {
        canvasImage = await exportCanvasImage();
        console.log('Canvas has changes, including image in API call');
      } else {
        console.log('Canvas unchanged or empty, skipping image in API call');
      }
      
      // Create FormData for multipart/form-data request
      const formData = new FormData();
      
      // Create message content based on event type
      let messageContent = '';
      if (eventType === 'chat_submit') {
        messageContent = data.message || 'User sent a message';
      } else if (eventType === 'drawing_pause') {
        const canvasStatus = canvasIsEmpty ? 'empty canvas' : (shouldSendImage ? 'canvas with new content' : 'canvas unchanged');
        messageContent = `User paused drawing. Canvas status: ${canvasStatus}. Chat has ${messages.length} messages. Drawing tools: ${strokeColor} color, ${strokeWidth}px brush${isErasing ? ', eraser mode' : ''}`;
      }
      
      // Add required form fields with persistent IDs
      const sessionId = getSessionId();
      const userId = getUserId();
      
      formData.append('message', messageContent);
      formData.append('stream', 'true');
      formData.append('monitor', 'false');
      formData.append('session_id', sessionId);
      formData.append('user_id', userId);
      
      // Add canvas image as file if available
      if (canvasImage) {
        const imageBlob = base64ToBlob(canvasImage);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        formData.append('files', imageBlob, `canvas_${eventType}_${timestamp}.png`);
      }

      console.log('Calling Learn Agent API:', eventType, {
        message: messageContent,
        hasImage: !!canvasImage,
        imageSize: canvasImage ? `${Math.round(canvasImage.length / 1024)}KB` : 'No image',
        canvasEmpty: canvasIsEmpty,
        canvasChanged: shouldSendImage,
        sessionId: sessionId,
        userId: userId
      });
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let aiMessageId = null;
      let accumulatedContent = '';

      // Create initial AI message
      const initialAiMessage = {
        id: Date.now(),
        text: '',
        sender: "bot",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isStreaming: true
      };
      aiMessageId = initialAiMessage.id;

      // Add AI message to chat
      setMessages(prev => [...prev, initialAiMessage]);
      
      // Helper function to parse concatenated JSON objects
      const parseJsonChunks = (text) => {
        const chunks = [];
        let depth = 0;
        let inString = false;
        let escapeNext = false;
        let currentChunk = '';

        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          currentChunk += char;

          if (escapeNext) {
            escapeNext = false;
            continue;
          }

          if (char === '\\') {
            escapeNext = true;
            continue;
          }

          if (char === '"' && !escapeNext) {
            inString = !inString;
            continue;
          }

          if (inString) continue;

          if (char === '{') {
            depth++;
          } else if (char === '}') {
            depth--;
            if (depth === 0) {
              // Complete JSON object found
              try {
                const parsed = JSON.parse(currentChunk);
                chunks.push(parsed);
                currentChunk = '';
              } catch (parseError) {
                console.warn('Failed to parse JSON chunk:', currentChunk, parseError);
              }
            }
          }
        }
        
        return { chunks, remaining: currentChunk };
      };
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        console.log('Raw chunk received:', buffer);
        
        const { chunks, remaining } = parseJsonChunks(buffer);
        buffer = remaining;

        for (const eventData of chunks) {
          console.log('Parsed event:', eventData);
          
          if (eventData.event === 'RunStarted') {
            console.log('AI Run Started:', eventData.run_id);
          } else if (eventData.event === 'RunResponseContent') {
            // Accumulate content from streaming chunks
            if (eventData.content !== undefined) {
              accumulatedContent += eventData.content;
              console.log('Accumulated content:', `"${accumulatedContent}"`);
              
              // Update the AI message in real-time
              setMessages(prev => prev.map(msg => 
                msg.id === aiMessageId 
                  ? { ...msg, text: accumulatedContent }
                  : msg
              ));
            }
          } else if (eventData.event === 'RunCompleted') {
            console.log('AI Run Completed, final content:', eventData.content);
            // Mark message as complete
            const finalContent = eventData.content || accumulatedContent;
            setMessages(prev => prev.map(msg => 
              msg.id === aiMessageId 
                ? { ...msg, text: finalContent, isStreaming: false }
                : msg
            ));
            setApiStatus("success");
          }
        }
        
        // If no chunks were parsed but we have buffer content, log it for debugging
        if (chunks.length === 0 && buffer.length > 0) {
          console.log('No JSON chunks parsed, raw buffer:', buffer);
          
          // Fallback: try to extract any visible content manually
          const contentMatch = buffer.match(/"content":\s*"([^"]*?)"/g);
          if (contentMatch) {
            console.log('Found content matches:', contentMatch);
            for (const match of contentMatch) {
              const content = match.match(/"content":\s*"([^"]*?)"/)[1];
              if (content) {
                accumulatedContent += content;
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMessageId 
                    ? { ...msg, text: accumulatedContent }
                    : msg
                ));
              }
            }
          }
        }
      }
      
      // Reset status after 2 seconds
      setTimeout(() => setApiStatus("ready"), 2000);
      
    } catch (error) {
      console.error('Error calling Learn Agent API:', error);
      setApiStatus("error");
      
      // Add error message to chat if no AI response was started
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: "Sorry, I encountered an error while processing your request. Please try again.",
        sender: "bot",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      }]);
      
      setTimeout(() => setApiStatus("ready"), 3000);
    }
  }, [strokeColor, strokeWidth, isErasing, messages.length, exportCanvasImage, base64ToBlob, hasCanvasChanged, canvasIsEmpty, getSessionId, getUserId]);

  // Handle drawing activity - reset timer on each drawing event
  const handleDrawingActivity = useCallback(() => {
    // Don't trigger API calls when component is not fully mounted
    if (!isMounted) {
      console.log('Ignoring drawing activity during initial mount');
      return;
    }
    
    // Don't trigger API calls when clearing the canvas
    if (isClearing) {
      console.log('Ignoring drawing activity during canvas clear');
      return;
    }
    
    // Update canvas empty state when user draws
    setCanvasIsEmpty(false);
    setIsDrawing(true);
    
    // Clear existing timer
    if (drawingTimerRef.current) {
      clearTimeout(drawingTimerRef.current);
    }
    
    // Set new timer for 4 seconds
    drawingTimerRef.current = setTimeout(() => {
      setIsDrawing(false);
      callAPI('drawing_pause', {
        action: 'user_paused_drawing',
        pauseDuration: 4000,
        currentChatMessages: messages.length,
        lastMessage: messages.length > 0 ? messages[messages.length - 1].text : null
      });
    }, 4000);
  }, [callAPI, messages, isClearing, isMounted]);

  // Clean up timer on unmount and set mounted state
  useEffect(() => {
    // Initialize session and user IDs on mount
    const sessionId = getSessionId();
    const userId = getUserId();
    console.log('Canvas app initialized with:', { sessionId, userId });
    
    // Set mounted to true after a short delay to avoid initial canvas events
    const mountTimer = setTimeout(() => {
      setIsMounted(true);
    }, 500); // 500ms delay to let canvas fully initialize

    return () => {
      clearTimeout(mountTimer);
      if (drawingTimerRef.current) {
        clearTimeout(drawingTimerRef.current);
      }
    };
  }, [getSessionId, getUserId]);

  const handleErase = () => {
    setIsErasing(!isErasing);
    if (!isErasing) {
      setStrokeColor("#FFFFFF");
    } else {
      setStrokeColor("#000000");
    }
  };

  const handleClear = () => {
    if (canvasRef.current) {
      setIsClearing(true);
      canvasRef.current.clearCanvas();
      // Update canvas state
      setCanvasIsEmpty(true);
      setLastCanvasHash(null);
      // Reset clearing state after a short delay to avoid API calls from clear operation
      setTimeout(() => setIsClearing(false), 100);
    }
  };

  const handleUndo = () => {
    if (canvasRef.current) {
      canvasRef.current.undo();
    }
  };

  const handleRedo = () => {
    if (canvasRef.current) {
      canvasRef.current.redo();
    }
  };

  // Function to manually export and download canvas image (for testing)
  const handleExportCanvas = async () => {
    try {
      setApiStatus("calling");
      const canvasImage = await exportCanvasImage();
      if (canvasImage) {
        // Create download link
        const link = document.createElement('a');
        link.download = `canvas-export-${new Date().toISOString().slice(0, 19)}.png`;
        link.href = canvasImage;
        link.click();
        setApiStatus("success");
        console.log('Canvas exported successfully');
      } else {
        setApiStatus("error");
        console.log('Failed to export canvas');
      }
      setTimeout(() => setApiStatus("ready"), 2000);
    } catch (error) {
      console.error('Export error:', error);
      setApiStatus("error");
      setTimeout(() => setApiStatus("ready"), 2000);
    }
  };

  const sendMessage = async () => {
    if (newMessage.trim()) {
      const message = {
        id: messages.length + 1,
        text: newMessage,
        sender: "user",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([...messages, message]);
      
      setNewMessage("");
      
      // Call API when message is submitted with canvas image and message
      // The streaming response will automatically add the AI's reply to the chat
      await callAPI('chat_submit', {
        action: 'user_sent_message',
        message: newMessage,
        messageId: message.id,
        chatHistory: messages.map(msg => ({
          text: msg.text,
          sender: msg.sender,
          time: msg.time
        }))
      });
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: 'background.default',
        py: 2
      }}>
        <Container maxWidth="xl">
          {/* Header */}
          <Paper 
            elevation={1} 
            sx={{ 
              p: 3, 
              mb: 3, 
              bgcolor: 'background.paper',
              borderRadius: 2
            }}
          >
            <Typography 
              variant="h4" 
              align="center" 
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                color: 'primary.main'
              }}
            >
              <PaletteIcon fontSize="large" />
              Digital Workspace - Collaborative Drawing
              <ChatIcon fontSize="large" />
            </Typography>
          </Paper>

          <Grid container spacing={2} sx={{ 
            height: 'calc(100vh - 160px)',
            flexWrap: 'nowrap',
            '& .MuiGrid-item': {
              maxWidth: 'none'
            }
          }}>
            {/* Left Side - Drawing Area */}
            <Grid item xs={8} sx={{ minWidth: 0, flex: 1 }}>
              <Paper elevation={3} sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column' }}>
                {/* Drawing Tools - Professional Toolbar */}
                <Paper 
                  elevation={1} 
                  sx={{ 
                    p: 2, 
                    mb: 2, 
                    bgcolor: 'grey.50',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'grey.200'
                  }}
                >
                  <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap" useFlexGap>
                    {/* Colors Section */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', minWidth: 'fit-content' }}>
                        Color
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        {colors.map(({ color, name }) => (
                          <Tooltip key={color} title={name} placement="top">
                            <Box
                              component="button"
                              sx={{ 
                                width: 32,
                                height: 32,
                                bgcolor: color,
                                border: strokeColor === color ? '3px solid #1976d2' : '2px solid #fff',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                boxShadow: strokeColor === color 
                                  ? '0 0 0 1px #1976d2, 0 2px 4px rgba(0,0,0,0.1)' 
                                  : '0 2px 4px rgba(0,0,0,0.1)',
                                '&:hover': { 
                                  transform: 'translateY(-1px)',
                                  boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
                                },
                                transition: 'all 0.2s ease',
                                p: 0,
                                minWidth: 0
                              }}
                              onClick={() => {
                                setStrokeColor(color);
                                setIsErasing(false);
                              }}
                            />
                          </Tooltip>
                        ))}
                      </Stack>
                    </Box>

                    <Divider orientation="vertical" flexItem />

                    {/* Brush Size Section */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', minWidth: 'fit-content' }}>
                        Size
                      </Typography>
                      <ButtonGroup variant="outlined" size="medium">
                        {brushSizes.map(size => (
                          <Button
                            key={size}
                            variant={strokeWidth === size ? "contained" : "outlined"}
                            onClick={() => setStrokeWidth(size)}
                            sx={{ 
                              minWidth: '48px',
                              fontWeight: 600,
                              '&.MuiButton-contained': {
                                boxShadow: '0 2px 4px rgba(25, 118, 210, 0.3)'
                              }
                            }}
                          >
                            {size}
                          </Button>
                        ))}
                      </ButtonGroup>
                    </Box>

                    <Divider orientation="vertical" flexItem />

                    {/* Tools Section */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', minWidth: 'fit-content' }}>
                        Tools
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                          variant={isErasing ? "contained" : "outlined"}
                          color={isErasing ? "secondary" : "primary"}
                          startIcon={<DeleteIcon />}
                          onClick={handleErase}
                          sx={{ 
                            fontWeight: 600,
                            '&.MuiButton-contained': {
                              boxShadow: '0 2px 4px rgba(220, 0, 78, 0.3)'
                            }
                          }}
                        >
                          {isErasing ? 'Draw' : 'Erase'}
                        </Button>
                        <Tooltip title="Clear Canvas" placement="top">
                          <IconButton
                            onClick={handleClear}
                            sx={{ 
                              border: '2px solid',
                              borderColor: 'grey.300',
                              bgcolor: 'background.paper',
                              '&:hover': { 
                                borderColor: 'primary.main',
                                bgcolor: 'primary.50',
                                transform: 'translateY(-1px)'
                              },
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <ClearIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Undo" placement="top">
                          <IconButton
                            onClick={handleUndo}
                            sx={{ 
                              border: '2px solid',
                              borderColor: 'grey.300',
                              bgcolor: 'background.paper',
                              '&:hover': { 
                                borderColor: 'primary.main',
                                bgcolor: 'primary.50',
                                transform: 'translateY(-1px)'
                              },
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <UndoIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Redo" placement="top">
                          <IconButton
                            onClick={handleRedo}
                            sx={{ 
                              border: '2px solid',
                              borderColor: 'grey.300',
                              bgcolor: 'background.paper',
                              '&:hover': { 
                                borderColor: 'primary.main',
                                bgcolor: 'primary.50',
                                transform: 'translateY(-1px)'
                              },
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <RedoIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Export Canvas Image" placement="top">
                          <IconButton
                            onClick={handleExportCanvas}
                            sx={{ 
                              border: '2px solid',
                              borderColor: 'grey.300',
                              bgcolor: 'background.paper',
                              '&:hover': { 
                                borderColor: 'primary.main',
                                bgcolor: 'primary.50',
                                transform: 'translateY(-1px)'
                              },
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <Box
                              component="img"
                              sx={{ width: 20, height: 20 }}
                              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor'%3E%3Cpath d='M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z'/%3E%3C/svg%3E"
                              alt="Export"
                            />
                          </IconButton>
                        </Tooltip>
                        
                        {/* API Status Indicator */}
                        <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: 
                                apiStatus === "calling" ? "warning.main" :
                                apiStatus === "success" ? "success.main" :
                                apiStatus === "error" ? "error.main" : "grey.400",
                              animation: apiStatus === "calling" ? "pulse 1.5s infinite" : "none",
                              "@keyframes pulse": {
                                "0%": { opacity: 1 },
                                "50%": { opacity: 0.5 },
                                "100%": { opacity: 1 }
                              }
                            }}
                          />
                          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                            {isDrawing && "Drawing..."}
                            {apiStatus === "calling" && "Exporting & Sending..."}
                            {apiStatus === "success" && "Sent ✓"}
                            {apiStatus === "error" && "Failed ✗"}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  </Stack>
                </Paper>

                {/* Canvas */}
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    flex: 1, 
                    p: 2, 
                    bgcolor: 'grey.50',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <ReactSketchCanvas 
                    ref={canvasRef}
                    style={{
                      border: "2px solid #e0e0e0",
                      borderRadius: "8px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    }}
                    width="100%"
                    height="500px"
                    strokeWidth={strokeWidth}
                    strokeColor={isErasing ? "#FFFFFF" : strokeColor}
                    canvasColor="#FFFFFF"
                    backgroundImage=""
                    exportWithBackgroundImage={false}
                    allowOnlyPointerType="all"
                    withTimestamp={false}
                    onUpdate={handleDrawingActivity}
                    onChange={handleDrawingActivity}
                  />
                </Paper>
              </Paper>
            </Grid>

            {/* Right Side - Chat Area */}
            <Grid item xs={4} sx={{ minWidth: 0, flex: '0 0 400px', maxWidth: '400px' }}>
              <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Chat Header */}
                <Box sx={{ 
                  bgcolor: 'primary.main',
                  color: 'white',
                  p: 2,
                  textAlign: 'center',
                  borderRadius: '8px 8px 0 0'
                }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <SmartToyIcon />
                    Collaboration Assistant
                  </Typography>
                </Box>

                {/* Messages */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: 'grey.50' }}>
                  <List>
                    {messages.map((message) => (
                      <ListItem 
                        key={message.id} 
                        sx={{ 
                          display: 'flex',
                          justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                          px: 0
                        }}
                      >
                        <Box sx={{ 
                          display: 'flex',
                          flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                          alignItems: 'flex-end',
                          gap: 1,
                          maxWidth: '80%'
                        }}>
                          <Avatar 
                            sx={{ 
                              bgcolor: message.sender === 'user' ? 'primary.main' : 'grey.400',
                              width: 32,
                              height: 32,
                              color: 'white',
                              fontSize: '0.875rem',
                              fontWeight: 'bold'
                            }}
                          >
                            {message.sender === 'user' ? 'U' : 'AI'}
                          </Avatar>
                          <Paper
                            elevation={1}
                            sx={{
                              p: 2,
                              bgcolor: message.sender === 'user' 
                                ? 'primary.main' 
                                : message.isError 
                                  ? 'error.50'
                                  : 'background.paper',
                              color: message.sender === 'user' 
                                ? 'white' 
                                : message.isError 
                                  ? 'error.main'
                                  : 'text.primary',
                              borderRadius: message.sender === 'user' 
                                ? '16px 16px 4px 16px' 
                                : '16px 16px 16px 4px',
                              border: '1px solid',
                              borderColor: message.sender === 'user' 
                                ? 'primary.main' 
                                : message.isError 
                                  ? 'error.main'
                                  : 'grey.300',
                              position: 'relative'
                            }}
                          >
                            <Box sx={{ mb: 0.5 }} className="markdown-content">
                              {message.sender === 'bot' ? (
                                <ReactMarkdown
                                  components={{
                                    p: ({ children }) => <Typography variant="body2" sx={{ mb: 1, '&:last-child': { mb: 0 } }}>{children}</Typography>,
                                    h1: ({ children }) => <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold' }}>{children}</Typography>,
                                    h2: ({ children }) => <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>{children}</Typography>,
                                    h3: ({ children }) => <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>{children}</Typography>,
                                    strong: ({ children }) => <Box component="span" sx={{ fontWeight: 'bold' }}>{children}</Box>,
                                    em: ({ children }) => <Box component="span" sx={{ fontStyle: 'italic' }}>{children}</Box>,
                                    ul: ({ children }) => <Box component="ul" sx={{ pl: 2, mb: 1 }}>{children}</Box>,
                                    ol: ({ children }) => <Box component="ol" sx={{ pl: 2, mb: 1 }}>{children}</Box>,
                                    li: ({ children }) => <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>{children}</Typography>,
                                    code: ({ children, inline }) => (
                                      inline ? (
                                        <Box component="code" sx={{ 
                                          bgcolor: 'grey.100', 
                                          px: 0.5, 
                                          py: 0.25, 
                                          borderRadius: 0.5,
                                          fontFamily: 'monospace',
                                          fontSize: '0.875em'
                                        }}>
                                          {children}
                                        </Box>
                                      ) : (
                                        <Paper sx={{ 
                                          bgcolor: 'grey.100', 
                                          p: 1, 
                                          mb: 1, 
                                          borderRadius: 1,
                                          fontFamily: 'monospace',
                                          fontSize: '0.875em',
                                          overflow: 'auto'
                                        }}>
                                          {children}
                                        </Paper>
                                      )
                                    ),
                                    blockquote: ({ children }) => (
                                      <Box sx={{ 
                                        borderLeft: '4px solid',
                                        borderColor: 'primary.main',
                                        pl: 2,
                                        py: 0.5,
                                        mb: 1,
                                        bgcolor: 'primary.50'
                                      }}>
                                        {children}
                                      </Box>
                                    )
                                  }}
                                >
                                  {message.text}
                                </ReactMarkdown>
                              ) : (
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                  {message.text}
                                </Typography>
                              )}
                              {message.isStreaming && (
                                <Box 
                                  component="span" 
                                  sx={{ 
                                    display: 'inline-block',
                                    width: '8px',
                                    height: '16px',
                                    bgcolor: 'text.primary',
                                    ml: 0.5,
                                    animation: 'blink 1s infinite',
                                    '@keyframes blink': {
                                      '0%, 50%': { opacity: 1 },
                                      '51%, 100%': { opacity: 0 }
                                    }
                                  }}
                                />
                              )}
                            </Box>
                            <Typography variant="caption" sx={{ opacity: 0.7 }}>
                              {message.time}
                              {message.isStreaming && (
                                <Box component="span" sx={{ ml: 1, color: 'primary.main' }}>
                                  • Streaming...
                                </Box>
                              )}
                            </Typography>
                          </Paper>
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                </Box>

                {/* Chat Input */}
                <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'grey.300', bgcolor: 'background.paper' }}>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      fullWidth
                      size="small"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder="Type your message..."
                      variant="outlined"
                      sx={{ 
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        }
                      }}
                    />
                    <IconButton 
                      color="primary" 
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      sx={{ 
                        bgcolor: 'primary.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'primary.dark' },
                        '&:disabled': { bgcolor: 'grey.300', color: 'grey.500' }
                      }}
                    >
                      <SendIcon />
                    </IconButton>
                  </Stack>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  )
}

export default App
