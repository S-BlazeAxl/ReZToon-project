import { useCallback, useEffect, useState } from 'react';
import { Mail, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUserWithLoading } from '../../../core/hooks/useCurrentUser';
import { getContactFeedback, updateContactFeedback, type ContactFeedback, type FeedbackStatus } from '../../../core/services/feedbackService';
import { useT } from '../../../config/i18n';
import { SupervisorHeader, SupervisorPageShell } from '../components';
import '../../../styles/supervisor-style.css';
import '../../../styles/supervisor-pages-style.css';
import '../../../styles/supervisor-feedback-style.css';

const statuses: FeedbackStatus[] = ['new', 'read', 'resolved', 'rejected'];

export default function SupervisorFeedback() {
  const t = useT();
  const { user, loading: authLoading } = useCurrentUserWithLoading();
  const navigate = useNavigate();
  const [items, setItems] = useState<ContactFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reply, setReply] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, FeedbackStatus>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const rows = await getContactFeedback();
      setItems(rows);
      setReply(Object.fromEntries(rows.map((row) => [row.id, row.supervisor_reply ?? ''])));
      setStatus(Object.fromEntries(rows.map((row) => [row.id, row.status])));
    } catch {
      setError(t.supervisor.feedbackUpdateFailed);
    } finally { setLoading(false); }
  }, [t.supervisor.feedbackUpdateFailed]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/let-go', { replace: true }); return; }
    if (user.role !== 'supervisor') { navigate('/supervisor', { replace: true }); return; }
    void refresh();
  }, [user, authLoading, navigate, refresh]);

  const save = async (item: ContactFeedback) => {
    setBusyId(item.id); setError(''); setSuccess('');
    try {
      await updateContactFeedback(item.id, { status: status[item.id] ?? item.status, supervisor_reply: reply[item.id] ?? '' });
      setSuccess(t.supervisor.feedbackUpdateSuccess);
      await refresh();
    } catch { setError(t.supervisor.feedbackUpdateFailed); }
    finally { setBusyId(null); }
  };

  if (authLoading || !user || user.role !== 'supervisor') return null;
  const label = (s: FeedbackStatus) => ({ new: t.supervisor.feedbackNew, read: t.supervisor.feedbackRead, resolved: t.supervisor.feedbackResolved, rejected: t.supervisor.feedbackRejected }[s]);

  return <>
    <SupervisorHeader active="feedback" />
    <SupervisorPageShell title={t.supervisor.feedbackTitle} subtitle={t.supervisor.feedbackSubtitle} tag={t.supervisor.feedbackTitle} tagIcon={<Mail size={14} />} actions={<button className="supervisor-page-action" onClick={() => void refresh()} disabled={loading}><RefreshCw size={14} /> {t.landing.reload}</button>}>
      {error && <div role="alert" className="feedback-alert error"><AlertCircle size={15} /> {error}</div>}
      {success && <div role="status" className="feedback-alert success"><Check size={15} /> {success}</div>}
      {loading ? <p>{t.common.loading}</p> : items.length === 0 ? <div className="feedback-empty">{t.supervisor.feedbackEmpty}</div> : <div className="feedback-list">
        {items.map((item) => <article className="feedback-card" key={item.id}>
          <header className="feedback-card-head"><div><span className={`feedback-status ${item.status}`}>{label(status[item.id] ?? item.status)}</span><h3>{item.subject}</h3><p>{t.supervisor.feedbackFrom}: <strong>{item.name}</strong> · <a href={`mailto:${item.email}`}>{item.email}</a></p></div><time>{new Date(item.created_at).toLocaleString()}</time></header>
          <p className="feedback-message">{item.message}</p>
          <div className="feedback-actions"><label>{t.supervisor.feedbackStatus}<select value={status[item.id] ?? item.status} onChange={(e) => setStatus((v) => ({ ...v, [item.id]: e.target.value as FeedbackStatus }))}>{statuses.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></label><label className="feedback-reply-label">{t.supervisor.feedbackReply}<textarea rows={3} maxLength={2000} value={reply[item.id] ?? ''} onChange={(e) => setReply((v) => ({ ...v, [item.id]: e.target.value }))} /></label><button className="supervisor-page-action primary" disabled={busyId === item.id} onClick={() => void save(item)}>{busyId === item.id ? t.common.loading : t.supervisor.feedbackSave}</button></div>
        </article>)}
      </div>}
    </SupervisorPageShell>
  </>;
}
