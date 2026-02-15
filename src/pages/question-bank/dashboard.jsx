import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useDashboardStats,
  useQualityMetrics,
  useRecentActivity,
} from '@/services/apis/dashboard';

const STATUS_STYLE = {
  CONFIGURING: { label: 'Draft', cls: 'bg-slate-100 text-slate-600' },
  PROCESSING_DOCS: { label: 'Processing', cls: 'bg-sky-50 text-sky-700' },
  GENERATING: { label: 'Generating', cls: 'bg-violet-50 text-violet-700' },
  REVIEWING: { label: 'Reviewing', cls: 'bg-amber-50 text-amber-700' },
  COMPLETED: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700' },
  FAILED: { label: 'Failed', cls: 'bg-red-50 text-red-700' },
};

const DIFF_COLOR = { EASY: 'bg-emerald-500', MEDIUM: 'bg-amber-500', HARD: 'bg-red-500', HOTS: 'bg-red-600' };
const DIFF_LABEL = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard', HOTS: 'HOTS' };
const BLOOMS_LABEL = { REMEMBER: 'Remember', UNDERSTAND: 'Understand', APPLY: 'Apply', ANALYZE: 'Analyze', EVALUATE: 'Evaluate', CREATE: 'Create' };
const BLOOMS_COLOR = 'bg-indigo-500';
const TYPE_LABEL = { LONG_ANSWER: 'Long Answer', SHORT_ANSWER: 'Short Answer', LONG: 'Long Answer', SHORT: 'Short Answer', MCQ: 'MCQ', CASE_STUDY: 'Case Study' };
const TYPE_COLOR = { LONG_ANSWER: 'bg-amber-500', SHORT_ANSWER: 'bg-sky-500', LONG: 'bg-amber-500', SHORT: 'bg-sky-500', MCQ: 'bg-violet-500', CASE_STUDY: 'bg-pink-500' };

/* ── page ──────────────────────────────────────────────── */

export default function QuestionBankDashboard() {
  const navigate = useNavigate();
  const { stats, isLoading: sl } = useDashboardStats();
  const { metrics, isLoading: ml } = useQualityMetrics();
  const { recentBanks, isLoading: al } = useRecentActivity(10);

  const bloomsTotal = useMemo(() => metrics?.bloomsDistribution?.reduce((s, b) => s + b.count, 0) || 0, [metrics?.bloomsDistribution]);
  const diffTotal = useMemo(() => metrics?.difficultySpread?.reduce((s, d) => s + d.count, 0) || 0, [metrics?.difficultySpread]);
  const typeTotal = useMemo(() => metrics?.questionTypeMix?.reduce((s, t) => s + t.count, 0) || 0, [metrics?.questionTypeMix]);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* header */}
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b px-5">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
          <h1 className="text-sm font-semibold text-slate-800">Question Banks</h1>
        </div>
        <Button size="sm" onClick={() => navigate('/dashboard/question-bank/create')} className="h-8 bg-violet-600 text-xs hover:bg-violet-700">
          <Plus className="mr-1 size-3.5" /> New
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* ── stats row ──────────────────────────────── */}
        <div className="border-b px-5 py-4">
          <div className="mx-auto flex max-w-5xl items-center gap-8">
            <Stat label="Banks" value={stats?.totalBanks} sub={`+${stats?.banksThisWeek ?? 0} this wk`} loading={sl} />
            <div className="h-8 w-px bg-slate-200" />
            <Stat label="Questions" value={stats?.totalQuestions} sub={`+${stats?.questionsThisWeek ?? 0} this wk`} loading={sl} />
            <div className="h-8 w-px bg-slate-200" />
            <Stat label="Completed" value={stats?.completedBanks != null ? `${stats.completedBanks}/${stats.totalBanks}` : null} sub={`${stats?.completionRate ?? 0}%`} loading={sl} />
            {(stats?.activeBanks ?? 0) > 0 && (
              <>
                <div className="h-8 w-px bg-slate-200" />
                <Stat label="In Progress" value={stats.activeBanks} sub="generating" loading={false} />
              </>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-5 py-5 space-y-5">
          {/* ── recent question banks ────────────────── */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-slate-800">Recent Question Banks</h2>
              <button onClick={() => navigate('/dashboard/question-bank')} className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700">
                View all <ArrowRight className="size-3" />
              </button>
            </div>

            {al ? (
              <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
            ) : !recentBanks?.length ? (
              <p className="py-8 text-center text-sm text-slate-400">No question banks yet.</p>
            ) : (
              <div className="divide-y rounded-lg border">
                {recentBanks.map((bank) => {
                  const st = STATUS_STYLE[bank.status] || STATUS_STYLE.CONFIGURING;
                  const qc = bank.questionCount ?? 0;
                  return (
                    <button
                      key={bank._id}
                      type="button"
                      onClick={() => navigate(`/dashboard/question-bank/${bank._id}`)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{bank.title}</p>
                        <p className="truncate text-xs text-slate-500">{bank.curriculum} Class {bank.grade} &middot; {bank.subject}</p>
                      </div>
                      <div className="ml-4 flex shrink-0 items-center gap-3">
                        <span className="text-sm tabular-nums text-slate-700">{qc} Qs</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', st.cls)}>{st.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── analytics row ────────────────────────── */}
          <section className="grid gap-4 sm:grid-cols-3">
            <BarPanel title="Bloom's Taxonomy" loading={ml} empty={!metrics?.bloomsDistribution?.length}>
              {metrics?.bloomsDistribution?.map((b) => {
                const pct = bloomsTotal > 0 ? Math.round((b.count / bloomsTotal) * 100) : 0;
                return <HBar key={b.level} label={BLOOMS_LABEL[b.level] || b.level} pct={pct} color={BLOOMS_COLOR} />;
              })}
            </BarPanel>

            <BarPanel title="Difficulty Spread" loading={ml} empty={!metrics?.difficultySpread?.length}>
              {metrics?.difficultySpread?.map((d) => {
                const pct = diffTotal > 0 ? Math.round((d.count / diffTotal) * 100) : 0;
                return <HBar key={d.level} label={DIFF_LABEL[d.level] || d.level} pct={pct} color={DIFF_COLOR[d.level]} />;
              })}
            </BarPanel>

            <BarPanel title="Question Types" loading={ml} empty={!metrics?.questionTypeMix?.length}>
              {metrics?.questionTypeMix?.map((t) => {
                const pct = typeTotal > 0 ? Math.round((t.count / typeTotal) * 100) : 0;
                return <HBar key={t.type} label={TYPE_LABEL[t.type] || t.type} pct={pct} color={TYPE_COLOR[t.type] || 'bg-slate-400'} />;
              })}
            </BarPanel>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ── analytics shared components ───────────────────────── */

function BarPanel({ title, loading, empty, children }) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-xs font-medium text-slate-500">{title}</h3>
      {loading ? (
        <Skeleton className="h-28 w-full rounded" />
      ) : empty ? (
        <p className="py-4 text-center text-xs text-slate-400">No data yet</p>
      ) : (
        <div className="space-y-2.5">{children}</div>
      )}
    </div>
  );
}

function HBar({ label, pct, color }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-slate-600">{label}</span>
        <span className="text-xs tabular-nums text-slate-500">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100">
        <div className={cn('h-1.5 rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ── inline stat ───────────────────────────────────────── */

function Stat({ label, value, sub, loading }) {
  if (loading) {
    return (
      <div className="space-y-1">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-6 w-10" />
      </div>
    );
  }
  return (
    <div>
      <p className="text-[11px] font-medium text-slate-400">{label}</p>
      <p className="text-xl font-semibold tabular-nums text-slate-900">{value ?? '—'}</p>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}
