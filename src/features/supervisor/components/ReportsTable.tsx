import { Flag, AlertTriangle, CheckCircle2, XCircle, Eye } from 'lucide-react';
import type { Report } from '../../../core/services/reportService';
import { useT } from '../../../config/i18n';

interface Props {
    reports: Report[];
    onView: (report: Report) => void;
    onResolve: (report: Report, status: 'resolved' | 'rejected') => void;
}

export default function ReportsTable({ reports, onView, onResolve }: Props) {
    const t = useT();

    if (reports.length === 0) {
        return (
            <div className="wallet-empty">
                <Flag size={28} />
                <p>{t.supervisor.noReportsYet}</p>
                <span>{t.supervisor.noReportsDesc}</span>
            </div>
        );
    }

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'comment': return t.supervisor.typeComment;
            case 'chapter': return t.supervisor.typeChapter;
            case 'series': return t.supervisor.typeSeries;
            case 'user': return t.supervisor.typeUser;
            default: return type;
        }
    };

    const getSeverityLabel = (severity: string) => {
        switch (severity) {
            case 'high': return t.supervisor.severityHigh;
            case 'medium': return t.supervisor.severityMedium;
            case 'low': return t.supervisor.severityLow;
            default: return severity;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'open': return t.supervisor.statusOpen;
            case 'resolved': return t.supervisor.statusResolved;
            case 'rejected': return t.supervisor.statusRejected;
            default: return status;
        }
    };

    return (
        <div className="supervisor-table">
            <div className="supervisor-table-head">
                <span>{t.reports.type}</span>
                <span>{t.reports.target}</span>
                <span>{t.reports.reporter}</span>
                <span>{t.reports.reason}</span>
                <span>{t.supervisor.allSeverity}</span>
                <span>{t.supervisor.status}</span>
                <span>{t.supervisor.actions}</span>
            </div>

            {reports.map((r) => (
                <div key={r.id} className="supervisor-table-row">
                    <span className={`supervisor-type type-${r.type}`}>{getTypeLabel(r.type)}</span>
                    <span className="supervisor-target">{r.targetLabel}</span>
                    <span>{r.reporterName}</span>
                    <span>{r.reason}</span>
                    <span className={`supervisor-severity sev-${r.severity}`}>
                        {r.severity === 'high' && <AlertTriangle size={12} />}
                        {r.severity === 'medium' && <Flag size={12} />}
                        {r.severity === 'low' && <CheckCircle2 size={12} />}
                        {getSeverityLabel(r.severity)}
                    </span>
                    <span className="supervisor-date">{getStatusLabel(r.status)}</span>
                    <span className="supervisor-actions">
                        <button
                            className="supervisor-action-btn view"
                            title={t.supervisor.viewDetails}
                            onClick={() => onView(r)}
                        >
                            <Eye size={14} />
                        </button>
                        <button
                            className="supervisor-action-btn approve"
                            title={t.supervisor.resolveAction}
                            onClick={() => onResolve(r, 'resolved')}
                            disabled={r.status !== 'open'}
                        >
                            <CheckCircle2 size={14} />
                        </button>
                        <button
                            className="supervisor-action-btn reject"
                            title={t.supervisor.rejectReport}
                            onClick={() => onResolve(r, 'rejected')}
                            disabled={r.status !== 'open'}
                        >
                            <XCircle size={14} />
                        </button>
                    </span>
                </div>
            ))}
        </div>
    );
}