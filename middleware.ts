import { NextRequest, NextResponse } from "next/server";

/**
 * In-memory rate limiter per IP address.
 * Production-grade rate limiting should use Redis or similar,
 * but this handles single-instance deployments (Vercel serverless has per-invocation isolation,
 * so this primarily protects the dev server and self-hosted deployments).
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

function getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }
    return request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(ip: string): { limited: boolean; retryAfter: number } {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetTime) {
        // New window
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        return { limited: false, retryAfter: 0 };
    }

    if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        return { limited: true, retryAfter };
    }

    entry.count++;
    return { limited: false, retryAfter: 0 };
}

// Cleanup stale entries every 5 minutes to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap.entries()) {
        if (now > entry.resetTime) {
            rateLimitMap.delete(ip);
        }
    }
}, 5 * 60 * 1000);

export function middleware(request: NextRequest) {
    // Only rate-limit API routes
    if (!request.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.next();
    }

    // Skip rate limiting in development
    if (process.env.NODE_ENV === "development") {
        return NextResponse.next();
    }

    const ip = getClientIp(request);
    const { limited, retryAfter } = isRateLimited(ip);

    if (limited) {
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: "RATE_LIMIT",
                    message: `Too many requests. Please wait ${retryAfter} seconds.`,
                    retryable: true,
                },
            },
            {
                status: 429,
                headers: {
                    "Retry-After": String(retryAfter),
                    "Cache-Control": "no-store",
                },
            }
        );
    }

    // Enforce request body size limit (10MB)
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 10 * 1024 * 1024) {
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: "FILE_TOO_LARGE",
                    message: "Request body exceeds 10MB limit.",
                    retryable: false,
                },
            },
            { status: 413, headers: { "Cache-Control": "no-store" } }
        );
    }

    return NextResponse.next();
}

export const config = {
    matcher: "/api/:path*",
};
