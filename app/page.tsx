import { redirect } from "next/navigation"
import { auth } from "@/app/lib/auth"

export default async function Home() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role === "school_admin" && !session.user.school_id) {
    redirect("/setup-partner")
  }

  if (session.user.role === "teacher") {
    redirect("/teacher/dashboard")
  }

  redirect("/school-admin/dashboard")
}
