import { Document, Page, View, Text } from "@react-pdf/renderer"
import { styles } from "./styles"
import ReportHeader from "./ReportHeader"
import ReportFooter from "./ReportFooter"
import type { ExamReportData } from "../ExamReportView"

interface ExamReportPDFProps {
  data: ExamReportData
  partner: {
    partner_name: string
    address?: string | null
    city?: string | null
    state?: string | null
    logo?: string | null
    affiliated_board?: string | null
  }
}

export default function ExamReportPDF({ data, partner }: ExamReportPDFProps) {
  const { student, exam, subjects, total_obtained, total_max, overall_percentage, overall_grade, rank } = data

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <ReportHeader
          partner={partner}
          student={student}
          title="Examination Report Card"
          subtitle={exam.name}
        />

        {/* Summary Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{total_obtained}/{total_max}</Text>
            <Text style={styles.statLabel}>Total Marks</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{overall_percentage.toFixed(1)}%</Text>
            <Text style={styles.statLabel}>Percentage</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{overall_grade}</Text>
            <Text style={styles.statLabel}>Grade</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{rank != null ? `#${rank}` : "-"}</Text>
            <Text style={styles.statLabel}>Class Rank</Text>
          </View>
        </View>

        {/* Subject-wise Marks */}
        <Text style={styles.sectionTitle}>Subject-wise Performance</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 0.5 }]}>S.No.</Text>
            <Text style={[styles.tableHeaderCell, { flex: 3, textAlign: "left" }]}>Subject</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Max Marks</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Obtained</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Percentage</Text>
            <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Grade</Text>
          </View>

          {subjects.map((sub, idx) => (
            <View
              key={sub.subject_name}
              style={[styles.tableRow, idx % 2 === 0 ? {} : { backgroundColor: "#f9f9f9" }]}
            >
              <Text style={[styles.tableCell, { flex: 0.5 }]}>{idx + 1}</Text>
              <Text style={[styles.tableCellLeft, { flex: 3 }]}>{sub.subject_name}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{sub.max_marks}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>
                {sub.is_absent ? "AB" : sub.obtained_marks != null ? sub.obtained_marks : "-"}
              </Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>
                {sub.is_absent ? "-" : sub.percentage != null ? `${sub.percentage.toFixed(1)}%` : "-"}
              </Text>
              <Text style={[styles.tableCell, { flex: 0.8 }]}>{sub.grade ?? "-"}</Text>
            </View>
          ))}

          {/* Total row */}
          <View style={styles.totalRow}>
            <Text style={[styles.tableCell, { flex: 0.5 }]} />
            <Text style={[styles.tableCellLeft, { flex: 3, fontFamily: "Helvetica-Bold" }]}>Total</Text>
            <Text style={[styles.tableCell, { flex: 1, fontFamily: "Helvetica-Bold" }]}>{total_max}</Text>
            <Text style={[styles.tableCell, { flex: 1, fontFamily: "Helvetica-Bold" }]}>{total_obtained}</Text>
            <Text style={[styles.tableCell, { flex: 1, fontFamily: "Helvetica-Bold" }]}>{overall_percentage.toFixed(1)}%</Text>
            <Text style={[styles.tableCell, { flex: 0.8, fontFamily: "Helvetica-Bold" }]}>{overall_grade}</Text>
          </View>
        </View>

        <ReportFooter />
      </Page>
    </Document>
  )
}
