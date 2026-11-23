import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Users, Globe, Lock } from "lucide-react";
import { useGroups } from "../../core/hooks/useGroups";
import { useGenres } from "../../core/hooks/useGenres";
import { getIcon } from "../../shared/ui/Icon";
import { useT } from "../../config/i18n";

interface Props {
    open: boolean;
    onClose: () => void;
    onCreated?: (groupId: string) => void;
}

const GROUP_ICONS = [
    "Users", "BookOpen", "Heart", "Flame", "Rocket",
    "Sparkles", "Music", "Moon", "Feather", "Compass",
];

const GROUP_COLORS = [
    "#f5b042", "#c25b3c", "#4ade80", "#60a5fa",
    "#a78bfa", "#f472b6", "#e8a75c", "#22d3ee",
];

export default function CreateGroupModal({ open, onClose, onCreated }: Props) {
    const t = useT();
    const { create } = useGroups({ loadOnMount: false });

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const { names: genreNames } = useGenres();
    const [genre, setGenre] = useState<string>("");
    const effectiveGenre = genre || genreNames[0] || "";
    const [icon, setIcon] = useState(GROUP_ICONS[0]);
    const [color, setColor] = useState(GROUP_COLORS[0]);
    const [visibility, setVisibility] = useState<"public" | "private">("public");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const reset = () => {
        setName("");
        setDescription("");
        setGenre("");
        setIcon(GROUP_ICONS[0]);
        setColor(GROUP_COLORS[0]);
        setVisibility("public");
        setError(null);
        setIsSubmitting(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (name.trim().length < 3) {
            setError(t.groups.errNameLength);
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await create({ name, description, genre, icon, color, visibility });

            if (!result.success || !result.group) {
                setError(result.message);
                return;
            }

            reset();
            onClose();
            onCreated?.(result.group.id);
        } catch (err: any) {
            setError(err?.message || t.common.errUnexpected);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!open) return null;

    return createPortal(
        <div
            className="group-modal-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isSubmitting) {
                    reset();
                    onClose();
                }
            }}
        >
            <div className="group-modal">
                <header className="group-modal-header">
                    <div className="group-modal-title">
                        <Users size={18} />
                        <h2>{t.groups.create}</h2>
                    </div>
                    <button
                        type="button"
                        className="group-modal-close"
                        onClick={() => {
                            if (!isSubmitting) {
                                reset();
                                onClose();
                            }
                        }}
                        disabled={isSubmitting}
                        aria-label={t.common.close}
                    >
                        <X size={16} />
                    </button>
                </header>

                <form className="group-modal-form" onSubmit={handleSubmit}>
                    {error && <div className="form-message error">{error}</div>}

                    <div className="group-form-group">
                        <label htmlFor="group-name">{t.groups.name}</label>
                        <input
                            id="group-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t.groups.namePlaceholder}
                            maxLength={60}
                            autoFocus
                            disabled={isSubmitting}
                        />
                        <span className="group-char-counter">{name.length}/60</span>
                    </div>

                    <div className="group-form-group">
                        <label htmlFor="group-desc">{t.groups.description}</label>
                        <textarea
                            id="group-desc"
                            className="group-textarea"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t.groups.descriptionPlaceholder}
                            maxLength={280}
                            rows={3}
                            disabled={isSubmitting}
                        />
                        <span className="group-char-counter">{description.length}/280</span>
                    </div>

                    <div className="group-form-group">
                        <label>{t.groups.category}</label>
                        <select
                            className="group-select"
                            value={effectiveGenre}
                            onChange={(e) => setGenre(e.target.value)}
                            disabled={isSubmitting}
                        >
                            {genreNames.map((g) => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>

                    <div className="group-form-group">
                        <label>{t.groups.icon}</label>
                        <div className="group-icon-picker">
                            {GROUP_ICONS.map((ic) => {
                                const IconComp = getIcon(ic);
                                return (
                                    <button
                                        key={ic}
                                        type="button"
                                        className={`group-icon-option ${icon === ic ? "active" : ""}`}
                                        onClick={() => setIcon(ic)}
                                        title={ic}
                                        disabled={isSubmitting}
                                    >
                                        <IconComp size={14} />
                                        <span>{ic}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="group-form-group">
                        <label>{t.groups.color}</label>
                        <div className="group-color-picker">
                            {GROUP_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    className={`group-color-option ${color === c ? "active" : ""}`}
                                    style={{ background: c }}
                                    onClick={() => setColor(c)}
                                    aria-label={c}
                                    disabled={isSubmitting}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="group-form-group">
                        <label>{t.groups.visibility}</label>
                        <div className="group-visibility-row">
                            <button
                                type="button"
                                className={`group-visibility-btn ${visibility === "public" ? "active" : ""}`}
                                onClick={() => setVisibility("public")}
                                disabled={isSubmitting}
                            >
                                <Globe size={14} />
                                <div>
                                    <strong>{t.groups.public}</strong>
                                    <span>{t.groups.publicDesc}</span>
                                </div>
                            </button>
                            <button
                                type="button"
                                className={`group-visibility-btn ${visibility === "private" ? "active" : ""}`}
                                onClick={() => setVisibility("private")}
                                disabled={isSubmitting}
                            >
                                <Lock size={14} />
                                <div>
                                    <strong>{t.groups.private}</strong>
                                    <span>{t.groups.privateDesc}</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="group-modal-actions">
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => {
                                if (!isSubmitting) {
                                    reset();
                                    onClose();
                                }
                            }}
                            disabled={isSubmitting}
                        >
                            {t.common.cancel}
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting || name.trim().length < 3}
                        >
                            {isSubmitting ? t.groups.creating : t.groups.createBtn}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
      document.body,
    );
}