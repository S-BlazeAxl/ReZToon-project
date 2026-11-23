import { BarChart3 } from 'lucide-react';

interface Item {
    id: string;
    label: string;
    value: number;
    suffix?: string;
    prefix?: string;
    color?: string;
}

interface Props {
    items: Item[];
    max?: number;
    emptyMessage?: string;
}

export default function BarChartH({ items, max, emptyMessage = 'No data recorded yet' }: Props) {
    if (!items || items.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, color: 'rgba(255,255,255,0.3)', gap: 10 }}>
                <BarChart3 size={32} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{emptyMessage}</span>
            </div>
        );
    }

    const topValue = max ?? Math.max(...items.map((i) => i.value), 1);

    return (
        <ul className="chart-bar-h">
            {items.map((item) => {
                const pct = Math.round((item.value / topValue) * 100);
                return (
                    <li key={item.id} className="chart-bar-h-row">
                        <span className="chart-bar-h-label">{item.label}</span>
                        <div className="chart-bar-h-track">
                            <div
                                className="chart-bar-h-fill"
                                style={{
                                    width: `${pct}%`,
                                    background:
                                        item.color ??
                                        'linear-gradient(90deg, #f5b042, #e8a75c)',
                                }}
                            />
                        </div>
                        <span className="chart-bar-h-value">
                            {item.prefix}
                            {item.value.toLocaleString()}
                            {item.suffix}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}