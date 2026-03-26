import type { Config } from "drizzle-kit";

export default {
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/db.sqlite",
  },
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
} satisfies Config;
