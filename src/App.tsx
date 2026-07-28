import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Student, Role, Assignment, DailyStatusHistory, ViewMode, ActivityCategory, RolePreset,
  FirebaseConfig, UserProfile, RoleHistoryRecord, SyncState, ActivityCategoryConfig
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
  getTodayKey
} from './utils/storage';
import { findCategory } from './utils/category';
import {
  initFirebase, subscribeToClassroomData, saveClassroomDataToCloud,
  loginWithGoogle, logoutGoogle, subscribeToAuthChanges, consumeRedirectResult
} from './services/firebase';
import { soundFx } from './utils/sound';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { TvModeView } from './components/TvModeView';
import { AssignmentEngine } from './components/AssignmentEngine';
import { SettingsView } from './components/SettingsView';
import { StatsView } from './components/StatsView';
import { SopModal } from './components/SopModal';
import { FirebaseConfigModal } from './components/FirebaseConfigModal';
import { PresetEditorModal } from './components/PresetEditorModal';

const CLOUD_SYNC_DEBOUNCE_MS = 800;

export function App() {
  // Global Application State
  const [students, setStudents] = useState<Student[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [dailyStatusHistory, setDailyStatusHistory] = useState<DailyStatusHistory>({});
  const [customPresets, setCustomPresets] = useState<RolePreset[]>([]);
  const [roleHistory, setRoleHistory] = useState<RoleHistoryRecord[]>([]);
  const [firebaseConfig, setFirebaseConfigState] = useState<FirebaseConfig>(loadFirebaseConfig());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [categories, setCategories] = useState<ActivityCategoryConfig[]>(loadCategories());
  const [activeCategoryRaw, setActiveCategoryState] = useState<ActivityCategory>(loadActiveCategory());

  // 삭제된 범주가 선택된 채로 남아 화면이 비어 보이는 것을 막는다.
  const activeCategory = categories.some((c) => c.id === activeCategoryRaw)
    ? activeCategoryRaw
    : (categories[0]?.id ?? 'daily');
  const activeCategoryConfig = findCategory(categories, activeCategory);

  // UI & Modal State
  const [currentMode, setCurrentMode] = useState<ViewMode>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayKey());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [sopRoleModal, setSopRoleModal] = useState<Role | null>(null);
  const [showFirebaseModal, setShowFirebaseModal] = useState<boolean>(false);
  const [presetModalData, setPresetModalData] = useState<{ open: boolean; preset: RolePreset | null }>({ open: false, preset: null });

  // Cloud sync status
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // 클라우드 기록은 "동기화 켬 + Google 로그인" 두 조건이 모두 충족될 때만 이루어진다.
  const cloudEnabled = Boolean(
    firebaseConfig.enabled && firebaseConfig.apiKey && firebaseConfig.classroomId && userProfile?.uid
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

  // Load Initial Local Storage Data
  useEffect(() => {
    refreshAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshAllData = () => {
    const loadedFc = loadFirebaseConfig();

    setStudents(loadStudents());
    setRoles(loadRoles());
    setAssignments(loadAssignments());
    setDailyStatusHistory(loadDailyStatus());
    setCustomPresets(loadCustomPresets());
    setRoleHistory(loadRoleHistory());
    setFirebaseConfigState(loadedFc);
    setCategories(loadCategories());
    setActiveCategoryState(loadActiveCategory());

    if (loadedFc.enabled && loadedFc.apiKey) {
      initFirebase(loadedFc);
    }
  };

  // --- Cloud sync plumbing ---------------------------------------------------
  // 최신 상태를 ref 에 보관해두고 디바운스된 타이머가 항상 최신 스냅샷을 쓰도록 한다.
  // (이전 구현은 핸들러의 오래된 클로저 값을 그대로 전송했다.)
  const cloudPayloadRef = useRef<Record<string, unknown>>({});
  const syncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    cloudPayloadRef.current = {
      students,
      roles,
      assignments,
      dailyStatus: dailyStatusHistory,
      customPresets,
      roleHistory,
      categories,
    };
  }, [students, roles, assignments, dailyStatusHistory, customPresets, roleHistory, categories]);

  const scheduleCloudSync = useCallback(() => {
    if (!cloudEnabled) return;

    if (syncTimerRef.current !== null) window.clearTimeout(syncTimerRef.current);
    setCloudBusy(true);
    setCloudError(null);

    syncTimerRef.current = window.setTimeout(async () => {
      syncTimerRef.current = null;
      const result = await saveClassroomDataToCloud(
        firebaseConfig.classroomId,
        cloudPayloadRef.current,
        userProfile?.uid
      );
      setCloudBusy(false);
      setCloudError(result.success ? null : result.message || '클라우드 저장에 실패했습니다.');
    }, CLOUD_SYNC_DEBOUNCE_MS);
  }, [cloudEnabled, firebaseConfig.classroomId, userProfile?.uid]);

  // 언마운트 시 예약된 저장 정리
  useEffect(() => () => {
    if (syncTimerRef.current !== null) window.clearTimeout(syncTimerRef.current);
  }, []);

  // Subscribe to Auth changes
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

  // Real-time Cloud Synchronization listener — 로그인한 본인 문서만 구독한다.
  const currentUid = userProfile?.uid ?? null;
  useEffect(() => {
    if (!cloudEnabled || !currentUid) return;

    initFirebase(firebaseConfig);
    const unsub = subscribeToClassroomData(
      firebaseConfig.classroomId,
      (cloudData, fromLocalWrite) => {
        // 내가 방금 보낸 쓰기가 되돌아온 것이면 편집 중인 로컬 상태를 덮지 않는다.
        if (fromLocalWrite) return;

        if (Array.isArray(cloudData.students)) {
          setStudents(cloudData.students as Student[]);
          saveStudents(cloudData.students as Student[]);
        }
        if (Array.isArray(cloudData.roles)) {
          setRoles(cloudData.roles as Role[]);
          saveRoles(cloudData.roles as Role[]);
        }
        if (Array.isArray(cloudData.assignments)) {
          setAssignments(cloudData.assignments as Assignment[]);
          saveAssignments(cloudData.assignments as Assignment[]);
        }
        if (cloudData.dailyStatus && typeof cloudData.dailyStatus === 'object') {
          setDailyStatusHistory(cloudData.dailyStatus as DailyStatusHistory);
          saveDailyStatus(cloudData.dailyStatus as DailyStatusHistory);
        }
        if (Array.isArray(cloudData.categories)) {
          const normalized = normalizeCategories(cloudData.categories);
          setCategories(normalized);
          saveCategories(normalized);
        }
        if (Array.isArray(cloudData.customPresets)) {
          setCustomPresets(cloudData.customPresets as RolePreset[]);
          saveCustomPresets(cloudData.customPresets as RolePreset[]);
        }
        if (Array.isArray(cloudData.roleHistory)) {
          // 이력은 덮어쓰지 않고 합친다(다른 기기에서 기록된 과거 이력 보존).
          setRoleHistory((prev) => {
            const merged = mergeRoleHistory(prev, cloudData.roleHistory as RoleHistoryRecord[]);
            saveRoleHistory(merged);
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
  }, [cloudEnabled, currentUid, firebaseConfig.classroomId, firebaseConfig.apiKey]);

  // --- Auth handlers ---------------------------------------------------------
  const handleLoginGoogle = async () => {
    soundFx.playClick();

    // 동기화가 꺼져 있으면 로그인 의사 자체가 곧 '켜겠다'는 뜻이므로,
    // 설정 화면으로 돌려보내지 말고 이 자리에서 켜고 바로 로그인까지 진행한다.
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
      // initFirebase 는 handleUpdateFirebaseConfig 안에서 동기적으로 끝나므로 바로 로그인 가능
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

  const handleCategoryChange = (cat: ActivityCategory) => {
    setActiveCategoryState(cat);
    saveActiveCategory(cat);
  };

  /**
   * 활동 범주 목록 갱신. 범주가 사라지면 그 범주에 속한 역할/배정도 함께 정리해서
   * 어디에도 보이지 않는 유령 데이터가 남지 않게 한다. (과거 이력은 보존)
   */
  const handleUpdateCategories = (newCategories: ActivityCategoryConfig[]) => {
    const nextIds = new Set(newCategories.map((c) => c.id));
    const removedIds = categories.filter((c) => !nextIds.has(c.id)).map((c) => c.id);

    setCategories(newCategories);
    saveCategories(newCategories);

    if (removedIds.length > 0) {
      const removed = new Set(removedIds);
      const fallback = newCategories[0]?.id ?? 'daily';

      const nextRoles = roles.filter((r) => !removed.has(r.activityCategory || fallback));
      const survivingRoleIds = new Set(nextRoles.map((r) => r.id));
      setRoles(nextRoles);
      saveRoles(nextRoles);

      const nextAssignments = assignments.filter(
        (a) => !removed.has(a.activityCategory || fallback) && survivingRoleIds.has(a.roleId)
      );
      setAssignments(nextAssignments);
      saveAssignments(nextAssignments);

      if (removed.has(activeCategoryRaw)) {
        setActiveCategoryState(fallback);
        saveActiveCategory(fallback);
      }
    }

    scheduleCloudSync();
  };

  // --- Data handlers (참조 무결성 유지) ---------------------------------------
  const handleUpdateStudents = (newStudents: Student[]) => {
    const nextIds = new Set(newStudents.map((s) => s.id));
    const removedIds = students.filter((s) => !nextIds.has(s.id)).map((s) => s.id);

    setStudents(newStudents);
    saveStudents(newStudents);

    if (removedIds.length > 0) {
      const removed = new Set(removedIds);

      const nextAssignments = assignments.filter((a) => !removed.has(a.studentId));
      setAssignments(nextAssignments);
      saveAssignments(nextAssignments);

      const nextHistory = roleHistory.filter((r) => !removed.has(r.studentId));
      setRoleHistory(nextHistory);
      saveRoleHistory(nextHistory);

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
      saveDailyStatus(nextDaily);
    }

    scheduleCloudSync();
  };

  const handleUpdateRoles = (newRoles: Role[]) => {
    const nextIds = new Set(newRoles.map((r) => r.id));
    const removedRoleIds = roles.filter((r) => !nextIds.has(r.id)).map((r) => r.id);

    setRoles(newRoles);
    saveRoles(newRoles);

    // 삭제된 역할을 가리키던 배정은 함께 제거한다(조용히 '미배정'으로 남는 문제 방지).
    // 과거 이력(roleHistory)은 roleTitle 을 자체 보관하므로 그대로 유지한다.
    if (removedRoleIds.length > 0) {
      const removed = new Set(removedRoleIds);
      const nextAssignments = assignments.filter((a) => !removed.has(a.roleId));
      setAssignments(nextAssignments);
      saveAssignments(nextAssignments);
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
    saveRoleHistory(merged);
  };

  const handleUpdateAssignments = (newAssignments: Assignment[]) => {
    setAssignments(newAssignments);
    saveAssignments(newAssignments);
    recordAssignmentHistory(newAssignments, activeCategory, roles);
    scheduleCloudSync();
  };

  const handleUpdateCustomPresets = (newPresets: RolePreset[]) => {
    setCustomPresets(newPresets);
    saveCustomPresets(newPresets);
    scheduleCloudSync();
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
    saveDailyStatus(updatedHistory);
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
    saveDailyStatus(updatedHistory);
    scheduleCloudSync();
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFx.enabled = next;
  };

  const currentDailyStatus = (dailyStatusHistory[selectedDate] || {})[activeCategory] || {};

  const categoryAssignments = assignments.filter(
    (a) => a.activityCategory === activeCategory || (!a.activityCategory && activeCategory === 'daily')
  );

  const activeStudentCount = students.length;
  const completedCount = students.filter((s) => currentDailyStatus[s.id]).length;
  const completedRatio = activeStudentCount > 0 ? Math.round((completedCount / activeStudentCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">

      {/* Header */}
      {currentMode !== 'tv' && (
        <Header
          currentMode={currentMode}
          onModeChange={setCurrentMode}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
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

      {/* Main Content View Switcher */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentMode === 'dashboard' && (
          <DashboardView
            students={students}
            roles={roles}
            assignments={assignments}
            dailyStatus={currentDailyStatus}
            activeCategory={activeCategory}
            categoryConfig={activeCategoryConfig}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onToggleStatus={handleToggleDailyStatus}
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
            syncState={syncState}
            syncError={cloudError}
            userProfile={userProfile}
            onLoginGoogle={handleLoginGoogle}
            onUpdateStudents={handleUpdateStudents}
            onUpdateRoles={handleUpdateRoles}
            onUpdateCategories={handleUpdateCategories}
            onUpdateCustomPresets={handleUpdateCustomPresets}
            onOpenFirebaseModal={() => setShowFirebaseModal(true)}
            onOpenPresetModal={(p) => setPresetModalData({ open: true, preset: p })}
            onRefreshData={refreshAllData}
          />
        )}
      </main>

      {/* SOP Detail Popup Modal */}
      <SopModal
        role={sopRoleModal}
        onClose={() => setSopRoleModal(null)}
      />

      {/* Firebase Config Modal */}
      {showFirebaseModal && (
        <FirebaseConfigModal
          config={firebaseConfig}
          userProfile={userProfile}
          onSave={handleUpdateFirebaseConfig}
          onClose={() => setShowFirebaseModal(false)}
        />
      )}

      {/* Custom Preset Editor Modal */}
      {presetModalData.open && (
        <PresetEditorModal
          preset={presetModalData.preset}
          currentRoles={roles}
          categories={categories}
          defaultCategory={activeCategory}
          onSavePreset={(newPreset) => {
            const exists = customPresets.some((p) => p.id === newPreset.id);
            let next: RolePreset[];
            if (exists) {
              next = customPresets.map((p) => (p.id === newPreset.id ? newPreset : p));
            } else {
              next = [...customPresets, newPreset];
            }
            handleUpdateCustomPresets(next);
          }}
          onClose={() => setPresetModalData({ open: false, preset: null })}
        />
      )}

      {/* Footer */}
      {currentMode !== 'tv' && (
        <footer className="py-6 border-t border-slate-900 text-center text-xs text-slate-500">
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
