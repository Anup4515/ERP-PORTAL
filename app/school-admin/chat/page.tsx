import { auth } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import ChatPageShell from "@/app/components/chat/ChatPageShell";

export default async function SchoolAdminChatPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "school_admin") {
    redirect("/login");
  }
  return <ChatPageShell selfUserId={session.user.user_id} />;
}
