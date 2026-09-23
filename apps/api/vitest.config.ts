import { defineConfig } from "vitest/config";

// Unit tests here are DB-free (services/routes that hit Postgres are
// exercised via the seed + manual/API-level testing described in the
// README rather than a full integration suite against a live test DB).
// These env vars just need to exist so importing ./env doesn't throw.
export default defineConfig({
  test: {
    environment: "node",
    env: {
      DATABASE_URL: "postgresql://forms_app:forms_app@localhost:5432/forms_app_test?schema=public",
      JWT_SECRET: "test-secret-key-for-vitest-do-not-use-in-prod",
      JWT_EXPIRES_IN_SECONDS: "3600",
    },
  },
});
