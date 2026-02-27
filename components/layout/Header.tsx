"use client";

import { Scissors, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function Header() {
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="sticky top-0 z-50 w-full glass">
            <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3 sm:px-6">
                {/* Logo */}
                <div className="flex items-center gap-2.5">
                    <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <Scissors className="h-5 w-5 text-primary" />
                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-lg font-bold tracking-tight gradient-text leading-tight">
                            TaaToIbo
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-none hidden sm:block">
                            Textile Art → Isolated Object
                        </span>
                    </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                id="theme-toggle"
                                variant="ghost"
                                size="icon"
                                onClick={toggleTheme}
                                className="h-9 w-9 focus-ring"
                                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                            >
                                {theme === "dark" ? (
                                    <Sun className="h-4 w-4 transition-transform hover:rotate-45" />
                                ) : (
                                    <Moon className="h-4 w-4 transition-transform hover:-rotate-12" />
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Switch to {theme === "dark" ? "light" : "dark"} mode</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </header>
    );
}
