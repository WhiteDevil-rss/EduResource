import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Disable experimental features that might cause issues on Windows
  experimental: {
    disableStreaming: true,
  },
  // Mark jose and jwks-rsa as external to avoid bundling issues
  external: ["jose", "jwks-rsa"],
});
