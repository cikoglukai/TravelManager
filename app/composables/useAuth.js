// composables/useAuth.js
//
// Cloud-ready authentication composable using Firebase Auth.
// Replaces localStorage-based fake session with real Identity Provider.

import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";

export const useAuth = () => {
  // Global reactive user state (shared across app)
  const user = useState("user", () => null);

  const auth = getAuth();

  /**
   * Initializes auth listener.
   * Runs once on client startup via plugin.
   */
  const initAuth = () => {
    if (!import.meta.client) return;

    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();

        user.value = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          token // JWT for backend API calls
        };
      } else {
        user.value = null;
      }
    });
  };

  /**
   * Logout user from Firebase
   */
  const logout = async () => {
    await signOut(auth);
    user.value = null;
  };

  return {
    user,
    initAuth,
    logout
  };
};