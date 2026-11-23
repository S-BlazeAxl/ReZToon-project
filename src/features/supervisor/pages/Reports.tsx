import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, Search, X, AlertTriangle } from 'lucide-react';
import ParticlesCanvas from '../../../shared/effects/ParticlesCanvas';
import FloatingShapes from '../../../shared/effects/FloatingShapes';
import { useCurrentUserWithLoading } from '../../../core/hooks/useCurrentUser';
import { getReports } from '../../../core/services/reportService';
import { resolveReportWithAction } from '../../../core/services/moderationService';
import type {
  Report,
  ReportSeverity,
  ReportStatus,
  ReportType,
} from '../../../core/services/reportService';
import {
  SupervisorHeader,
  SupervisorPageShell,
  ReportsTable,
  ReportDetailModal,
  SupervisorToast,
} from '../components';
import '../../../styles/home-style.css';
import '../../../styles/profile-style.css';
import '../../../styles/panel-style.css';
import '../../../styles/supervisor-style.css';
import '../../../styles/supervisor-pages-style.css';
import { useT } from '../../../config/i18n';

type StatusFilter = 'all' | ReportStatus;
type SeverityFilter = 'all' | ReportSeverity;
type TypeFilter = 'all' | ReportType;

export default function SupervisorReports() {
  const t = useT();
  const { user, loading: authLoading } = useCurrentUserWithLoading();
  const navigate = useNavigate();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: t.communityFeed.feedFilters.all },
    { id: 'open', label: t.supervisor.statusOpen },
    { id: 'resolved', label: t.supervisor.statusResolved },
    { id: 'rejected', label: t.supervisor.statusRejected },
  ];

  const SEVERITY_FILTERS: { id: SeverityFilter; label: string }[] = [
    { id: 'all', label: t.supervisor.allSeverity },
    { id: 'high', label: t.supervisor.severityHigh },
    { id: 'medium', label: t.supervisor.severityMedium },
    { id: 'low', label: t.supervisor.severityLow },
  ];

  const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
    { id: 'all', label: t.supervisor.typeAll },
    { id: 'comment', label: t.supervisor.typeComment },
    { id: 'chapter', label: t.supervisor.typeChapter },
    { id: 'series', label: t.supervisor.typeSeries },
    { id: 'user', label: t.supervisor.typeUser },
  ];

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/let-go', { replace: true });
      return;
    }
    if (user.role !== 'supervisor') navigate('/supervisor', { replace: true });
  }, [user, authLoading, navigate]);

  const refreshReports = useCallback(async () => {
    setLoading(true);
    const list = await getReports();
    setReports(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user?.role === 'supervisor') void refreshReports();
  }, [user, refreshReports]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleResolve = async (
    report: Report,
    status: 'resolved' | 'rejected',
  ) => {
    if (!user) return;
    const result = await resolveReportWithAction(
      report,
      status === 'resolved' ? 'resolve' : 'reject',
      user.id
    );

    if (result.success) {
      await refreshReports();
      setActiveReport(null);
    }
    setToast(result.message);
  };

  const counts = useMemo(
    () => ({
      all: reports.length,
      open: reports.filter((r) => r.status === 'open').length,
      resolved: reports.filter((r) => r.status === 'resolved').length,
      rejected: reports.filter((r) => r.status === 'rejected').length,
    }),
    [reports],
  );

  const filteredReports = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (q) {
        const haystack = [
          r.targetLabel, r.targetId, r.reporterName, r.reporterId, r.reason,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [reports, query, statusFilter, severityFilter, typeFilter]);

  const hasActiveFilters =
    query.trim() !== '' ||
    statusFilter !== 'all' ||
    severityFilter !== 'all' ||
    typeFilter !== 'all';

  const resetFilters = () => {
    setQuery('');
    setStatusFilter('all');
    setSeverityFilter('all');
    setTypeFilter('all');
  };

  if (authLoading || !user || user.role !== 'supervisor') return null;

  const highPriority = reports.filter(
    (r) => r.severity === 'high' && r.status === 'open',
  ).length;

  return (
    <>
      <div className="home-bg">
        <ParticlesCanvas />
        <FloatingShapes />
        <div className="bg-overlay" />
      </div>

      <SupervisorHeader active="reports" />

      <SupervisorPageShell
        tag="Console"
        tagIcon={<Flag size={12} />}
        title={t.supervisor.reportedContent}
        subtitle={`${counts.open} ${t.supervisor.statusOpen.toLowerCase()} · ${highPriority} ${t.supervisor.severityHigh.toLowerCase()}`}
      >
        {highPriority > 0 && (
          <div className="supervisor-alert">
            <AlertTriangle size={14} />
            <div>
              <strong>
                {t.supervisor.highPriorityPending.replace('{{n}}', String(highPriority))}
              </strong>
              <span>{t.supervisor.requiresImmediate}</span>
            </div>
          </div>
        )}

        <div className="supervisor-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder={t.supervisor.searchTarget}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="supervisor-search-clear"
              onClick={() => setQuery('')}
              aria-label={t.events.clearFilters}
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="supervisor-chips">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`supervisor-chip ${statusFilter === f.id ? 'active' : ''}`}
              onClick={() => setStatusFilter(f.id)}
            >
              <span>{f.label}</span>
              <span className="supervisor-chip-count">{counts[f.id as keyof typeof counts]}</span>
            </button>
          ))}
        </div>

        <div className="supervisor-chips">
          {SEVERITY_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`supervisor-chip sev-${f.id} ${severityFilter === f.id ? 'active' : ''}`}
              onClick={() => setSeverityFilter(f.id)}
            >
              {f.id !== 'all' && <span className="supervisor-chip-dot" />}
              <span>{f.label}</span>
            </button>
          ))}
          <span className="supervisor-chip-divider" />
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`supervisor-chip ${typeFilter === f.id ? 'active' : ''}`}
              onClick={() => setTypeFilter(f.id)}
            >
              <span>{f.label}</span>
            </button>
          ))}
          {hasActiveFilters && (
            <button type="button" className="supervisor-chip reset" onClick={resetFilters}>
              <X size={12} />
              <span>{t.events.resetFilters}</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="supervisor-empty">
            <Flag size={28} />
            <p>{t.supervisor.loadingReports}</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="supervisor-empty">
            <Flag size={28} />
            <p>{t.supervisor.noReportsMatch}</p>
            <span>{t.supervisor.noReportsMatchSub}</span>
          </div>
        ) : (
          <ReportsTable
            reports={filteredReports}
            onView={setActiveReport}
            onResolve={handleResolve}
          />
        )}
      </SupervisorPageShell>

      {activeReport && (
        <ReportDetailModal
          report={activeReport}
          onClose={() => setActiveReport(null)}
          onResolve={handleResolve}
        />
      )}

      {toast && <SupervisorToast message={toast} />}
    </>
  );
}