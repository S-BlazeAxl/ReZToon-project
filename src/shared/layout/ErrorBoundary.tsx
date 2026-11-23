import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: 'var(--dark)',
          color: '#fff', padding: '20px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>😵</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '10px' }}>
            Oops, an unexpected error occurred.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '30px', maxWidth: '400px' }}>
            The application ran into a problem. Please reload the page to continue.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px', borderRadius: '10px', background: 'var(--primary)',
              color: '#0d0d1a', fontWeight: 800, border: 'none', cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}