import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
    // Server-side env vars — never exposed to client
    server: {
        GEMINI_API_KEY: z
            .string()
            .min(1, "GEMINI_API_KEY is required. Get one at https://aistudio.google.com/app/apikey"),
        GEMINI_MODEL: z.string().default("gemini-2.5-pro"),
        GEMINI_TIMEOUT_MS: z.coerce.number().default(30000),
        GEMINI_MAX_RETRIES: z.coerce.number().default(3),
    },

    // Client-side env vars — must be prefixed with NEXT_PUBLIC_
    client: {
        NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
        NEXT_PUBLIC_APP_NAME: z.string().default("TaaToIbo"),
        NEXT_PUBLIC_MAX_FILE_SIZE_MB: z.coerce.number().default(10),
        NEXT_PUBLIC_ACCEPTED_TYPES: z.string().default("image/jpeg,image/png,image/webp"),
        NEXT_PUBLIC_ENABLE_SVG_EXPORT: z.coerce.boolean().default(true),
        NEXT_PUBLIC_ENABLE_SAMPLE_IMAGES: z.coerce.boolean().default(true),
        NEXT_PUBLIC_ENABLE_MANUAL_SELECTION: z.coerce.boolean().default(true),
    },

    // Runtime env mapping — required by @t3-oss/env-nextjs
    runtimeEnv: {
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        GEMINI_MODEL: process.env.GEMINI_MODEL,
        GEMINI_TIMEOUT_MS: process.env.GEMINI_TIMEOUT_MS,
        GEMINI_MAX_RETRIES: process.env.GEMINI_MAX_RETRIES,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
        NEXT_PUBLIC_MAX_FILE_SIZE_MB: process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB,
        NEXT_PUBLIC_ACCEPTED_TYPES: process.env.NEXT_PUBLIC_ACCEPTED_TYPES,
        NEXT_PUBLIC_ENABLE_SVG_EXPORT: process.env.NEXT_PUBLIC_ENABLE_SVG_EXPORT,
        NEXT_PUBLIC_ENABLE_SAMPLE_IMAGES: process.env.NEXT_PUBLIC_ENABLE_SAMPLE_IMAGES,
        NEXT_PUBLIC_ENABLE_MANUAL_SELECTION: process.env.NEXT_PUBLIC_ENABLE_MANUAL_SELECTION,
    },
});
