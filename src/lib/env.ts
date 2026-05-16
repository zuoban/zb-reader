import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Authentication
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters").optional(),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters").optional(),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),

  // TTS
  ZB_READER_ALLOW_PRIVATE_TTS_URLS: z
    .string()
    .default("false")
    .transform((val) => val === "true"),

  // Logging
  ZB_READER_LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .default("info"),

  // Database (optional, defaults to data/db.sqlite)
  DATABASE_URL: z.string().optional(),
}).superRefine((env, ctx) => {
  if (env.NODE_ENV === "production" && !env.NEXTAUTH_SECRET && !env.AUTH_SECRET) {
    ctx.addIssue({
      code: "custom",
      path: ["NEXTAUTH_SECRET"],
      message: "NEXTAUTH_SECRET or AUTH_SECRET is required in production",
    });
  }
}).transform((env) => ({
  ...env,
  NEXTAUTH_SECRET:
    env.NEXTAUTH_SECRET ??
    env.AUTH_SECRET ??
    "development-secret-change-this-32chars",
}));

export type EnvConfig = z.infer<typeof envSchema>;

let envConfig: EnvConfig | null = null;

export function validateEnv(): EnvConfig {
  if (envConfig) return envConfig;

  try {
    envConfig = envSchema.parse(process.env);
    return envConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("\n");
      throw new Error(`Invalid environment variables:\n${issues}`);
    }
    throw error;
  }
}

// Validate on module load
if (process.env.NODE_ENV !== "test") {
  validateEnv();
}
