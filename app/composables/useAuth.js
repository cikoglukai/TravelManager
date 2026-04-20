import { getApps } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";

export const useAuth = () => {
  const user = useState("user", () => null);

  const getFirebaseAuth = () => {
    if (!import.meta.client || getApps().length === 0) return null;
    return getAuth();
  };

  const setUser = (nextUser) => {
    user.value = nextUser;

    if (!import.meta.client) return;
    if (nextUser) {
      localStorage.setItem("tm_user", JSON.stringify(nextUser));
    } else {
      localStorage.removeItem("tm_user");
    }
  };

  const initAuth = () => {
    if (!import.meta.client) return;

    const storedUser = localStorage.getItem("tm_user");
    if (storedUser && !user.value) {
      try {
        user.value = JSON.parse(storedUser);
      } catch {
        localStorage.removeItem("tm_user");
      }
    }

    const auth = getFirebaseAuth();
    if (!auth) return;

    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          token,
        });
      } else {
        setUser(null);
      }
    });
  };

  const logout = async () => {
    const auth = getFirebaseAuth();
    if (auth) await signOut(auth);
    setUser(null);
  };

  return {
    user,
    setUser,
    initAuth,
    logout,
  };
};
