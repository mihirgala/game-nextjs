"use client";

import { useEffect, useState, useTransition } from "react";
import type { User } from "better-auth";
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  findUsers,
} from "@/app/actions/friends";
import { getDMs, sendDM } from "@/app/actions/messages";
import { useAtom } from "jotai";
import { socketAtom, friendsAtom, pendingRequestsAtom, sentRequestsAtom } from "@/lib/atoms";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  UserPlus,
  Clock,
  Search,
  MessageSquare,
  UserMinus,
  Check,
  X,
  ChevronLeft,
  Send,
  Gamepad,
  Target,
  Grid3X3
} from "lucide-react";
import { nanoid } from "nanoid";

interface FriendListProps {
  user: User;
}

export function FriendList({ user }: FriendListProps) {
  const [subTab, setSubTab] = useState("friends");
  const [friends, setFriends] = useAtom(friendsAtom);
  const [pending, setPending] = useAtom(pendingRequestsAtom);
  const [sent, setSent] = useAtom(sentRequestsAtom);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();
  const [dmTarget, setDmTarget] = useState<any | null>(null);
  const [dmMessages, setDmMessages] = useState<any[]>([]);
  const [dmInput, setDmInput] = useState("");
  const [socket] = useAtom(socketAtom);

  const activeFriend = friends.find(f => f.friend.id === dmTarget?.id)?.friend;
  const currentDmTarget = activeFriend || dmTarget;

  useEffect(() => {
    if (!socket) return;
    const handleReceiveDM = (msg: any) => {
      if (dmTarget && msg.senderId === dmTarget.id) {
        setDmMessages((prev) => [...prev, msg]);
      } else {
        toast.info(`New message from ${msg.senderName}`, { duration: 10000 });
      }
    };
    socket.on("dm:receive", handleReceiveDM);
    return () => { socket.off("dm:receive", handleReceiveDM); };
  }, [socket, dmTarget]);

  const handleSearch = () => {
    startTransition(async () => {
      const results = await findUsers(searchQuery);
      setSearchResults(results);
    });
  };

  const handleSendRequest = (toId: string) => {
    toast.promise(sendFriendRequest(toId), {
      loading: "Sending request...",
      success: (res: any) => {
        if (res.error) throw new Error(res.error);
        setSent((prev) => [...prev, res.request]);
        setSearchResults((prev) => prev.filter((u) => u.id !== toId));
        if (socket) (socket as any).emit("social:refresh", { userId: toId });
        return "Request sent!";
      },
      error: (err) => err.message,
      duration: 10000
    });
  };

  const handleAccept = (requestId: string, from: any) => {
    toast.promise(acceptFriendRequest(requestId), {
      loading: "Accepting invitation...",
      success: (res: any) => {
        if (res.error) throw new Error(res.error);
        setPending((prev) => prev.filter((r) => r.id !== requestId));
        setFriends((prev) => [...prev, { id: requestId, friend: from, createdAt: new Date().toISOString() }]);
        if (socket) (socket as any).emit("social:refresh", { userId: from.id });
        return `You are now friends with ${from.name}!`;
      },
      error: (err) => err.message,
      duration: 10000
    });
  };

  const handleReject = (requestId: string) => {
    toast.promise(rejectFriendRequest(requestId), {
      loading: "Rejecting request...",
      success: (res: any) => {
        if (res.error) throw new Error(res.error);
        setPending((prev) => prev.filter((r) => r.id !== requestId));
        return "Invitation declined.";
      },
      error: (err) => err.message,
      duration: 10000
    });
  };

  const handleRemove = (friendId: string, name: string) => {
    toast.promise(removeFriend(friendId), {
      loading: "Removing friend...",
      success: (res: any) => {
        if (res.error) throw new Error(res.error);
        setFriends((prev) => prev.filter((fr) => fr.friend.id !== friendId));
        return `${name} removed from friends.`;
      },
      error: (err) => err.message,
      duration: 10000
    });
  };

  const openDM = async (friend: any) => {
    setDmTarget(friend);
    const msgs = await getDMs(friend.id);
    setDmMessages(msgs as any[]);
  };

  const handleSendDM = async () => {
    if (!dmInput.trim() || !currentDmTarget) return;
    const text = dmInput.trim();
    setDmInput("");
    const msg = await sendDM(currentDmTarget.id, text);
    setDmMessages((prev) => [...prev, msg as any]);
    if (socket) {
      (socket as any).emit("dm:message", { ...msg, receiverId: currentDmTarget.id });
    }
  };

  const handleInvite = (friendId: string, friendName: string, game: 'ludo' | 'tictactoe') => {
    if (!socket) return;
    const roomId = nanoid(6).toUpperCase();
    (socket as any).emit("game:invite", {
      fromId: user.id,
      fromName: user.name,
      toId: friendId,
      game,
      roomId
    });
    toast.success(`Invite sent to ${friendName} for ${game.toUpperCase()}!`, {
      description: `Room ID: ${roomId}`
    });
  };

  if (currentDmTarget) {
    return (
      <Card className="flex flex-col h-[600px] animate-in slide-in-from-right duration-300 border-primary/10">
        <CardHeader className="flex flex-row items-center gap-4 py-3 border-b shrink-0 bg-muted/20">
          <Button variant="ghost" size="icon" onClick={() => setDmTarget(null)} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-8 w-8 border">
            <AvatarImage src={currentDmTarget.image ?? ""} />
            <AvatarFallback>{currentDmTarget.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-bold truncate">{currentDmTarget.name}</CardTitle>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`w-1.5 h-1.5 rounded-full ${currentDmTarget.isOnline ? "bg-primary" : "bg-muted-foreground/30"}`} />
              {currentDmTarget.isOnline ? "Online" : "Offline"}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full p-4 bg-muted/5">
            <div className="space-y-4">
              {dmMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground/50 gap-2">
                  <MessageSquare className="w-10 h-10 opacity-20" />
                  <p className="text-sm">No messages yet. Say hi!</p>
                </div>
              )}
              {dmMessages.map((m, i) => {
                const isMe = m.senderId === user.id;
                return (
                  <div key={m.id ?? i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm shadow-sm ${isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border text-foreground rounded-tl-none"}`}>
                      {m.text}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="p-4 border-t bg-card shrink-0">
          <form onSubmit={(e) => { e.preventDefault(); handleSendDM(); }} className="flex w-full gap-2">
            <Input
              placeholder="Message..."
              value={dmInput}
              onChange={(e) => setDmInput(e.target.value)}
              className="flex-1 bg-muted/50 border-none h-10 ring-offset-background"
            />
            <Button size="icon" className="h-10 w-10 shadow-sm transition-transform active:scale-90" disabled={!dmInput.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
        <div className="flex items-center justify-between gap-4 mb-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="friends" className="gap-2">
              <Users className="h-3.5 w-3.5" />
              <span>Friends</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-2 relative">
              <Clock className="h-3.5 w-3.5" />
              <span>Pending</span>
              {pending.length > 0 && (
                <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary">
                  {pending.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="find" className="gap-2">
              <Search className="h-3.5 w-3.5" />
              <span>Discover</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="friends" className="mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {friends.length === 0 && (
              <Card className="col-span-full border-dashed p-12 text-center text-muted-foreground flex flex-col items-center gap-3 bg-muted/5">
                <Users className="w-12 h-12 opacity-10" />
                <p className="text-sm">Your friends list is currently empty.</p>
                <Button variant="outline" size="sm" onClick={() => setSubTab("find")} className="mt-2">
                  Find Players
                </Button>
              </Card>
            )}
            {friends.map((f) => (
              <Card key={f.id} className="transition-all hover:border-primary/20 hover:shadow-sm bg-card group">
                <CardHeader className="p-4 flex flex-row items-center gap-4 space-y-0">
                  <div className="relative">
                    <Avatar className="h-10 w-10 border-2 transition-transform group-hover:scale-105">
                      <AvatarImage src={f.friend.image ?? ""} />
                      <AvatarFallback>{f.friend.name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background ${f.friend.isOnline ? "bg-primary" : "bg-muted-foreground/30"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-bold truncate">{f.friend.name}</CardTitle>
                    <CardDescription className="text-xs truncate">{f.friend.email}</CardDescription>
                  </div>
                </CardHeader>
                <CardFooter className="p-4 pt-0 flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1 h-8 text-[10px] font-bold uppercase tracking-tight" onClick={() => openDM(f.friend)}>
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                    Chat
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-[10px] font-bold uppercase tracking-tight" disabled={!f.friend.isOnline}>
                        <Gamepad className="h-3.5 w-3.5 mr-1.5" />
                        Invite
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Select Game</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleInvite(f.friend.id, f.friend.name, 'ludo')} className="gap-2 cursor-pointer">
                        <Target className="w-4 h-4 text-red-500" />
                        <span className="font-bold">Ludo Arena</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleInvite(f.friend.id, f.friend.name, 'tictactoe')} className="gap-2 cursor-pointer">
                        <Grid3X3 className="w-4 h-4 text-blue-500" />
                        <span className="font-bold">Tic Tac Toe</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors" onClick={() => handleRemove(f.friend.id, f.friend.name)}>
                    <UserMinus className="h-3.5 w-3.5" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="mt-0">
          <div className="space-y-6">
            {pending.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Invitations</h3>
                {pending.map((r) => (
                  <Card key={r.id}>
                    <CardHeader className="p-4 flex flex-row items-center gap-4 space-y-0">
                      <Avatar className="h-10 w-10 border">
                        <AvatarImage src={r.from.image ?? ""} />
                        <AvatarFallback>{r.from.name?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-bold truncate">{r.from.name}</CardTitle>
                        <CardDescription className="text-xs">Wants to be friends</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button size="icon" className="h-8 w-8 rounded-full shadow-md bg-primary hover:scale-105 transition-transform" onClick={() => handleAccept(r.id, r.from)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleReject(r.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}

            {sent.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Outgoing</h3>
                {sent.map((r) => (
                  <Card key={r.id} className="opacity-70 bg-muted/20 border-dashed">
                    <CardHeader className="p-4 flex flex-row items-center gap-4 space-y-0">
                      <Avatar className="h-10 w-10 border border-dashed">
                        <AvatarImage src={r.to.image ?? ""} />
                        <AvatarFallback>{r.to.name?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-bold truncate">{r.to.name}</CardTitle>
                        <CardDescription className="text-xs">Request pending</CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}

            {pending.length === 0 && sent.length === 0 && (
              <Card className="border-dashed p-12 text-center text-muted-foreground flex flex-col items-center gap-3 bg-muted/5">
                <Clock className="w-12 h-12 opacity-10" />
                <p className="text-sm">No pending friend requests.</p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="find" className="mt-0 space-y-6">
          <Card className="border-primary/10 shadow-sm bg-muted/10">
            <CardContent className="p-4 flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 bg-background border-primary/20"
                />
              </div>
              <Button onClick={handleSearch} disabled={isPending || searchQuery.length < 2} className="font-bold">
                Search
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {searchResults.map((u) => {
              const isAlreadyFriend = friends.some((f) => f.friend.id === u.id);
              const hasSentRequest = sent.some((s) => s.to.id === u.id);
              return (
                <Card key={u.id} className="bg-card">
                  <CardHeader className="p-4 flex flex-row items-center gap-4 space-y-0">
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage src={u.image ?? ""} />
                      <AvatarFallback>{u.name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-bold truncate">{u.name}</CardTitle>
                      <CardDescription className="text-xs truncate">{u.email}</CardDescription>
                    </div>
                    {isAlreadyFriend ? (
                      <Badge variant="secondary" className="gap-1.5 font-bold">
                        <Check className="h-3 w-3" /> Friends
                      </Badge>
                    ) : hasSentRequest ? (
                      <Badge variant="outline" className="font-bold">Pending</Badge>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => handleSendRequest(u.id)} disabled={isPending} className="font-bold text-[10px] uppercase">
                        <UserPlus className="h-3.5 w-3.5 mr-2" />
                        Add
                      </Button>
                    )}
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
