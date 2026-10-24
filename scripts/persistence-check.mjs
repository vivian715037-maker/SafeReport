/** 실행 중 서버 재시작 전후 동일 브라우저 권한과 만료 보존을 검사하는 대화형 검증 도구입니다. */
import { request } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { createInterface } from "node:readline/promises";
process.env.DATABASE_URL ||= "file:./fixit.db";
const db = new PrismaClient();
const baseURL = "http://127.0.0.1:3000";
const client = await request.newContext({
  baseURL,
  extraHTTPHeaders: { Origin: baseURL },
});
let id;
try {
  // 1. 실제 사용자와 무관한 사진·초안을 만들고 서버 DB에서 만료 시각을 과거로 바꿉니다.
  const buffer = await sharp({
    create: { width: 20, height: 20, channels: 3, background: "#ddeeff" },
  })
    .jpeg()
    .toBuffer();
  const res = await client.post("/api/reports/upload", {
    multipart: {
      image: { name: "persistence.jpg", mimeType: "image/jpeg", buffer },
    },
  });
  if (!res.ok()) throw Error("업로드 실패");
  const r = await res.json();
  id = r.id;
  await db.report.update({
    where: { id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  // 2. 토큰은 메모리에만 유지하고 사용자가 서버를 재시작한 뒤 입력을 받습니다.
  const reader = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  await reader.question("READY: 서버를 재시작한 뒤 Enter를 누르세요.\n");
  reader.close();
  const after = await client.get("/api/reports/" + id);
  if (!after.ok()) throw Error("재시작 후 소유권 유지 실패");
  const latest = await after.json();
  if (latest.status !== "INCOMPLETE" || latest.uploadedAt !== r.uploadedAt)
    throw Error("재시작 후 만료 또는 업로드 시각 보존 실패");
  console.log(
    JSON.stringify({
      restartPersistence: true,
      ownerPreserved: true,
      status: latest.status,
      uploadedAtPreserved: true,
    }),
  );
} finally {
  if (id) await client.delete("/api/reports/" + id).catch(() => {});
  await client.dispose();
  await db.$disconnect();
}
