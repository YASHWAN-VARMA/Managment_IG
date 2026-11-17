
const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3333";

// Prevent multiple simultaneous refresh requests.
let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${BASE_URL}/refresh`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          throw new Error("Refresh failed");
        }

        const data = await response.json();
        const token = data.accessToken || data.token;

        if (!token) {
          throw new Error("New access token missing");
        }

        localStorage.setItem("mg_access_token", token);
        return token;
      } catch {
        localStorage.removeItem("mg_access_token");
        localStorage.removeItem("mg_user");

        window.location.replace("/login");
        return null;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function request(path, options = {}, retry = true) {
  const { auth = true, ...fetchOptions } = options;

  const headers = { ...(fetchOptions.headers || {}) };

  if (!(fetchOptions.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = localStorage.getItem("mg_access_token");

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
    credentials: "include",
    body:
      fetchOptions.body && !(fetchOptions.body instanceof FormData)
        ? JSON.stringify(fetchOptions.body)
        : fetchOptions.body,
  });

  // Automatically refresh an expired access token.
  if (response.status === 401 && auth && retry) {
    const newToken = await refreshAccessToken();

    if (!newToken) {
      throw new Error("Please sign in again.");
    }

    return request(path, options, false);
  }

  const contentType = response.headers.get("content-type") || "";

  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "object"
        ? payload.message || payload.error
        : payload;

    throw new Error(message || `Request failed (${response.status})`);
  }

  return payload;
}

export const api = {
  get: (path, options) => request(path, options),

  post: (path, body, options) =>
    request(path, { method: "POST", body, ...options }),

  put: (path, body, options) =>
    request(path, { method: "PUT", body, ...options }),

  patch: (path, body, options) =>
    request(path, { method: "PATCH", body, ...options }),

  delete: (path, options) =>
    request(path, { method: "DELETE", ...options }),
};

export function unwrapList(data) {
  if (Array.isArray(data)) return data;

  if (!data || typeof data !== "object") return [];

  for (const key of [
    "vehicles",
    "drivers",
    "trips",
    "advances",
    "fuelEntries",
    "documents",
    "data",
    "results",
  ]) {
    if (Array.isArray(data[key])) return data[key];
  }

  return [];
}

export function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function dateLabel(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}