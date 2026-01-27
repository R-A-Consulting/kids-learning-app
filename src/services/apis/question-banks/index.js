import { useState, useCallback, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Helper function for API calls
const apiRequest = async (url, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${response.status}`);
  }

  return data;
};

/**
 * Hook to fetch all question banks
 */
export function useGetQuestionBanks() {
  const [questionBanks, setQuestionBanks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getQuestionBanks = useCallback(async (params = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      const queryParams = new URLSearchParams(params).toString();
      const response = await apiRequest(`/question-banks${queryParams ? `?${queryParams}` : ''}`);
      setQuestionBanks(response.data?.questionBanks || []);
      setPagination(response.data?.pagination);
      return response.data;
    } catch (err) {
      setError(err.message);
      return { questionBanks: [], pagination: null };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { questionBanks, pagination, isLoading, error, getQuestionBanks };
}

/**
 * Hook to fetch a single question bank
 */
export function useGetQuestionBank() {
  const [questionBank, setQuestionBank] = useState(null);
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getQuestionBank = useCallback(async (id) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiRequest(`/question-banks/${id}`);
      setQuestionBank(response.data?.questionBank);
      setSections(response.data?.sections || []);
      return response.data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { questionBank, sections, isLoading, error, getQuestionBank };
}

/**
 * Hook to create a question bank
 */
export function useCreateQuestionBank() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const createQuestionBank = useCallback(async (data) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiRequest('/question-banks', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return { success: true, ...response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createQuestionBank, isLoading, error };
}

/**
 * Hook to update a question bank
 */
export function useUpdateQuestionBank() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateQuestionBank = useCallback(async (id, data) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiRequest(`/question-banks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return { success: true, questionBank: response.data?.questionBank };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { updateQuestionBank, isLoading, error };
}

/**
 * Hook to delete a question bank
 */
export function useDeleteQuestionBank() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const deleteQuestionBank = useCallback(async (id) => {
    try {
      setIsLoading(true);
      setError(null);
      await apiRequest(`/question-banks/${id}`, {
        method: 'DELETE',
      });
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { deleteQuestionBank, isLoading, error };
}

/**
 * Hook to add source document to question bank with timeout, retry, and abort
 */
export function useAddSourceDocument() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const xhrRef = useRef(null);

  const addSourceDocument = useCallback(async (bankId, file, options = {}) => {
    const { timeout = 60000, retries = 2 } = options;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        setIsLoading(true);
        setError(null);
        setProgress(0);
        setProcessingStatus('uploading');

        const formData = new FormData();
        formData.append('file', file);

        // Create new abort controller for this attempt
        abortControllerRef.current = new AbortController();

        // Use XMLHttpRequest for progress tracking with timeout
        const result = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhrRef.current = xhr;
          
          // Set up timeout
          const timeoutId = setTimeout(() => {
            xhr.abort();
            reject(new Error('Upload timed out'));
          }, timeout);
          
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded * 100) / event.total);
              setProgress(percent);
            }
          });

          xhr.addEventListener('load', () => {
            clearTimeout(timeoutId);
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve({ 
                  success: true, 
                  questionBank: response.data?.questionBank,
                  documentIndex: response.data?.documentIndex,
                  processingStarted: response.data?.processingStarted
                });
              } catch (e) {
                reject(new Error('Invalid response from server'));
              }
            } else {
              try {
                const errorData = JSON.parse(xhr.responseText);
                reject(new Error(errorData.message || 'Upload failed'));
              } catch {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            }
          });

          xhr.addEventListener('error', () => {
            clearTimeout(timeoutId);
            reject(new Error('Network error during upload'));
          });

          xhr.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new Error('Upload cancelled'));
          });

          xhr.open('POST', `${API_BASE_URL}/question-banks/${bankId}/documents`);
          xhr.withCredentials = true;
          xhr.send(formData);
        });

        // Upload successful
        setIsLoading(false);
        if (result.processingStarted) {
          setProcessingStatus('processing');
        } else {
          setProcessingStatus('completed');
        }
        return result;
        
      } catch (err) {
        // Check if this was a cancellation
        if (err.message === 'Upload cancelled') {
          setIsLoading(false);
          setProcessingStatus(null);
          return { success: false, error: 'Upload cancelled', cancelled: true };
        }

        // Retry if attempts remaining
        if (attempt < retries && err.message !== 'Upload cancelled') {
          console.log(`Upload attempt ${attempt + 1} failed, retrying in ${(attempt + 1) * 1000}ms...`);
          await new Promise(r => setTimeout(r, (attempt + 1) * 1000)); // Exponential backoff
          continue;
        }

        // All retries exhausted
        setError(err.message);
        setIsLoading(false);
        setProcessingStatus('failed');
        return { success: false, error: err.message };
      }
    }
  }, []);

  const cancelUpload = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return { addSourceDocument, cancelUpload, isLoading, progress, processingStatus, error };
}

/**
 * Hook to get document processing status
 */
export function useGetDocumentsStatus() {
  const [documentsStatus, setDocumentsStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getDocumentsStatus = useCallback(async (bankId) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiRequest(`/question-banks/${bankId}/documents/status`);
      setDocumentsStatus(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { documentsStatus, isLoading, error, getDocumentsStatus, setDocumentsStatus };
}

/**
 * Hook to start question bank generation
 */
export function useStartGeneration() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const startGeneration = useCallback(async (id) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiRequest(`/question-banks/${id}/generate`, {
        method: 'POST',
      });
      return { success: true, ...response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { startGeneration, isLoading, error };
}

/**
 * Hook to get questions for a question bank
 */
export function useGetQuestions() {
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getQuestions = useCallback(async (bankId, params = {}) => {
    try {
      setIsLoading(true);
      setError(null);
      const queryParams = new URLSearchParams(params).toString();
      const response = await apiRequest(`/question-banks/${bankId}/questions${queryParams ? `?${queryParams}` : ''}`);
      setQuestions(response.data?.questions || []);
      return response.data?.questions || [];
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { questions, isLoading, error, getQuestions, setQuestions };
}

/**
 * Hook to update a question
 */
export function useUpdateQuestion() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateQuestion = useCallback(async (questionId, data) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiRequest(`/questions/${questionId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return { success: true, question: response.data?.question };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { updateQuestion, isLoading, error };
}

/**
 * Hook to refine a question with AI
 */
export function useRefineQuestion() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const refineQuestion = useCallback(async (questionId, instruction) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiRequest(`/questions/${questionId}/refine`, {
        method: 'POST',
        body: JSON.stringify({ instruction }),
      });
      return { success: true, ...response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { refineQuestion, isLoading, error };
}

/**
 * Hook to delete a question
 */
export function useDeleteQuestion() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const deleteQuestion = useCallback(async (questionId) => {
    try {
      setIsLoading(true);
      setError(null);
      await apiRequest(`/questions/${questionId}`, {
        method: 'DELETE',
      });
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { deleteQuestion, isLoading, error };
}

/**
 * Hook to update question status
 */
export function useUpdateQuestionStatus() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateStatus = useCallback(async (questionId, status, reason = null) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = { status };
      if (status === 'FLAGGED' && reason) data.flagReason = reason;
      if (status === 'REJECTED' && reason) data.rejectionReason = reason;
      
      const response = await apiRequest(`/questions/${questionId}/status`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return { success: true, question: response.data?.question };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { updateStatus, isLoading, error };
}

/**
 * Hook to reset a stuck question bank
 */
export function useResetQuestionBank() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const resetBank = useCallback(async (bankId) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiRequest(`/question-banks/${bankId}/reset`, {
        method: 'POST',
      });
      return { success: true, questionBank: response.data?.questionBank };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { resetBank, isLoading, error };
}

/**
 * Hook to retry generation for a question bank
 */
export function useRetryGeneration() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const retryGeneration = useCallback(async (bankId) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiRequest(`/question-banks/${bankId}/retry`, {
        method: 'POST',
      });
      return { success: true, ...response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { retryGeneration, isLoading, error };
}

export function useExportQuestionBank() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const exportBank = useCallback(async (bankId, format = 'json') => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/question-banks/${bankId}/export?format=${format}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Export failed');
      }

      if (format === 'json') {
        const data = await response.json();
        const jsonString = JSON.stringify(data.data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `export.json`;
        
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="(.+)"/);
          if (match) filename = match[1].replace(/\.(pdf|docx)$/, '.json');
        } else {
          const questionBankTitle = data.data?.questionBank?.title || 'question-bank';
          filename = `${questionBankTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        return { success: true };
      }

      // For PDF and DOCX, trigger download
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `export.${format}`;
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { exportBank, isLoading, error };
}
