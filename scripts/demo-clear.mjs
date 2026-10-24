/** 제목이 [데모 데이터]로 시작하는 전용 시연 기록만 제거합니다. 일반 제보는 보존합니다. */
import { PrismaClient } from "@prisma/client";
import { unlink } from "node:fs/promises";
process.env.DATABASE_URL ||= "file:./fixit.db";
const db = new PrismaClient();
try {
  const rows = await db.report.findMany({
    where: { ownerId:'fixit-demo-owner',title: { startsWith: "[데모 데이터]" } },
  });
  for (const r of rows) {
    await db.report.delete({ where: { id: r.id } });
    await unlink("data/images/" + r.imagePath).catch(() => {});
  }
  console.log(`데모 ${rows.length}건 삭제`);
} finally {
  await db.$disconnect();
}
