import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  FileText,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
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
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status) => {
    const config = {
      CONFIGURING: { label: 'Draft', className: 'bg-neutral-100 text-neutral-600' },
      PROCESSING_DOCS: { label: 'Processing', className: 'bg-blue-50 text-blue-600' },
      GENERATING: { label: 'Generating', className: 'bg-violet-50 text-violet-600' },
      REVIEWING: { label: 'Reviewing', className: 'bg-amber-50 text-amber-600' },
      COMPLETED: { label: 'Completed', className: 'bg-emerald-50 text-emerald-600' },
      FAILED: { label: 'Failed', className: 'bg-red-50 text-red-600' },
    };
    return config[status] || config.CONFIGURING;
  };

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
              <p className="text-[11px] text-neutral-500">{localBanks.length} banks</p>
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
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-6xl mx-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-[13px] text-red-700">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-red-600 hover:text-red-700"
                onClick={() => getQuestionBanks()}
              >
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
              <h3 className="text-[16px] font-semibold text-neutral-900 mb-2">
                No question banks yet
              </h3>
              <p className="text-[13px] text-neutral-500 mb-6">
                Create your first question bank with AI
              </p>
              <Button
                onClick={() => navigate('/dashboard/question-bank/create')}
                className="h-10 px-5 text-[13px] bg-violet-600 hover:bg-violet-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Question Bank
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-neutral-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50/50">
                    <TableHead className="text-[11px] font-semibold">Title</TableHead>
                    <TableHead className="text-[11px] font-semibold">Status</TableHead>
                    <TableHead className="text-[11px] font-semibold">Curriculum</TableHead>
                    <TableHead className="text-[11px] font-semibold">Questions</TableHead>
                    <TableHead className="text-[11px] font-semibold">Created</TableHead>
                    <TableHead className="text-[11px] font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localBanks.map((bank) => {
                    const isGenerating =
                      bank.status === 'GENERATING' || bank.status === 'PROCESSING_DOCS';
                    const statusBadge = getStatusBadge(bank.status);

                    return (
                      <TableRow
                        key={bank._id}
                        className={cn(
                          'cursor-pointer transition-colors',
                          isGenerating ? 'bg-violet-50/30' : 'hover:bg-neutral-50'
                        )}
                        onClick={() => navigate(`/dashboard/question-bank/${bank._id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                                bank.status === 'COMPLETED'
                                  ? 'bg-emerald-50'
                                  : bank.status === 'FAILED'
                                  ? 'bg-red-50'
                                  : isGenerating
                                  ? 'bg-violet-50'
                                  : 'bg-neutral-50'
                              )}
                            >
                              {isGenerating ? (
                                <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
                              ) : bank.status === 'COMPLETED' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : bank.status === 'FAILED' ? (
                                <XCircle className="w-4 h-4 text-red-500" />
                              ) : (
                                <FileText className="w-4 h-4 text-neutral-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold text-neutral-900">
                                {bank.title}
                              </p>
                              <p className="text-[11px] text-neutral-500">
                                {bank.subject} • {bank.topic || 'General'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'text-[10px] font-medium px-2 py-1 rounded-full inline-flex items-center gap-1',
                              statusBadge.className
                            )}
                          >
                            {isGenerating && (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            )}
                            {statusBadge.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-[12px] text-neutral-700">
                            {bank.curriculum} Class {bank.grade}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-[13px] font-medium text-neutral-700">
                            {bank.stats?.generatedCount || 0}/{bank.stats?.totalQuestions || 0}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-[12px] text-neutral-500">
                            {formatDate(bank.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            {bank.status === 'COMPLETED' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => openExportModal(bank._id, e)}
                                disabled={isExporting && selectedBankId === bank._id}
                              >
                                {isExporting && selectedBankId === bank._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4 text-neutral-500" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:text-red-600"
                              onClick={(e) => handleDelete(bank._id, e)}
                              disabled={deletingId === bank._id || isGenerating}
                            >
                              {deletingId === bank._id ? (
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
      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        onExport={handleExport}
        isLoading={isExporting}
      />
    </div>
  );
}
