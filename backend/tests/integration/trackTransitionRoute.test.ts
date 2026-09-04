import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { signToken, createCampusCohortStudent } from "../helpers";
import { testAdminId } from "../setup";

const app = createApp();

describe("POST /api/students/:id/track-transition (Move Student)", () => {
  it("performs a routine manual move and returns the created transition", async () => {
    const { student } = await createCampusCohortStudent(testAdminId);
    const token = signToken(testAdminId);

    const res = await request(app)
      .post(`/api/students/${student.id}/track-transition`)
      .set("Authorization", `Bearer ${token}`)
      .send({ toTrack: "A", toStage: "VIDEO_ASSESSMENT", toProgramStatus: "ACTIVE", reason: "Manual routing after paper review.", sourceType: "MANUAL" });

    expect(res.status).toBe(201);
    expect(res.body.data.toTrack).toBe("A");
    expect(res.body.data.sourceType).toBe("MANUAL");
  });

  it("rejects a non-routine move without an override reason", async () => {
    const { student } = await createCampusCohortStudent(testAdminId);
    const token = signToken(testAdminId);
    await request(app)
      .post(`/api/students/${student.id}/track-transition`)
      .set("Authorization", `Bearer ${token}`)
      .send({ toTrack: "A", toStage: "VIDEO_ASSESSMENT", toProgramStatus: "ACTIVE", reason: "Initial routing.", sourceType: "MANUAL" });

    const res = await request(app)
      .post(`/api/students/${student.id}/track-transition`)
      .set("Authorization", `Bearer ${token}`)
      .send({ toTrack: "B", toStage: "B_DEVELOPMENT", toProgramStatus: "ACTIVE", reason: "Casual demotion attempt.", sourceType: "MANUAL" });

    expect(res.status).toBe(409);
  });

  it("rejects a reason shorter than the minimum meaningful length", async () => {
    const { student } = await createCampusCohortStudent(testAdminId);
    const token = signToken(testAdminId);
    const res = await request(app)
      .post(`/api/students/${student.id}/track-transition`)
      .set("Authorization", `Bearer ${token}`)
      .send({ toTrack: "A", toStage: "VIDEO_ASSESSMENT", toProgramStatus: "ACTIVE", reason: "ok", sourceType: "MANUAL" });

    expect(res.status).toBe(422);
  });
});
