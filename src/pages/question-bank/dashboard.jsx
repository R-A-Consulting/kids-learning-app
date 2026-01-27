import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  HelpCircle,
  Clock,
  Star,
  TrendingUp,
  BarChart3,
  PieChart,
  Plus,
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useDashboardStats,
  useQualityMetrics,
  useRecentActivity,
} from '@/services/apis/dashboard';

export default function QuestionBankDashboard() {
  const navigate = useNavigate();
  const { stats, isLoading: statsLoading } = useDashboardStats();
  const { metrics, isLoading: metricsLoading } = useQualityMetrics();
  const { recentBanks, isLoading: activityLoading } = useRecentActivity();

  const formatTimeAgo = (dateString) => {
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

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-violet-50/30">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-black/[0.04] px-6 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1 text-neutral-400 hover:text-neutral-600" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-neutral-900">Dashboard</h1>
              <p className="text-[11px] text-neutral-500">Question Bank Generator</p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => navigate('/dashboard/question-bank/create')}
          className="h-9 px-4 text-[12px] bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/25"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New Question Bank
        </Button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              icon={<FileText className="w-5 h-5" />}
              title="Total Banks"
              value={stats?.totalBanks || 0}
              change={`+${stats?.banksThisWeek || 0} this week`}
              trend="up"
              loading={statsLoading}
              color="violet"
            />
            <StatCard
              icon={<HelpCircle className="w-5 h-5" />}
              title="Questions Generated"
              value={stats?.totalQuestions || 0}
              change={`+${stats?.questionsThisWeek || 0} this week`}
              trend="up"
              loading={statsLoading}
              color="blue"
            />
            <StatCard
              icon={<Clock className="w-5 h-5" />}
              title="Time Saved"
              value={`${stats?.timeSavedHours || 0} hrs`}
              change="vs manual creation"
              trend="up"
              loading={statsLoading}
              color="emerald"
            />
            <StatCard
              icon={<Star className="w-5 h-5" />}
              title="Avg Quality Score"
              value={`${stats?.avgQualityScore || 0}%`}
              change="Bloom's compliance"
              trend="neutral"
              loading={statsLoading}
              color="amber"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-4">
            <BloomsDistributionChart
              data={metrics?.bloomsDistribution}
              loading={metricsLoading}
            />
            <DifficultySpreadChart
              data={metrics?.difficultySpread}
              loading={metricsLoading}
            />
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-3">
              <RecentActivityTable
                banks={recentBanks}
                loading={activityLoading}
                onViewAll={() => navigate('/dashboard/question-bank')}
                onBankClick={(bankId) => navigate(`/dashboard/question-bank/${bankId}`)}
              />
            </div>
            <div className="col-span-2">
              <QuestionTypeMixChart
                data={metrics?.questionTypeMix}
                loading={metricsLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, change, trend, loading, color }) {
  const colorClasses = {
    violet: 'bg-violet-50 text-violet-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200/60 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200/60 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', colorClasses[color])}>
          {icon}
        </div>
        <span className="text-[12px] font-medium text-neutral-500">{title}</span>
      </div>
      <div className="text-[28px] font-bold text-neutral-900 tracking-tight">{value}</div>
      <div
        className={cn(
          'text-[11px] flex items-center gap-1 mt-1',
          trend === 'up' ? 'text-emerald-600' : 'text-neutral-500'
        )}
      >
        {trend === 'up' && <TrendingUp className="w-3 h-3" />}
        {change}
      </div>
    </div>
  );
}

function BloomsDistributionChart({ data, loading }) {
  const labels = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
  const colors = ['#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#3b0764'];

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200/60 p-5 shadow-sm">
        <Skeleton className="h-5 w-48 mb-4" />
        <div className="flex items-end gap-3 h-40">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <Skeleton className="w-full" style={{ height: `${Math.random() * 80 + 20}%` }} />
              <Skeleton className="h-3 w-6 mt-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...(data?.map((d) => d.count) || [1]));

  return (
    <div className="bg-white rounded-xl border border-neutral-200/60 p-5 shadow-sm">
      <h3 className="text-[14px] font-semibold text-neutral-900 mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-violet-500" />
        Bloom's Taxonomy Distribution
      </h3>
      <div className="flex items-end gap-3 h-40">
        {data?.map((item, i) => (
          <div key={item.level} className="flex-1 flex flex-col items-center">
            <div
              className="w-full rounded-t-lg transition-all hover:opacity-80"
              style={{
                height: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%`,
                backgroundColor: colors[i],
                minHeight: item.count > 0 ? '8px' : '0px',
              }}
            />
            <span className="text-[10px] mt-2 text-neutral-500 font-medium">
              {labels[i]?.slice(0, 3)}
            </span>
            <span className="text-[11px] font-semibold text-neutral-700">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DifficultySpreadChart({ data, loading }) {
  const colors = {
    EASY: '#22c55e',
    MEDIUM: '#eab308',
    HARD: '#f97316',
    HOTS: '#ef4444',
  };

  const labels = {
    EASY: 'Easy',
    MEDIUM: 'Medium',
    HARD: 'Hard',
    HOTS: 'HOTS',
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200/60 p-5 shadow-sm">
        <Skeleton className="h-5 w-36 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 flex-1 rounded-full" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const total = data?.reduce((sum, d) => sum + d.count, 0) || 1;

  return (
    <div className="bg-white rounded-xl border border-neutral-200/60 p-5 shadow-sm">
      <h3 className="text-[14px] font-semibold text-neutral-900 mb-4 flex items-center gap-2">
        <PieChart className="w-4 h-4 text-violet-500" />
        Difficulty Spread
      </h3>
      <div className="space-y-3">
        {data?.map((item) => (
          <div key={item.level} className="flex items-center gap-3">
            <span className="text-[12px] w-16 text-neutral-600 font-medium">
              {labels[item.level] || item.level}
            </span>
            <div className="flex-1 h-5 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(item.count / total) * 100}%`,
                  backgroundColor: colors[item.level],
                }}
              />
            </div>
            <span className="text-[12px] font-semibold w-12 text-right text-neutral-700">
              {Math.round((item.count / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentActivityTable({ banks, loading, onViewAll, onBankClick }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200/60 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="w-9 h-9 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-40 mb-1" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200/60 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-semibold text-neutral-900">Recent Question Banks</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-[12px] text-violet-600 hover:text-violet-700"
          onClick={onViewAll}
        >
          View all
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>
      <div className="space-y-1">
        {banks?.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-[13px]">
            No question banks yet. Create your first one!
          </div>
        ) : (
          banks?.map((bank) => (
            <div
              key={bank._id}
              className="flex items-center justify-between p-3 hover:bg-neutral-50 rounded-lg cursor-pointer transition-colors"
              onClick={() => onBankClick(bank._id)}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center',
                    bank.status === 'COMPLETED'
                      ? 'bg-emerald-50'
                      : bank.status === 'GENERATING'
                      ? 'bg-violet-50'
                      : bank.status === 'FAILED'
                      ? 'bg-red-50'
                      : 'bg-neutral-50'
                  )}
                >
                  {bank.status === 'GENERATING' ? (
                    <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
                  ) : bank.status === 'COMPLETED' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : bank.status === 'FAILED' ? (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <FileText className="w-4 h-4 text-neutral-400" />
                  )}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-neutral-900">{bank.title}</p>
                  <p className="text-[11px] text-neutral-500">
                    {bank.curriculum} Class {bank.grade} • {bank.subject}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[12px] font-medium text-neutral-700">
                  {bank.stats?.totalQuestions || 0} Qs
                </p>
                <StatusBadge status={bank.status} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const statusConfig = {
    CONFIGURING: { label: 'Draft', className: 'bg-neutral-100 text-neutral-600' },
    PROCESSING_DOCS: { label: 'Processing', className: 'bg-blue-50 text-blue-600' },
    GENERATING: { label: 'Generating', className: 'bg-violet-50 text-violet-600' },
    REVIEWING: { label: 'Reviewing', className: 'bg-amber-50 text-amber-600' },
    COMPLETED: { label: 'Completed', className: 'bg-emerald-50 text-emerald-600' },
    FAILED: { label: 'Failed', className: 'bg-red-50 text-red-600' },
  };

  const config = statusConfig[status] || statusConfig.CONFIGURING;

  return (
    <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', config.className)}>
      {config.label}
    </span>
  );
}

function QuestionTypeMixChart({ data, loading }) {
  const colors = {
    MCQ: '#8b5cf6',
    SHORT: '#06b6d4',
    LONG: '#f59e0b',
    CASE_STUDY: '#ec4899',
    ASSERTION_REASON: '#10b981',
  };

  const labels = {
    MCQ: 'MCQ',
    SHORT: 'Short Answer',
    LONG: 'Long Answer',
    CASE_STUDY: 'Case Study',
    ASSERTION_REASON: 'Assertion-Reason',
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200/60 p-5 shadow-sm h-full">
        <Skeleton className="h-5 w-36 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-3 h-3 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-8 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const total = data?.reduce((sum, d) => sum + d.count, 0) || 1;

  return (
    <div className="bg-white rounded-xl border border-neutral-200/60 p-5 shadow-sm h-full">
      <h3 className="text-[14px] font-semibold text-neutral-900 mb-4">Question Type Mix</h3>
      <div className="space-y-3">
        {data?.map((item) => (
          <div key={item.type} className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colors[item.type] || '#94a3b8' }}
            />
            <span className="text-[12px] text-neutral-600 flex-1">
              {labels[item.type] || item.type}
            </span>
            <span className="text-[12px] font-semibold text-neutral-700">
              {Math.round((item.count / total) * 100)}%
            </span>
          </div>
        ))}
        {(!data || data.length === 0) && (
          <div className="text-center py-4 text-neutral-500 text-[12px]">
            No questions generated yet
          </div>
        )}
      </div>
    </div>
  );
}
