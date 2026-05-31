// frontend/src/api.js
const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  getReleases:       ()             => req("GET",   "/releases"),
  getRelease:        (id)           => req("GET",   `/releases/${id}`),
  createRelease:     (body)         => req("POST",  "/releases", body),
  updateSteps:       (id, steps)    => req("PATCH", `/releases/${id}/steps`, { completedSteps: steps }),
  updateInfo:        (id, info)     => req("PATCH", `/releases/${id}/info`,  { info }),
  deleteRelease:     (id)           => req("DELETE",`/releases/${id}`),
};
