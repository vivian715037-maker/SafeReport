/** 명시적으로 실행한 경우에만 합성 데모 제보를 추가합니다. 실제 사진·신고처럼 표시하지 않습니다. */
import { PrismaClient } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
if (process.env.NODE_ENV === "production")
  throw Error("운영 환경에서는 데모를 넣을 수 없습니다.");
process.env.DATABASE_URL ||= "file:./fixit.db";
const db = new PrismaClient();
try {
  // 1. 사람과 실제 시설이 없는 색상 이미지를 만들어 안전한 데모로 사용합니다.
  await mkdir("data/images", { recursive: true });
  const imagePath = randomUUID() + ".jpg";
  await writeFile(
    "data/images/" + imagePath,
    await sharp({
      create: { width: 500, height: 350, channels: 3, background: "#c4d9f4" },
    })
      .jpeg()
      .toBuffer(),
  );
  // 2. 실제 사용자와 분리한 소유자를 만들고 제보 자체에 데모임을 명시합니다.
  const who = await db.browserOwner.upsert({
    where:{id:'fixit-demo-owner'},update:{},
    create: {id:'fixit-demo-owner',tokenHash: createHash("sha256").update(randomUUID()).digest("hex")},
  });
  await db.report.create({
    data: {
      ownerId: who.id,
      imagePath,
      title: "[데모 데이터] 가상 보도블록 점검",
      description:
        "실제 신고가 아닌 기능 시연용 데이터입니다. 가상의 보행 위험을 표시합니다.",
      riskType: "보행 위험",
      latitude: 37.5665123,
      longitude: 126.9780123,
      isDraft: false,
      isPublic: true,
      status: "INCOMPLETE",
      expiresAt: new Date(Date.now() - 1000),
    },
  });
  console.log("데모 제보 1건을 추가했습니다. 삭제: npm run demo:clear");
} finally {
  await db.$disconnect();
}
