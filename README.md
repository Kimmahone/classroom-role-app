# 우리 반 역할 & 활동 현황판

초등 학급의 1인 1역, 아침활동, 과목별 역할, 모둠 프로젝트 역할을 배정·기록·통계하는 웹 앱입니다.

- 배포: https://classroom-role-app.pages.dev
- 저장소: https://github.com/Kimmahone/classroom-role-app

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
| 동기화 켬 + Google 로그인 | localStorage + `users/{uid}/classrooms/{classroomId}` |

JSON 백업에는 Firebase 접속 정보가 포함되지 않습니다(악성 백업 파일로 데이터 유출을 유도하는 것을 막기 위함).

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
