import { prisma } from "../../lib/prisma";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { recordAuditEvent } from "./audit.service";
import { getEmailProvider } from "./emailProvider";
import type { EmailTemplateKey } from "../constants/enums";

function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => variables[key] ?? "");
}

export async function listEmailTemplates() {
  return prisma.emailTemplate.findMany({ orderBy: { key: "asc" } });
}

export async function updateEmailTemplate(
  id: string,
  input: Partial<{ name: string; subject: string; bodyHtml: string; active: boolean }>,
  actorId: string,
) {
  const template = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!template) throw new NotFoundError("EmailTemplate", id);
  const updated = await prisma.emailTemplate.update({
    where: { id },
    data: { ...input, version: template.version + 1 },
  });
  await recordAuditEvent({
    actorId,
    action: "EMAIL_TEMPLATE_UPDATED",
    entityType: "EmailTemplate",
    entityId: id,
    before: template,
    after: updated,
  });
  return updated;
}

export interface EmailRecipientInput {
  studentId: string;
  emailAddress: string;
  variables: Record<string, string>;
  videoAssignmentId?: string;
  interviewId?: string;
  // When set, sent verbatim instead of being re-rendered from the template —
  // this is what makes "admin can edit the content before sending" real for
  // every workflow that reuses this one send path (spec section 19).
  bodyOverride?: string;
}

export interface PreviewResult {
  templateKey: string;
  subject: string;
  recipients: { studentId: string; emailAddress: string; body: string }[];
}

export async function previewEmail(input: {
  templateKey: EmailTemplateKey;
  recipients: EmailRecipientInput[];
}): Promise<PreviewResult> {
  const template = await prisma.emailTemplate.findUnique({ where: { key: input.templateKey } });
  if (!template) throw new NotFoundError("EmailTemplate", input.templateKey);
  if (input.recipients.length === 0) {
    throw new ValidationError("At least one recipient is required to preview an email.");
  }

  return {
    templateKey: input.templateKey,
    subject: template.subject,
    recipients: input.recipients.map((r) => ({
      studentId: r.studentId,
      emailAddress: r.emailAddress,
      body: renderTemplate(template.bodyHtml, r.variables),
    })),
  };
}

export async function sendEmail(input: {
  templateKey: EmailTemplateKey;
  recipients: EmailRecipientInput[];
  relatedEntityType?: string;
  relatedEntityId?: string;
  subjectOverride?: string;
  triggeredById: string;
}) {
  const template = await prisma.emailTemplate.findUnique({ where: { key: input.templateKey } });
  if (!template) throw new NotFoundError("EmailTemplate", input.templateKey);
  if (!template.active) throw new ValidationError(`Email template '${input.templateKey}' is not active.`);
  if (input.recipients.length === 0) {
    throw new ValidationError("Bulk send rejected: recipient list resolved to zero students.");
  }
  const invalid = input.recipients.filter((r) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.emailAddress));
  if (invalid.length > 0) {
    throw new ValidationError(
      `Refusing to send: invalid recipient address(es) for ${invalid.map((r) => r.studentId).join(", ")}`,
    );
  }

  const subject = input.subjectOverride ?? template.subject;

  const event = await prisma.emailEvent.create({
    data: {
      templateId: template.id,
      templateKeySnapshot: template.key,
      subjectRendered: subject,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      triggeredById: input.triggeredById,
      recipients: {
        create: input.recipients.map((r) => ({
          studentId: r.studentId,
          emailAddress: r.emailAddress,
          bodyRendered: r.bodyOverride ?? renderTemplate(template.bodyHtml, r.variables),
          videoAssignmentId: r.videoAssignmentId,
          interviewId: r.interviewId,
        })),
      },
    },
    include: { recipients: true },
  });

  const provider = getEmailProvider();
  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of event.recipients) {
    const result = await provider.send({
      to: recipient.emailAddress,
      subject,
      html: recipient.bodyRendered,
    });
    await prisma.$transaction([
      prisma.emailRecipient.update({
        where: { id: recipient.id },
        data: { status: result.status, sentAt: result.status === "SENT" ? new Date() : null },
      }),
      prisma.emailDeliveryAttempt.create({
        data: {
          emailRecipientId: recipient.id,
          status: result.status,
          providerMessageId: result.providerMessageId,
          errorMessage: result.errorMessage,
        },
      }),
    ]);
    if (result.status === "SENT") sentCount++;
    else failedCount++;
  }

  const finalStatus = failedCount === 0 ? "SENT" : sentCount === 0 ? "FAILED" : "PARTIAL";
  await prisma.emailEvent.update({ where: { id: event.id }, data: { status: finalStatus } });

  await recordAuditEvent({
    actorId: input.triggeredById,
    action: "EMAIL_SENT",
    entityType: "EmailEvent",
    entityId: event.id,
    after: { templateKey: input.templateKey, sentCount, failedCount },
  });

  return { emailEventId: event.id, status: finalStatus, sentCount, failedCount, totalRecipients: event.recipients.length };
}

export async function listEmailEventsForStudent(studentId: string) {
  return prisma.emailRecipient.findMany({
    where: { studentId },
    include: { emailEvent: { include: { template: true } }, attempts: true },
    orderBy: { id: "desc" },
  });
}

export async function listEmailEvents(page = 1, pageSize = 25) {
  const [total, events] = await Promise.all([
    prisma.emailEvent.count(),
    prisma.emailEvent.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { template: true, triggeredBy: { select: { name: true } }, recipients: true },
    }),
  ]);
  return { data: events, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}
