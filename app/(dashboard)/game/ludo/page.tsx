"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAtom } from "jotai";
import { socketAtom, friendsAtom } from "@/lib/atoms";
import { LudoBoard } from "@/components/game/ludo-board";
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
  Dices
} from "lucide-react";
import { nanoid } from "nanoid";
import { saveMatchResult } from "@/app/actions/history";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// --- Types ---
interface LudoPiece {
  id: number;
  position: number;
  isHome: boolean;
}

interface LudoPlayer {
  userId: string;
  name: string;
  color: string;
  image?: string | null;
  pieces: LudoPiece[];
  isBot: boolean;
}

interface GameState {
  id: string;
  game: string;
  players: LudoPlayer[];
  turnIndex: number;
  diceValue: number | null;
  waitingForRoll: boolean;
  isGameOver: boolean;
  winnerId: string | null;
  rematchVotes: string[];
  isBotMatch: boolean;
  difficulty?: string;
}

interface RoomMessage {
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

function LudoContent() {
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
  const lastInitializedRoomRef = useRef<string | null>(null);

  const inviteFriend = (friendId: string, name: string) => {
    if (!socket || !user) return;
    const newRoomId = nanoid(10);
    socket.emit("game:invite", { 
      fromId: user.id, 
      fromName: user.name!, 
      toId: friendId, 
      game: "ludo",
      roomId: newRoomId
    });
    toast.success(`Invite sent to ${name}!`, { duration: 10000 });
    setIsInviteModalOpen(false);
    router.push(`/game/ludo?roomId=${newRoomId}&create=true`);
  };

  // Socket game join and listeners
  useEffect(() => {
    if (!socket || !roomId || !user) return;

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
        game: "ludo", 
        isBot, 
        difficulty, 
        userImage: user.image 
      });
    });

    const handleState = (state: GameState) => {
      setGameState(state);
      if (state.isGameOver) {
        const players = state.players.map(p => ({
          userId: p.isBot ? null : p.userId,
          isBot: p.isBot,
          isWinner: state.winnerId === p.userId,
          score: state.winnerId === p.userId ? 100 : 0
        }));
        saveMatchResult({ game: "ludo", players }).catch(console.error);
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
  }, [socket, roomId, user?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // -- Actions --
  const rollDice = () => {
    if (!socket || !roomId) return;
    socket.emit("game:ludo:roll", { roomId });
  };

  const movePiece = (pieceId: number) => {
    if (!socket || !roomId) return;
    socket.emit("game:ludo:move", { roomId, pieceId });
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
      router.push(`/game/ludo?roomId=${newRoomId}&isBot=true&difficulty=${difficulty}&create=true`);
    } else {
      router.push(`/game/ludo?roomId=${newRoomId}&create=true`);
    }
  };

  if (!user) return null;

  // -- Entrance UI --
  if (!roomId) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center mb-8 md:mb-12 space-y-4">
          <Badge variant="outline" className="px-4 py-1.5 uppercase tracking-widest text-primary border-primary/20 bg-primary/5">
            Strategy Edition
          </Badge>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight flex items-center justify-center gap-3 md:gap-4">
            <Dices className="w-8 h-8 md:w-12 md:h-12 text-primary" />
            LUDO ARENA (Made with AI)
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
            The ultimate race home. Play with up to 4 players and prove your strategy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="relative overflow-hidden group border-primary/10 hover:border-primary/30 transition-all hover:shadow-2xl">
            <CardHeader>
              <Bot className="w-10 h-10 mb-2 text-primary" />
              <CardTitle className="text-2xl font-bold">1v1 vs Bot</CardTitle>
              <CardDescription>Practice your moves against the AI.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => selectMode("bot", "medium")} className="w-full h-12 font-bold">Start Practice Match</Button>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group border-primary/10 hover:border-primary/30 transition-all hover:shadow-2xl">
            <CardHeader>
              <Users className="w-10 h-10 mb-2 text-emerald-500" />
              <CardTitle className="text-2xl font-bold">Multiplayer Party</CardTitle>
              <CardDescription>Play with 2-4 friends or challengers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Enter Room Code..." 
                  className="h-12 bg-muted/50 font-mono font-bold tracking-widest text-center"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const code = (e.target as HTMLInputElement).value.trim();
                      if (code) router.push(`/game/ludo?roomId=${code}&create=true`);
                    }
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <Button onClick={() => setIsInviteModalOpen(true)} variant="secondary" className="h-12 font-bold gap-2">
                    Invite Friends
                 </Button>
                 <Button onClick={() => {
                    const id = nanoid(10);
                    socket?.emit("lobby:broadcast", {
                      senderId: user.id,
                      senderName: user.name ?? "Unknown",
                      text: `🎮 Join my Ludo party! 🎲`,
                      createdAt: new Date().toISOString(),
                      invite: { game: "ludo", roomId: id }
                    });
                    router.push(`/game/ludo?roomId=${id}&create=true`);
                 }} variant="outline" className="h-12 font-bold border-primary/20 text-primary">
                    Broadcast
                 </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Challenge Friends</DialogTitle>
              <DialogDescription>Select an online friend to start a Ludo match.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {friends.length === 0 && <p className="text-center py-10 opacity-30 text-xs font-bold uppercase">No Friends Online</p>}
                {friends.map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border">
                        <AvatarImage src={f.friend.image ?? ""} />
                        <AvatarFallback>{f.friend.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-bold">{f.friend.name}</span>
                    </div>
                    <Button size="sm" className="h-8 font-bold" disabled={!f.friend.isOnline} onClick={() => inviteFriend(f.friend.id, f.friend.name)}>
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

  // --- Gaming Screen ---
  if (isValidating || validationError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className={`w-20 h-20 rounded-full border-4 border-dashed ${validationError ? "border-destructive" : "border-primary animate-spin"}`} />
        <h2 className="text-2xl font-bold">{validationError ? "Entry Denied" : "Validating Room..."}</h2>
        {validationError && (
          <Button onClick={() => router.push("/game/ludo")} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Return to Lobby
          </Button>
        )}
      </div>
    );
  }

  if (!gameState) {
     return <div className="flex items-center justify-center min-h-[60vh] animate-pulse">Initializing Arena...</div>;
  }

  const myPlayer = gameState.players.find(p => p.userId === user.id);
  const isMyTurn = gameState.turnIndex !== -1 && gameState.players[gameState.turnIndex].userId === user.id;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6 md:gap-8">
        <div className="flex flex-col gap-4 md:gap-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => router.push("/game/ludo")} className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Quit Match</span>
            </Button>
            <div className="flex items-center gap-1 md:gap-2">
               <Badge variant="outline" className="h-7 md:h-8 px-2 md:px-4 font-bold border-primary/20 bg-primary/5 uppercase text-[10px] md:text-xs">
                 ROOM: {roomId}
               </Badge>
               <Button size="icon" variant="ghost" className="h-8 w-8" onClick={copyLink}>
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
               </Button>
            </div>
          </div>

          <div className="flex gap-2 md:gap-4 overflow-x-auto pb-2 scrollbar-hide">
             {gameState.players.map((p, idx) => {
                const isActive = gameState.turnIndex === idx;
                return (
                  <Card key={idx} className={`min-w-[120px] md:min-w-[140px] flex-1 border-2 transition-all ${isActive ? "border-primary shadow-lg ring-4 ring-primary/10" : "opacity-60 border-muted"}`}>
                    <CardContent className="p-2 md:p-3 flex items-center gap-2 md:gap-3">
                      <div className="w-1.5 md:w-2 h-8 md:h-10 rounded-full" style={{ backgroundColor: p.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] md:text-xs font-bold truncate leading-none mb-1">{p.name}</p>
                        <Badge variant="outline" className="text-[8px] md:text-[10px] py-0 h-3 md:h-4 uppercase px-1">{p.color}</Badge>
                      </div>
                      {isActive && <div className="w-2 h-2 rounded-full bg-primary animate-ping" />}
                    </CardContent>
                  </Card>
                );
             })}
          </div>

          <div className="relative flex items-center justify-center bg-muted/20 rounded-2xl md:rounded-3xl border border-primary/5 p-2 md:p-8 min-h-[300px] md:min-h-[500px]">
            {gameState.players.length < 2 && !gameState.isBotMatch ? (
               <div className="flex flex-col items-center gap-4 md:gap-6 text-center p-4">
                  <div className="w-12 h-12 md:w-20 md:h-20 rounded-full border-4 border-dashed border-primary animate-spin" />
                  <h2 className="text-lg md:text-xl font-bold">Waiting for challengers...</h2>
                  <Button variant="outline" size="sm" onClick={copyLink}>Copy Invite Link</Button>
               </div>
            ) : (
              <div className="w-full max-w-[500px] aspect-square">
                <LudoBoard 
                  players={gameState.players} 
                  turnIndex={gameState.turnIndex}
                  diceValue={gameState.diceValue}
                  onPieceClick={movePiece}
                  disabled={!isMyTurn || gameState.waitingForRoll}
                  difficulty={gameState.difficulty}
                />
              </div>
            )}

            {gameState.isGameOver && (
              <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-md rounded-3xl flex items-center justify-center p-8">
                <Card className="w-full max-w-sm border-2 border-primary/20 shadow-2xl">
                   <CardHeader className="text-center">
                      <Trophy className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                      <CardTitle className="text-3xl font-black">{gameState.winnerId === user.id ? "VICTORY!" : "GAME OVER"}</CardTitle>
                      <CardDescription>
                        {gameState.winnerId === user.id ? "Your tokens have reached home safely!" : "A hard-fought race has ended."}
                      </CardDescription>
                   </CardHeader>
                   <CardFooter className="flex flex-col gap-2">
                      <Button className="w-full h-12 font-bold" onClick={requestRematch}>Request Rematch</Button>
                      <Button variant="ghost" className="w-full" onClick={() => router.push("/game/ludo")}>Leave Match</Button>
                   </CardFooter>
                </Card>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
           {/* Control Panel */}
           <Card className="border-2 border-primary/10 shadow-xl overflow-hidden bg-primary/5">
             <CardHeader className="p-3 md:p-4 flex flex-row items-center justify-between space-y-0">
               <CardTitle className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-primary">Your Control</CardTitle>
               <Dices className="w-4 h-4 text-primary" />
             </CardHeader>
             <CardContent className="p-4 md:p-6 pt-0 flex flex-col items-center gap-4 md:gap-6">
                <div className="relative group">
                  <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 animate-pulse" />
                  <div 
                    className={`w-20 h-20 md:w-28 md:h-28 rounded-xl md:rounded-2xl bg-white dark:bg-zinc-900 border-4 shadow-2xl flex items-center justify-center text-3xl md:text-5xl font-black transform transition-all duration-300 ${isMyTurn && gameState.waitingForRoll ? "border-primary scale-110 rotate-3 cursor-pointer hover:rotate-6 active:scale-95 shadow-primary/30" : "border-muted grayscale"}`}
                    onClick={() => isMyTurn && gameState.waitingForRoll && rollDice()}
                  >
                    {gameState.diceValue || "?"}
                  </div>
                </div>

                <div className="text-center space-y-1">
                   <p className="text-xs md:text-sm font-black uppercase text-primary">
                     {isMyTurn 
                       ? (gameState.waitingForRoll ? "It's your turn! ROLL" : "Select a piece to MOVE") 
                       : (gameState.players[gameState.turnIndex]?.name ? `${gameState.players[gameState.turnIndex].name}'s turn...` : "Waiting...")
                     }
                   </p>
                   <p className="text-[9px] md:text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                     {isMyTurn && gameState.diceValue && !gameState.waitingForRoll ? "Click a token on the board" : "Ludo Pro Arcade Edition"}
                   </p>
                </div>

                <Button 
                   size="lg" 
                   className="w-full h-12 md:h-14 font-black gap-2 md:gap-3 text-base md:text-lg rounded-xl md:rounded-2xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                   disabled={!isMyTurn || !gameState.waitingForRoll}
                   onClick={rollDice}
                >
                  <Dices className="w-5 h-5 md:w-6 md:h-6" />
                  ROLL DICE
                </Button>
             </CardContent>
           </Card>

           {/* Chat Panel */}
           <Tabs defaultValue="chat" className="flex-1 flex flex-col min-h-[400px]">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="chat" className="gap-2"><MessageSquare className="w-4 h-4" /> Chat</TabsTrigger>
                <TabsTrigger value="info" className="gap-2"><AlertCircle className="w-4 h-4" /> Rules</TabsTrigger>
              </TabsList>
              
              <TabsContent value="chat" className="flex-1 flex flex-col mt-4">
                 <Card className="flex-1 flex flex-col bg-muted/20 border-none shadow-none">
                    <ScrollArea className="flex-1 p-4">
                       <div className="space-y-4">
                          {messages.map((m, i) => (
                             <div key={i} className={`flex flex-col gap-1 ${m.senderId === user.id ? "items-end" : "items-start"}`}>
                               <span className="text-[10px] font-bold text-muted-foreground opacity-70 px-1">{m.senderName}</span>
                               <div className={`px-3 py-1.5 rounded-xl text-xs max-w-[90%] ${m.senderId === user.id ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border rounded-tl-none"}`}>
                                 {m.text}
                               </div>
                             </div>
                          ))}
                          <div ref={chatEndRef} />
                       </div>
                    </ScrollArea>
                    <CardFooter className="p-3 border-t bg-card/50">
                       <form onSubmit={sendMessage} className="flex gap-2 w-full">
                          <Input placeholder="Say hi..." className="h-9 text-xs border-none bg-background shadow-inner" value={chatInput} onChange={e => setChatInput(e.target.value)} />
                          <Button size="icon" className="h-9 w-9 shrink-0 shadow-lg"><Send className="w-3.5 h-3.5" /></Button>
                       </form>
                    </CardFooter>
                 </Card>
              </TabsContent>

              <TabsContent value="info" className="mt-4">
                 <Card className="bg-muted/10 border-dashed p-4 text-xs space-y-3 text-muted-foreground">
                    <p>• Roll a 6 to bring a piece out of the base.</p>
                    <p>• A 6 grants you an extra turn after moving.</p>
                    <p>• Land on an opponent's piece to send it back home!</p>
                    <p>• Reach the home zone with all 4 pieces to win.</p>
                 </Card>
              </TabsContent>
           </Tabs>
        </div>
      </div>
    </div>
  );
}

export default function LudoPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-20 animate-pulse">Entering Ludo Arena...</div>}>
      <LudoContent />
    </Suspense>
  );
}
