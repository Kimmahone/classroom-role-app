/**
 * Firebase Auth 헬퍼(/__/auth/*)를 이 앱과 같은 출처에서 서빙하기 위한 프록시.
 *
 * 왜 필요한가:
 *   앱은 classroom-role-app.pages.dev 에서 돌아가는데 Firebase 기본 authDomain 은
 *   role-project-7de1a.firebaseapp.com 이다. 출처가 다르면 Google 인증을 마치고 돌아온
 *   /__/auth/handler 가 원래 창으로 결과를 넘길 때 브라우저의 서드파티 저장소 차단에 막혀
 *   팝업이 백지인 채로 멈춘다.
 *
 *   authDomain 을 이 사이트 도메인으로 바꾸고 /__/auth/* 를 Firebase 로 프록시하면
 *   인증 과정 전체가 동일 출처(first-party)가 되어 문제가 사라진다.
 *
 * 주의: authDomain 을 바꾸면 OAuth redirect_uri 도 이 도메인으로 바뀌므로,
 *   Google Cloud Console > 사용자 인증 정보 > OAuth 2.0 클라이언트 ID 의
 *   "승인된 리디렉션 URI" 에 https://<이 도메인>/__/auth/handler 를 등록해야 한다.
 */

const FIREBASE_AUTH_HOST = 'role-project-7de1a.firebaseapp.com';

export async function onRequest(context) {
  const { request, params } = context;
  const url = new URL(request.url);

  const segments = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean);
  const target = `https://${FIREBASE_AUTH_HOST}/__/auth/${segments.join('/')}${url.search}`;

  // Host 헤더는 목적지 기준으로 다시 계산되어야 하므로 넘기지 않는다.
  const headers = new Headers(request.headers);
  headers.delete('host');

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual',
  });

  const responseHeaders = new Headers(upstream.headers);
  // 프레임/스크립트 로딩을 막을 수 있는 헤더는 제거한다(핸들러는 iframe 안에서도 동작해야 함).
  responseHeaders.delete('content-security-policy');
  responseHeaders.delete('content-security-policy-report-only');
  responseHeaders.delete('x-frame-options');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
