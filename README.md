# 우리 반 역할 & 활동 현황판

초등 학급의 1인 1역, 아침활동, 과목별 역할, 모둠 프로젝트 역할을 배정·기록·통계하는 웹 앱입니다.

- 배포: https://classroom-role-app.pages.dev
- 저장소: https://github.com/Kimmahone/classroom-role-app

## 주요 개념

### 학급(Classroom) — v5부터

한 교사가 여러 반(전담·동아리·방과후 포함)을 관리할 수 있도록 **모든 학급 데이터가 학급 단위로 분리**됩니다.

| 학급마다 따로 저장 | 교사 계정 전체에서 공유 |
|---|---|
| 학생 명단, 활동 범주, 역할 목록, 역할 배정, 완수 체크, 역할 이력 | 커스텀 역할 템플릿, Firebase 접속 설정, 화면 환경설정 |

- 헤더 왼쪽의 학급 이름을 누르면 즉시 다른 학급으로 전환됩니다.
- 학급 추가/이름·색상 변경/삭제는 헤더 드롭다운의 **학급 추가·관리** 또는 **교사 설정 → 학급** 탭에서 합니다.
- 새 학급을 만들 때 기존 학급의 **활동 범주·역할 구성만** 복사할 수 있습니다(학생 명단과 기록은 절대 복사되지 않습니다).
- 학급을 삭제하면 로컬 데이터와 함께 클라우드 문서 `users/{uid}/classrooms/{학급 ID}` 도 삭제됩니다.

### 화면 환경설정 (Tweak)

헤더 오른쪽의 슬라이더 아이콘에서 엽니다. **이 기기에만** 저장되며 학급 데이터에 영향을 주지 않습니다.

- 화면 모드: 라이트 / 다크 / 기기 설정 따라가기
- 강조 색상 6종, 현황판 카드 밀도 3단계, 글자 크기 90~130%
- 효과음 · 진동 피드백 · 축하 효과 · 애니메이션 on/off
- 현황판의 출석 번호 / 이름 아바타 표시 여부

테마는 `index.html` 의 인라인 스크립트가 첫 페인트 전에 적용하므로 새로고침 시 흰 화면 번쩍임이 없습니다.
색상은 `src/index.css` 의 CSS 변수 → `tailwind.config.js` 의 시맨틱 토큰(`base` `surface` `elevated`
`line` `ink` `muted` `faint` `accent`)으로 이어집니다. **컴포넌트에서 `slate-900` 같은 고정 색을 직접
쓰면 라이트 모드가 깨지므로 반드시 토큰을 사용하세요.**

## 개발

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # tsc + vite build -> dist/
```

## ⚠️ 배포 시 반드시 함께 적용해야 할 것: Firestore 보안 규칙

학급 데이터에는 **학생 실명**이 포함됩니다. 앱 코드는 로그인한 교사 본인 경로
(`users/{uid}/classrooms/{classroomId}`)에만 기록하도록 되어 있지만, 서버 측에서도 이를 강제하려면
[`firestore.rules`](./firestore.rules)를 반드시 배포해야 합니다.

`firebase.json` / `.firebaserc`가 프로젝트(`role-project-7de1a`)를 가리키고 있으므로 아래 한 줄이면 됩니다:

```bash
npx firebase-tools deploy --only firestore:rules
```

Firebase 콘솔 → Firestore Database → **규칙** 탭에 `firestore.rules` 내용을 직접 붙여넣어 게시해도 됩니다.

### 구버전(v1) 데이터 정리

v1에서는 로그인하지 않아도 `classrooms/my_classroom_1` 공용 문서 하나를 모든 사용자가 공유했습니다.
새 규칙은 이 경로 접근을 차단하지만, **콘솔에서 남아 있는 `classrooms/` 컬렉션 문서를 직접 삭제**해 주세요.

기존 사용자의 브라우저에 저장된 v1 설정은 앱이 자동으로 감지해 클라우드 동기화를 끕니다
(`CURRENT_FIREBASE_CONFIG_VERSION`). 교사가 설정에서 다시 켜고 Google 로그인을 해야 동기화가 재개됩니다.

## 데이터 저장 방식

| 상태 | 저장 위치 |
|---|---|
| 기본 (동기화 꺼짐) | 브라우저 localStorage |
| 동기화 켬 + 로그인 안 함 | localStorage만 — 클라우드 전송 없음 |
| 동기화 켬 + Google 로그인 | localStorage + `users/{uid}/classrooms/{학급 ID}` + `users/{uid}/appMeta/classIndex` |

- localStorage 키는 `<기본키>::<학급 ID>` 형태로 학급마다 분리됩니다.
- `appMeta/classIndex` 문서에는 **학급 목록과 커스텀 템플릿**만 들어갑니다(학생 이름 없음).
- JSON 백업/복원은 **현재 보고 있는 학급 하나**만 대상으로 합니다. 백업에는 Firebase 접속 정보가
  포함되지 않습니다(악성 백업 파일로 데이터 유출을 유도하는 것을 막기 위함).

### v4 → v5 마이그레이션

기존에 쓰던 단일 학급 데이터는 앱을 처음 열 때 **"우리 반"** 학급 하나로 자동 이관됩니다.
이 학급의 ID 는 기존 `firebaseConfig.classroomId`(`my_classroom_1`)를 그대로 쓰므로,
클라우드에 이미 올라가 있던 문서를 계속 사용합니다. 별도 조치가 필요 없습니다.

## 배포

Cloudflare Pages 프로젝트 `classroom-role-app`은 **Git 연동이 되어 있지 않습니다.**
GitHub에 push해도 자동 빌드되지 않으므로, 배포는 항상 아래 두 단계를 직접 실행해야 합니다.

```bash
git push origin main                                   # 1) 소스 반영
npm run build && npx wrangler pages deploy dist \
  --project-name=classroom-role-app --branch=main      # 2) 실제 배포
```

- SPA 라우팅을 위해 `public/_redirects`가 `/* /index.html 200`을 포함합니다.
- 프로젝트 루트의 `functions/__/auth/[[path]].js`는 배포 시 Functions 번들로 함께 올라갑니다.
  (Google 로그인을 동일 출처로 만들어 주는 프록시이므로 반드시 저장소 루트에서 배포할 것)

### 배포 후 점검

```bash
curl -s https://classroom-role-app.pages.dev/ | grep -o 'assets/index-[^"]*'  # 새 번들 반영 확인
curl -s -o /dev/null -w '%{http_code}\n' https://classroom-role-app.pages.dev/__/auth/handler  # 200 이어야 함
```
