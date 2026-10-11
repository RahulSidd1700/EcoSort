import { createContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { auth, db } from '../config';
import { listenDoc } from '../../services/firestoreHelpers';

export const AuthContext = createContext(null);

/**
 * Keeps track of the signed-in Firebase user and their Firestore profile
 * (users/{uid}), which contains the role. The profile is a live listener, so
 * EcoPoints and role changes appear instantly.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState('');

  useEffect(() => {
    let unsubProfile = () => {};
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      unsubProfile();
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      let missingTimer = null;
      unsubProfile = listenDoc(
        doc(db, 'users', firebaseUser.uid),
        (data) => {
          if (data && data.active === false) {
            setAuthMessage('Your account has been deactivated. Please contact the administrator.');
            signOut(auth);
            return;
          }
          if (data) {
            if (missingTimer) clearTimeout(missingTimer);
            setProfile(data);
            setLoading(false);
          } else {
            // Profile document may still be writing during registration. Wait up to 3s before marking null.
            if (!missingTimer) {
              missingTimer = setTimeout(() => {
                setProfile(null);
                setLoading(false);
              }, 3000);
            }
          }
        },
        (error) => {
          console.error(error);
          if (missingTimer) clearTimeout(missingTimer);
          setProfile(null);
          setLoading(false);
        },
      );
    });
    return () => {
      unsubProfile();
      unsubAuth();
    };
  }, []);

  const value = {
    user,
    profile,
    role: profile?.role || null,
    loading,
    authMessage,
    clearAuthMessage: () => setAuthMessage(''),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
