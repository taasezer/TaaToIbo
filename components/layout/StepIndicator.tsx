"use client";

import { Upload, Scan, Download, Check } from "lucide-react";
import { motion } from "framer-motion";
import type { AppStep } from "@/types";
import { cn } from "@/lib/utils";

const steps: { id: AppStep; label: string; icon: typeof Upload }[] = [
    { id: "upload", label: "Upload", icon: Upload },
    { id: "detect", label: "Detect", icon: Scan },
    { id: "download", label: "Download", icon: Download },
];

const stepOrder: AppStep[] = ["upload", "detect", "download"];

interface StepIndicatorProps {
    currentStep: AppStep;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
    const currentIndex = stepOrder.indexOf(currentStep);

    return (
        <div className="flex items-center justify-center gap-2 sm:gap-4 py-4">
            {steps.map((step, idx) => {
                const isComplete = idx < currentIndex;
                const isCurrent = idx === currentIndex;
                const Icon = isComplete ? Check : step.icon;

                return (
                    <div key={step.id} className="flex items-center gap-2 sm:gap-4">
                        {/* Step circle + label */}
                        <div className="flex items-center gap-2">
                            <motion.div
                                className={cn(
                                    "relative flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors",
                                    isComplete && "border-primary bg-primary text-primary-foreground",
                                    isCurrent && "border-primary bg-primary/10 text-primary pulse-glow",
                                    !isComplete && !isCurrent && "border-muted-foreground/30 text-muted-foreground/50"
                                )}
                                animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                <Icon className="h-4 w-4" />
                            </motion.div>
                            <span
                                className={cn(
                                    "text-sm font-medium hidden sm:inline",
                                    isComplete && "text-primary",
                                    isCurrent && "text-foreground",
                                    !isComplete && !isCurrent && "text-muted-foreground/50"
                                )}
                            >
                                {step.label}
                            </span>
                        </div>

                        {/* Connector line */}
                        {idx < steps.length - 1 && (
                            <div className="relative h-0.5 w-8 sm:w-16 bg-muted-foreground/20 rounded-full overflow-hidden">
                                <motion.div
                                    className="absolute inset-y-0 left-0 bg-primary rounded-full"
                                    initial={{ width: "0%" }}
                                    animate={{ width: isComplete ? "100%" : "0%" }}
                                    transition={{ duration: 0.5, ease: "easeInOut" }}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
