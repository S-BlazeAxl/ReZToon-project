import { useEffect, useState } from 'react';
import { AlertTriangle, LogOut, X } from 'lucide-react';
import { useCurrentUser, notifyUserChange } from '../../core/hooks/useCurrentUser';
import { logoutCurrentUser } from '../../core/services/userService';
import { useT } from '../../config/i18n';

export default function AccountSuspendedBanner() {
    const user = useCurrentUser();
    const t = useT();
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        setDismissed(false);
    }, [user?.id, user?.isActive]);

    if (!user || user.isActive !== false || dismissed) return null;

    const handleLogout = async () => {
        await logoutCurrentUser();
        notifyUserChange();
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 'var(--z-banner)',
                background: 'linear-gradient(90deg, #ea4335, #c25b3c)',
                color: '#fff',
                padding: '10px 16px',
                fontWeight: 800,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                flexWrap: 'wrap',
            }}
        >
            <AlertTriangle size={18} />
            <span style={{ flex: '1 1 auto', minWidth: 0 }}>{t.account.suspended}</span>
            <button
                type="button"
                onClick={handleLogout}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.4)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                }}
            >
                <LogOut size={13} />
                {t.account.logout}
            </button>
            <button
                type="button"
                onClick={() => setDismissed(true)}
                aria-label={t.common.close}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.4)',
                    color: '#fff',
                    cursor: 'pointer',
                }}
            >
                <X size={13} />
            </button>
        </div>
    );
}