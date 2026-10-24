/** 실제 HTTP 권한·저장·사진 공개와 모바일 화면 흐름을 분리된 DB에서 검사합니다. */
import { test, expect, request as playwrightRequest } from "@playwright/test";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";
import path from "node:path";
const origin = "http://127.0.0.1:3001";
const headers = { Origin: origin };
const database = new PrismaClient({
  datasourceUrl: "file:" + path.resolve("prisma/test.db").replaceAll("\\", "/"),
});
async function photo() {
  return sharp({
    create: { width: 600, height: 400, channels: 3, background: "#d8e5f4" },
  })
    .jpeg()
    .toBuffer();
}
/** 테스트는 임의의 가짜 사진만 사용합니다. */
test("권한·중복 후보·사진 공개·만료·삭제를 실제 API로 검증", async () => {
  const a = await playwrightRequest.newContext({
    baseURL: origin,
    extraHTTPHeaders: headers,
  });
  const b = await playwrightRequest.newContext({
    baseURL: origin,
    extraHTTPHeaders: headers,
  });
  const upload = async (ctx: typeof a) => {
    const res = await ctx.post("/api/reports/upload", {
      multipart: {
        image: {
          name: "fake.jpg",
          mimeType: "image/jpeg",
          buffer: await photo(),
        },
      },
    });
    expect(res.status()).toBe(201);
    return res.json();
  };
  const r = await upload(a);
  try {
    expect((await b.get("/api/reports/" + r.id)).status()).toBe(404);
    expect(
      (
        await b.post("/api/reports/" + r.id + "/risk", {
          data: { consent: true },
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await a.post("/api/reports/" + r.id + "/risk", {
          data: { consent: false },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await a.patch("/api/reports/" + r.id, { data: { riskLevel: "HIGH" } })
      ).status(),
    ).toBe(400);
    expect(
      (
        await b.patch("/api/reports/" + r.id + "/status", {
          data: { reported: true },
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await a.patch("/api/reports/" + r.id, {
          headers: { Origin: "https://example.com" },
          data: { title: "변경" },
        })
      ).status(),
    ).toBe(403);
    await expect((await a.get("/api/reports/map")).json()).resolves.toEqual([]);
    expect(
      (
        await a.post("/api/reports/upload", {
          multipart: {
            image: {
              name: "bad.jpg",
              mimeType: "image/jpeg",
              buffer: Buffer.from("not an image"),
            },
          },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await a.patch("/api/reports/" + r.id, { data: { latitude: 999 } })
      ).status(),
    ).toBe(400);
    await a.patch("/api/reports/" + r.id, {
      data: {
        latitude: 37.5665123,
        longitude: 126.9780123,
        title: "깨진 보도블록",
        description: "[테스트] 바닥에 균열이 있습니다.",
        riskType: "보행 위험",
      },
    });
    const absent = await a.post("/api/reports/" + r.id + "/similar", {
      data: { useAI: false },
    });
    expect((await absent.json()).result).toBe("유사 제보 없음");
    expect(
      (
        await a.post("/api/reports/" + r.id + "/analyze", {
          data: { consent: false },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await a.post("/api/reports/" + r.id + "/analyze", {
          data: { consent: true },
        })
      ).status(),
    ).toBe(503);
    expect(
      (
        await a.post("/api/reports/" + r.id + "/publish", {
          data: { isPublic: true, photoPublic: true, photoConfirmed: false },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await a.post("/api/reports/" + r.id + "/publish", {
          data: { isPublic: true, photoPublic: false, photoConfirmed: false },
        })
      ).ok(),
    ).toBeTruthy();
    const visible = await (await b.get("/api/reports/" + r.id)).json();
    expect(visible.riskLevel).toBe("UNKNOWN");
    expect(visible.latitude).not.toBe(37.5665123);
    for (const field of [
      "ownerId",
      "imagePath",
      "locationLabel",
      "draftText",
      "aiConsentAt",
      "expiresAt",
    ])
      expect(visible).not.toHaveProperty(field);
    expect((await b.get("/api/reports/" + r.id + "/image")).status()).toBe(404);
    const candidate = await upload(b);
    await b.patch("/api/reports/" + candidate.id, {
      data: {
        latitude: 37.56652,
        longitude: 126.97802,
        title: "다른 제보",
        description: "[테스트] 근처 위험",
        riskType: "보행 위험",
      },
    });
    let results = await (
      await b.post("/api/reports/" + candidate.id + "/similar", {
        data: { useAI: false },
      })
    ).json();
    expect(results.result).toBe("확인 불가");
    expect(results.candidates[0].sameType).toBe(true);
    await b.patch("/api/reports/" + candidate.id, {
      data: { riskType: "전기·화재" },
    });
    results = await (
      await b.post("/api/reports/" + candidate.id + "/similar", {
        data: { useAI: false },
      })
    ).json();
    expect(results.candidates[0].sameType).toBe(false);
    const withoutPriorAnalysis = await b.post(
      "/api/reports/" + candidate.id + "/similar",
      { data: { useAI: true } },
    );
    expect(withoutPriorAnalysis.status()).toBe(200);
    expect((await withoutPriorAnalysis.json()).reason).toContain("문구");
    await b.delete("/api/reports/" + candidate.id);
    // AI 응답을 흉내 내는 전용 DB 설정이며 실제 AI 분석 성공으로 보고하지 않습니다.
    await database.report.update({
      where: { id: r.id },
      data: {
        riskLevel: "HIGH",
        riskReason: "[테스트] 추락 위험이 관찰됨. 현장 확인 필요.",
        riskAssessedAt: new Date(),
      },
    });
    await a.patch("/api/reports/" + r.id + "/status", {
      data: { reported: true },
    });
    expect((await (await b.get("/api/reports/" + r.id)).json()).riskLevel).toBe(
      "HIGH",
    );
    await a.patch("/api/reports/" + r.id + "/status", {
      data: { reported: false },
    });
    await a.patch("/api/reports/" + r.id, {
      data: { description: "[테스트] 관찰 내용이 변경됨" },
    });
    expect((await (await b.get("/api/reports/" + r.id)).json()).riskLevel).toBe(
      "UNKNOWN",
    );
    expect(
      (
        await a.post("/api/reports/" + r.id + "/risk", {
          data: { consent: true },
        })
      ).status(),
    ).toBe(503);
    await a.patch("/api/reports/" + r.id + "/visibility", {
      data: { isPublic: true, photoPublic: true, photoConfirmed: true },
    });
    expect((await b.get("/api/reports/" + r.id + "/image")).status()).toBe(200);
    await a.patch("/api/reports/" + r.id + "/visibility", {
      data: { isPublic: true, photoPublic: false, photoConfirmed: false },
    });
    expect((await b.get("/api/reports/" + r.id + "/image")).status()).toBe(404);
    await database.report.update({
      where: { id: r.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await (await a.get("/api/reports/" + r.id)).json()).status).toBe(
      "INCOMPLETE",
    );
    await a.patch("/api/reports/" + r.id + "/status", {
      data: { reported: true },
    });
    expect((await (await a.get("/api/reports/" + r.id)).json()).status).toBe(
      "USER_REPORTED",
    );
    await a.patch("/api/reports/" + r.id + "/status", {
      data: { reported: false },
    });
    expect((await (await a.get("/api/reports/" + r.id)).json()).status).toBe(
      "INCOMPLETE",
    );
    expect(
      await database.reportStatusHistory.count({ where: { reportId: r.id } }),
    ).toBeGreaterThanOrEqual(3);
  } finally {
    await a.delete("/api/reports/" + r.id);
    await a.dispose();
    await b.dispose();
    await database.$disconnect();
  }
});
test("용량 제한과 브라우저별 업로드 호출 제한", async () => {
  const client = await playwrightRequest.newContext({
    baseURL: origin,
    extraHTTPHeaders: headers,
  });
  try {
    const large = await client.post("/api/reports/upload", {
      multipart: {
        image: {
          name: "huge.jpg",
          mimeType: "image/jpeg",
          buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
        },
      },
    });
    expect(large.status()).toBe(400);
    for (let i = 0; i < 4; i++)
      expect(
        (
          await client.post("/api/reports/upload", {
            multipart: {
              image: {
                name: "invalid.jpg",
                mimeType: "image/jpeg",
                buffer: Buffer.from("invalid"),
              },
            },
          })
        ).status(),
      ).toBe(400);
    expect(
      (
        await client.post("/api/reports/upload", {
          multipart: {
            image: {
              name: "invalid.jpg",
              mimeType: "image/jpeg",
              buffer: Buffer.from("invalid"),
            },
          },
        })
      ).status(),
    ).toBe(429);
  } finally {
    await client.dispose();
  }
});
test("모바일에서 사진→수동 위치·입력→사진 재확인→완료까지 진행", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /작은 발견이/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "위험 제보 시작하기" }).click();
  await page.getByLabel("위험 사진 업로드").setInputFiles({
    name: "demo.jpg",
    mimeType: "image/jpeg",
    buffer: await photo(),
  });
  await expect(
    page.getByRole("heading", { name: "위치를 확인해 주세요" }),
  ).toBeVisible();
  // 위치 요청 실패를 재현하고 수동 입력 대체 경로를 확인합니다.
  await page.evaluate(() => {
    navigator.geolocation.getCurrentPosition = (_success, error) =>
      error?.({ code: 1, message: "denied" } as GeolocationPositionError);
  });
  await page.getByRole("button", { name: /현재 위치 사용/ }).click();
  await expect(page.locator(".alert.error")).toContainText("직접 선택");
  await page.getByLabel("위도", { exact: true }).fill("37.5665");
  await page.getByLabel("경도", { exact: true }).fill("126.978");
  await page.getByLabel("장소 설명").fill("[데모] 시청 앞 보도");
  await page.getByRole("button", { name: "위치 저장 후 다음" }).click();
  await page
    .getByLabel("발견한 상황")
    .fill("[데모] 보도블록에 균열이 있어 넘어질 수 있습니다.");
  await page.getByLabel("제보 제목").fill("[데모] 보도블록 점검 요청");
  await page.getByRole("button", { name: "저장 후 신고 준비" }).click();
  await page
    .getByRole("button", { name: "입력 내용으로 기본 양식 만들기" })
    .click();
  await expect(page.getByLabel("신고문 초안")).toHaveValue(/현장 확인/);
  await page.getByLabel("편집한 제목").check();
  await page.getByLabel("사진도 공개합니다").check();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "확인했으며 사진 공개에 동의" })
    .click();
  await page.getByRole("button", { name: "신고 진행 · 기록 저장" }).click();
  await expect(
    page.getByRole("heading", {
      name: "[데모] 보도블록 점검 요청",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "신고 완료 표시 (사용자 확인)" })
    .click();
  await expect(page.locator(".page-title .badge")).toHaveText(
    "신고 완료(사용자 확인)",
  );
  // 색상·필터 렌더링만 검사하는 가짜 AI 결과이며 실제 모델 성능 검증과 구분합니다.
  await database.report.updateMany({
    where: { title: "[데모] 보도블록 점검 요청" },
    data: {
      riskLevel: "HIGH",
      riskReason: "[테스트 전용 가짜 평가] 낙상 위험 추정. 현장 확인 필요.",
      riskAssessedAt: new Date(),
    },
  });
  await page.getByRole("button", { name: "제보 지도", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "우리 동네 제보 지도" }),
  ).toBeVisible();
  await expect(page.locator(".map-marker").first()).toBeVisible();
  await page.getByRole("button", { name: "AI 위험 지도", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "우리 동네 AI 위험 지도" }),
  ).toBeVisible();
  await expect(page.locator(".risk-map-intro")).toContainText("현장 확인");
  await page
    .locator(".risk-legend")
    .getByRole("button", { name: "판단 불가", exact: true })
    .click();
  await expect(page.locator(".report-list .report-card")).toHaveCount(0);
  await page
    .locator(".risk-legend")
    .getByRole("button", { name: "높음", exact: true })
    .click();
  await expect(page.locator(".report-list .risk-badge")).toHaveText(
    "AI 추정 높음",
  );
  await expect(page.locator(".map-marker span").first()).toHaveCSS(
    "background-color",
    "rgb(211, 70, 72)",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/mobile-map.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /보도블록 점검 요청/ }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "사진과 제보 삭제" }).click();
  await expect(
    page.getByRole("heading", { name: "내가 남긴 제보" }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
});
