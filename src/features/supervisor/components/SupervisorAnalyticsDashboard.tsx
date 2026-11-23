import { useEffect, useState } from 'react';
import {
    TrendingUp, Globe2, Users as UsersIcon, PenTool, Activity,
    Trophy, Calendar, BookOpen, Heart, MessageCircle, Eye, ShieldCheck,
} from 'lucide-react';
import { LineChart, BarChartH, BarChartV, DonutChart } from './charts';
import { getAnalyticsSnapshot, type AnalyticsSnapshot } from '../services/analytics';
import { useT } from '../../../config/i18n';
import '../../../styles/supervisor-analytics-style.css';
import '../../../styles/supervisor-chips-style.css';
import '../../../styles/supervisor-missing-style.css';
import '../../../styles/supervisor-responsive-style.css';

type Period = '6m' | '12m';

export default function SupervisorAnalyticsDashboard() {
    const t = useT();
    const [period, setPeriod] = useState<Period>('12m');
    const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            const data = await getAnalyticsSnapshot(t);
            if (!cancelled) {
                setSnapshot(data);
                setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [t]);

    if (loading || !snapshot) {
        return (
            <div className="supervisor-analytics" style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="loader-ring" style={{ width: 40, height: 40, borderWidth: 3 }} />
            </div>
        );
    }

    const growth = period === '12m' ? snapshot.growth : snapshot.growth.slice(-6);

    const growthSeries = [
        { id: 'users', label: t.analytics.newUsers, color: '#f5b042', values: growth.map((g) => g.users) },
        { id: 'creators', label: t.analytics.newCreators, color: '#4ade80', values: growth.map((g) => g.creators) },
        { id: 'active', label: t.analytics.activeUsers, color: '#a78bfa', values: growth.map((g) => g.active) },
    ];

    const countryBars = snapshot.countries.map((c) => ({
        id: c.code,
        label: `${c.flag} ${c.name}`,
        value: c.users,
        suffix: ` (${c.percent}%)`,
    }));

    return (
        <div className="supervisor-analytics">
            <header className="supervisor-analytics-head">
                <div>
                    <span className="supervisor-analytics-tag">
                        <Activity size={12} /> {t.analytics.liveAnalytics}
                    </span>
                    <h2>{t.analytics.consoleOverview}</h2>
                    <p>{t.analytics.realTimeMetrics}</p>
                </div>

                <div className="supervisor-analytics-period">
                    <button type="button" className={`supervisor-chip ${period === '6m' ? 'active' : ''}`} onClick={() => setPeriod('6m')}>{t.analytics.period6m}</button>
                    <button type="button" className={`supervisor-chip ${period === '12m' ? 'active' : ''}`} onClick={() => setPeriod('12m')}>{t.analytics.period12m}</button>
                </div>
            </header>

            <section className="supervisor-kpi-grid">
                {snapshot.kpis.map((k) => (
                    <div key={k.id} className="supervisor-kpi-card">
                        <span className="supervisor-kpi-label">{k.label}</span>
                        <strong className="supervisor-kpi-value">{k.value}</strong>
                        <div className="supervisor-kpi-foot">
                            {k.trend !== null && (
                                <span className={`supervisor-kpi-trend ${k.trend > 0 ? 'positive' : k.trend < 0 ? 'negative' : ''}`}>
                                    {k.trend > 0 ? '+' : ''}{k.trend}%
                                </span>
                            )}
                            <span className="supervisor-kpi-trend-label">{k.trendLabel}</span>
                        </div>
                        <span className="supervisor-kpi-accent" style={{ background: k.accent }} />
                    </div>
                ))}
            </section>

            <section className="supervisor-analytics-grid">
                <div className="supervisor-analytics-card supervisor-analytics-card-wide">
                    <header className="supervisor-analytics-card-head">
                        <div><TrendingUp size={14} /><h3>{t.analytics.growthEvolution}</h3></div>
                        <span className="supervisor-analytics-card-sub">{t.analytics.growthSubtitle}</span>
                    </header>
                    <LineChart labels={growth.map((g) => g.month)} series={growthSeries} height={240} emptyMessage={t.analytics.noData} />
                </div>

                <div className="supervisor-analytics-card">
                    <header className="supervisor-analytics-card-head">
                        <div><UsersIcon size={14} /><h3>{t.analytics.roleDistribution}</h3></div>
                    </header>
                    <DonutChart slices={snapshot.roles} emptyMessage={t.analytics.noData} totalLabel={t.analytics.total} />
                </div>

                <div className="supervisor-analytics-card">
                    <header className="supervisor-analytics-card-head">
                        <div><Globe2 size={14} /><h3>{t.analytics.topCountries}</h3></div>
                        <span className="supervisor-analytics-card-sub">{snapshot.countries.length} {t.analytics.regions}</span>
                    </header>
                    <BarChartH items={countryBars} emptyMessage={t.analytics.noData} />
                </div>

                <div className="supervisor-analytics-card">
                    <header className="supervisor-analytics-card-head">
                        <div><Calendar size={14} /><h3>{t.analytics.weeklyActivity}</h3></div>
                        <span className="supervisor-analytics-card-sub">{t.analytics.postsPerDay}</span>
                    </header>
                    <BarChartV
                        items={snapshot.weekday.map((d) => ({
                            id: d.day,
                            label: d.day,
                            value: d.value,
                        }))}
                        accent="#f472b6"
                        emptyMessage={t.analytics.noActivityWeek}
                    />
                </div>

                <div className="supervisor-analytics-card">
                    <header className="supervisor-analytics-card-head">
                        <div><BookOpen size={14} /><h3>{t.analytics.popularGenres}</h3></div>
                    </header>
                    <BarChartH
                        items={snapshot.genres.map((g) => ({
                            id: g.genre,
                            label: g.genre,
                            value: g.mangas,
                            suffix: ` (${g.percent}%)`,
                            color: 'linear-gradient(90deg, #4ade80, #22d3ee)',
                        }))}
                        emptyMessage={t.analytics.noData}
                    />
                </div>

                <div className="supervisor-analytics-card">
                    <header className="supervisor-analytics-card-head">
                        <div><PenTool size={14} /><h3>{t.analytics.topCreators}</h3></div>
                        <span className="supervisor-analytics-card-sub">{t.analytics.mostActive}</span>
                    </header>
                    {snapshot.topCreators.length === 0 ? (
                        <p className="supervisor-analytics-empty">{t.analytics.noCreators}</p>
                    ) : (
                        <ul className="supervisor-top-list">
                            {snapshot.topCreators.map((c, i) => (
                                <li key={c.id} className="supervisor-top-item">
                                    <span className="supervisor-top-rank">#{i + 1}</span>
                                    <div className="supervisor-top-avatar">{c.name.charAt(0).toUpperCase()}</div>
                                    <div className="supervisor-top-info">
                                        <strong>{c.name}</strong>
                                        <span>{c.country}</span>
                                    </div>
                                    <div className="supervisor-top-metrics">
                                        <span><BookOpen size={10} /> {c.series}</span>
                                        <span><Eye size={10} /> {c.reads.toLocaleString()}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="supervisor-analytics-card">
                    <header className="supervisor-analytics-card-head">
                        <div><Heart size={14} /><h3>{t.analytics.topReaders}</h3></div>
                        <span className="supervisor-analytics-card-sub">{t.analytics.mostEngaged}</span>
                    </header>
                    {snapshot.topReaders.length === 0 ? (
                        <p className="supervisor-analytics-empty">{t.analytics.noReaderActivity}</p>
                    ) : (
                        <ul className="supervisor-top-list">
                            {snapshot.topReaders.map((r, i) => (
                                <li key={r.id} className="supervisor-top-item">
                                    <span className="supervisor-top-rank">#{i + 1}</span>
                                    <div className="supervisor-top-avatar">{r.name.charAt(0).toUpperCase()}</div>
                                    <div className="supervisor-top-info">
                                        <strong>{r.name}</strong>
                                        <span>{r.country}</span>
                                    </div>
                                    <div className="supervisor-top-metrics">
                                        <span><MessageCircle size={10} /> {r.comments}</span>
                                        <span><Heart size={10} /> {r.likes}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="supervisor-analytics-card">
                    <header className="supervisor-analytics-card-head">
                        <div><Trophy size={14} /><h3>{t.analytics.platformHealth}</h3></div>
                    </header>
                    <div className="supervisor-health">
                        <div
                            className="supervisor-health-ring"
                            style={{ background: `conic-gradient(#4ade80 0% ${snapshot.health.score}%, rgba(255,255,255,0.06) ${snapshot.health.score}% 100%)` }}
                        >
                            <div className="supervisor-health-inner">
                                <strong>{snapshot.health.score}</strong>
                                <span>/ 100</span>
                            </div>
                        </div>
                        <ul className="supervisor-health-stats">
                            <li><span className="supervisor-health-dot danger" /><span>{t.analytics.openReports}</span><strong>{snapshot.health.openReports}</strong></li>
                            <li><span className="supervisor-health-dot ok" /><span>{t.analytics.resolved}</span><strong>{snapshot.health.resolvedReports}</strong></li>
                            <li><span className="supervisor-health-dot info" /><span>{t.analytics.resolutionRate}</span><strong>{snapshot.health.resolutionRate}%</strong></li>
                        </ul>
                    </div>
                </div>
            </section>

            <section className="supervisor-analytics-card">
                <header className="supervisor-analytics-card-head">
                    <div><ShieldCheck size={14} /><h3>{t.analytics.automatedInsights}</h3></div>
                </header>
                <ul className="supervisor-insights-list">
                    {snapshot.insights.map((s, i) => (
                        <li key={i} className="supervisor-insight">
                            <span className="supervisor-insight-bullet" />
                            <span>{s}</span>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}