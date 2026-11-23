import "server-only";

import { isDeepStrictEqual } from "node:util";
import { adminFetch } from "./admin-api";
import { formatAdminDateTime, parseApiDate } from "./admin-format";
import { OWNER_ROLE, roleLabel } from "./admin-role";

export const ACTIVITY_PATH = "/admin/activity";
export const ACTIVITY_PAGE_SIZE = 25;

export const ENTITY_TYPES = [
  { value: "blog_post", label: "Blog post" },
  { value: "enrollment", label: "Enrollment" },
  { value: "student", label: "Student" },
  { value: "conversation", label: "Conversation" },
  { value: "trial_request", label: "Trial request" },
  { value: "admin_user", label: "Admin user" },
] as const;

type EntityType = (typeof ENTITY_TYPES)[number]["value"];
type Snapshot = Record<string, unknown>;

interface AuditEntry {
  id: number;
  created_at: string;
  actor_user_id: number | null;
  actor_name: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: Snapshot | null;
  after: Snapshot | null;
  ip: string | null;
}

interface AuditPage {
  items: AuditEntry[];
  total: number;
  limit: number;
  offset: number;
}

interface ActivityQuery {
  entity: EntityType | undefined;
  actor: number | undefined;
  page: number;
  view: number | undefined;
}

const ACTION_LABELS = new Map([
  ["admin_user.create", "Created editor"],
  ["admin_user.update", "Updated admin user"],
  ["blog.create", "Created blog post"],
  ["blog.update", "Updated blog post"],
  ["blog.publish", "Published blog post"],
  ["blog.unpublish", "Unpublished blog post"],
  ["blog.delete", "Deleted blog post"],
  ["conversation.delete", "Deleted conversation"],
  ["enrollment.update_status", "Updated enrollment status"],
  ["enrollment.delete", "Deleted enrollment"],
  ["student.update", "Updated student"],
  ["student.delete", "Deleted student"],
  ["trial_request.update_status", "Updated trial request status"],
  ["trial_request.delete", "Deleted trial request"],
]);

export function parseActivityQuery(params: Record<string, string | string[] | undefined>): ActivityQuery {
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const positiveInteger = (value: string | undefined) => {
    if (!value || !/^\d+$/.test(value)) return undefined;
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0 ? number : undefined;
  };

  const entity = first(params.entity);
  const page = positiveInteger(first(params.page)) ?? 1;
  return {
    entity: ENTITY_TYPES.find((type) => type.value === entity)?.value,
    actor: positiveInteger(first(params.actor)),
    page: Math.min(page, Math.floor(Number.MAX_SAFE_INTEGER / ACTIVITY_PAGE_SIZE)),
    view: positiveInteger(first(params.view)),
  };
}

export function activityHref(query: Partial<ActivityQuery>): string {
  const params = new URLSearchParams();
  if (query.entity) params.set("entity", query.entity);
  if (query.actor) params.set("actor", String(query.actor));
  if (query.page && query.page > 1) params.set("page", String(query.page));
  if (query.view) params.set("view", String(query.view));
  const search = params.toString();
  return search ? `${ACTIVITY_PATH}?${search}` : ACTIVITY_PATH;
}

export function getAdminActivity({ entity, actor, page }: ActivityQuery) {
  const params = new URLSearchParams({
    limit: String(ACTIVITY_PAGE_SIZE),
    offset: String((page - 1) * ACTIVITY_PAGE_SIZE),
  });
  if (entity) params.set("entity_type", entity);
  if (actor) params.set("actor_user_id", String(actor));
  return adminFetch<AuditPage>(`/admin/audit-log?${params}`);
}

function fieldLabel(field: string): string {
  const label = field.replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function toActivityRow(entry: AuditEntry) {
  const type = ENTITY_TYPES.find(({ value }) => value === entry.entity_type)?.label
    ?? (fieldLabel(entry.entity_type) || "Item");
  const title = [entry.after?.title, entry.after?.name, entry.before?.title, entry.before?.name]
    .find((value): value is string => typeof value === "string" && value.trim() !== "");
  return {
    id: entry.id,
    when: formatAdminDateTime(parseApiDate(entry.created_at)),
    actor: entry.actor_name,
    role: roleLabel(entry.actor_user_id === null ? OWNER_ROLE : entry.actor_role),
    action: ACTION_LABELS.get(entry.action) ?? entry.action,
    item: entry.entity_id === null ? type : `${type} #${entry.entity_id}`,
    title,
  };
}

function sensitiveField(field: string): boolean {
  const normalized = field.replace(/[-_]/g, "").toLowerCase();
  return normalized === "password" || normalized === "passwordhash" || normalized === "confirmationtoken";
}

function displayValue(field: string, value: unknown): string {
  if (value === undefined) return "Not present";
  if (sensitiveField(field)) return "Hidden";
  if (value === null) return "Null";
  if (typeof value === "string") return value === "" ? "Empty text" : value;
  return JSON.stringify(value, (key, nested: unknown) => sensitiveField(key) ? "Hidden" : nested, 2);
}

/** Diff raw snapshots on the server and send only sanitized display values to the sheet. */
export function auditChanges({ before, after }: AuditEntry) {
  const fields = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  return Array.from(fields).flatMap((field) => {
    const previous = before && Object.hasOwn(before, field) ? before[field] : undefined;
    const current = after && Object.hasOwn(after, field) ? after[field] : undefined;
    if (isDeepStrictEqual(previous, current)) return [];
    return [{
      field,
      label: fieldLabel(field),
      before: displayValue(field, previous),
      after: displayValue(field, current),
    }];
  });
}
