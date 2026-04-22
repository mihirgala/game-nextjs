"use client";

import { useRouter } from "next/navigation";
import type { User } from "better-auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CircleDot, Dices, ArrowRight, Sparkles, Users, Grid3X3 } from "lucide-react";
import { useAtom } from "jotai";
import { socketAtom } from "@/lib/atoms";
import { nanoid } from "nanoid";

interface Game {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  available: boolean;
  players: string;
  tagline: string;
}

const GAMES: Game[] = [
  {
    id: "ludo",
    name: "Ludo Arena",
    description: "The ultimate 4-player board game experience with 3D physics and real-time multiplayer.",
    tagline: "CLASSIC BOARD GAME",
    icon: Dices,
    color: "text-red-500",
    available: true,
    players: "2-4",
  },
  {
    id: "tictactoe",
    name: "Tic Tac Toe",
    description: "A professional 3x3 strategy arena featuring advanced AI and online duels.",
    tagline: "FAST-PACED DUEL",
    icon: Grid3X3,
    color: "text-blue-500",
    available: true,
    players: "1v1",
  },
];

interface GamePickerProps {
  user: User;
}

export function GamePicker({ user }: GamePickerProps) {
  const router = useRouter();
  const [socket] = useAtom(socketAtom);

  const broadcastInvite = (gameId: string, gameName: string) => {
    if (!socket) return;
    const roomId = nanoid(10);
    const inviteMsg = {
      senderId: user.id,
      senderName: user.name ?? "Unknown",
      text: `🎮 Join my ${gameName} lobby! ⚔️`,
      createdAt: new Date().toISOString(),
      invite: {
        game: gameId,
        roomId: roomId
      }
    };
    (socket as any).emit("lobby:broadcast", inviteMsg);
    router.push(`/game/${gameId}?roomId=${roomId}&create=true`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-black tracking-tight">
            Welcome back, <span className="text-primary">{user.name?.split(" ")[0]}</span>
          </h2>
        </div>
        <p className="text-muted-foreground font-medium">
          Ready for another match? Pick your arena.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {GAMES.map((game) => {
          const Icon = game.icon;
          return (
            <Card
              key={game.id}
              className={`relative overflow-hidden transition-all duration-300 group border-primary/10 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5`}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-4 rounded-2xl bg-primary/5 ${game.color} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-10 h-10" />
                  </div>
                  <Badge variant="outline" className="font-black uppercase tracking-widest text-[10px] bg-background">
                    {game.tagline}
                  </Badge>
                </div>
                <CardTitle className="text-2xl font-black">{game.name}</CardTitle>
                <CardDescription className="line-clamp-2 font-medium">
                  {game.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-4">
                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-primary" />
                    <span>{game.players} PLAYERS</span>
                  </div>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  <span className="text-primary">ONLINE READY</span>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3 pt-4">
                <Button
                  className="w-full h-12 justify-between font-bold text-base shadow-lg shadow-primary/10"
                  onClick={() => router.push(`/game/${game.id}`)}
                >
                  Enter Arena
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  className="w-full h-10 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => broadcastInvite(game.id, game.name)}
                >
                  <Sparkles className="w-3 h-3 mr-2" />
                  Broadcast Invite
                </Button>
              </CardFooter>
            </Card>
          );
        })}

        <Card className="border-dashed flex flex-col items-center justify-center p-8 text-center bg-muted/5 border-2">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4 border border-dashed border-muted-foreground/20">
            <Sparkles className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <CardTitle className="text-xl text-muted-foreground/50 font-black uppercase">More Soon</CardTitle>
          <CardDescription className="font-medium">Developing new arenas...</CardDescription>
        </Card>
      </div>
    </div>
  );
}
