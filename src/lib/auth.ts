import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      email: string;
      avatar?: string | null;
    };
  }

  interface User {
    id: string;
    username: string;
    email: string;
    avatar?: string | null;
  }
}

declare module "next-auth" {
  interface JWT {
    id: string;
    username: string;
    email: string;
    avatar?: string | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        login: { label: "用户名或邮箱", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.login || !credentials?.password) {
          return null;
        }

        const login = credentials.login as string;
        const password = credentials.password as string;

        const user = await db.query.users.findFirst({
          where: eq(users.username, login),
        }) ?? await db.query.users.findFirst({
          where: eq(users.email, login),
        });

        if (!user) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.username = (user as { username: string }).username;
        token.email = user.email!;
        token.avatar = (user as { avatar?: string | null }).avatar;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.username = token.username as string;
      session.user.email = token.email as string;
      session.user.avatar = token.avatar as string | null;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
