import { View, Text } from "@react-pdf/renderer"
import { styles } from "./styles"

export default function ReportFooter() {
  const now = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  return (
    <View>
      {/* Signature blocks */}
      <View style={styles.signatureRow}>
        <View style={styles.signatureBlock}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>Class Teacher</Text>
        </View>
        <View style={styles.signatureBlock}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>Parent / Guardian</Text>
        </View>
        <View style={styles.signatureBlock}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>Principal</Text>
        </View>
      </View>

      {/* Footer with date */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Generated on: {now}</Text>
        <Text style={styles.footerText}>This is a computer-generated report card.</Text>
      </View>
    </View>
  )
}
