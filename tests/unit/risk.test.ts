/** 위험도는 사용자 상태·제보 수로 계산하지 않고 입력 변경 시 과거 평가를 무효화합니다. */
import { it, expect } from "vitest";
import { riskInputChanged, riskSchema, groupRisk } from "../../src/lib/risk";
it("잘못된 위험도와 이유 없는 출력을 거부한다", () => {
  expect(
    riskSchema.safeParse({
      riskLevel: "HIGH",
      riskReason: "관찰된 노출 전선으로 접근 시 위험 추정. 현장 확인 필요.",
    }).success,
  ).toBe(true);
  expect(
    riskSchema.safeParse({ riskLevel: "SAFE", riskReason: "" }).success,
  ).toBe(false);
});
it("설명·위치 변경은 재분석, 상태·신고문 변경과 같은 값 저장은 평가 유지", () => {
  const before = {
    description: "깨진 블록",
    latitude: 37,
    status: "PREPARING",
  };
  expect(riskInputChanged(before, { description: "다른 시설" })).toBe(true);
  expect(riskInputChanged(before, { latitude: 38 })).toBe(true);
  expect(
    riskInputChanged(before, {
      description: "깨진 블록",
      status: "USER_REPORTED",
      draftText: "초안",
    }),
  ).toBe(false);
});
it("제보 수를 곱하지 않고 관찰된 평가 중 최대값을 표시한다", () => {
  expect(groupRisk(["LOW", "LOW", "LOW"])).toBe("LOW");
  expect(groupRisk(["UNKNOWN", "HIGH", "LOW"])).toBe("HIGH");
  expect(groupRisk(["UNKNOWN"])).toBe("UNKNOWN");
});
