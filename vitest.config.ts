/** 브라우저 테스트와 별도로 순수 규칙만 빠르게 검사하는 설정입니다. */
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["tests/unit/**/*.test.ts"] } });
