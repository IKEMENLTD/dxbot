import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import DashboardLayout from "@/components/layout/DashboardLayout";

const COOKIE_NAME = "dxbot_session";

async function isAuthenticated(): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    // 開発環境ではスキップ
    if (process.env.NODE_ENV !== "production") {
      return true;
    }
    return false;
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);
  return !!sessionCookie?.value;
}

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAuthenticated();

  if (!authed) {
    redirect("/admindashboard/login");
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
