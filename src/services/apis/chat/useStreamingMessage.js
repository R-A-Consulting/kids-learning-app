import { useState, useCallback } from 'react';

// Use proxy in development, full URL in production
// const API_BASE_URL = import.meta.env.DEV ? '/api/v1' : (import.meta.env.VITE_BASE_URL || '');
const API_BASE_URL = '/api/v1';

export const useCreateStreamingMessage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [streamedContent, setStreamedContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Helper function for streaming API calls
  const streamRequest = useCallback(async (url, options = {}, onChunk) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      credentials: 'include',
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Stream request failed' }));
      throw new Error(errorData.message || `Request failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let accumulatedContent = '';
    let buffer = '';
    let finalData = null;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process SSE format (event: type\ndata: json\n\n)
        const messages = buffer.split('\n\n');
        buffer = messages[messages.length - 1]; // Keep incomplete message in buffer

        for (let i = 0; i < messages.length - 1; i++) {
          const message = messages[i].trim();
          if (!message) continue;
          
          const lines = message.split('\n');
          let eventType = '';
          let eventData = '';
          
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7);
            } else if (line.startsWith('data: ')) {
              eventData = line.slice(6);
            }
          }
          
          if (!eventData) continue;
          
          try {
            const data = JSON.parse(eventData);
            
            if (eventType === 'chunk' && data.chunk) {
              accumulatedContent += data.chunk;
              if (onChunk) {
                onChunk({ ...data, eventType }, accumulatedContent);
              }
            } else if (eventType === 'complete' && data.finalContent) {
              finalData = data;
              accumulatedContent = data.finalContent;
              if (onChunk) {
                onChunk({ ...data, eventType }, accumulatedContent);
              }
            } else if (eventType === 'connected') {
              // Handle connection event if needed
              if (onChunk) {
                onChunk({ ...data, eventType }, accumulatedContent);
              }
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e, eventData);
          }
        }
      }

      // Process any remaining data in buffer
      if (buffer.trim()) {
        const lines = buffer.trim().split('\n');
        let eventType = '';
        let eventData = '';
        
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7);
          } else if (line.startsWith('data: ')) {
            eventData = line.slice(6);
          }
        }
        
        if (eventData) {
          try {
            const data = JSON.parse(eventData);
            if (eventType === 'complete' && data.finalContent) {
              finalData = data;
              accumulatedContent = data.finalContent;
            }
          } catch (e) {
            console.error('Failed to parse final buffer:', e);
          }
        }
      }

      return { content: accumulatedContent, finalData };
    } finally {
      reader.releaseLock();
    }
  }, []);

  // Create a streaming message
  const createStreamingMessage = useCallback(async (formData, onChunk) => {
    setIsLoading(true);
    setIsStreaming(true);
    setError(null);
    setStreamedContent('');

    try {
      const result = await streamRequest('/chat/messages/stream', {
        method: 'POST',
        body: formData,
      }, (chunkData, accumulated) => {
        setStreamedContent(accumulated);
        if (onChunk) {
          onChunk(chunkData, accumulated);
        }
      });

      return {
        success: true,
        content: result.content,
        finalData: result.finalData,
        message: 'Streaming message completed successfully'
      };
    } catch (err) {
      const errorMessage = err.message || 'Failed to create streaming message';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [streamRequest]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearStreamedContent = useCallback(() => {
    setStreamedContent('');
  }, []);

  const stopStreaming = useCallback(() => {
    setIsStreaming(false);
  }, []);

  return {
    // State
    isLoading,
    error,
    streamedContent,
    isStreaming,

    // Actions
    createStreamingMessage,

    // Utilities
    clearError,
    clearStreamedContent,
    stopStreaming,
  };
};
