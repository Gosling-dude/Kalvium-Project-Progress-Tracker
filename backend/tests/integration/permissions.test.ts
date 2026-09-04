import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { createUser, signToken } from "../helpers";
import { testAdminId } from "../setup";

const app = createApp();

describe("Authorization", () => {
  it("rejects unauthenticated requests to admin endpoints", async () => {
    const res = await request(app).get("/api/students");
    expect(res.status).toBe(401);
  });

  it("allows an ADMIN to reach admin endpoints", async () => {
    const token = signToken(testAdminId);
    const res = await request(app).get("/api/students").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("rejects a TEACHING_NINJA from admin-only endpoints (future-role scaffolding)", async () => {
    const ninja = await createUser("TEACHING_NINJA", "ninja@kalvium.example");
    const token = signToken(ninja.id);
    const res = await request(app).get("/api/students").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("rejects a request with a garbage token", async () => {
    const res = await request(app).get("/api/students").set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });

  it("exposes a health check without authentication", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
