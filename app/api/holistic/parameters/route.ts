import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery, executeTransaction } from "@/app/lib/db"

const DEFAULT_PARAMETERS = [
  {
    name: "Physical Activity",
    sub_parameters: ["Stamina", "Participation in Sports", "Teamwork in Games", "Fitness Level", "Interest in Activities"],
  },
  {
    name: "Academic Performance",
    sub_parameters: ["Competition", "Consistency", "Test Preparedness", "Class Engagement", "Subject Understanding", "Homework"],
  },
  {
    name: "Mental Parameters",
    sub_parameters: ["Grasping Ability", "Retention Power", "Conceptual Clarity", "Attention Span", "Learning Speed"],
  },
  {
    name: "Behavioural Parameters",
    sub_parameters: ["Peer Interaction", "Discipline", "Respect for Authority", "Motivation Level", "Response to Feedback"],
  },
  {
    name: "Creativity & Innovation",
    sub_parameters: ["Initiative in Projects", "Curiosity Level", "Problem Solving", "Extra Curricular", "Idea Generation"],
  },
  {
    name: "Subject-Wise Rating",
    sub_parameters: [],
  },
]

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "school_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const school_id = session.user.school_id
    if (!school_id) return NextResponse.json({ error: "No partner profile" }, { status: 400 })

    const partnerRows = await executeQuery<{ user_id: number }[]>(
      "SELECT user_id FROM partners WHERE id = ?",
      [school_id]
    )
    if (partnerRows.length === 0) return NextResponse.json({ error: "Partner not found" }, { status: 404 })
    const partnerUserId = partnerRows[0].user_id

    const rows = await executeQuery<{
      id: number
      name: string
      sort_order: number
      sub_id: number | null
      sub_name: string | null
      sub_sort_order: number | null
    }[]>(
      `SELECT hp.id, hp.name, hp.sort_order,
              hsp.id as sub_id, hsp.name as sub_name, hsp.sort_order as sub_sort_order
       FROM erp_holistic_parameters hp
       LEFT JOIN erp_holistic_sub_parameters hsp ON hsp.parameter_id = hp.id
       WHERE hp.partner_id = ?
       ORDER BY hp.sort_order, hp.name, hsp.sort_order, hsp.name`,
      [partnerUserId]
    )

    const parametersMap = new Map<number, {
      id: number
      name: string
      sort_order: number
      sub_parameters: { id: number; name: string; sort_order: number }[]
    }>()

    for (const row of rows) {
      if (!parametersMap.has(row.id)) {
        parametersMap.set(row.id, {
          id: row.id,
          name: row.name,
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

    return NextResponse.json({ data: Array.from(parametersMap.values()) })
  } catch (error) {
    console.error("Holistic parameters GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "school_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const school_id = session.user.school_id
    if (!school_id) return NextResponse.json({ error: "No partner profile" }, { status: 400 })

    const partnerRows = await executeQuery<{ user_id: number }[]>(
      "SELECT user_id FROM partners WHERE id = ?",
      [school_id]
    )
    if (partnerRows.length === 0) return NextResponse.json({ error: "Partner not found" }, { status: 404 })
    const partnerUserId = partnerRows[0].user_id

    const body = await request.json()
    const { name, sort_order, load_defaults } = body

    if (load_defaults) {
      await executeTransaction(async (connection) => {
        for (let i = 0; i < DEFAULT_PARAMETERS.length; i++) {
          const param = DEFAULT_PARAMETERS[i]
          const [paramResult] = await connection.execute(
            `INSERT INTO erp_holistic_parameters (partner_id, name, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, NOW(), NOW())`,
            [partnerUserId, param.name, i + 1]
          )
          const paramId = (paramResult as any).insertId

          for (let j = 0; j < param.sub_parameters.length; j++) {
            await connection.execute(
              `INSERT INTO erp_holistic_sub_parameters (parameter_id, name, sort_order, created_at, updated_at)
               VALUES (?, ?, ?, NOW(), NOW())`,
              [paramId, param.sub_parameters[j], j + 1]
            )
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

    const result = await executeQuery<{ insertId: number }>(
      `INSERT INTO erp_holistic_parameters (partner_id, name, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())`,
      [partnerUserId, name, sort_order ?? 0]
    )

    return NextResponse.json(
      { data: { id: (result as any).insertId }, message: "Parameter created successfully" },
      { status: 201 }
    )
  } catch (error) {
    console.error("Holistic parameters POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
