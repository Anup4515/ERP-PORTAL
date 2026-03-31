import DashboardLayout from "@/app/components/layouts/DashboardLayout";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout role="teacher">{children}</DashboardLayout>;
}
