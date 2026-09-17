import { NextResponse } from "next/server";
import { buildBackup } from "@/lib/backup";

export async function GET() {
  const backup = await buildBackup();
  const filename = `financehub-backup-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
