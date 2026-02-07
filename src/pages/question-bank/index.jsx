import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Plus,
  FileText,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Search,
  BookOpen,
  BarChart3,
  Clock,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGetQuestionBanks, useDeleteQuestionBank, useExportQuestionBank } from '@/services/apis/question-banks';
import { getSocket, onBankUpdate, joinBankRoom, leaveBankRoom } from '@/services/socket';
import { ExportModal } from '@/components/question-bank/export-modal';

export default function QuestionBankList() {
  const navigate = useNavigate();
  const { questionBanks, isLoading, error, getQuestionBanks } = useGetQuestionBanks();
  const { deleteQuestionBank, isLoading: isDeleting } = useDeleteQuestionBank();
  const { exportBank, isLoading: isExporting } = useExportQuestionBank();
  const [localBanks, setLocalBanks] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleExport = async (format, options) => {
    await exportBank(selectedBankId, format, options);
    setExportModalOpen(false);
    setSelectedBankId(null);
  };

  const openExportModal = (bankId, e) => {
    e?.stopPropagation();
    setSelectedBankId(bankId);
    setExportModalOpen(true);
  };

  useEffect(() => {
    getQuestionBanks();
  }, [getQuestionBanks]);

  useEffect(() => {
    if (questionBanks) {
      setLocalBanks(questionBanks);
    }
  }, [questionBanks]);

  // Socket updates for generating banks
  useEffect(() => {
    getSocket();

    const handleUpdate = (data) => {
      setLocalBanks((prev) =>
        prev.map((bank) => {
          if (bank._id === data.bankId) {
            if (data.type === 'status_change') {
              return { ...bank, status: data.status };
            }
            if (data.type === 'generation_completed' && data.questionBank) {
              return data.questionBank;
            }
            if (data.type === 'generation_failed') {
              return { ...bank, status: 'FAILED', errorMessage: data.error };
            }
          }
          return bank;
        })
      );
    };

    const unsubscribe = onBankUpdate(handleUpdate);

    // Join rooms for generating banks
    localBanks
      .filter((b) => b.status === 'GENERATING' || b.status === 'PROCESSING_DOCS')
      .forEach((b) => joinBankRoom(b._id));

    return () => {
      unsubscribe();
      localBanks
        .filter((b) => b.status === 'GENERATING' || b.status === 'PROCESSING_DOCS')
        .forEach((b) => leaveBankRoom(b._id));
    };
  }, [localBanks.length]);

  const handleDelete = async (bankId, e) => {
    e?.stopPropagation();
    if (!confirm('Delete this question bank? This cannot be undone.')) return;
    setDeletingId(bankId);
    const result = await deleteQuestionBank(bankId);
    if (result.success) {
      setLocalBanks((prev) => prev.filter((b) => b._id !== bankId));
    }
    setDeletingId(null);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusConfig = (status) => {
    const config = {
      CONFIGURING: { label: 'Draft', color: 'text-neutral-500', bg: 'bg-neutral-100', dot: 'bg-neutral-400' },
      PROCESSING_DOCS: { label: 'Processing', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-400' },
      READY: { label: 'Ready', color: 'text-teal-600', bg: 'bg-teal-50', dot: 'bg-teal-400' },
      GENERATING: { label: 'Generating', color: 'text-violet-600', bg: 'bg-violet-50', dot: 'bg-violet-500', animated: true },
      REVIEWING: { label: 'Reviewing', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-400' },
      COMPLETED: { label: 'Completed', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
      FAILED: { label: 'Failed', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' },
    };
    return config[status] || config.CONFIGURING;
  };

  // Dashboard stats
  const totalBanks = localBanks.length;
  const completedBanks = localBanks.filter(b => b.status === 'COMPLETED').length;
  const generatingBanks = localBanks.filter(b => b.status === 'GENERATING' || b.status === 'PROCESSING_DOCS').length;
  const totalQuestions = localBanks.reduce((s, b) => s + (b.stats?.generatedCount || 0), 0);

  // Filtered banks
  const filteredBanks = searchQuery.trim()
    ? localBanks.filter(b =>
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.topic?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : localBanks;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-violet-50/30">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-black/[0.04] px-6 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1 text-neutral-400 hover:text-neutral-600" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-neutral-900">Question Banks</h1>
              <p className="text-[11px] text-neutral-500">{totalBanks} bank{totalBanks !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/dashboard/question-bank/create')}
            className="h-9 px-4 text-[12px] bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Question Bank
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-[13px] text-red-700">{error}</p>
              <Button variant="ghost" size="sm" className="ml-auto text-red-600 hover:text-red-700" onClick={() => getQuestionBanks()}>
                Retry
              </Button>
            </div>
          )}

          {isLoading && localBanks.length === 0 ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-4" />
              <p className="text-[13px] text-neutral-500">Loading question banks...</p>
            </div>
          ) : localBanks.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-violet-500" />
              </div>
              <h3 className="text-[16px] font-semibold text-neutral-900 mb-2">No question banks yet</h3>
              <p className="text-[13px] text-neutral-500 mb-6">Create your first question bank with AI</p>
              <Button onClick={() => navigate('/dashboard/question-bank/create')} className="h-10 px-5 text-[13px] bg-violet-600 hover:bg-violet-700">
                <Plus className="w-4 h-4 mr-2" /> Create Question Bank
              </Button>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-violet-500" />
                    <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Total Banks</span>
                  </div>
                  <p className="text-2xl font-bold text-neutral-900">{totalBanks}</p>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Completed</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">{completedBanks}</p>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-2 mb-1">
                    <Loader2 className={cn("w-4 h-4 text-violet-500", generatingBanks > 0 && "animate-spin")} />
                    <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">In Progress</span>
                  </div>
                  <p className="text-2xl font-bold text-violet-600">{generatingBanks}</p>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Total Questions</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{totalQuestions}</p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search by title, subject, or topic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-[13px] bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-neutral-400 hover:text-neutral-600" />
                  </button>
                )}
              </div>

              {/* Bank Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBanks.map((bank) => {
                  const isActive = bank.status === 'GENERATING' || bank.status === 'PROCESSING_DOCS';
                  const statusCfg = getStatusConfig(bank.status);
                  const progress = bank.stats?.totalQuestions > 0
                    ? Math.round((bank.stats.generatedCount || 0) / bank.stats.totalQuestions * 100)
                    : 0;

                  return (
                    <div
                      key={bank._id}
                      onClick={() => navigate(`/dashboard/question-bank/${bank._id}`)}
                      className={cn(
                        "group bg-white rounded-xl border shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 cursor-pointer hover:shadow-md hover:border-violet-200",
                        isActive ? "border-violet-200 ring-1 ring-violet-50" : "border-neutral-200"
                      )}
                    >
                      <div className="p-4">
                        {/* Title + Status */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[14px] font-semibold text-neutral-900 truncate group-hover:text-violet-700 transition-colors">
                              {bank.title}
                            </h3>
                            <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                              {bank.subject} {bank.topic ? `· ${bank.topic}` : ''} · Class {bank.grade}
                            </p>
                          </div>
                          <span className={cn(
                            "shrink-0 ml-2 flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full",
                            statusCfg.bg, statusCfg.color
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot, statusCfg.animated && "animate-pulse")} />
                            {statusCfg.label}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        {bank.stats?.totalQuestions > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-neutral-500">
                                {bank.stats.generatedCount || 0} / {bank.stats.totalQuestions} questions
                              </span>
                              <span className="text-[10px] font-bold text-neutral-700">{progress}%</span>
                            </div>
                            <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  bank.status === 'COMPLETED' ? "bg-emerald-500" :
                                  isActive ? "bg-violet-500" : "bg-neutral-300"
                                )}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Meta row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                            <span className="px-1.5 py-0.5 bg-neutral-50 rounded font-medium text-neutral-500">
                              {bank.curriculum}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {formatDate(bank.createdAt)}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            {bank.status === 'COMPLETED' && (
                              <Button
                                variant="ghost" size="sm" className="h-7 w-7 p-0"
                                onClick={(e) => openExportModal(bank._id, e)}
                                disabled={isExporting && selectedBankId === bank._id}
                              >
                                {isExporting && selectedBankId === bank._id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Download className="w-3.5 h-3.5 text-neutral-500" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-red-600"
                              onClick={(e) => handleDelete(bank._id, e)}
                              disabled={deletingId === bank._id || isActive}
                            >
                              {deletingId === bank._id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5 text-neutral-500" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredBanks.length === 0 && searchQuery && (
                <div className="text-center py-12">
                  <Search className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-[13px] text-neutral-500">No question banks match "{searchQuery}"</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        onExport={handleExport}
        isLoading={isExporting}
      />
    </div>
  );
}
