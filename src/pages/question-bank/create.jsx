import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Upload,
  File,
  X,
  Check,
  Loader2,
  GraduationCap,
  BookOpen,
  FileText,
  Settings,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useCreateQuestionBank,
  useUpdateQuestionBank,
  useAddSourceDocument,
  useStartGeneration,
  useGetQuestionBank,
  useRetryDocumentProcessing,
  useRemoveSourceDocument,
} from '@/services/apis/question-banks';
import { subscribeToBank } from '@/services/socket';

const CURRICULA = ['CBSE', 'ICSE', 'IB', 'IGCSE', 'STATE', 'CUSTOM'];
const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Computer Science', 'Economics', 'Other'];
const EXAM_PATTERNS = ['BOARD', 'OLYMPIAD', 'COMPETITIVE', 'CUSTOM'];
const QUESTION_TYPES = [
  { value: 'MCQ', label: 'MCQ', description: 'Multiple Choice Questions' },
  { value: 'SHORT', label: 'Short Answer', description: '2-3 sentence responses' },
  { value: 'LONG', label: 'Long Answer', description: 'Detailed responses' },
  { value: 'CASE_STUDY', label: 'Case Study', description: 'Scenario-based questions' },
  { value: 'ASSERTION_REASON', label: 'Assertion-Reason', description: 'A-R type questions' },
];
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'HOTS', 'MIXED'];
const BLOOMS_LEVELS = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'];

export default function CreateQuestionBank() {
  const navigate = useNavigate();
  const { id: editId } = useParams(); // If present, we're in edit mode
  const isEditMode = Boolean(editId);
  
  const { createQuestionBank, isLoading: isCreating } = useCreateQuestionBank();
  const { updateQuestionBank, isLoading: isUpdating } = useUpdateQuestionBank();
  const { addSourceDocument, cancelUpload, isLoading: isUploading, progress: uploadProgress } = useAddSourceDocument();
  const { startGeneration, isLoading: isStarting } = useStartGeneration();
  const { questionBank: existingBank, sections: existingSections, getQuestionBank, isLoading: isLoadingBank } = useGetQuestionBank();
  const { retryDocument, isLoading: isRetryingDoc } = useRetryDocumentProcessing();
  const { removeDocument, isLoading: isRemovingDoc } = useRemoveSourceDocument();

  const [step, setStep] = useState(1);
  const [createdBankId, setCreatedBankId] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Step 1: Basic Info
  const [title, setTitle] = useState('');
  const [curriculum, setCurriculum] = useState('CBSE');
  const [grade, setGrade] = useState(10);
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [examPattern, setExamPattern] = useState('BOARD');

  // Step 2: Source Documents
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [fileStatuses, setFileStatuses] = useState({}); // Track upload/processing status per file
  const [isDragging, setIsDragging] = useState(false);
  const [sourceMode, setSourceMode] = useState('HYBRID');
  const [currentUploadIndex, setCurrentUploadIndex] = useState(-1);
  const [existingDocuments, setExistingDocuments] = useState([]); // Existing docs from edit mode
  const [allDocsReady, setAllDocsReady] = useState(true); // Track if all docs are processed

  // Step 3: Sections
  const [sections, setSections] = useState([
    {
      name: 'Section A',
      questionType: 'MCQ',
      targetCount: 10,
      difficulty: 'MIXED',
      bloomsLevel: ['REMEMBER', 'UNDERSTAND'],
      marksPerQuestion: 1,
    },
  ]);

  // Fetch existing bank data in edit mode
  useEffect(() => {
    if (editId) {
      getQuestionBank(editId);
      setCreatedBankId(editId);
    }
  }, [editId, getQuestionBank]);

  // Pre-fill form with existing data
  useEffect(() => {
    if (isEditMode && existingBank && !isInitialized) {
      setTitle(existingBank.title || '');
      setCurriculum(existingBank.curriculum || 'CBSE');
      setGrade(existingBank.grade || 10);
      setSubject(existingBank.subject || '');
      setTopic(existingBank.topic || '');
      setExamPattern(existingBank.examPattern || 'BOARD');
      setSourceMode(existingBank.sourceMode || 'HYBRID');

      // Pre-fill existing documents
      if (existingBank.sourceDocuments?.length > 0) {
        setExistingDocuments(existingBank.sourceDocuments.map(doc => ({
          _id: doc._id,
          name: doc.filename,
          type: doc.type,
          processingStatus: doc.processingStatus || 'COMPLETED',
          hasContent: doc.hasContent,
          contentLength: doc.contentLength || 0,
          isExisting: true
        })));
        // Check if all existing docs are ready
        const allReady = existingBank.sourceDocuments.every(d =>
          d.processingStatus === 'COMPLETED' || d.processingStatus === 'FAILED'
        );
        setAllDocsReady(allReady);
        // If some docs are still processing, start polling
        if (!allReady) {
          setIsPollingDocs(true);
        }
      }

      // Pre-fill sections if they exist
      if (existingSections && existingSections.length > 0) {
        setSections(existingSections.map(s => ({
          _id: s._id,
          name: s.name,
          questionType: s.questionType,
          targetCount: s.targetCount,
          difficulty: s.difficulty,
          bloomsLevel: s.bloomsLevel || ['APPLY'],
          marksPerQuestion: s.marksPerQuestion,
        })));
      }
      
      setIsInitialized(true);
    }
  }, [isEditMode, existingBank, existingSections, isInitialized]);

  // Track whether we need to poll for document processing
  const [isPollingDocs, setIsPollingDocs] = useState(false);
  const pollingRef = useRef(null);

  // Start polling when files are uploaded and processing
  const startDocPolling = useCallback(() => {
    setIsPollingDocs(true);
    setAllDocsReady(false);
  }, []);

  // Poll document processing status
  useEffect(() => {
    if (!createdBankId || !isPollingDocs) return;

    const poll = async () => {
      try {
        const result = await getQuestionBank(createdBankId);
        // getQuestionBank returns response.data = { questionBank, sections }
        const docs = result?.questionBank?.sourceDocuments;
        if (docs && docs.length > 0) {
          setExistingDocuments(docs.map(doc => ({
            _id: doc._id,
            name: doc.filename,
            type: doc.type,
            processingStatus: doc.processingStatus || 'COMPLETED',
            hasContent: doc.hasContent,
            contentLength: doc.contentLength || 0,
            isExisting: true
          })));

          const allDone = docs.every(d =>
            d.processingStatus === 'COMPLETED' || d.processingStatus === 'FAILED'
          );
          if (allDone) {
            setAllDocsReady(true);
            setIsPollingDocs(false);
            // Clear processing statuses for newly uploaded files
            setFileStatuses(prev => {
              const updated = { ...prev };
              Object.keys(updated).forEach(key => {
                if (updated[key].status === 'processing') {
                  updated[key] = { status: 'completed', progress: 100 };
                }
              });
              return updated;
            });
          }
        }
      } catch (e) {
        // Polling failure is non-fatal
      }
    };

    // Poll immediately once, then every 3 seconds
    poll();
    pollingRef.current = setInterval(poll, 3000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [createdBankId, isPollingDocs, getQuestionBank]);

  // Subscribe to socket events for real-time document status updates
  useEffect(() => {
    if (!createdBankId) return;

    const unsubscribe = subscribeToBank(createdBankId, {
      onDocumentStatus: (documentId, data) => {
        console.log('[Create] Document status update:', data);
        const { filename, processingStatus, contentLength } = data;
        
        // Update existingDocuments by matching filename or _id, and check if all done
        setExistingDocuments(prev => {
          const updated = prev.map(doc => {
            if (doc._id === documentId || doc.name === filename) {
              return {
                ...doc,
                processingStatus,
                contentLength: contentLength || doc.contentLength,
                isExisting: true
              };
            }
            return doc;
          });

          // Check if all docs are now done (using the updated array)
          const allDone = updated.length > 0 && updated.every(d =>
            d.processingStatus === 'COMPLETED' || d.processingStatus === 'FAILED'
          );
          if (allDone) {
            setAllDocsReady(true);
            setIsPollingDocs(false);
            // Clear processing statuses for newly uploaded files
            setFileStatuses(prevStatuses => {
              const updatedStatuses = { ...prevStatuses };
              Object.keys(updatedStatuses).forEach(key => {
                if (updatedStatuses[key].status === 'processing') {
                  updatedStatuses[key] = { status: 'completed', progress: 100 };
                }
              });
              return updatedStatuses;
            });
          }

          return updated;
        });
      },
      onStatusChange: (status) => {
        if (status === 'READY') {
          setAllDocsReady(true);
          setIsPollingDocs(false);
        }
      },
    });

    return () => unsubscribe();
  }, [createdBankId]);

  const handleRemoveDocument = async (docId, docName) => {
    if (!createdBankId || !docId) return;
    if (!confirm(`Remove "${docName}"? This cannot be undone.`)) return;
    const result = await removeDocument(createdBankId, docId);
    if (result.success) {
      setExistingDocuments(prev => prev.filter(d => d._id !== docId));
      toast.success(`Removed ${docName}`);
    } else {
      toast.error(`Failed to remove ${docName}: ${result.error}`);
    }
  };

  const handleRetryDocument = async (docId, docName) => {
    if (!createdBankId || !docId) return;
    // Update UI immediately
    setExistingDocuments(prev =>
      prev.map(d => d._id === docId ? { ...d, processingStatus: 'PENDING' } : d)
    );
    setAllDocsReady(false);
    const result = await retryDocument(createdBankId, docId);
    if (!result.success) {
      toast.error(`Failed to retry ${docName}: ${result.error}`);
      setExistingDocuments(prev =>
        prev.map(d => d._id === docId ? { ...d, processingStatus: 'FAILED' } : d)
      );
    }
  };

  const totalQuestions = sections.reduce((sum, s) => sum + (parseInt(s.targetCount) || 0), 0);
  const totalMarks = sections.reduce((sum, s) => sum + (parseInt(s.targetCount) || 0) * (parseInt(s.marksPerQuestion) || 0), 0);

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
    
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === 'application/pdf' || f.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      setUploadedFiles((prev) => [...prev, ...files]);
    }
  }, []);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    setUploadedFiles((prev) => [...prev, ...files]);
  }, []);

  const removeFile = (index) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        name: `Section ${String.fromCharCode(65 + prev.length)}`,
        questionType: 'SHORT',
        targetCount: 5,
        difficulty: 'MIXED',
        bloomsLevel: ['APPLY'],
        marksPerQuestion: 2,
      },
    ]);
  };

  const updateSection = (index, field, value) => {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const removeSection = (index) => {
    if (sections.length > 1) {
      setSections((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      // Only create if we don't already have a bank ID (prevents duplicates)
      if (createdBankId) {
        // Bank already created, just update it
        const result = await updateQuestionBank(createdBankId, {
          title,
          curriculum,
          grade,
          subject,
          topic,
          examPattern,
          sourceMode,
        });
        if (result.success) {
          setStep(2);
        }
      } else {
        // Create new question bank
        const result = await createQuestionBank({
          title,
          curriculum,
          grade,
          subject,
          topic,
          examPattern,
          sourceMode,
        });

        if (result.success) {
          setCreatedBankId(result.questionBank._id);
          setStep(2);
        }
      }
    } else if (step === 2) {
      // Upload documents in parallel with status tracking
      if (createdBankId && uploadedFiles.length > 0) {
        // Mark all as uploading
        const initialStatuses = {};
        uploadedFiles.forEach((_, i) => {
          initialStatuses[i] = { status: 'uploading', progress: 0 };
        });
        setFileStatuses(prev => ({ ...prev, ...initialStatuses }));

        // Upload all files in parallel
        const uploadPromises = uploadedFiles.map((file, i) => {
          return addSourceDocument(createdBankId, file)
            .then(result => {
              if (result.success) {
                setFileStatuses(prev => ({
                  ...prev,
                  [i]: {
                    status: result.processingStarted ? 'processing' : 'completed',
                    progress: 100
                  }
                }));
              } else if (result.cancelled) {
                setFileStatuses(prev => ({
                  ...prev,
                  [i]: { status: 'cancelled', progress: 0 }
                }));
              } else {
                setFileStatuses(prev => ({
                  ...prev,
                  [i]: { status: 'failed', error: result.error, progress: 0 }
                }));
              }
            })
            .catch(err => {
              setFileStatuses(prev => ({
                ...prev,
                [i]: { status: 'failed', error: err.message, progress: 0 }
              }));
            });
        });

        await Promise.allSettled(uploadPromises);
        setCurrentUploadIndex(-1);

        // Start polling to track document processing status
        // We always poll after upload since processing happens asynchronously
        startDocPolling();
      }
      setStep(3);
    } else if (step === 3) {
      // Update existing bank with sections
      if (!createdBankId) {
        console.error('No bank ID found');
        return;
      }

      const result = await updateQuestionBank(createdBankId, {
        sections,
      });

      if (result.success) {
        if (isEditMode) {
          // In edit mode, just save and go back to detail page
          navigate(`/dashboard/question-bank/${createdBankId}`);
        } else {
          // In create mode, check doc readiness before starting generation
          const hasUploadedDocs = existingDocuments.length > 0 || uploadedFiles.length > 0;
          if (hasUploadedDocs && !allDocsReady) {
            toast.warning('Documents are still processing. Please wait for all documents to finish before generating.');
            return;
          }
          await startGeneration(createdBankId);
          navigate(`/dashboard/question-bank/${createdBankId}`);
        }
      }
    }
  };

  // Handler to save and start generation (for edit mode)
  const handleSaveAndGenerate = async () => {
    if (!createdBankId) return;

    // Block if documents are still processing
    const hasUploadedDocs = existingDocuments.length > 0 || uploadedFiles.length > 0;
    if (hasUploadedDocs && !allDocsReady) {
      toast.warning('Documents are still processing. Please wait for all documents to finish before generating.');
      return;
    }

    const result = await updateQuestionBank(createdBankId, {
      sections,
    });

    if (result.success) {
      await startGeneration(createdBankId);
      navigate(`/dashboard/question-bank/${createdBankId}`);
    }
  };

  const canProceed = () => {
    if (step === 1) return title && subject;
    if (step === 2) return true; // Documents are optional
    if (step === 3) return sections.length > 0 && totalQuestions > 0;
    return false;
  };

  // Show loading state while fetching existing bank data in edit mode
  if (isEditMode && isLoadingBank && !isInitialized) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-violet-50/30 items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-4" />
        <p className="text-[13px] text-neutral-500">Loading question bank...</p>
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
            onClick={() => isEditMode ? navigate(`/dashboard/question-bank/${editId}`) : navigate('/dashboard/question-bank')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-neutral-900">
                {isEditMode ? 'Edit Question Bank' : 'Create Question Bank'}
              </h1>
              <p className="text-[11px] text-neutral-500">Step {step} of 3</p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold transition-all',
                  step >= s
                    ? 'bg-violet-600 text-white'
                    : 'bg-neutral-100 text-neutral-400'
                )}
              >
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              <span
                className={cn(
                  'text-[12px] font-medium hidden sm:block',
                  step >= s ? 'text-neutral-900' : 'text-neutral-400'
                )}
              >
                {s === 1 ? 'Basic Info' : s === 2 ? 'Upload Documents' : 'Configure Sections'}
              </span>
              {s < 3 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 rounded-full',
                    step > s ? 'bg-violet-600' : 'bg-neutral-200'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold text-neutral-900">Basic Information</h2>
                  <p className="text-[12px] text-neutral-500">Set up your question bank details</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[12px] font-medium text-neutral-700 mb-2 block">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Physics Chapter 5 Test"
                    className="w-full h-10 px-3 text-[13px] bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-medium text-neutral-700 mb-2 block">
                    Curriculum
                  </label>
                  <select
                    value={curriculum}
                    onChange={(e) => setCurriculum(e.target.value)}
                    className="w-full h-10 px-3 text-[13px] bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  >
                    {CURRICULA.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[12px] font-medium text-neutral-700 mb-2 block">
                    Grade
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(parseInt(e.target.value))}
                    className="w-full h-10 px-3 text-[13px] bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g}>Class {g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[12px] font-medium text-neutral-700 mb-2 block">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full h-10 px-3 text-[13px] bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  >
                    <option value="">Select Subject</option>
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[12px] font-medium text-neutral-700 mb-2 block">
                    Exam Pattern
                  </label>
                  <select
                    value={examPattern}
                    onChange={(e) => setExamPattern(e.target.value)}
                    className="w-full h-10 px-3 text-[13px] bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  >
                    {EXAM_PATTERNS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-[12px] font-medium text-neutral-700 mb-2 block">
                    Topic <span className="text-neutral-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Thermodynamics, Photosynthesis"
                    className="w-full h-10 px-3 text-[13px] bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Upload Documents */}
          {step === 2 && (
            <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold text-neutral-900">Source Documents</h2>
                  <p className="text-[12px] text-neutral-500">Upload PDFs or images for question generation</p>
                </div>
              </div>

              {/* Source Mode */}
              <div>
                <label className="text-[12px] font-medium text-neutral-700 mb-2 block">
                  Generation Mode
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'RESTRICTED', label: 'Restricted', desc: 'Only from uploaded docs' },
                    { value: 'HYBRID', label: 'Hybrid', desc: 'Docs + General knowledge' },
                    { value: 'GENERAL', label: 'General', desc: 'Standard curriculum' },
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setSourceMode(mode.value)}
                      className={cn(
                        'p-3 rounded-lg border-2 text-left transition-all',
                        sourceMode === mode.value
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      )}
                    >
                      <p className={cn(
                        'text-[12px] font-semibold',
                        sourceMode === mode.value ? 'text-violet-700' : 'text-neutral-700'
                      )}>
                        {mode.label}
                      </p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">{mode.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Existing Documents (edit mode) */}
              {existingDocuments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[12px] font-medium text-neutral-700">
                    Previously Uploaded Documents
                  </p>
                  {existingDocuments.map((doc, index) => (
                    <div
                      key={doc._id || index}
                      className={cn(
                        "flex items-center gap-3 p-3 border rounded-lg",
                        doc.processingStatus === 'COMPLETED'
                          ? 'bg-emerald-50 border-emerald-200'
                          : doc.processingStatus === 'FAILED'
                          ? 'bg-red-50 border-red-200'
                          : doc.processingStatus === 'PROCESSING'
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-neutral-50 border-neutral-200'
                      )}
                    >
                      {doc.processingStatus === 'COMPLETED' ? (
                        <Check className="w-5 h-5 text-emerald-500" />
                      ) : doc.processingStatus === 'FAILED' ? (
                        <X className="w-5 h-5 text-red-500" />
                      ) : doc.processingStatus === 'PROCESSING' ? (
                        <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                      ) : (
                        <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-medium text-neutral-700 truncate block">
                          {doc.name}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          {doc.processingStatus === 'COMPLETED'
                            ? `Processed${doc.contentLength ? ` • ${Math.round(doc.contentLength / 1000)}K chars extracted` : ''}`
                            : doc.processingStatus === 'FAILED'
                            ? 'Processing failed'
                            : doc.processingStatus === 'PROCESSING'
                            ? 'Processing document...'
                            : 'Waiting to process...'}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 uppercase shrink-0">
                        {doc.type}
                      </span>
                      {doc.processingStatus === 'FAILED' && doc._id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetryDocument(doc._id, doc.name);
                          }}
                          disabled={isRetryingDoc}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-red-600 bg-red-100 hover:bg-red-200 rounded transition-colors disabled:opacity-50"
                          title="Retry processing"
                        >
                          {isRetryingDoc ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          Retry
                        </button>
                      )}
                      {doc._id && doc.processingStatus !== 'PROCESSING' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveDocument(doc._id, doc.name);
                          }}
                          disabled={isRemovingDoc}
                          className="p-1 hover:bg-red-100 rounded text-neutral-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          title="Remove document"
                        >
                          {isRemovingDoc ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                  {uploadedFiles.length === 0 && (
                    <p className="text-[11px] text-neutral-500 mt-1">
                      You can upload additional documents below
                    </p>
                  )}
                </div>
              )}

              {/* Upload Area */}
              <div
                className={cn(
                  'flex flex-col items-center justify-center px-6 py-10 rounded-lg border-2 border-dashed transition-all cursor-pointer',
                  isDragging
                    ? 'border-violet-400 bg-violet-50'
                    : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50/50'
                )}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,image/*"
                  multiple
                  className="sr-only"
                  onChange={handleFileSelect}
                />
                <Upload className={cn(
                  'w-10 h-10 mb-3',
                  isDragging ? 'text-violet-500' : 'text-neutral-400'
                )} />
                <p className="text-[14px] font-medium text-neutral-700 mb-1">
                  Drop files here or click to upload
                </p>
                <p className="text-[12px] text-neutral-500">
                  PDF, images (PNG, JPG) • Max 10MB each
                </p>
              </div>

              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[12px] font-medium text-neutral-700">
                    {uploadedFiles.length} file(s) selected
                  </p>
                  {uploadedFiles.map((file, index) => {
                    const status = fileStatuses[index];
                    const isCurrentlyUploading = currentUploadIndex === index;
                    
                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center gap-3 p-3 border rounded-lg",
                          status?.status === 'failed' 
                            ? 'bg-red-50 border-red-200'
                            : status?.status === 'completed'
                            ? 'bg-emerald-50 border-emerald-200'
                            : status?.status === 'processing'
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-neutral-50 border-neutral-200'
                        )}
                      >
                        {/* File icon or status icon */}
                        {status?.status === 'uploading' || isCurrentlyUploading ? (
                          <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
                        ) : status?.status === 'processing' ? (
                          <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                        ) : status?.status === 'completed' ? (
                          <Check className="w-5 h-5 text-emerald-500" />
                        ) : status?.status === 'failed' ? (
                          <X className="w-5 h-5 text-red-500" />
                        ) : (
                          <File className="w-5 h-5 text-violet-500" />
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <span className="text-[13px] font-medium text-neutral-700 truncate block">
                            {file.name}
                          </span>
                          {status?.status === 'uploading' && (
                            <div className="mt-1">
                              <div className="h-1 bg-neutral-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-violet-500 transition-all duration-300"
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-neutral-500">{uploadProgress}% uploaded</span>
                            </div>
                          )}
                          {status?.status === 'processing' && (
                            <span className="text-[10px] text-amber-600">Processing document...</span>
                          )}
                          {status?.status === 'completed' && (
                            <span className="text-[10px] text-emerald-600">Ready for generation</span>
                          )}
                          {status?.status === 'failed' && (
                            <span className="text-[10px] text-red-600">{status.error || 'Upload failed'}</span>
                          )}
                        </div>
                        
                        <span className="text-[11px] text-neutral-500 shrink-0">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        
                        {/* Remove/Cancel button */}
                        {isCurrentlyUploading ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelUpload();
                            }}
                            className="p-1 hover:bg-red-100 rounded text-red-500"
                            title="Cancel upload"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        ) : !status?.status || status?.status === 'failed' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(index);
                            }}
                            className="p-1 hover:bg-neutral-200 rounded"
                          >
                            <X className="w-4 h-4 text-neutral-500" />
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Configure Sections */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Document Processing Warning */}
              {!allDocsReady && (existingDocuments.length > 0 || uploadedFiles.length > 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                  <Loader2 className="w-5 h-5 text-amber-500 animate-spin mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[13px] font-medium text-amber-800">
                      Documents are still being processed
                    </p>
                    <p className="text-[11px] text-amber-600 mt-0.5">
                      You can configure sections while documents are processing.
                      Generation will be available once all documents are ready.
                    </p>
                  </div>
                </div>
              )}
              <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
                      <Settings className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <h2 className="text-[16px] font-semibold text-neutral-900">Configure Sections</h2>
                      <p className="text-[12px] text-neutral-500">Define question types and distribution</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-semibold text-violet-600">{totalQuestions} Questions</p>
                    <p className="text-[11px] text-neutral-500">{totalMarks} Marks Total</p>
                  </div>
                </div>

                {/* Sections */}
                <div className="space-y-4 mt-4">
                  {sections.map((section, index) => (
                    <div
                      key={index}
                      className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <input
                          type="text"
                          value={section.name}
                          onChange={(e) => updateSection(index, 'name', e.target.value)}
                          className="text-[14px] font-semibold bg-transparent border-none focus:outline-none text-neutral-900"
                        />
                        {sections.length > 1 && (
                          <button
                            onClick={() => removeSection(index)}
                            className="p-1 hover:bg-neutral-200 rounded text-neutral-500 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <label className="text-[10px] font-medium text-neutral-500 mb-1 block">
                            Type
                          </label>
                          <select
                            value={section.questionType}
                            onChange={(e) => updateSection(index, 'questionType', e.target.value)}
                            className="w-full h-9 px-2 text-[12px] bg-white border border-neutral-200 rounded-lg"
                          >
                            {QUESTION_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-neutral-500 mb-1 block">
                            Questions
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={section.targetCount}
                            onChange={(e) => {
                              const raw = e.target.value;
                              updateSection(index, 'targetCount', raw === '' ? '' : (parseInt(raw) || 0));
                            }}
                            onBlur={(e) => {
                              const n = parseInt(e.target.value);
                              updateSection(index, 'targetCount', isNaN(n) || n < 1 ? 1 : n > 50 ? 50 : n);
                            }}
                            className="w-full h-9 px-2 text-[12px] bg-white border border-neutral-200 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-neutral-500 mb-1 block">
                            Difficulty
                          </label>
                          <select
                            value={section.difficulty}
                            onChange={(e) => updateSection(index, 'difficulty', e.target.value)}
                            className="w-full h-9 px-2 text-[12px] bg-white border border-neutral-200 rounded-lg"
                          >
                            {DIFFICULTIES.map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-neutral-500 mb-1 block">
                            Marks Each
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={section.marksPerQuestion}
                            onChange={(e) => {
                              const raw = e.target.value;
                              updateSection(index, 'marksPerQuestion', raw === '' ? '' : (parseInt(raw) || 0));
                            }}
                            onBlur={(e) => {
                              const n = parseInt(e.target.value);
                              updateSection(index, 'marksPerQuestion', isNaN(n) || n < 1 ? 1 : n > 20 ? 20 : n);
                            }}
                            className="w-full h-9 px-2 text-[12px] bg-white border border-neutral-200 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  onClick={addSection}
                  className="w-full mt-4 h-10 text-[12px]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Section
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-white border-t flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            if (step > 1) {
              setStep(step - 1);
            } else if (isEditMode) {
              navigate(`/dashboard/question-bank/${editId}`);
            } else {
              navigate('/dashboard/question-bank');
            }
          }}
          disabled={isCreating || isUpdating || isUploading || isStarting}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>

        <div className="flex items-center gap-2">
          {/* In edit mode on step 3, show both Save and Save & Generate buttons */}
          {isEditMode && step === 3 && (
            <Button
              variant="outline"
              onClick={handleSaveAndGenerate}
              disabled={!canProceed() || isCreating || isUpdating || isUploading || isStarting}
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Save & Generate
                </>
              )}
            </Button>
          )}
          
          <Button
            onClick={handleNext}
            disabled={!canProceed() || isCreating || isUpdating || isUploading || isStarting}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
          >
            {(isCreating || isUpdating || isUploading) ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : step === 3 ? (
              isEditMode ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Questions
                </>
              )
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
