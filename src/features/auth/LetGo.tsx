import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import ParticlesCanvas from '../../shared/effects/ParticlesCanvas';
import FloatingShapes from '../../shared/effects/FloatingShapes';
import { loginUser, registerUser } from '../../core/services/userService';
import type { AuthResult } from '../../core/services/userService';
import { useConnectionStatus } from '../../core/hooks/useConnectionStatus';
import ConnectionBanner from './ConnectionBanner';
import type { UserRole } from '../../core/services/userService';
import { useT } from '../../config/i18n';
import '../../styles/let-go-style.css';

type Tab = 'signin' | 'signup';
type Status = { type: 'error' | 'success'; text: string } | null;

function routeForRole(role?: UserRole): string {
  switch (role) {
    case 'supervisor': return '/supervisor';
    case 'creator':
    case 'both':
    case 'reader':
    default: return '/home';
  }
}

function passwordStrength(pass: string): 'weak' | 'medium' | 'strong' {
  if (pass.length < 8) return 'weak';
  const hasLetter = /[a-zA-Z]/.test(pass);
  const hasDigit = /\d/.test(pass);
  const hasSymbol = /[^a-zA-Z0-9]/.test(pass);
  if (pass.length >= 12 && hasLetter && hasDigit && hasSymbol) return 'strong';
  if (hasLetter && hasDigit) return 'medium';
  return 'weak';
}

export default function LetGo() {
  const [tab, setTab] = useState<Tab>('signin');
  const [status, setStatus] = useState<Status>(null);
  const [signupPassword, setSignupPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const t = useT();
  const navigate = useNavigate();
  const { state: connection, isBlocked, recheck } = useConnectionStatus();

  /** Vérifie la connexion juste avant l'envoi (la bannière peut être périmée). */
  const ensureConnection = async (): Promise<boolean> => {
    if (connection === 'online') return true;
    const ok = await recheck();
    if (!ok) {
      setStatus({
        type: 'error',
        text: navigator.onLine === false ? t.auth.errOffline : t.auth.errUnreachable,
      });
    }
    return ok;
  };

  /** Message localisé ; un échec réseau déclenche aussi une re-vérification. */
  const messageFor = (result: AuthResult): string => {
    if (result.code === 'network') {
      void recheck();
      return t.auth.errNetwork;
    }
    return result.message;
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    setStatus(null);
    setSignupPassword('');
  };

  const handleSignin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setStatus(null);

    const form = e.currentTarget;
    const email = (form.querySelector('#signinEmail') as HTMLInputElement).value.trim();
    const pass = (form.querySelector('#signinPassword') as HTMLInputElement).value;

    if (!email || !pass) {
      setStatus({ type: 'error', text: t.auth.errFillFields });
      setLoading(false);
      return;
    }

    if (!(await ensureConnection())) {
      setLoading(false);
      return;
    }

    const result = await loginUser(email, pass);

    if (!result.success || !result.user) {
      setStatus({ type: 'error', text: messageFor(result) });
      setLoading(false);
      return;
    }

    setStatus({ type: 'success', text: result.message });
    const target = routeForRole(result.user.role);

    window.setTimeout(() => {
      navigate(target, { replace: true });
    }, 700);
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setStatus(null);

    const form = e.currentTarget;
    const name = (form.querySelector('#signupName') as HTMLInputElement).value.trim();
    const email = (form.querySelector('#signupEmail') as HTMLInputElement).value.trim();
    const pass = (form.querySelector('#signupPassword') as HTMLInputElement).value;
    const confirm = (form.querySelector('#signupConfirm') as HTMLInputElement).value;

    if (!name || !email || !pass || !confirm) {
      setStatus({ type: 'error', text: t.auth.errFillFields });
      setLoading(false);
      return;
    }
    if (pass !== confirm) {
      setStatus({ type: 'error', text: t.auth.errPasswordMatch });
      setLoading(false);
      return;
    }
    if (pass.length < 8) {
      setStatus({ type: 'error', text: 'Password must be at least 8 characters.' });
      setLoading(false);
      return;
    }
    if (passwordStrength(pass) === 'weak') {
      setStatus({ type: 'error', text: t.auth.errPasswordWeak });
      setLoading(false);
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setStatus({ type: 'error', text: t.auth.errEmailInvalid });
      setLoading(false);
      return;
    }

    if (!(await ensureConnection())) {
      setLoading(false);
      return;
    }

    const result = await registerUser(name, email, pass);

    if (!result.success) {
      setStatus({ type: 'error', text: messageFor(result) });
      setLoading(false);
      return;
    }

    setStatus({ type: 'success', text: result.message });
    setLoading(false);
    
    form.reset();
    setSignupPassword('');
  };

  const strength = passwordStrength(signupPassword);

  return (
    <>
      <section className="auth-page" id="authPage">
        <div className="overlay" />
        <ParticlesCanvas />
        <FloatingShapes />

        <div className="auth-card glass">
          <Link to="/" className="back-link">
            <ChevronLeft size={20} />
            {t.common.back}
          </Link>

          <div className="logo-brand">
            ReZ<span className="accent">Toon</span>
          </div>
          <p className="welcome">{t.auth.welcomeBack}</p>

          <div className="auth-tabs" id="authTabs">
            <button
              className={`auth-tab ${tab === 'signin' ? 'active' : ''}`}
              onClick={() => switchTab('signin')}
              disabled={loading}
            >
              {t.auth.signIn}
            </button>
            <button
              className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
              onClick={() => switchTab('signup')}
              disabled={loading}
            >
              {t.auth.signUp}
            </button>
          </div>

          <ConnectionBanner state={connection} onRetry={() => { void recheck(); }} />

          {status && (
            <div className={`form-message ${status.type}`} role="alert">
              {status.text}
            </div>
          )}

          {tab === 'signin' && (
            <form className="auth-form active" id="signinForm" autoComplete="off" onSubmit={handleSignin}>
              <div className="form-group">
                <label htmlFor="signinEmail">{t.auth.email}</label>
                <input type="email" id="signinEmail" placeholder="you@example.com" required />
              </div>
              <div className="form-group">
                <label htmlFor="signinPassword">{t.auth.password}</label>
                <input type="password" id="signinPassword" placeholder="••••••••" required />
              </div>
              <div className="form-options">
                <label>
                  <input type="checkbox" defaultChecked /> {t.auth.rememberMe}
                </label>
                <Link to="/forgot">{t.auth.forgotPassword}</Link>
              </div>
              <button type="submit" className="btn-auth" disabled={loading || isBlocked}>
                {loading ? t.common.loading : t.auth.signInCta}
              </button>

              <div className="auth-footer">
                <span>
                  {t.auth.noAccount}{' '}
                  <a href="#" onClick={(e) => { e.preventDefault(); switchTab('signup'); }}>
                    {t.auth.signUp}
                  </a>
                </span>
              </div>
            </form>
          )}

          {tab === 'signup' && (
            <form className="auth-form active" id="signupForm" autoComplete="off" onSubmit={handleSignup}>
              <div className="form-group">
                <label htmlFor="signupName">{t.auth.fullName}</label>
                <input type="text" id="signupName" placeholder={t.auth.namePlaceholder} required />
              </div>
              <div className="form-group">
                <label htmlFor="signupEmail">{t.auth.email}</label>
                <input type="email" id="signupEmail" placeholder="you@example.com" required />
              </div>
              <div className="form-group">
                <label htmlFor="signupPassword">{t.auth.password}</label>
                <input
                  type="password"
                  id="signupPassword"
                  placeholder="••••••••"
                  required
                  minLength={8}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                />
                {signupPassword && (
                  <span
                    className="char-counter"
                    style={{
                      color: strength === 'strong' ? '#4ade80' : strength === 'medium' ? '#f5b042' : '#ff6b61',
                    }}
                  >
                    {t.auth.strength}: {strength}
                  </span>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="signupConfirm">{t.auth.confirmPassword}</label>
                <input type="password" id="signupConfirm" placeholder="••••••••" required minLength={8} />
              </div>
              <button type="submit" className="btn-auth" disabled={loading || isBlocked}>
                {loading ? t.common.loading : t.auth.signUpCta}
              </button>

              <div className="auth-footer">
                <span>
                  {t.auth.haveAccount}{' '}
                  <a href="#" onClick={(e) => { e.preventDefault(); switchTab('signin'); }}>
                    {t.auth.signIn}
                  </a>
                </span>
              </div>
            </form>
          )}

          <div className="auth-footer">
            <span className="copyright">© 2026 ReZToon · All rights reserved.</span>
          </div>
        </div>
      </section>
    </>
  );
}