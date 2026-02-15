import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  FileText,
  Download,
  CheckCircle2,
  Loader2,
  AlertCircle,
  RotateCcw,
  Play,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useGetQuestionBank,
  useGetQuestions,
  useUpdateQuestion,
  useRefineQuestion,
  useDeleteQuestion,
  useUpdateQuestionStatus,
  useResetQuestionBank,
  useRetryGeneration,
  useStartGeneration,
  useExportQuestionBank,
  useRetryDocumentProcessing,
  useBulkUpdateQuestions,
  useBulkDeleteQuestions,
  useRegenerateQuestion,
  useGenerateMore,
} from '@/services/apis/question-banks';
import { getSocket, joinBankRoom, leaveBankRoom, onBankUpdate } from '@/services/socket';
import QuestionCard from '@/components/question-bank/question-card';
import GenerationProgress from '@/components/question-bank/generation-progress';
import { ExportModal } from '@/components/question-bank/export-modal';
import { toast } from 'sonner';

function GenerateMoreModal({ open, onOpenChange, sections, onGenerate, isLoading }) {
  const [selectedSection, setSelectedSection] = useState(null);
  const [count, setCount] = useState('5');

  const handleGenerate = () => {
    if (!selectedSection) return;
    onGenerate(selectedSection, parseInt(count) || 5);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate More Questions</DialogTitle>
          <DialogDescription>
            Choose a section and how many questions to generate
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Section</Label>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {sections.map(s => (
                <label
                  key={s._id}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedSection === s._id
                      ? 'border-violet-400 bg-violet-50/60'
                      : 'border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="section"
                    value={s._id}
                    checked={selectedSection === s._id}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedSection === s._id ? 'border-violet-500' : 'border-neutral-300'
                  }`}>
                    {selectedSection === s._id && <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900">{s.name}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {s.questionType} &bull; {s.difficulty} &bull; {s.targetCount} questions &bull; {s.marksPerQuestion} mark{s.marksPerQuestion !== 1 ? 's' : ''} each
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Number of Questions</Label>
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              onBlur={() => {
                const n = parseInt(count);
                setCount(String(isNaN(n) || n < 1 ? 1 : n > 50 ? 50 : n));
              }}
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-violet-600 hover:bg-violet-700 text-white"
            onClick={handleGenerate}
            disabled={!selectedSection || isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Generate {count}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function QuestionBankDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { questionBank, sections, isLoading: isBankLoading, getQuestionBank } = useGetQuestionBank();
  const { questions, isLoading: isQuestionsLoading, getQuestions, setQuestions } = useGetQuestions();
  const { updateQuestion } = useUpdateQuestion();
  const { refineQuestion } = useRefineQuestion();
  const { deleteQuestion } = useDeleteQuestion();
  const { updateStatus } = useUpdateQuestionStatus();
  const { resetBank, isLoading: isResetting } = useResetQuestionBank();
  const { retryGeneration, isLoading: isRetrying } = useRetryGeneration();
  const { startGeneration, isLoading: isStarting } = useStartGeneration();
  const { exportBank, isLoading: isExporting } = useExportQuestionBank();
  const { retryDocument, isLoading: isRetryingDoc } = useRetryDocumentProcessing();
  const { bulkUpdateStatus, isLoading: isBulkUpdating } = useBulkUpdateQuestions();
  const { bulkDelete, isLoading: isBulkDeleting } = useBulkDeleteQuestions();
  const { regenerateQuestion } = useRegenerateQuestion();
  const { generateMore, isLoading: isGeneratingMore } = useGenerateMore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [refiningQuestionId, setRefiningQuestionId] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [generateMoreOpen, setGenerateMoreOpen] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [filters, setFilters] = useState({
    difficulty: 'ALL',
    search: '',
  });

  useEffect(() => {
    if (id) {
      getQuestionBank(id);
      getQuestions(id);
    }
  }, [id, getQuestionBank, getQuestions]);

  useEffect(() => {
    if (questionBank) {
      const generating = ['GENERATING', 'PROCESSING_DOCS'].includes(questionBank.status);
      setIsGenerating(generating);
    }
  }, [questionBank]);

  // Always-on socket room subscription — keeps the socket in the bank room
  // for the entire lifecycle of this page so events are never missed
  useEffect(() => {
    if (!id) return;

    const socket = getSocket();
    joinBankRoom(id);

    return () => {
      leaveBankRoom(id);
    };
  }, [id]);

  // Generation-specific event handler (only active while generating)
  useEffect(() => {
    if (!id || !isGenerating) return;

    const handleUpdate = (data) => {
      if (data.bankId !== id) return;

      if (data.type === 'status_change') {
        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
          setIsGenerating(false);
          getQuestionBank(id);
          getQuestions(id);
        }
      } else if (data.type === 'generation_completed') {
        setIsGenerating(false);
        getQuestionBank(id);
        getQuestions(id);
      } else if (data.type === 'generation_failed') {
        setIsGenerating(false);
        getQuestionBank(id);
      }
    };

    const unsubscribe = onBankUpdate(handleUpdate);

    return () => {
      unsubscribe();
      // DON'T leaveBankRoom here — room lifecycle managed by the always-on effect above
    };
  }, [id, isGenerating, getQuestionBank, getQuestions]);

  const filteredQuestions = useMemo(() => {
    let result = questions;

    // Section filter
    if (activeSection) {
      result = result.filter(q => q.section === activeSection || q.section?._id === activeSection);
    }

    // Difficulty filter
    if (filters.difficulty !== 'ALL') {
      result = result.filter(q => q.difficulty === filters.difficulty);
    }

    // Text search
    if (filters.search.trim()) {
      const term = filters.search.toLowerCase();
      result = result.filter(q => q.text?.toLowerCase().includes(term));
    }

    return result;
  }, [questions, activeSection, filters]);

  const handleExport = async (format, options) => {
    await exportBank(id, format, options);
    setExportModalOpen(false);
  };

  const handleEditQuestion = async (questionId, data) => {
    const result = await updateQuestion(questionId, data);
    if (result.success) {
      setQuestions(prev => prev.map(q => q._id === questionId ? result.question : q));
    }
  };

  const handleRefineQuestion = async (questionId, instruction) => {
    setRefiningQuestionId(questionId);
    const result = await refineQuestion(questionId, instruction);
    if (result.success && result.question) {
      setQuestions(prev => prev.map(q => q._id === questionId ? { ...q, ...result.question } : q));
    }
    setRefiningQuestionId(null);
  };

  const handleDeleteQuestion = async (questionId) => {
    const result = await deleteQuestion(questionId);
    if (result.success) {
      setQuestions(prev => prev.filter(q => q._id !== questionId));
      setSelectedQuestions(prev => { const n = new Set(prev); n.delete(questionId); return n; });
    }
  };

  const handleStatusChange = async (questionId, status) => {
    const result = await updateStatus(questionId, status);
    if (result.success) {
      setQuestions(prev => prev.map(q => q._id === questionId ? { ...q, status } : q));
    }
  };

  const handleResetBank = async () => {
    const result = await resetBank(id);
    if (result.success) {
      setQuestions([]);        // clear stale questions immediately
      getQuestionBank(id);
      getQuestions(id);        // also refresh from backend
    }
  };

  const handleRetryGeneration = async () => {
    const result = await retryGeneration(id);
    if (result.success) {
      setQuestions([]);           // clear stale questions before GenerationProgress mounts
      setIsGenerating(true);
      getQuestionBank(id);
      getQuestions(id);
    }
  };

  const handleRetryDocument = async (docId) => {
    const result = await retryDocument(id, docId);
    if (result.success) getQuestionBank(id);
  };

  const handleStartGeneration = async () => {
    const result = await startGeneration(id);
    if (result.success) {
      setQuestions([]);           // clear stale questions before GenerationProgress mounts
      setIsGenerating(true);
      getQuestionBank(id);
      getQuestions(id);
    }
  };

  const handleRegenerateQuestion = async (questionId) => {
    const result = await regenerateQuestion(id, questionId);
    if (result.success) {
      toast.success('Regeneration started');
      setQuestions(prev => prev.map(q => q._id === questionId ? { ...q, status: 'REGENERATING' } : q));
    }
  };

  const handleGenerateMore = async (sectionId, count) => {
    const result = await generateMore(id, sectionId, count);
    if (result.success) {
      toast.success(`Generating ${count} more questions`);
      setIsGenerating(true);
      getQuestionBank(id);
    }
  };

  // ─── Bulk Actions ─────────────────────────────────────────

  const handleSelectAll = () => {
    if (selectedQuestions.size === filteredQuestions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(filteredQuestions.map(q => q._id)));
    }
  };

  const handleToggleSelect = (questionId) => {
    setSelectedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const handleBulkApprove = async () => {
    const ids = [...selectedQuestions];
    const result = await bulkUpdateStatus(id, ids, 'APPROVED');
    if (result.success) {
      setQuestions(prev => prev.map(q => ids.includes(q._id) ? { ...q, status: 'APPROVED' } : q));
      setSelectedQuestions(new Set());
      toast.success(`${ids.length} questions approved`);
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedQuestions];
    if (!confirm(`Delete ${ids.length} questions? This cannot be undone.`)) return;
    const result = await bulkDelete(id, ids);
    if (result.success) {
      setQuestions(prev => prev.filter(q => !ids.includes(q._id)));
      setSelectedQuestions(new Set());
      toast.success(`${result.deletedCount || ids.length} questions deleted`);
    }
  };

  // ─── Derived state ────────────────────────────────────────

  const isStuck = questionBank && ['GENERATING', 'PROCESSING_DOCS', 'VERIFYING', 'FAILED'].includes(questionBank.status);
  const isConfiguring = questionBank && ['CONFIGURING', 'READY'].includes(questionBank.status);

  if (isBankLoading && !questionBank) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-violet-50/30 items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-4" />
        <p className="text-[13px] text-neutral-500">Loading question bank...</p>
      </div>
    );
  }

  if (!questionBank) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-violet-50/30 items-center justify-center">
        <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
        <p className="text-[13px] text-neutral-700">Question bank not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/dashboard/question-bank')}>
          Back to Question Banks
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-violet-50/30">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-black/[0.04] px-6 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate('/dashboard/question-bank')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              questionBank.status === 'COMPLETED' ? 'bg-emerald-50' : isGenerating ? 'bg-violet-50' : 'bg-neutral-50'
            )}>
              {isGenerating ? (
                <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
              ) : questionBank.status === 'COMPLETED' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <FileText className="w-4 h-4 text-neutral-400" />
              )}
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-neutral-900">{questionBank.title}</h1>
              <p className="text-[11px] text-neutral-500">
                {questionBank.curriculum} Class {questionBank.grade} &bull; {questionBank.subject}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {['GENERATING', 'PROCESSING_DOCS', 'VERIFYING', 'FAILED'].includes(questionBank.status) && (
            <>
              <Button variant="outline" size="sm" className="h-9" onClick={handleResetBank} disabled={isResetting}>
                {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RotateCcw className="w-4 h-4 mr-2" />Reset</>}
              </Button>
              <Button size="sm" className="h-9 bg-violet-600 hover:bg-violet-700 text-white" onClick={handleRetryGeneration} disabled={isRetrying}>
                {isRetrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4 mr-2" />Retry</>}
              </Button>
            </>
          )}
          {questionBank.status === 'COMPLETED' && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setGenerateMoreOpen(true)}
                disabled={isGeneratingMore}
              >
                {isGeneratingMore ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Generate More
              </Button>
              <Button variant="outline" size="sm" className="h-9" onClick={() => setExportModalOpen(true)} disabled={isExporting}>
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}Export
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Generation Progress */}
      {isGenerating ? (
        <div className="flex-1 min-h-0 flex flex-col">
          <GenerationProgress
            bankId={id}
            sections={sections}
            existingQuestions={questions}
            initialStatus={questionBank?.status}
            onGenerationCompleted={() => {
              setIsGenerating(false);
              getQuestionBank(id);
              getQuestions(id);
            }}
            onGenerationFailed={() => {
              setIsGenerating(false);
              getQuestionBank(id);
            }}
          />
        </div>
      ) : isConfiguring ? (
        /* Configuring State */
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto space-y-3">
            {/* Basic Info Card */}
            <div className="bg-white rounded-lg border border-neutral-200 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-semibold text-neutral-900">Configuration</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><p className="text-[11px] text-neutral-500">Curriculum</p><p className="text-[13px] font-medium text-neutral-900">{questionBank.curriculum}</p></div>
                <div><p className="text-[11px] text-neutral-500">Grade</p><p className="text-[13px] font-medium text-neutral-900">Class {questionBank.grade}</p></div>
                <div><p className="text-[11px] text-neutral-500">Subject</p><p className="text-[13px] font-medium text-neutral-900">{questionBank.subject}</p></div>
                <div><p className="text-[11px] text-neutral-500">Exam Pattern</p><p className="text-[13px] font-medium text-neutral-900">{questionBank.examPattern}</p></div>
              </div>
            </div>

            {/* Source Documents */}
            {questionBank.sourceDocuments?.length > 0 && (
              <div className="bg-white rounded-lg border border-neutral-200 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <h3 className="text-[15px] font-semibold text-neutral-900 mb-3">Source Documents</h3>
                <div className="space-y-2">
                  {questionBank.sourceDocuments.map((doc, index) => (
                    <div key={doc._id || index} className={cn(
                      'flex items-center gap-3 p-2.5 rounded-lg border',
                      doc.processingStatus === 'COMPLETED' ? 'bg-emerald-50 border-emerald-200' :
                      doc.processingStatus === 'FAILED' ? 'bg-red-50 border-red-200' :
                      doc.processingStatus === 'PROCESSING' ? 'bg-amber-50 border-amber-200' : 'bg-neutral-50 border-neutral-200'
                    )}>
                      {doc.processingStatus === 'COMPLETED' ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> :
                       doc.processingStatus === 'FAILED' ? <AlertCircle className="w-4 h-4 text-red-500 shrink-0" /> :
                       <Loader2 className="w-4 h-4 text-amber-500 animate-spin shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] font-medium text-neutral-700 truncate block">{doc.filename}</span>
                        <span className="text-[10px] text-neutral-500">
                          {doc.processingStatus === 'COMPLETED' ? `Processed${doc.contentLength ? ` • ${Math.round(doc.contentLength / 1000)}K chars` : ''}` :
                           doc.processingStatus === 'FAILED' ? 'Processing failed' : 'Processing...'}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 uppercase">{doc.type}</span>
                      {doc.processingStatus === 'FAILED' && doc._id && (
                        <button onClick={() => handleRetryDocument(doc._id)} disabled={isRetryingDoc}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-red-600 bg-red-100 hover:bg-red-200 rounded transition-colors disabled:opacity-50">
                          {isRetryingDoc ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          Retry
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] font-medium text-neutral-500">Source Mode: {questionBank.sourceMode}</span>
                  {questionBank.status === 'READY' && (
                    <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">All documents ready</span>
                  )}
                </div>
              </div>
            )}

            {/* Sections Card */}
            <div className="bg-white rounded-lg border border-neutral-200 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[15px] font-semibold text-neutral-900">Sections</h3>
                  <p className="text-[12px] text-neutral-500">{sections.length} section{sections.length !== 1 ? 's' : ''} configured</p>
                </div>
                <Button className="bg-violet-600 hover:bg-violet-700 text-white" onClick={handleStartGeneration} disabled={isStarting || sections.length === 0}>
                  {isStarting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}Start Generation
                </Button>
              </div>
              {sections.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-neutral-300 rounded-lg">
                  <FileText className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-[13px] text-neutral-500">No sections configured</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sections.map((section, index) => (
                    <div key={section._id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                          <span className="text-[12px] font-bold text-violet-600">{index + 1}</span>
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-neutral-900">{section.name}</p>
                          <p className="text-[11px] text-neutral-500">
                            {section.questionType} &bull; {section.difficulty} &bull; {section.targetCount} questions &bull; {section.marksPerQuestion} mark{section.marksPerQuestion !== 1 ? 's' : ''} each
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-semibold text-neutral-900">{section.targetCount * section.marksPerQuestion} marks</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-neutral-200 flex justify-between">
                    <p className="text-[13px] font-medium text-neutral-700">Total</p>
                    <p className="text-[13px] font-bold text-neutral-900">
                      {sections.reduce((s, sec) => s + sec.targetCount, 0)} questions &bull; {sections.reduce((s, sec) => s + (sec.targetCount * sec.marksPerQuestion), 0)} marks
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ─── Workspace View (clean full-width) ─── */
        <div className="w-full bg-white min-h-0 min-w-0 flex flex-col overflow-y-auto overflow-x-hidden">
          {/* Stuck/Failed Banner */}
          {isStuck && (
            <div className={cn(
              'rounded-lg border p-4 m-4 mb-0 shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
              questionBank.status === 'FAILED' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className={cn('w-5 h-5', questionBank.status === 'FAILED' ? 'text-red-500' : 'text-amber-500')} />
                  <div>
                    <h3 className={cn('text-[14px] font-semibold', questionBank.status === 'FAILED' ? 'text-red-900' : 'text-amber-900')}>
                      {questionBank.status === 'FAILED' ? 'Generation Failed' : 'Generation Stuck'}
                    </h3>
                    <p className={cn('text-[12px]', questionBank.status === 'FAILED' ? 'text-red-700' : 'text-amber-700')}>
                      {questionBank.errorMessage || 'The generation process appears to be stuck'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleResetBank} disabled={isResetting}>
                    {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RotateCcw className="w-4 h-4 mr-2" />Reset</>}
                  </Button>
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={handleRetryGeneration} disabled={isRetrying}>
                    {isRetrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4 mr-2" />Retry</>}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Single Toolbar: select, count, sections, search, difficulty */}
          <div className="sticky px-4 py-2 bg-transparent backdrop-blur-sm border-b border-neutral-100">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
              {/* Left side */}
              <div className="flex items-center gap-2 min-w-0">
                {/* Select All */}
                <button
                  onClick={handleSelectAll}
                  className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                    selectedQuestions.size === filteredQuestions.length && filteredQuestions.length > 0
                      ? "bg-violet-600 border-violet-600 text-white"
                      : selectedQuestions.size > 0
                      ? "bg-violet-100 border-violet-400 text-violet-600"
                      : "border-neutral-300 hover:border-violet-400"
                  )}
                >
                  {selectedQuestions.size > 0 && <Check className="w-3 h-3" />}
                </button>
                <span className="text-[12px] text-neutral-600 shrink-0">
                  {selectedQuestions.size > 0
                    ? `${selectedQuestions.size} selected`
                    : `${filteredQuestions.length} questions`}
                </span>

                {/* Bulk actions when selected */}
                {selectedQuestions.size > 0 && (
                  <div className="flex items-center gap-1.5 ml-1">
                    <Button
                      variant="outline" size="sm"
                      className="h-7 text-[11px] text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      onClick={handleBulkApprove} disabled={isBulkUpdating}
                    >
                      {isBulkUpdating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                      Approve
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      className="h-7 text-[11px] text-red-700 border-red-200 hover:bg-red-50"
                      onClick={handleBulkDelete} disabled={isBulkDeleting}
                    >
                      {isBulkDeleting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                      Delete
                    </Button>
                  </div>
                )}

                {/* Section tabs (when nothing selected) */}
                {selectedQuestions.size === 0 && sections.length > 1 && (
                  <>
                    <div className="w-px h-5 bg-neutral-200 shrink-0" />
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                      <button
                        onClick={() => setActiveSection(null)}
                        className={cn(
                          "px-2 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0",
                          !activeSection ? "bg-violet-100 text-violet-700" : "text-neutral-500 hover:bg-neutral-100"
                        )}
                      >
                        All
                      </button>
                      {sections.map(s => {
                        const count = questions.filter(q => q.section === s._id || q.section?._id === s._id).length;
                        return (
                          <button
                            key={s._id}
                            onClick={() => setActiveSection(s._id)}
                            className={cn(
                              "px-2 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0",
                              activeSection === s._id ? "bg-violet-100 text-violet-700" : "text-neutral-500 hover:bg-neutral-100"
                            )}
                          >
                            {s.name} ({count})
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Right side: Search + Difficulty */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={filters.search}
                    onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                    className="w-36 pl-7 pr-7 py-1.5 text-[11px] border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-300 bg-white"
                  />
                  {filters.search && (
                    <button onClick={() => setFilters(f => ({ ...f, search: '' }))} className="absolute right-2 top-1/2 -translate-y-1/2">
                      <X className="w-3 h-3 text-neutral-400" />
                    </button>
                  )}
                </div>
                <select
                  value={filters.difficulty}
                  onChange={(e) => setFilters(f => ({ ...f, difficulty: e.target.value }))}
                  className="h-8 px-2 text-[11px] border border-neutral-200 rounded-md bg-white text-neutral-600 focus:outline-none focus:ring-1 focus:ring-violet-300"
                >
                  <option value="ALL">All Difficulty</option>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                  <option value="HOTS">HOTS</option>
                </select>
                {(filters.difficulty !== 'ALL' || filters.search) && (
                  <button
                    onClick={() => setFilters({ difficulty: 'ALL', search: '' })}
                    className="text-[10px] font-medium text-violet-600 hover:text-violet-700 whitespace-nowrap"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Questions List */}
          <div className="flex-1 p-4">
            <div className="max-w-5xl mx-auto">
              {isQuestionsLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-5 h-5 text-violet-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-neutral-500">Loading questions...</p>
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-neutral-200">
                  <FileText className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-xs text-neutral-500">
                    {questions.length === 0 ? 'No questions generated yet' : 'No questions match current filters'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredQuestions.map((question, index) => (
                    <div key={question._id} className="flex items-start gap-2">
                      <button
                        onClick={() => handleToggleSelect(question._id)}
                        className={cn(
                          "w-5 h-5 mt-3 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                          selectedQuestions.has(question._id)
                            ? "bg-violet-600 border-violet-600 text-white"
                            : "border-neutral-300 hover:border-violet-400"
                        )}
                      >
                        {selectedQuestions.has(question._id) && <Check className="w-3 h-3" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <QuestionCard
                          question={question}
                          index={index + 1}
                          onEdit={handleEditQuestion}
                          onDelete={handleDeleteQuestion}
                          onRefine={handleRefineQuestion}
                          onStatusChange={handleStatusChange}
                          onRegenerate={handleRegenerateQuestion}
                          isRefining={refiningQuestionId === question._id}
                          bankId={id}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <GenerateMoreModal
        open={generateMoreOpen}
        onOpenChange={setGenerateMoreOpen}
        sections={sections}
        onGenerate={handleGenerateMore}
        isLoading={isGeneratingMore}
      />

      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        onExport={handleExport}
        isLoading={isExporting}
      />
    </div>
  );
}
