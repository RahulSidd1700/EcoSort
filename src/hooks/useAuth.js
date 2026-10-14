
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export function homePathForRole(role) {
  switch (String(role ?? '').trim().toLowerCase()) {
    case 'admin':
      return '/admin';
    case 'collector':
      return '/collector';
    case 'user':
      return '/dashboard';
    default:
      return '/dashboard';
  }
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [authMessage, setAuthMessage] = useState('');

  const clearAuthMessage = () => {
    setAuthMessage('');
  };

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (!active) return;

        setUser(firebaseUser);
        setProfile(null);
        setRole(null);
        setProfileError(null);
        setLoading(true);

        if (!firebaseUser) {
          setLoading(false);
          return;
        }

        try {
          const profileRef = doc(
            db,
            'users',
            firebaseUser.uid
          );

          const profileSnapshot = await getDoc(profileRef);

          if (!active) return;

          if (!profileSnapshot.exists()) {
            setProfileError(
              'Your user profile does not exist in Firestore.'
            );
            return;
          }

          const profileData = profileSnapshot.data();

          const normalizedRole = String(
            profileData.role ?? ''
          ).trim().toLowerCase();

          if (
            !['user', 'collector', 'admin'].includes(
              normalizedRole
            )
          ) {
            setProfileError(
              `Invalid or missing role: ${
                normalizedRole || 'not set'
              }.`
            );
            return;
          }

          setProfile(profileData);
          setRole(normalizedRole);
        } catch (error) {
          if (!active) return;

          console.error(
            'Failed to fetch user profile:',
            error
          );

          setProfileError(
            error.code === 'permission-denied'
              ? 'Firestore denied access to your profile. Check your security rules.'
              : 'Unable to load your profile. Check your Firebase configuration and network.'
          );
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      },
      (error) => {
        if (!active) return;

        console.error(
          'Firebase authentication error:',
          error
        );

        setProfileError(
          'Unable to verify your login. Please log in again.'
        );

        setLoading(false);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return {
    user,
    profile,
    role,
    loading,
    profileError,
    authMessage,
    clearAuthMessage,
  };
}
