import { initializeApp, getApps, deleteApp, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, Firestore } from 'firebase/firestore';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  signOut, onAuthStateChanged, Auth, User
} from 'firebase/auth';
import { FirebaseConfig, UserProfile } from '../types';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

const TEST_APP_PREFIX = 'connection_test_';

/**
 * 설정값이 바뀌면 앱 이름도 바뀌도록 결정론적 키를 만든다.
 * 예전 구현은 getApps()[0] 을 무조건 재사용해서, 교사가 자기 Firebase 정보를 새로 입력해도
 * 계속 이전 프로젝트에 기록되는 버그가 있었다.
 */
const configKey = (config: FirebaseConfig): string =>
  `${config.projectId || 'none'}:${config.appId || 'none'}`;

const toSdkConfig = (config: FirebaseConfig) => ({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
});

export const initFirebase = (config: FirebaseConfig): boolean => {
  if (!config || !config.enabled || !config.apiKey || !config.projectId) {
    app = null;
    db = null;
    auth = null;
    return false;
  }

  try {
    const name = configKey(config);

    if (!app || app.name !== name) {
      const existing = getApps().find((a) => a.name === name);
      app = existing || initializeApp(toSdkConfig(config), name);

      // 이전 설정으로 만들어진 앱 인스턴스는 정리한다.
      getApps()
        .filter((a) => a.name !== name && !a.name.startsWith(TEST_APP_PREFIX))
        .forEach((stale) => {
          deleteApp(stale).catch(() => {});
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

/**
 * 연결 테스트. 보안 규칙상 로그인한 본인 문서만 접근 가능하므로,
 * 임시 앱을 만들어 초기화 가능 여부를 확인하고, 이미 로그인한 상태라면 본인 문서 읽기까지 검증한다.
 */
export const testFirebaseConnection = async (
  config: FirebaseConfig
): Promise<{ success: boolean; message: string }> => {
  const testName = `${TEST_APP_PREFIX}${Date.now()}`;
  let testApp: FirebaseApp | null = null;

  try {
    testApp = initializeApp(toSdkConfig(config), testName);
    const testDb = getFirestore(testApp);
    const uid = auth?.currentUser?.uid;

    if (!uid) {
      return {
        success: true,
        message: '설정값이 유효합니다. 실제 동기화를 시작하려면 Google 로그인을 해주세요.',
      };
    }

    await getDoc(doc(testDb, 'users', uid, 'classrooms', config.classroomId || 'default'));
    return { success: true, message: 'Firebase 클라우드에 성공적으로 연결되었습니다!' };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, message: `연결 실패: ${error.message || '설정을 확인하세요.'}` };
  } finally {
    if (testApp) await deleteApp(testApp).catch(() => {});
  }
};

// --- Google Authentication ---
export interface AuthResult {
  user: UserProfile | null;
  /** 사용자에게 보여줄 오류 메시지. null 이면 오류 없음. */
  error: string | null;
  /** 팝업이 막혀 리디렉션 방식으로 전환된 경우 true (페이지가 곧 이동함) */
  redirecting?: boolean;
}

const toProfile = (user: User): UserProfile => ({
  uid: user.uid,
  displayName: user.displayName,
  email: user.email,
  photoURL: user.photoURL,
});

/** Firebase 오류 코드를 교사가 이해할 수 있는 안내문으로 바꾼다. */
const describeAuthError = (err: unknown): string => {
  const code = (err as { code?: string })?.code || '';
  const raw = (err as Error)?.message || '알 수 없는 오류';
  const host = typeof window !== 'undefined' ? window.location.hostname : '';

  switch (code) {
    case 'auth/unauthorized-domain':
      return `현재 주소(${host})가 Firebase에 등록되어 있지 않습니다.\n\nFirebase 콘솔 > Authentication > 설정 > 승인된 도메인에 "${host}" 를 추가해 주세요.\n(미리보기 배포 주소는 정식 주소와 별도로 등록해야 합니다.)`;
    case 'auth/operation-not-allowed':
      return 'Firebase 콘솔 > Authentication > Sign-in method 에서 Google 로그인이 사용 설정되어 있지 않습니다.';
    case 'auth/popup-blocked':
      return '브라우저가 로그인 팝업을 차단했습니다. 주소창의 팝업 차단을 해제한 뒤 다시 시도해 주세요.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return '';
    case 'auth/network-request-failed':
      return '네트워크 연결에 실패했습니다. 인터넷 상태를 확인해 주세요.';
    case 'auth/internal-error':
      return '로그인 처리 중 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    default:
      return `로그인에 실패했습니다.${code ? `\n오류 코드: ${code}` : ''}\n${raw}`;
  }
};

export const loginWithGoogle = async (): Promise<AuthResult> => {
  if (!auth) {
    return {
      user: null,
      error: '클라우드 설정이 아직 초기화되지 않았습니다. 설정을 저장한 뒤 다시 시도해 주세요.',
    };
  }

  const provider = new GoogleAuthProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    return { user: toProfile(result.user), error: null };
  } catch (err) {
    const code = (err as { code?: string })?.code || '';

    // 태블릿/모바일 브라우저에서 팝업이 막히는 경우가 잦아 리디렉션 방식으로 자동 전환한다.
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      try {
        await signInWithRedirect(auth, provider);
        return { user: null, error: null, redirecting: true };
      } catch (redirectErr) {
        return { user: null, error: describeAuthError(redirectErr) };
      }
    }

    console.error('Google Sign-In failed:', err);
    return { user: null, error: describeAuthError(err) };
  }
};

/**
 * 리디렉션 방식 로그인 후 돌아왔을 때의 결과를 확인한다.
 * 성공 시에는 onAuthStateChanged 가 이미 처리하므로, 주로 오류를 표면화하는 용도.
 */
export const consumeRedirectResult = async (): Promise<AuthResult> => {
  if (!auth) return { user: null, error: null };
  try {
    const result = await getRedirectResult(auth);
    return { user: result ? toProfile(result.user) : null, error: null };
  } catch (err) {
    return { user: null, error: describeAuthError(err) };
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
// 학급 데이터는 반드시 로그인한 교사 본인의 경로에만 저장한다.
// (이전 구현은 비로그인 시 classrooms/{id} 공용 문서를 사용해 모든 사용자가 같은 문서를 공유했다.)
const classroomDoc = (database: Firestore, userUid: string, classroomId: string) =>
  doc(database, 'users', userUid, 'classrooms', classroomId);

export const subscribeToClassroomData = (
  classroomId: string,
  onData: (data: Record<string, unknown>, fromLocalWrite: boolean) => void,
  userUid: string | null | undefined,
  onError?: (message: string) => void
): (() => void) | null => {
  if (!db || !classroomId || !userUid) return null;

  try {
    const unsubscribe = onSnapshot(
      classroomDoc(db, userUid, classroomId),
      (snapshot) => {
        if (snapshot.exists()) {
          // 내가 방금 쓴 내용이 되돌아온 경우를 구분해서 편집 중인 상태를 덮어쓰지 않도록 한다.
          onData(snapshot.data(), snapshot.metadata.hasPendingWrites);
        }
      },
      (err) => {
        console.warn('Firestore snapshot error:', err);
        onError?.(err.message);
      }
    );
    return unsubscribe;
  } catch (e) {
    console.error('Subscribe error:', e);
    return null;
  }
};

export const saveClassroomDataToCloud = async (
  classroomId: string,
  data: Record<string, unknown>,
  userUid: string | null | undefined
): Promise<{ success: boolean; message?: string }> => {
  if (!db || !classroomId) return { success: false, message: '클라우드가 초기화되지 않았습니다.' };
  if (!userUid) return { success: false, message: '로그인이 필요합니다.' };

  try {
    await setDoc(
      classroomDoc(db, userUid, classroomId),
      { ...data, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    return { success: true };
  } catch (e) {
    const error = e as Error;
    console.error('Cloud save error:', e);
    return { success: false, message: error.message };
  }
};
