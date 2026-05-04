import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { executeQuery } from "@/app/lib/db";

interface UserRow {
  id: number;
  name: string;
  email: string;
  password: string;
  role_id: number;
}

interface PartnerRow {
  id: number;
}

interface TeacherRow {
  partner_id: number;
}

declare module "next-auth" {
  interface User {
    user_id: number;
    school_id: number | null;
    role: string;
    name: string;
    email: string;
  }
}

declare module "next-auth" {
  interface Session {
    user: {
      user_id: number;
      school_id: number | null;
      role: string;
      name: string;
      email: string;
    };
  }
}

function roleName(roleId: number): string {
  switch (roleId) {
    case 4:
      return "school_admin";
    case 5:
      return "teacher";
    default:
      return "unknown";
  }
}

async function resolveSchoolId(
  userId: number,
  roleId: number
): Promise<number | null> {
  if (roleId === 4) {
    const rows = await executeQuery<PartnerRow[]>(
      "SELECT id FROM partners WHERE user_id = ? LIMIT 1",
      [userId]
    );
    return rows.length > 0 ? rows[0].id : null;
  }

  if (roleId === 5) {
    // Primary lookup: teachers table
    const rows = await executeQuery<TeacherRow[]>(
      "SELECT partner_id FROM teachers WHERE user_id = ? LIMIT 1",
      [userId]
    );
    if (rows.length > 0) {
      return rows[0].partner_id;
    }

    // Fallback: legacy partner_teachers JSON-array bridge.
    // PG: jsonb @> ? checks whether the right-hand value is contained in the
    // left-hand jsonb. Pass userId as a JSON number literal.
    const fallbackRows = await executeQuery<PartnerRow[]>(
      "SELECT partner_id AS id FROM partner_teachers WHERE teacher_ids @> ?::jsonb LIMIT 1",
      [JSON.stringify(userId)]
    );
    return fallbackRows.length > 0 ? fallbackRows[0].id : null;
  }

  return null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const users = await executeQuery<UserRow[]>(
          "SELECT id, name, email, password, role_id FROM users WHERE email = ? AND role_id IN (4, 5) LIMIT 1",
          [email]
        );

        if (users.length === 0) return null;

        const user = users[0];
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        const schoolId = await resolveSchoolId(user.id, user.role_id);

        return {
          id: String(user.id),
          user_id: user.id,
          school_id: schoolId,
          role: roleName(user.role_id),
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.user_id = (user as any).user_id;
        token.school_id = (user as any).school_id;
        token.role = (user as any).role;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).user_id = token.user_id as number;
      (session.user as any).school_id = token.school_id as number | null;
      (session.user as any).role = token.role as string;
      session.user.name = token.name as string;
      session.user.email = token.email as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
