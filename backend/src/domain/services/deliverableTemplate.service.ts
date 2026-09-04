import { prisma } from "../../lib/prisma";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { recordAuditEvent } from "./audit.service";
import type { DeliverableTrack, SubmissionType } from "../constants/enums";

export interface DeliverableTemplateInput {
  key: string;
  title: string;
  gapAddressed: string;
  whatStudentMustDo: string;
  expectedOutcome: string;
  submissionType: SubmissionType;
  submissionRequired: string;
  submissionDetails?: string;
  verificationCriteria: string;
  estimatedTime?: string;
  track: DeliverableTrack;
  order?: number;
}

export async function createDeliverableTemplate(input: DeliverableTemplateInput, actorId: string) {
  const existing = await prisma.deliverableTemplate.findUnique({ where: { key: input.key } });
  if (existing) throw new ValidationError(`A deliverable template with key '${input.key}' already exists.`);

  const template = await prisma.deliverableTemplate.create({ data: { ...input, version: 1 } });
  await recordAuditEvent({
    actorId,
    action: "DELIVERABLE_TEMPLATE_CREATED",
    entityType: "DeliverableTemplate",
    entityId: template.id,
    after: template,
  });
  return template;
}

// Editing a template bumps its version but does NOT touch historical
// DeliverableAssignment rows — those keep the templateSnapshot captured at
// assignment time (see deliverable.service.ts).
export async function updateDeliverableTemplate(
  id: string,
  input: Partial<DeliverableTemplateInput>,
  actorId: string,
) {
  const template = await prisma.deliverableTemplate.findUnique({ where: { id } });
  if (!template) throw new NotFoundError("DeliverableTemplate", id);

  const updated = await prisma.deliverableTemplate.update({
    where: { id },
    data: { ...input, version: template.version + 1 },
  });

  await recordAuditEvent({
    actorId,
    action: "DELIVERABLE_TEMPLATE_UPDATED",
    entityType: "DeliverableTemplate",
    entityId: id,
    before: template,
    after: updated,
  });
  return updated;
}

export async function duplicateDeliverableTemplate(id: string, newKey: string, actorId: string) {
  const template = await prisma.deliverableTemplate.findUnique({ where: { id } });
  if (!template) throw new NotFoundError("DeliverableTemplate", id);
  const existing = await prisma.deliverableTemplate.findUnique({ where: { key: newKey } });
  if (existing) throw new ValidationError(`A deliverable template with key '${newKey}' already exists.`);

  const { id: _id, createdAt, updatedAt, ...rest } = template;
  const duplicate = await prisma.deliverableTemplate.create({
    data: { ...rest, key: newKey, title: `${template.title} (copy)`, version: 1 },
  });

  await recordAuditEvent({
    actorId,
    action: "DELIVERABLE_TEMPLATE_DUPLICATED",
    entityType: "DeliverableTemplate",
    entityId: duplicate.id,
    after: { sourceId: id },
  });
  return duplicate;
}

export async function archiveDeliverableTemplate(id: string, actorId: string) {
  const template = await prisma.deliverableTemplate.findUnique({ where: { id } });
  if (!template) throw new NotFoundError("DeliverableTemplate", id);

  const updated = await prisma.deliverableTemplate.update({ where: { id }, data: { active: false } });
  await recordAuditEvent({
    actorId,
    action: "DELIVERABLE_TEMPLATE_ARCHIVED",
    entityType: "DeliverableTemplate",
    entityId: id,
  });
  return updated;
}

export async function listDeliverableTemplates(track?: DeliverableTrack) {
  return prisma.deliverableTemplate.findMany({
    where: track ? { OR: [{ track }, { track: "BOTH" }] } : undefined,
    orderBy: [{ track: "asc" }, { order: "asc" }],
  });
}
