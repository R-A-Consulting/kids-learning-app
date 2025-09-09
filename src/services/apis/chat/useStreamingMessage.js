import { useState, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_BASE_URL || '';

export const useCreateStreamingMessage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [streamedContent, setStreamedContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Helper function for streaming API calls
  const streamRequest = useCallback(async (url, options = {}, onChunk) => {
    const response = await fetch(`${API_BASE_URL}/api${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
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

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        accumulatedContent += chunk;

        // Call the onChunk callback with the new chunk
        if (onChunk) {
          onChunk(chunk, accumulatedContent);
        }
      }

      return accumulatedContent;
    } finally {
      reader.releaseLock();
    }
  }, []);

  // Create a streaming message
  const createStreamingMessage = useCallback(async (messageData, onChunk) => {
    setIsLoading(true);
    setIsStreaming(true);
    setError(null);
    setStreamedContent('');

    try {
      const finalContent = await streamRequest('/chat/messages/stream', {
        method: 'POST',
        body: JSON.stringify(messageData),
      }, (chunk, accumulated) => {
        setStreamedContent(accumulated);
        if (onChunk) {
          onChunk(chunk, accumulated);
        }
      });

      return {
        success: true,
        content: finalContent,
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
