import { NextResponse } from "next/server"
import { executeQuery } from "@/app/lib/db"

export async function GET() {
  const status: { status: string; uptime: number; db: "ok" | "error"; db_latency_ms?: number; error?: string } = {
    status: "ok",
    uptime: process.uptime(),
    db: "ok",
  }

  try {
    const start = Date.now()
    await executeQuery("SELECT 1")
    status.db_latency_ms = Date.now() - start
  } catch (err: any) {
    status.status = "degraded"
    status.db = "error"
    status.error = err.message || "Database unreachable"
  }

  return NextResponse.json(status, { status: status.status === "ok" ? 200 : 503 })
}
