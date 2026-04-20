"use client";

import { useState } from "react";
import { getMatchHistory } from "@/app/actions/history";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trophy, Swords, TrendingUp, RefreshCw, CircleDot, Dices, User } from "lucide-react";

type MatchRecord = {
  matchId: string;
  game: string;
  playedAt: string;
  isWinner: boolean;
  score: number | null;
  opponents: {
    isBot: boolean;
    name: string;
    image: string | null;
    userId: string | null;
    isWinner: boolean;
  }[];
};

interface GameHistoryProps {
  initialHistory: MatchRecord[];
}

const GAME_RESOURCES: Record<string, { icon: any; label: string }> = {
  tictactoe: { icon: CircleDot, label: "Tic Tac Toe" },
  ludo: { icon: Dices, label: "Ludo" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { 
    month: "short", 
    day: "numeric", 
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function GameHistory({ initialHistory }: GameHistoryProps) {
  const [history, setHistory] = useState(initialHistory);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "wins" | "losses">("all");

  const refresh = async () => {
    setLoading(true);
    const h = await getMatchHistory();
    setHistory(h as any[]);
    setLoading(false);
  };

  const filtered = history.filter((m) => {
    if (filter === "wins") return m.isWinner;
    if (filter === "losses") return !m.isWinner;
    return true;
  });

  const wins = history.filter((m) => m.isWinner).length;
  const losses = history.length - wins;
  const winRate = history.length > 0 ? Math.round((wins / history.length) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardDescription className="font-semibold text-primary/70 uppercase text-[10px] tracking-wider">Total Matches</CardDescription>
            <Swords className="h-4 w-4 text-primary opacity-50" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl">{history.length}</CardTitle>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardDescription className="font-semibold text-emerald-600/70 dark:text-emerald-400/70 uppercase text-[10px] tracking-wider">Total Wins</CardDescription>
            <Trophy className="h-4 w-4 text-emerald-500 opacity-50" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl text-emerald-600 dark:text-emerald-400">{wins}</CardTitle>
          </CardContent>
        </Card>

        <Card className="bg-orange-500/5 border-orange-500/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardDescription className="font-semibold text-orange-600/70 dark:text-orange-400/70 uppercase text-[10px] tracking-wider">Win Rate</CardDescription>
            <TrendingUp className="h-4 w-4 text-orange-500 opacity-50" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl text-orange-600 dark:text-orange-400">{winRate}%</CardTitle>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="bg-muted p-1 rounded-lg flex gap-1 w-full sm:w-auto">
          {["all", "wins", "losses"].map((f) => (
            <Button
              key={f}
              variant={filter === f ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter(f as any)}
              className="flex-1 sm:flex-none h-8 capitalize font-semibold text-xs transition-all"
            >
              {f}
            </Button>
          ))}
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refresh} 
          disabled={loading} 
          className="w-full sm:w-auto gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Sync Matches
        </Button>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <Card className="border-dashed flex flex-col items-center justify-center p-16 text-center bg-muted/20">
            <TrendingUp className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
            <CardTitle className="text-lg text-muted-foreground font-medium">No History Yet</CardTitle>
            <CardDescription>Your gaming legacy starts here. Play a match!</CardDescription>
          </Card>
        ) : (
          filtered.map((match) => {
            const opponent = match.opponents[0];
            const GameIcon = GAME_RESOURCES[match.game]?.icon || Swords;
            return (
              <Card key={match.matchId} className={`transition-all hover:shadow-md ${match.isWinner ? "border-emerald-500/10 bg-emerald-500/[0.02]" : "border-muted/50"}`}>
                <CardHeader className="p-4 flex flex-row items-center gap-4 space-y-0">
                  <div className={`p-3 rounded-xl ${match.isWinner ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                    <GameIcon className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-bold">{GAME_RESOURCES[match.game]?.label || match.game}</span>
                      <Badge variant="outline" className="text-[10px] py-0 h-4 bg-muted/30">Versus</Badge>
                      <div className="flex items-center gap-1.5 text-sm text-foreground/70">
                        {opponent?.isBot ? (
                          <Badge variant="secondary" className="px-1 py-0 h-4 text-[10px]">AI Bot</Badge>
                        ) : (
                          <span className="truncate font-medium">{opponent?.name || "Player"}</span>
                        )}
                      </div>
                    </div>
                    <CardDescription className="text-[11px] font-medium flex items-center gap-1.5 opacity-60">
                      {formatDate(match.playedAt)}
                    </CardDescription>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge variant={match.isWinner ? "default" : "secondary"} className={`font-bold ${match.isWinner ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}`}>
                      {match.isWinner ? "Victory" : "Defeat"}
                    </Badge>
                    {match.score !== null && (
                      <span className="text-[10px] font-bold text-muted-foreground">SCORE: {match.score}</span>
                    )}
                  </div>
                </CardHeader>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
