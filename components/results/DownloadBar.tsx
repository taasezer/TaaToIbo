"use client";

import { motion } from "framer-motion";
import { Download, Image as ImageIcon, FileType2, FileCode2, Share2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDownload } from "@/hooks/useDownload";
import { toast } from "sonner";

interface DownloadBarProps {
    imageUrl: string;
    onStartOver: () => void;
    enableSvg?: boolean;
}

export function DownloadBar({ imageUrl, onStartOver, enableSvg = true }: DownloadBarProps) {
    const { downloadPNG, downloadJPG, downloadSVG, copyToClipboard } = useDownload();

    const handleShare = async () => {
        const success = await copyToClipboard(imageUrl);
        if (success) {
            toast.success("Image copied to clipboard!");
        } else {
            toast.error("Failed to copy. Try downloading instead.");
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 p-3 rounded-xl border border-border bg-card"
        >
            <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground px-1">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
            </div>

            <Separator orientation="vertical" className="hidden sm:block h-6" />

            <div className="flex items-center gap-2 flex-1 flex-wrap">
                {/* PNG */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            id="download-png-btn"
                            variant="secondary"
                            size="sm"
                            className="gap-1.5 flex-1 sm:flex-none"
                            onClick={() => downloadPNG(imageUrl)}
                        >
                            <ImageIcon className="h-3.5 w-3.5" />
                            PNG
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Transparent background</TooltipContent>
                </Tooltip>

                {/* JPG */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            id="download-jpg-btn"
                            variant="secondary"
                            size="sm"
                            className="gap-1.5 flex-1 sm:flex-none"
                            onClick={() => downloadJPG(imageUrl)}
                        >
                            <FileType2 className="h-3.5 w-3.5" />
                            JPG
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>White background</TooltipContent>
                </Tooltip>

                {/* SVG */}
                {enableSvg && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                id="download-svg-btn"
                                variant="secondary"
                                size="sm"
                                className="gap-1.5 flex-1 sm:flex-none"
                                onClick={() => downloadSVG(imageUrl)}
                            >
                                <FileCode2 className="h-3.5 w-3.5" />
                                SVG
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Vector format (embedded)</TooltipContent>
                    </Tooltip>
                )}

                {/* Share */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            id="share-btn"
                            variant="ghost"
                            size="sm"
                            className="gap-1.5"
                            onClick={handleShare}
                        >
                            <Share2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Copy</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy to clipboard</TooltipContent>
                </Tooltip>
            </div>

            <Separator orientation="vertical" className="hidden sm:block h-6" />

            {/* Start Over */}
            <Button
                id="start-over-btn"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={onStartOver}
            >
                <RotateCcw className="h-3.5 w-3.5" />
                Start Over
            </Button>
        </motion.div>
    );
}
