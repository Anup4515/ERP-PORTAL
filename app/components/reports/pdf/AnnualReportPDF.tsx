import { Document, Page, View, Text } from "@react-pdf/renderer"
import { styles } from "./styles"
import ReportHeader from "./ReportHeader"
import ReportFooter from "./ReportFooter"
import type { AnnualReportData } from "../AnnualReportView"

interface AnnualReportPDFProps {
  data: AnnualReportData
  partner: {
    partner_name: string
    address?: string | null
    city?: string | null
    state?: string | null
    logo?: string | null
    affiliated_board?: string | null
  }
}

export default function AnnualReportPDF({ data, partner }: AnnualReportPDFProps) {
  const {
    ready,
    not_ready_reason,
    template_type,
    student,
    session,
    exams = [],
    overall = null,
    attendance,
    holistic_trends = [],
    teacher_remarks,
  } = data
  const isJunior = template_type === "junior"

  // Not-ready short-circuit: render a one-page placeholder so the PDF still
  // generates but clearly explains the report isn't available yet.
  if (ready === false) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <ReportHeader
            partner={partner}
            student={student}
            title="Annual Report Card"
            subtitle={`Session: ${session.name}`}
          />
          <View style={{ marginTop: 40 }}>
            <Text style={styles.sectionTitle}>Report Not Available Yet</Text>
            <View style={[styles.remarksBox, { marginTop: 8 }]}>
              <Text style={styles.remarksText}>
                {not_ready_reason ||
                  (isJunior
                    ? "Mid-Term and Final/Annual exams must be completed before the annual report can be generated."
                    : "The Final/Annual exam must be completed before the annual report can be generated.")}
              </Text>
            </View>
          </View>
          <ReportFooter />
        </Page>
      </Document>
    )
  }

  // Collect all unique subjects
  const allSubjects = Array.from(
    new Set(exams.flatMap((e) => e.subjects.map((s) => s.subject_name)))
  )

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <ReportHeader
          partner={partner}
          student={student}
          title="Annual Report Card"
          subtitle={`Session: ${session.name}`}
        />

        {/* Overall (junior = term average, senior = final) */}
        {overall && (
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.sectionTitle}>
              {isJunior ? "Overall (Mid-Term + Final/Annual Average)" : "Final/Annual Exam Result"}
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{overall.percentage.toFixed(2)}%</Text>
                <Text style={styles.statLabel}>Overall</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{overall.grade}</Text>
                <Text style={styles.statLabel}>Grade</Text>
              </View>
            </View>
          </View>
        )}

        {/* Attendance */}
        {attendance && (
          <>
            <Text style={styles.sectionTitle}>Yearly Attendance</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{attendance.total_days}</Text>
                <Text style={styles.statLabel}>Working Days</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: "#16a34a" }]}>{attendance.present}</Text>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: "#dc2626" }]}>{attendance.absent}</Text>
                <Text style={styles.statLabel}>Absent</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{attendance.percentage.toFixed(1)}%</Text>
                <Text style={styles.statLabel}>Attendance %</Text>
              </View>
            </View>
          </>
        )}

        {/* Consolidated Exam Results */}
        {exams.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Consolidated Exam Results</Text>
            <View style={styles.table}>
              {/* Header row - exam names */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2, textAlign: "left" }]}>Subject</Text>
                {exams.map((exam) => (
                  <Text key={exam.exam_id} style={[styles.tableHeaderCell, { flex: 1.5 }]}>
                    {exam.exam_name}
                  </Text>
                ))}
              </View>

              {/* Subject rows */}
              {allSubjects.map((subjectName, idx) => (
                <View
                  key={subjectName}
                  style={[styles.tableRow, idx % 2 === 0 ? {} : { backgroundColor: "#f9f9f9" }]}
                >
                  <Text style={[styles.tableCellLeft, { flex: 2 }]}>{subjectName}</Text>
                  {exams.map((exam) => {
                    const sub = exam.subjects.find((s) => s.subject_name === subjectName)
                    return (
                      <Text key={`${exam.exam_id}-${subjectName}`} style={[styles.tableCell, { flex: 1.5 }]}>
                        {sub?.is_absent
                          ? "AB"
                          : sub?.obtained_marks != null
                          ? `${sub.obtained_marks}/${sub.max_marks} (${sub.grade || "-"})`
                          : "-"}
                      </Text>
                    )
                  })}
                </View>
              ))}

              {/* Total row */}
              <View style={styles.totalRow}>
                <Text style={[styles.tableCellLeft, { flex: 2, fontFamily: "Helvetica-Bold" }]}>Total</Text>
                {exams.map((exam) => (
                  <Text key={`total-${exam.exam_id}`} style={[styles.tableCell, { flex: 1.5, fontFamily: "Helvetica-Bold" }]}>
                    {exam.total_obtained}/{exam.total_max} ({exam.percentage.toFixed(1)}%)
                  </Text>
                ))}
              </View>

              {/* Grade row */}
              <View style={[styles.tableRow, { backgroundColor: "#f0f4f8" }]}>
                <Text style={[styles.tableCellLeft, { flex: 2, fontFamily: "Helvetica-Bold" }]}>Grade</Text>
                {exams.map((exam) => (
                  <Text key={`grade-${exam.exam_id}`} style={[styles.tableCell, { flex: 1.5, fontFamily: "Helvetica-Bold" }]}>
                    {exam.grade}
                  </Text>
                ))}
              </View>

              {/* Rank row */}
              <View style={styles.tableRow}>
                <Text style={[styles.tableCellLeft, { flex: 2, fontFamily: "Helvetica-Bold" }]}>Rank</Text>
                {exams.map((exam) => (
                  <Text key={`rank-${exam.exam_id}`} style={[styles.tableCell, { flex: 1.5, fontFamily: "Helvetica-Bold" }]}>
                    {exam.rank != null ? `#${exam.rank}` : "-"}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Holistic Trends */}
        {holistic_trends.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Holistic Development Summary</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2, textAlign: "left" }]}>Parameter</Text>
                {holistic_trends[0]?.months.map((m) => (
                  <Text key={m.month} style={[styles.tableHeaderCell, { flex: 1 }]}>
                    {new Date(m.month + "-01").toLocaleDateString("en-US", { month: "short" })}
                  </Text>
                ))}
              </View>
              {holistic_trends.map((trend, idx) => (
                <View
                  key={trend.parameter_name}
                  style={[styles.tableRow, idx % 2 === 0 ? {} : { backgroundColor: "#f9f9f9" }]}
                >
                  <Text style={[styles.tableCellLeft, { flex: 2 }]}>{trend.parameter_name}</Text>
                  {trend.months.map((m) => (
                    <Text key={m.month} style={[styles.tableCell, { flex: 1 }]}>
                      {m.average != null ? m.average.toFixed(1) : "-"}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Teacher Remarks */}
        {teacher_remarks && (
          <View>
            <Text style={styles.sectionTitle}>Teacher Remarks</Text>
            <View style={styles.remarksBox}>
              <Text style={styles.remarksText}>{teacher_remarks}</Text>
            </View>
          </View>
        )}

        <ReportFooter />
      </Page>
    </Document>
  )
}
