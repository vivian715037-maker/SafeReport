/** 최초 로컬 설정과 빈 SQLite 파일을 준비합니다. 비밀키를 복사하거나 출력하지 않습니다. */
import { existsSync, copyFileSync, mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
// 1. 사용자 설정이 없을 때만 비밀값 없는 예시를 복사합니다.
if (!existsSync(".env")) copyFileSync(".env.example", ".env");
mkdirSync("prisma", { recursive: true });
// 2. Windows에서 Prisma의 새 파일 생성 실패를 피하도록 기본 DB를 먼저 만듭니다.
if (!existsSync("prisma/fixit.db")) new DatabaseSync("prisma/fixit.db").close();
// 3. 저장소에 포함된 마이그레이션과 클라이언트를 적용합니다.
for (const args of [["migrate", "deploy"], ["generate"]]) {
  const result = spawnSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", ...args],
    { stdio: "inherit" },
  );
  if (result.status !== 0) process.exit(result.status || 1);
}
