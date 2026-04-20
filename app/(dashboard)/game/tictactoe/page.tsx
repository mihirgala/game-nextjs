"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAtom } from "jotai";
import { socketAtom } from "@/lib/atoms";
import { TicTacToeBoard } from "@/components/game/tictactoe-board";
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
  User as UserIcon,
  Gamepad2,
  AlertCircle,
  Copy,
  Check,
  Sparkles
} from "lucide-react";
import { nanoid } from "nanoid";
import { saveMatchResult } from "@/app/actions/history";
import type { User } from "better-auth";
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

  // Socket game join and listeners
  useEffect(() => {
    if (!socket || !roomId || !user) return;

    // Reset local state only if we are actually entering a DIFFERENT room
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

    // Validate Room
    socket.emit("room:validate", { roomId, allowCreate }, (res: { valid: boolean; error?: string }) => {
      setIsValidating(false);
      if (!res.valid) {
        setValidationError(res.error || "Room is invalid or has expired.");
        toast.error(res.error || "Room validation failed.", { duration: 10000 });
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
        
        if (state.isBotMatch && !players.find(p => p.isBot)) {
           players.push({
             userId: null,
             isBot: true,
             isWinner: state.winnerId === "bot",
             score: state.winnerId === "bot" ? 10 : 0
           });
        }
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
  }, [socket, roomId, user?.id]); // Use user?.id for stability

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // -- Actions --
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
    } else {
      router.push(`/game/tictactoe?roomId=${newRoomId}&create=true`);
    }
  };

  if (!user) return null;

  // -- Splash/Selection Screen --


  // --- Gaming Screen ---
  const myPlayer = gameState?.players.find(p => p.userId === user.id);
  const opponent = gameState?.players.find(p => p.userId !== user.id);
  const isMyTurn = gameState && myPlayer && gameState.players[gameState.turnIndex].userId === user.id;
  const gameFull = !!gameState && (gameState.players.length === 2 || gameState.isBotMatch);

  // -- Entrance UI (No Room ID yet) --
  if (!roomId) {
    return (
      <div className="p-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center mb-12 space-y-4">
          <Badge variant="outline" className="px-4 py-1.5 uppercase tracking-widest text-primary border-primary/20 bg-primary/5">
            Arcade Edition
          </Badge>
          <h1 className="text-5xl font-black tracking-tight flex items-center justify-center gap-4">
            <Gamepad2 className="w-12 h-12 text-primary" />
            TIC TAC TOE
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Experience the classic game redesigned with a modern edge. Play against friends or challenge our advanced AI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* AI Mode */}
          <Card className="relative overflow-hidden group border-primary/10 hover:border-primary/30 transition-all hover:shadow-2xl hover:shadow-primary/5">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Bot className="w-32 h-32" />
            </div>
            <CardHeader>
              <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Training Mode</CardTitle>
              <CardDescription>Challenge the AI to sharpen your skills.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-2">
                <Button onClick={() => selectMode("bot", "easy")} variant="outline" className="justify-between h-14 group/btn">
                  <span className="font-semibold">Easy Mode</span>
                  <Badge variant="secondary" className="group-hover/btn:bg-primary group-hover/btn:text-primary-foreground transition-colors font-bold uppercase tracking-tighter">Random</Badge>
                </Button>
                <Button onClick={() => selectMode("bot", "medium")} variant="outline" className="justify-between h-14 group/btn">
                  <span className="font-semibold">Professional</span>
                  <Badge variant="secondary" className="group-hover/btn:bg-primary group-hover/btn:text-primary-foreground transition-colors font-bold uppercase tracking-tighter">Strategic</Badge>
                </Button>
                <Button onClick={() => selectMode("bot", "hard")} className="justify-between h-14 shadow-lg shadow-primary/20">
                  <span className="font-bold">Grandmaster</span>
                  <Badge variant="outline" className="bg-primary-foreground text-primary border-none font-bold uppercase tracking-tighter">Minimax AI</Badge>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Multiplayer Mode */}
          <Card className="relative overflow-hidden group border-primary/10 hover:border-primary/30 transition-all hover:shadow-2xl">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Users className="w-32 h-32" />
            </div>
            <CardHeader>
              <div className="bg-emerald-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-emerald-500" />
              </div>
              <CardTitle className="text-2xl font-bold">PvP Duels</CardTitle>
              <CardDescription>Enter a code or invite a friend to play.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                <Input 
                  placeholder="Enter Room Code..." 
                  className="h-12 bg-muted/50 font-mono font-bold tracking-widest text-center"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const code = (e.target as HTMLInputElement).value.trim();
                      if (code) router.push(`/game/tictactoe?roomId=${code}&create=true`);
                    }
                  }}
                />
                <Button className="h-12 px-6 shadow-md shadow-primary/20" onClick={() => {
                   const codeInput = document.querySelector('input[placeholder="Enter Room Code..."]') as HTMLInputElement;
                   if (codeInput?.value.trim()) router.push(`/game/tictactoe?roomId=${codeInput.value.trim()}&create=true`);
                   else toast.error("Please enter a room code first.");
                }}>
                  Join
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-dashed" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-4 text-muted-foreground font-bold tracking-widest">or create</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <Button onClick={() => setIsInviteModalOpen(true)} variant="secondary" className="h-12 font-bold gap-2">
                   <Users className="w-4 h-4" /> Invite Friends
                 </Button>
                 <Button onClick={() => {
                    const id = nanoid(10);
                   if (socket) {
                     const inviteMsg = {
                       senderId: user.id,
                       senderName: user.name ?? "Unknown",
                       text: `🎮 Join my Tic Tac Toe lobby! ⚔️`,
                       createdAt: new Date().toISOString(),
                       invite: { game: "tictactoe", roomId: id }
                     };
                     socket.emit("lobby:broadcast", inviteMsg);
                     router.push(`/game/tictactoe?roomId=${id}&create=true`);
                   }
                  }} variant="outline" className="h-12 font-bold gap-2 text-primary border-primary/20 hover:bg-primary/5">
                   <Sparkles className="w-4 h-4" /> Broadcast
                 </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invite Friends Modal */}
        <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Invite Friends
              </DialogTitle>
              <DialogDescription>
                Select an online friend to challenge them to a match.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {friends.length === 0 && (
                  <div className="text-center py-12 opacity-30">
                    <p className="text-xs font-bold uppercase">No Friends Found</p>
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
                        <div className="flex items-center gap-1.5">
                           <span className={`w-1.5 h-1.5 rounded-full ${f.friend.isOnline ? "bg-primary" : "bg-muted-foreground/30"}`} />
                           <span className="text-[10px] text-muted-foreground font-medium">{f.friend.isOnline ? "Online" : "Offline"}</span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="h-8 font-bold" 
                      disabled={!f.friend.isOnline}
                      onClick={() => inviteFriend(f.friend.id, f.friend.name)}
                    >
                      Invite
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
           <h2 className="text-2xl font-bold tracking-tight">
             {isValidating ? "Validating Room..." : "Entry Denied"}
           </h2>
           <p className="text-sm text-muted-foreground whitespace-pre-wrap">
             {isValidating 
               ? "Verifying access to the arena and stabilizing reality." 
               : validationError}
           </p>
           {validationError && (
             <Button onClick={() => router.push("/game/tictactoe")} className="mt-4 gap-2">
               <ArrowLeft className="w-4 h-4" /> Return to Lobby
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
           <h2 className="text-2xl font-bold tracking-tight">Initializing Arena...</h2>
           <p className="text-sm text-muted-foreground">Connecting to the game server and stabilizing reality.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" onClick={() => router.push("/game/tictactoe")} className="gap-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Quit Match
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-8 px-4 rounded-full border-primary/20 text-xs font-bold bg-primary/5 uppercase tracking-tighter">
            ROOM: {roomId}
          </Badge>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={copyLink}>
             {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 h-fit lg:h-[700px] items-start">
        {/* Game Area */}
        <div className="flex flex-col gap-6">
          {/* Player Display */}
          <div className="grid grid-cols-2 gap-4">
            <Card className={`relative overflow-hidden border-2 transition-all ${isMyTurn ? "border-primary ring-4 ring-primary/10 shadow-lg" : "border-border/50 opacity-60"}`}>
              {isMyTurn && <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse" />}
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarImage src={user.image ?? ""} />
                  <AvatarFallback>{user.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold truncate text-sm">{user.name}</span>
                    <Badge className="h-4 px-1 text-[10px] bg-primary">X</Badge>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70">You</span>
                </div>
                {isMyTurn && <Badge variant="secondary" className="h-5 text-[10px] animate-bounce">Your Turn</Badge>}
              </CardContent>
            </Card>

            <Card className={`relative overflow-hidden border-2 transition-all ${!isMyTurn && gameFull && !gameState?.isGameOver ? "border-emerald-500 ring-4 ring-emerald-500/10 shadow-lg" : "border-border/50 opacity-60"}`}>
               {!isMyTurn && gameFull && !gameState?.isGameOver && <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 animate-pulse" />}
               <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-10 w-10 border-2 border-emerald-500/20">
                  {gameState?.isBotMatch ? (
                    <AvatarFallback className="bg-muted text-foreground"><Bot className="w-5 h-5" /></AvatarFallback>
                  ) : (
                    <>
                    <AvatarImage src={opponent?.image ?? ""} />
                    <AvatarFallback>{opponent?.name?.charAt(0) || "U"}</AvatarFallback>
                    </>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold truncate text-sm">
                      {gameState?.isBotMatch 
                        ? `AI (${gameState.difficulty?.charAt(0).toUpperCase()}${gameState.difficulty?.slice(1)})` 
                        : opponent?.name || "Waiting..."}
                    </span>
                    <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-emerald-500 text-white border-none">O</Badge>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70">Opponent</span>
                </div>
                {!isMyTurn && gameFull && !gameState?.isGameOver && <Badge variant="secondary" className="h-5 text-[10px]">Thinking</Badge>}
               </CardContent>
            </Card>
          </div>

          {/* Winning Overlay or Waiting */}
          <div className="relative flex-1 bg-muted/20 rounded-3xl border border-primary/5 p-8 flex items-center justify-center min-h-[450px]">
             {!gameFull ? (
               <div className="flex flex-col items-center gap-6 animate-pulse p-12 text-center">
                 <div className="w-20 h-20 rounded-full border-4 border-dashed border-primary animate-spin" />
                 <div className="space-y-2">
                   <h2 className="text-2xl font-bold tracking-tight">Waiting for Opponent...</h2>
                   <p className="text-sm text-muted-foreground">Share the room ID or wait for a random challenger.</p>
                 </div>
                 <Button variant="outline" className="gap-2" onClick={copyLink}>
                   <Copy className="w-4 h-4" /> {copied ? "Copied Link!" : "Copy Invite Link"}
                 </Button>
               </div>
             ) : (
               <>
               <TicTacToeBoard 
                 board={gameState?.board || Array(9).fill(null)} 
                 onMove={makeMove}
                 disabled={!isMyTurn || gameState?.isGameOver}
               />

               {/* Game Over Screen */}
               {gameState?.isGameOver && (
                 <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-md rounded-3xl flex items-center justify-center p-8">
                   <Card className="w-full max-sm border-2 border-primary/20 shadow-2xl animate-in zoom-in-95">
                     <CardHeader className="text-center pb-2">
                       <Trophy className={`w-12 h-12 mx-auto mb-4 ${gameState.winnerId === user.id ? "text-yellow-500" : "text-muted-foreground"}`} />
                       <CardTitle className="text-3xl font-black">
                         {gameState.winnerId === user.id ? "VICTORY!" : gameState.winnerId === "draw" ? "DRAW MATCH" : "DEFEAT"}
                       </CardTitle>
                       <CardDescription className="text-sm font-medium pt-2">
                         {gameState.winnerId === user.id ? "Brilliant moves! You dominated the board." : "A hard-fought battle ends in a stalemate."}
                       </CardDescription>
                     </CardHeader>
                     <CardFooter className="flex flex-col gap-3 pt-6 pb-8">
                        <Button 
                          className="w-full h-12 gap-2 text-base font-bold shadow-lg shadow-primary/20" 
                          onClick={requestRematch}
                          disabled={gameState.rematchVotes.includes(user.id)}
                        >
                          <RefreshCw className={`w-4 h-4 ${gameState.rematchVotes.includes(user.id) ? "animate-spin" : ""}`} />
                          {gameState.rematchVotes.includes(user.id) ? "Waiting for Opponent..." : "Propose Rematch"}
                        </Button>
                        <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => router.push("/game/tictactoe")}>
                           Go to Lobby
                        </Button>
                     </CardFooter>
                   </Card>
                 </div>
               )}
               </>
             )}
          </div>
        </div>

        <div className="flex flex-col h-full gap-4 min-h-[500px]">
          <Tabs defaultValue={gameState?.isBotMatch ? "info" : "chat"} className="flex-1 flex flex-col">
            <TabsList className={`grid ${gameState?.isBotMatch ? "grid-cols-1" : "grid-cols-2"}`}>
              {!gameState?.isBotMatch && (
                <TabsTrigger value="chat" className="gap-2">
                  <MessageSquare className="w-4 h-4" /> Chat
                </TabsTrigger>
              )}
              <TabsTrigger value="info" className="gap-2">
                <AlertCircle className="w-4 h-4" /> Info
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 mt-0 pt-4 flex flex-col gap-4 overflow-hidden">
               <Card className="flex-1 flex flex-col border-none shadow-none bg-muted/30">
                 <ScrollArea className="flex-1 p-4">
                   <div className="space-y-4">
                     {messages.length === 0 && (
                       <div className="flex flex-col items-center justify-center py-12 opacity-30 gap-2">
                         <MessageSquare className="w-8 h-8" />
                         <p className="text-xs font-bold uppercase tracking-tighter">Room Chat Active</p>
                       </div>
                     )}
                     {messages.map((m, i) => {
                       const isMe = m.senderId === user.id;
                       return (
                         <div key={i} className={`flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                           <span className="text-[10px] font-bold text-muted-foreground opacity-70 px-1">
                             {m.senderName}
                           </span>
                           <div className={`px-3 py-1.5 rounded-xl text-xs max-w-[90%] ${isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card text-foreground rounded-tl-none border"}`}>
                             {m.text}
                           </div>
                         </div>
                       );
                     })}
                     <div ref={chatEndRef} />
                   </div>
                 </ScrollArea>
                 <CardFooter className="p-3 border-t bg-card/50">
                    <form onSubmit={sendMessage} className="flex w-full gap-2">
                      <Input 
                        placeholder="Say something..." 
                        className="h-9 bg-background border-none text-xs" 
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                      />
                      <Button size="icon" className="h-9 w-9 shrink-0 shadow-md">
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                    </form>
                 </CardFooter>
               </Card>
            </TabsContent>

            <TabsContent value="info" className="flex-1 mt-0 pt-4">
               <Card className="bg-muted/10 border-dashed">
                 <CardHeader className="p-4">
                   <CardTitle className="text-sm">Match Rules</CardTitle>
                 </CardHeader>
                 <CardContent className="p-4 pt-0 space-y-4 text-xs text-muted-foreground leading-relaxed">
                   <div className="flex items-start gap-2">
                     <Badge className="h-5 w-5 p-0 justify-center shrink-0">1</Badge>
                     <p>Get three of your marks in a horizontal, vertical, or diagonal row to win.</p>
                   </div>
                   <div className="flex items-start gap-2">
                     <Badge className="h-5 w-5 p-0 justify-center shrink-0">2</Badge>
                     <p>The room creator (Player X) goes first in the first match.</p>
                   </div>
                   <div className="flex items-start gap-2">
                     <Badge className="h-5 w-5 p-0 justify-center shrink-0">3</Badge>
                     <p>Rematching will alternate the starting player for a fair experience.</p>
                   </div>
                   <div className="flex items-start gap-2">
                     <Badge className="h-5 w-5 p-0 justify-center shrink-0">4</Badge>
                     <p>Matches are automatically logged in your history for stat tracking.</p>
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
    <Suspense fallback={<div className="flex items-center justify-center p-20 animate-pulse">Loading Arena...</div>}>
      <TicTacToeContent />
    </Suspense>
  );
}
