import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await verifySession();

  if (!authed) {
    redirect("/admindashboard/login");
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
