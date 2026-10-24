/** 모델 비용 없이 동의 직후 비교·결과 캐시·비공개 사진 제외·후보 누락 회귀를 검증합니다. */
import { beforeEach, it, expect, vi } from "vitest";
import type { Report } from "@prisma/client";
const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  update: vi.fn(),
  ai: vi.fn(),
  limit: vi.fn(),
  readFile: vi.fn(),
}));
vi.mock("node:fs/promises", () => ({ readFile: mocks.readFile }));
vi.mock("../../src/lib/server", () => ({
  db: { report: { findMany: mocks.findMany, update: mocks.update } },
  ai: mocks.ai,
  limit: mocks.limit,
  storage: "images",
  normalize: async (r: unknown) => r,
  publicReport: (r: Report) => ({ id: r.id, title: r.title, status: r.status }),
  ApiError: class extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));
import { findSimilar } from "../../src/lib/similar-server";
const report = (id: string, patch: Partial<Report> = {}): Report =>
  ({
    id,
    ownerId: "owner",
    title: "보도블록 파손 점검",
    description: "정문 앞 보도블록에 큰 균열이 있습니다.",
    riskType: "보행 위험",
    latitude: 37.5665,
    longitude: 126.978,
    imagePath: id + ".jpg",
    photoPublic: false,
    aiSummary: "",
    aiConsentAt: null,
    ...patch,
  }) as Report;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.readFile.mockImplementation(async (name: string) => Buffer.from(name));
  mocks.update.mockResolvedValue({});
});
it("사진 분석 이력이 없어도 현재 동의로 비교하고 재검색은 AI 결과를 보존한다", async () => {
  const source = report("cache-source"),
    candidate = report("cache-candidate");
  mocks.findMany.mockResolvedValue([candidate]);
  mocks.ai.mockResolvedValue({
    comparisons: [
      {
        id: candidate.id,
        verdict: "SAME",
        reason: "같은 보도블록 균열로 추정됩니다.",
      },
    ],
  });
  const first = await findSimilar(source, true),
    again = await findSimilar(source, true);
  expect(first.result).toBe("중복 가능성 있음");
  expect(first.aiUsed).toBe(true);
  expect(again.cached).toBe(true);
  expect(again.candidates[0].comparison.source).toBe("AI");
  expect(mocks.ai).toHaveBeenCalledTimes(1);
  expect(mocks.update).toHaveBeenCalled();
  // 비공개 기존 사진은 모델에 보내거나 로컬 사진 비교를 위해 읽지 않습니다.
  expect(mocks.ai.mock.calls[0][1]).toEqual(["cache-source.jpg"]);
  expect(
    mocks.readFile.mock.calls.every(([name]) =>
      String(name).endsWith("cache-source.jpg"),
    ),
  ).toBe(true);
  mocks.findMany.mockResolvedValue([
    { ...candidate, description: "다른 시설의 위험으로 설명 변경" },
  ]);
  await findSimilar(source, true);
  expect(mocks.ai).toHaveBeenCalledTimes(2);
});
it("AI가 후보 ID를 누락해도 유사 제보 없음으로 단정하지 않는다", async () => {
  const source = report("missing-source"),
    candidate = report("missing-candidate", {
      title: "신호등 고장",
      description: "횡단보도 신호등이 꺼져 있습니다.",
      riskType: "도로·교통",
    });
  mocks.findMany.mockResolvedValue([candidate]);
  mocks.ai.mockResolvedValue({
    comparisons: [{ id: "없는 후보", verdict: "DIFFERENT", reason: "다름" }],
  });
  const result = await findSimilar(source, true);
  expect(result.result).toBe("확인 불가");
  expect(result.aiUsed).toBe(false);
  expect(result.candidates[0].comparison.source).toBe("NONE");
});
