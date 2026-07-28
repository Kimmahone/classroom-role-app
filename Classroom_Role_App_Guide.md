# 🏫 초등 학급 맞춤형 '역할 관리 웹 앱' 설계 및 개발 가이드

이 가이드는 백엔드 구축 없이 **Antigravity(웹 IDE/샌드박스) 환경**에서 프론트엔드 단독(Client-side Only)으로 동작하는 초등 학급 맞춤형 **역할 관리 웹 앱(App)**을 기획하고 제작하는 방법을 다룹니다.

브라우저의 **`localStorage`**를 활용하면 별도의 DB 서버 없이도 학생 명단, 역할 설정, 일일 완수 상태 등이 브라우저 내부에 안전하게 유지됩니다.

---

## 1. 앱 아키텍처 및 데이터 구조 설계

단일 페이지 애플리케이션(SPA) 구조로 제작하며, 교실 운영 상황에 맞게 **[역할 배정/운영 화면]**, **[교실 TV 현황판 모드]**, **[설정/관리 모드]** 3가지 뷰(View)를 전환하도록 설계합니다.

```
[교사 관리 화면]  ──> [역할 배정/뽑기 엔진] ──> [학생 대시보드/현황판] ──> [성찰 및 피드백]
```

### 💾 데이터 모델 (`localStorage` 저장 구조)
브라우저 내부에 저장되는 JSON 데이터 구조입니다.

```json
{
  "students": ["김민수", "박서준", "이지원", "최유진"],
  "roles": [
    { "id": 1, "name": "칠판 도우미", "desc": "쉬는 시간마다 칠판 깨끗이 지우기", "count": 2 },
    { "id": 2, "name": "환기 담당", "desc": "2교시 후 창문 열고 환기하기", "count": 1 }
  ],
  "assignments": {
    "김민수": 1,
    "박서준": 1,
    "이지원": 2
  },
  "todayStatus": {
    "2026-07-28": {
      "김민수": true,
      "박서준": false
    }
  }
}
```

---

## 2. 화면별 핵심 기능 정의

### ① 대시보드 (교실 TV 현황판 & 일일 체크)
- **오늘의 역할 카드:** 학생 이름, 부여된 역할, 역할 설명(SOP)을 카드 형태로 출력
- **원클릭 완수 체크:** 학생이 역할을 마치고 이름을 클릭하거나 체크박스를 누르면 녹색으로 색상이 변경되며 상태 토글
- **완수율 프로그래스 바:** "오늘 우리 반 역할 완수율 85%"처럼 전체 학급의 기여도를 시각적으로 표현
- **TV 모드(Full Screen):** 교실 대형 모니터/TV 화면에 맞춰 글씨와 아이콘 크기를 키워주는 전용 뷰 제공

### ② 역할 배정 엔진 (Assign & Shuffle)
- **드래그 앤 드롭(Drag & Drop) 배정:** 학생 이름을 특정 역할 상자로 끌어다 놓아 직관적으로 배정
- **랜덤 자동 배정:** 버튼 한 번으로 미배정 학생들을 빈 역할에 무작위로 균등 배정
- **순환(Rotation) 배정:** 기존 배정을 한 칸씩 밀어서 자동으로 순환

### ③ 데이터 관리 및 백업 (Settings)
- **학생/역할 CRUD:** 학급 인원 및 역할 내용/필요 인원 추가·수정·삭제
- **JSON Import/Export:** 브라우저 쿠키/캐시 삭제에 대비해 데이터를 JSON 파일로 내보내고 불러오는 백업 기능 제공

---

## 3. 추천 프론트엔드 기술 스택

Antigravity 환경에서 빠른 프로토타이핑과 깔끔한 UI 구축을 위해 아래 기술 조합을 추천합니다.

- **Framework:** React (Vite / Next.js Client Component) 또는 Vanilla HTML/JS
- **UI & Styling:** **Tailwind CSS** (교실 화면에 어울리는 직관적이고 알록달록한 디자인 구현)
- **Animation / Interactivity:** `framer-motion` (카드 완료 시 토글 효과 및 전환 애니메이션)
- **Icons:** `lucide-react` (칠판, 창문, 급식, 책 등 역할별 맞춤 아이콘)

---

## 4. 프론트엔드 프로토타입 코드 (Single-File HTML)

Antigravity 및 웹 브라우저에서 즉시 실행해 볼 수 있는 **Vanilla JS + Tailwind CSS 기반 프로토타입**입니다. `localStorage` 연동과 원클릭 완료 토글 기능이 기본 내장되어 있습니다.

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>우리 반 1인 1역 현황판</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen p-6">
  <div class="max-w-5xl mx-auto">
    <!-- 헤더 -->
    <header class="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">🏫 오늘의 학급 역할 현황판</h1>
        <p class="text-slate-500 text-sm mt-1" id="current-date"></p>
      </div>
      <div class="flex gap-2">
        <button onclick="resetToday()" class="px-4 py-2 text-sm bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition">오늘 현황 초기화</button>
      </div>
    </header>

    <!-- 역할 현황 그리드 -->
    <div id="role-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- JS로 카드가 동적 생성됩니다 -->
    </div>
  </div>

  <script>
    // 1. 기본 초기 데이터 (localStorage에 없을 경우)
    const initialData = {
      students: [
        { name: "김민수", role: "칠판 도우미" },
        { name: "박서준", role: "칠판 도우미" },
        { name: "이지원", role: "환기 담당" },
        { name: "최유진", role: "우유 도우미" }
      ],
      roles: {
        "칠판 도우미": "쉬는 시간마다 칠판을 깨끗하게 지웁니다.",
        "환기 담당": "2교시 후 창문을 열고 환기합니다.",
        "우유 도우미": "급식실에서 우유 바구니를 가져옵니다."
      }
    };

    const todayKey = new Date().toISOString().slice(0, 10);
    document.getElementById('current-date').innerText = `${todayKey} 기준`;

    // 2. State 불러오기
    function loadState() {
      const saved = localStorage.getItem('roleApp_status');
      return saved ? JSON.parse(saved) : {};
    }

    function saveState(status) {
      localStorage.setItem('roleApp_status', JSON.stringify(status));
    }

    let currentStatus = loadState()[todayKey] || {};

    // 3. 렌더링 함수
    function render() {
      const grid = document.getElementById('role-grid');
      grid.innerHTML = '';

      initialData.students.forEach(student => {
        const isDone = !!currentStatus[student.name];
        const roleDesc = initialData.roles[student.role] || '';

        const card = document.createElement('div');
        card.className = `p-5 rounded-2xl border transition-all cursor-pointer select-none ${
          isDone 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm' 
            : 'bg-white border-slate-200 text-slate-800 hover:border-indigo-300 hover:shadow-md'
        }`;
        
        card.onclick = () => toggleStudent(student.name);

        card.innerHTML = `
          <div class="flex justify-between items-start mb-2">
            <span class="text-xs font-semibold px-2.5 py-1 rounded-lg ${isDone ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
              ${student.role}
            </span>
            <span class="text-xl">${isDone ? '✅' : '⏳'}</span>
          </div>
          <h3 class="text-xl font-bold mb-1">${student.name}</h3>
          <p class="text-xs ${isDone ? 'text-emerald-700' : 'text-slate-400'}">${roleDesc}</p>
        `;

        grid.appendChild(card);
      });
    }

    // 4. 상태 토글
    function toggleStudent(name) {
      currentStatus[name] = !currentStatus[name];
      const allStatus = loadState();
      allStatus[todayKey] = currentStatus;
      saveState(allStatus);
      render();
    }

    function resetToday() {
      currentStatus = {};
      const allStatus = loadState();
      delete allStatus[todayKey];
      saveState(allStatus);
      render();
    }

    // 실행
    render();
  </script>
</body>
</html>
```

---

## 5. 향후 확장 아이디어

1. **외적 보상보다는 공동체 기여 강조:** 점수 경쟁보다 학급 전체의 완수율에 맞춰 학급 온도계나 공동 캐릭터가 성장하는 이벤트 추가
2. **역할 자동 순환(Rotation):** 1~2주 단위로 모든 학생의 역할이 한 칸씩 순환되는 알고리즘 적용
3. **학생별 SOP 팝업:** 카드를 길게 누르면 해당 역할의 세부 지침과 유의사항이 팝업으로 표시되도록 구성