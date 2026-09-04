import { describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { previewEmail, sendEmail } from "../../src/domain/services/email.service";
import { createCampusCohortStudent } from "../helpers";
import { testAdminId } from "../setup";

describe("Email system", () => {
  it("renders template placeholders in the preview without sending or logging anything", async () => {
    const { student } = await createCampusCohortStudent(testAdminId);
    const preview = await previewEmail({
      templateKey: "TRACK_A_VIDEO_RESULT",
      recipients: [{ studentId: student.id, emailAddress: student.email, variables: { studentName: "Test Student", track: "A1", feedback: "Great work.", nextStep: "Schedule your A1 interview." } }],
    });

    expect(preview.recipients[0].body).toContain("Test Student");
    expect(preview.recipients[0].body).toContain("A1");
    const eventsAfterPreview = await prisma.emailEvent.count();
    expect(eventsAfterPreview).toBe(0);
  });

  it("sends via the mock provider and logs an EmailEvent + EmailRecipient + delivery attempt", async () => {
    const { student } = await createCampusCohortStudent(testAdminId);
    const result = await sendEmail({
      templateKey: "TRACK_A_VIDEO_RESULT",
      recipients: [{ studentId: student.id, emailAddress: student.email, variables: { studentName: "Test Student", track: "A1", feedback: "Great work.", nextStep: "Schedule your interview." } }],
      triggeredById: testAdminId,
    });

    expect(result.status).toBe("SENT");
    expect(result.sentCount).toBe(1);

    const event = await prisma.emailEvent.findUniqueOrThrow({ where: { id: result.emailEventId }, include: { recipients: { include: { attempts: true } } } });
    expect(event.recipients).toHaveLength(1);
    expect(event.recipients[0].status).toBe("SENT");
    expect(event.recipients[0].sentAt).not.toBeNull();
    expect(event.recipients[0].attempts).toHaveLength(1);
    expect(event.recipients[0].attempts[0].providerMessageId).toMatch(/^mock-/);
  });

  it("rejects a send with zero recipients rather than silently no-op'ing", async () => {
    await expect(
      sendEmail({ templateKey: "TRACK_A_VIDEO_RESULT", recipients: [], triggeredById: testAdminId }),
    ).rejects.toThrow();
  });

  it("rejects a send containing an invalid recipient address", async () => {
    const { student } = await createCampusCohortStudent(testAdminId);
    await expect(
      sendEmail({
        templateKey: "TRACK_A_VIDEO_RESULT",
        recipients: [{ studentId: student.id, emailAddress: "not-an-email", variables: {} }],
        triggeredById: testAdminId,
      }),
    ).rejects.toThrow();
  });
});
