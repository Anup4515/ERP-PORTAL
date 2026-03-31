import DashboardLayout from "@/app/components/layouts/DashboardLayout";

export default function SchoolAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout role="school_admin">{children}</DashboardLayout>;
}
