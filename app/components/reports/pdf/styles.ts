import { StyleSheet } from "@react-pdf/renderer"

export const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#1e3a5f",
  },
  logo: {
    width: 50,
    height: 50,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  schoolName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a5f",
  },
  schoolAddress: {
    fontSize: 8,
    color: "#666",
    marginTop: 2,
  },
  reportTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    color: "#1e3a5f",
    marginBottom: 10,
    marginTop: 5,
  },
  // Student info
  studentInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    padding: 8,
    backgroundColor: "#f0f4f8",
    borderRadius: 4,
  },
  infoItem: {
    flexDirection: "row",
    gap: 3,
  },
  infoLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#555",
  },
  infoValue: {
    fontSize: 8,
    color: "#1a1a1a",
  },
  // Section titles
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a5f",
    marginBottom: 6,
    marginTop: 10,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  // Tables
  table: {
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
    minHeight: 20,
    alignItems: "center",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1e3a5f",
    minHeight: 22,
    alignItems: "center",
  },
  tableHeaderCell: {
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    padding: 4,
    textAlign: "center",
  },
  tableCell: {
    fontSize: 8,
    padding: 4,
    textAlign: "center",
  },
  tableCellLeft: {
    fontSize: 8,
    padding: 4,
    textAlign: "left",
  },
  // Stats boxes
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    padding: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 4,
    alignItems: "center",
  },
  statValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a5f",
  },
  statLabel: {
    fontSize: 7,
    color: "#888",
    marginTop: 2,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: "#999",
  },
  // Totals row
  totalRow: {
    flexDirection: "row",
    backgroundColor: "#e8eef5",
    minHeight: 22,
    alignItems: "center",
    fontFamily: "Helvetica-Bold",
  },
  // Remarks
  remarksBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#fafafa",
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: "#ddd",
  },
  remarksText: {
    fontSize: 8,
    fontStyle: "italic",
    color: "#444",
    lineHeight: 1.4,
  },
  // Signatures
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 40,
    paddingTop: 0,
  },
  signatureBlock: {
    width: "30%",
    alignItems: "center",
  },
  signatureLine: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#333",
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 7,
    color: "#555",
  },
})
