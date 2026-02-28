import { NextRequest, NextResponse } from "next/server";

/**
 * Rate limiter — production only.
 * In development, all requests pass through without limits.
 */

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

function getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return request.headers.get("x-real-ip") || "unknown";
}

export function middleware(request: NextRequest) {
    // Only apply to API routes
    if (!request.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.next();
    }

    // No rate limiting in development
    if (!IS_PRODUCTION) {
        return NextResponse.next();
    }

    // --- Production rate limiting ---
    const ip = getClientIp(request);
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    } else if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
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
    } else {
        entry.count++;
    }

    // Enforce 10MB body size limit
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
            { status: 413 }
        );
    }

    return NextResponse.next();
}

export const config = {
    matcher: "/api/:path*",
};
