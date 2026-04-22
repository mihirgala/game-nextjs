"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAtom } from "jotai";
import { socketAtom } from "@/lib/atoms";
import { TicTacToeBoard } from "@/components/game/tictactoe/board";
import { LocalTicTacToe } from "@/components/game/tictactoe/local-game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Trophy,
  Users,
  MessageSquare,
  RefreshCw,
  ArrowLeft,
  Send,
  Bot,
  Gamepad2,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  Monitor
} from "lucide-react";
import { nanoid } from "nanoid";
import { saveMatchResult } from "@/app/actions/history";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { friendsAtom } from "@/lib/atoms";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// --- Types ---
interface GameState {
  id: string;
  players: { userId: string; name: string; symbol: "X" | "O"; image?: string | null }[];
  board: (string | null)[];
  turnIndex: number;
  isGameOver: boolean;
  winnerId: string | null;
  rematchVotes: string[];
  isBotMatch: boolean;
  difficulty?: "easy" | "medium" | "hard";
  starterIndex: number;
}

interface RoomMessage {
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

function TicTacToeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [socket] = useAtom(socketAtom);
  const { data: session } = authClient.useSession();
  const user = session?.user;

  // Local State
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [friends] = useAtom(friendsAtom);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const roomId = searchParams.get("roomId");
  const isLocal = searchParams.get("local") === "true";

  const inviteFriend = (friendId: string, name: string) => {
    if (!socket) return;
    const newRoomId = nanoid(10);
    socket.emit("game:invite", {
      fromId: user!.id,
      fromName: user!.name!,
      toId: friendId,
      game: "tictactoe",
      roomId: newRoomId
    });
    toast.success(`Invite sent to ${name}!`, { duration: 10000 });
    setIsInviteModalOpen(false);
    router.push(`/game/tictactoe?roomId=${newRoomId}&create=true`);
  };

  const lastInitializedRoomRef = useRef<string | null>(null);

  useEffect(() => {
    if (!socket || !roomId || !user || isLocal) return;

    if (lastInitializedRoomRef.current !== roomId) {
      setGameState(null);
      setMessages([]);
      setValidationError(null);
      lastInitializedRoomRef.current = roomId;
    }

    setIsValidating(true);

    const isBot = searchParams.get("isBot") === "true";
    const difficulty = searchParams.get("difficulty");
    const allowCreate = searchParams.get("create") === "true" || isBot;

    socket.emit("room:validate", { roomId, allowCreate }, (res: { valid: boolean; error?: string }) => {
      setIsValidating(false);
      if (!res.valid) {
        setValidationError(res.error || "Room is invalid or has expired.");
        return;
      }

      socket.emit("game:join", {
        roomId,
        game: "tictactoe",
        isBot,
        difficulty,
        userImage: user.image
      });
    });

    const handleState = (state: GameState) => {
      setGameState(state);
      if (state.isGameOver) {
        const players = state.players.map(p => ({
          userId: p.userId === "bot" ? null : p.userId,
          isBot: p.userId === "bot",
          isWinner: state.winnerId === p.userId,
          score: state.winnerId === p.userId ? 10 : 0
        }));
        saveMatchResult({ game: "tictactoe", players }).catch(console.error);
      }
    };

    const handleMessage = (msg: RoomMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("game:state", handleState);
    socket.on("game:room-message", handleMessage);

    return () => {
      socket.off("game:state", handleState);
      socket.off("game:room-message", handleMessage);
    };
  }, [socket, roomId, user?.id, isLocal]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const makeMove = (index: number) => {
    if (!socket || !roomId) return;
    socket.emit("game:move", { roomId, index });
  };

  const requestRematch = () => {
    if (!socket || !roomId) return;
    socket.emit("game:rematch", { roomId });
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket || !roomId) return;
    socket.emit("game:room-message", { roomId, text: chatInput.trim() });
    setChatInput("");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectMode = (mode: string, difficulty?: string) => {
    const newRoomId = nanoid(10);
    if (mode === "bot" && difficulty) {
      router.push(`/game/tictactoe?roomId=${newRoomId}&isBot=true&difficulty=${difficulty}&create=true`);
    } else if (mode === "local") {
      router.push(`/game/tictactoe?local=true`);
    } else {
      router.push(`/game/tictactoe?roomId=${newRoomId}&create=true`);
    }
  };

  if (!user) return null;

  if (isLocal) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <LocalTicTacToe />
      </div>
    );
  }

  if (!roomId) {
    return (
      <div className="p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center mb-16 space-y-6">
          <Badge variant="outline" className="px-4 py-1.5 uppercase tracking-[0.2em] text-primary border-primary/20 bg-primary/5 font-black">
            Arcade Edition
          </Badge>
          <h1 className="text-6xl font-black tracking-tighter flex items-center justify-center gap-4">
            TIC TAC TOE
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-medium">
            Challenge your friends locally, compete in real-time online duels, or sharpen your skills against our advanced AI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Local Mode */}
          <Card className="relative overflow-hidden group border-primary/10 hover:border-primary/30 transition-all hover:shadow-2xl bg-card">
            <CardHeader className="pb-8">
              <div className="bg-orange-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                <Monitor className="w-7 h-7 text-orange-500" />
              </div>
              <CardTitle className="text-2xl font-black uppercase">Local Duel</CardTitle>
              <CardDescription className="font-bold uppercase text-[10px] tracking-widest opacity-60">One Screen</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => selectMode("local")} className="w-full h-14 font-black text-base shadow-lg shadow-orange-500/10" variant="secondary">
                PLAY LOCALLY
              </Button>
            </CardContent>
          </Card>

          {/* AI Mode */}
          <Card className="relative overflow-hidden group border-primary/10 hover:border-primary/30 transition-all hover:shadow-2xl bg-card">
            <CardHeader className="pb-8">
              <div className="bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                <Bot className="w-7 h-7 text-primary" />
              </div>
              <CardTitle className="text-2xl font-black uppercase">Training</CardTitle>
              <CardDescription className="font-bold uppercase text-[10px] tracking-widest opacity-60">Vs Neural Net</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={() => selectMode("bot", "easy")} variant="outline" className="w-full justify-between h-12 font-bold group/btn">
                <span>EASY</span>
                <Badge variant="secondary" className="opacity-0 group-hover/btn:opacity-100 transition-opacity">BOT</Badge>
              </Button>
              <Button onClick={() => selectMode("bot", "medium")} variant="outline" className="w-full justify-between h-12 font-bold group/btn">
                <span>PRO</span>
              </Button>
              <Button onClick={() => selectMode("bot", "hard")} className="w-full h-12 font-black shadow-lg shadow-primary/10">
                GRANDMASTER
              </Button>
            </CardContent>
          </Card>

          {/* Online Mode */}
          <Card className="relative overflow-hidden group border-primary/10 hover:border-primary/30 transition-all hover:shadow-2xl bg-card">
            <CardHeader className="pb-8">
              <div className="bg-emerald-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-emerald-500" />
              </div>
              <CardTitle className="text-2xl font-black uppercase">Online</CardTitle>
              <CardDescription className="font-bold uppercase text-[10px] tracking-widest opacity-60">Global Arena</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                <Input
                  placeholder="ROOM CODE"
                  className="h-12 bg-muted/50 font-black tracking-[0.2em] text-center text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const code = (e.target as HTMLInputElement).value.trim();
                      if (code) router.push(`/game/tictactoe?roomId=${code.toUpperCase()}&create=true`);
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => setIsInviteModalOpen(true)} variant="secondary" className="h-12 font-bold text-[10px] uppercase">
                  INVITE
                </Button>
                <Button onClick={() => {
                  const id = nanoid(10).toUpperCase();
                  if (socket) {
                    const inviteMsg = {
                      senderId: user.id,
                      senderName: user.name ?? "Unknown",
                      text: `🎮 Join my Tic Tac Toe arena! ⚔️`,
                      createdAt: new Date().toISOString(),
                      invite: { game: "tictactoe", roomId: id }
                    };
                    socket.emit("lobby:broadcast", inviteMsg);
                    router.push(`/game/tictactoe?roomId=${id}&create=true`);
                  }
                }} variant="outline" className="h-12 font-bold text-[10px] uppercase border-primary/20">
                  BROADCAST
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invite Friends Modal */}
        <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-black uppercase tracking-tighter">
                Invite Friends
              </DialogTitle>
              <DialogDescription className="font-medium">
                Challenge an online friend to a high-stakes duel.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {friends.length === 0 && (
                  <div className="text-center py-12 opacity-30">
                    <p className="text-xs font-bold uppercase">No Friends Online</p>
                  </div>
                )}
                {friends.map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border">
                        <AvatarImage src={f.friend.image ?? ""} />
                        <AvatarFallback>{f.friend.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold truncate max-w-[140px]">{f.friend.name}</span>
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{f.friend.isOnline ? "Online" : "Offline"}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="h-8 font-black uppercase text-[10px]"
                      disabled={!f.friend.isOnline}
                      onClick={() => inviteFriend(f.friend.id, f.friend.name)}
                    >
                      INVITE
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // --- Real Match Flow ---
  if (isValidating || validationError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in duration-500">
        <div className={`w-20 h-20 rounded-full border-4 border-dashed ${validationError ? "border-destructive animate-none" : "border-primary animate-spin"}`} />
        <div className="space-y-2 text-center max-w-sm">
          <h2 className="text-2xl font-black uppercase tracking-tighter">
            {isValidating ? "Validating" : "Entry Denied"}
          </h2>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
            {isValidating
              ? "STABILIZING REALITY..."
              : validationError}
          </p>
          {validationError && (
            <Button onClick={() => router.push("/game/tictactoe")} className="mt-4 font-black uppercase" variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" /> Return to Lobby
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-pulse">
        <div className="w-20 h-20 rounded-full border-4 border-dashed border-primary animate-spin" />
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-black uppercase tracking-tighter">Initializing Arena</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Connecting to server</p>
        </div>
      </div>
    );
  }

  // --- Derived State ---
  const myPlayer = gameState?.players.find(p => p.userId === user.id);
  const opponent = gameState?.players.find(p => p.userId !== user.id);
  const isMyTurn = gameState && myPlayer && gameState.players[gameState.turnIndex].userId === user.id;
  const gameFull = !!gameState && (gameState.players.length === 2 || gameState.isBotMatch);

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-12">
        <Button variant="ghost" onClick={() => router.push("/game/tictactoe")} className="gap-2 -ml-2 font-black uppercase tracking-widest text-xs hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Quit Match
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-9 px-6 rounded-xl border-primary/20 text-xs font-black bg-primary/5 uppercase tracking-[0.2em]">
            ROOM: {roomId}
          </Badge>
          <Button size="icon" variant="outline" className="h-9 w-9 rounded-xl border-primary/20" onClick={copyLink}>
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12 h-fit lg:h-[750px] items-start">
        {/* Game Area */}
        <div className="flex flex-col gap-8">
          {/* Player Display */}
          <div className="grid grid-cols-2 gap-6">
            <Card className={`relative overflow-hidden border-2 transition-all duration-500 ${isMyTurn ? "border-primary shadow-2xl shadow-primary/10" : "border-border/50 opacity-40 scale-95"}`}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-sm">
                    <AvatarImage src={user.image ?? ""} />
                    <AvatarFallback>{user.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  {isMyTurn && <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-ping" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black truncate text-sm uppercase">{user.name}</span>
                    <Badge className="h-5 px-1.5 text-[10px] font-black bg-primary">X</Badge>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">Team You</span>
                </div>
              </CardContent>
            </Card>

            <Card className={`relative overflow-hidden border-2 transition-all duration-500 ${!isMyTurn && gameFull && !gameState?.isGameOver ? "border-emerald-500 shadow-2xl shadow-emerald-500/10" : "border-border/50 opacity-40 scale-95"}`}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-12 w-12 border-2 border-emerald-500/20 shadow-sm">
                    {gameState?.isBotMatch ? (
                      <AvatarFallback className="bg-muted text-foreground"><Bot className="w-6 h-6" /></AvatarFallback>
                    ) : (
                      <>
                        <AvatarImage src={opponent?.image ?? ""} />
                        <AvatarFallback>{opponent?.name?.charAt(0) || "U"}</AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  {!isMyTurn && gameFull && !gameState?.isGameOver && <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black truncate text-sm uppercase">
                      {gameState?.isBotMatch
                        ? `AI (${gameState.difficulty?.toUpperCase()})`
                        : opponent?.name || "WAITING"}
                    </span>
                    <Badge className="h-5 px-1.5 text-[10px] font-black bg-emerald-500 text-white border-none">O</Badge>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/70">Opponent</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Game Board */}
          <div className="relative flex-1 bg-muted/5 rounded-[40px] border-4 border-muted/20 p-12 flex items-center justify-center min-h-[500px] shadow-inner">
            {!gameFull ? (
              <div className="flex flex-col items-center gap-8 animate-pulse text-center max-w-sm">
                <div className="w-24 h-24 rounded-[30px] border-4 border-dashed border-primary animate-spin" />
                <div className="space-y-3">
                  <h2 className="text-3xl font-black uppercase tracking-tighter">Finding Opponent</h2>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
                    Challenge the world or share your room code with a partner.
                  </p>
                </div>
                <Button variant="outline" className="h-12 px-8 font-black uppercase tracking-widest text-[10px] border-primary/20 shadow-lg" onClick={copyLink}>
                  <Copy className="w-4 h-4 mr-2" /> {copied ? "LINK COPIED" : "COPY INVITE LINK"}
                </Button>
              </div>
            ) : (
              <div className="w-full">
                <TicTacToeBoard
                  board={gameState?.board || Array(9).fill(null)}
                  onMove={makeMove}
                  disabled={!isMyTurn || gameState?.isGameOver}
                />

                {/* Game Over Overlay */}
                {gameState?.isGameOver && (
                  <div className="absolute inset-0 z-30 bg-background/40 backdrop-blur-xl rounded-[40px] flex items-center justify-center p-8 animate-in fade-in duration-500">
                    <Card className="w-full max-w-md border-4 border-primary shadow-[20px_20px_0px_0px_rgba(var(--primary),0.1)] animate-in zoom-in-95 duration-500">
                      <CardHeader className="text-center pb-6">
                        <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl",
                          gameState.winnerId === user.id ? "bg-yellow-500 text-white" : "bg-muted text-muted-foreground")}>
                          <Trophy className="w-10 h-10" />
                        </div>
                        <CardTitle className="text-5xl font-black tracking-tighter uppercase mb-2">
                          {gameState.winnerId === user.id ? "VICTORY!" : gameState.winnerId === "draw" ? "STALEMATE" : "DEFEAT"}
                        </CardTitle>
                        <CardDescription className="text-xs font-black uppercase tracking-widest opacity-60">
                          {gameState.winnerId === user.id ? "Absolute Masterclass." : "Tactical Standstill."}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className="flex flex-col gap-4 pt-6 pb-10 px-10">
                        <Button
                          className="w-full h-14 gap-3 text-lg font-black uppercase tracking-widest shadow-2xl shadow-primary/20"
                          onClick={requestRematch}
                          disabled={gameState.rematchVotes.includes(user.id)}
                        >
                          <RefreshCw className={cn("w-5 h-5", gameState.rematchVotes.includes(user.id) ? "animate-spin" : "")} />
                          {gameState.rematchVotes.includes(user.id) ? "WAITING..." : "REMATCH"}
                        </Button>
                        <Button variant="ghost" className="w-full font-black uppercase tracking-widest text-[10px] opacity-50 hover:opacity-100" onClick={() => router.push("/game/tictactoe")}>
                          EXIT TO LOBBY
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col h-full gap-6 min-h-[500px]">
          <Tabs defaultValue={gameState?.isBotMatch ? "info" : "chat"} className="flex-1 flex flex-col">
            <TabsList className="bg-muted/50 p-1 rounded-xl">
              {!gameState?.isBotMatch && (
                <TabsTrigger value="chat" className="gap-2 font-black uppercase text-[10px] tracking-widest">
                  <MessageSquare className="w-3.5 h-3.5" /> CHAT
                </TabsTrigger>
              )}
              <TabsTrigger value="info" className="gap-2 font-black uppercase text-[10px] tracking-widest">
                <AlertCircle className="w-3.5 h-3.5" /> RULES
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 mt-0 pt-6 flex flex-col gap-4 overflow-hidden">
              <Card className="flex-1 flex flex-col border-2 border-muted/50 shadow-none bg-card rounded-[30px] overflow-hidden">
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-6">
                    {messages.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 opacity-10 gap-4">
                        <MessageSquare className="w-12 h-12" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Comm-Link Active</p>
                      </div>
                    )}
                    {messages.map((m, i) => {
                      const isMe = m.senderId === user.id;
                      return (
                        <div key={i} className={`flex flex-col gap-1.5 ${isMe ? "items-end" : "items-start"}`}>
                          <span className="text-[10px] font-black uppercase text-muted-foreground opacity-50 px-1 tracking-widest">
                            {m.senderName}
                          </span>
                          <div className={`px-5 py-2.5 rounded-2xl text-xs font-medium max-w-[85%] shadow-sm ${isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted text-foreground rounded-tl-none border border-border/50"}`}>
                            {m.text}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>
                <CardFooter className="p-4 bg-muted/20 border-t">
                  <form onSubmit={sendMessage} className="flex w-full gap-3">
                    <Input
                      placeholder="SEND MESSAGE..."
                      className="h-11 bg-background border-2 border-transparent focus-visible:border-primary/20 font-bold text-xs rounded-xl pl-5"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                    />
                    <Button size="icon" className="h-11 w-11 shrink-0 rounded-xl shadow-xl transition-transform active:scale-90">
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="info" className="flex-1 mt-0 pt-6">
              <Card className="bg-card border-2 border-muted/50 rounded-[30px] p-8">
                <CardHeader className="p-0 mb-8">
                  <CardTitle className="text-xl font-black uppercase tracking-tighter">Tactical Briefing</CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-6 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80 leading-relaxed">
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/30">
                    <Badge className="h-6 w-6 p-0 justify-center shrink-0 font-black">01</Badge>
                    <p>Capture three cells in a row (horizontal, vertical, or diagonal) to win the duel.</p>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/30">
                    <Badge className="h-6 w-6 p-0 justify-center shrink-0 font-black">02</Badge>
                    <p>Player X (Host) initiates the opening move in the first engagement.</p>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/30">
                    <Badge className="h-6 w-6 p-0 justify-center shrink-0 font-black">03</Badge>
                    <p>rematches toggle starting initiative for competitive balance.</p>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/30">
                    <Badge className="h-6 w-6 p-0 justify-center shrink-0 font-black">04</Badge>
                    <p>All engagement data is logged for historical performance analysis.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default function TicTacToePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground font-black uppercase tracking-[0.2em]">
        Initializing Arena...
      </div>
    }>
      <TicTacToeContent />
    </Suspense>
  );
}
