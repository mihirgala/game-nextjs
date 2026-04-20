import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";

import { SocketProvider } from "@/components/providers/socket-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header user={session.user} />
      <main className="flex-1">
        <SocketProvider user={session.user}>
          {children}
        </SocketProvider>
      </main>
    </div>
  );
}
