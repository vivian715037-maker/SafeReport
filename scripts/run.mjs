/** 로컬 Next.js 실행기. Windows 사용자 환경변수의 키를 메모리로만 읽어 서버에 전달합니다. */
import { spawnSync, spawn } from "node:child_process";
// 1. 현재 프로세스에 키가 없다면 Windows 사용자 설정을 확인합니다. 값은 출력·저장하지 않습니다.
if (process.platform === "win32" && !process.env.OPENROUTER_API_KEY) {
  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "[Environment]::GetEnvironmentVariable('OPENROUTER_API_KEY','User')",
    ],
    { encoding: "utf8", windowsHide: true },
  );
  if (result.status === 0 && result.stdout.trim())
    process.env.OPENROUTER_API_KEY = result.stdout.trim();
}
// 2. 루프백에서만 서버를 엽니다. 사용자별 키와 DB는 Next.js의 서버 프로세스에만 전달됩니다.
const mode = process.argv[2] || "dev";
if (!["dev", "start"].includes(mode))
  throw Error("dev 또는 start만 지원합니다.");
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    mode,
    "--hostname",
    "127.0.0.1",
    ...process.argv.slice(3),
  ],
  { env: process.env, stdio: "inherit" },
);
process.on("SIGINT", () => child.kill());
process.on("SIGTERM", () => child.kill());
child.on("exit", (code) => process.exit(code || 0));
