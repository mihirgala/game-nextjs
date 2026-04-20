"use client";

import { useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import { socketAtom, friendsAtom, pendingRequestsAtom, sentRequestsAtom } from "@/lib/atoms";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getFriends, getPendingRequests } from "@/app/actions/friends";

interface SocketProviderProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  children: React.ReactNode;
}

export function SocketProvider({ user, children }: SocketProviderProps) {
  const router = useRouter();
  const [socket, setSocket] = useAtom(socketAtom);
  const setFriends = useSetAtom(friendsAtom);
  const setPending = useSetAtom(pendingRequestsAtom);
  const setSent = useSetAtom(sentRequestsAtom);

  useEffect(() => {
    if (socket) return;

    // Fetch initial data once on mount
    const fetchInitial = async () => {
      try {
        const [newFriends, newPending] = await Promise.all([
          getFriends(),
          getPendingRequests()
        ]);
        setFriends(newFriends as any);
        setPending(newPending.received as any);
        setSent(newPending.sent as any);
      } catch (e) {
        console.error("Failed to fetch initial social data", e);
      }
    };
    fetchInitial();

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
    const s = io(socketUrl, {
      auth: { userId: user.id, userName: user.name, userImage: user.image },
      transports: ["websocket"],
    });

    s.on("connect", () => console.log("SocketProvider connected"));

    // Global Listeners
    s.on("game:invited", (payload: { fromName: string; game: string; roomId: string }) => {
      toast(`🎮 ${payload.fromName} invited you!`, {
        description: `Join them for a match of ${payload.game.toUpperCase()}`,
        duration: Infinity,
        action: {
          label: "JOIN NOW",
          onClick: () => {
            s.emit("room:validate", payload.roomId, (res: { valid: boolean; error?: string }) => {
              if (res.valid) {
                 router.push(`/game/${payload.game}?roomId=${payload.roomId}`);
              } else {
                 toast.error(res.error || "This invite has expired.", { duration: 10000 });
              }
            });
          },
        },
      });
    });

    s.on("lobby:broadcast", (msg: any) => {
      // If NOT from me, show a toast
      if (msg.senderId !== user.id) {
        toast(`🎮 ${msg.senderName} posted a game lobby!`, {
          description: `Join them for ${msg.invite.game.toUpperCase()}`,
          duration: Infinity,
          action: {
            label: "JOIN",
            onClick: () => {
              s.emit("room:validate", msg.invite.roomId, (res: { valid: boolean; error?: string }) => {
                if (res.valid) {
                   router.push(`/game/${msg.invite.game}?roomId=${msg.invite.roomId}`);
                } else {
                   toast.error(res.error || "This game lobby has expired.", { duration: 10000 });
                }
              });
            },
          },
        });
      }
    });

    s.on("global:message", (msg: any) => {
      // Logic for generic global message if needed (history is already handled in GlobalChat)
    });

    s.on("social:refresh", async () => {
      const [newFriends, newPending] = await Promise.all([
        getFriends(),
        getPendingRequests()
      ]);
      setFriends(newFriends as any);
      setPending(newPending.received as any);
      setSent(newPending.sent as any);
    });

    s.on("presence:sync", (onlineIds: string[]) => {
      setFriends((prev) => prev.map(f => ({
        ...f,
        friend: { ...f.friend, isOnline: onlineIds.includes(f.friend.id) }
      })));
    });

    s.on("presence:update", (payload: { userId: string, isOnline: boolean }) => {
      setFriends((prev) => prev.map(f => {
        if (f.friend.id === payload.userId) {
          return { ...f, friend: { ...f.friend, isOnline: payload.isOnline } };
        }
        return f;
      }));
    });

    setSocket(s as any);

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [user.id, user.name, user.image, setSocket, setFriends, setPending, setSent, router]);

  return <>{children}</>;
}
