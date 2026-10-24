# SafeReport 원본 비공개 배포판

원본 `fixit`의 GitHub 커밋 `9ada596666e8241a66f22368e9219ae8c6133211` 화면·기능을 보존한 배포용 사본입니다. 원본 소스는 수정하지 않았고, 로컬 DB·사진은 배포 사본에 복사하지 않았습니다. 배포 저장소는 빈 상태로 시작합니다.

## 호스팅을 위해 바꾼 구성

- Next.js 화면은 Vinext Worker에서 실행합니다. 기존 화면의 동작과 단계는 유지합니다.
- SQLite/Prisma 대신 D1(`DB`)에 같은 제보·소유권·상태 이력을 저장하고, 로컬 사진 폴더 대신 비공개 R2(`BUCKET`)를 사용합니다.
- 브라우저에서 JPEG·PNG·WebP를 픽셀로 읽어 1600px JPEG로 변환하고 서버에서도 재검증·재인코딩합니다. 사진 메타데이터를 공개하지 않습니다.
- 신고 상태 변경과 이력은 `Report_status_history` 트리거에서 원자적으로 기록합니다. 생성된 D1 SQL과 트리거는 새 마이그레이션에 보관합니다.
- `OPENROUTER_API_KEY`는 Sites 런타임 비밀 설정에만 있습니다. `.openai/hosting.json`에는 프로젝트 ID와 저장소 바인딩 이름만 있습니다.
- 사이트 방문 권한은 Sites 소유자 전용 비공개 인증으로 보호합니다. 제보 수정 권한은 기존 브라우저 쿠키로 별도 검사합니다.

## 로컬 확인

Node.js 24 이상과 npm을 준비한 뒤 Windows PowerShell에서 실행합니다.

```powershell
git clone https://github.com/vivian715037-maker/SafeReport.git
cd SafeReport
npm.cmd ci
npm.cmd run setup
npm.cmd run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_blushing_moira_mactaggert.sql
npm.cmd start -- --port 8787
```

브라우저에서 `http://127.0.0.1:8787`을 엽니다. AI를 사용하려면 Git에서 제외되는 `.dev.vars`에 본인의 `OPENROUTER_API_KEY`를 설정한 뒤 서버를 재시작하세요. 키 없이도 사진·위치·수동 입력 흐름을 확인할 수 있습니다. 설치·빌드 중 서버를 종료하면 Windows 파일 잠금 오류를 피할 수 있습니다.

Linux에서는 `npm.cmd`를 `npm`으로 바꿉니다. 이번 실행 검증 환경은 Windows입니다. `npm run dev`는 Vinext 개발 화면을 실행하고 `npm start`는 최적화 빌드를 미리보기합니다. 둘은 같은 로컬 D1/R2 상태를 사용합니다.

GitHub에는 실제 `.openai/hosting.json`을 포함하지 않습니다. `setup`이 `hosting.example.json`에서 배포 ID 없는 로컬 설정을 만듭니다. 새로 배포하려면 자신의 비공개 사이트를 생성하고 해당 사이트의 연결 정보와 서버 비밀값을 별도로 설정하세요. 이 저장소를 받는 것만으로 기존 비공개 사이트나 데이터에 접근할 수 없습니다.

주요 연결: `components/Fixit.tsx` → `app/api/[...segments]/route.ts` → `lib/server.ts` / `lib/database.ts` / `lib/storage.ts`. UI 구조의 자세한 기존 설명은 `ORIGINAL-README.md`를 참고하세요.

## 검증과 한계

로컬 Worker에서 PNG 업로드→위치→수동 제보→공개 동의→상태 완료/취소→삭제를 실제 브라우저로 확인했습니다. 원본에 있던 앱 내부 중복·AI 위험도·개인정보 공개 정책을 유지합니다. 실제 기관 접수를 자동 확인하지 않습니다. 이 배포판은 원본 보존용이며 이후 간편 화면은 별도 프로젝트에서 개발합니다.
