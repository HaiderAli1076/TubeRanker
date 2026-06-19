import { PrismaAdapter } from "@auth/prisma-adapter";
import type { AuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { env } from "./env";
import { prisma } from "./prisma";
import { logger } from "./logger";

interface ExtendedJWT extends JWT {
  accessToken?: string;
  accessTokenExpires?: number;
  refreshToken?: string;
  userId?: string;
  error?: string;
}

async function refreshAccessToken(token: ExtendedJWT): Promise<ExtendedJWT> {
  try {
    const url = "https://oauth2.googleapis.com/token";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken ?? "",
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    logger.info("Successfully rotated Google OAuth token", { userId: token.userId });

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    logger.error("Failed to rotate Google OAuth token", { error, userId: token.userId });

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    ...(process.env.NODE_ENV === "development"
      ? [
          CredentialsProvider({
            name: "Mock Developer Account",
            credentials: {},
            async authorize() {
              const devEmail = "developer@tuberank.com";
              let user = await prisma.user.findUnique({
                where: { email: devEmail },
              });
              if (!user) {
                user = await prisma.user.create({
                  data: {
                    id: "dev-user-id",
                    email: devEmail,
                    name: "Developer",
                    credits: 9999,
                  },
                });
              }
              return {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image ?? "https://lh3.googleusercontent.com/a/default-user",
              };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account && user) {
        return {
          accessToken: account.access_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000,
          refreshToken: account.refresh_token,
          userId: user.id,
          email: user.email,
          name: user.name,
          picture: user.image,
        };
      }

      const extendedToken = token as ExtendedJWT;
      if (!extendedToken.refreshToken) {
        return token;
      }

      if (Date.now() < (extendedToken.accessTokenExpires ?? 0)) {
        return token;
      }

      return refreshAccessToken(extendedToken);
    },
    async session({ session, token }) {
      const extendedToken = token as ExtendedJWT;
      if (extendedToken && session.user) {
        session.user = {
          ...session.user,
          id: extendedToken.userId ?? "",
          name: extendedToken.name ?? "",
          email: extendedToken.email ?? "",
          image: extendedToken.picture ?? "",
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session as any).accessToken = extendedToken.accessToken;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session as any).error = extendedToken.error;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: env.NEXTAUTH_SECRET,
};
export default authOptions;
