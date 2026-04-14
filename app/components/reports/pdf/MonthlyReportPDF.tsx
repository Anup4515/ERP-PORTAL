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
            <View style={{ marginBottom: 10 }}>
              {holistic.map((param) => {
                const avg = param.average ?? 0
                const barWidth = (avg / 10) * 100
                const barColor = avg <= 3 ? "#f87171" : avg <= 6 ? "#facc15" : "#4ade80"
                return (
                  <View
                    key={param.parameter_name}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 6,
                      gap: 6,
                    }}
                  >
                    <Text
                      style={{
                        width: 120,
                        fontSize: 8,
                        color: "#444",
                      }}
                    >
                      {param.parameter_name}
                    </Text>
                    <View
                      style={{
                        flex: 1,
                        height: 10,
                        backgroundColor: "#f0f0f0",
                        borderRadius: 5,
                      }}
                    >
                      <View
                        style={{
                          width: `${barWidth}%`,
                          height: 10,
                          backgroundColor: barColor,
                          borderRadius: 5,
                        }}
                      />
                    </View>
                    <Text
                      style={{
                        width: 30,
                        fontSize: 8,
                        fontFamily: "Helvetica-Bold",
                        textAlign: "right",
                        color: avg <= 3 ? "#dc2626" : avg <= 6 ? "#ca8a04" : "#16a34a",
                      }}
                    >
                      {param.average != null ? param.average.toFixed(1) : "-"}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        <ReportFooter />
      </Page>
    </Document>
  )
}
