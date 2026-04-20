"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAtom, useSetAtom } from "jotai";
import { globalChatAtom, socketAtom, type ChatMessage } from "@/lib/atoms";
import { io } from "socket.io-client";
import type { User } from "better-auth";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Globe, MessageSquare, Gamepad2 } from "lucide-react";
import { toast } from "sonner";

interface GlobalChatProps {
  user: User;
}

export function GlobalChat({ user }: GlobalChatProps) {
  const router = useRouter();
  const setMessages = useSetAtom(globalChatAtom);
  const [socket] = useAtom(socketAtom);
  const [messages] = useAtom(globalChatAtom);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!socket) return;
    setConnected(socket.connected);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onHistory = (history: ChatMessage[]) => setMessages(history);
    const onMessage = (msg: ChatMessage) => setMessages((prev) => [...prev, msg]);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("global:history", onHistory);
    socket.on("global:message", onMessage);

    // Initial request for history if just joined chat tab
    socket.emit("global:history:request");

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("global:history", onHistory);
      socket.off("global:message", onMessage);
    };
  }, [socket, setMessages]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const send = useCallback(() => {
    if (!input.trim() || !socket) return;
    const msg = {
      senderId: user.id,
      senderName: user.name ?? "Unknown",
      senderImage: user.image,
      text: input.trim(),
      createdAt: new Date().toISOString(),
    };
    (socket as any).emit("global:message", msg);
    setInput("");
    inputRef.current?.focus();
  }, [input, socket, user]);

  return (
    <Card className="flex flex-col h-[600px] border-primary/10 shadow-sm animate-in fade-in zoom-in-95 duration-500">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Globe className="w-4 h-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold">Global Lobby</CardTitle>
            <p className="text-xs text-muted-foreground">{messages.length} messages</p>
          </div>
        </div>
        <Badge variant={connected ? "default" : "secondary"} className="gap-1.5 h-6">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-primary-foreground animate-pulse" : "bg-muted-foreground"}`} />
          {connected ? "Live" : "Offline"}
        </Badge>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="h-full p-4">
          <div className="space-y-4 pr-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[400px] gap-4 opacity-30">
                <MessageSquare className="w-12 h-12" />
                <p className="text-sm font-medium">Be the first to say hello!</p>
              </div>
            )}
            {messages.map((msg, i) => {
              const isMe = msg.senderId === user.id;
              return (
                <div key={msg.id ?? i} className={`flex items-start gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                  <Avatar className="h-8 w-8 border shrink-0">
                    <AvatarImage src={msg.senderImage ?? ""} />
                    <AvatarFallback className="text-[10px]">{msg.senderName?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div className={`flex flex-col gap-1 max-w-[80%] ${isMe ? "items-end" : "items-start"}`}>
                    {!isMe && <span className="text-[10px] font-semibold pl-1 text-muted-foreground">{msg.senderName}</span>}
                    <div className={`px-4 py-2 rounded-2xl text-sm ${isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted text-foreground rounded-tl-none"}`}>
                      {msg.text}
                      {msg.invite && (
                        <div className="mt-3 p-3 bg-background/20 rounded-xl border border-white/10 space-y-2">
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-80">
                            <Gamepad2 className="w-3 h-3" />
                            Game Invitation
                          </div>
                          <Button
                            size="sm"
                            className="w-full h-8 bg-white text-primary hover:bg-white/90 font-bold text-[10px] shadow-sm"
                            onClick={() => {
                              if (!socket) return;
                              (socket as any).emit("room:validate", msg.invite!.roomId, (res: { valid: boolean; error?: string }) => {
                                if (res.valid) {
                                  router.push(`/game/${msg.invite!.game}?roomId=${msg.invite!.roomId}`);
                                } else {
                                  toast.error(res.error || "This game lobby has expired.", { duration: 10000 });
                                }
                              });
                            }}
                          >
                            JOIN MATCH
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="p-4 border-t">
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex w-full gap-2">
          <Input
            ref={inputRef}
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 rounded-full bg-muted border-none pl-4 h-10 ring-offset-background focus-visible:ring-1 focus-visible:ring-primary"
          />
          <Button size="icon" className="rounded-full shrink-0 h-10 w-10 shadow-md transition-transform active:scale-90" disabled={!input.trim() || !connected}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
