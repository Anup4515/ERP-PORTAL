import { NextResponse } from "next/server";
import { executeQuery } from "@/app/lib/db";
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils";
import {
  evaluateClassSection,
  type ClassSectionHealthRow,
} from "@/app/lib/class-section-health";

export async function GET() {
  try {
    const ctx = await getAuthContext(["school_admin"]);
    if (isAuthError(ctx)) return ctx;

    const rows = await executeQuery<ClassSectionHealthRow[]>(
      `SELECT *
         FROM vw_class_section_health
        WHERE partner_user_id = ?
        ORDER BY class_name, section_name`,
      [ctx.partnerUserId]
    );

    return NextResponse.json({
      data: rows.map(evaluateClassSection),
    });
  } catch (error) {
    console.error("Class section health error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
