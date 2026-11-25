import { requestWorker, jsonWorkerRequest } from "./cloudflare.js";
import { sendTemporaryPassword } from "./email.js";
import { createTemporaryPassword, hashPassword } from "./password.js";

export async function deliverTemporaryPassword(
  user,
  temporaryPassword = createTemporaryPassword(),
) {
  const claim = await requestWorker(
    `/internal/users/${encodeURIComponent(user.id)}/password-email`,
    jsonWorkerRequest("POST", {
      operation: "claim",
      password_hash: await hashPassword(temporaryPassword),
    }),
  );
  if (!claim.claimed) return false;

  try {
    await sendTemporaryPassword(user.email, user.name, temporaryPassword);
    await requestWorker(
      `/internal/users/${encodeURIComponent(user.id)}/password-email`,
      jsonWorkerRequest("POST", { operation: "sent" }),
    );
    return true;
  } catch (error) {
    const deliveryError = new Error(
      error instanceof Error ? error.message : "Email delivery failed.",
      { cause: error },
    );
    deliveryError.emailDelivery = true;
    try {
      await requestWorker(
        `/internal/users/${encodeURIComponent(user.id)}/password-email`,
        jsonWorkerRequest("POST", { operation: "release" }),
      );
    } catch (releaseError) {
      console.error("Temporary password delivery lock could not be released:", releaseError.name || "Error");
    }
    throw deliveryError;
  }
}
