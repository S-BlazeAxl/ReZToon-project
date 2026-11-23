import { PieChart } from 'lucide-react';

interface Slice {
    id: string;
    label: string;
    value: number;
    color: string;
}

interface Props {
    slices: Slice[];
    emptyMessage?: string;
    totalLabel?: string;
}

export default function DonutChart({ slices, emptyMessage = 'No data recorded yet', totalLabel = 'TOTAL' }: Props) {
    const total = slices.reduce((s, x) => s + x.value, 0);

    if (!slices || slices.length === 0 || total === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, color: 'rgba(255,255,255,0.3)', gap: 10 }}>
                <PieChart size={32} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{emptyMessage}</span>
            </div>
        );
    }

    const radius = 60;
    const circumference = 2 * Math.PI * radius;

    let offset = 0;
    const arcs = slices.map((s) => {
        const length = (s.value / total) * circumference;
        const arc = {
            ...s,
            dash: length,
            gap: circumference - length,
            offset: -offset,
        };
        offset += length;
        return arc;
    });

    return (
        <div className="chart-donut">
            <svg viewBox="0 0 160 160">
                <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="20"
                />
                {arcs.map((a) => (
                    <circle
                        key={a.id}
                        cx="80"
                        cy="80"
                        r={radius}
                        fill="none"
                        stroke={a.color}
                        strokeWidth="20"
                        strokeDasharray={`${a.dash} ${a.gap}`}
                        strokeDashoffset={a.offset}
                        transform="rotate(-90 80 80)"
                    />
                ))}
                <text
                    x="80"
                    y="76"
                    textAnchor="middle"
                    fill="#fff"
                    fontSize="22"
                    fontWeight="900"
                >
                    {total}
                </text>
                <text
                    x="80"
                    y="94"
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.5)"
                    fontSize="10"
                    letterSpacing="1.5"
                >
                    {totalLabel}
                </text>
            </svg>

            <ul className="chart-donut-legend">
                {slices.map((s) => {
                    const pct = Math.round((s.value / total) * 100);
                    return (
                        <li key={s.id}>
                            <span className="chart-dot" style={{ background: s.color }} />
                            <span className="chart-donut-legend-label">{s.label}</span>
                            <span className="chart-donut-legend-value">
                                {s.value} · {pct}%
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}