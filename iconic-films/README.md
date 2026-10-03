# ICONIC — 독립 React + Vite 프로젝트

현재 [ICONIC 공개 사이트](https://iconic-films.tlscndgus9.chatgpt.site/)의 실제 소스와 게시 데이터를 복제한 프로젝트입니다. 디자인을 새로 만들지 않았습니다. 원본 사이트를 수정·삭제·재배포하지 않았습니다.

기준: 공개 버전 10, 소스 커밋 `211b5e6ac0e341f05db397adb42494956d175e68`, 2026-10-03에 가져온 게시 설정.

## 1. 바로 실행하기

Node.js 22.13 이상과 npm을 설치한 뒤, 압축을 풀고 `iconic-films` 폴더에서 실행합니다.

```bash
npm ci
npm run dev
```

표시되는 로컬 주소를 엽니다. 별도 클라우드 계정 없이 현재 작품·음악·3D와 관리자 화면을 사용할 수 있습니다. 초기 관리자 PIN은 **1211**입니다. 숫자 4자리 입력 시 자동 접속하고, 관리자를 닫거나 사이트를 다시 열면 재인증합니다.

```bash
npm run build   # TypeScript 검사 + 정적 프런트엔드 빌드
npm run preview # 빌드 결과 확인; 로컬 API도 함께 실행
npm test        # 인증·저장·업로드·범위 재생·클라우드 연결 계약 검사
```

로컬에서 수정한 설정과 새 업로드는 `data/`에 저장됩니다. 이 폴더는 GitHub에 올라가지 않습니다. 복제본의 게시 기본 설정은 `src/site-config.json`입니다. 원본의 PIN 해시, 세션, 로그인 시도 기록, 접근 토큰은 포함하지 않았습니다.

## 2. GitHub에 저장하기

새 저장소 이름은 `iconic-films`로 만듭니다. 기존 ICONIC Sites 저장소와 별개입니다. ZIP에는 설치 파일인 `node_modules`와 빌드 결과 `dist`를 넣지 않았습니다. `package-lock.json`으로 재설치할 수 있습니다.

GitHub CLI가 있다면 아래 순서로 새 비공개 저장소를 생성할 수 있습니다.

```bash
git init
git add .
git commit -m "Export ICONIC as a standalone React Vite project"
gh auth login
gh repo create iconic-films --private --source=. --remote=origin --push
```

이미 빈 저장소를 만들었다면 `gh repo create` 대신 해당 저장소의 URL로 원격을 연결합니다. `.env`와 `data/`는 올리지 마세요. 현재 포함된 파일은 모두 개별 100 MiB 미만이며, 영상·음악까지 포함해 프로젝트 크기가 큽니다. 아래 선택적 Storage 이전 기능으로 미디어를 별도 저장소에 옮길 수도 있습니다.

## 3. Vercel에서 관리자까지 작동시키기

정적 화면만 배포하면 관리자 저장·새 업로드를 영구 보존할 수 없습니다. 이 프로젝트는 **Vercel Node.js API + Supabase Postgres/Storage**로 그 기능을 구현했습니다. 아래 초기 설정 후에는 기존 관리자 UI를 그대로 사용합니다.

1. 자신의 새 Supabase 프로젝트를 만듭니다.
2. Supabase SQL Editor에서 `supabase/schema.sql` 전체를 실행합니다. 설정·세션·로그인 제한 테이블과 `iconic-media` 버킷을 만듭니다.
3. Vercel에서 GitHub의 `iconic-films` 저장소를 Import합니다. 프로젝트 루트는 이 README와 `package.json`이 있는 폴더입니다.
4. Vercel 프로젝트의 서버 환경 변수에 다음을 등록합니다.

| 변수 | 값 |
| --- | --- |
| `SUPABASE_URL` | 자신의 Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 자신의 서버 전용 service_role 키 |
| `SUPABASE_STORAGE_BUCKET` | `iconic-media` |
| `ADMIN_PIN` | 새 설치 초기 PIN. 미지정 시 `1211` |

5. Framework는 Vite, Build Command는 `npm run build`, Output Directory는 `dist`입니다. `vercel.json`에 이미 설정되어 있습니다. 배포합니다.
6. 새 Vercel 주소에서 admin → PIN 입력 → 설정 변경 → 저장 → 새로고침하여 저장을 확인합니다. 음악·영상 파일 업로드도 확인합니다.

`SUPABASE_SERVICE_ROLE_KEY`에는 `VITE_` 접두사를 붙이지 마세요. 브라우저 번들에는 서버 키가 들어가지 않습니다. 서버가 관리자 인증을 확인한 뒤 발급한 서명 URL로 브라우저가 Storage에 직접 업로드합니다. 영상 파일이 Vercel 함수의 요청 본문을 통과하지 않습니다.

Supabase의 **프로젝트 전체 업로드 제한**도 원하는 크기로 설정해야 합니다. 코드와 버킷은 파일당 100 MB까지 지원하며, 사용할 수 있는 전체 업로드 한도는 Supabase 요금제에 따라 다릅니다. 이미지·음악·영상 다중 업로드, 진행률, 중지, 목록 정렬은 기존 UI를 유지합니다.

Vercel에서는 환경 변수 없이 로컬 파일 저장소로 대체하지 않습니다. 영구 저장소가 설정되지 않으면 API가 설정 오류를 반환합니다. 환경 변수를 추가한 후 다시 배포하세요.

## 4. 현재 내용과 미디어

현재 게시된 작품 **1개**, 음악 **28곡**, 사이트 디자인 설정을 `src/site-config.json`에 그대로 넣었습니다. 원본 `/api/media/UUID` 주소는 실제 복사 파일의 `/media/UUID.확장자` 주소로 바꿨습니다. 새 사이트는 원본 Sites API나 R2에 요청하지 않습니다.

| 종류 | 복사된 파일 |
| --- | ---: |
| 영상 | 2 |
| 음악 | 28 |
| 이미지 | 2 |
| 3D GLB | 1 |
| 현재 업로드 파일 합계 | 33 |

현재 설정에 참조된 업로드 파일은 **전부 복사했고 누락은 없습니다.** 원본 `public/`의 `editorial.jpg`, `sample.mp4`, favicon 및 SVG 파일도 포함했습니다. 3D Draco/Basis/Meshopt 디코더는 `public/decoders/`에 포함했습니다.

`docs/ASSETS.md`에는 이전 범위가 있고, `docs/asset-manifest.json`에는 각 파일의 원본 경로, 새 경로, 원래 파일명, 크기, SHA-256, 사용 위치가 있습니다. 현재 페이지에서 사용하지 않는 과거·삭제된 업로드, 방문자 각 기기의 테마 선택, 이전 관리자 세션은 이전 대상에서 제외했습니다.

### 선택 사항: 기존 미디어도 Supabase로 옮기기

기본적으로 현재 미디어는 `public/media/`에서 Vercel 정적 파일로 배포됩니다. 이 상태로도 원본 사이트와 독립적으로 작동합니다. 별도 Storage에 보관하려면 `.env.example`을 `.env`로 복사해 서버 환경 변수 두 개를 넣고 실행합니다.

```bash
npm run sync:storage
npm run build
```

이 명령은 자신이 설정한 Supabase에 33개 파일을 올리고 `src/site-config.json`의 경로만 바꿉니다. 원본 사이트에는 쓰기 요청을 보내지 않습니다. 성공 후 미디어를 Git에서 제외하고 싶다면 `public/media/`를 따로 백업한 뒤 제거할 수 있습니다. 이미 새 사이트 관리자에서 저장한 설정이 있으면 그 DB 설정이 스냅샷보다 우선하므로 먼저 백업하고 새 경로를 반영해야 합니다.

## 5. 유지한 화면과 기능

- 기존 레이아웃·타이포·CSS, 반응형 모바일/태블릿 배치와 Light/Dark.
- 고정 투명 메뉴, Work/About/Contact, 작품 분류와 영상 재생 창.
- 커스텀 커서, hover/transition, 터치 효과, 리퀴드 글래스 인터랙션.
- 접힌 음악 아이콘과 플레이어 열기/닫기 애니메이션, 재생 바·음량·셔플·한 곡/전체 반복.
- 아티스트·앨범·플레이리스트 분류, 방문 시 자동재생·랜덤 시작 설정.
- 전체 관리자 편집, 미리보기, 이미지/영상/음악 업로드, 다중 업로드와 터치로 들어서 순서 바꾸기.
- 로고 이미지/3D 교체, 무한 흐름, 간격·크기·효과·마우스 반응과 탄성 복귀.
- 배경 이미지/영상, 패턴 크기·색상·투명도.
- 매번 관리자 재인증, 서버 저장 권한 검사, PIN 변경 시 모든 세션 무효화.

기존 브라우저의 소리 자동재생 제한은 유지됩니다. 브라우저가 자동재생을 막으면 첫 클릭·터치 후 재생합니다. PIN 삭제로 방문자가 편집 가능해지는 동작은 현재 원본의 보안 수정에 따라 허용하지 않습니다.

## 6. 프로젝트 구조

| 경로 | 역할 |
| --- | --- |
| `index.html`, `src/main.tsx` | 일반 Vite 진입점 |
| `src/App.tsx`, `src/globals.css` | 원본 페이지와 전체 디자인 |
| `src/components/ui/` | 실제 사이트가 사용하는 React UI 컴포넌트 |
| `src/main-logo.tsx`, `model-*`, `spring.ts` | 3D·로고·드래그·탄성 애니메이션 |
| `src/pointer-experience.tsx`, `cursor-motion.ts` | 커스텀 커서 |
| `src/media-library.tsx`, `media-upload.ts` | 파일 라이브러리와 업로드 |
| `src/admin-session.ts`, `site-api.ts` | 방문 단위 인증과 목록 나눠 저장하기 |
| `src/site-config.json` | 현재 사이트의 실제 설정 스냅샷 |
| `public/media/`, `public/decoders/` | 실제 이전한 파일과 3D 디코더 |
| `server/`, `api/index.ts` | Node.js/Vercel용 API와 저장소 어댑터 |
| `supabase/schema.sql` | 새 외부 저장소 초기화 |
| `tests/` | 이전된 API 검증 |

## 7. Sites 전용 기능의 대체

| 이전 사이트 | 독립 프로젝트 |
| --- | --- |
| vinext/Cloudflare Worker | React + Vite, Vercel Node.js Function |
| Cloudflare D1 `settings` | Supabase `iconic_settings` / 로컬 `data/state.json` |
| D1 세션·로그인 횟수 | Supabase 테이블·원자적 RPC / 로컬 파일 |
| R2 파일 업로드 | 서명 URL을 사용한 Supabase 직접 업로드 / 로컬 파일 |
| `/api/media/UUID`에서 기존 파일 읽기 | `public/media/UUID.ext` 정적 파일 |
| 신규 파일 구간 재생 | Storage의 공개 URL / 로컬 Range 응답 |
| Sites 배포 설정·ChatGPT 인증 코드 | 제거. 원본과 동일한 앱 자체 PIN 인증 사용 |

Vercel 함수의 본문 제한에 맞춰 작품·음악 목록은 최대 100개 단위로 저장하며, 전체 조각 저장 완료 후 새 설정을 게시합니다. 편집 정보 한도는 원본과 같은 10 MB이고, 개별 조각은 700 KB입니다. 현재 게시 설정과 파일은 일반 JSON/정적 파일이므로 어느 환경에서도 가져올 수 있습니다.

## 8. 확인한 범위

`npm run build`와 자동 테스트가 통과했습니다. 로컬 Vite에서 페이지·설정·React/CSS 모듈·GLB가 HTTP 200으로 제공되고, 영상 Range 요청이 HTTP 206으로 제공되는 것을 확인했습니다. 원본 CSS 및 커서·탄성·음악 UI 관련 소스를 대조했습니다.

실제 사용자의 Vercel/Supabase 계정 배포는 수행하지 않았습니다. Supabase 어댑터는 API 계약을 모사한 테스트로 검증했으며, 외부 환경 변수 설정 후 실제 저장·업로드를 확인해야 합니다. 브라우저별 시각 비교와 모바일 기기 실측은 이번 내보내기 검증에 포함하지 않았습니다.

관련 공식 문서: [Vercel 함수 제한](https://vercel.com/docs/functions/limitations), [Supabase 서명 업로드](https://supabase.com/docs/reference/javascript/file-buckets-createsigneduploadurl), [Storage 파일 제한](https://supabase.com/docs/guides/storage/uploads/file-limits), [GitHub 대용량 파일](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).
