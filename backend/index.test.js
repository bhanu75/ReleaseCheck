// backend/index.test.js
const request = require("supertest");

// Mock pg before requiring app
jest.mock("pg", () => {
  const rows = new Map();
  const query = jest.fn(async (sql, params = []) => {
    if (sql.includes("CREATE TABLE")) return { rows: [] };
    if (sql.startsWith("SELECT * FROM releases WHERE id")) {
      const r = rows.get(params[0]);
      return { rows: r ? [r] : [] };
    }
    if (sql.startsWith("SELECT * FROM releases ORDER")) {
      return { rows: [...rows.values()].sort((a, b) => b.created_at - a.created_at) };
    }
    if (sql.startsWith("INSERT")) {
      const row = { id: params[0], name: params[1], date: params[2], info: params[3], completed_steps: [], created_at: new Date() };
      rows.set(row.id, row);
      return { rows: [row] };
    }
    if (sql.includes("completed_steps")) {
      const row = rows.get(params[1]);
      if (!row) return { rows: [] };
      row.completed_steps = params[0];
      return { rows: [row] };
    }
    if (sql.includes("SET info")) {
      const row = rows.get(params[1]);
      if (!row) return { rows: [] };
      row.info = params[0];
      return { rows: [row] };
    }
    if (sql.startsWith("DELETE")) {
      const had = rows.delete(params[0]);
      return { rowCount: had ? 1 : 0 };
    }
    return { rows: [] };
  });
  return { Pool: jest.fn(() => ({ query })) };
});

const app = require("./index");

describe("Releases API", () => {
  let id;

  test("GET /releases → empty array", async () => {
    const res = await request(app).get("/releases");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("POST /releases → creates release", async () => {
    const res = await request(app).post("/releases").send({ name: "v1.0", date: "2025-01-01T00:00:00Z" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("v1.0");
    expect(res.body.status).toBe("planned");
    id = res.body.id;
  });

  test("POST /releases → 400 without name", async () => {
    const res = await request(app).post("/releases").send({ date: "2025-01-01" });
    expect(res.status).toBe(400);
  });

  test("PATCH /releases/:id/steps → updates steps + status", async () => {
    const res = await request(app).patch(`/releases/${id}/steps`).send({ completedSteps: [0, 1, 2] });
    expect(res.status).toBe(200);
    expect(res.body.completedSteps).toEqual([0, 1, 2]);
    expect(res.body.status).toBe("ongoing");
  });

  test("PATCH /releases/:id/info → updates info", async () => {
    const res = await request(app).patch(`/releases/${id}/info`).send({ info: "Some notes" });
    expect(res.status).toBe(200);
    expect(res.body.info).toBe("Some notes");
  });

  test("DELETE /releases/:id → 204", async () => {
    const res = await request(app).delete(`/releases/${id}`);
    expect(res.status).toBe(204);
  });

  test("DELETE /releases/nonexistent → 404", async () => {
    const res = await request(app).delete("/releases/nonexistent");
    expect(res.status).toBe(404);
  });

  test("GET /health → ok", async () => {
    const res = await request(app).get("/health");
    expect(res.body.ok).toBe(true);
  });
});
