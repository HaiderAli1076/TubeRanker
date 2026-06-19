// Updated root page – server‑side redirect based on authentication
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  // If a user is already authenticated, send them straight to the dashboard.
  if (session?.user?.id) {
    redirect("/dashboard");
  }
  // Otherwise, send them to the login page.
  redirect("/login");
}
