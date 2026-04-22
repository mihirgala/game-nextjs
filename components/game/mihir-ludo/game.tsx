'use client';

import React, { useState, Suspense } from 'react'
import { Board } from './board'
import { LocalGame } from './local-game'
import { LudoOnline } from './online-game'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { nanoid } from 'nanoid'
import { Gamepad2, Users, Monitor, ArrowLeft, Plus, Play } from 'lucide-react'

export const MihirLudo = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roomId = searchParams.get('roomId');
    const [joinCode, setJoinCode] = useState('');

    if (roomId) {
        return (
            <main className='bg-white text-black min-h-screen'>
                <LudoOnline roomId={roomId} />
            </main>
        );
    }

    return (
        <main className='bg-white text-black min-h-screen flex items-center justify-center p-4'>
            <div className="w-full max-w-4xl space-y-12">
                <div className="text-center space-y-4">
                    <h1 className="text-6xl font-black tracking-tighter border-b-8 border-black pb-2 inline-block">
                        LUDO ARCADIA
                    </h1>
                    <p className="text-xl font-bold uppercase opacity-50 tracking-[0.2em]">Select Your Arena</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* LOCAL PLAY */}
                    <Card className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                        <CardHeader className="border-b-4 border-black bg-gray-50">
                            <CardTitle className="flex items-center gap-3 text-2xl font-black uppercase">
                                <Monitor className="w-8 h-8" /> Local Match
                            </CardTitle>
                            <CardDescription className="text-black font-bold uppercase">
                                Play against friends on the same machine
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="flex flex-col gap-4">
                                <div className="text-xs font-black uppercase opacity-50">Select Player Count</div>
                                <div className="grid grid-cols-3 gap-3">
                                    {[2, 3, 4].map(count => (
                                        <Button 
                                            key={count}
                                            onClick={() => router.push(`/game/ludoMihir?local=true&players=${count}`)}
                                            className="h-16 text-3xl font-black border-4 border-black bg-white text-black hover:bg-black hover:text-white"
                                        >
                                            {count}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ONLINE PLAY */}
                    <Card className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                        <CardHeader className="border-b-4 border-black bg-gray-50">
                            <CardTitle className="flex items-center gap-3 text-2xl font-black uppercase">
                                <Users className="w-8 h-8" /> Online Duel
                            </CardTitle>
                            <CardDescription className="text-black font-bold uppercase">
                                Challenge players across the web
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-3">
                                <div className="text-xs font-black uppercase opacity-50">Have a code?</div>
                                <div className="flex gap-2">
                                    <Input 
                                        placeholder="ROOM CODE" 
                                        value={joinCode}
                                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                        className="h-12 border-4 border-black font-black uppercase tracking-widest"
                                    />
                                    <Button 
                                        onClick={() => router.push(`/game/ludoMihir?roomId=${joinCode}`)}
                                        disabled={!joinCode}
                                        className="h-12 border-4 border-black px-6 bg-black text-white hover:bg-white hover:text-black"
                                    >
                                        JOIN
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t-2 border-black" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-4 font-black">OR</span>
                                </div>
                            </div>

                            <Button 
                                onClick={() => router.push(`/game/ludoMihir?roomId=${nanoid(6).toUpperCase()}`)}
                                className="w-full h-16 text-xl font-black uppercase tracking-widest border-4 border-black bg-white text-black hover:bg-black hover:text-white"
                            >
                                <Plus className="mr-2" /> Host New Game
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
};

export const Game = () => {
    const searchParams = useSearchParams();
    const isLocal = searchParams.get('local') === 'true';
    const playerCount = parseInt(searchParams.get('players') || '4');

    if (isLocal) {
        return (
            <main className='bg-white text-black'>
                <div className="p-4">
                    <Button 
                        variant="link" 
                        onClick={() => window.location.href = '/game/ludoMihir'}
                        className="font-black uppercase tracking-widest text-black flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Exit to Menu
                    </Button>
                </div>
                <LocalGame />
            </main>
        );
    }

    return (
        <Suspense fallback={<div>Loading Arena...</div>}>
            <MihirLudo />
        </Suspense>
    );
};
