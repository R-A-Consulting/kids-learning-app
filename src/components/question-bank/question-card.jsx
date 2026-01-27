import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Edit2,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Flag,
  Loader2,
  Lightbulb,
  BookOpen,
  X,
  Plus,
  MoreVertical,
  Check,
  Save,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import MessageFormatter from '@/components/canvas-chat/message-formatter';

const DIFFICULTY_COLORS = {
  EASY: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-100',
  HARD: 'bg-orange-50 text-orange-700 border-orange-100',
  HOTS: 'bg-red-50 text-red-700 border-red-100',
};

const BLOOMS_COLORS = {
  REMEMBER: 'bg-slate-50 text-slate-700 border-slate-100',
  UNDERSTAND: 'bg-blue-50 text-blue-700 border-blue-100',
  APPLY: 'bg-violet-50 text-violet-700 border-violet-100',
  ANALYZE: 'bg-purple-50 text-purple-700 border-purple-100',
  EVALUATE: 'bg-pink-50 text-pink-700 border-pink-100',
  CREATE: 'bg-rose-50 text-rose-700 border-rose-100',
};

export default function QuestionCard({
  question,
  index,
  onEdit,
  onDelete,
  onRefine,
  onStatusChange,
  isRefining = false,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [refineDialogOpen, setRefineDialogOpen] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState('');
  
  // Inline Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState(question);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setEditedQuestion(question);
    }
  }, [question, isEditing]);

  useEffect(() => {
    // Check for deep equality to determine if changes exist
    const isChanged = JSON.stringify(editedQuestion) !== JSON.stringify(question);
    setHasChanges(isChanged);
  }, [editedQuestion, question]);

  const handleSave = async () => {
    await onEdit(question._id, editedQuestion);
    setIsEditing(false);
    setHasChanges(false);
  };

  const handleCancel = () => {
    setEditedQuestion(question);
    setIsEditing(false);
    setHasChanges(false);
  };

  const updateField = (field, value) => {
    setEditedQuestion(prev => ({ ...prev, [field]: value }));
  };

  const updateOption = (idx, field, value) => {
    const newOptions = [...(editedQuestion.options || [])];
    if (newOptions[idx]) {
      newOptions[idx] = { ...newOptions[idx], [field]: value };
      setEditedQuestion(prev => ({ ...prev, options: newOptions }));
    }
  };

  const handleRefine = async () => {
    if (!refineInstruction.trim()) return;
    await onRefine(question._id, refineInstruction);
    setRefineDialogOpen(false);
    setRefineInstruction('');
  };

  return (
    <div
      className={cn(
        'group relative bg-white rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md',
        question.status === 'APPROVED' ? 'border-emerald-100 ring-1 ring-emerald-50' :
        question.status === 'FLAGGED' ? 'border-amber-100 ring-1 ring-amber-50' :
        question.status === 'REJECTED' ? 'border-red-100 ring-1 ring-red-50' :
        'border-neutral-100 hover:border-neutral-200'
      )}
    >
      {/* Status Indicator Strip */}
      <div className={cn(
        'absolute left-0 top-4 bottom-4 w-1 rounded-r-full transition-colors',
        question.status === 'APPROVED' ? 'bg-emerald-400' :
        question.status === 'FLAGGED' ? 'bg-amber-400' :
        question.status === 'REJECTED' ? 'bg-red-400' :
        'bg-transparent'
      )} />

      <div className="p-3 pl-4">
        {/* Header: Badges & Actions */}
        <div className="flex items-start justify-between mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-neutral-400">Q{index}</span>
            <span className={cn(
              'text-[9px] font-medium px-2 py-0.5 rounded-full border',
              question.type === 'MCQ' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-purple-50 text-purple-700 border-purple-100'
            )}>
              {question.type}
            </span>
            <span className={cn(
              'text-[9px] font-medium px-2 py-0.5 rounded-full border',
              DIFFICULTY_COLORS[question.difficulty] || 'bg-neutral-50 text-neutral-600 border-neutral-100'
            )}>
              {question.difficulty}
            </span>
            <span className={cn(
              'text-[9px] font-medium px-2 py-0.5 rounded-full border',
              BLOOMS_COLORS[question.bloomsLevel] || 'bg-neutral-50 text-neutral-600 border-neutral-100'
            )}>
              {question.bloomsLevel}
            </span>
            <span className="text-[9px] text-neutral-400 font-medium">
              {question.marks}m
            </span>
          </div>

          {/* Action Toolbar - Visible on Hover or Editing */}
          <div className={cn(
            "flex items-center gap-0.5 transition-opacity duration-200",
            isEditing || isExpanded ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}>
            {isEditing ? (
              <>
                <Button variant="ghost" size="sm" onClick={handleCancel} className="h-6 w-6 p-0 text-neutral-400 hover:text-neutral-600">
                  <X className="w-3.5 h-3.5" />
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSave} 
                  disabled={!hasChanges}
                  className="h-6 px-2 text-[10px] bg-violet-600 hover:bg-violet-700 text-white"
                >
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-6 w-6 p-0 text-neutral-400 hover:text-violet-600 hover:bg-violet-50"
                  title="Edit Question"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRefineDialogOpen(true)}
                  className="h-6 w-6 p-0 text-neutral-400 hover:text-violet-600 hover:bg-violet-50"
                  title="Refine with AI"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-neutral-400 hover:text-neutral-600">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => onStatusChange(question._id, 'APPROVED')} className="text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onStatusChange(question._id, 'FLAGGED')} className="text-amber-600">
                      <Flag className="w-3.5 h-3.5 mr-2" /> Flag
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(question._id)} className="text-red-600">
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>

        {/* Question Stem */}
        <div className="mb-3">
          {isEditing ? (
            <Textarea
              value={editedQuestion.text}
              onChange={(e) => updateField('text', e.target.value)}
              className="min-h-[60px] text-sm leading-relaxed border-neutral-200 focus:border-violet-300 focus:ring-violet-100 resize-none"
              placeholder="Enter question text..."
            />
          ) : (
            <div 
              className="text-sm text-neutral-800 leading-relaxed cursor-text hover:text-neutral-900"
              onClick={() => !isEditing && setIsEditing(true)}
            >
              <MessageFormatter>{question.text}</MessageFormatter>
            </div>
          )}
        </div>

        {/* Options (MCQ) */}
        {question.type === 'MCQ' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {(isEditing ? editedQuestion.options : question.options)?.map((opt, idx) => (
              <div 
                key={opt.id}
                className={cn(
                  "relative flex items-start gap-2 p-2 rounded-md border transition-colors",
                  !isEditing && opt.id === question.correctAnswer 
                    ? "bg-emerald-50/50 border-emerald-100" 
                    : "bg-white border-neutral-100"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 mt-0.5",
                  !isEditing && opt.id === question.correctAnswer
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-neutral-100 text-neutral-500"
                )}>
                  {opt.id.toUpperCase()}
                </div>
                
                {isEditing ? (
                  <div className="flex-1 min-w-0">
                    <Input
                      value={opt.text}
                      onChange={(e) => updateOption(idx, 'text', e.target.value)}
                      className="h-7 text-xs border-transparent bg-transparent hover:bg-neutral-50 focus:bg-white focus:border-neutral-200 px-0"
                    />
                  </div>
                ) : (
                  <div className="flex-1 text-xs text-neutral-700 pt-0.5">
                    <MessageFormatter inline>{opt.text}</MessageFormatter>
                  </div>
                )}

                {isEditing ? (
                  <button
                    onClick={() => updateField('correctAnswer', opt.id)}
                    className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center transition-colors shrink-0",
                      editedQuestion.correctAnswer === opt.id
                        ? "text-emerald-500 bg-emerald-50"
                        : "text-neutral-300 hover:text-neutral-400"
                    )}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  opt.id === question.correctAnswer && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  )
                )}
              </div>
            ))}
          </div>
        )}

        {/* Expand Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-[10px] font-medium text-neutral-400 hover:text-violet-600 transition-colors mt-1.5"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              Show Details
            </>
          )}
        </button>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-2.5 pt-2.5 border-t border-neutral-100 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Answer (Non-MCQ) */}
            {question.type !== 'MCQ' && (
              <div>
                <Label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1 block">
                  Model Answer
                </Label>
                {isEditing ? (
                  <Textarea
                    value={editedQuestion.answer}
                    onChange={(e) => updateField('answer', e.target.value)}
                    className="min-h-[60px] text-xs bg-emerald-50/30 border-emerald-100 focus:border-emerald-300 focus:ring-emerald-100"
                  />
                ) : (
                  <div className="p-2 rounded-md bg-emerald-50/30 border border-emerald-100 text-xs text-neutral-700">
                    <MessageFormatter>{question.answer}</MessageFormatter>
                  </div>
                )}
              </div>
            )}

            {/* Explanation */}
            <div>
              <Label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1 block">
                Explanation
              </Label>
              {isEditing ? (
                <Textarea
                  value={editedQuestion.explanation}
                  onChange={(e) => updateField('explanation', e.target.value)}
                  className="min-h-[60px] text-xs bg-blue-50/30 border-blue-100 focus:border-blue-300 focus:ring-blue-100"
                />
              ) : (
                <div className="p-2 rounded-md bg-blue-50/30 border border-blue-100 text-xs text-neutral-700">
                  <MessageFormatter>{question.explanation}</MessageFormatter>
                </div>
              )}
            </div>

            {/* Hints */}
            {(question.hints?.length > 0 || isEditing) && (
              <div>
                <Label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1 block">
                  Hints
                </Label>
                <div className="space-y-1.5">
                  {(isEditing ? editedQuestion.hints : question.hints)?.map((hint, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <span className="text-[9px] font-bold text-amber-500 mt-1.5 bg-amber-50 px-1 py-0.5 rounded shrink-0">
                        {idx + 1}
                      </span>
                      {isEditing ? (
                        <div className="flex-1 flex gap-1.5">
                          <Input
                            value={hint}
                            onChange={(e) => {
                              const newHints = [...editedQuestion.hints];
                              newHints[idx] = e.target.value;
                              updateField('hints', newHints);
                            }}
                            className="h-7 text-xs"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newHints = editedQuestion.hints.filter((_, i) => i !== idx);
                              updateField('hints', newHints);
                            }}
                            className="h-7 w-7 p-0 text-neutral-400 hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-600 py-0.5">
                          <MessageFormatter inline>{hint}</MessageFormatter>
                        </p>
                      )}
                    </div>
                  ))}
                  {isEditing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateField('hints', [...(editedQuestion.hints || []), ''])}
                      className="h-6 text-[10px] mt-1"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Hint
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Refine Dialog */}
      <Dialog open={refineDialogOpen} onOpenChange={setRefineDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-violet-500" />
              Refine with AI
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-neutral-600">
              How should the AI modify this question?
            </p>
            <Textarea
              value={refineInstruction}
              onChange={(e) => setRefineInstruction(e.target.value)}
              placeholder="e.g., Make it harder, add a real-world example, fix the grammar..."
              className="min-h-[100px] resize-none"
            />
            <div className="flex flex-wrap gap-2">
              {['Make easier', 'Make harder', 'Fix grammar', 'Add context'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setRefineInstruction(suggestion)}
                  className="px-3 py-1.5 text-xs bg-violet-50 text-violet-600 rounded-full hover:bg-violet-100 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <Button
              onClick={handleRefine}
              disabled={!refineInstruction.trim() || isRefining}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {isRefining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Refining...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Apply Changes
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
