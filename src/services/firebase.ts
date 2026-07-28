import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot, Firestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, Auth, User } from 'firebase/auth';
import { FirebaseConfig, UserProfile } from '../types';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

export const initFirebase = (config: FirebaseConfig): boolean => {
  if (!config || !config.enabled || !config.apiKey || !config.projectId) {
    app = null;
    db = null;
    auth = null;
    return false;
  }

  try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      app = existingApps[0];
    } else {
      app = initializeApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId,
      });
    }
    db = getFirestore(app);
    auth = getAuth(app);
    return true;
  } catch (err) {
    console.error('Firebase init failed:', err);
    app = null;
    db = null;
    auth = null;
    return false;
  }
};

export const testFirebaseConnection = async (config: FirebaseConfig): Promise<{ success: boolean; message: string }> => {
  try {
    const testApp = initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    }, `test_${Date.now()}`);

    const testDb = getFirestore(testApp);
    const testDoc = doc(testDb, 'connectionTest', 'ping');
    await setDoc(testDoc, { ping: true, timestamp: new Date().toISOString() });
    return { success: true, message: 'Firebase 클라우드에 성공적으로 연결되었습니다!' };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, message: `연결 실패: ${error.message || '설정을 확인하세요.'}` };
  }
};

// --- Google Authentication ---
export const loginWithGoogle = async (): Promise<UserProfile | null> => {
  if (!auth) {
    console.warn('Firebase Auth가 초기화되지 않았습니다.');
    return null;
  }

  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    return {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
    };
  } catch (err) {
    console.error('Google Sign-In failed:', err);
    return null;
  }
};

export const logoutGoogle = async (): Promise<boolean> => {
  if (!auth) return false;
  try {
    await signOut(auth);
    return true;
  } catch (err) {
    console.error('Logout error:', err);
    return false;
  }
};

export const subscribeToAuthChanges = (onUserChange: (user: UserProfile | null) => void): (() => void) | null => {
  if (!auth) return null;
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      onUserChange({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      });
    } else {
      onUserChange(null);
    }
  });
};

// --- Firestore Sync ---
export const subscribeToClassroomData = (
  classroomId: string,
  onData: (data: Record<string, unknown>) => void,
  userUid?: string | null
): (() => void) | null => {
  if (!db || !classroomId) return null;

  try {
    // If user is logged in, use user-specific path: users/{uid}/classrooms/{classroomId}
    const docRef = userUid 
      ? doc(db, 'users', userUid, 'classrooms', classroomId)
      : doc(db, 'classrooms', classroomId);

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data());
      }
    }, (err) => {
      console.warn('Firestore snapshot error:', err);
    });
    return unsubscribe;
  } catch (e) {
    console.error('Subscribe error:', e);
    return null;
  }
};

export const saveClassroomDataToCloud = async (
  classroomId: string,
  data: Record<string, unknown>,
  userUid?: string | null
): Promise<boolean> => {
  if (!db || !classroomId) return false;

  try {
    const docRef = userUid 
      ? doc(db, 'users', userUid, 'classrooms', classroomId)
      : doc(db, 'classrooms', classroomId);

    await setDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (e) {
    console.error('Cloud save error:', e);
    return false;
  }
};
