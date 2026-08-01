import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Student, Role, Assignment, DailyStatusHistory, ViewMode, ActivityCategory, RolePreset,
  FirebaseConfig, UserProfile, RoleHistoryRecord, SyncState, ActivityCategoryConfig, Classroom
} from './types';
import {
  loadStudents, saveStudents,
  loadRoles, saveRoles,
  loadAssignments, saveAssignments,
  loadDailyStatus, saveDailyStatus,
  loadCustomPresets, saveCustomPresets,
  loadFirebaseConfig, saveFirebaseConfig,
  loadActiveCategory, saveActiveCategory,
  loadCategories, saveCategories, normalizeCategories,
  loadRoleHistory, saveRoleHistory, mergeRoleHistory,
  loadClassrooms, saveClassrooms, normalizeClassrooms, loadActiveClassId, saveActiveClassId,
  purgeClassroomData, seedClassroomData, makeClassroomId,
  getTodayKey
} from './utils/storage';
import { findCategory } from './utils/category';
import {
  initFirebase, subscribeToClassroomData, saveClassroomDataToCloud, deleteClassroomFromCloud,
  subscribeToClassIndex, saveClassIndexToCloud,
  loginWithGoogle, logoutGoogle, subscribeToAuthChanges, consumeRedirectResult
} from './services/firebase';
import { soundFx } from './utils/sound';
import { AppPrefs, loadPrefs, savePrefs, applyPrefs, watchSystemTheme } from './utils/prefs';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { TvModeView } from './components/TvModeView';
import { AssignmentEngine } from './components/AssignmentEngine';
import { SettingsView } from './components/SettingsView';
import { StatsView } from './components/StatsView';
import { SopModal } from './components/SopModal';
import { FirebaseConfigModal } from './components/FirebaseConfigModal';
import { PresetEditorModal } from './components/PresetEditorModal';
import { TweaksModal } from './components/TweaksModal';
import { ClassManagerModal } from './components/ClassManagerModal';

const CLOUD_SYNC_DEBOUNCE_MS = 800;

export function App() {
  // ── 환경설정 (기기 단위) ───────────────────────────────────────────
  const [prefs, setPrefsState] = useState<AppPrefs>(() => loadPrefs());

  // ── 학급 ──────────────────────────────────────────────────────────
  const [classrooms, setClassroomsState] = useState<Classroom[]>(() => loadClassrooms());
  const [activeClassId, setActiveClassIdState] = useState<string>(() => loadActiveClassId(loadClassrooms()));

  // ── 활성 학급의 데이터 ─────────────────────────────────────────────
  const [students, setStudents] = useState<Student[]>(() => loadStudents(activeClassId));
  const [roles, setRoles] = useState<Role[]>(() => loadRoles(activeClassId));
  const [assignments, setAssignments] = useState<Assignment[]>(() => loadAssignments(activeClassId));
  const [dailyStatusHistory, setDailyStatusHistory] = useState<DailyStatusHistory>(() => loadDailyStatus(activeClassId));
  const [roleHistory, setRoleHistory] = useState<RoleHistoryRecord[]>(() => loadRoleHistory(activeClassId));
  const [categories, setCategories] = useState<ActivityCategoryConfig[]>(() => loadCategories(activeClassId));
  const [activeCategoryRaw, setActiveCategoryState] = useState<ActivityCategory>(() => loadActiveCategory(activeClassId));

  // ── 교사 단위 데이터 ───────────────────────────────────────────────
  const [customPresets, setCustomPresets] = useState<RolePreset[]>(() => loadCustomPresets());
  const [firebaseConfig, setFirebaseConfigState] = useState<FirebaseConfig>(() => loadFirebaseConfig());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const activeClassroom = classrooms.find((c) => c.id === activeClassId) || classrooms[0];

  // 삭제된 범주가 선택된 채로 남아 화면이 비어 보이는 것을 막는다.
  const activeCategory = categories.some((c) => c.id === activeCategoryRaw)
    ? activeCategoryRaw
    : (categories[0]?.id ?? 'daily');
  const activeCategoryConfig = findCategory(categories, activeCategory);

  // ── UI 상태 ────────────────────────────────────────────────────────
  const [currentMode, setCurrentMode] = useState<ViewMode>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayKey());
  const [sopRoleModal, setSopRoleModal] = useState<Role | null>(null);
  const [showFirebaseModal, setShowFirebaseModal] = useState<boolean>(false);
  const [showTweaks, setShowTweaks] = useState<boolean>(false);
  const [showClassManager, setShowClassManager] = useState<boolean>(false);
  const [presetModalData, setPresetModalData] = useState<{ open: boolean; preset: RolePreset | null }>({ open: false, preset: null });

  // Cloud sync status
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // 클라우드 기록은 "동기화 켬 + Google 로그인" 두 조건이 모두 충족될 때만 이루어진다.
  const cloudEnabled = Boolean(
    firebaseConfig.enabled && firebaseConfig.apiKey && activeClassId && userProfile?.uid
  );

  const syncState: SyncState = !firebaseConfig.enabled || !firebaseConfig.apiKey
    ? 'off'
    : !userProfile?.uid
      ? 'needs-login'
      : cloudError
        ? 'error'
        : cloudBusy
          ? 'saving'
          : 'idle';

  // ── 환경설정 적용 ──────────────────────────────────────────────────
  useEffect(() => {
    applyPrefs(prefs);
    soundFx.enabled = prefs.sound;
  }, [prefs]);

  // 'system' 모드일 때 OS 테마 변경을 즉시 따라간다.
  useEffect(() => {
    if (prefs.theme !== 'system') return;
    return watchSystemTheme(() => applyPrefs(prefs));
  }, [prefs]);

  const updatePrefs = (patch: Partial<AppPrefs>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(next);
      return next;
    });
  };

  // ── 학급 데이터 로딩 ───────────────────────────────────────────────
  const loadClassData = useCallback((classId: string) => {
    setStudents(loadStudents(classId));
    setRoles(loadRoles(classId));
    setAssignments(loadAssignments(classId));
    setDailyStatusHistory(loadDailyStatus(classId));
    setRoleHistory(loadRoleHistory(classId));
    setCategories(loadCategories(classId));
    setActiveCategoryState(loadActiveCategory(classId));
  }, []);

  const refreshAllData = () => {
    const list = loadClassrooms();
    const id = loadActiveClassId(list);
    setClassroomsState(list);
    setActiveClassIdState(id);
    setCustomPresets(loadCustomPresets());

    const loadedFc = loadFirebaseConfig();
    setFirebaseConfigState(loadedFc);
    if (loadedFc.enabled && loadedFc.apiKey) initFirebase(loadedFc);

    loadClassData(id);
  };

  useEffect(() => {
    const loadedFc = loadFirebaseConfig();
    if (loadedFc.enabled && loadedFc.apiKey) initFirebase(loadedFc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 클라우드 저장 배선 ─────────────────────────────────────────────
  // 최신 상태를 ref 에 보관해두고 디바운스된 타이머가 항상 최신 스냅샷을 쓰도록 한다.
  const cloudPayloadRef = useRef<{ classId: string; payload: Record<string, unknown> }>({
    classId: activeClassId,
    payload: {},
  });
  const syncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    cloudPayloadRef.current = {
      classId: activeClassId,
      payload: {
        students,
        roles,
        assignments,
        dailyStatus: dailyStatusHistory,
        roleHistory,
        categories,
      },
    };
  }, [activeClassId, students, roles, assignments, dailyStatusHistory, roleHistory, categories]);

  const scheduleCloudSync = useCallback(() => {
    if (!cloudEnabled) return;

    if (syncTimerRef.current !== null) window.clearTimeout(syncTimerRef.current);
    setCloudBusy(true);
    setCloudError(null);

    syncTimerRef.current = window.setTimeout(async () => {
      syncTimerRef.current = null;
      const { classId, payload } = cloudPayloadRef.current;
      const result = await saveClassroomDataToCloud(classId, payload, userProfile?.uid);
      setCloudBusy(false);
      setCloudError(result.success ? null : result.message || '클라우드 저장에 실패했습니다.');
    }, CLOUD_SYNC_DEBOUNCE_MS);
  }, [cloudEnabled, userProfile?.uid]);

  /** 학급 목록과 교사 단위 템플릿은 별도 메타 문서에 보관한다. */
  const syncClassIndex = useCallback(
    (nextClassrooms: Classroom[], nextPresets: RolePreset[]) => {
      if (!cloudEnabled) return;
      saveClassIndexToCloud({ classrooms: nextClassrooms, customPresets: nextPresets }, userProfile?.uid)
        .then((r) => {
          if (!r.success) setCloudError(r.message || '학급 목록 저장에 실패했습니다.');
        });
    },
    [cloudEnabled, userProfile?.uid]
  );

  // 언마운트 시 예약된 저장 정리
  useEffect(() => () => {
    if (syncTimerRef.current !== null) window.clearTimeout(syncTimerRef.current);
  }, []);

  // ── 인증 ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!firebaseConfig.enabled || !firebaseConfig.apiKey) {
      setUserProfile(null);
      return;
    }
    initFirebase(firebaseConfig);
    const unsubAuth = subscribeToAuthChanges(setUserProfile);

    // 팝업이 막혀 리디렉션 방식으로 로그인한 경우, 돌아왔을 때의 오류를 표면화한다.
    consumeRedirectResult().then((result) => {
      if (result.error) setCloudError(result.error);
      else if (result.user) soundFx.playSuccess();
    });

    return () => {
      if (unsubAuth) unsubAuth();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseConfig.enabled, firebaseConfig.apiKey, firebaseConfig.projectId, firebaseConfig.appId]);

  const currentUid = userProfile?.uid ?? null;

  // ── 학급 목록 구독 ─────────────────────────────────────────────────
  useEffect(() => {
    if (!cloudEnabled || !currentUid) return;

    initFirebase(firebaseConfig);
    const unsub = subscribeToClassIndex(
      (cloudData, fromLocalWrite) => {
        if (fromLocalWrite) return;

        if (Array.isArray(cloudData.classrooms)) {
          const normalized = normalizeClassrooms(cloudData.classrooms);
          if (normalized.length > 0) {
            setClassroomsState(normalized);
            saveClassrooms(normalized);

            // 다른 기기에서 지운 학급을 보고 있었다면 첫 학급으로 옮긴다.
            if (!normalized.some((c) => c.id === activeClassId)) {
              const fallback = normalized[0].id;
              setActiveClassIdState(fallback);
              saveActiveClassId(fallback);
              loadClassData(fallback);
            }
          }
        }
        if (Array.isArray(cloudData.customPresets)) {
          setCustomPresets(cloudData.customPresets as RolePreset[]);
          saveCustomPresets(cloudData.customPresets as RolePreset[]);
        }
      },
      currentUid,
      (message) => setCloudError(message)
    );

    return () => {
      if (unsub) unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudEnabled, currentUid, firebaseConfig.apiKey, activeClassId]);

  // ── 활성 학급 데이터 실시간 구독 ───────────────────────────────────
  useEffect(() => {
    if (!cloudEnabled || !currentUid || !activeClassId) return;

    initFirebase(firebaseConfig);
    const unsub = subscribeToClassroomData(
      activeClassId,
      (cloudData, fromLocalWrite) => {
        // 내가 방금 보낸 쓰기가 되돌아온 것이면 편집 중인 로컬 상태를 덮지 않는다.
        if (fromLocalWrite) return;

        if (Array.isArray(cloudData.students)) {
          setStudents(cloudData.students as Student[]);
          saveStudents(activeClassId, cloudData.students as Student[]);
        }
        if (Array.isArray(cloudData.roles)) {
          setRoles(cloudData.roles as Role[]);
          saveRoles(activeClassId, cloudData.roles as Role[]);
        }
        if (Array.isArray(cloudData.assignments)) {
          setAssignments(cloudData.assignments as Assignment[]);
          saveAssignments(activeClassId, cloudData.assignments as Assignment[]);
        }
        if (cloudData.dailyStatus && typeof cloudData.dailyStatus === 'object') {
          setDailyStatusHistory(cloudData.dailyStatus as DailyStatusHistory);
          saveDailyStatus(activeClassId, cloudData.dailyStatus as DailyStatusHistory);
        }
        if (Array.isArray(cloudData.categories)) {
          const normalized = normalizeCategories(cloudData.categories);
          setCategories(normalized);
          saveCategories(activeClassId, normalized);
        }
        if (Array.isArray(cloudData.roleHistory)) {
          // 이력은 덮어쓰지 않고 합친다(다른 기기에서 기록된 과거 이력 보존).
          setRoleHistory((prev) => {
            const merged = mergeRoleHistory(prev, cloudData.roleHistory as RoleHistoryRecord[]);
            saveRoleHistory(activeClassId, merged);
            return merged;
          });
        }
      },
      currentUid,
      (message) => setCloudError(message)
    );

    return () => {
      if (unsub) unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudEnabled, currentUid, activeClassId, firebaseConfig.apiKey]);

  // ── 인증 핸들러 ────────────────────────────────────────────────────
  const handleLoginGoogle = async () => {
    soundFx.playClick();

    if (!firebaseConfig.apiKey) {
      alert('Firebase 접속 정보가 없습니다. [교사 설정 > 클라우드 Sync]에서 먼저 입력해 주세요.');
      setShowFirebaseModal(true);
      return;
    }

    if (!firebaseConfig.enabled) {
      const ok = confirm(
        '클라우드 동기화를 켜고 Google 로그인을 진행합니다.\n\n' +
        '학급 데이터는 선생님 본인 계정에만 저장되며 다른 사용자는 볼 수 없습니다.\n\n계속하시겠습니까?'
      );
      if (!ok) return;

      const enabledConfig: FirebaseConfig = { ...firebaseConfig, enabled: true };
      handleUpdateFirebaseConfig(enabledConfig);
    }

    const result = await loginWithGoogle();

    if (result.redirecting) return; // 페이지가 곧 이동함

    if (result.user) {
      soundFx.playSuccess();
      setUserProfile(result.user);
      setCloudError(null);
      return;
    }

    if (result.error) {
      setCloudError(result.error);
      alert(result.error);
    }
  };

  const handleLogoutGoogle = async () => {
    soundFx.playClick();
    await logoutGoogle();
    setUserProfile(null);
    setCloudError(null);
  };

  // ── 학급 핸들러 ────────────────────────────────────────────────────
  const commitClassrooms = (next: Classroom[]) => {
    setClassroomsState(next);
    saveClassrooms(next);
    syncClassIndex(next, customPresets);
  };

  const handleSwitchClass = (classId: string) => {
    if (classId === activeClassId) return;
    soundFx.playClick();

    // 학급을 바꾸기 전에 예약된 저장을 취소한다(다음 학급 데이터가 이전 학급 문서로 가는 것 방지).
    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
      setCloudBusy(false);
    }

    setActiveClassIdState(classId);
    saveActiveClassId(classId);
    loadClassData(classId);
    setSelectedDate(getTodayKey());
  };

  const handleCreateClass = (draft: Omit<Classroom, 'id' | 'createdAt'>, copyFromClassId?: string) => {
    const newClass: Classroom = {
      ...draft,
      id: makeClassroomId(),
      createdAt: new Date().toISOString(),
    };
    seedClassroomData(newClass.id, copyFromClassId);

    commitClassrooms([...classrooms, newClass]);

    setActiveClassIdState(newClass.id);
    saveActiveClassId(newClass.id);
    loadClassData(newClass.id);
    soundFx.playSuccess();
  };

  const handleUpdateClass = (updated: Classroom) => {
    soundFx.playClick();
    commitClassrooms(classrooms.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleDeleteClass = async (classId: string) => {
    if (classrooms.length <= 1) {
      alert('학급은 최소 1개가 필요합니다. 새 학급을 먼저 만든 뒤 삭제해 주세요.');
      return;
    }
    const target = classrooms.find((c) => c.id === classId);
    const studentCount = loadStudents(classId).length;

    const ok = confirm(
      [
        `'${target?.name || '이 학급'}' 을(를) 삭제합니다.`,
        '',
        `· 학생 ${studentCount}명, 역할·배정·완수 체크·역할 이력이 모두 지워집니다.`,
        cloudEnabled ? '· 클라우드에 저장된 이 학급 문서도 함께 삭제됩니다.' : '· 이 기기에 저장된 데이터가 삭제됩니다.',
        '· 되돌릴 수 없습니다.',
        '',
        '계속하시겠습니까?',
      ].join('\n')
    );
    if (!ok) return;

    purgeClassroomData(classId);
    if (cloudEnabled) {
      const result = await deleteClassroomFromCloud(classId, userProfile?.uid);
      if (!result.success) setCloudError(result.message || '클라우드 학급 삭제에 실패했습니다.');
    }

    const next = classrooms.filter((c) => c.id !== classId);
    commitClassrooms(next);

    if (classId === activeClassId) {
      const fallback = next[0].id;
      setActiveClassIdState(fallback);
      saveActiveClassId(fallback);
      loadClassData(fallback);
    }
    soundFx.playClick();
  };

  // ── 데이터 핸들러 (참조 무결성 유지) ───────────────────────────────
  const handleCategoryChange = (cat: ActivityCategory) => {
    setActiveCategoryState(cat);
    saveActiveCategory(activeClassId, cat);
  };

  const handleUpdateCategories = (newCategories: ActivityCategoryConfig[]) => {
    const nextIds = new Set(newCategories.map((c) => c.id));
    const removedIds = categories.filter((c) => !nextIds.has(c.id)).map((c) => c.id);

    setCategories(newCategories);
    saveCategories(activeClassId, newCategories);

    if (removedIds.length > 0) {
      const removed = new Set(removedIds);
      const fallback = newCategories[0]?.id ?? 'daily';

      const nextRoles = roles.filter((r) => !removed.has(r.activityCategory || fallback));
      const survivingRoleIds = new Set(nextRoles.map((r) => r.id));
      setRoles(nextRoles);
      saveRoles(activeClassId, nextRoles);

      const nextAssignments = assignments.filter(
        (a) => !removed.has(a.activityCategory || fallback) && survivingRoleIds.has(a.roleId)
      );
      setAssignments(nextAssignments);
      saveAssignments(activeClassId, nextAssignments);

      if (removed.has(activeCategoryRaw)) {
        setActiveCategoryState(fallback);
        saveActiveCategory(activeClassId, fallback);
      }
    }

    scheduleCloudSync();
  };

  const handleUpdateStudents = (newStudents: Student[]) => {
    const nextIds = new Set(newStudents.map((s) => s.id));
    const removedIds = students.filter((s) => !nextIds.has(s.id)).map((s) => s.id);

    setStudents(newStudents);
    saveStudents(activeClassId, newStudents);

    if (removedIds.length > 0) {
      const removed = new Set(removedIds);

      const nextAssignments = assignments.filter((a) => !removed.has(a.studentId));
      setAssignments(nextAssignments);
      saveAssignments(activeClassId, nextAssignments);

      const nextHistory = roleHistory.filter((r) => !removed.has(r.studentId));
      setRoleHistory(nextHistory);
      saveRoleHistory(activeClassId, nextHistory);

      const nextDaily: DailyStatusHistory = {};
      Object.entries(dailyStatusHistory).forEach(([date, dayRecord]) => {
        const nextDay: Record<string, Record<string, boolean>> = {};
        Object.entries(dayRecord).forEach(([category, checks]) => {
          const nextChecks: Record<string, boolean> = {};
          Object.entries(checks).forEach(([studentId, done]) => {
            if (!removed.has(studentId)) nextChecks[studentId] = done;
          });
          if (Object.keys(nextChecks).length > 0) nextDay[category] = nextChecks;
        });
        if (Object.keys(nextDay).length > 0) nextDaily[date] = nextDay;
      });
      setDailyStatusHistory(nextDaily);
      saveDailyStatus(activeClassId, nextDaily);
    }

    scheduleCloudSync();
  };

  const handleUpdateRoles = (newRoles: Role[]) => {
    const nextIds = new Set(newRoles.map((r) => r.id));
    const removedRoleIds = roles.filter((r) => !nextIds.has(r.id)).map((r) => r.id);

    setRoles(newRoles);
    saveRoles(activeClassId, newRoles);

    // 삭제된 역할을 가리키던 배정은 함께 제거한다(조용히 '미배정'으로 남는 문제 방지).
    if (removedRoleIds.length > 0) {
      const removed = new Set(removedRoleIds);
      const nextAssignments = assignments.filter((a) => !removed.has(a.roleId));
      setAssignments(nextAssignments);
      saveAssignments(activeClassId, nextAssignments);
    }

    scheduleCloudSync();
  };

  /** 배정이 바뀌면 오늘 날짜 기준으로 해당 범주의 역할 이력을 upsert 한다. */
  const recordAssignmentHistory = (
    nextAssignments: Assignment[],
    category: ActivityCategory,
    currentRoles: Role[]
  ) => {
    const date = getTodayKey();
    const studentMap = new Map(students.map((s) => [s.id, s]));
    const roleMap = new Map(currentRoles.map((r) => [r.id, r]));

    const records: RoleHistoryRecord[] = [];
    nextAssignments.forEach((a) => {
      if ((a.activityCategory || 'daily') !== category) return;
      const student = studentMap.get(a.studentId);
      const role = roleMap.get(a.roleId);
      if (!student || !role) return;
      records.push({
        date,
        activityCategory: category,
        studentId: student.id,
        studentName: student.name,
        roleId: role.id,
        roleTitle: role.title,
      });
    });

    if (records.length === 0) return;

    const merged = mergeRoleHistory(roleHistory, records);
    setRoleHistory(merged);
    saveRoleHistory(activeClassId, merged);
  };

  const handleUpdateAssignments = (newAssignments: Assignment[]) => {
    setAssignments(newAssignments);
    saveAssignments(activeClassId, newAssignments);
    recordAssignmentHistory(newAssignments, activeCategory, roles);
    scheduleCloudSync();
  };

  const handleUpdateCustomPresets = (newPresets: RolePreset[]) => {
    setCustomPresets(newPresets);
    saveCustomPresets(newPresets);
    syncClassIndex(classrooms, newPresets);
  };

  const handleUpdateFirebaseConfig = (newConfig: FirebaseConfig) => {
    const stored = saveFirebaseConfig(newConfig);
    setFirebaseConfigState(stored);
    setCloudError(null);
    if (stored.enabled && stored.apiKey) {
      initFirebase(stored);
    }
  };

  const handleToggleDailyStatus = (studentId: string) => {
    const dayRecord = dailyStatusHistory[selectedDate] || {};
    const categoryRecord = dayRecord[activeCategory] || {};
    const nextStatus = !categoryRecord[studentId];

    const updatedHistory: DailyStatusHistory = {
      ...dailyStatusHistory,
      [selectedDate]: {
        ...dayRecord,
        [activeCategory]: {
          ...categoryRecord,
          [studentId]: nextStatus,
        },
      },
    };

    setDailyStatusHistory(updatedHistory);
    saveDailyStatus(activeClassId, updatedHistory);
    scheduleCloudSync();
  };

  /** 현황판의 '모두 완수 / 되돌리기' — 여러 명을 한 번에 바꾼다. */
  const handleSetManyDailyStatus = (studentIds: string[], done: boolean) => {
    if (studentIds.length === 0) return;
    const dayRecord = dailyStatusHistory[selectedDate] || {};
    const categoryRecord = { ...(dayRecord[activeCategory] || {}) };
    studentIds.forEach((id) => { categoryRecord[id] = done; });

    const updatedHistory: DailyStatusHistory = {
      ...dailyStatusHistory,
      [selectedDate]: { ...dayRecord, [activeCategory]: categoryRecord },
    };

    setDailyStatusHistory(updatedHistory);
    saveDailyStatus(activeClassId, updatedHistory);
    scheduleCloudSync();
  };

  const handleResetToday = () => {
    const dayRecord = dailyStatusHistory[selectedDate] || {};
    const updatedDayRecord = { ...dayRecord };
    delete updatedDayRecord[activeCategory];

    const updatedHistory: DailyStatusHistory = {
      ...dailyStatusHistory,
      [selectedDate]: updatedDayRecord,
    };

    setDailyStatusHistory(updatedHistory);
    saveDailyStatus(activeClassId, updatedHistory);
    scheduleCloudSync();
  };

  const currentDailyStatus = useMemo(
    () => (dailyStatusHistory[selectedDate] || {})[activeCategory] || {},
    [dailyStatusHistory, selectedDate, activeCategory]
  );

  const categoryAssignments = useMemo(
    () => assignments.filter(
      (a) => a.activityCategory === activeCategory || (!a.activityCategory && activeCategory === 'daily')
    ),
    [assignments, activeCategory]
  );

  const completedCount = students.filter((s) => currentDailyStatus[s.id]).length;
  const completedRatio = students.length > 0 ? Math.round((completedCount / students.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-base text-ink flex flex-col font-sans">

      {currentMode !== 'tv' && (
        <Header
          currentMode={currentMode}
          onModeChange={setCurrentMode}
          prefs={prefs}
          onOpenTweaks={() => setShowTweaks(true)}
          classrooms={classrooms}
          activeClassId={activeClassId}
          onSwitchClass={handleSwitchClass}
          onOpenClassManager={() => setShowClassManager(true)}
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          selectedDate={selectedDate}
          completedRatio={completedRatio}
          syncState={syncState}
          syncError={cloudError}
          userProfile={userProfile}
          onLoginGoogle={handleLoginGoogle}
          onLogoutGoogle={handleLogoutGoogle}
          onOpenFirebaseModal={() => setShowFirebaseModal(true)}
        />
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentMode === 'dashboard' && (
          <DashboardView
            students={students}
            roles={roles}
            assignments={assignments}
            dailyStatus={currentDailyStatus}
            dailyStatusHistory={dailyStatusHistory}
            activeCategory={activeCategory}
            categoryConfig={activeCategoryConfig}
            classroom={activeClassroom}
            selectedDate={selectedDate}
            prefs={prefs}
            onDateChange={setSelectedDate}
            onToggleStatus={handleToggleDailyStatus}
            onSetManyStatus={handleSetManyDailyStatus}
            onResetToday={handleResetToday}
            onOpenSop={setSopRoleModal}
          />
        )}

        {currentMode === 'tv' && (
          <TvModeView
            students={students}
            roles={roles}
            assignments={categoryAssignments}
            dailyStatus={currentDailyStatus}
            categoryConfig={activeCategoryConfig}
            classroom={activeClassroom}
            prefs={prefs}
            onToggleStatus={handleToggleDailyStatus}
            onExitTvMode={() => setCurrentMode('dashboard')}
          />
        )}

        {currentMode === 'assignment' && (
          <AssignmentEngine
            students={students}
            roles={roles}
            assignments={assignments}
            roleHistory={roleHistory}
            activeCategory={activeCategory}
            categoryConfig={activeCategoryConfig}
            selectedDate={selectedDate}
            onUpdateAssignments={handleUpdateAssignments}
          />
        )}

        {currentMode === 'stats' && (
          <StatsView
            students={students}
            roles={roles}
            assignments={assignments}
            dailyStatusHistory={dailyStatusHistory}
            roleHistory={roleHistory}
            categories={categories}
          />
        )}

        {currentMode === 'settings' && (
          <SettingsView
            students={students}
            roles={roles}
            customPresets={customPresets}
            firebaseConfig={firebaseConfig}
            categories={categories}
            activeCategory={activeCategory}
            classrooms={classrooms}
            activeClassId={activeClassId}
            syncState={syncState}
            syncError={cloudError}
            userProfile={userProfile}
            onLoginGoogle={handleLoginGoogle}
            onSwitchClass={handleSwitchClass}
            onCreateClass={handleCreateClass}
            onUpdateClass={handleUpdateClass}
            onDeleteClass={handleDeleteClass}
            onUpdateStudents={handleUpdateStudents}
            onUpdateRoles={handleUpdateRoles}
            onUpdateCategories={handleUpdateCategories}
            onUpdateCustomPresets={handleUpdateCustomPresets}
            onOpenFirebaseModal={() => setShowFirebaseModal(true)}
            onOpenPresetModal={(p) => setPresetModalData({ open: true, preset: p })}
            onOpenTweaks={() => setShowTweaks(true)}
            onRefreshData={refreshAllData}
          />
        )}
      </main>

      <SopModal role={sopRoleModal} onClose={() => setSopRoleModal(null)} />

      {showFirebaseModal && (
        <FirebaseConfigModal
          config={firebaseConfig}
          userProfile={userProfile}
          onSave={handleUpdateFirebaseConfig}
          onClose={() => setShowFirebaseModal(false)}
        />
      )}

      {showTweaks && (
        <TweaksModal
          prefs={prefs}
          onChange={updatePrefs}
          onClose={() => setShowTweaks(false)}
        />
      )}

      {showClassManager && (
        <ClassManagerModal
          classrooms={classrooms}
          activeClassId={activeClassId}
          onSwitchClass={handleSwitchClass}
          onCreateClass={handleCreateClass}
          onUpdateClass={handleUpdateClass}
          onDeleteClass={handleDeleteClass}
          onClose={() => setShowClassManager(false)}
        />
      )}

      {presetModalData.open && (
        <PresetEditorModal
          preset={presetModalData.preset}
          currentRoles={roles}
          categories={categories}
          defaultCategory={activeCategory}
          onSavePreset={(newPreset) => {
            const exists = customPresets.some((p) => p.id === newPreset.id);
            const next = exists
              ? customPresets.map((p) => (p.id === newPreset.id ? newPreset : p))
              : [...customPresets, newPreset];
            handleUpdateCustomPresets(next);
          }}
          onClose={() => setPresetModalData({ open: false, preset: null })}
        />
      )}

      {currentMode !== 'tv' && (
        <footer className="py-6 border-t border-line text-center text-xs text-faint">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
            <span>🏫 올인원 학급 역할 &amp; 활동 데이터 기록 플랫폼</span>
            <span>학급 데이터는 로그인한 교사 본인 계정에만 저장됩니다</span>
          </div>
        </footer>
      )}

    </div>
  );
}

export default App;
