import { View, Text, Image } from "@react-pdf/renderer"
import { styles } from "./styles"

interface PartnerInfo {
  partner_name: string
  address?: string | null
  city?: string | null
  state?: string | null
  logo?: string | null
  affiliated_board?: string | null
}

interface StudentInfo {
  name: string
  roll_number: number | null
  class_name: string
  section_name: string
}

interface ReportHeaderProps {
  partner: PartnerInfo
  student: StudentInfo
  title: string
  subtitle?: string
}

export default function ReportHeader({ partner, student, title, subtitle }: ReportHeaderProps) {
  const addressParts = [partner.address, partner.city, partner.state].filter(Boolean)
  const addressLine = addressParts.join(", ")

  return (
    <View>
      {/* School Header */}
      <View style={styles.header}>
        {partner.logo && (
          <Image style={styles.logo} src={partner.logo} />
        )}
        <View style={styles.headerText}>
          <Text style={styles.schoolName}>{partner.partner_name}</Text>
          {addressLine && <Text style={styles.schoolAddress}>{addressLine}</Text>}
          {partner.affiliated_board && (
            <Text style={styles.schoolAddress}>Board: {partner.affiliated_board}</Text>
          )}
        </View>
      </View>

      {/* Report Title */}
      <Text style={styles.reportTitle}>{title}</Text>
      {subtitle && (
        <Text style={{ fontSize: 9, textAlign: "center", color: "#666", marginBottom: 8 }}>
          {subtitle}
        </Text>
      )}

      {/* Student Info */}
      <View style={styles.studentInfo}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Student: </Text>
          <Text style={styles.infoValue}>{student.name}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Class: </Text>
          <Text style={styles.infoValue}>{student.class_name} - {student.section_name}</Text>
        </View>
        {student.roll_number && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Roll No: </Text>
            <Text style={styles.infoValue}>{student.roll_number}</Text>
          </View>
        )}
      </View>
    </View>
  )
}
