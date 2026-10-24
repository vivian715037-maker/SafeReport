/** 만료 경계, 거리, 공개 좌표, 공식 신고처 규칙을 검증합니다. */
import { describe, it, expect } from "vitest";
import {
  effectiveStatus,
  distance,
  publicPoint,
  office,
} from "../../src/lib/rules";
describe("시간과 위치 규칙", () => {
  it("10분 경계와 완료 보존, 취소 상태를 구분한다", () => {
    const end = new Date("2026-10-24T00:10:00Z");
    expect(effectiveStatus("PREPARING", end, new Date(+end - 1))).toBe(
      "PREPARING",
    );
    expect(effectiveStatus("PREPARING", end, end)).toBe("INCOMPLETE");
    expect(effectiveStatus("USER_REPORTED", end, end)).toBe("USER_REPORTED");
    expect(effectiveStatus("PREPARING", end, new Date(+end + 1))).toBe(
      "INCOMPLETE",
    );
  });
  it("거리 50m의 안팎을 구분한다", () => {
    expect(distance(37, 127, 37.0001, 127)).toBeLessThan(50);
    expect(distance(37, 127, 37.001, 127)).toBeGreaterThan(50);
    expect(distance(37, 127, 37, 127)).toBe(0);
  });
  it("공개 좌표는 원본과 다르며 근접 범위로 제한된다", () => {
    const p = publicPoint(37.5665123, 126.9780123);
    expect(p.latitude).not.toBe(37.5665123);
    expect(
      distance(37.5665123, 126.9780123, p.latitude, p.longitude),
    ).toBeLessThan(40);
  });
  it("연락처를 생성하지 않고 확인된 공식 링크만 사용한다", () => {
    expect(office("공공시설").url).toBe("https://www.safetyreport.go.kr/");
    expect(office("학교").url).toBe("");
    expect(office("사유시설").help).toContain("확인");
  });
});
