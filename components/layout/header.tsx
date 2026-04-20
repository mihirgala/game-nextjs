"use client";

import { LogOut, Gamepad2, MessageSquare, Users, History, LayoutDashboard } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { signOut } from "@/lib/auth-client";
import type { User } from "better-auth";
import { useAtom } from "jotai";
import { dashboardTabAtom, type DashboardTab } from "@/lib/atoms";
import { useRouter, usePathname } from "next/navigation";

export function Header({ user }: { user: User }) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useAtom(dashboardTabAtom);

  const navItems: { id: DashboardTab; label: string; icon: any }[] = [
    { id: "games", label: "Play", icon: Gamepad2 },
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "social", label: "Social", icon: Users },
    { id: "records", label: "Record", icon: History },
  ];

  const handleNav = (tab: DashboardTab) => {
    setActiveTab(tab);
    if (pathname !== "/") {
      router.push("/");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleNav("games")}>
            <div className="bg-primary p-1.5 rounded-lg shadow-md shadow-primary/20">
              <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight hidden sm:inline-block">
              Game<span className="text-primary">Hub</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id && pathname === "/";
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
                    ${isActive 
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <ModeToggle />
          
          <div className="flex items-center gap-3 pl-4 border-l">
            <div className="hidden lg:flex flex-col items-end mr-1">
              <span className="text-sm font-semibold leading-tight">{user.name}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Online</span>
            </div>
            <Avatar className="h-9 w-9 border-2 border-primary/10">
              <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
              <AvatarFallback className="bg-primary/5">{user.name?.charAt(0) || user.email?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/login"; } } })}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
