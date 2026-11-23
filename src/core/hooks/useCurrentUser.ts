import { useAuthUser } from '../providers/AuthUserProvider';
import type { User } from '../services/userService';

export {
  USER_CHANGE_EVENT,
  notifyUserChange,
} from '../providers/AuthUserProvider';


export function useCurrentUser(): User | null {
  return useAuthUser().user;
}

export function useCurrentUserWithLoading(): {
  user: User | null;
  loading: boolean;
} {
  const { user, loading } = useAuthUser();
  return { user, loading };
}