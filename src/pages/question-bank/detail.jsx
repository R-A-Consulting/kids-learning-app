import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  FileText,
  Download,
  CheckCircle2,
  Loader2,
  AlertCircle,
  RotateCcw,
  Play,
  Pencil,
  FileJson,
  FileType,
  ChevronDown,
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
} from '@/services/apis/question-banks';
import { subscribeToBank } from '@/services/socket';
import QuestionCard from '@/components/question-bank/question-card';
import GenerationProgress from '@/components/question-bank/generation-progress';

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

  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [refiningQuestionId, setRefiningQuestionId] = useState(null);

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

  // Socket subscription for real-time updates
  // Note: GenerationProgress handles its own socket subscription when rendering
  // This subscription only handles status changes for non-rendering updates
  useEffect(() => {
    if (!id || !isGenerating) return;

    const cleanup = subscribeToBank(id, {
      onStatusChange: (status) => {
        if (status === 'COMPLETED' || status === 'FAILED') {
          setIsGenerating(false);
          getQuestionBank(id);
          getQuestions(id);
        }
      },
      // Don't add questions here - GenerationProgress handles the live feed
      // and we fetch all questions from API when generation completes
      onCompleted: () => {
        setIsGenerating(false);
        getQuestionBank(id);
        getQuestions(id);
      },
      onFailed: () => {
        setIsGenerating(false);
        getQuestionBank(id);
      },
    });

    return cleanup;
  }, [id, isGenerating, getQuestionBank, getQuestions]);

  const handleEditQuestion = async (questionId, data) => {
    const result = await updateQuestion(questionId, data);
    if (result.success) {
      setQuestions((prev) =>
        prev.map((q) => (q._id === questionId ? result.question : q))
      );
    }
  };

  const handleRefineQuestion = async (questionId, instruction) => {
    setRefiningQuestionId(questionId);
    const result = await refineQuestion(questionId, instruction);
    if (result.success && result.question) {
      setQuestions((prev) =>
        prev.map((q) => (q._id === questionId ? { ...q, ...result.question } : q))
      );
    }
    setRefiningQuestionId(null);
  };

  const handleDeleteQuestion = async (questionId) => {
    const result = await deleteQuestion(questionId);
    if (result.success) {
      setQuestions((prev) => prev.filter((q) => q._id !== questionId));
    }
  };

  const handleStatusChange = async (questionId, status) => {
    const result = await updateStatus(questionId, status);
    if (result.success) {
      setQuestions((prev) =>
        prev.map((q) => (q._id === questionId ? { ...q, status } : q))
      );
    }
  };

  const handleResetBank = async () => {
    const result = await resetBank(id);
    if (result.success) {
      getQuestionBank(id);
    }
  };

  const handleRetryGeneration = async () => {
    const result = await retryGeneration(id);
    if (result.success) {
      setIsGenerating(true);
      getQuestionBank(id);
    }
  };

  const handleStartGeneration = async () => {
    const result = await startGeneration(id);
    if (result.success) {
      setIsGenerating(true);
      getQuestionBank(id);
    }
  };

  const isStuck = questionBank && ['GENERATING', 'PROCESSING_DOCS', 'FAILED'].includes(questionBank.status);
  const isConfiguring = questionBank?.status === 'CONFIGURING';

  const filteredQuestions = activeSection
    ? questions.filter((q) => q.section === activeSection || q.section?._id === activeSection)
    : questions;

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
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => navigate('/dashboard/question-bank')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                questionBank.status === 'COMPLETED'
                  ? 'bg-emerald-50'
                  : isGenerating
                  ? 'bg-violet-50'
                  : 'bg-neutral-50'
              )}
            >
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
                {questionBank.curriculum} Class {questionBank.grade} • {questionBank.subject}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Always show Reset/Retry for stuck statuses */}
          {['GENERATING', 'PROCESSING_DOCS', 'FAILED'].includes(questionBank.status) && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={handleResetBank}
                disabled={isResetting}
              >
                {isResetting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </>
                )}
              </Button>
              <Button
                size="sm"
                className="h-9 bg-violet-600 hover:bg-violet-700 text-white"
                onClick={handleRetryGeneration}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Retry
                  </>
                )}
              </Button>
            </>
          )}
          {questionBank.status === 'COMPLETED' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9" disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Export
                  <ChevronDown className="w-3 h-3 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportBank(id, 'pdf')}>
                  <FileText className="w-4 h-4 mr-2 text-red-500" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportBank(id, 'docx')}>
                  <FileType className="w-4 h-4 mr-2 text-blue-500" />
                  Export as Word
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportBank(id, 'json')}>
                  <FileJson className="w-4 h-4 mr-2 text-amber-500" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* Generation Progress - Sticky below header */}
      {isGenerating ? (
        <div className="flex-1 min-h-0 flex flex-col">
          <GenerationProgress
            bankId={id}
            sections={sections}
            existingQuestions={questions}
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
      ) : (
        /* Content */
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">

          {/* Stuck/Failed Banner */}
          {!isGenerating && isStuck && (
            <div className={cn(
              'rounded-lg border p-4 mb-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
              questionBank.status === 'FAILED' 
                ? 'bg-red-50 border-red-200' 
                : 'bg-amber-50 border-amber-200'
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    questionBank.status === 'FAILED' ? 'bg-red-100' : 'bg-amber-100'
                  )}>
                    <AlertCircle className={cn(
                      'w-5 h-5',
                      questionBank.status === 'FAILED' ? 'text-red-500' : 'text-amber-500'
                    )} />
                  </div>
                  <div>
                    <h3 className={cn(
                      'text-[14px] font-semibold',
                      questionBank.status === 'FAILED' ? 'text-red-900' : 'text-amber-900'
                    )}>
                      {questionBank.status === 'FAILED' 
                        ? 'Generation Failed' 
                        : 'Generation Stuck'}
                    </h3>
                    <p className={cn(
                      'text-[12px]',
                      questionBank.status === 'FAILED' ? 'text-red-700' : 'text-amber-700'
                    )}>
                      {questionBank.errorMessage || 
                        (questionBank.status === 'FAILED' 
                          ? 'An error occurred during generation' 
                          : 'The generation process appears to be stuck')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={handleResetBank}
                    disabled={isResetting}
                  >
                    {isResetting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4 mr-2" />
                    )}
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 bg-violet-600 hover:bg-violet-700"
                    onClick={handleRetryGeneration}
                    disabled={isRetrying}
                  >
                    {isRetrying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Retry
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Configuring State - Show sections and start button */}
          {!isGenerating && isConfiguring && (
            <div className="space-y-3">
              {/* Basic Info Card */}
              <div className="bg-white rounded-lg border border-neutral-200 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-semibold text-neutral-900">Configuration</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/dashboard/question-bank/${id}/edit`)}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Configuration
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[11px] text-neutral-500">Curriculum</p>
                    <p className="text-[13px] font-medium text-neutral-900">{questionBank.curriculum}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-neutral-500">Grade</p>
                    <p className="text-[13px] font-medium text-neutral-900">Class {questionBank.grade}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-neutral-500">Subject</p>
                    <p className="text-[13px] font-medium text-neutral-900">{questionBank.subject}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-neutral-500">Exam Pattern</p>
                    <p className="text-[13px] font-medium text-neutral-900">{questionBank.examPattern}</p>
                  </div>
                </div>
              </div>

              {/* Sections Card */}
              <div className="bg-white rounded-lg border border-neutral-200 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-[15px] font-semibold text-neutral-900">Sections</h3>
                    <p className="text-[12px] text-neutral-500">
                      {sections.length} section{sections.length !== 1 ? 's' : ''} configured
                    </p>
                  </div>
                  <Button
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                    onClick={handleStartGeneration}
                    disabled={isStarting || sections.length === 0}
                  >
                    {isStarting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Start Generation
                  </Button>
                </div>

                {sections.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-neutral-300 rounded-lg">
                    <FileText className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                    <p className="text-[13px] text-neutral-500">No sections configured</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => navigate(`/dashboard/question-bank/${id}/edit`)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Add Sections
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sections.map((section, index) => (
                      <div
                        key={section._id}
                        className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                            <span className="text-[12px] font-bold text-violet-600">{index + 1}</span>
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-neutral-900">{section.name}</p>
                            <p className="text-[11px] text-neutral-500">
                              {section.questionType} • {section.difficulty} • {section.targetCount} questions • {section.marksPerQuestion} mark{section.marksPerQuestion !== 1 ? 's' : ''} each
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
                        {sections.reduce((sum, s) => sum + s.targetCount, 0)} questions • {sections.reduce((sum, s) => sum + (s.targetCount * s.marksPerQuestion), 0)} marks
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Questions List */}
          {!isGenerating && !isConfiguring && (
            <div className="space-y-3">
              {/* Stats Bar */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-md p-0.5">
                    <button
                      onClick={() => setActiveSection(null)}
                      className={cn(
                        'px-2.5 py-1 text-[11px] font-medium rounded transition-all',
                        !activeSection
                          ? 'bg-violet-50 text-violet-700'
                          : 'text-neutral-600 hover:bg-neutral-50'
                      )}
                    >
                      All
                    </button>
                    {sections.map((section) => (
                      <button
                        key={section._id}
                        onClick={() => setActiveSection(section._id)}
                        className={cn(
                          'px-2.5 py-1 text-[11px] font-medium rounded transition-all',
                          activeSection === section._id
                            ? 'bg-violet-50 text-violet-700'
                            : 'text-neutral-600 hover:bg-neutral-50'
                        )}
                      >
                        {section.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-neutral-200 rounded-md">
                    <span className="text-[10px] font-medium text-neutral-500">Total</span>
                    <span className="text-xs font-bold text-neutral-900">{questions.length}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-md">
                    <span className="text-[10px] font-medium text-emerald-600">Approved</span>
                    <span className="text-xs font-bold text-emerald-700">
                      {questions.filter((q) => q.status === 'APPROVED').length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-100 rounded-md">
                    <span className="text-[10px] font-medium text-amber-600">Flagged</span>
                    <span className="text-xs font-bold text-amber-700">
                      {questions.filter((q) => q.status === 'FLAGGED').length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-50 border border-orange-100 rounded-md">
                    <span className="text-[10px] font-medium text-orange-600">Review</span>
                    <span className="text-xs font-bold text-orange-700">
                      {questions.filter((q) => q.requiresReview).length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Questions */}
              {isQuestionsLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-5 h-5 text-violet-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-neutral-500">Loading questions...</p>
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-neutral-200">
                  <FileText className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-xs text-neutral-500">No questions found</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredQuestions.map((question, index) => (
                    <QuestionCard
                      key={question._id}
                      question={question}
                      index={index + 1}
                      onEdit={handleEditQuestion}
                      onDelete={handleDeleteQuestion}
                      onRefine={handleRefineQuestion}
                      onStatusChange={handleStatusChange}
                      isRefining={refiningQuestionId === question._id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
}
