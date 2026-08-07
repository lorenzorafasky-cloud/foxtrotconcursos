import { apiRequest } from "./api";

export type Page<T> = { items: T[]; total: number; page: number; limit: number; pages: number };
export type CatalogItem = { id: string; name: string };
export type CourseStatus = "PRE_EDITAL" | "POS_EDITAL";
export type RoleName = "ADMIN_MASTER" | "PROFESSOR" | "ALUNO_ILIMITADO" | "ALUNO_CURSO_ESPECIFICO";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELED";
export type QuestionKind = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "DISCURSIVE";

export type AdminDashboard = {
  users: number;
  courses: number;
  lessons: number;
  questions: number;
  simulations: number;
  coupons: number;
  pendingModeration: number;
  payments: Array<{ status: PaymentStatus; _sum: { amountCents?: number | null }; _count: number }>;
  recentAudit: AuditLog[];
};

export type AdminCatalog = {
  roles: RoleRow[];
  permissions: PermissionRow[];
  boards: CatalogItem[];
  careers: CatalogItem[];
  subjects: Array<CatalogItem & { topics: CatalogItem[] }>;
  institutions: CatalogItem[];
  positions: CatalogItem[];
  courses: Array<{ id: string; title: string }>;
  teachers: Array<{ id: string; fullName: string; nickname: string; email: string }>;
  courseStatuses: CourseStatus[];
  roleNames: RoleName[];
  paymentStatuses: PaymentStatus[];
  entitlementTypes: string[];
  questionKinds: QuestionKind[];
  featureFlags: string[];
};

export type PermissionRow = { id: string; key: string; description: string };
export type RoleRow = { id: string; name: RoleName; description: string; permissions: Array<{ permission: PermissionRow }> };

export type UserRow = {
  id: string;
  email: string;
  fullName: string;
  nickname: string;
  emailVerifiedAt?: string | null;
  twoFactorEnabled: boolean;
  roles: Array<{ role: { name: RoleName } }>;
  permissions: Array<{ granted: boolean; permission: PermissionRow }>;
};

export type CourseRow = {
  id: string;
  title: string;
  slug: string;
  status: CourseStatus;
  area: string;
  publishedAt?: string | null;
  career: CatalogItem;
  board?: CatalogItem | null;
  modules: Array<{ id: string; title: string; lessons: Array<{ id: string; title: string; publishedAt?: string | null }> }>;
  enrollments: Array<{ id: string }>;
};

export type EnrollmentRow = {
  id: string;
  userId: string;
  courseId: string;
  createdAt: string;
  user: { id: string; email: string; fullName: string; nickname: string };
  course: { id: string; title: string };
};

export type QuestionRow = {
  id: string;
  code: string;
  kind: QuestionKind;
  statement: string;
  year: number;
  board: CatalogItem;
  career: CatalogItem;
  subject: CatalogItem;
  topic?: CatalogItem | null;
};

export type SimulationRow = {
  id: string;
  title: string;
  status: "IN_PROGRESS" | "SUBMITTED";
  questionCount: number;
  user: { id: string; email: string; fullName: string; nickname: string };
  questions: Array<{ id: string }>;
  attempts: Array<{ id: string; isCorrect?: boolean | null }>;
};

export type PaymentRow = {
  id: string;
  provider: string;
  providerPaymentId?: string | null;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  user: { id: string; email: string; fullName: string; nickname: string };
  course?: { id: string; title: string } | null;
};

export type CouponRow = {
  id: string;
  code: string;
  description?: string | null;
  percentOff?: number | null;
  amountOffCents?: number | null;
  maxRedemptions?: number | null;
  redeemedCount: number;
  active: boolean;
};

export type FeatureFlagRow = { key: string; enabled: boolean; updatedAt: string };
export type SettingRow = { key: string; value: unknown; updatedAt: string };

export type ModerationPayload = {
  answers: Array<{ id: string; body: string; user: { email: string; nickname: string }; question: { code: string } }>;
  doubts: Array<{ id: string; message: string; user: { email: string; nickname: string }; lesson: { title: string } }>;
  cases: Array<{ id: string; contentType: string; contentId: string; action: string; reason: string; createdAt: string }>;
};

export type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  createdAt: string;
  actor: { email: string; nickname: string };
  subject?: { email: string; nickname: string } | null;
};

export function fetchDashboard() {
  return apiRequest<AdminDashboard>("/admin/dashboard");
}

export function fetchCatalog() {
  return apiRequest<AdminCatalog>("/admin/catalog");
}

export function listUsers(params: URLSearchParams) {
  return apiRequest<Page<UserRow>>(`/admin/users?${params}`);
}

export function createUser(body: { email: string; fullName: string; nickname: string; password: string; roles: RoleName[] }) {
  return apiRequest<UserRow>("/admin/users", { method: "POST", body: JSON.stringify(body) });
}

export function setUserRoles(id: string, roles: RoleName[]) {
  return apiRequest<UserRow>(`/admin/users/${id}/roles`, { method: "PATCH", body: JSON.stringify({ roles, confirm: true }) });
}

export function setRolePermissions(name: RoleName, permissionKeys: string[]) {
  return apiRequest<RoleRow[]>(`/admin/roles/${name}/permissions`, { method: "PATCH", body: JSON.stringify({ permissionKeys, confirm: true }) });
}

export function listCourses(params: URLSearchParams) {
  return apiRequest<Page<CourseRow>>(`/admin/courses?${params}`);
}

export function createCourse(body: { title: string; slug: string; description: string; status: CourseStatus; careerId: string; boardId?: string; area: string }) {
  return apiRequest<CourseRow>("/admin/courses", { method: "POST", body: JSON.stringify(body) });
}

export function publishCourse(id: string) {
  return apiRequest<CourseRow>(`/admin/courses/${id}/publish`, { method: "PATCH", body: "{}" });
}

export function listProfessors(params: URLSearchParams) {
  return apiRequest<Page<UserRow>>(`/admin/professors?${params}`);
}

export function assignProfessorSubject(userId: string, subjectId: string) {
  return apiRequest(`/admin/professors/${userId}/subjects`, { method: "POST", body: JSON.stringify({ subjectId }) });
}

export function listEnrollments(params: URLSearchParams) {
  return apiRequest<Page<EnrollmentRow>>(`/admin/enrollments?${params}`);
}

export function grantEnrollment(body: { userId: string; courseId: string; entitlementType?: string }) {
  return apiRequest("/admin/enrollments", { method: "POST", body: JSON.stringify({ ...body, confirm: true }) });
}

export function revokeEnrollment(userId: string, courseId: string) {
  return apiRequest(`/admin/enrollments/${userId}/${courseId}`, { method: "DELETE" });
}

export function listQuestions(params: URLSearchParams) {
  return apiRequest<Page<QuestionRow>>(`/admin/questions?${params}`);
}

export function importQuestion(body: { questions: unknown[] }) {
  return apiRequest("/admin/questions/import", { method: "POST", body: JSON.stringify(body) });
}

export function listSimulations(params: URLSearchParams) {
  return apiRequest<Page<SimulationRow>>(`/admin/simulations?${params}`);
}

export function listPayments(params: URLSearchParams) {
  return apiRequest<Page<PaymentRow>>(`/admin/payments?${params}`);
}

export function updatePaymentStatus(id: string, status: PaymentStatus) {
  return apiRequest<PaymentRow>(`/admin/payments/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, confirm: true }) });
}

export function listCoupons(params: URLSearchParams) {
  return apiRequest<Page<CouponRow>>(`/admin/coupons?${params}`);
}

export function createCoupon(body: { code: string; description?: string; percentOff?: number; amountOffCents?: number; maxRedemptions?: number; active?: boolean }) {
  return apiRequest<CouponRow>("/admin/coupons", { method: "POST", body: JSON.stringify(body) });
}

export function updateCoupon(id: string, body: Partial<CouponRow>) {
  return apiRequest<CouponRow>(`/admin/coupons/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function listFlags() {
  return apiRequest<FeatureFlagRow[]>("/admin/feature-flags");
}

export function setFlag(key: string, enabled: boolean) {
  return apiRequest<FeatureFlagRow>(`/admin/feature-flags/${key}`, { method: "PATCH", body: JSON.stringify({ enabled }) });
}

export function listSettings() {
  return apiRequest<SettingRow[]>("/admin/settings");
}

export function setSetting(key: string, value: unknown) {
  return apiRequest<SettingRow>(`/admin/settings/${key}`, { method: "PATCH", body: JSON.stringify({ value, confirm: true }) });
}

export function fetchModeration(params: URLSearchParams) {
  return apiRequest<ModerationPayload>(`/admin/moderation?${params}`);
}

export function moderate(body: { contentType: string; contentId: string; action: "APPROVE" | "REJECT" | "ESCALATE"; reason: string }) {
  return apiRequest("/admin/moderation", { method: "POST", body: JSON.stringify({ ...body, confirm: true }) });
}

export function listAudit(params: URLSearchParams) {
  return apiRequest<AuditLog[]>(`/admin/audit?${params}`);
}

export function slugFrom(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
