"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  CreditCard,
  Database,
  FileQuestion,
  Flag,
  GraduationCap,
  History,
  LogIn,
  LogOut,
  Percent,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  UserCog,
  Users,
  Video
} from "lucide-react";
import {
  Badge,
  BrandMark,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  PageHeader,
  Select,
  StatCard,
  Tabs,
  Textarea,
  cn,
  useAuthSession
} from "@foxtrot/ui";
import { apiRequest } from "../lib/api";
import {
  AdminCatalog,
  AdminDashboard,
  AuditLog,
  CouponRow,
  CourseRow,
  CourseStatus,
  EnrollmentRow,
  FeatureFlagRow,
  ModerationPayload,
  Page,
  PaymentRow,
  PaymentStatus,
  QuestionKind,
  QuestionRow,
  RoleName,
  SettingRow,
  SimulationRow,
  UserRow,
  assignProfessorSubject,
  buildPageParams,
  createCoupon,
  createCourse,
  createUser,
  fetchCatalog,
  fetchDashboard,
  fetchModeration,
  grantEnrollment,
  importQuestion,
  listAudit,
  listCoupons,
  listCourses,
  listEnrollments,
  listFlags,
  listPayments,
  listProfessors,
  listQuestions,
  listSettings,
  listSimulations,
  listUsers,
  money,
  moderate,
  permissionKeysFromText,
  publishCourse,
  removeProfessorSubject,
  revokeEnrollment,
  roleLabels,
  setFlag,
  setRolePermissions,
  setSetting,
  setUserPermission,
  setUserRoles,
  slugFrom,
  summarizePayments,
  summarizeSimulation,
  updateCoupon,
  updateCourse,
  updatePaymentStatus,
  updateQuestion,
  updateUser,
  validateCourseForm,
  validateUserForm
} from "../lib/admin";

type Tab = "operacao" | "usuarios" | "cursos" | "professores" | "matriculas" | "questoes" | "simulados" | "pagamentos" | "cupons" | "configuracoes" | "moderacao" | "auditoria";
type Status = { type: "success" | "error" | "info"; message: string } | null;

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "operacao", label: "Operacao" },
  { id: "usuarios", label: "Usuarios" },
  { id: "cursos", label: "Cursos" },
  { id: "professores", label: "Professores" },
  { id: "matriculas", label: "Matriculas" },
  { id: "questoes", label: "Questoes" },
  { id: "simulados", label: "Simulados" },
  { id: "pagamentos", label: "Pagamentos" },
  { id: "cupons", label: "Cupons" },
  { id: "configuracoes", label: "Configuracoes" },
  { id: "moderacao", label: "Moderacao" },
  { id: "auditoria", label: "Auditoria" }
];

const defaultQuestionImport = "{\n  \"code\": \"QADMIN001\",\n  \"kind\": \"MULTIPLE_CHOICE\",\n  \"statement\": \"Enunciado da questao\",\n  \"alternatives\": [{ \"id\": \"A\", \"text\": \"Alternativa A\" }, { \"id\": \"B\", \"text\": \"Alternativa B\" }],\n  \"correctAnswer\": \"A\",\n  \"year\": 2026,\n  \"board\": \"Banca\",\n  \"career\": \"Carreira\",\n  \"subject\": \"Materia\",\n  \"institution\": \"Instituicao\",\n  \"position\": \"Cargo\"\n}";

export default function AdminHome() {
  const session = useAuthSession();
  const [tab, setTab] = useState<Tab>("operacao");
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [catalog, setCatalog] = useState<AdminCatalog | null>(null);
  const [users, setUsers] = useState<Page<UserRow> | null>(null);
  const [courses, setCourses] = useState<Page<CourseRow> | null>(null);
  const [professors, setProfessors] = useState<Page<UserRow> | null>(null);
  const [enrollments, setEnrollments] = useState<Page<EnrollmentRow> | null>(null);
  const [questions, setQuestions] = useState<Page<QuestionRow> | null>(null);
  const [simulations, setSimulations] = useState<Page<SimulationRow> | null>(null);
  const [payments, setPayments] = useState<Page<PaymentRow> | null>(null);
  const [coupons, setCoupons] = useState<Page<CouponRow> | null>(null);
  const [flags, setFlags] = useState<FeatureFlagRow[]>([]);
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [moderation, setModeration] = useState<ModerationPayload | null>(null);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({
    role: "",
    courseStatus: "",
    questionKind: "",
    subjectId: "",
    simulationStatus: "",
    paymentStatus: "",
    couponActive: "",
    auditAction: ""
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [userForm, setUserForm] = useState({ id: "", email: "", fullName: "", nickname: "", password: "", role: "ALUNO_ILIMITADO" as RoleName, emailVerified: true, twoFactorEnabled: false });
  const [roleForm, setRoleForm] = useState({ role: "PROFESSOR" as RoleName, permissions: "" });
  const [permissionForm, setPermissionForm] = useState({ userId: "", key: "", granted: true });
  const [courseForm, setCourseForm] = useState({ id: "", title: "", slug: "", description: "", status: "PRE_EDITAL" as CourseStatus, careerId: "", boardId: "", area: "" });
  const [professorForm, setProfessorForm] = useState({ userId: "", subjectId: "" });
  const [enrollmentForm, setEnrollmentForm] = useState({ userId: "", courseId: "", entitlementType: "COURSE" });
  const [questionImport, setQuestionImport] = useState(defaultQuestionImport);
  const [questionEdit, setQuestionEdit] = useState({ id: "", statement: "", year: "", subjectId: "", topicId: "", kind: "" as QuestionKind | "" });
  const [couponForm, setCouponForm] = useState({ id: "", code: "", description: "", percentOff: "10", amountOffCents: "", maxRedemptions: "", active: true });
  const [settingForm, setSettingForm] = useState({ key: "support.email", value: "\"suporte@foxtrot.local\"" });
  const [moderationReason, setModerationReason] = useState<Record<string, string>>({});

  useEffect(() => {
    if (session.status === "authenticated") void reloadBaseAndTab(tab, 1);
    if (session.status === "anonymous") setStatus({ type: "info", message: "Entre com uma conta de administrador." });
    if (session.status === "forbidden") setStatus({ type: "error", message: "Seu perfil nao tem acesso ao painel administrativo." });
  }, [session.status]);

  const paymentSummary = useMemo(() => summarizePayments(dashboard?.payments ?? []), [dashboard]);

  async function reloadBaseAndTab(target: Tab, nextPage = page) {
    setLoading(true);
    setStatus(null);
    try {
      const [nextDashboard, nextCatalog] = await Promise.all([fetchDashboard(), fetchCatalog()]);
      setDashboard(nextDashboard);
      setCatalog(nextCatalog);
      await loadTab(target, nextPage);
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Nao foi possivel carregar o painel administrativo." });
    } finally {
      setLoading(false);
    }
  }

  async function loadTab(target: Tab, nextPage = page) {
    setPage(nextPage);
    const params = paramsFor(target, nextPage);
    if (target === "usuarios") setUsers(await listUsers(params));
    if (target === "cursos") setCourses(await listCourses(params));
    if (target === "professores") setProfessors(await listProfessors(params));
    if (target === "matriculas") setEnrollments(await listEnrollments(params));
    if (target === "questoes") setQuestions(await listQuestions(params));
    if (target === "simulados") setSimulations(await listSimulations(params));
    if (target === "pagamentos") setPayments(await listPayments(params));
    if (target === "cupons") setCoupons(await listCoupons(params));
    if (target === "configuracoes") {
      const [nextFlags, nextSettings] = await Promise.all([listFlags(), listSettings()]);
      setFlags(nextFlags);
      setSettings(nextSettings);
    }
    if (target === "moderacao") setModeration(await fetchModeration(params));
    if (target === "auditoria") setAudit(await listAudit(params));
  }

  async function selectTab(nextTab: Tab) {
    setTab(nextTab);
    setPage(1);
    if (session.status === "authenticated") await loadTab(nextTab, 1).catch((error) => setStatus({ type: "error", message: error instanceof Error ? error.message : "Nao foi possivel carregar a aba." }));
  }

  async function refreshCurrent() {
    await reloadBaseAndTab(tab, page);
  }

  async function runAction(action: () => Promise<unknown>, success: string, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setSaving(true);
    setStatus(null);
    try {
      await action();
      setStatus({ type: "success", message: success });
      await refreshCurrent();
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Nao foi possivel concluir a acao." });
    } finally {
      setSaving(false);
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: "info", message: "Autenticando..." });
    try {
      const result = await apiRequest<{ requiresTwoFactor?: boolean; emailVerificationRequired?: boolean }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, twoFactorCode: twoFactorCode || undefined })
      });
      if (result.emailVerificationRequired) return setStatus({ type: "error", message: "Confirme o e-mail antes de acessar o painel." });
      if (result.requiresTwoFactor) return setStatus({ type: "info", message: "Informe o codigo 2FA para concluir." });
      await session.refresh();
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Falha no login." });
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await session.logout();
    setStatus({ type: "success", message: "Sessao encerrada." });
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadTab(tab, 1).catch((error) => setStatus({ type: "error", message: error instanceof Error ? error.message : "Nao foi possivel filtrar." }));
  }

  async function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (userForm.id) {
      await runAction(
        () => updateUser(userForm.id, { fullName: userForm.fullName, nickname: userForm.nickname, emailVerified: userForm.emailVerified, twoFactorEnabled: userForm.twoFactorEnabled }),
        "Usuario atualizado.",
        "Atualizar dados e controles de seguranca deste usuario?"
      );
      setUserForm((current) => ({ ...current, id: "", email: "", fullName: "", nickname: "", password: "" }));
      return;
    }
    const errors = validateUserForm(userForm);
    const firstError = Object.values(errors)[0];
    if (firstError) return setStatus({ type: "error", message: firstError });
    await runAction(() => createUser({ email: userForm.email, fullName: userForm.fullName, nickname: userForm.nickname, password: userForm.password, roles: [userForm.role] }), "Usuario criado.", "Criar usuario com acesso imediato?");
    setUserForm((current) => ({ ...current, email: "", fullName: "", nickname: "", password: "" }));
  }

  async function submitRolePermissions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(() => setRolePermissions(roleForm.role, permissionKeysFromText(roleForm.permissions)), "Permissoes do perfil atualizadas.", "Alterar permissoes afeta todos os usuarios deste perfil. Confirmar?");
  }

  async function submitUserPermission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!permissionForm.userId || !permissionForm.key.trim()) return setStatus({ type: "error", message: "Escolha o usuario e a permissao." });
    await runAction(() => setUserPermission(permissionForm.userId, permissionForm.key, permissionForm.granted), "Permissao direta atualizada.", "Alterar permissao direta deste usuario?");
  }

  async function submitCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateCourseForm(courseForm);
    const firstError = Object.values(errors)[0];
    if (firstError) return setStatus({ type: "error", message: firstError });
    const payload = { title: courseForm.title, slug: courseForm.slug, description: courseForm.description, status: courseForm.status, careerId: courseForm.careerId, boardId: courseForm.boardId || undefined, area: courseForm.area };
    await runAction(() => (courseForm.id ? updateCourse(courseForm.id, payload) : createCourse(payload)), courseForm.id ? "Curso atualizado." : "Curso criado.", courseForm.id ? "Atualizar dados do curso?" : undefined);
    setCourseForm({ id: "", title: "", slug: "", description: "", status: "PRE_EDITAL", careerId: "", boardId: "", area: "" });
  }

  async function submitProfessorSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!professorForm.userId || !professorForm.subjectId) return setStatus({ type: "error", message: "Escolha professor e materia." });
    await runAction(() => assignProfessorSubject(professorForm.userId, professorForm.subjectId), "Materia vinculada ao professor.", "Vincular materia ao professor?");
  }

  async function submitEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrollmentForm.userId || !enrollmentForm.courseId) return setStatus({ type: "error", message: "Informe usuario e curso." });
    await runAction(() => grantEnrollment(enrollmentForm), "Matricula concedida.", "Conceder acesso ao aluno?");
  }

  async function submitQuestionImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const parsed = JSON.parse(questionImport) as unknown;
      await runAction(() => importQuestion({ questions: Array.isArray(parsed) ? parsed : [parsed] }), "Questoes importadas.", "Importar ou atualizar questoes?");
    } catch {
      setStatus({ type: "error", message: "JSON da questao invalido." });
    }
  }

  async function submitQuestionEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!questionEdit.id) return setStatus({ type: "error", message: "Escolha uma questao para editar." });
    await runAction(
      () =>
        updateQuestion(questionEdit.id, {
          statement: questionEdit.statement || undefined,
          year: questionEdit.year ? Number(questionEdit.year) : undefined,
          subjectId: questionEdit.subjectId || undefined,
          topicId: questionEdit.topicId || undefined,
          kind: questionEdit.kind || undefined
        }),
      "Questao atualizada.",
      "Atualizar questao do banco?"
    );
  }

  async function submitCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!couponForm.code.trim() && !couponForm.id) return setStatus({ type: "error", message: "Informe o codigo do cupom." });
    const payload = {
      description: couponForm.description || undefined,
      percentOff: couponForm.percentOff ? Number(couponForm.percentOff) : undefined,
      amountOffCents: couponForm.amountOffCents ? Number(couponForm.amountOffCents) : undefined,
      maxRedemptions: couponForm.maxRedemptions ? Number(couponForm.maxRedemptions) : undefined,
      active: couponForm.active
    };
    await runAction(
      () => (couponForm.id ? updateCoupon(couponForm.id, payload) : createCoupon({ code: couponForm.code, ...payload })),
      couponForm.id ? "Cupom atualizado." : "Cupom criado.",
      couponForm.id ? "Atualizar cupom?" : undefined
    );
    setCouponForm({ id: "", code: "", description: "", percentOff: "10", amountOffCents: "", maxRedemptions: "", active: true });
  }

  async function submitSetting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await runAction(() => setSetting(settingForm.key, JSON.parse(settingForm.value)), "Configuracao atualizada.", "Alterar configuracao global?");
    } catch {
      setStatus({ type: "error", message: "Valor da configuracao deve ser JSON valido." });
    }
  }

  function paramsFor(target: Tab, nextPage: number) {
    const tabFilters: Record<string, string> = {};
    if (target === "usuarios" && filters.role) tabFilters.role = filters.role;
    if (target === "cursos" && filters.courseStatus) tabFilters.status = filters.courseStatus;
    if (target === "questoes") {
      if (filters.questionKind) tabFilters.kind = filters.questionKind;
      if (filters.subjectId) tabFilters.subjectId = filters.subjectId;
    }
    if (target === "simulados" && filters.simulationStatus) tabFilters.status = filters.simulationStatus;
    if (target === "pagamentos" && filters.paymentStatus) tabFilters.status = filters.paymentStatus;
    if (target === "cupons" && filters.couponActive) tabFilters.active = filters.couponActive;
    if (target === "auditoria" && filters.auditAction) tabFilters.action = filters.auditAction;
    return buildPageParams({ page: nextPage, limit: 20, q: target === "operacao" || target === "configuracoes" ? "" : query, filters: tabFilters });
  }

  if (session.status === "loading") {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
        <LoadingState label="Validando sessao administrativa..." />
      </main>
    );
  }

  if (!session.user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <form onSubmit={login} className="w-full max-w-sm rounded-md border border-zinc-800 bg-zinc-950 p-6">
          <BrandMark />
          <h1 className="mt-8 font-display text-3xl font-black uppercase text-white">Admin</h1>
          <p className="mt-2 text-sm text-zinc-400">Acesso restrito para operacao, auditoria, conteudo e financeiro.</p>
          <div className="mt-5 grid gap-3">
            <Field label="E-mail" htmlFor="admin-email"><Input id="admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
            <Field label="Senha" htmlFor="admin-password"><Input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
            <Field label="Codigo 2FA" htmlFor="admin-2fa" hint="Obrigatorio apenas quando a conta exigir."><Input id="admin-2fa" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} /></Field>
          </div>
          <Button className="mt-6 w-full" disabled={saving || !email.trim() || !password.trim()} type="submit"><LogIn className="h-4 w-4" aria-hidden /> Entrar</Button>
          {status && <StatusMessage status={status} />}
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <BrandMark />
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success">{session.user.nickname}</Badge>
            <Button type="button" variant="ghost" onClick={() => void refreshCurrent()}><RotateCcw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden /> Atualizar</Button>
            <Button type="button" variant="ghost" onClick={() => void logout()}><LogOut className="h-4 w-4" aria-hidden /> Sair</Button>
          </div>
        </div>
        <div className="border-t border-zinc-900 px-4 pb-3">
          <div className="mx-auto max-w-7xl">
            <Tabs items={tabs} value={tab} onChange={(next) => void selectTab(next)} />
          </div>
        </div>
      </header>

      <PageHeader
        eyebrow="Painel administrativo"
        title="Comando da plataforma"
        description="Gestao operacional completa de usuarios, permissoes, conteudo, professores, matriculas, banco de questoes, pagamentos, cupons, flags, auditoria e moderacao."
        actions={<Badge tone="brand">ADMIN_MASTER</Badge>}
      />

      <div className="mx-auto max-w-7xl px-4 py-6">
        {status && <StatusMessage status={status} />}
        {dashboard && (
          <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard icon={<Users className="h-4 w-4" aria-hidden />} label="Usuarios" value={String(dashboard.users)} />
            <StatCard icon={<Video className="h-4 w-4" aria-hidden />} label="Aulas" value={String(dashboard.lessons)} tone="blue" />
            <StatCard icon={<Database className="h-4 w-4" aria-hidden />} label="Questoes" value={String(dashboard.questions)} />
            <StatCard icon={<CreditCard className="h-4 w-4" aria-hidden />} label="Receita" value={money(paymentSummary.amountCents)} tone="red" />
            <StatCard icon={<AlertTriangle className="h-4 w-4" aria-hidden />} label="Moderacao" value={String(dashboard.pendingModeration)} tone="zinc" />
          </section>
        )}

        {tab !== "operacao" && tab !== "configuracoes" && (
          <FilterBar query={query} filters={filters} tab={tab} catalog={catalog} onQuery={setQuery} onFilters={setFilters} onSubmit={search} />
        )}

        {loading && !dashboard ? (
          <LoadingState label="Carregando painel administrativo..." />
        ) : dashboard && catalog ? (
          <div className="grid gap-6">
            {tab === "operacao" && <Operation dashboard={dashboard} />}
            {tab === "usuarios" && users && (
              <UsersPanel
                catalog={catalog}
                users={users}
                userForm={userForm}
                roleForm={roleForm}
                permissionForm={permissionForm}
                saving={saving}
                onUserForm={setUserForm}
                onRoleForm={setRoleForm}
                onPermissionForm={setPermissionForm}
                onSubmitUser={submitUser}
                onSubmitRole={submitRolePermissions}
                onSubmitPermission={submitUserPermission}
                onEditUser={(item) => setUserForm({ id: item.id, email: item.email, fullName: item.fullName, nickname: item.nickname, password: "", role: item.roles[0]?.role.name ?? "ALUNO_ILIMITADO", emailVerified: Boolean(item.emailVerifiedAt), twoFactorEnabled: item.twoFactorEnabled })}
                onSetRoles={(id, roles) => void runAction(() => setUserRoles(id, roles), "Papeis atualizados.", "Alterar papeis deste usuario?")}
                onPage={(next) => void loadTab("usuarios", next)}
              />
            )}
            {tab === "cursos" && courses && (
              <CoursesPanel
                catalog={catalog}
                courses={courses}
                form={courseForm}
                saving={saving}
                onForm={setCourseForm}
                onSubmit={submitCourse}
                onEdit={(course) => setCourseForm({ id: course.id, title: course.title, slug: course.slug, description: "", status: course.status, careerId: course.career.id, boardId: course.board?.id ?? "", area: course.area })}
                onPublish={(id) => void runAction(() => publishCourse(id), "Curso publicado.", "Publicar curso para alunos?")}
                onPage={(next) => void loadTab("cursos", next)}
              />
            )}
            {tab === "professores" && professors && (
              <ProfessorsPanel
                catalog={catalog}
                professors={professors}
                form={professorForm}
                saving={saving}
                onForm={setProfessorForm}
                onSubmit={submitProfessorSubject}
                onRemove={(userId, subjectId) => void runAction(() => removeProfessorSubject(userId, subjectId), "Materia removida do professor.", "Remover materia do professor?")}
                onPage={(next) => void loadTab("professores", next)}
              />
            )}
            {tab === "matriculas" && enrollments && (
              <EnrollmentsPanel
                catalog={catalog}
                enrollments={enrollments}
                form={enrollmentForm}
                saving={saving}
                onForm={setEnrollmentForm}
                onSubmit={submitEnrollment}
                onRevoke={(enrollment) => void runAction(() => revokeEnrollment(enrollment.userId, enrollment.courseId), "Matricula revogada.", "Revogar matricula e acessos do aluno?")}
                onPage={(next) => void loadTab("matriculas", next)}
              />
            )}
            {tab === "questoes" && questions && (
              <QuestionsPanel
                catalog={catalog}
                questions={questions}
                importText={questionImport}
                edit={questionEdit}
                saving={saving}
                onImportText={setQuestionImport}
                onEdit={setQuestionEdit}
                onSubmitImport={submitQuestionImport}
                onSubmitEdit={submitQuestionEdit}
                onPickEdit={(question) => setQuestionEdit({ id: question.id, statement: question.statement, year: String(question.year), subjectId: question.subject.id, topicId: question.topic?.id ?? "", kind: question.kind })}
                onPage={(next) => void loadTab("questoes", next)}
              />
            )}
            {tab === "simulados" && simulations && <SimulationsPanel simulations={simulations} onPage={(next) => void loadTab("simulados", next)} />}
            {tab === "pagamentos" && payments && <PaymentsPanel catalog={catalog} payments={payments} saving={saving} onPaymentStatus={(id, nextStatus) => void runAction(() => updatePaymentStatus(id, nextStatus), "Pagamento atualizado.", "Alterar status financeiro?")} onPage={(next) => void loadTab("pagamentos", next)} />}
            {tab === "cupons" && coupons && (
              <CouponsPanel
                coupons={coupons}
                form={couponForm}
                saving={saving}
                onForm={setCouponForm}
                onSubmitCoupon={submitCoupon}
                onEdit={(coupon) => setCouponForm({ id: coupon.id, code: coupon.code, description: coupon.description ?? "", percentOff: coupon.percentOff ? String(coupon.percentOff) : "", amountOffCents: coupon.amountOffCents ? String(coupon.amountOffCents) : "", maxRedemptions: coupon.maxRedemptions ? String(coupon.maxRedemptions) : "", active: coupon.active })}
                onToggleCoupon={(coupon) => void runAction(() => updateCoupon(coupon.id, { active: !coupon.active }), "Cupom atualizado.", "Alterar disponibilidade do cupom?")}
                onPage={(next) => void loadTab("cupons", next)}
              />
            )}
            {tab === "configuracoes" && <SettingsPanel catalog={catalog} flags={flags} settings={settings} form={settingForm} saving={saving} onForm={setSettingForm} onSubmit={submitSetting} onFlag={(key, enabled) => void runAction(() => setFlag(key, enabled), "Feature flag atualizada.", "Alterar feature flag global?")} />}
            {tab === "moderacao" && moderation && (
              <ModerationPanel
                moderation={moderation}
                reasons={moderationReason}
                saving={saving}
                onReason={setModerationReason}
                onAction={(contentType, contentId, action) => void runAction(() => moderate({ contentType, contentId, action, reason: moderationReason[`${contentType}:${contentId}`] ?? "Acao administrativa" }), "Moderacao registrada.", "Registrar acao de moderacao?")}
              />
            )}
            {tab === "auditoria" && <AuditPanel audit={audit} />}
          </div>
        ) : (
          !loading && <ErrorState description="A API nao retornou dados suficientes para montar o painel." action={<Button type="button" variant="outline" onClick={() => void refreshCurrent()}>Recarregar</Button>} />
        )}
      </div>
    </main>
  );
}

function StatusMessage({ status }: { status: NonNullable<Status> }) {
  return (
    <p className={cn("mb-4 rounded-md border p-3 text-sm", status.type === "success" && "border-emerald-900 bg-emerald-950/40 text-emerald-100", status.type === "error" && "border-red-900 bg-red-950/40 text-red-100", status.type === "info" && "border-zinc-800 bg-zinc-900 text-zinc-300")} role={status.type === "error" ? "alert" : "status"}>
      {status.message}
    </p>
  );
}

function FilterBar({ query, filters, tab, catalog, onQuery, onFilters, onSubmit }: { query: string; filters: Record<string, string>; tab: Tab; catalog: AdminCatalog | null; onQuery: (value: string) => void; onFilters: (value: Record<string, string>) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="mb-4 grid gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-3 lg:grid-cols-[1fr_auto]" onSubmit={onSubmit}>
      <span className="flex h-11 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm">
        <Search className="h-4 w-4 text-zinc-500" aria-hidden />
        <input className="w-full bg-transparent outline-none" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Buscar por nome, e-mail, codigo, curso ou acao" />
      </span>
      <div className="flex flex-wrap gap-2">
        {tab === "usuarios" && <TinySelect label="Perfil" value={filters.role ?? ""} items={catalog?.roleNames ?? []} onChange={(role) => onFilters({ ...filters, role })} />}
        {tab === "cursos" && <TinySelect label="Status" value={filters.courseStatus ?? ""} items={catalog?.courseStatuses ?? []} onChange={(courseStatus) => onFilters({ ...filters, courseStatus })} />}
        {tab === "questoes" && <TinySelect label="Tipo" value={filters.questionKind ?? ""} items={catalog?.questionKinds ?? []} onChange={(questionKind) => onFilters({ ...filters, questionKind })} />}
        {tab === "questoes" && <TinySelect label="Materia" value={filters.subjectId ?? ""} items={(catalog?.subjects ?? []).map((subject) => subject.id)} labels={Object.fromEntries((catalog?.subjects ?? []).map((subject) => [subject.id, subject.name]))} onChange={(subjectId) => onFilters({ ...filters, subjectId })} />}
        {tab === "simulados" && <TinySelect label="Status" value={filters.simulationStatus ?? ""} items={["IN_PROGRESS", "SUBMITTED"]} onChange={(simulationStatus) => onFilters({ ...filters, simulationStatus })} />}
        {tab === "pagamentos" && <TinySelect label="Status" value={filters.paymentStatus ?? ""} items={catalog?.paymentStatuses ?? []} onChange={(paymentStatus) => onFilters({ ...filters, paymentStatus })} />}
        {tab === "cupons" && <TinySelect label="Ativo" value={filters.couponActive ?? ""} items={["true", "false"]} labels={{ true: "Ativo", false: "Inativo" }} onChange={(couponActive) => onFilters({ ...filters, couponActive })} />}
        {tab === "auditoria" && <Input className="h-10 w-44" value={filters.auditAction ?? ""} onChange={(event) => onFilters({ ...filters, auditAction: event.target.value })} placeholder="Acao" />}
        <Button type="submit">Filtrar</Button>
      </div>
    </form>
  );
}

function TinySelect({ label, value, items, labels, onChange }: { label: string; value: string; items: string[]; labels?: Record<string, string>; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs uppercase text-zinc-500">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        className="h-10 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-foxtrot-500 focus:ring-2 focus:ring-foxtrot-500/25"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{label}</option>
        {items.map((item) => <option key={item} value={item}>{labels?.[item] ?? item}</option>)}
      </select>
    </label>
  );
}

function Operation({ dashboard }: { dashboard: AdminDashboard }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <Card>
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold uppercase text-white"><ShieldCheck className="h-4 w-4 text-foxtrot-400" aria-hidden /> Visao operacional</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Cursos" value={dashboard.courses} />
          <Metric label="Simulados" value={dashboard.simulations} />
          <Metric label="Cupons ativos" value={dashboard.coupons} />
          <Metric label="Moderacao" value={dashboard.pendingModeration} />
          <Metric label="Questoes" value={dashboard.questions} />
          <Metric label="Usuarios" value={dashboard.users} />
        </div>
      </Card>
      <Card>
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold uppercase text-white"><History className="h-4 w-4 text-foxtrot-400" aria-hidden /> Auditoria recente</h2>
        <AuditRows audit={dashboard.recentAudit} />
      </Card>
    </div>
  );
}

function UsersPanel(props: {
  catalog: AdminCatalog;
  users: Page<UserRow>;
  userForm: { id: string; email: string; fullName: string; nickname: string; password: string; role: RoleName; emailVerified: boolean; twoFactorEnabled: boolean };
  roleForm: { role: RoleName; permissions: string };
  permissionForm: { userId: string; key: string; granted: boolean };
  saving: boolean;
  onUserForm: (value: { id: string; email: string; fullName: string; nickname: string; password: string; role: RoleName; emailVerified: boolean; twoFactorEnabled: boolean }) => void;
  onRoleForm: (value: { role: RoleName; permissions: string }) => void;
  onPermissionForm: (value: { userId: string; key: string; granted: boolean }) => void;
  onSubmitUser: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitRole: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitPermission: (event: FormEvent<HTMLFormElement>) => void;
  onEditUser: (user: UserRow) => void;
  onSetRoles: (id: string, roles: RoleName[]) => void;
  onPage: (page: number) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <div className="grid content-start gap-6">
        <Card>
          <h2 className="font-display text-xl font-bold uppercase text-white">{props.userForm.id ? "Editar usuario" : "Criar usuario"}</h2>
          <form className="mt-4 grid gap-3" onSubmit={props.onSubmitUser}>
            <Field label="E-mail" htmlFor="user-email"><Input id="user-email" disabled={Boolean(props.userForm.id)} value={props.userForm.email} onChange={(event) => props.onUserForm({ ...props.userForm, email: event.target.value })} /></Field>
            <Field label="Nome" htmlFor="user-name"><Input id="user-name" value={props.userForm.fullName} onChange={(event) => props.onUserForm({ ...props.userForm, fullName: event.target.value })} /></Field>
            <Field label="Apelido" htmlFor="user-nickname"><Input id="user-nickname" value={props.userForm.nickname} onChange={(event) => props.onUserForm({ ...props.userForm, nickname: event.target.value })} /></Field>
            {!props.userForm.id && <Field label="Senha temporaria" htmlFor="user-password"><Input id="user-password" type="password" value={props.userForm.password} onChange={(event) => props.onUserForm({ ...props.userForm, password: event.target.value })} /></Field>}
            {!props.userForm.id && <CatalogSelect label="Perfil inicial" id="user-role" value={props.userForm.role} items={props.catalog.roleNames.map((role) => ({ id: role, name: role }))} onChange={(role) => props.onUserForm({ ...props.userForm, role: role as RoleName })} />}
            {props.userForm.id && (
              <div className="grid gap-2">
                <label className="inline-flex items-center gap-2 text-sm text-zinc-300"><input className="h-4 w-4 accent-orange-500" checked={props.userForm.emailVerified} type="checkbox" onChange={(event) => props.onUserForm({ ...props.userForm, emailVerified: event.target.checked })} /> E-mail confirmado</label>
                <label className="inline-flex items-center gap-2 text-sm text-zinc-300"><input className="h-4 w-4 accent-orange-500" checked={props.userForm.twoFactorEnabled} type="checkbox" onChange={(event) => props.onUserForm({ ...props.userForm, twoFactorEnabled: event.target.checked })} /> 2FA ativo</label>
              </div>
            )}
            <Button disabled={props.saving} type="submit">{props.userForm.id ? "Salvar usuario" : "Criar usuario"}</Button>
          </form>
        </Card>
        <Card>
          <h2 className="font-display text-xl font-bold uppercase text-white">Permissoes</h2>
          <form className="mt-4 grid gap-3" onSubmit={props.onSubmitRole}>
            <CatalogSelect label="Perfil" id="role-name" value={props.roleForm.role} items={props.catalog.roleNames.map((role) => ({ id: role, name: role }))} onChange={(role) => props.onRoleForm({ ...props.roleForm, role: role as RoleName })} />
            <Field label="Permissoes separadas por virgula ou linha" htmlFor="role-permissions"><Textarea id="role-permissions" value={props.roleForm.permissions} onChange={(event) => props.onRoleForm({ ...props.roleForm, permissions: event.target.value })} /></Field>
            <Button disabled={props.saving} type="submit" variant="ghost">Atualizar perfil</Button>
          </form>
          <form className="mt-5 grid gap-3 border-t border-zinc-800 pt-4" onSubmit={props.onSubmitPermission}>
            <CatalogSelect label="Usuario" id="permission-user" value={props.permissionForm.userId} items={props.users.items.map((user) => ({ id: user.id, name: `${user.fullName} / ${user.email}` }))} onChange={(userId) => props.onPermissionForm({ ...props.permissionForm, userId })} />
            <CatalogSelect label="Permissao" id="permission-key" value={props.permissionForm.key} items={props.catalog.permissions.map((permission) => ({ id: permission.key, name: permission.key }))} onChange={(key) => props.onPermissionForm({ ...props.permissionForm, key })} />
            <label className="inline-flex items-center gap-2 text-sm text-zinc-300"><input className="h-4 w-4 accent-orange-500" checked={props.permissionForm.granted} type="checkbox" onChange={(event) => props.onPermissionForm({ ...props.permissionForm, granted: event.target.checked })} /> Permissao concedida</label>
            <Button disabled={props.saving} type="submit" variant="outline">Aplicar permissao direta</Button>
          </form>
        </Card>
      </div>
      <AdminTable
        title="Usuarios"
        icon={<Users className="h-4 w-4 text-foxtrot-400" aria-hidden />}
        rows={props.users.items}
        empty="Nenhum usuario encontrado."
        columns={[
          { header: "Usuario", render: (item) => <><strong className="text-white">{item.fullName}</strong><span className="block text-zinc-400">{item.email}</span></> },
          { header: "Perfis", render: (item) => roleLabels(item) },
          { header: "Seguranca", render: (item) => <div className="flex flex-wrap gap-1"><Badge tone={item.emailVerifiedAt ? "success" : "warning"}>Email</Badge><Badge tone={item.twoFactorEnabled ? "success" : "neutral"}>2FA</Badge></div> },
          { header: "Acoes", render: (item) => <div className="flex flex-wrap gap-2"><Button size="sm" type="button" variant="ghost" onClick={() => props.onEditUser(item)}>Editar</Button>{props.catalog.roleNames.map((role) => <Button key={role} size="sm" type="button" variant="outline" onClick={() => props.onSetRoles(item.id, [role])}>{role}</Button>)}</div> }
        ]}
        pager={<Pager page={props.users.page} pages={props.users.pages} onPage={props.onPage} />}
      />
    </div>
  );
}

function CoursesPanel(props: {
  catalog: AdminCatalog;
  courses: Page<CourseRow>;
  form: { id: string; title: string; slug: string; description: string; status: CourseStatus; careerId: string; boardId: string; area: string };
  saving: boolean;
  onForm: (value: { id: string; title: string; slug: string; description: string; status: CourseStatus; careerId: string; boardId: string; area: string }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEdit: (course: CourseRow) => void;
  onPublish: (id: string) => void;
  onPage: (page: number) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <Card>
        <h2 className="font-display text-xl font-bold uppercase text-white">{props.form.id ? "Editar curso" : "Criar curso"}</h2>
        {props.form.id && !props.form.description && <p className="mt-2 rounded-md border border-amber-900 bg-amber-950/30 p-3 text-sm text-amber-100">A API de listagem nao retorna descricao; preencha a descricao antes de salvar alteracoes.</p>}
        <form className="mt-4 grid gap-3" onSubmit={props.onSubmit}>
          <Field label="Titulo" htmlFor="course-title"><Input id="course-title" value={props.form.title} onChange={(event) => props.onForm({ ...props.form, title: event.target.value, slug: props.form.slug || slugFrom(event.target.value) })} /></Field>
          <Field label="Slug" htmlFor="course-slug"><Input id="course-slug" value={props.form.slug} onChange={(event) => props.onForm({ ...props.form, slug: event.target.value })} /></Field>
          <Field label="Descricao" htmlFor="course-description"><Textarea id="course-description" value={props.form.description} onChange={(event) => props.onForm({ ...props.form, description: event.target.value })} /></Field>
          <div className="grid gap-3 md:grid-cols-2">
            <CatalogSelect label="Carreira" id="course-career" value={props.form.careerId} items={props.catalog.careers} onChange={(careerId) => props.onForm({ ...props.form, careerId })} />
            <CatalogSelect label="Banca" id="course-board" value={props.form.boardId} items={props.catalog.boards} onChange={(boardId) => props.onForm({ ...props.form, boardId })} />
            <Field label="Area" htmlFor="course-area"><Input id="course-area" value={props.form.area} onChange={(event) => props.onForm({ ...props.form, area: event.target.value })} /></Field>
            <CatalogSelect label="Status" id="course-status" value={props.form.status} items={props.catalog.courseStatuses.map((status) => ({ id: status, name: status }))} onChange={(status) => props.onForm({ ...props.form, status: status as CourseStatus })} />
          </div>
          <Button disabled={props.saving} type="submit">{props.form.id ? "Salvar curso" : "Criar curso"}</Button>
        </form>
      </Card>
      <AdminTable
        title="Cursos"
        icon={<BookOpen className="h-4 w-4 text-foxtrot-400" aria-hidden />}
        rows={props.courses.items}
        empty="Nenhum curso encontrado."
        columns={[
          { header: "Curso", render: (course) => <><strong className="text-white">{course.title}</strong><span className="block text-zinc-400">{course.slug}</span></> },
          { header: "Status", render: (course) => <Badge tone={course.publishedAt ? "success" : "warning"}>{course.publishedAt ? "Publicado" : course.status}</Badge> },
          { header: "Estrutura", render: (course) => `${course.modules.length} modulos / ${course.modules.reduce((sum, module) => sum + module.lessons.length, 0)} aulas` },
          { header: "Matriculas", render: (course) => String(course.enrollments.length) },
          { header: "Acoes", render: (course) => <div className="flex flex-wrap gap-2"><Button size="sm" type="button" variant="ghost" onClick={() => props.onEdit(course)}>Editar</Button>{!course.publishedAt && <Button size="sm" type="button" variant="outline" onClick={() => props.onPublish(course.id)}>Publicar</Button>}</div> }
        ]}
        pager={<Pager page={props.courses.page} pages={props.courses.pages} onPage={props.onPage} />}
      />
    </div>
  );
}

function ProfessorsPanel(props: { catalog: AdminCatalog; professors: Page<UserRow>; form: { userId: string; subjectId: string }; saving: boolean; onForm: (value: { userId: string; subjectId: string }) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onRemove: (userId: string, subjectId: string) => void; onPage: (page: number) => void }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <Card>
        <h2 className="font-display text-xl font-bold uppercase text-white">Vincular materia</h2>
        <form className="mt-4 grid gap-3" onSubmit={props.onSubmit}>
          <CatalogSelect label="Professor" id="teacher-user" value={props.form.userId} items={props.professors.items.map((user) => ({ id: user.id, name: `${user.fullName} / ${user.email}` }))} onChange={(userId) => props.onForm({ ...props.form, userId })} />
          <CatalogSelect label="Materia" id="teacher-subject" value={props.form.subjectId} items={props.catalog.subjects} onChange={(subjectId) => props.onForm({ ...props.form, subjectId })} />
          <Button disabled={props.saving} type="submit">Vincular materia</Button>
        </form>
      </Card>
      <AdminTable
        title="Professores"
        icon={<GraduationCap className="h-4 w-4 text-foxtrot-400" aria-hidden />}
        rows={props.professors.items}
        empty="Nenhum professor encontrado."
        columns={[
          { header: "Professor", render: (user) => <><strong className="text-white">{user.fullName}</strong><span className="block text-zinc-400">{user.email}</span></> },
          { header: "Permissoes diretas", render: (user) => <span>{user.permissions.filter((permission) => permission.granted).length}</span> },
          { header: "Remover materia", render: (user) => <CatalogSelect label="Materia" id={`remove-${user.id}`} value="" items={props.catalog.subjects} onChange={(subjectId) => subjectId && props.onRemove(user.id, subjectId)} /> }
        ]}
        pager={<Pager page={props.professors.page} pages={props.professors.pages} onPage={props.onPage} />}
      />
    </div>
  );
}

function EnrollmentsPanel(props: { catalog: AdminCatalog; enrollments: Page<EnrollmentRow>; form: { userId: string; courseId: string; entitlementType: string }; saving: boolean; onForm: (value: { userId: string; courseId: string; entitlementType: string }) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onRevoke: (enrollment: EnrollmentRow) => void; onPage: (page: number) => void }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <Card>
        <h2 className="font-display text-xl font-bold uppercase text-white">Conceder matricula</h2>
        <form className="mt-4 grid gap-3" onSubmit={props.onSubmit}>
          <Field label="ID do usuario" htmlFor="enrollment-user"><Input id="enrollment-user" value={props.form.userId} onChange={(event) => props.onForm({ ...props.form, userId: event.target.value })} /></Field>
          <CatalogSelect label="Curso" id="enrollment-course" value={props.form.courseId} items={props.catalog.courses.map((course) => ({ id: course.id, name: course.title }))} onChange={(courseId) => props.onForm({ ...props.form, courseId })} />
          <CatalogSelect label="Tipo de acesso" id="enrollment-type" value={props.form.entitlementType} items={props.catalog.entitlementTypes.map((type) => ({ id: type, name: type }))} onChange={(entitlementType) => props.onForm({ ...props.form, entitlementType })} />
          <Button disabled={props.saving} type="submit">Conceder matricula</Button>
        </form>
      </Card>
      <AdminTable
        title="Matriculas"
        icon={<CheckCircle2 className="h-4 w-4 text-foxtrot-400" aria-hidden />}
        rows={props.enrollments.items}
        empty="Nenhuma matricula encontrada."
        columns={[
          { header: "Aluno", render: (item) => <><strong className="text-white">{item.user.fullName}</strong><span className="block text-zinc-400">{item.user.email}</span></> },
          { header: "Curso", render: (item) => item.course.title },
          { header: "Criada em", render: (item) => String(item.createdAt).slice(0, 10) },
          { header: "Acoes", render: (item) => <Button size="sm" type="button" variant="danger" onClick={() => props.onRevoke(item)}>Revogar</Button> }
        ]}
        pager={<Pager page={props.enrollments.page} pages={props.enrollments.pages} onPage={props.onPage} />}
      />
    </div>
  );
}

function QuestionsPanel(props: { catalog: AdminCatalog; questions: Page<QuestionRow>; importText: string; edit: { id: string; statement: string; year: string; subjectId: string; topicId: string; kind: QuestionKind | "" }; saving: boolean; onImportText: (value: string) => void; onEdit: (value: { id: string; statement: string; year: string; subjectId: string; topicId: string; kind: QuestionKind | "" }) => void; onSubmitImport: (event: FormEvent<HTMLFormElement>) => void; onSubmitEdit: (event: FormEvent<HTMLFormElement>) => void; onPickEdit: (question: QuestionRow) => void; onPage: (page: number) => void }) {
  const selectedSubject = props.catalog.subjects.find((subject) => subject.id === props.edit.subjectId);
  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <div className="grid content-start gap-6">
        <Card>
          <h2 className="font-display text-xl font-bold uppercase text-white">Importar questoes</h2>
          <form className="mt-4 grid gap-3" onSubmit={props.onSubmitImport}>
            <Field label="JSON ou array JSON" htmlFor="question-import"><Textarea id="question-import" className="min-h-72 font-mono text-xs" value={props.importText} onChange={(event) => props.onImportText(event.target.value)} /></Field>
            <Button disabled={props.saving} type="submit">Importar</Button>
          </form>
        </Card>
        <Card>
          <h2 className="font-display text-xl font-bold uppercase text-white">Editar questao</h2>
          <form className="mt-4 grid gap-3" onSubmit={props.onSubmitEdit}>
            <Field label="ID" htmlFor="question-edit-id"><Input id="question-edit-id" value={props.edit.id} onChange={(event) => props.onEdit({ ...props.edit, id: event.target.value })} /></Field>
            <CatalogSelect label="Tipo" id="question-edit-kind" value={props.edit.kind} items={props.catalog.questionKinds.map((kind) => ({ id: kind, name: kind }))} onChange={(kind) => props.onEdit({ ...props.edit, kind: kind as QuestionKind })} />
            <Field label="Enunciado" htmlFor="question-edit-statement"><Textarea id="question-edit-statement" value={props.edit.statement} onChange={(event) => props.onEdit({ ...props.edit, statement: event.target.value })} /></Field>
            <Field label="Ano" htmlFor="question-edit-year"><Input id="question-edit-year" type="number" value={props.edit.year} onChange={(event) => props.onEdit({ ...props.edit, year: event.target.value })} /></Field>
            <CatalogSelect label="Materia" id="question-edit-subject" value={props.edit.subjectId} items={props.catalog.subjects} onChange={(subjectId) => props.onEdit({ ...props.edit, subjectId, topicId: "" })} />
            <CatalogSelect label="Assunto" id="question-edit-topic" value={props.edit.topicId} items={selectedSubject?.topics ?? []} onChange={(topicId) => props.onEdit({ ...props.edit, topicId })} />
            <Button disabled={props.saving || !props.edit.id} type="submit" variant="outline">Salvar questao</Button>
          </form>
        </Card>
      </div>
      <AdminTable
        title="Banco de questoes"
        icon={<FileQuestion className="h-4 w-4 text-foxtrot-400" aria-hidden />}
        rows={props.questions.items}
        empty="Nenhuma questao encontrada."
        columns={[
          { header: "Questao", render: (question) => <><strong className="text-white">{question.code}</strong><span className="line-clamp-2 text-zinc-400">{question.statement}</span></> },
          { header: "Tipo", render: (question) => question.kind },
          { header: "Materia", render: (question) => question.subject.name },
          { header: "Ano", render: (question) => String(question.year) },
          { header: "Acoes", render: (question) => <Button size="sm" type="button" variant="ghost" onClick={() => props.onPickEdit(question)}>Editar</Button> }
        ]}
        pager={<Pager page={props.questions.page} pages={props.questions.pages} onPage={props.onPage} />}
      />
    </div>
  );
}

function SimulationsPanel({ simulations, onPage }: { simulations: Page<SimulationRow>; onPage: (page: number) => void }) {
  return (
    <AdminTable
      title="Simulados"
      icon={<SlidersHorizontal className="h-4 w-4 text-foxtrot-400" aria-hidden />}
      rows={simulations.items}
      empty="Nenhum simulado encontrado."
      columns={[
        { header: "Simulado", render: (sim) => <><strong className="text-white">{sim.title}</strong><span className="block text-zinc-400">{sim.user.email}</span></> },
        { header: "Status", render: (sim) => <Badge tone={sim.status === "SUBMITTED" ? "success" : "warning"}>{sim.status}</Badge> },
        { header: "Questoes", render: (sim) => String(sim.questionCount) },
        { header: "Desempenho", render: (sim) => `${summarizeSimulation(sim).accuracy}% / ${summarizeSimulation(sim).answered} respostas` }
      ]}
      pager={<Pager page={simulations.page} pages={simulations.pages} onPage={onPage} />}
    />
  );
}

function PaymentsPanel({ catalog, payments, saving, onPaymentStatus, onPage }: { catalog: AdminCatalog; payments: Page<PaymentRow>; saving: boolean; onPaymentStatus: (id: string, status: PaymentStatus) => void; onPage: (page: number) => void }) {
  return (
    <AdminTable
      title="Pagamentos"
      icon={<CreditCard className="h-4 w-4 text-foxtrot-400" aria-hidden />}
      rows={payments.items}
      empty="Nenhum pagamento encontrado."
      columns={[
        { header: "Cliente", render: (payment) => <><strong className="text-white">{payment.user.fullName}</strong><span className="block text-zinc-400">{payment.user.email}</span></> },
        { header: "Valor", render: (payment) => money(payment.amountCents, payment.currency) },
        { header: "Status", render: (payment) => <Badge tone={payment.status === "PAID" ? "success" : payment.status === "FAILED" ? "danger" : "warning"}>{payment.status}</Badge> },
        { header: "Curso", render: (payment) => payment.course?.title ?? "Ilimitado" },
        { header: "Acoes", render: (payment) => <div className="flex flex-wrap gap-2">{catalog.paymentStatuses.map((status) => <Button disabled={saving || status === payment.status} key={status} size="sm" type="button" variant="ghost" onClick={() => onPaymentStatus(payment.id, status)}>{status}</Button>)}</div> }
      ]}
      pager={<Pager page={payments.page} pages={payments.pages} onPage={onPage} />}
    />
  );
}

function CouponsPanel(props: { coupons: Page<CouponRow>; form: { id: string; code: string; description: string; percentOff: string; amountOffCents: string; maxRedemptions: string; active: boolean }; saving: boolean; onForm: (value: { id: string; code: string; description: string; percentOff: string; amountOffCents: string; maxRedemptions: string; active: boolean }) => void; onSubmitCoupon: (event: FormEvent<HTMLFormElement>) => void; onEdit: (coupon: CouponRow) => void; onToggleCoupon: (coupon: CouponRow) => void; onPage: (page: number) => void }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <Card>
        <h2 className="font-display text-xl font-bold uppercase text-white">{props.form.id ? "Editar cupom" : "Criar cupom"}</h2>
        <form className="mt-4 grid gap-3" onSubmit={props.onSubmitCoupon}>
          <Field label="Codigo" htmlFor="coupon-code"><Input id="coupon-code" disabled={Boolean(props.form.id)} value={props.form.code} onChange={(event) => props.onForm({ ...props.form, code: event.target.value })} /></Field>
          <Field label="Descricao" htmlFor="coupon-description"><Input id="coupon-description" value={props.form.description} onChange={(event) => props.onForm({ ...props.form, description: event.target.value })} /></Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="% desconto" htmlFor="coupon-percent"><Input id="coupon-percent" min="0" type="number" value={props.form.percentOff} onChange={(event) => props.onForm({ ...props.form, percentOff: event.target.value })} /></Field>
            <Field label="Valor fixo centavos" htmlFor="coupon-amount"><Input id="coupon-amount" min="0" type="number" value={props.form.amountOffCents} onChange={(event) => props.onForm({ ...props.form, amountOffCents: event.target.value })} /></Field>
          </div>
          <Field label="Limite de uso" htmlFor="coupon-max"><Input id="coupon-max" min="0" type="number" value={props.form.maxRedemptions} onChange={(event) => props.onForm({ ...props.form, maxRedemptions: event.target.value })} /></Field>
          <label className="inline-flex items-center gap-2 text-sm text-zinc-300"><input className="h-4 w-4 accent-orange-500" checked={props.form.active} type="checkbox" onChange={(event) => props.onForm({ ...props.form, active: event.target.checked })} /> Ativo</label>
          <Button disabled={props.saving} type="submit">{props.form.id ? "Salvar cupom" : "Criar cupom"}</Button>
        </form>
      </Card>
      <AdminTable
        title="Cupons"
        icon={<Percent className="h-4 w-4 text-foxtrot-400" aria-hidden />}
        rows={props.coupons.items}
        empty="Nenhum cupom encontrado."
        columns={[
          { header: "Cupom", render: (coupon) => <><strong className="text-white">{coupon.code}</strong><span className="block text-zinc-400">{coupon.description ?? "Sem descricao"}</span></> },
          { header: "Desconto", render: (coupon) => coupon.percentOff ? `${coupon.percentOff}%` : money(coupon.amountOffCents ?? 0) },
          { header: "Uso", render: (coupon) => `${coupon.redeemedCount}/${coupon.maxRedemptions ?? "sem limite"}` },
          { header: "Status", render: (coupon) => <Badge tone={coupon.active ? "success" : "neutral"}>{coupon.active ? "Ativo" : "Inativo"}</Badge> },
          { header: "Acoes", render: (coupon) => <div className="flex flex-wrap gap-2"><Button size="sm" type="button" variant="ghost" onClick={() => props.onEdit(coupon)}>Editar</Button><Button size="sm" type="button" variant="outline" onClick={() => props.onToggleCoupon(coupon)}>{coupon.active ? "Desativar" : "Ativar"}</Button></div> }
        ]}
        pager={<Pager page={props.coupons.page} pages={props.coupons.pages} onPage={props.onPage} />}
      />
    </div>
  );
}

function SettingsPanel(props: { catalog: AdminCatalog; flags: FeatureFlagRow[]; settings: SettingRow[]; form: { key: string; value: string }; saving: boolean; onForm: (value: { key: string; value: string }) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onFlag: (key: string, enabled: boolean) => void }) {
  const flagKeys = new Set(props.flags.map((flag) => flag.key));
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <h2 className="font-display text-xl font-bold uppercase text-white">Feature flags</h2>
        <div className="mt-4 grid gap-2">
          {props.catalog.featureFlags.map((key) => {
            const enabled = props.flags.find((flag) => flag.key === key)?.enabled ?? false;
            return <button key={key} type="button" onClick={() => props.onFlag(key, !enabled)} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 p-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foxtrot-500"><span>{key}{!flagKeys.has(key) && <span className="ml-2 text-zinc-500">padrao</span>}</span><Badge tone={enabled ? "success" : "neutral"}>{enabled ? "Ligada" : "Desligada"}</Badge></button>;
          })}
        </div>
      </Card>
      <Card>
        <h2 className="font-display text-xl font-bold uppercase text-white">Configuracoes</h2>
        <form className="mt-4 grid gap-3" onSubmit={props.onSubmit}>
          <Field label="Chave" htmlFor="setting-key"><Input id="setting-key" value={props.form.key} onChange={(event) => props.onForm({ ...props.form, key: event.target.value })} /></Field>
          <Field label="Valor JSON" htmlFor="setting-value"><Textarea id="setting-value" className="font-mono text-xs" value={props.form.value} onChange={(event) => props.onForm({ ...props.form, value: event.target.value })} /></Field>
          <Button disabled={props.saving} type="submit">Salvar configuracao</Button>
        </form>
        <div className="mt-5 grid gap-2">
          {props.settings.map((setting) => <button key={setting.key} className="rounded border border-zinc-800 p-3 text-left text-sm text-zinc-300" type="button" onClick={() => props.onForm({ key: setting.key, value: JSON.stringify(setting.value, null, 2) })}>{setting.key}: {JSON.stringify(setting.value)}</button>)}
        </div>
      </Card>
    </div>
  );
}

function ModerationPanel(props: { moderation: ModerationPayload; reasons: Record<string, string>; saving: boolean; onReason: (value: Record<string, string>) => void; onAction: (contentType: string, contentId: string, action: "APPROVE" | "REJECT" | "ESCALATE") => void }) {
  const items = [
    ...props.moderation.answers.map((item) => ({ key: `QuestionAnswer:${item.id}`, type: "QuestionAnswer", id: item.id, title: item.question.code, body: item.body, author: item.user.email })),
    ...props.moderation.doubts.map((item) => ({ key: `LessonDoubt:${item.id}`, type: "LessonDoubt", id: item.id, title: item.lesson.title, body: item.message, author: item.user.email }))
  ];
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card>
        <h2 className="font-display text-xl font-bold uppercase text-white">Fila de moderacao</h2>
        <div className="mt-4 grid gap-3">
          {items.map((item) => (
            <article key={item.key} className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs uppercase text-zinc-500">{item.type} / {item.title} / {item.author}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{item.body}</p>
              <div className="mt-3">
                <Field label="Motivo" htmlFor={`reason-${item.key}`}><Input id={`reason-${item.key}`} value={props.reasons[item.key] ?? ""} onChange={(event) => props.onReason({ ...props.reasons, [item.key]: event.target.value })} /></Field>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["APPROVE", "REJECT", "ESCALATE"] as const).map((action) => <Button key={action} disabled={props.saving} type="button" variant={action === "REJECT" ? "danger" : "ghost"} onClick={() => props.onAction(item.type, item.id, action)}>{action}</Button>)}
              </div>
            </article>
          ))}
          {items.length === 0 && <EmptyState title="Sem itens" description="Nenhum item encontrado para moderacao." />}
        </div>
      </Card>
      <Card>
        <h2 className="font-display text-xl font-bold uppercase text-white">Historico de moderacao</h2>
        <div className="mt-4 grid gap-2">
          {props.moderation.cases.map((item) => <p key={item.id} className="rounded border border-zinc-800 p-3 text-sm text-zinc-300">{item.action} / {item.contentType} / {item.reason}</p>)}
          {props.moderation.cases.length === 0 && <p className="text-sm text-zinc-500">Sem historico recente.</p>}
        </div>
      </Card>
    </div>
  );
}

function AuditPanel({ audit }: { audit: AuditLog[] }) {
  return (
    <Card>
      <h2 className="font-display text-xl font-bold uppercase text-white">Auditoria</h2>
      <AuditRows audit={audit} />
    </Card>
  );
}

function AuditRows({ audit }: { audit: AuditLog[] }) {
  return (
    <div className="mt-4 grid gap-2">
      {audit.map((item) => <div className="rounded border border-zinc-800 bg-zinc-900 p-3 text-sm" key={item.id}><p className="font-semibold text-white">{item.action}</p><p className="text-zinc-400">{item.actor?.email ?? "sistema"} / {item.entityType} {item.entityId ?? ""}</p><p className="text-xs uppercase text-zinc-500">{String(item.createdAt).slice(0, 19)}</p></div>)}
      {audit.length === 0 && <EmptyState title="Sem auditoria" description="Nenhum registro encontrado para o filtro atual." />}
    </div>
  );
}

function AdminTable<T>({ title, icon, rows, columns, empty, pager }: { title: string; icon: ReactNode; rows: T[]; columns: Array<{ header: string; render: (row: T) => ReactNode }>; empty: string; pager?: ReactNode }) {
  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold uppercase text-white">{icon} {title}</h2>
      <div className="overflow-hidden rounded-md border border-zinc-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800 text-sm">
            <thead className="bg-zinc-900 text-left text-xs uppercase text-zinc-500">
              <tr>{columns.map((column) => <th className="px-4 py-3 font-semibold" key={column.header} scope="col">{column.header}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-zinc-950 text-zinc-300">
              {rows.map((row, index) => <tr className="align-top hover:bg-zinc-900/70" key={index}>{columns.map((column) => <td className="px-4 py-3" key={column.header}>{column.render(row)}</td>)}</tr>)}
              {rows.length === 0 && <tr><td className="px-4 py-6 text-center text-zinc-500" colSpan={columns.length}>{empty}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {pager}
    </Card>
  );
}

function CatalogSelect({ label, id, value, items, onChange }: { label: string; id: string; value: string; items: Array<{ id: string; name: string }>; onChange: (value: string) => void }) {
  return (
    <Field label={label} htmlFor={id}>
      <Select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Selecione</option>
        {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </Select>
    </Field>
  );
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
      <Button disabled={page <= 1} type="button" variant="ghost" onClick={() => onPage(page - 1)}>Anterior</Button>
      <span>Pagina {page} de {Math.max(1, pages)}</span>
      <Button disabled={page >= pages} type="button" variant="ghost" onClick={() => onPage(page + 1)}>Proxima</Button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4"><p className="text-xs uppercase text-zinc-500">{label}</p><strong className="font-display text-2xl text-white">{value}</strong></div>;
}
