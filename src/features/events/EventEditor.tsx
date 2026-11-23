import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Check, Save, Eye, EyeOff, Palette, Layout, Image as ImageIcon,
  Calendar, FileText, Sparkles, ZoomIn, ZoomOut, AlertTriangle,
  Upload, Link as LinkIcon, Trash2, BarChart3, Tag, Type, Loader2
} from 'lucide-react';
import EventCard from './EventCard';
import { getIcon } from '../../shared/ui/Icon';
import { supabase } from '../../core/lib/supabase';
import { useCurrentUser } from '../../core/hooks/useCurrentUser';
import {
  type CommunityEvent,
  type EventDesign,
  type EventCategory,
  DEFAULT_EVENT_DESIGN,
  EVENT_BG_PRESETS,
  EVENT_ACCENT_COLORS,
  EVENT_TEXT_COLORS,
  EVENT_ICONS,
} from '../../core/services/eventService';
import { useT } from '../../config/i18n';

interface Props {
  open: boolean;
  initial?: CommunityEvent | null;
  onClose: () => void;
  onSave: (event: Partial<CommunityEvent>) => void;
}

type Tab = 'content' | 'look' | 'stats' | 'background';

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

const CATEGORIES: EventCategory[] = [
  'festival', 'awards', 'live', 'contest', 'workshop', 'meetup', 'premiere', 'masterclass',
];

function toDateInputValue(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventEditor({ open, initial, onClose, onSave }: Props) {
  const t = useT();
  const user = useCurrentUser();
  const [tab, setTab] = useState<Tab>('content');
  const [previewMode, setPreviewMode] = useState(false);
  const [zoom, setZoom] = useState(0.75);

  const [title, setTitle] = useState('');
  const [host, setHost] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventCategory>('festival');
  const [featured, setFeatured] = useState(false);
  const [attendees, setAttendees] = useState(0);
  const [price, setPrice] = useState('Free');
  const [design, setDesign] = useState<EventDesign>({ ...DEFAULT_EVENT_DESIGN });

  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title);
      setHost(initial.host);
      setDate(toDateInputValue(initial.date));
      setLocation(initial.location);
      setDescription(initial.description ?? '');
      setCategory(initial.category ?? 'festival');
      setFeatured(Boolean(initial.featured));
      setAttendees(initial.attendees ?? 0);
      setPrice(initial.price ?? 'Free');
      setDesign({ ...DEFAULT_EVENT_DESIGN, ...(initial.design ?? {}) });
    } else {
      setTitle(''); setHost(''); setDate(''); setLocation(''); setDescription('');
      setCategory('festival'); setFeatured(false); setAttendees(0); setPrice('Free');
      setDesign({ ...DEFAULT_EVENT_DESIGN });
    }
    setError(null);
    setTab('content');
    setPreviewMode(false);
    setZoom(0.75);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !uploading) onClose();
    };
    document.addEventListener('keydown', onKey);
    
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, uploading]);

  const previewEvent = useMemo<CommunityEvent>(
    () => ({
      id: initial?.id ?? 'preview',
      title: title.trim() || t.events.previewDefaultTitle,
      host: host.trim() || t.events.previewDefaultHost,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      location: location.trim() || t.events.previewDefaultLocation,
      description: description.trim() || t.events.previewDefaultDescription,
      category, featured, attendees, price, design,
    }),
    [title, host, date, location, description, category, featured, attendees, price, design, t],
  );

  const updateDesign = (patch: Partial<EventDesign>) => {
    setDesign((d) => ({ ...d, ...patch }));
  };

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError(t.events.errImageType);
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError(t.events.errImageSize);
      return;
    }
    if (!user) {
      setError(t.events.errLogin);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/event-cover-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('events-media')
        .upload(path, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('events-media')
        .getPublicUrl(path);

      updateDesign({ image: publicUrl });
    } catch (err) {
      setError(t.events.errUpload);
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    if (!title.trim() || !host.trim() || !date || !location.trim()) {
      setError(t.events.errRequired);
      return;
    }
    onSave({
      title: title.trim(),
      host: host.trim(),
      date: new Date(date).toISOString(),
      location: location.trim(),
      description: description.trim(),
      category,
      featured,
      attendees,
      price,
      design,
    });
  };

  if (!open) return null;

  return createPortal(
    <div className="event-editor-overlay">
      <div className="event-editor">
        <header className="event-editor-topbar">
          <div className="event-editor-brand">
            <Sparkles size={16} />
            <span>{t.events.studio}</span>
            <span className="event-editor-mode">{initial ? t.events.editing : t.events.newEvent}</span>
          </div>

          <div className="event-editor-topbar-center">
            <button
              type="button"
              className={`event-editor-toggle ${previewMode ? 'active' : ''}`}
              onClick={() => setPreviewMode((v) => !v)}
            >
              {previewMode ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{previewMode ? t.events.exitPreview : t.events.preview}</span>
            </button>

            <div className="event-editor-zoom">
              <button type="button" onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))} aria-label={t.events.zoomOut}>
                <ZoomOut size={13} />
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setZoom((z) => Math.min(1.2, z + 0.1))} aria-label={t.events.zoomIn}>
                <ZoomIn size={13} />
              </button>
            </div>
          </div>

          <div className="event-editor-topbar-right">
            <button type="button" className="event-editor-btn ghost" onClick={onClose} disabled={uploading}>{t.common.cancel}</button>
            <button type="button" className="event-editor-btn primary" onClick={handleSave} disabled={uploading}>
              <Save size={14} /> {initial ? t.common.save : t.events.createEvent}
            </button>
            <button type="button" className="event-editor-close" onClick={onClose} aria-label={t.common.close} disabled={uploading}>
              <X size={15} />
            </button>
          </div>
        </header>

        <div className={`event-editor-body ${previewMode ? 'is-preview' : ''}`}>
          {!previewMode && (
            <aside className="event-editor-sidebar">
              <nav className="event-editor-tabs">
                {([
                  { id: 'content', label: t.events.content, icon: FileText },
                  { id: 'look', label: t.events.look, icon: Palette },
                  { id: 'stats', label: t.events.statsTab, icon: BarChart3 },
                  { id: 'background', label: t.events.background, icon: ImageIcon },
                ] as const).map((tabItem) => {
                  const Icon = tabItem.icon;
                  return (
                    <button key={tabItem.id} type="button" className={`event-editor-tab ${tab === tabItem.id ? 'active' : ''}`} onClick={() => setTab(tabItem.id)}>
                      <Icon size={15} /><span>{tabItem.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="event-editor-panel">
                {error && (
                  <div className="event-editor-error">
                    <AlertTriangle size={13} /> {error}
                  </div>
                )}

                {tab === 'content' && (
                  <div className="event-editor-form">
                    <h4 className="event-editor-section-title"><Tag size={11} /> {t.events.eventDetails}</h4>

                    <label className="event-editor-field">
                      <span>{t.events.titleLine1}</span>
                      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.events.titleLine1Placeholder} maxLength={80} />
                    </label>

                    <label className="event-editor-field">
                      <span>{t.events.titleHighlight}</span>
                      <input type="text" value={design.titleHighlight} onChange={(e) => updateDesign({ titleHighlight: e.target.value })} placeholder={t.events.titleHighlightPlaceholder} maxLength={30} />
                    </label>

                    <label className="event-editor-field">
                      <span>{t.events.badgeText}</span>
                      <input type="text" value={design.badgeText} onChange={(e) => updateDesign({ badgeText: e.target.value })} placeholder={t.events.badgeTextPlaceholder} maxLength={60} />
                    </label>

                    <label className="event-editor-field">
                      <span>{t.events.metaItems}</span>
                      <input type="text" value={design.metaItems} onChange={(e) => updateDesign({ metaItems: e.target.value })} placeholder={t.events.metaItemsPlaceholder} maxLength={120} />
                    </label>

                    <div className="event-editor-grid-2">
                      <label className="event-editor-field">
                        <span>{t.events.ageBadge}</span>
                        <input type="text" value={design.ageBadge} onChange={(e) => updateDesign({ ageBadge: e.target.value })} placeholder="16+" maxLength={8} />
                      </label>
                      <label className="event-editor-field">
                        <span>{t.events.rating}</span>
                        <input type="text" value={design.rating} onChange={(e) => updateDesign({ rating: e.target.value })} placeholder="4.7" maxLength={8} />
                      </label>
                    </div>

                    <label className="event-editor-field">
                      <span>{t.events.eventDetails}</span>
                      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={400} placeholder={t.events.descriptionPlaceholder} />
                      <span className="event-editor-counter">{description.length}/400</span>
                    </label>

                    <h4 className="event-editor-section-title"><Sparkles size={11} /> {t.events.callToActions}</h4>

                    <div className="event-editor-grid-2">
                      <label className="event-editor-field">
                        <span>{t.events.primaryCta}</span>
                        <input type="text" value={design.primaryCta} onChange={(e) => updateDesign({ primaryCta: e.target.value })} placeholder={t.events.primaryCtaPlaceholder} maxLength={24} />
                      </label>
                      <label className="event-editor-field">
                        <span>{t.events.secondaryCta}</span>
                        <input type="text" value={design.secondaryCta} onChange={(e) => updateDesign({ secondaryCta: e.target.value })} placeholder={t.events.secondaryCtaPlaceholder} maxLength={24} />
                      </label>
                    </div>

                    <h4 className="event-editor-section-title"><Calendar size={11} /> {t.events.dateAndPlace}</h4>

                    <label className="event-editor-field">
                      <span>{t.events.host}</span>
                      <input type="text" value={host} onChange={(e) => setHost(e.target.value)} placeholder={t.events.hostPlaceholder} maxLength={60} />
                    </label>

                    <label className="event-editor-field">
                      <span>{t.events.dateTime}</span>
                      <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
                    </label>

                    <label className="event-editor-field">
                      <span>{t.events.location}</span>
                      <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t.events.locationPlaceholder} maxLength={80} />
                    </label>
                  </div>
                )}

                {tab === 'look' && (
                  <div className="event-editor-style">
                    <h4 className="event-editor-section-title">{t.events.category}</h4>
                    <div className="event-editor-chips">
                      {CATEGORIES.map((c) => (
                        <button key={c} type="button" className={`event-editor-chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
                          {t.events.categories[c]}
                        </button>
                      ))}
                    </div>

                    <label className="event-editor-toggle-row">
                      <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
                      <span>{t.events.markFeatured}</span>
                    </label>

                    <h4 className="event-editor-section-title"><Type size={11} /> {t.events.titleSize} · {design.titleSize}px</h4>
                    <input type="range" min={36} max={88} value={design.titleSize} onChange={(e) => updateDesign({ titleSize: Number(e.target.value) })} className="event-editor-range" />

                    <h4 className="event-editor-section-title">{t.events.accent}</h4>
                    <div className="event-color-swatches">
                      {EVENT_ACCENT_COLORS.map((c) => (
                        <button key={c} type="button" className={`event-color-swatch ${design.accentColor === c ? 'active' : ''}`} style={{ background: c }} onClick={() => updateDesign({ accentColor: c })} aria-label={`Accent ${c}`} />
                      ))}
                    </div>

                    <h4 className="event-editor-section-title">{t.events.textColor}</h4>
                    <div className="event-color-swatches">
                      {EVENT_TEXT_COLORS.map((c) => (
                        <button key={c} type="button" className={`event-color-swatch ${design.textColor === c ? 'active' : ''}`} style={{ background: c }} onClick={() => updateDesign({ textColor: c })} aria-label={`Text ${c}`} />
                      ))}
                    </div>

                    <h4 className="event-editor-section-title">{t.events.icon}</h4>
                    <div className="event-icon-grid">
                      {EVENT_ICONS.map((name) => {
                        const Icon = getIcon(name);
                        return (
                          <button key={name} type="button" className={`event-icon-btn ${design.decorationIcon === name ? 'active' : ''}`} onClick={() => updateDesign({ decorationIcon: name })} aria-label={name} title={name}>
                            <Icon size={15} />
                          </button>
                        );
                      })}
                    </div>

                    <h4 className="event-editor-section-title">{t.events.overlayIntensity} · {Math.round(design.overlayIntensity * 100)}%</h4>
                    <input type="range" min={0.3} max={1} step={0.05} value={design.overlayIntensity} onChange={(e) => updateDesign({ overlayIntensity: Number(e.target.value) })} className="event-editor-range" />
                  </div>
                )}

                {tab === 'stats' && (
                  <div className="event-editor-style">
                    <h4 className="event-editor-section-title"><BarChart3 size={11} /> {t.events.statsMax4}</h4>
                    <p className="event-editor-hint">{t.events.statsHint}</p>

                    {[0, 1, 2, 3].map((i) => {
                      const stat = design.stats[i] ?? { value: '', label: '' };
                      return (
                        <div key={i} className="event-stat-row">
                          <input type="text" className="event-stat-input-value" value={stat.value} placeholder="9.8k" maxLength={12}
                            onChange={(e) => {
                              const next = [...design.stats];
                              next[i] = { value: e.target.value, label: next[i]?.label ?? '' };
                              updateDesign({ stats: next });
                            }}
                          />
                          <input type="text" className="event-stat-input-label" value={stat.label} placeholder="READS" maxLength={16}
                            onChange={(e) => {
                              const next = [...design.stats];
                              next[i] = { value: next[i]?.value ?? '', label: e.target.value };
                              updateDesign({ stats: next });
                            }}
                          />
                        </div>
                      );
                    })}

                    <h4 className="event-editor-section-title"><Tag size={11} /> {t.events.entry}</h4>
                    <div className="event-editor-grid-2">
                      <label className="event-editor-field">
                        <span>{t.events.priceLabel}</span>
                        <input type="text" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Free" maxLength={20} />
                      </label>
                      <label className="event-editor-field">
                        <span>{t.events.attendees}</span>
                        <input type="number" value={attendees} onChange={(e) => setAttendees(Number(e.target.value) || 0)} min={0} />
                      </label>
                    </div>
                  </div>
                )}

                {tab === 'background' && (
                  <div className="event-editor-image">
                    <div className="event-image-dropzone">
                      {design.image ? (
                        <div className="event-image-preview">
                          <img src={design.image} alt={t.events.background} />
                          <button type="button" className="event-image-remove" onClick={() => updateDesign({ image: '' })} aria-label={t.events.removeImage}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="event-image-empty">
                          <ImageIcon size={26} />
                          <p>{t.events.noBgImage}</p>
                          <span>{t.events.uploadOrPaste}</span>
                        </div>
                      )}
                    </div>

                    <input ref={fileInputRef} type="file" accept="image/*" hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleImageFile(f);
                        e.target.value = '';
                      }}
                    />

                    <button type="button" className="event-editor-btn primary full" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      {uploading ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
                      {uploading ? t.events.uploading : t.events.uploadImage}
                    </button>

                    <label className="event-editor-field">
                      <span>{t.events.orPasteUrl}</span>
                      <div className="event-image-url">
                        <LinkIcon size={13} />
                        <input type="text" placeholder="https://..." value={design.image.startsWith('data:') || design.image.startsWith('blob:') ? '' : design.image} onChange={(e) => updateDesign({ image: e.target.value.trim() })} />
                      </div>
                    </label>

                    <h4 className="event-editor-section-title">{t.events.overlayStyle}</h4>
                    <div className="event-editor-chips">
                      {(['none', 'dark', 'light', 'gradient-bottom', 'gradient-top'] as const).map((o) => (
                        <button key={o} type="button" className={`event-editor-chip ${design.imageOverlay === o ? 'active' : ''}`} onClick={() => updateDesign({ imageOverlay: o })}>
                          {t.events.overlayStyles[o]}
                        </button>
                      ))}
                    </div>

                    <h4 className="event-editor-section-title">{t.events.imageBlur} · {design.imageBlur}px</h4>
                    <input type="range" min={0} max={20} value={design.imageBlur} onChange={(e) => updateDesign({ imageBlur: Number(e.target.value) })} className="event-editor-range" />

                    <h4 className="event-editor-section-title">{t.events.fallbackBg}</h4>
                    <div className="event-bg-grid">
                      {EVENT_BG_PRESETS.map((bg) => {
                        const active = design.bgValue === bg.value;
                        return (
                          <button key={bg.id} type="button" className={`event-bg-swatch ${active ? 'active' : ''}`} onClick={() => updateDesign({ bgType: bg.type, bgValue: bg.value })} title={bg.label}>
                            <span className={`event-bg-inner ${bg.type === 'pattern' ? `bg-pattern pattern-${bg.value}` : ''}`} style={bg.type === 'pattern' ? { background: '#1c1c2e' } : { background: bg.value }} />
                            {active && <span className="event-bg-check"><Check size={11} /></span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          )}

          <section className="event-editor-canvas-wrap">
            <div className="event-editor-canvas" style={{ transform: `scale(${zoom})` }}>
              <EventCard event={previewEvent} />
            </div>
            <div className="event-editor-canvas-meta">
              <Layout size={11} />
              <span>{t.events.heroPreview}</span>
              <span className="dot">·</span>
              <span>{t.events.autoplayHint}</span>
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}