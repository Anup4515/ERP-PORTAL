import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";

type SessionUser = {
  user_id: number;
  school_id: number | null;
  role: string;
  name: string;
  email: string;
};

type Session = {
  user: SessionUser;
} | null;

export async function getSession(): Promise<Session> {
  return await auth();
}

export function getSchoolId(session: Session): number | null {
  return session?.user?.school_id ?? null;
}

export function getRole(session: Session): string | null {
  return session?.user?.role ?? null;
}

export async function requireAuth(): Promise<Session & { user: SessionUser }> {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session as Session & { user: SessionUser };
}

export async function requireRole(
  role: string
): Promise<Session & { user: SessionUser }> {
  const session = await requireAuth();
  if (session.user.role !== role) {
    throw new Error("Forbidden");
  }
  return session;
}
