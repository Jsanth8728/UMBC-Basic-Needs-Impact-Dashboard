export const SESSION_KEY = "umbc-basic-needs-session";

async function authRequest(path, options) {
  let response;
  try {
    response = await fetch(path, options);
  } catch {
    throw new Error("Unable to reach the login service. Please try again.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(typeof data?.detail === "string" ? data.detail : "Login service unavailable. Please try again.");
  }
  if (!data || typeof data.user_id !== "string" || typeof data.role !== "string" ||
      !Number.isFinite(Date.parse(data.expires_at)) || Date.parse(data.expires_at) <= Date.now()) {
    throw new Error("Invalid login response. Please try again.");
  }
  return data;
}

export async function login(userId, password) {
  const session = await authRequest("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ user_id: userId, password }),
  });
  if (typeof session.access_token !== "string" || !session.access_token || session.token_type !== "bearer") {
    throw new Error("Invalid login response. Please try again.");
  }
  return session;
}

export async function restoreSession(token) {
  const user = await authRequest("/api/me", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  return { ...user, access_token: token, token_type: "bearer" };
}
