import { useEffect, useState, useRef } from 'react';
import { getSocket, joinBankRoom, leaveBankRoom, onBankUpdate } from '@/services/socket';
import { Loader2, CheckCircle2, AlertCircle, AlertTriangle, ShieldCheck, Flag, XCircle, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import MessageFormatter from '@/components/canvas-chat/message-formatter';

const PHASES = [
  { key: 'PREPARING', label: 'Preparing', description: 'Building context from documents...' },
  { key: 'GENERATING', label: 'Generating', description: 'Creating questions...' },
  { key: 'COMPLETE', label: 'Complete', description: 'All questions generated and verified' },
];

export default function GenerationProgress({
  bankId,
  sections,
  existingQuestions = [],
  initialStatus,
  onQuestionGenerated,
  onSectionStarted,
  onSectionCompleted,
  onSectionShortfall,
  onGenerationCompleted,
  onGenerationFailed,
}) {
  const [sectionProgress, setSectionProgress] = useState({});
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [currentStatus, setCurrentStatus] = useState('GENERATING');
  const [currentPhase, setCurrentPhase] = useState(() => {
    if (initialStatus === 'GENERATING') return 'GENERATING';
    return 'PREPARING';
  });
  const [sectionShortfalls, setSectionShortfalls] = useState({});
  const [verificationResults, setVerificationResults] = useState({});
  const [verificationStats, setVerificationStats] = useState({ verified: 0, flagged: 0, failed: 0, fixed: 0, rejected: 0 });
  const questionListRef = useRef(null);
  const initializedRef = useRef(false);
  const seenQuestionIdsRef = useRef(new Set());

  useEffect(() => {
    const initialProgress = {};
    sections?.forEach((section) => {
      const isCompleted = section.generatedCount >= section.targetCount;
      initialProgress[section._id] = {
        status: isCompleted ? 'COMPLETED' : (section.generatedCount > 0 ? 'GENERATING' : 'PENDING'),
        generatedCount: section.generatedCount || 0,
        targetCount: section.targetCount,
        name: section.name,
        questionType: section.questionType,
      };
    });
    setSectionProgress(initialProgress);
  }, [sections]);

  useEffect(() => {
    if (!initializedRef.current && existingQuestions?.length > 0) {
      setGeneratedQuestions(existingQuestions);
      existingQuestions.forEach(q => seenQuestionIdsRef.current.add(q._id));
      initializedRef.current = true;
    }
  }, [existingQuestions]);

  const currentPhaseRef = useRef(currentPhase);
  useEffect(() => { currentPhaseRef.current = currentPhase; }, [currentPhase]);

  const callbacksRef = useRef({ onQuestionGenerated, onSectionStarted, onSectionCompleted, onSectionShortfall, onGenerationCompleted, onGenerationFailed });
  useEffect(() => {
    callbacksRef.current = { onQuestionGenerated, onSectionStarted, onSectionCompleted, onSectionShortfall, onGenerationCompleted, onGenerationFailed };
  }, [onQuestionGenerated, onSectionStarted, onSectionCompleted, onSectionShortfall, onGenerationCompleted, onGenerationFailed]);

  const smartScroll = () => {
    const el = questionListRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  };
  useEffect(() => {
    if (!bankId) return;

    // Ensure socket is alive (handles stale disconnections)
    const socket = getSocket();
    if (!socket.connected && !socket.active) {
      socket.connect();
    }
    joinBankRoom(bankId);

    const handleUpdate = (data) => {
      console.log('[GenerationProgress] Update:', data);

      switch (data.type) {
        case 'status_change':
          setCurrentStatus(data.status);
          break;

        case 'phase_change':
          if (data.phase === 'VERIFYING') break;
          setCurrentPhase(data.phase);
          if (data.phase === 'GENERATING') setCurrentStatus('GENERATING');
          if (data.phase === 'COMPLETE') setCurrentStatus('COMPLETED');
          break;

        case 'section_started':
          if (currentPhaseRef.current === 'PREPARING') setCurrentPhase('GENERATING');
          setSectionProgress((prev) => ({
            ...prev,
            [data.sectionId]: {
              ...prev[data.sectionId],
              status: 'GENERATING',
            },
          }));
          callbacksRef.current.onSectionStarted?.(data.sectionId);
          break;

        case 'question_generated':
          if (seenQuestionIdsRef.current.has(data.question._id)) {
            return;
          }
          seenQuestionIdsRef.current.add(data.question._id);
          
          if (currentPhaseRef.current === 'PREPARING') setCurrentPhase('GENERATING');
          
          setGeneratedQuestions((prev) => [...prev, { ...data.question, sectionId: data.sectionId }]);
          
          callbacksRef.current.onQuestionGenerated?.(data.question);
          smartScroll();
          break;

        case 'questions_batch': {
          const incoming = Array.isArray(data.questions) ? data.questions : [];
          if (incoming.length === 0) return;

          const unique = [];

          incoming.forEach((q) => {
            if (!q || !q._id || seenQuestionIdsRef.current.has(q._id)) return;
            seenQuestionIdsRef.current.add(q._id);
            unique.push(q);
          });

          if (unique.length === 0) return;

          if (currentPhaseRef.current === 'PREPARING') setCurrentPhase('GENERATING');

          setGeneratedQuestions((prev) => [...prev, ...unique]);

          unique.forEach((q) => callbacksRef.current.onQuestionGenerated?.(q));
          smartScroll();
          break;
        }

        case 'section_completed':
          setSectionProgress((prev) => ({
            ...prev,
            [data.sectionId]: {
              ...prev[data.sectionId],
              status: 'COMPLETED',
              generatedCount: data.generatedCount || prev[data.sectionId]?.generatedCount || 0,
              flaggedCount: data.flaggedCount || 0,
            },
          }));
          callbacksRef.current.onSectionCompleted?.(data.sectionId);
          break;

        case 'section_shortfall':
          setSectionProgress((prev) => ({
            ...prev,
            [data.sectionId]: {
              ...prev[data.sectionId],
              status: 'COMPLETED',
              generatedCount: data.generatedCount,
              shortfall: data.shortfall,
            },
          }));
          setSectionShortfalls((prev) => ({
            ...prev,
            [data.sectionId]: {
              shortfall: data.shortfall,
              targetCount: data.targetCount,
              generatedCount: data.generatedCount,
              rejectionSummary: data.rejectionSummary,
            },
          }));
          callbacksRef.current.onSectionShortfall?.(data.sectionId, data);
          break;

        case 'question_verified': {
          // Verification badges arrive progressively during generation
          const results = data.results || [];
          setVerificationResults((prev) => {
            const updated = { ...prev };
            results.forEach((r) => {
              const key = `${r.sectionId}_${r.order}`;
              updated[key] = r;
            });
            return updated;
          });
          setVerificationStats((prev) => {
            let verified = prev.verified;
            let flagged = prev.flagged;
            let failed = prev.failed;
            let fixed = prev.fixed;
            let rejected = prev.rejected;
            results.forEach((r) => {
              if (r.action === 'pass') verified++;
              else if (r.action === 'flag') flagged++;
              else if (r.action === 'fix') fixed++;
              else if (r.action === 'reject') rejected++;
            });
            return { verified, flagged, failed, fixed, rejected };
          });
          break;
        }

        case 'question_updated': {
          // Auto-fix: replace the question in the feed with the updated version
          if (data.question) {
            setGeneratedQuestions((prev) =>
              prev.map((q) =>
                q._id === data.question._id
                  ? { ...q, ...data.question, autoFixed: true }
                  : q
              )
            );
            // Also update verification result to show as fixed
            if (data.sectionId && data.order) {
              const key = `${data.sectionId}_${data.order}`;
              setVerificationResults((prev) => ({
                ...prev,
                [key]: { action: 'fix', issues: data.fixes ? Object.keys(data.fixes) : [], fixedFields: data.fixedFields }
              }));
            }
            setVerificationStats((prev) => ({
              ...prev,
              fixed: prev.fixed + 1
            }));
          }
          break;
        }

        case 'question_rejected': {
          // Mark the question as rejected (strike through in UI)
          if (data.questionId) {
            setGeneratedQuestions((prev) =>
              prev.map((q) =>
                q._id === data.questionId
                  ? { ...q, rejected: true, verificationStatus: 'REJECTED' }
                  : q
              )
            );
            if (data.sectionId && data.order) {
              const key = `${data.sectionId}_${data.order}`;
              setVerificationResults((prev) => ({
                ...prev,
                [key]: { action: 'reject', issues: data.issues || [] }
              }));
            }
            setVerificationStats((prev) => ({
              ...prev,
              rejected: prev.rejected + 1
            }));
          }
          break;
        }

        case 'verification_completed':
          // Just update final stats -- don't change phase (it's already COMPLETE or will be)
          if (data.verifiedCount !== undefined) {
            setVerificationStats((prev) => ({
              ...prev,
              verified: data.verifiedCount || prev.verified,
              flagged: data.flaggedCount || prev.flagged,
              fixed: data.fixedCount || prev.fixed,
              rejected: data.rejectedCount || prev.rejected,
            }));
          }
          break;

        case 'generation_completed':
          setCurrentStatus('COMPLETED');
          setCurrentPhase('COMPLETE');
          callbacksRef.current.onGenerationCompleted?.(data);
          break;

        case 'generation_failed':
          setCurrentStatus('FAILED');
          callbacksRef.current.onGenerationFailed?.(data.error);
          break;
      }
    };

    const unsubscribe = onBankUpdate(handleUpdate);

    return () => {
      unsubscribe();
      leaveBankRoom(bankId);
    };
  }, [bankId]);

  // Derive counts from the actual questions array (single source of truth)
  const activeQuestions = generatedQuestions.filter(q => !q.rejected);
  const totalGenerated = activeQuestions.length;
  const totalTarget = Object.values(sectionProgress).reduce(
    (sum, s) => sum + (s.targetCount || 0),
    0
  );

  // Per-section generated counts (used by pills + progress bar)
  const sectionGeneratedCounts = {};
  activeQuestions.forEach(q => {
    const sid = String(q.sectionId || q.section?._id || q.section || '');
    if (sid) sectionGeneratedCounts[sid] = (sectionGeneratedCounts[sid] || 0) + 1;
  });

  // Get current section being generated
  const currentSection = Object.values(sectionProgress).find(s => s.status === 'GENERATING');

  // Get the current phase index
  const currentPhaseIndex = PHASES.findIndex(p => p.key === currentPhase);
  const totalVerified = verificationStats.verified + verificationStats.flagged + verificationStats.failed + verificationStats.fixed + verificationStats.rejected;

  // Helper to get verification status for a question
  const getQuestionVerification = (question) => {
    const sectionId = question.sectionId || question.section;
    const key = `${sectionId}_${question.order}`;
    return verificationResults[key];
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Phase Timeline */}
      <div className="top-[56px] w-full bg-white/95 backdrop-blur-sm border-b border-neutral-100 shadow-[0_1px_2px_rgba(0,0,0,0.04)] shrink-0">
        {/* Multi-phase stepper */}
        <div className="px-6 pt-3 pb-1">
          <div className="flex items-center justify-between">
            {PHASES.map((phase, index) => {
              const isActive = currentPhaseIndex === index;
              const isCompleted = currentPhaseIndex > index || currentStatus === 'COMPLETED';

              return (
                <div key={phase.key} className="flex items-center flex-1">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300',
                      isCompleted ? 'bg-emerald-500 text-white' :
                      isActive ? 'bg-violet-500 text-white ring-2 ring-violet-200' :
                      'bg-neutral-100 text-neutral-400'
                    )}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isActive ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="hidden sm:block">
                      <p className={cn(
                        'text-[11px] font-semibold leading-tight',
                        isActive ? 'text-violet-700' :
                        isCompleted ? 'text-emerald-700' :
                        'text-neutral-400'
                      )}>
                        {phase.label}
                      </p>
                    </div>
                  </div>
                  {index < PHASES.length - 1 && (
                    <div className={cn(
                      'flex-1 h-0.5 mx-2 rounded-full transition-all duration-500',
                      isCompleted ? 'bg-emerald-300' :
                      isActive ? 'bg-violet-200' :
                      'bg-neutral-100'
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress details bar */}
        <div className="px-6 py-2.5">
          <div className="flex items-center gap-3">
            {/* Status Icon */}
            {currentStatus === 'COMPLETED' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : currentStatus === 'FAILED' ? (
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            ) : (
              <Loader2 className="w-5 h-5 text-violet-500 animate-spin shrink-0" />
            )}
            
            {/* Progress Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] font-medium text-neutral-800">
                  {currentStatus === 'COMPLETED'
                    ? 'Generation Complete'
                    : currentStatus === 'FAILED'
                    ? 'Generation Failed'
                    : currentPhase === 'PREPARING'
                    ? 'Building context from documents...'
                    : currentSection 
                    ? `Generating ${currentSection.name}...`
                    : 'Starting...'}
                </span>
                <span className="text-[12px] text-neutral-500">
                  {totalGenerated}/{totalTarget}
                </span>
              </div>
              
              {/* Segmented Progress Bar */}
              <div className="flex gap-0.5 h-2">
                {sections?.map((section) => {
                  const progress = sectionProgress[section._id] || { targetCount: section.targetCount, status: 'PENDING' };
                  const genCount = sectionGeneratedCounts[section._id] || 0;
                  const sectionPercent = progress.targetCount > 0 ? (genCount / progress.targetCount) * 100 : 0;
                  const widthPercent = (section.targetCount / totalTarget) * 100;
                  
                  return (
                    <div 
                      key={section._id} 
                      className="relative bg-neutral-100 rounded-sm overflow-hidden"
                      style={{ width: `${widthPercent}%` }}
                      title={`${section.name}: ${genCount}/${progress.targetCount}`}
                    >
                      <div
                        className={cn(
                          'h-full transition-all duration-300',
                          progress.status === 'COMPLETED'
                            ? 'bg-emerald-500'
                            : progress.status === 'GENERATING'
                            ? 'bg-violet-500 animate-pulse'
                            : 'bg-neutral-300'
                        )}
                        style={{ width: `${sectionPercent}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              
              {/* Section Pills */}
              <div className="flex items-center gap-2 mt-2 overflow-x-auto">
                {sections?.map((section) => {
                  const progress = sectionProgress[section._id] || { targetCount: section.targetCount, status: 'PENDING' };
                  const genCount = sectionGeneratedCounts[section._id] || 0;
                  
                  return (
                    <div
                      key={section._id}
                      className={cn(
                        'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 transition-colors',
                        progress.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : progress.status === 'GENERATING'
                          ? 'bg-violet-50 text-violet-700'
                          : 'bg-neutral-100 text-neutral-500'
                      )}
                    >
                      {progress.status === 'COMPLETED' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : progress.status === 'GENERATING' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-current opacity-40" />
                      )}
                      <span>{section.name}</span>
                      <span className="opacity-60">{genCount}/{progress.targetCount}</span>
                      {progress.shortfall > 0 && (
                        <span className="text-amber-600 text-[9px] font-medium ml-1">
                          (-{progress.shortfall})
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Summary (shown as verification badges arrive -- now inline with generation) */}
      {totalVerified > 0 && (
        <div className="px-4 pt-3">
          <div className="bg-white border border-neutral-200 rounded-lg p-3 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-[12px] font-medium text-neutral-700">Verification</span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {verificationStats.verified} verified
              </span>
              {verificationStats.fixed > 0 && (
                <span className="flex items-center gap-1 text-blue-600">
                  <Wrench className="w-3.5 h-3.5" />
                  {verificationStats.fixed} auto-fixed
                </span>
              )}
              {verificationStats.flagged > 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <Flag className="w-3.5 h-3.5" />
                  {verificationStats.flagged} flagged
                </span>
              )}
              {verificationStats.rejected > 0 && (
                <span className="flex items-center gap-1 text-red-600">
                  <XCircle className="w-3.5 h-3.5" />
                  {verificationStats.rejected} rejected
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shortfall Warnings */}
      {Object.keys(sectionShortfalls).length > 0 && (
        <div className="px-4 pb-4">
          {Object.entries(sectionShortfalls).map(([sectionId, shortfall]) => {
            const section = sections?.find(s => s._id === sectionId || s.id === sectionId);
            return (
              <div
                key={sectionId}
                className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-amber-900">
                      {section?.name || 'Section'} completed with shortfall
                    </p>
                    <p className="text-[11px] text-amber-700 mt-1">
                      Generated {shortfall.generatedCount} of {shortfall.targetCount} questions.
                      Missing {shortfall.shortfall} question{shortfall.shortfall !== 1 ? 's' : ''}.
                    </p>
                    {shortfall.rejectionSummary && (
                      <div className="mt-2 text-[10px] text-amber-700">
                        {shortfall.rejectionSummary.wrongSubjectCount > 0 && (
                          <p>• {shortfall.rejectionSummary.wrongSubjectCount} wrong subject</p>
                        )}
                        {shortfall.rejectionSummary.offTopicCount > 0 && (
                          <p>• {shortfall.rejectionSummary.offTopicCount} off-topic</p>
                        )}
                        {shortfall.rejectionSummary.otherCount > 0 && (
                          <p>• {shortfall.rejectionSummary.otherCount} other issues</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Live Question Feed */}
      <div className="flex-1 min-h-0 flex flex-col p-4">
        <div className="max-w-4xl mx-auto w-full flex-1 min-h-0 flex flex-col">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between shrink-0">
              <span className="text-[13px] font-semibold text-neutral-900">
                Generated Questions
              </span>
              <span className="text-[11px] text-violet-600 font-medium">
                {generatedQuestions.length} questions
              </span>
            </div>
            <div
              ref={questionListRef}
              className="flex-1 min-h-0 overflow-y-auto"
            >
              {generatedQuestions.length === 0 ? (
                <div className="py-6 px-4">
                  {/* Skeleton placeholder rows while waiting */}
                  <div className="space-y-3 mb-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-start gap-3 animate-pulse">
                        <div className="w-6 h-4 bg-neutral-100 rounded mt-0.5" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 bg-neutral-100 rounded w-full" />
                          <div className="h-3.5 bg-neutral-100 rounded w-3/4" />
                          <div className="flex gap-1.5 mt-1">
                            <div className="h-4 w-10 bg-neutral-100 rounded" />
                            <div className="h-4 w-14 bg-neutral-100 rounded" />
                            <div className="h-4 w-16 bg-neutral-100 rounded" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[12px] text-neutral-400 text-center">
                    {currentPhase === 'PREPARING'
                      ? 'Building context from your documents...'
                      : 'Generating questions...'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {generatedQuestions.map((q, index) => {
                    const verification = getQuestionVerification(q);
                    
                    return (
                      <div
                        key={q._id || index}
                        className={cn(
                          "px-4 py-3 hover:bg-neutral-50/50 transition-colors animate-in fade-in slide-in-from-bottom-1 duration-200",
                          q.rejected && "opacity-50"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-[11px] font-bold text-neutral-400 mt-0.5 w-6 text-right shrink-0">
                            {index + 1}.
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className={cn(
                              "text-[12px] text-neutral-700 leading-relaxed",
                              q.rejected && "line-through text-neutral-400"
                            )}>
                              <MessageFormatter>{q.text}</MessageFormatter>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
                                {q.type}
                              </span>
                              <span className={cn(
                                'text-[9px] font-medium px-1.5 py-0.5 rounded',
                                q.difficulty === 'EASY' ? 'bg-green-50 text-green-600' :
                                q.difficulty === 'MEDIUM' ? 'bg-amber-50 text-amber-600' :
                                q.difficulty === 'HARD' ? 'bg-orange-50 text-orange-600' :
                                'bg-red-50 text-red-600'
                              )}>
                                {q.difficulty}
                              </span>
                              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-violet-50 text-violet-600">
                                {q.bloomsLevel}
                              </span>
                              {q.requiresReview && (
                                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-orange-50 text-orange-600">
                                  Needs Review
                                </span>
                              )}
                              {/* Verification Badge */}
                              {verification ? (
                                <span className={cn(
                                  'flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded transition-all duration-300',
                                  verification.action === 'pass'
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : verification.action === 'fix'
                                    ? 'bg-blue-50 text-blue-600'
                                    : verification.action === 'flag'
                                    ? 'bg-amber-50 text-amber-600'
                                    : 'bg-red-50 text-red-600'
                                )}>
                                  {verification.action === 'pass' ? (
                                    <><CheckCircle2 className="w-3 h-3" /> Verified</>
                                  ) : verification.action === 'fix' ? (
                                    <><Wrench className="w-3 h-3" /> Auto-fixed</>
                                  ) : verification.action === 'flag' ? (
                                    <><Flag className="w-3 h-3" /> Flagged</>
                                  ) : (
                                    <><XCircle className="w-3 h-3" /> Rejected</>
                                  )}
                                </span>
                              ) : currentStatus !== 'COMPLETED' && currentStatus !== 'FAILED' ? (
                                <span className="flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded bg-neutral-50 text-neutral-400">
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" /> Checking...
                                </span>
                              ) : null}
                            </div>
                            {/* Verification Issues (if flagged/rejected) */}
                            {verification && verification.action !== 'pass' && verification.issues?.length > 0 && (
                              <div className="mt-1.5 text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1">
                                {verification.issues.map((issue, i) => (
                                  <p key={i}>• {issue}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
