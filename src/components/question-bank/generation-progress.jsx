import { useEffect, useState, useRef } from 'react';
import { getSocket, joinBankRoom, leaveBankRoom, onBankUpdate } from '@/services/socket';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import MessageFormatter from '@/components/canvas-chat/message-formatter';

export default function GenerationProgress({
  bankId,
  sections,
  existingQuestions = [],
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
  const [sectionShortfalls, setSectionShortfalls] = useState({});
  const questionListRef = useRef(null);
  const initializedRef = useRef(false);
  const seenQuestionIdsRef = useRef(new Set());

  // Initialize sections progress with existing data from backend
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

  // Initialize with existing questions (only once on mount)
  useEffect(() => {
    if (!initializedRef.current && existingQuestions?.length > 0) {
      setGeneratedQuestions(existingQuestions);
      existingQuestions.forEach(q => seenQuestionIdsRef.current.add(q._id));
      initializedRef.current = true;
    }
  }, [existingQuestions]);

  // Socket connection
  useEffect(() => {
    if (!bankId) return;

    getSocket();
    joinBankRoom(bankId);

    const handleUpdate = (data) => {
      console.log('[GenerationProgress] Update:', data);

      switch (data.type) {
        case 'status_change':
          setCurrentStatus(data.status);
          break;

        case 'section_started':
          setSectionProgress((prev) => ({
            ...prev,
            [data.sectionId]: {
              ...prev[data.sectionId],
              status: 'GENERATING',
            },
          }));
          onSectionStarted?.(data.sectionId);
          break;

        case 'question_generated':
          if (seenQuestionIdsRef.current.has(data.question._id)) {
            return;
          }
          seenQuestionIdsRef.current.add(data.question._id);
          
          setGeneratedQuestions((prev) => [...prev, data.question]);
          
          setSectionProgress((prev) => ({
            ...prev,
            [data.sectionId]: {
              ...prev[data.sectionId],
              generatedCount: (prev[data.sectionId]?.generatedCount || 0) + 1,
            },
          }));
          onQuestionGenerated?.(data.question);

          if (questionListRef.current) {
            questionListRef.current.scrollTop = questionListRef.current.scrollHeight;
          }
          break;

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
          onSectionCompleted?.(data.sectionId);
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
          onSectionShortfall?.(data.sectionId, data);
          break;

        case 'generation_completed':
          setCurrentStatus('COMPLETED');
          onGenerationCompleted?.(data);
          break;

        case 'generation_failed':
          setCurrentStatus('FAILED');
          onGenerationFailed?.(data.error);
          break;
      }
    };

    const unsubscribe = onBankUpdate(handleUpdate);

    return () => {
      unsubscribe();
      leaveBankRoom(bankId);
    };
  }, [bankId, onQuestionGenerated, onSectionStarted, onSectionCompleted, onSectionShortfall, onGenerationCompleted, onGenerationFailed]);

  const totalGenerated = Object.values(sectionProgress).reduce(
    (sum, s) => sum + (s.generatedCount || 0),
    0
  );
  const totalTarget = Object.values(sectionProgress).reduce(
    (sum, s) => sum + (s.targetCount || 0),
    0
  );

  // Get current section being generated
  const currentSection = Object.values(sectionProgress).find(s => s.status === 'GENERATING');

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Sticky Progress Bar - Full width, below header */}
      <div className="sticky top-[56px] z-20 w-full px-6 py-2.5 bg-white/95 backdrop-blur-sm border-b border-neutral-100 shadow-[0_1px_2px_rgba(0,0,0,0.04)] shrink-0">
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
                  : currentStatus === 'PROCESSING_DOCS'
                  ? 'Processing Documents...'
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
                const progress = sectionProgress[section._id] || { generatedCount: 0, targetCount: section.targetCount, status: 'PENDING' };
                const sectionPercent = progress.targetCount > 0 ? (progress.generatedCount / progress.targetCount) * 100 : 0;
                const widthPercent = (section.targetCount / totalTarget) * 100;
                
                return (
                  <div 
                    key={section._id} 
                    className="relative bg-neutral-100 rounded-sm overflow-hidden"
                    style={{ width: `${widthPercent}%` }}
                    title={`${section.name}: ${progress.generatedCount}/${progress.targetCount}`}
                  >
                    <div
                      className={cn(
                        'h-full transition-all duration-300',
                        progress.status === 'COMPLETED'
                          ? 'bg-emerald-500'
                          : progress.status === 'GENERATING'
                          ? 'bg-violet-500'
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
                const progress = sectionProgress[section._id] || { generatedCount: 0, targetCount: section.targetCount, status: 'PENDING' };
                
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
                    <span className="opacity-60">{progress.generatedCount}/{progress.targetCount}</span>
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
                <div className="text-center py-12">
                  <Loader2 className="w-6 h-6 text-violet-500 animate-spin mx-auto mb-2" />
                  <p className="text-[12px] text-neutral-500">
                    Waiting for questions...
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {generatedQuestions.map((q, index) => (
                    <div
                      key={q._id || index}
                      className="px-4 py-3 hover:bg-neutral-50/50 transition-colors animate-in fade-in slide-in-from-bottom-1 duration-200"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-[11px] font-bold text-neutral-400 mt-0.5 w-6 text-right shrink-0">
                          {index + 1}.
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] text-neutral-700 leading-relaxed">
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
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
