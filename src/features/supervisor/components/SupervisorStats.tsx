import { Users, Flag, ShieldCheck, Shield } from 'lucide-react';
// 👇 Correction des chemins d'import
import type { User } from '../../../core/services/userService';
import type { Report } from '../../../core/services/reportService';

interface Props {
    users: User[];
    reports: Report[];
}

export default function SupervisorStats({ users, reports }: Props) {
    const openReports = reports.filter((r) => r.status === 'open').length;

    const highPriority = reports.filter(
        (r) => r.severity === 'high' && r.status === 'open'
    ).length;

    const moderators = users.filter((u) =>
        (u.permissions ?? []).includes('moderate_content')
    ).length;

    const supervisors = users.filter((u) => u.role === 'supervisor').length;

    const stats = [
        {
            label: 'Total Users',
            value: String(users.length),
            icon: Users,
            trend: 'Registered accounts',
        },
        {
            label: 'Open Reports',
            value: String(openReports),
            icon: Flag,
            trend: `${highPriority} high priority`,
        },
        {
            label: 'Moderators',
            value: String(moderators),
            icon: ShieldCheck,
            trend: 'With content rights',
        },
        {
            label: 'Supervisors',
            value: String(supervisors),
            icon: Shield,
            trend: 'Full access',
        },
    ];

    return (
        <div className="supervisor-stats-grid">
            {stats.map((s) => {
                const Icon = s.icon;
                return (
                    <div key={s.label} className="supervisor-stat-card">
                        <div className="supervisor-stat-icon">
                            <Icon size={18} />
                        </div>
                        <span className="supervisor-stat-label">{s.label}</span>
                        <strong className="supervisor-stat-value">{s.value}</strong>
                        <span className="supervisor-stat-trend">{s.trend}</span>
                    </div>
                );
            })}
        </div>
    );
}