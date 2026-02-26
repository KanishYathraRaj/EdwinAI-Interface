'use client';

import React from 'react';
import { useTheme } from '@/contexts/theme-context';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Palette, Waves, Sunset, Check } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    const themes = [
        { id: 'light', label: 'Clean Light', icon: Sun },
        { id: 'dark', label: 'Deep Dark', icon: Moon },
        { id: 'nordic-slate', label: 'Nordic Slate', icon: Palette },
        { id: 'midnight-azure', label: 'Midnight Azure', icon: Waves },
        { id: 'rose-dusk', label: 'Rose Dusk', icon: Sunset },
    ] as const;

    const currentTheme = themes.find(t => t.id === theme) || themes[0];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative size-9 transition-all duration-300 hover:bg-white/5 active:scale-95"
                >
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-border backdrop-blur-md">
                {themes.map(({ id, label, icon: Icon }) => (
                    <DropdownMenuItem
                        key={id}
                        onClick={() => setTheme(id)}
                        className={cn(
                            "flex items-center justify-between gap-2 cursor-pointer transition-colors duration-200",
                            theme === id ? "bg-white/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <Icon className="size-4" />
                            <span>{label}</span>
                        </div>
                        {theme === id && <Check className="size-3.5" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
