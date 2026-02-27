"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-8">
                    <div className="flex items-center gap-3 text-destructive">
                        <AlertTriangle className="h-8 w-8" />
                        <h2 className="text-xl font-semibold">Something went wrong</h2>
                    </div>
                    <p className="text-muted-foreground text-center max-w-md">
                        {this.state.error?.message || "An unexpected error occurred. Please try again."}
                    </p>
                    <Button
                        onClick={this.handleReset}
                        variant="outline"
                        className="gap-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Try Again
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
