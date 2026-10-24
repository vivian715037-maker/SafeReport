/** 실제 비용 없이 AI 연결 실패·HTTP 오류·잘못된 JSON의 수동 대체 오류를 검증합니다. */
import { afterEach, describe, it, expect, vi } from "vitest";
import { ai, ApiError } from "../../src/lib/server";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("AI 실패 경로", () => {
  it("키가 없으면 외부 요청 없이 설정 오류를 반환한다", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(ai("테스트")).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("네트워크 실패 시 수동 입력을 안내한다", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "FAKE_TEST_KEY");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(ai("테스트")).rejects.toThrow("수동 입력");
  });
  it("HTTP 오류와 잘못된 모델 응답을 구분한다", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "FAKE_TEST_KEY");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 429 })),
    );
    await expect(ai("테스트")).rejects.toThrow("HTTP 429");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          choices: [{ message: { content: "invalid JSON" } }],
        }),
      ),
    );
    await expect(ai("테스트")).rejects.toBeInstanceOf(ApiError);
  });
});
