import { Star, Trophy, Swords, Sparkles } from 'lucide-react';
import { getIcon } from '../../shared/ui/Icon';
import type { MangaCharacter } from '../../core/services/characterService';
import { ROLE_COLORS, ROLE_LABELS } from '../../core/services/characterService';
import { useT } from '../../config/i18n';

interface Props {
  character: MangaCharacter;
  onClick?: () => void;
}

export default function CharacterCard({ character, onClick }: Props) {
  const t = useT();
  const Icon = getIcon(character.icon);
  const accent = character.accentColor;
  const roleColor = ROLE_COLORS[character.role];
  const roleLabel = ROLE_LABELS[character.role];

  const RoleIcon =
    character.role === 'antagonist'
      ? Swords
      : character.role === 'protagonist'
        ? Star
        : character.role === 'deuteragonist'
          ? Trophy
          : Sparkles;

  return (
    <article
      className="character-card"
      style={{ '--char-accent': accent } as React.CSSProperties}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          }
          : undefined
      }
    >
      <div className="character-cover">
        <div className="character-aura" aria-hidden />
        <div className="character-icon-frame">
          <Icon size={64} />
        </div>

        <span
          className="character-role"
          style={{
            background: `${roleColor}22`,
            borderColor: `${roleColor}66`,
            color: roleColor,
          }}
        >
          <RoleIcon size={11} />
          {roleLabel}
        </span>

        <span className="character-age">
          {character.age} {t.common.years}
        </span>
      </div>

      <div className="character-body">
        <span className="character-series" style={{ color: accent }}>
          {character.series}
        </span>
        <h3 className="character-name" title={character.name}>
          {character.name}
        </h3>
        <p className="character-title">{character.title}</p>

        <div className="character-power">
          <span className="character-power-label">{t.characters.power}</span>
          <span className="character-power-value">{character.power}</span>
        </div>
      </div>

      <div className="character-hover">
        <div className="character-hover-head">
          <span className="character-hover-tag" style={{ color: accent }}>
            {character.genre}
          </span>
        </div>
        <p className="character-bio">{character.bio}</p>
      </div>
    </article>
  );
}