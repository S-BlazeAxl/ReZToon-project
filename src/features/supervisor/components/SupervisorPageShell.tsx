import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import '../../../styles/supervisor-chips-style.css';
import '../../../styles/supervisor-responsive-style.css';

interface Props {
  title: string;
  subtitle?: string;
  tag?: string;
  tagIcon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export default function SupervisorPageShell({
  title,
  subtitle,
  tag,
  tagIcon,
  actions,
  children,
}: Props) {
  return (
    <main className="supervisor-page">
      <Link to="/supervisor" className="supervisor-page-back">
        <ArrowLeft size={14} /> Back to Console
      </Link>

      <header className="supervisor-page-header">
        {tag && (
          <span className="supervisor-page-tag">
            {tagIcon}
            {tag}
          </span>
        )}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </header>

      {actions && <div className="supervisor-page-actions">{actions}</div>}

      {children}
    </main>
  );
}