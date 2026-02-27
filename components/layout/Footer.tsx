"use client";

import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Footer() {
    return (
        <footer className="w-full border-t border-border/50 mt-auto">
            <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-4 sm:px-6">
                <p className="text-xs text-muted-foreground">
                    © {new Date().getFullYear()} TaaToIbo — Textile Art to Isolated Object
                </p>
                <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="gap-1.5 text-xs">
                        <Sparkles className="h-3 w-3 text-primary" />
                        Powered by Gemini 2.5 Pro
                    </Badge>
                </div>
            </div>
        </footer>
    );
}
