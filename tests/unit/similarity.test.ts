/** GPS 오차, 순위, 동일 문구와 다른 위험·미평가 구분을 검사합니다. */
import { describe, it, expect } from "vitest";
import {
  rankCandidates,
  textSimilarity,
  localComparison,
  overallResult,
  type Comparable,
} from "../../src/lib/similarity";
const source: Comparable = {
  id: "new",
  title: "보도블록이 깨져 넘어질 위험",
  description: "학교 정문 앞 보도블록이 깨져 바닥이 솟아 있습니다.",
  riskType: "보행 위험",
  latitude: 37.5665,
  longitude: 126.978,
};
describe("중복 판단 회귀 검사", () => {
  it("띄어쓰기·문장부호가 달라도 긴 동일 문구는 감지한다", () => {
    expect(
      textSimilarity(
        "보도블록이 깨져 넘어질 위험",
        "보도 블록이 깨져, 넘어질 위험!",
      ),
    ).toBe(1);
    expect(textSimilarity("위험", "위험")).toBe(0);
  });
  it("50m 밖 GPS 오차 후보를 포함하고 150m 밖은 제외한다", () => {
    const rows = rankCandidates(source, [
      { ...source, id: "drift", latitude: 37.5672 },
      { ...source, id: "far", latitude: 37.57 },
    ]);
    expect(rows.map((x) => x.report.id)).toEqual(["drift"]);
    expect(rows[0].meters).toBeGreaterThan(50);
  });
  it("같은 유형의 같은 문구는 중복 가능성으로, 위치만 같으면 확인 불가로 안내한다", () => {
    const ranked = rankCandidates(source, [
      { ...source, id: "same" },
      {
        ...source,
        id: "different",
        title: "신호등 불빛이 보이지 않음",
        description: "보행자 신호등이 고장 났습니다.",
        riskType: "도로·교통",
      },
    ]);
    const same = localComparison(
      source,
      ranked.find((x) => x.report.id === "same")!,
    );
    const different = localComparison(
      source,
      ranked.find((x) => x.report.id === "different")!,
    );
    expect(same.verdict).toBe("POSSIBLE");
    expect(different.verdict).toBe("UNKNOWN");
    expect(overallResult([different])).toBe("확인 불가");
    expect(overallResult([same, different])).toBe("중복 가능성 있음");
  });
  it("가까운 무관 제보보다 동일 내용의 후보를 우선한다", () => {
    const near = Array.from({ length: 9 }, (_, i) => ({
      ...source,
      id: "near" + i,
      title: "다른 시설 안내",
      description: "교통 표지판 글씨가 지워졌습니다.",
      riskType: "도로·교통",
    }));
    const rows = rankCandidates(source, [
      ...near,
      { ...source, id: "same", latitude: 37.5672 },
    ]);
    expect(rows[0].report.id).toBe("same");
    expect(rows).toHaveLength(8);
  });
  it("AI 후보 누락은 없음으로 바꾸지 않고 모두 다른 위험일 때만 없음이다", () => {
    expect(
      overallResult([
        { id: "x", verdict: "UNKNOWN", reason: "근거 부족", source: "NONE" },
      ]),
    ).toBe("확인 불가");
    expect(
      overallResult([
        { id: "x", verdict: "DIFFERENT", reason: "다른 시설", source: "AI" },
      ]),
    ).toBe("유사 제보 없음");
  });
});
