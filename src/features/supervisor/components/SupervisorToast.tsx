interface Props {
    message: string;
}

export default function SupervisorToast({ message }: Props) {
    return (
        <div
            style={{
                position: 'fixed',
                bottom: 30,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 'var(--z-toast)',
                padding: '12px 22px',
                borderRadius: 12,
                background:
                    'linear-gradient(135deg, rgba(245,176,66,0.2), rgba(194,91,60,0.15))',
                border: '1px solid rgba(245,176,66,0.4)',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 700,
                boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            }}
        >
            {message}
        </div>
    );
}