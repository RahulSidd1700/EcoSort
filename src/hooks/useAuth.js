import { useContext } from 'react';
import { AuthContext } from '../firebase/context/AuthContext';

export function useAuth() {
  return useContext(AuthContext);
}

export const homePathForRole = (role) =>
  ({ admin: '/admin', collector: '/collector', user: '/dashboard' })[role] || '/dashboard';
