import { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Sparkles,
  Send,
  Edit3,
  Save,
  X,
  Trash2,
  Check,
  FileText,
  Clock,
  Loader2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  AlertCircle,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGetPaper, useUpdatePaper } from '@/services/apis/papers';
import { subscribeToPaper } from '@/services/socket';
import MessageFormatter from '@/components/canvas-chat/message-formatter';

export default function AIQuestionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const chatEndRef = useRef(null);
  
  // API hooks
  const { paper, isLoading: isLoadingPaper, error: paperError, getPaper } = useGetPaper();
  const { updatePaper, updateQuestion, deleteQuestion, addChatMessage, isLoading: isUpdating } = useUpdatePaper();
  
  // Local state
  const [localPaper, setLocalPaper] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editedText, setEditedText] = useState('');
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());

  // Get status from local paper
  const status = localPaper?.generationMetadata?.status || paper?.generationMetadata?.status || 'completed';
  const isGenerating = status === 'pending' || status === 'generating';
  const isFailed = status === 'failed';
  const errorMessage = localPaper?.generationMetadata?.error || paper?.generationMetadata?.error;

  // Fetch paper on mount and when ID changes
  useEffect(() => {
    if (id) {
      getPaper(id);
    }
  }, [id, getPaper]);

  // Update local state when paper data changes
  useEffect(() => {
    if (paper) {
      setLocalPaper(paper);
      setQuestions(paper.questions || []);
      setMessages(paper.chatHistory || []);
    }
  }, [paper]);
  
  // Subscribe to socket updates if paper is generating
  useEffect(() => {
    if (!id) return;
    
    // Only subscribe if paper is generating
    if (!isGenerating && !isFailed) return;
    
    const cleanup = subscribeToPaper(id, {
      onStatusChange: (newStatus, data) => {
        console.log('[Detail] Status changed:', newStatus);
        setLocalPaper(prev => prev ? {
          ...prev,
          generationMetadata: {
            ...prev.generationMetadata,
            status: newStatus
          }
        } : prev);
      },
      onCompleted: (completedPaper, data) => {
        console.log('[Detail] Generation completed:', completedPaper);
        setLocalPaper(completedPaper);
        setQuestions(completedPaper.questions || []);
        setMessages(completedPaper.chatHistory || []);
      },
      onFailed: (error, data) => {
        console.log('[Detail] Generation failed:', error);
        setLocalPaper(prev => prev ? {
          ...prev,
          generationMetadata: {
            ...prev.generationMetadata,
            status: 'failed',
            error: error
          }
        } : prev);
      }
    });
    
    return cleanup;
  }, [id, isGenerating, isFailed]);

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Loading state
  if (isLoadingPaper && !paper && !localPaper) {
    return (
      <div className="flex flex-col h-full bg-[#fafafa] items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-4" />
        <p className="text-[13px] text-neutral-500">Loading paper...</p>
      </div>
    );
  }

  // Error state - API error
  if (paperError && !paper && !localPaper) {
    return (
      <div className="flex flex-col h-full bg-[#fafafa] items-center justify-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
        <p className="text-neutral-700 font-medium mb-2">Failed to load paper</p>
        <p className="text-[13px] text-neutral-500 mb-4">{paperError}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => getPaper(id)}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
          <Link to="/dashboard/ai-questions">
            <Button variant="outline">Go back</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Not found state
  if (!paper && !localPaper && !isLoadingPaper) {
    return (
      <div className="flex flex-col h-full bg-[#fafafa] items-center justify-center">
        <FileText className="w-10 h-10 text-neutral-300 mb-4" />
        <p className="text-neutral-500 mb-4">Paper not found</p>
        <Link to="/dashboard/ai-questions">
          <Button variant="outline">Go back to AI Questions</Button>
        </Link>
      </div>
    );
  }
  
  // Use localPaper or paper
  const displayPaper = localPaper || paper;

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !paper) return;
    
    const userMessage = {
      role: 'user',
      content: chatInput,
      timestamp: new Date().toISOString(),
    };
    
    // Optimistic update
    setMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsSending(true);
    
    const result = await addChatMessage(paper._id, chatInput);
    
    if (result.success && result.chatHistory) {
      setMessages(result.chatHistory);
    }
    
    setIsSending(false);
  };

  const handleEditQuestion = (question) => {
    setEditingQuestionId(question.id);
    setEditedText(question.text);
  };

  const handleSaveQuestion = async (questionId) => {
    if (!paper) return;
    
    // Optimistic update
    setQuestions(prev => prev.map(q => 
      q.id === questionId ? { ...q, text: editedText } : q
    ));
    setEditingQuestionId(null);
    
    const result = await updateQuestion(paper._id, questionId, { text: editedText });
    
    if (result.success && result.paper) {
      setQuestions(result.paper.questions || []);
    }
    
    setEditedText('');
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!paper) return;
    
    // Optimistic update
    setQuestions(prev => prev.filter(q => q.id !== questionId));
    
    const result = await deleteQuestion(paper._id, questionId);
    
    if (result.success && result.paper) {
      setQuestions(result.paper.questions || []);
    }
  };

  const toggleExpand = (questionId) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-[#fafafa]">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-black/[0.04] px-6 bg-white">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1 text-neutral-400 hover:text-neutral-600" />
          <Link 
            to="/dashboard/ai-questions" 
            className="flex items-center gap-1 text-[12px] text-neutral-500 hover:text-neutral-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
          <span className="text-neutral-300">|</span>
          <div className="flex items-center gap-2">
            {isGenerating ? (
              <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
            ) : isFailed ? (
              <XCircle className="w-4 h-4 text-red-500" />
            ) : (
              <FileText className="w-4 h-4 text-violet-500" />
            )}
            <h1 className="text-[14px] font-semibold text-neutral-900">
              {displayPaper?.title || displayPaper?.topic || 'Loading...'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[12px] text-neutral-500">
          {/* Status Badge */}
          <span className={cn(
            "font-medium px-2 py-1 rounded-full flex items-center gap-1",
            status === 'completed' && "bg-green-50 text-green-600",
            isGenerating && "bg-violet-50 text-violet-600",
            isFailed && "bg-red-50 text-red-600"
          )}>
            {isGenerating && <Loader2 className="w-3 h-3 animate-spin" />}
            {status === 'completed' ? 'Completed' : 
             status === 'generating' ? 'Generating...' : 
             status === 'pending' ? 'Pending...' :
             status === 'failed' ? 'Failed' : 'Unknown'}
          </span>
          
          <span className={cn(
            "font-medium px-2 py-1 rounded-full",
            displayPaper?.questionType === 'objective'
              ? "bg-blue-50 text-blue-600"
              : "bg-amber-50 text-amber-600"
          )}>
            {displayPaper?.questionType === 'objective' ? 'Objective' : 'Subjective'}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {displayPaper?.duration || '-'}
          </span>
          <span>{questions.length} questions</span>
        </div>
      </header>

      {/* Generation In Progress Overlay */}
      {isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-violet-50 to-white">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-violet-100 flex items-center justify-center mb-6 animate-pulse">
              <Sparkles className="w-12 h-12 text-violet-600" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
          </div>
          <h2 className="text-[20px] font-semibold text-neutral-900 mb-2">
            Generating Questions
          </h2>
          <p className="text-[14px] text-neutral-500 mb-2">
            {displayPaper?.title || 'Your paper'}
          </p>
          <p className="text-[13px] text-neutral-400 max-w-md text-center mb-8">
            Our AI is analyzing your document and creating high-quality questions. 
            This usually takes 30-60 seconds.
          </p>
          <div className="flex items-center gap-2 text-[12px] text-violet-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            {status === 'pending' ? 'Queued for processing...' : 'Processing your document...'}
          </div>
        </div>
      )}
      
      {/* Generation Failed State */}
      {isFailed && (
        <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-red-50 to-white">
          <div className="w-20 h-20 rounded-3xl bg-red-100 flex items-center justify-center mb-6">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-[20px] font-semibold text-neutral-900 mb-2">
            Generation Failed
          </h2>
          <p className="text-[14px] text-neutral-500 mb-2">
            {displayPaper?.title || 'Your paper'}
          </p>
          <p className="text-[13px] text-red-600 max-w-md text-center mb-6 bg-red-50 px-4 py-2 rounded-lg">
            {errorMessage || 'An error occurred while generating questions. Please try again.'}
          </p>
          <div className="flex gap-3">
            <Link to="/dashboard/ai-questions">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to List
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Main Content - Split View (only show when completed) */}
      {!isGenerating && !isFailed && (
      <div className="flex-1 relative overflow-hidden">
        {/* Left Side - Chat Panel - Fixed Height */}
        <div className="absolute top-0 left-0 bottom-0 w-[400px] border-r border-neutral-200 flex flex-col bg-white">
          {/* Chat Header */}
          <div className="shrink-0 px-5 py-4 border-b border-neutral-100 bg-gradient-to-r from-violet-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <span className="text-[14px] font-semibold text-neutral-900 block">AI Assistant</span>
                <p className="text-[11px] text-neutral-500">
                  Ask me to modify or improve questions
                </p>
              </div>
            </div>
          </div>

          {/* Chat Messages - Fixed height with scroll */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-violet-500" />
                  </div>
                  <p className="text-[14px] text-neutral-700 font-medium mb-1">How can I help?</p>
                  <p className="text-[12px] text-neutral-400 text-center max-w-[200px]">
                    Ask me to change difficulty, add explanations, or regenerate questions
                  </p>
                </div>
              ) : (
                messages.map((message, idx) => (
                  <div
                    key={message._id || idx}
                    className={cn(
                      "flex gap-3",
                      message.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    {/* Avatar */}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      message.role === 'user' 
                        ? "bg-violet-600" 
                        : "bg-gradient-to-br from-violet-100 to-purple-100"
                    )}>
                      {message.role === 'user' ? (
                        <span className="text-[11px] font-bold text-white">U</span>
                      ) : (
                        <Sparkles className="w-4 h-4 text-violet-600" />
                      )}
                    </div>
                    {/* Message */}
                    <div className={cn(
                      "flex flex-col max-w-[75%]",
                      message.role === 'user' ? "items-end" : "items-start"
                    )}>
                      <div className={cn(
                        "px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed",
                        message.role === 'user'
                          ? "bg-violet-600 text-white rounded-tr-md"
                          : "bg-neutral-100 text-neutral-700 rounded-tl-md"
                      )}>
                        {message.content}
                      </div>
                      <span className="text-[10px] text-neutral-400 mt-1 px-2">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                ))
              )}
              {isSending && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="bg-neutral-100 rounded-2xl rounded-tl-md px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Chat Input - Fixed at bottom */}
          <div className="shrink-0 p-4 border-t border-neutral-100 bg-white">
            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {['Make harder', 'Simplify', 'Add hints', 'More options'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setChatInput(suggestion)}
                  disabled={isSending}
                  className="text-[10px] px-2.5 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-600 rounded-full transition-colors font-medium disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            {/* Input Field */}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Ask AI to modify questions..."
                className="flex-1 h-11 px-4 text-[13px] bg-neutral-50 border border-neutral-200 rounded-xl placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                disabled={isSending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || isSending}
                className="h-11 w-11 p-0 bg-violet-600 hover:bg-violet-700 rounded-xl"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Side - Questions Panel - Fixed Height */}
        <div className="absolute top-0 left-[400px] right-0 bottom-0 overflow-y-auto p-6 bg-neutral-50">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[15px] font-semibold text-neutral-900">
                Questions ({questions.length})
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-[12px] border-neutral-200"
                onClick={() => setExpandedQuestions(new Set(questions.map(q => q.id)))}
              >
                Expand All
              </Button>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-neutral-200">
                <FileText className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                <p className="text-[13px] text-neutral-500">No questions yet</p>
              </div>
            ) : (
              questions.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  index={index + 1}
                  isExpanded={expandedQuestions.has(question.id)}
                  isEditing={editingQuestionId === question.id}
                  editedText={editedText}
                  isSaving={isUpdating && editingQuestionId === question.id}
                  onToggleExpand={() => toggleExpand(question.id)}
                  onEdit={() => handleEditQuestion(question)}
                  onCancelEdit={() => setEditingQuestionId(null)}
                  onSave={() => handleSaveQuestion(question.id)}
                  onDelete={() => handleDeleteQuestion(question.id)}
                  onEditChange={setEditedText}
                />
              ))
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  index,
  isExpanded,
  isEditing,
  editedText,
  isSaving,
  onToggleExpand,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onEditChange,
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      {/* Question Header */}
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="text-[12px] font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded mt-0.5">
          Q{index}
        </span>
        
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <textarea
              value={editedText}
              onChange={(e) => onEditChange(e.target.value)}
              className="w-full p-3 text-[13px] text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-violet-200"
              rows={3}
              autoFocus
            />
          ) : (
            <div className="text-[13px] text-neutral-800 leading-relaxed">
              <MessageFormatter>{question.text}</MessageFormatter>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onCancelEdit}
                disabled={isSaving}
              >
                <X className="w-4 h-4 text-neutral-400" />
              </Button>
              <Button
                size="sm"
                className="h-8 px-3 text-[11px] bg-green-600 hover:bg-green-700"
                onClick={onSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1" />
                    Save
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onEdit}
              >
                <Edit3 className="w-4 h-4 text-neutral-400 hover:text-neutral-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:text-red-600"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4 text-neutral-400" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onToggleExpand}
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-neutral-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-neutral-400" />
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && !isEditing && (
        <div className="px-4 pb-4 border-t border-neutral-100 pt-3 ml-10">
          {/* MCQ Options */}
          {question.type === 'mcq' && question.options && (
            <div className="space-y-2 mb-4">
              {question.options.map((option) => (
                <div
                  key={option.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-[12px]",
                    option.id === question.correctAnswer
                      ? "bg-green-50 border border-green-200"
                      : "bg-neutral-50 border border-neutral-100"
                  )}
                >
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold",
                    option.id === question.correctAnswer
                      ? "bg-green-500 text-white"
                      : "bg-neutral-200 text-neutral-600"
                  )}>
                    {option.id.toUpperCase()}
                  </span>
                  <span className={cn(
                    option.id === question.correctAnswer
                      ? "text-green-700 font-medium"
                      : "text-neutral-700"
                  )}>
                    <MessageFormatter inline>{option.text}</MessageFormatter>
                  </span>
                  {option.id === question.correctAnswer && (
                    <Check className="w-4 h-4 text-green-500 ml-auto" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Subjective Expected Answer */}
          {question.type === 'subjective' && question.expectedAnswer && (
            <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-lg">
              <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wider mb-1">
                Expected Answer
              </p>
              <div className="text-[12px] text-green-800 leading-relaxed">
                <MessageFormatter>{question.expectedAnswer}</MessageFormatter>
              </div>
              {question.marks && (
                <p className="text-[10px] text-green-600 mt-2">
                  Marks: {question.marks}
                </p>
              )}
            </div>
          )}

          {/* Explanation */}
          {question.explanation && (
            <div className="p-3 bg-violet-50 border border-violet-100 rounded-lg">
              <div className="flex items-center gap-1.5 mb-1">
                <Lightbulb className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider">
                  Explanation
                </span>
              </div>
              <div className="text-[12px] text-violet-800 leading-relaxed">
                <MessageFormatter>{question.explanation}</MessageFormatter>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
