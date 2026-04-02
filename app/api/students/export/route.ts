import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { executeQuery } from "@/app/lib/db"
import ExcelJS from "exceljs"

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const classSectionId = searchParams.get("class_section_id")

    let whereClause = "WHERE es.partner_id = ? AND es.is_current = 1 AND st.deleted_at IS NULL"
    const queryParams: any[] = [partnerUserId]

    if (classSectionId) {
      whereClause += " AND e.class_section_id = ?"
      queryParams.push(classSectionId)
    }

    const students = await executeQuery<any[]>(
      `SELECT st.first_name, st.last_name, st.middle_name, st.email, st.gender,
              st.date_of_birth, st.phone, st.alternate_phone,
              st.address, st.city, st.state, st.country, st.postal_code,
              st.father_name, st.mother_name, st.guardian_name, st.guardian_phone, st.guardian_email,
              st.status, st.height, st.weight, st.blood_group,
              e.roll_number, e.student_type, e.status as enrollment_status,
              c.name as class_name, sec.name as section_name
       FROM students st
       JOIN erp_student_enrollments e ON e.student_id = st.id
       JOIN erp_class_sections ecs ON ecs.id = e.class_section_id
       JOIN erp_sessions es ON es.id = ecs.session_id
       JOIN classes c ON c.id = ecs.class_id
       JOIN sections sec ON sec.id = ecs.section_id
       ${whereClause}
       ORDER BY c.name, sec.name, e.roll_number, st.first_name`,
      queryParams
    )

    const workbook = new ExcelJS.Workbook()
    workbook.creator = "WiserWits ERP"
    workbook.created = new Date()

    const sheet = workbook.addWorksheet("Students")

    // Define columns with headers and widths
    sheet.columns = [
      { header: "Roll No", key: "roll_number", width: 10 },
      { header: "First Name", key: "first_name", width: 15 },
      { header: "Last Name", key: "last_name", width: 15 },
      { header: "Middle Name", key: "middle_name", width: 15 },
      { header: "Class", key: "class_name", width: 12 },
      { header: "Section", key: "section_name", width: 10 },
      { header: "Gender", key: "gender", width: 10 },
      { header: "Date of Birth", key: "date_of_birth", width: 14 },
      { header: "Email", key: "email", width: 25 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Alt Phone", key: "alternate_phone", width: 15 },
      { header: "Address", key: "address", width: 25 },
      { header: "City", key: "city", width: 12 },
      { header: "State", key: "state", width: 12 },
      { header: "Postal Code", key: "postal_code", width: 12 },
      { header: "Father Name", key: "father_name", width: 18 },
      { header: "Mother Name", key: "mother_name", width: 18 },
      { header: "Guardian Name", key: "guardian_name", width: 18 },
      { header: "Guardian Phone", key: "guardian_phone", width: 15 },
      { header: "Guardian Email", key: "guardian_email", width: 22 },
      { header: "Status", key: "enrollment_status", width: 10 },
      { header: "Student Type", key: "student_type", width: 14 },
    ]

    // Style header row
    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true, size: 11 }
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1A2658" },
    }
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 }
    headerRow.alignment = { vertical: "middle", horizontal: "center" }
    headerRow.height = 24

    // Add data rows
    for (const s of students) {
      sheet.addRow({
        roll_number: s.roll_number ?? "",
        first_name: s.first_name ?? "",
        last_name: s.last_name ?? "",
        middle_name: s.middle_name ?? "",
        class_name: s.class_name ?? "",
        section_name: s.section_name ?? "",
        gender: s.gender ?? "",
        date_of_birth: s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString("en-IN") : "",
        email: s.email ?? "",
        phone: s.phone ?? "",
        alternate_phone: s.alternate_phone ?? "",
        address: s.address ?? "",
        city: s.city ?? "",
        state: s.state ?? "",
        postal_code: s.postal_code ?? "",
        father_name: s.father_name ?? "",
        mother_name: s.mother_name ?? "",
        guardian_name: s.guardian_name ?? "",
        guardian_phone: s.guardian_phone ?? "",
        guardian_email: s.guardian_email ?? "",
        enrollment_status: s.enrollment_status ?? "",
        student_type: s.student_type ?? "",
      })
    }

    // Add borders to all cells
    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE0E0E0" } },
          bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
          left: { style: "thin", color: { argb: "FFE0E0E0" } },
          right: { style: "thin", color: { argb: "FFE0E0E0" } },
        }
        if (rowNumber > 1) {
          cell.alignment = { vertical: "middle" }
        }
      })
    })

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=students_export.xlsx",
      },
    })
  } catch (error) {
    console.error("Students export error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
