import { Document, Page, View, Text } from "@react-pdf/renderer"
import { styles } from "./styles"
import ReportHeader from "./ReportHeader"
import ReportFooter from "./ReportFooter"
import type { MonthlyReportData } from "../MonthlyReportView"

interface MonthlyReportPDFProps {
  data: MonthlyReportData
  partner: {
    partner_name: string
    address?: string | null
    city?: string | null
    state?: string | null
    logo?: string | null
    affiliated_board?: string | null
  }
}

export default function MonthlyReportPDF({ data, partner }: MonthlyReportPDFProps) {
  const { student, month, attendance, holistic } = data
  const monthLabel = new Date(month + "-01").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <ReportHeader
          partner={partner}
          student={student}
          title="Monthly Progress Report"
          subtitle={monthLabel}
        />

        {/* Attendance Summary */}
        <Text style={styles.sectionTitle}>Attendance Summary</Text>
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
            <Text style={[styles.statValue, { color: "#ca8a04" }]}>{attendance.late}</Text>
            <Text style={styles.statLabel}>Late</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{attendance.percentage.toFixed(1)}%</Text>
            <Text style={styles.statLabel}>Attendance %</Text>
          </View>
        </View>

        {/* Holistic Development */}
        {holistic.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Holistic Development</Text>
            <View style={styles.table}>
              {/* Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2, textAlign: "left" }]}>Parameter</Text>
                <Text style={[styles.tableHeaderCell, { flex: 3, textAlign: "left" }]}>Sub-Parameter</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Rating</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Grade</Text>
              </View>
              {/* Rows */}
              {holistic.map((param) =>
                param.sub_parameters.map((sub, idx) => (
                  <View
                    key={`${param.parameter_name}-${sub.name}`}
                    style={[
                      styles.tableRow,
                      idx % 2 === 0 ? {} : { backgroundColor: "#f9f9f9" },
                    ]}
                  >
                    <Text style={[styles.tableCellLeft, { flex: 2, fontFamily: idx === 0 ? "Helvetica-Bold" : "Helvetica" }]}>
                      {idx === 0 ? param.parameter_name : ""}
                    </Text>
                    <Text style={[styles.tableCellLeft, { flex: 3 }]}>{sub.name}</Text>
                    <Text style={[styles.tableCell, { flex: 1 }]}>
                      {sub.rating_value != null ? sub.rating_value : "-"}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1 }]}>
                      {sub.rating_grade ?? "-"}
                    </Text>
                  </View>
                ))
              )}
              {/* Averages row */}
              <View style={styles.totalRow}>
                <Text style={[styles.tableCellLeft, { flex: 2, fontFamily: "Helvetica-Bold" }]}>Overall Average</Text>
                <Text style={[styles.tableCellLeft, { flex: 3 }]} />
                <Text style={[styles.tableCell, { flex: 1, fontFamily: "Helvetica-Bold" }]}>
                  {(() => {
                    const rated = holistic.filter((p) => p.average != null)
                    if (rated.length === 0) return "-"
                    const avg = rated.reduce((s, p) => s + p.average!, 0) / rated.length
                    return avg.toFixed(1)
                  })()}
                </Text>
                <Text style={[styles.tableCell, { flex: 1 }]} />
              </View>
            </View>
          </View>
        )}

        <ReportFooter />
      </Page>
    </Document>
  )
}
