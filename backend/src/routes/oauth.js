import crypto from "node:crypto";
import express from "express";
import {
  config,
  oauthClient,
  missingOAuthSettings,
  oauthCookieName,
  oauthStateAudience,
} from "../config.js";
import {
  clearCookie,
  createJwt,
  issueSession,
  readCookies,
  setCookie,
  verifyJwt,
} from "../middleware/session.js";
import { findUserById, jsonWorkerRequest, requestWorker } from "../services/cloudflare.js";
import { deliverTemporaryPassword } from "../services/account-email.js";
import { createTemporaryPassword, hashPassword } from "../services/password.js";

const router = express.Router();

function redirectWithStatus(status) {
  const redirect = new URL(config.appUrl);
  redirect.searchParams.set("authError", status);
  return redirect.toString();
}

function redirectWithWarning(warning) {
  const redirect = new URL(config.appUrl);
  redirect.searchParams.set("authWarning", warning);
  return redirect.toString();
}

router.get("/auth/google", async (_req, res, next) => {
  if (!oauthClient) {
    return res.status(503).json({
      error: "Đăng nhập Google chưa được cấu hình.",
      missingSettings: missingOAuthSettings,
    });
  }
  try {
    const state = crypto.randomBytes(32).toString("base64url");
    const nonce = crypto.randomBytes(32).toString("base64url");
    const stateToken = await createJwt(
      { state, nonce },
      oauthStateAudience,
      10 * 60,
    );
    setCookie(res, oauthCookieName, stateToken, 10 * 60);
    res.set("Cache-Control", "no-store");
    const authorizationUrl = oauthClient.generateAuthUrl({
      access_type: "online",
      prompt: "select_account",
      scope: ["openid", "email", "profile"],
      state,
      nonce,
    });
    res.redirect(authorizationUrl);
  } catch (error) {
    next(error);
  }
});

router.get("/auth/google/callback", async (req, res, next) => {
  const cookies = readCookies(req.headers.cookie);
  let oauthState;
  try {
    oauthState = await verifyJwt(cookies[oauthCookieName], oauthStateAudience);
  } catch (error) {
    clearCookie(res, oauthCookieName);
    return next(error);
  }
  clearCookie(res, oauthCookieName);

  if (req.query.error) return res.redirect(redirectWithStatus("cancelled"));
  if (
    !oauthClient ||
    typeof req.query.code !== "string" ||
    typeof req.query.state !== "string" ||
    typeof oauthState?.state !== "string" ||
    typeof oauthState.nonce !== "string" ||
    oauthState.state !== req.query.state
  ) {
    return res.redirect(redirectWithStatus("invalid_state"));
  }

  try {
    const { tokens } = await oauthClient.getToken(req.query.code);
    if (!tokens.id_token) throw new Error("Google did not return an ID token.");
    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const claims = ticket.getPayload();
    if (
      !claims ||
      claims.nonce !== oauthState.nonce ||
      !claims.email ||
      claims.email_verified !== true
    ) {
      throw new Error("Google identity claims failed validation.");
    }

    const temporaryPassword = createTemporaryPassword();
    const result = await requestWorker(
      "/internal/users/google",
      jsonWorkerRequest("POST", {
        email: claims.email,
        name: claims.name || claims.email,
        picture: claims.picture || "",
        google_sub: claims.sub,
        password_hash: await hashPassword(temporaryPassword),
      }),
    );
    let record = result.user;
    if (!record) throw new Error("Google account could not be saved.");
    let emailDeliveryFailed = false;
    if (result.created || !record.password_email_sent_at) {
      try {
        await deliverTemporaryPassword(record, temporaryPassword);
      } catch (error) {
        if (record.email.toLowerCase() !== config.adminEmail) throw error;
        emailDeliveryFailed = true;
      } finally {
        record = await findUserById(record.id);
      }
    }
    if (record.status !== "active" || record.role === "pending") {
      return res.redirect(redirectWithStatus("pending"));
    }

    await issueSession(res, record, false);
    res.set("Cache-Control", "no-store");
    return res.redirect(
      emailDeliveryFailed
        ? redirectWithWarning("email_unavailable")
        : config.appUrl,
    );
  } catch (error) {
    console.error("Google OAuth callback failed:", error.name || "Error");
    return res.redirect(
      redirectWithStatus(error.emailDelivery ? "email_unavailable" : "oauth_failed"),
    );
  }
});

export default router;
