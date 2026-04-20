"use client";

import { useState, useEffect } from "react";
import { useSetAtom, useAtom } from "jotai";
import { dashboardTabAtom, friendsAtom, pendingRequestsAtom, sentRequestsAtom, socketAtom } from "@/lib/atoms";
// import { io } from "socket.io-client";

import { GamePicker } from "@/components/home/game-picker";
import { GlobalChat } from "@/components/home/global-chat";
import { FriendList } from "@/components/home/friend-list";
import { GameHistory } from "@/components/home/game-history";
import type { User } from "better-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Users, History, Gamepad2 } from "lucide-react";

import { useRouter } from "next/navigation";
// import { toast } from "sonner";
// import {
//   getFriends,
//   getPendingRequests
// } from "@/app/actions/friends";

type Tab = "games" | "chat" | "friends" | "history";

interface HomePageProps {
  user: User;
  initialFriends: any[];
  initialPending: { received: any[]; sent: any[] };
  initialHistory: any[];
}

export function HomePage({ user, initialFriends, initialPending, initialHistory }: HomePageProps) {
  const [activeTab] = useAtom(dashboardTabAtom);
  const setFriends = useSetAtom(friendsAtom);
  const [pending, setPending] = useAtom(pendingRequestsAtom);
  const setSent = useSetAtom(sentRequestsAtom);

  useEffect(() => {
    setFriends(initialFriends as never);
    setPending(initialPending.received as never);
    setSent(initialPending.sent as never);
  }, [initialFriends, initialPending.received, initialPending.sent, setFriends, setPending, setSent]);

  return (
    <div className="flex flex-col max-w-7xl mx-auto">
      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <Tabs value={activeTab} className="w-full space-y-8">
          <TabsContent value="games" className="mt-0">
            <GamePicker user={user} />
          </TabsContent>

          <TabsContent value="chat" className="mt-0">
            <GlobalChat user={user} />
          </TabsContent>

          <TabsContent value="social" className="mt-0">
            <FriendList user={user} />
          </TabsContent>

          <TabsContent value="records" className="mt-0">
            <GameHistory initialHistory={initialHistory} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
