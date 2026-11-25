import app from "./app.js";
import { config, missingOAuthSettings } from "./config.js";

app.listen(config.port, () => {
  console.log(`Learnwise API listening on http://localhost:${config.port}`);
  if (config.redirectUri) {
    console.log(`Google OAuth callback URL: ${config.redirectUri}`);
  }
  if (missingOAuthSettings.length > 0) {
    console.warn(
      `Google sign-in is disabled. Configure: ${missingOAuthSettings.join(", ")}`,
    );
  }
});
