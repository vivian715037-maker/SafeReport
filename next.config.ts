/** 로컬 개발·테스트의 빌드 폴더를 분리하며 상위 AGENTS.md 지침을 그대로 사용합니다. */
import type { NextConfig } from "next";
const config: NextConfig = {
  distDir: process.env.FIXIT_TEST === "1" ? ".next-test" : ".next",
  agentRules: false,
};
export default config;
