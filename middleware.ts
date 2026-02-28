import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
    // Enforce 10MB body size limit on API routes
    if (request.nextUrl.pathname.startsWith("/api/")) {
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
    }

    return NextResponse.next();
}

export const config = {
    matcher: "/api/:path*",
};
