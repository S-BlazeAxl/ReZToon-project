// src/features/messaging/ErrorBoundary.tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class MessagingErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[Messaging] crashed:', error, info);
  }

  handleReset = () => {
    Object.keys(localStorage)
      .filter(
        (k) =>
          k.startsWith('reztoon_conv_meta') ||
          k.startsWith('reztoon_messaging_') ||
          k.startsWith('reztoon_seeded_v'),
      )
      .forEach((k) => localStorage.removeItem(k));
    this.setState({ hasError: false, message: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 40,
            textAlign: 'center',
            color: 'rgba(255,255,255,0.7)',
            minHeight: 240,
          }}
        >
          <AlertTriangle size={36} color="#ff6b61" />
          <p style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            {this.props.fallbackMessage ?? 'Messaging failed to load'}
          </p>
          <span style={{ fontSize: '0.78rem', opacity: 0.6, maxWidth: 320 }}>
            {this.state.message}
          </span>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              marginTop: 8,
              padding: '10px 20px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #f5b042, #e8a75c)',
              color: '#0d0d1a',
              fontWeight: 800,
              fontSize: '0.82rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Reset messaging data
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}