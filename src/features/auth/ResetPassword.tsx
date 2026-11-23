import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Lock, ArrowRight, Loader2 } from 'lucide-react';
import ParticlesCanvas from '../../shared/effects/ParticlesCanvas';
import FloatingShapes from '../../shared/effects/FloatingShapes';
import { supabase } from '../../core/lib/supabase';
import { useT } from '../../config/i18n';
import '../../styles/let-go-style.css';

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPassword() {
  const navigate = useNavigate();
  const t = useT();
  const [status, setStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    let cancelled = false;

    const hash = window.location.hash;
    const isRecovery = hash.includes('type=recovery');

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session && isRecovery) {
        setReady(true);
      } else if (!isRecovery) {
        setStatus({ type: 'error', text: t.auth.errExpiredLink });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY' && session) {
        setReady(true);
        setStatus(null);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [t.auth.errExpiredLink]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setStatus({ type: 'error', text: t.auth.errPasswordLength });
      return;
    }
    if (password !== confirm) {
      setStatus({ type: 'error', text: t.auth.errPasswordMatch });
      return;
    }
    setLoading(true);
    setStatus(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setStatus({ type: 'error', text: error.message });
      return;
    }
    setStatus({ type: 'success', text: t.auth.passwordUpdated });
    window.setTimeout(() => navigate('/home', { replace: true }), 1500);
  };

  return (
    <>
      <section className="auth-page" id="authPage">
        <div className="overlay" />
        <ParticlesCanvas />
        <FloatingShapes />

        <div className="auth-card glass" style={{ maxWidth: '420px' }}>
          <Link to="/let-go" className="back-link">
            <ChevronLeft size={20} />
            {t.common.back}
          </Link>

          <div className="logo-brand" style={{ marginBottom: '8px' }}>
            ReZ<span className="accent">Toon</span>
          </div>

          <p className="welcome" style={{ marginBottom: '24px' }}>
            {t.auth.chooseNewPassword}
          </p>

          {status && (
            <div className={`form-message ${status.type}`} role="alert">
              {status.text}
            </div>
          )}

          <form className="auth-form active" onSubmit={handleSubmit} autoComplete="off">
            <div className="form-group">
              <label htmlFor="newPassword" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} /> {t.auth.newPassword}
              </label>
              <input
                type="password"
                id="newPassword"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={MIN_PASSWORD_LENGTH}
                disabled={!ready || loading}
              />
              <span className="char-counter">{t.auth.passwordMinLength}</span>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={14} /> {t.auth.confirmPassword}
              </label>
              <input
                type="password"
                id="confirmPassword"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={MIN_PASSWORD_LENGTH}
                disabled={!ready || loading}
              />
            </div>

            <button
              type="submit"
              className="btn-auth"
              disabled={!ready || loading || !password || !confirm}
              style={{
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spin" />
                  {t.auth.updating}
                </>
              ) : (
                <>
                  {t.auth.updatePassword}
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="divider" style={{ marginTop: '24px' }}>
              {t.common.or}
            </div>

            <div className="auth-footer" style={{ marginTop: '0' }}>
              <span>
                {t.auth.needNewLink}{' '}
                <Link to="/forgot" style={{ fontWeight: 800, color: 'var(--primary)' }}>
                  {t.auth.requestReset}
                </Link>
              </span>
            </div>
          </form>

          <div className="auth-footer" style={{ marginTop: 'auto', paddingTop: '20px' }}>
            <span className="copyright">© 2026 ReZToon · All rights reserved.</span>
          </div>
        </div>
      </section>
    </>
  );
}