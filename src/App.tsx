import { useState, useEffect } from 'react';
import { 
  Student, Role, Assignment, DailyStatusHistory, ViewMode, ActivityCategory, RolePreset, FirebaseConfig, UserProfile 
} from './types';
import { 
  loadStudents, saveStudents, 
  loadRoles, saveRoles, 
  loadAssignments, saveAssignments, 
  loadDailyStatus, saveDailyStatus, 
  loadCustomPresets, saveCustomPresets, 
  loadFirebaseConfig, saveFirebaseConfig, 
  loadActiveCategory, saveActiveCategory, 
  getTodayKey 
} from './utils/storage';
import { initFirebase, subscribeToClassroomData, saveClassroomDataToCloud, loginWithGoogle, logoutGoogle, subscribeToAuthChanges } from './services/firebase';
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

export function App() {
  // Global Application State
  const [students, setStudents] = useState<Student[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [dailyStatusHistory, setDailyStatusHistory] = useState<DailyStatusHistory>({});
  const [customPresets, setCustomPresets] = useState<RolePreset[]>([]);
  const [firebaseConfig, setFirebaseConfigState] = useState<FirebaseConfig>(loadFirebaseConfig());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeCategory, setActiveCategoryState] = useState<ActivityCategory>(loadActiveCategory());
  
  // UI & Modal State
  const [currentMode, setCurrentMode] = useState<ViewMode>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayKey());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [sopRoleModal, setSopRoleModal] = useState<Role | null>(null);
  const [showFirebaseModal, setShowFirebaseModal] = useState<boolean>(false);
  const [presetModalData, setPresetModalData] = useState<{ open: boolean; preset: RolePreset | null }>({ open: false, preset: null });

  // Load Initial Local Storage Data
  useEffect(() => {
    refreshAllData();
  }, []);

  const refreshAllData = () => {
    const loadedSt = loadStudents();
    const loadedRo = loadRoles();
    const loadedAs = loadAssignments();
    const loadedDs = loadDailyStatus();
    const loadedCp = loadCustomPresets();
    const loadedFc = loadFirebaseConfig();
    const loadedCat = loadActiveCategory();

    setStudents(loadedSt);
    setRoles(loadedRo);
    setAssignments(loadedAs);
    setDailyStatusHistory(loadedDs);
    setCustomPresets(loadedCp);
    setFirebaseConfigState(loadedFc);
    setActiveCategoryState(loadedCat);

    if (loadedFc.enabled && loadedFc.apiKey) {
      initFirebase(loadedFc);
    }
  };

  // Subscribe to Auth changes
  useEffect(() => {
    if (firebaseConfig.enabled && firebaseConfig.apiKey) {
      initFirebase(firebaseConfig);
      const unsubAuth = subscribeToAuthChanges((user) => {
        setUserProfile(user);
      });
      return () => {
        if (unsubAuth) unsubAuth();
      };
    }
  }, [firebaseConfig.enabled, firebaseConfig.apiKey]);

  // Real-time Cloud Synchronization listener (Firebase)
  useEffect(() => {
    if (firebaseConfig.enabled && firebaseConfig.apiKey && firebaseConfig.classroomId) {
      initFirebase(firebaseConfig);
      const unsub = subscribeToClassroomData(firebaseConfig.classroomId, (cloudData) => {
        if (cloudData.students) {
          setStudents(cloudData.students as Student[]);
          saveStudents(cloudData.students as Student[]);
        }
        if (cloudData.roles) {
          setRoles(cloudData.roles as Role[]);
          saveRoles(cloudData.roles as Role[]);
        }
        if (cloudData.assignments) {
          setAssignments(cloudData.assignments as Assignment[]);
          saveAssignments(cloudData.assignments as Assignment[]);
        }
        if (cloudData.dailyStatus) {
          setDailyStatusHistory(cloudData.dailyStatus as DailyStatusHistory);
          saveDailyStatus(cloudData.dailyStatus as DailyStatusHistory);
        }
        if (cloudData.customPresets) {
          setCustomPresets(cloudData.customPresets as RolePreset[]);
          saveCustomPresets(cloudData.customPresets as RolePreset[]);
        }
      }, userProfile?.uid);

      return () => {
        if (unsub) unsub();
      };
    }
  }, [firebaseConfig.enabled, firebaseConfig.classroomId, firebaseConfig.apiKey, userProfile]);

  const syncPayloadToCloud = (extraPayload: Record<string, unknown> = {}) => {
    if (firebaseConfig.enabled && firebaseConfig.apiKey && firebaseConfig.classroomId) {
      saveClassroomDataToCloud(firebaseConfig.classroomId, {
        students,
        roles,
        assignments,
        dailyStatus: dailyStatusHistory,
        customPresets,
        ...extraPayload,
      }, userProfile?.uid);
    }
  };

  const handleLoginGoogle = async () => {
    soundFx.playClick();
    if (!firebaseConfig.enabled || !firebaseConfig.apiKey) {
      alert('먼저 Firebase 클라우드 설정을 활성화해 주세요!');
      setShowFirebaseModal(true);
      return;
    }
    const user = await loginWithGoogle();
    if (user) {
      soundFx.playSuccess();
      setUserProfile(user);
    }
  };

  const handleLogoutGoogle = async () => {
    soundFx.playClick();
    await logoutGoogle();
    setUserProfile(null);
  };

  const handleCategoryChange = (cat: ActivityCategory) => {
    setActiveCategoryState(cat);
    saveActiveCategory(cat);
  };

  const handleUpdateStudents = (newStudents: Student[]) => {
    setStudents(newStudents);
    saveStudents(newStudents);
    syncPayloadToCloud({ students: newStudents });
  };

  const handleUpdateRoles = (newRoles: Role[]) => {
    setRoles(newRoles);
    saveRoles(newRoles);
    syncPayloadToCloud({ roles: newRoles });
  };

  const handleUpdateAssignments = (newAssignments: Assignment[]) => {
    setAssignments(newAssignments);
    saveAssignments(newAssignments);
    syncPayloadToCloud({ assignments: newAssignments });
  };

  const handleUpdateCustomPresets = (newPresets: RolePreset[]) => {
    setCustomPresets(newPresets);
    saveCustomPresets(newPresets);
    syncPayloadToCloud({ customPresets: newPresets });
  };

  const handleUpdateFirebaseConfig = (newConfig: FirebaseConfig) => {
    setFirebaseConfigState(newConfig);
    saveFirebaseConfig(newConfig);
    if (newConfig.enabled && newConfig.apiKey) {
      initFirebase(newConfig);
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
    syncPayloadToCloud({ dailyStatus: updatedHistory });
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
    syncPayloadToCloud({ dailyStatus: updatedHistory });
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
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          completedRatio={completedRatio}
          firebaseConfig={firebaseConfig}
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
            onToggleStatus={handleToggleDailyStatus}
            onExitTvMode={() => setCurrentMode('dashboard')}
          />
        )}

        {currentMode === 'assignment' && (
          <AssignmentEngine
            students={students}
            roles={roles}
            assignments={assignments}
            activeCategory={activeCategory}
            onUpdateAssignments={handleUpdateAssignments}
          />
        )}

        {currentMode === 'stats' && (
          <StatsView
            students={students}
            roles={roles}
            assignments={assignments}
            dailyStatusHistory={dailyStatusHistory}
          />
        )}

        {currentMode === 'settings' && (
          <SettingsView
            students={students}
            roles={roles}
            customPresets={customPresets}
            firebaseConfig={firebaseConfig}
            activeCategory={activeCategory}
            onUpdateStudents={handleUpdateStudents}
            onUpdateRoles={handleUpdateRoles}
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
          onSave={handleUpdateFirebaseConfig}
          onClose={() => setShowFirebaseModal(false)}
        />
      )}

      {/* Custom Preset Editor Modal */}
      {presetModalData.open && (
        <PresetEditorModal
          preset={presetModalData.preset}
          currentRoles={roles}
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
            <span>🏫 올인원 학급 역할 & 활동 데이터 기록 플랫폼</span>
            <span>Firebase Cloud Sync & Google Auth Enabled</span>
          </div>
        </footer>
      )}

    </div>
  );
}

export default App;
