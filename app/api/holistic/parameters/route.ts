import { NextResponse } from "next/server"
import { getAuthContext, isAuthError } from "@/app/lib/auth-utils"
import { executeQuery, executeTransaction } from "@/app/lib/db"

type Stage = "foundational" | "preparatory" | "middle" | "secondary"

// Map grade_level to stage
export function gradeToStage(gradeLevel: number | null): Stage {
  if (!gradeLevel || gradeLevel <= 2) return "foundational"
  if (gradeLevel <= 5) return "preparatory"
  if (gradeLevel <= 8) return "middle"
  return "secondary"
}

const STAGE_LABELS: Record<Stage, string> = {
  foundational: "Foundational (Nursery - Class 2)",
  preparatory: "Preparatory (Class 3 - 5)",
  middle: "Middle (Class 6 - 8)",
  secondary: "Secondary (Class 9 - 12)",
}

export async function GET(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin", "teacher"])
    if (isAuthError(ctx)) return ctx

    // Optional stage filter
    const { searchParams } = new URL(request.url)
    const stageFilter = searchParams.get("stage")

    let query = `SELECT hp.id, hp.name, hp.stage, hp.sort_order,
            hsp.id as sub_id, hsp.name as sub_name, hsp.sort_order as sub_sort_order
     FROM erp_holistic_parameters hp
     LEFT JOIN erp_holistic_sub_parameters hsp ON hsp.parameter_id = hp.id
     WHERE hp.partner_id = ?`
    const queryParams: (string | number)[] = [ctx.partnerUserId]

    if (stageFilter) {
      query += ` AND hp.stage = ?`
      queryParams.push(stageFilter)
    }

    query += ` ORDER BY hp.stage, hp.sort_order, hp.name, hsp.sort_order, hsp.name`

    const rows = await executeQuery<{
      id: number
      name: string
      stage: string | null
      sort_order: number
      sub_id: number | null
      sub_name: string | null
      sub_sort_order: number | null
    }[]>(query, queryParams)

    const parametersMap = new Map<number, {
      id: number
      name: string
      stage: string | null
      sort_order: number
      sub_parameters: { id: number; name: string; sort_order: number }[]
    }>()

    for (const row of rows) {
      if (!parametersMap.has(row.id)) {
        parametersMap.set(row.id, {
          id: row.id,
          name: row.name,
          stage: row.stage,
          sort_order: row.sort_order,
          sub_parameters: [],
        })
      }
      if (row.sub_id !== null) {
        parametersMap.get(row.id)!.sub_parameters.push({
          id: row.sub_id,
          name: row.sub_name!,
          sort_order: row.sub_sort_order!,
        })
      }
    }

    return NextResponse.json({
      data: Array.from(parametersMap.values()),
      stage_labels: STAGE_LABELS,
    })
  } catch (error) {
    console.error("Holistic parameters GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext(["school_admin"])
    if (isAuthError(ctx)) return ctx

    const body = await request.json()
    const { name, stage, sort_order, load_defaults } = body

    if (load_defaults) {
      // Load defaults from default_holistic_templates table
      const stagesToLoad: Stage[] = load_defaults === "all"
        ? (["foundational", "preparatory", "middle", "secondary"] as Stage[])
        : [load_defaults as Stage]

      await executeTransaction(async (connection) => {
        for (const stg of stagesToLoad) {
          // Check if parameters already exist for this stage
          const [existingRows] = await connection.execute(
            "SELECT COUNT(*) as cnt FROM erp_holistic_parameters WHERE partner_id = ? AND stage = ?",
            [ctx.partnerUserId, stg]
          )
          if ((existingRows as any[])[0].cnt > 0) continue // Skip if already loaded

          // Fetch templates from DB
          const [templateRows] = await connection.execute(
            `SELECT parameter_name, parameter_sort_order, sub_parameter_name, sub_parameter_sort_order
             FROM default_holistic_templates
             WHERE stage = ?
             ORDER BY parameter_sort_order, sub_parameter_sort_order`,
            [stg]
          )
          const templates = templateRows as { parameter_name: string; parameter_sort_order: number; sub_parameter_name: string; sub_parameter_sort_order: number }[]
          if (templates.length === 0) continue

          // Group by parameter name
          const paramMap = new Map<string, { sort_order: number; subs: { name: string; sort_order: number }[] }>()
          for (const t of templates) {
            if (!paramMap.has(t.parameter_name)) {
              paramMap.set(t.parameter_name, { sort_order: t.parameter_sort_order, subs: [] })
            }
            paramMap.get(t.parameter_name)!.subs.push({ name: t.sub_parameter_name, sort_order: t.sub_parameter_sort_order })
          }

          // Insert parameters and sub-parameters
          for (const [paramName, paramData] of paramMap) {
            const [paramRows] = await connection.execute<{ id: number }[]>(
              `INSERT INTO erp_holistic_parameters (partner_id, name, stage, sort_order, created_at, updated_at)
               VALUES (?, ?, ?, ?, NOW(), NOW())
               RETURNING id`,
              [ctx.partnerUserId, paramName, stg, paramData.sort_order]
            )
            const paramId = paramRows[0].id

            for (const sub of paramData.subs) {
              await connection.execute(
                `INSERT INTO erp_holistic_sub_parameters (parameter_id, name, sort_order, created_at, updated_at)
                 VALUES (?, ?, ?, NOW(), NOW())`,
                [paramId, sub.name, sub.sort_order]
              )
            }
          }
        }
      })

      return NextResponse.json(
        { message: "Default parameters loaded successfully" },
        { status: 201 }
      )
    }

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      )
    }

    const result = await executeQuery<{ id: number }[]>(
      `INSERT INTO erp_holistic_parameters (partner_id, name, stage, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())
       RETURNING id`,
      [ctx.partnerUserId, name, stage || null, sort_order ?? 0]
    )

    return NextResponse.json(
      { data: { id: result[0].id }, message: "Parameter created successfully" },
      { status: 201 }
    )
  } catch (error) {
    console.error("Holistic parameters POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
