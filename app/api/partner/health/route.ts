import { NextResponse } from "next/server";
import { executeQuery } from "@/app/lib/db";
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils";
import {
  evaluateHealth,
  type SchoolHealthRow,
} from "@/app/lib/school-health";

export async function GET() {
  try {
    const ctx = await getAuthContext(["school_admin"]);
    if (isAuthError(ctx)) return ctx;

    const rows = await executeQuery<SchoolHealthRow[]>(
      "SELECT * FROM vw_school_health WHERE partner_id = ?",
      [ctx.schoolId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data: evaluateHealth(rows[0]) });
  } catch (error) {
    console.error("School health error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
