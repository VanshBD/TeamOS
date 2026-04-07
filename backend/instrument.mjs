import * as Sentry from "@sentry/node";
import { ENV } from "./src/config/env.js";

Sentry.init({
  dsn: ENV.SENTRY_DSN,
  tracesSampleRate: 0.2,
  environment: ENV.NODE_ENV || "development",
  sendDefaultPii: true,
});
