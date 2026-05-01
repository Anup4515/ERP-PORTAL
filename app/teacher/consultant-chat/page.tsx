import { auth } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import ConsultantChatShell from "@/app/components/chat/ConsultantChatShell";

export default async function TeacherConsultantChatPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "teacher") {
    redirect("/login");
  }
  return <ConsultantChatShell selfUserId={session.user.user_id} />;
}
