import { BadRequestError } from "../errors/app-error";

// The cloud metadata endpoint used by AWS, GCP, Azure, and DigitalOcean
// alike. It has no legitimate use as a webhook destination for anyone, on
// any network — unlike a private/loopback address, which this app's own
// documented workflow deliberately points webhooks at (the webhook-consumer
// demo app in `apps/webhook-consumer` runs on localhost; see README). So
// this guard blocks only the one address with zero legitimate use case,
// rather than blanket-blocking private ranges, which would break that
// intended architecture.
const CLOUD_METADATA_HOSTS = new Set(["169.254.169.254", "metadata.google.internal"]);

/**
 * Minimal, best-effort SSRF guard for webhook URLs. This intentionally does
 * NOT block localhost/private-network addresses in general — this app's
 * spec requires the webhook to be able to target a same-network consumer
 * app, so a blanket private-range block would break the feature it's
 * supposed to protect. It also does not resolve DNS to catch a public
 * hostname that resolves to a private address (DNS rebinding) or guard
 * against redirects — a production system going further than this
 * take-home would need both. Documented as a known, deliberate limitation.
 */
export function assertSafeWebhookUrl(rawUrl: string): void {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BadRequestError("Webhook URL is not a valid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BadRequestError("Webhook URL must use http or https");
  }

  if (CLOUD_METADATA_HOSTS.has(url.hostname.toLowerCase())) {
    throw new BadRequestError("Webhook URL must not point to a cloud metadata endpoint");
  }
}
