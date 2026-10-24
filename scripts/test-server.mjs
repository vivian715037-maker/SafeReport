/** 브라우저 검증 전용 DB와 서버. 실제 제보·사진·AI 키와 분리합니다. */
import { DatabaseSync } from "node:sqlite";
import { rmSync } from "node:fs";
import { spawnSync, spawn } from "node:child_process";
import path from "node:path";
// 1. 검증용으로 이름이 고정된 파일만 초기화합니다. 실제 fixit.db에는 접근하지 않습니다.
for (const name of ["prisma/test.db", "prisma/test.db-journal"])
  rmSync(name, { force: true });
new DatabaseSync("prisma/test.db").close();
// 검증 전용 이미지 폴더의 절대 경계가 data 바로 아래인지 확인한 후에만 초기화합니다.
const testImages = path.resolve("data/test-images");
if (path.dirname(testImages) !== path.resolve("data"))
  throw Error("검증 이미지 경로 오류");
rmSync(testImages, { recursive: true, force: true });
const env = {
  ...process.env,
  DATABASE_URL: "file:./test.db",
  FIXIT_TEST: "1",
  OPENROUTER_API_KEY: "",
};
// 2. 실제와 같은 마이그레이션을 적용한 후 별도 포트에서 실행합니다.
const result = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  { env, stdio: "inherit" },
);
if (result.status !== 0) process.exit(1);
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3001",
  ],
  { env, stdio: "inherit" },
);
process.on("SIGTERM", () => child.kill());
process.on("SIGINT", () => child.kill());
