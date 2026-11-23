import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Mail, ArrowRight, Loader2 } from 'lucide-react';
import ParticlesCanvas from '../../shared/effects/ParticlesCanvas';
import FloatingShapes from '../../shared/effects/FloatingShapes';
import { supabase } from '../../core/lib/supabase';
import { useT } from '../../config/i18n';
import '../../styles/let-go-style.css';

export default function Forgot() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setStatus({ type: 'error', text: t.auth.errEmailInvalid });
      return;
    }

    setLoading(true);
    setStatus(null);

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      console.error('[Forgot] resetPasswordForEmail failed:', error);

      if (
        error.message.toLowerCase().includes('rate limit') ||
        (error as any).status === 429 ||
        (error as any).status === 500
      ) {
        setStatus({ type: 'error', text: 'Too many attempts. Please wait a few minutes.' });
        return;
      }

      setStatus({ type: 'error', text: error.message });
      return;
    }

    setStatus({ type: 'success', text: t.auth.resetSent });
    setEmail('');
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
            {t.auth.resetDesc}
          </p>

          {status && (
            <div className={`form-message ${status.type}`} role="alert">
              {status.text}
            </div>
          )}

          <form className="auth-form active" onSubmit={handleSubmit} autoComplete="off">
            <div className="form-group">
              <label htmlFor="email" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} /> {t.auth.email}
              </label>
              <input
                type="email"
                id="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                style={{
                  paddingLeft: '16px',
                  transition: 'all 0.3s ease',
                }}
              />
            </div>

            <button
              type="submit"
              className="btn-auth"
              disabled={loading || !email}
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
                  {t.auth.sending}
                </>
              ) : (
                <>
                  {t.auth.sendLink}
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="divider" style={{ marginTop: '24px' }}>{t.common.or}</div>

            <div className="auth-footer" style={{ marginTop: '0' }}>
              <span>
                {t.auth.rememberPassword}{' '}
                <Link to="/let-go" style={{ fontWeight: 800, color: 'var(--primary)' }}>
                  {t.auth.signIn}
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