import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sparkles,
  Plus,
  Upload,
  File,
  X,
  Clock,
  FileText,
  Edit,
  Trash2,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGetPapers, useGeneratePaper, useDeletePaper } from '@/services/apis/papers';
import { getSocket, onPaperUpdate, joinPaperRoom, leavePaperRoom } from '@/services/socket';

export default function AIQuestionsPage() {
  const navigate = useNavigate();
  
  // API hooks
  const { papers, isLoading: isLoadingPapers, error: papersError, getPapers } = useGetPapers();
  const { generatePaper, isLoading: isGenerating, progress: generateProgress } = useGeneratePaper();
  const { deletePaper, isLoading: isDeleting } = useDeletePaper();
  
  // Local state
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [localPapers, setLocalPapers] = useState([]);
  
  // Form state
  const [title, setTitle] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [questionType, setQuestionType] = useState('objective');
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [extraPrompt, setExtraPrompt] = useState('');
  
  // Track which papers we're subscribed to
  const subscribedPapersRef = useRef(new Set());

  // Sync papers from API to local state
  useEffect(() => {
    if (papers) {
      setLocalPapers(papers);
    }
  }, [papers]);

  // Fetch papers on mount
  useEffect(() => {
    getPapers();
  }, [getPapers]);
  
  // Subscribe to socket updates for generating papers
  useEffect(() => {
    // Initialize socket connection
    getSocket();
    
    // Handle paper updates
    const handlePaperUpdate = (data) => {
      console.log('[Socket] Paper update received:', data);
      
      setLocalPapers(prevPapers => {
        return prevPapers.map(paper => {
          if (paper._id === data.paperId) {
            if (data.type === 'status_change') {
              return {
                ...paper,
                generationMetadata: {
                  ...paper.generationMetadata,
                  status: data.status
                }
              };
            }
            if (data.type === 'generation_completed' && data.paper) {
              return data.paper;
            }
            if (data.type === 'generation_failed') {
              return {
                ...paper,
                generationMetadata: {
                  ...paper.generationMetadata,
                  status: 'failed',
                  error: data.error
                }
              };
            }
          }
          return paper;
        });
      });
    };
    
    const unsubscribe = onPaperUpdate(handlePaperUpdate);
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Subscribe to rooms for papers that are generating
  useEffect(() => {
    const generatingPapers = localPapers.filter(
      p => p.generationMetadata?.status === 'pending' || p.generationMetadata?.status === 'generating'
    );
    
    // Join rooms for new generating papers
    generatingPapers.forEach(paper => {
      if (!subscribedPapersRef.current.has(paper._id)) {
        joinPaperRoom(paper._id);
        subscribedPapersRef.current.add(paper._id);
      }
    });
    
    // Leave rooms for papers that are no longer generating
    subscribedPapersRef.current.forEach(paperId => {
      const paper = localPapers.find(p => p._id === paperId);
      if (!paper || (paper.generationMetadata?.status !== 'pending' && paper.generationMetadata?.status !== 'generating')) {
        leavePaperRoom(paperId);
        subscribedPapersRef.current.delete(paperId);
      }
    });
  }, [localPapers]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone itself
    // (not just moving to a child element)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    // Check if we're actually leaving the drop zone
    if (
      x < rect.left ||
      x > rect.right ||
      y < rect.top ||
      y > rect.bottom
    ) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      setUploadedFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e) => {
    const files = e.target.files;
    if (files.length > 0) {
      setUploadedFile(files[0]);
    }
  }, []);

  const handleGenerate = async () => {
    if (!uploadedFile || !title.trim()) return;
    
    const result = await generatePaper({
      title: title.trim(),
      file: uploadedFile,
      questionType,
      numberOfQuestions,
      extraPrompt,
    });
    
    if (result.success) {
      setIsGenerateOpen(false);
      
      // Reset form
      setTitle('');
      setUploadedFile(null);
      setQuestionType('objective');
      setNumberOfQuestions(10);
      setExtraPrompt('');
      
      // Add the new paper to local state immediately (with pending status)
      if (result.paper) {
        setLocalPapers(prev => [result.paper, ...prev]);
        
        // Subscribe to updates for this paper
        joinPaperRoom(result.paper._id);
        subscribedPapersRef.current.add(result.paper._id);
      }
    }
  };

  const handleDelete = async (paperId, e) => {
    e?.stopPropagation();
    setDeletingId(paperId);
    
    const result = await deletePaper(paperId);
    
    if (result.success) {
      // Refresh papers list
      await getPapers();
    }
    
    setDeletingId(null);
  };

  const handleRefresh = () => {
    getPapers();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full bg-[#fafafa]">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-black/[0.04] px-6 bg-white">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1 text-neutral-400 hover:text-neutral-600" />
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <h1 className="text-[14px] font-semibold text-neutral-900">AI Questions</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleRefresh}
            disabled={isLoadingPapers}
          >
            <RefreshCw className={cn("w-4 h-4 text-neutral-500", isLoadingPapers && "animate-spin")} />
          </Button>
          
          <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="h-8 px-3 text-[12px] bg-violet-600 hover:bg-violet-700"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Generate Questions
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-[16px]">
                  <Sparkles className="w-5 h-5 text-violet-500" />
                  Generate Questions
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-5 pt-4">
                {/* Title Input */}
                <div>
                  <label className="text-[12px] font-medium text-neutral-700 mb-2 block">
                    Paper Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Physics Chapter 5 Test, Biology Final Exam..."
                    className="w-full h-10 px-3 text-[13px] bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                </div>

                {/* PDF Upload */}
                <div>
                  <label className="text-[12px] font-medium text-neutral-700 mb-2 block">
                    Upload PDF <span className="text-red-500">*</span>
                  </label>
                  {uploadedFile ? (
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <File className="w-5 h-5 text-green-600" />
                      <span className="text-[13px] font-medium text-green-700 flex-1 truncate">
                        {uploadedFile.name}
                      </span>
                      <button
                        onClick={() => setUploadedFile(null)}
                        className="p-1 hover:bg-green-100 rounded"
                      >
                        <X className="w-4 h-4 text-green-600" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "flex flex-col items-center justify-center px-6 py-8 rounded-lg border-2 border-dashed transition-all cursor-pointer",
                        isDragging 
                          ? "border-violet-400 bg-violet-50" 
                          : "border-neutral-200 hover:border-neutral-300 bg-white"
                      )}
                      onDragEnter={handleDragEnter}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('pdf-upload')?.click()}
                    >
                      <input
                        id="pdf-upload"
                        type="file"
                        accept=".pdf"
                        className="sr-only"
                        onChange={handleFileSelect}
                      />
                      <Upload className={cn(
                        "w-8 h-8 mb-2",
                        isDragging ? "text-violet-500" : "text-neutral-400"
                      )} />
                      <p className="text-[13px] font-medium text-neutral-700 mb-1">
                        Drop your PDF here
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        or click to browse
                      </p>
                    </div>
                  )}
                </div>

                {/* Question Type */}
                <div>
                  <label className="text-[12px] font-medium text-neutral-700 mb-2 block">
                    Question Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setQuestionType('objective')}
                      className={cn(
                        "flex flex-col items-center p-4 rounded-lg border-2 transition-all",
                        questionType === 'objective'
                          ? "border-violet-500 bg-violet-50"
                          : "border-neutral-200 hover:border-neutral-300"
                      )}
                    >
                      <FileText className={cn(
                        "w-6 h-6 mb-2",
                        questionType === 'objective' ? "text-violet-600" : "text-neutral-400"
                      )} />
                      <span className={cn(
                        "text-[13px] font-medium",
                        questionType === 'objective' ? "text-violet-700" : "text-neutral-700"
                      )}>
                        Objective
                      </span>
                      <span className="text-[10px] text-neutral-500 mt-0.5">
                        MCQ, True/False
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuestionType('subjective')}
                      className={cn(
                        "flex flex-col items-center p-4 rounded-lg border-2 transition-all",
                        questionType === 'subjective'
                          ? "border-violet-500 bg-violet-50"
                          : "border-neutral-200 hover:border-neutral-300"
                      )}
                    >
                      <Edit className={cn(
                        "w-6 h-6 mb-2",
                        questionType === 'subjective' ? "text-violet-600" : "text-neutral-400"
                      )} />
                      <span className={cn(
                        "text-[13px] font-medium",
                        questionType === 'subjective' ? "text-violet-700" : "text-neutral-700"
                      )}>
                        Subjective
                      </span>
                      <span className="text-[10px] text-neutral-500 mt-0.5">
                        Short & Long answer
                      </span>
                    </button>
                  </div>
                </div>

                {/* Number of Questions */}
                <div>
                  <label className="text-[12px] font-medium text-neutral-700 mb-2 block">
                    Number of Questions
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={numberOfQuestions}
                    onChange={(e) => setNumberOfQuestions(parseInt(e.target.value) || 1)}
                    className="w-full h-10 px-3 text-[13px] bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                </div>

                {/* Extra Prompt */}
                <div>
                  <label className="text-[12px] font-medium text-neutral-700 mb-2 block">
                    Additional Instructions
                    <span className="text-neutral-400 font-normal ml-1">(optional)</span>
                  </label>
                  <textarea
                    value={extraPrompt}
                    onChange={(e) => setExtraPrompt(e.target.value)}
                    placeholder="e.g., Focus on conceptual questions, include numerical problems..."
                    className="w-full h-24 px-3 py-2 text-[13px] bg-white border border-neutral-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                </div>

                {/* Progress Bar */}
                {isGenerating && generateProgress > 0 && (
                  <div className="space-y-2">
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-violet-600 transition-all duration-500"
                        style={{ width: `${generateProgress}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-neutral-500 text-center">
                      {generateProgress < 30 ? 'Uploading PDF...' : 
                       generateProgress < 70 ? 'Generating questions...' : 
                       'Almost done...'}
                    </p>
                  </div>
                )}

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={!uploadedFile || !title.trim() || isGenerating}
                  className="w-full h-11 text-[13px] bg-violet-600 hover:bg-violet-700"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting generation...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate {numberOfQuestions} Questions
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          {/* Error State */}
          {papersError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-[13px] text-red-700">{papersError}</p>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-red-600 hover:text-red-700"
                onClick={handleRefresh}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Loading State */}
          {isLoadingPapers && localPapers.length === 0 ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-4" />
              <p className="text-[13px] text-neutral-500">Loading papers...</p>
            </div>
          ) : localPapers.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-violet-500" />
              </div>
              <h3 className="text-[16px] font-semibold text-neutral-900 mb-2">
                No question papers yet
              </h3>
              <p className="text-[13px] text-neutral-500 mb-6">
                Upload a PDF and generate AI-powered questions
              </p>
              <Button
                onClick={() => setIsGenerateOpen(true)}
                className="h-10 px-5 text-[13px] bg-violet-600 hover:bg-violet-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Generate Your First Questions
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50">
                    <TableHead className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider">
                      Title
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider">
                      Status
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider">
                      Type
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider">
                      Questions
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider">
                      Duration
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider">
                      Created
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localPapers.map((paper) => {
                    const status = paper.generationMetadata?.status || 'completed';
                    const isGenerating = status === 'pending' || status === 'generating';
                    const isFailed = status === 'failed';
                    
                    return (
                      <TableRow 
                        key={paper._id}
                        className={cn(
                          "transition-colors",
                          isGenerating ? "bg-violet-50/50" : "cursor-pointer hover:bg-neutral-50",
                          isFailed && "bg-red-50/50"
                        )}
                        onClick={() => !isGenerating && navigate(`/dashboard/ai-questions/${paper._id}`)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                              isGenerating ? "bg-violet-100" : isFailed ? "bg-red-100" : "bg-violet-50"
                            )}>
                              {isGenerating ? (
                                <Loader2 className="w-4 h-4 text-violet-600 animate-spin" />
                              ) : isFailed ? (
                                <XCircle className="w-4 h-4 text-red-500" />
                              ) : (
                                <FileText className="w-4 h-4 text-violet-500" />
                              )}
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold text-neutral-900">
                                {paper.title || paper.topic || 'Untitled'}
                              </p>
                              <p className="text-[11px] text-neutral-500">
                                {paper.topic && paper.title !== paper.topic ? paper.topic : (paper.sourceFile?.filename || 'Unknown source')}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "text-[11px] font-medium px-2 py-1 rounded-full inline-flex items-center gap-1",
                            status === 'completed' && "bg-green-50 text-green-600",
                            (status === 'pending' || status === 'generating') && "bg-violet-50 text-violet-600",
                            status === 'failed' && "bg-red-50 text-red-600"
                          )}>
                            {status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                            {(status === 'pending' || status === 'generating') && <Loader2 className="w-3 h-3 animate-spin" />}
                            {status === 'failed' && <XCircle className="w-3 h-3" />}
                            {status === 'pending' ? 'Pending' : 
                             status === 'generating' ? 'Generating' : 
                             status === 'failed' ? 'Failed' : 'Completed'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "text-[11px] font-medium px-2 py-1 rounded-full",
                            paper.questionType === 'objective'
                              ? "bg-blue-50 text-blue-600"
                              : "bg-amber-50 text-amber-600"
                          )}>
                            {paper.questionType === 'objective' ? 'Objective' : 'Subjective'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-[13px] text-neutral-700">
                            {isGenerating ? '-' : paper.numberOfQuestions}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-[13px] text-neutral-700 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-neutral-400" />
                            {paper.duration}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-[12px] text-neutral-500">
                            {formatDate(paper.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            {!isGenerating && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => navigate(`/dashboard/ai-questions/${paper._id}`)}
                              >
                                <Edit className="w-4 h-4 text-neutral-500" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:text-red-600"
                              onClick={(e) => handleDelete(paper._id, e)}
                              disabled={deletingId === paper._id || isGenerating}
                            >
                              {deletingId === paper._id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4 text-neutral-500" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
