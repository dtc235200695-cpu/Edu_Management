import { config } from "../config.js";

export async function requestWorker(pathname, init = {}) {
  if (!config.workerUrl || !config.workerSecret) {
    const error = new Error("Cloudflare Worker API is not configured.");
    error.status = 503;
    throw error;
  }

  const endpoint = new URL(pathname, config.workerUrl);
  const response = await fetch(endpoint, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${config.workerSecret}`,
      ...(init.body && !(init.body instanceof Buffer)
        ? { "Content-Type": "application/json" }
        : {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(result?.error || "Cloudflare Worker request failed.");
    error.status = response.status;
    throw error;
  }
  if (!result || typeof result !== "object") {
    const error = new Error("Cloudflare Worker returned an invalid response.");
    error.status = 502;
    throw error;
  }
  return result;
}

export function jsonWorkerRequest(method, body) {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export async function requestStorage(pathname, init = {}) {
  return requestWorker(pathname, init);
}

export async function fetchWorkerHealth() {
  if (!config.workerUrl) {
    const error = new Error("CLOUDFLARE_WORKER_URL is not configured.");
    error.status = 503;
    throw error;
  }
  const response = await fetch(new URL("/health", config.workerUrl), {
    signal: AbortSignal.timeout(5000),
  });
  const result = await response.json().catch(() => null);
  if (
    !response.ok ||
    result?.success !== true ||
    result?.database !== "connected" ||
    result?.storage !== "connected"
  ) {
    const error = new Error(
      result?.error || "Cloudflare Worker or D1 health check failed.",
    );
    error.status = 502;
    throw error;
  }
  return result;
}

export async function findUser(identifier) {
  const query = new URLSearchParams({ identifier });
  const result = await requestWorker(
    `/internal/users/lookup?${query.toString()}`,
  );
  return result.user || null;
}

export async function findUserById(id) {
  return findUser(id);
}

export function publicUser(record, mustChangePassword = false) {
  const roleDetails = {
    admin: {
      roleTitle: "Quản trị viên",
      roleBadge: "Quản trị viên",
      department: "Quản trị hệ thống",
    },
    lecturer: {
      roleTitle: "Giảng viên",
      roleBadge: "Giảng viên",
      department: "Đào tạo",
    },
    student: {
      roleTitle: "Sinh viên",
      roleBadge: "Sinh viên",
      department: "Sinh viên",
    },
  }[record.role];
  if (!roleDetails) return null;
  const avatarText = record.name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    picture: record.picture || "",
    role: record.role,
    ...roleDetails,
    avatarText,
    studentId: record.student_id || undefined,
    mustChangePassword,
  };
}

export function toAdminUser(record) {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    role: record.role,
    studentId: record.student_id || "",
    status: record.status,
    mustChangePassword: Boolean(record.must_change_password),
    createdAt: record.created_at,
  };
}
