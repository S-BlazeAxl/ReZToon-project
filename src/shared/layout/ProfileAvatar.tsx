import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileModal from './ProfileModal';
import { useCurrentUser, notifyUserChange } from '../../core/hooks/useCurrentUser';
import type { User } from '../../core/services/userService';

export default function ProfileAvatar() {
  const [isOpen, setIsOpen] = useState(false);
  const user = useCurrentUser(); 
  const navigate = useNavigate();

  const handleClick = () => {
    if (user) setIsOpen(true);
    else navigate('/let-go');
  };

  const handleUserChange = (_user: User | null) => {
    notifyUserChange();
  };

  const initial = user?.name?.charAt(0).toUpperCase() ?? '?';
  const safePhoto = user?.photo && user.photo.trim() !== '' ? user.photo : null;

  return (
    <>
      <button
        type="button"
        className="profile-avatar"
        onClick={handleClick}
        aria-label={user ? 'Open profile' : 'Sign in'}
      >
        {safePhoto ? (
          <img src={safePhoto} alt={user?.name ?? 'Avatar'} className="profile-avatar-img" />
        ) : (
          <span className="profile-avatar-initial">{initial}</span>
        )}
        <span className="profile-avatar-ring" aria-hidden="true" />
      </button>

      {user && (
        <ProfileModal
          isOpen={isOpen}
          user={user}
          onClose={() => setIsOpen(false)}
          onUserChange={handleUserChange}
        />
      )}
    </>
  );
}