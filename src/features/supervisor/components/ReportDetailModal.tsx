import { X, Flag, CheckCircle2, XCircle } from 'lucide-react';
import type { Report } from '../../../core/services/reportService';
import '../../../styles/supervisor-style.css';
import '../../../styles/supervisor-files-style.css';
import '../../../styles/creator-style.css';
import { useT } from '../../../config/i18n';

interface Props {
    report: Report;
    onClose: () => void;
    onResolve: (report: Report, status: 'resolved' | 'rejected') => void;
}

export default function ReportDetailModal({ report, onClose, onResolve }: Props) {
    const t = useT();

    const consequence = (type: Report['type']): string => {
        switch (type) {
            case 'comment': return 'permanently delete this comment';
            case 'chapter': return 'unpublish this chapter';
            case 'series': return 'suspend this series';
            case 'user': return 'ban this user for 7 days';
            default: return 'apply moderation action';
        }
    };

    const handleResolve = () => {
        if (!window.confirm(`Resolving will ${consequence(report.type)}. Continue?`)) return;
        onResolve(report, 'resolved');
    };

    const handleReject = () => {
        onResolve(report, 'rejected');
    };

    return (
        <div
            className="files-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="files-modal" style={{ maxWidth: 640 }}>
                <header className="files-header">
                    <div className="files-header-title">
                        <Flag size={18} />
                        <h3>{t.reports.details}</h3>
                        <span className={`supervisor-severity sev-${report.severity}`}>
                            {report.severity}
                        </span>
                    </div>
                    <div className="files-header-actions">
                        <button
                            type="button"
                            className="files-icon-btn"
                            onClick={onClose}
                            title={t.common.close}
                        >
                            <X size={15} />
                        </button>
                    </div>
                </header>

                <div className="files-body">
                    <div className="file-viewer">
                        <div className="file-viewer-header">
                            <strong>{report.id}</strong>
                            <span className="supervisor-date">
                                {new Date(report.createdAt).toLocaleString()}
                            </span>
                        </div>

                        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
                            <div>
                                <div className="creator-stat-label">{t.reports.type}</div>
                                <div className={`supervisor-type type-${report.type}`}>
                                    {report.type}
                                </div>
                            </div>
                            <div>
                                <div className="creator-stat-label">{t.reports.status}</div>
                                <div>{report.status}</div>
                            </div>
                            <div>
                                <div className="creator-stat-label">{t.reports.target}</div>
                                <div className="supervisor-target">{report.targetLabel}</div>
                            </div>
                            <div>
                                <div className="creator-stat-label">{t.reports.targetId}</div>
                                <div style={{ fontFamily: 'monospace', fontSize: '.72rem' }}>
                                    {report.targetId}
                                </div>
                            </div>
                            <div>
                                <div className="creator-stat-label">{t.reports.reporter}</div>
                                <div>{report.reporterName}</div>
                            </div>
                            <div>
                                <div className="creator-stat-label">{t.reports.reporterId}</div>
                                <div style={{ fontFamily: 'monospace', fontSize: '.72rem' }}>
                                    {report.reporterId}
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="creator-stat-label">{t.reports.reason}</div>
                            <p style={{ margin: '4px 0 0', color: '#fff' }}>{report.reason}</p>
                        </div>

                        {report.status === 'open' && (
                            <div className="files-danger-actions" style={{ marginTop: 8 }}>
                                <button
                                    type="button"
                                    className="files-action-btn primary"
                                    onClick={handleResolve}
                                >
                                    <CheckCircle2 size={13} /> {t.reports.resolveAndAct}
                                </button>
                                <button
                                    type="button"
                                    className="files-action-btn danger"
                                    onClick={handleReject}
                                >
                                    <XCircle size={13} /> {t.reports.reject}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}