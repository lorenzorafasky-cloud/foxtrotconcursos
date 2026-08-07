"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  Loader2,
  LogIn,
  LogOut,
  Percent,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  UserCog,
  Users,
  Video
} from "lucide-react";
import { BrandMark, Button, StatCard, cn } from "@foxtrot/ui";
import { apiRequest, AuthProfile } from "../lib/api";
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
  moderate,
  publishCourse,
  revokeEnrollment,
  setFlag,
  setRolePermissions,
  setSetting,
  setUserRoles,
  slugFrom,
  updateCoupon,
  updatePaymentStatus
} from "../lib/admin";

type Tab = "operacao" | "usuarios" | "conteudo" | "professores" | "questoes" | "pagamentos" | "configuracoes" | "moderacao" | "auditoria";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "operacao", label: "Operacao" },
  { id: "usuarios", label: "Usuarios" },
  { id: "conteudo", label: "Cursos" },
  { id: "professores", label: "Professores" },
  { id: "questoes", label: "Questoes" },
  { id: "pagamentos", label: "Pagamentos" },
  { id: "configuracoes", label: "Configuracoes" },
  { id: "moderacao", label: "Moderacao" },
  { id: "auditoria", label: "Auditoria" }
];

export default function AdminHome() {
  const [user, setUser] = useState<AuthProfile | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [status, setStatus] = useState("Validando sessao...");
  const [tab, setTab] = useState<Tab>("operacao");
  const [loading, setLoading] = useState(true);
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
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const [userForm, setUserForm] = useState({ email: "", fullName: "", nickname: "", password: "", role: "ALUNO_ILIMITADO" as RoleName });
  const [roleForm, setRoleForm] = useState({ role: "PROFESSOR" as RoleName, permissions: "" });
  const [courseForm, setCourseForm] = useState({ title: "", slug: "", description: "", status: "PRE_EDITAL" as CourseStatus, careerId: "", boardId: "", area: "" });
  const [professorForm, setProfessorForm] = useState({ userId: "", subjectId: "" });
  const [enrollmentForm, setEnrollmentForm] = useState({ userId: "", courseId: "", entitlementType: "COURSE" });
  const [questionImport, setQuestionImport] = useState("{\n  \"code\": \"\",\n  \"kind\": \"MULTIPLE_CHOICE\",\n  \"statement\": \"\",\n  \"alternatives\": [{ \"id\": \"A\", \"text\": \"\" }],\n  \"correctAnswer\": \"A\",\n  \"year\": 2026,\n  \"board\": \"\",\n  \"career\": \"\",\n  \"subject\": \"\",\n  \"institution\": \"\",\n  \"position\": \"\"\n}");
  const [couponForm, setCouponForm] = useState({ code: "", description: "", percentOff: "10", amountOffCents: "", maxRedemptions: "", active: true });
  const [settingForm, setSettingForm] = useState({ key: "support.email", value: "\"suporte@foxtrot.local\"" });
  const [moderationReason, setModerationReason] = useState<Record<string, string>>({});

  useEffect(() => {
    void loadMe();
  }, []);

  useEffect(() => {
    if (user) void loadTab(tab, 1);
  }, [tab]);

  const paymentRevenue = useMemo(
    () => (dashboard?.payments ?? []).reduce((sum, item) => sum + (item._sum.amountCents ?? 0), 0),
    [dashboard]
  );

  async function loadMe() {
    setLoading(true);
    try {
      const profile = await apiRequest<AuthProfile>("/auth/me");
      if (!profile.roles.includes("ADMIN_MASTER")) {
        setStatus("Seu perfil nao tem acesso ao painel administrativo.");
        setUser(null);
        return;
      }
      setUser(profile);
      setStatus("");
      await reloadBase();
      await loadTab("operacao", 1);
    } catch {
      setStatus("Entre com uma conta de administrador.");
    } finally {
      setLoading(false);
    }
  }

  async function reloadBase() {
    const [nextDashboard, nextCatalog] = await Promise.all([fetchDashboard(), fetchCatalog()]);
    setDashboard(nextDashboard);
    setCatalog(nextCatalog);
  }

  async function loadTab(target: Tab, nextPage = page) {
    const params = paramsFor(nextPage);
    setPage(nextPage);
    if (target === "usuarios") setUsers(await listUsers(params));
    if (target === "conteudo") setCourses(await listCourses(params));
    if (target === "professores") {
      const [nextProfessors, nextEnrollments] = await Promise.all([listProfessors(params), listEnrollments(paramsFor(1))]);
      setProfessors(nextProfessors);
      setEnrollments(nextEnrollments);
    }
    if (target === "questoes") {
      const [nextQuestions, nextSimulations] = await Promise.all([listQuestions(params), listSimulations(paramsFor(1))]);
      setQuestions(nextQuestions);
      setSimulations(nextSimulations);
    }
    if (target === "pagamentos") {
      const [nextPayments, nextCoupons] = await Promise.all([listPayments(params), listCoupons(paramsFor(1))]);
      setPayments(nextPayments);
      setCoupons(nextCoupons);
    }
    if (target === "configuracoes") {
      const [nextFlags, nextSettings] = await Promise.all([listFlags(), listSettings()]);
      setFlags(nextFlags);
      setSettings(nextSettings);
    }
    if (target === "moderacao") setModeration(await fetchModeration(params));
    if (target === "auditoria") setAudit(await listAudit(params));
  }

  async function refreshCurrent() {
    setSaving(true);
    try {
      await reloadBase();
      await loadTab(tab, page);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel atualizar.");
    } finally {
      setSaving(false);
    }
  }

  async function runAction(action: () => Promise<unknown>, success: string, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setSaving(true);
    setStatus("");
    try {
      await action();
      setStatus(success);
      await refreshCurrent();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel concluir a acao.");
    } finally {
      setSaving(false);
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Autenticando...");
    try {
      const result = await apiRequest<{ requiresTwoFactor?: boolean; emailVerificationRequired?: boolean }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, twoFactorCode: twoFactorCode || undefined })
      });
      if (result.emailVerificationRequired) return setStatus("Confirme o e-mail antes de acessar o painel.");
      if (result.requiresTwoFactor) return setStatus("Informe o codigo 2FA para concluir.");
      await loadMe();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha no login.");
    }
  }

  async function logout() {
    await apiRequest("/auth/logout", { method: "POST", body: "{}" }).catch(() => undefined);
    setUser(null);
    setStatus("Sessao encerrada.");
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadTab(tab, 1);
  }

  async function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(() => createUser({ ...userForm, roles: [userForm.role] }), "Usuario criado.", "Criar usuario com acesso imediato?");
  }

  async function submitRolePermissions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const permissions = roleForm.permissions.split(",").map((item) => item.trim()).filter(Boolean);
    await runAction(() => setRolePermissions(roleForm.role, permissions), "Permissoes do perfil atualizadas.", "Alterar permissoes afeta todos os usuarios deste perfil. Confirmar?");
  }

  async function submitCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(() => createCourse({ ...courseForm, boardId: courseForm.boardId || undefined }), "Curso criado.");
  }

  async function submitProfessorSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(() => assignProfessorSubject(professorForm.userId, professorForm.subjectId), "Materia vinculada ao professor.");
  }

  async function submitEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(() => grantEnrollment(enrollmentForm), "Matricula concedida.", "Conceder acesso ao aluno?");
  }

  async function submitQuestionImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const parsed = JSON.parse(questionImport) as unknown;
      await runAction(() => importQuestion({ questions: [parsed] }), "Questao importada.", "Importar/atualizar questao?");
    } catch {
      setStatus("JSON da questao invalido.");
    }
  }

  async function submitCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(
      () =>
        createCoupon({
          code: couponForm.code,
          description: couponForm.description || undefined,
          percentOff: couponForm.percentOff ? Number(couponForm.percentOff) : undefined,
          amountOffCents: couponForm.amountOffCents ? Number(couponForm.amountOffCents) : undefined,
          maxRedemptions: couponForm.maxRedemptions ? Number(couponForm.maxRedemptions) : undefined,
          active: couponForm.active
        }),
      "Cupom criado."
    );
  }

  async function submitSetting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await runAction(() => setSetting(settingForm.key, JSON.parse(settingForm.value)), "Configuracao atualizada.", "Alterar configuracao global?");
    } catch {
      setStatus("Valor da configuracao deve ser JSON valido.");
    }
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <form onSubmit={login} className="w-full max-w-sm rounded-md border border-zinc-800 bg-zinc-950 p-6">
          <BrandMark />
          <h1 className="mt-8 font-display text-3xl font-black uppercase text-white">Admin</h1>
          <TextInput label="E-mail" type="email" value={email} onChange={setEmail} />
          <TextInput label="Senha" type="password" value={password} onChange={setPassword} />
          <TextInput label="Codigo 2FA" value={twoFactorCode} onChange={setTwoFactorCode} />
          <Button className="mt-6 w-full" type="submit"><LogIn className="h-4 w-4" /> Entrar</Button>
          <p className="mt-4 min-h-5 text-sm text-zinc-400">{status}</p>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <BrandMark />
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => void refreshCurrent()}><Loader2 className={cn("h-4 w-4", saving && "animate-spin")} /> Atualizar</Button>
            <Button type="button" variant="ghost" onClick={logout}><LogOut className="h-4 w-4" /> Sair</Button>
          </div>
        </div>
      </header>

      <section className="relative border-b border-zinc-800">
        <img alt="Painel administrativo" className="absolute inset-0 h-full w-full object-cover opacity-14" src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop" />
        <div className="relative mx-auto max-w-7xl px-4 py-7">
          <h1 className="font-display text-4xl font-black uppercase text-white">Comando da plataforma</h1>
          <p className="mt-2 max-w-2xl text-zinc-300">Controle usuarios, conteudo, pagamentos, auditoria e operacao em tempo real.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {tabs.map((item) => (
              <button key={item.id} type="button" onClick={() => setTab(item.id)} className={cn("h-10 rounded-md px-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800", tab === item.id && "bg-zinc-800 text-white")}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 md:grid-cols-4">
        <StatCard icon={<Users className="h-4 w-4" />} label="Usuarios" value={String(dashboard?.users ?? 0)} />
        <StatCard icon={<Video className="h-4 w-4" />} label="Aulas" value={String(dashboard?.lessons ?? 0)} />
        <StatCard icon={<Database className="h-4 w-4" />} label="Questoes" value={String(dashboard?.questions ?? 0)} />
        <StatCard icon={<CreditCard className="h-4 w-4" />} label="Receita registrada" value={money(paymentRevenue)} tone="red" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-10">
        {status && <p className="mb-4 rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300">{status}</p>}
        {loading ? <Empty text="Carregando painel administrativo." /> : (
          <>
            {tab !== "operacao" && (
              <form className="mb-4 flex gap-2" onSubmit={search}>
                <span className="flex h-10 flex-1 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm">
                  <Search className="h-4 w-4 text-zinc-500" />
                  <input className="w-full bg-transparent outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar" />
                </span>
                <Button type="submit">Filtrar</Button>
              </form>
            )}
            {tab === "operacao" && dashboard && <Operation dashboard={dashboard} />}
            {tab === "usuarios" && catalog && users && (
              <UsersPanel
                catalog={catalog}
                users={users}
                userForm={userForm}
                roleForm={roleForm}
                saving={saving}
                onUserForm={setUserForm}
                onRoleForm={setRoleForm}
                onSubmitUser={submitUser}
                onSubmitRole={submitRolePermissions}
                onSetRoles={(id, roles) => void runAction(() => setUserRoles(id, roles), "Papeis atualizados.", "Alterar papeis deste usuario?")}
                onPage={(next) => void loadTab("usuarios", next)}
              />
            )}
            {tab === "conteudo" && catalog && courses && (
              <CoursesPanel catalog={catalog} courses={courses} form={courseForm} saving={saving} onForm={setCourseForm} onSubmit={submitCourse} onPublish={(id) => void runAction(() => publishCourse(id), "Curso publicado.", "Publicar curso para alunos?")} onPage={(next) => void loadTab("conteudo", next)} />
            )}
            {tab === "professores" && catalog && professors && enrollments && (
              <ProfessorsPanel
                catalog={catalog}
                professors={professors}
                enrollments={enrollments}
                professorForm={professorForm}
                enrollmentForm={enrollmentForm}
                saving={saving}
                onProfessorForm={setProfessorForm}
                onEnrollmentForm={setEnrollmentForm}
                onSubmitProfessor={submitProfessorSubject}
                onSubmitEnrollment={submitEnrollment}
                onRevoke={(enrollment) => void runAction(() => revokeEnrollment(enrollment.userId, enrollment.courseId), "Matricula revogada.", "Revogar matricula e acessos administrativos?")}
              />
            )}
            {tab === "questoes" && catalog && questions && simulations && (
              <QuestionsPanel catalog={catalog} questions={questions} simulations={simulations} importText={questionImport} saving={saving} onImportText={setQuestionImport} onSubmitImport={submitQuestionImport} onPage={(next) => void loadTab("questoes", next)} />
            )}
            {tab === "pagamentos" && catalog && payments && coupons && (
              <PaymentsPanel
                catalog={catalog}
                payments={payments}
                coupons={coupons}
                form={couponForm}
                saving={saving}
                onForm={setCouponForm}
                onSubmitCoupon={submitCoupon}
                onPaymentStatus={(id, status) => void runAction(() => updatePaymentStatus(id, status), "Pagamento atualizado.", "Alterar status financeiro?")}
                onToggleCoupon={(coupon) => void runAction(() => updateCoupon(coupon.id, { active: !coupon.active }), "Cupom atualizado.", "Alterar disponibilidade do cupom?")}
              />
            )}
            {tab === "configuracoes" && catalog && (
              <SettingsPanel catalog={catalog} flags={flags} settings={settings} form={settingForm} saving={saving} onForm={setSettingForm} onSubmit={submitSetting} onFlag={(key, enabled) => void runAction(() => setFlag(key, enabled), "Feature flag atualizada.", "Alterar feature flag global?")} />
            )}
            {tab === "moderacao" && moderation && (
              <ModerationPanel moderation={moderation} reasons={moderationReason} saving={saving} onReason={setModerationReason} onAction={(contentType, contentId, action) => void runAction(() => moderate({ contentType, contentId, action, reason: moderationReason[`${contentType}:${contentId}`] ?? "Acao administrativa" }), "Moderacao registrada.", "Registrar acao de moderacao?")} />
            )}
            {tab === "auditoria" && <AuditPanel audit={audit} />}
          </>
        )}
      </div>
    </main>
  );

  function paramsFor(nextPage: number) {
    const params = new URLSearchParams();
    params.set("page", String(nextPage));
    params.set("limit", "20");
    if (query.trim()) params.set("q", query.trim());
    return params;
  }
}

function Operation({ dashboard }: { dashboard: AdminDashboard }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <Panel title="Visao operacional" icon={<ShieldCheck className="h-4 w-4" />}>
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="Cursos" value={dashboard.courses} />
          <Metric label="Simulados" value={dashboard.simulations} />
          <Metric label="Cupons ativos" value={dashboard.coupons} />
          <Metric label="Moderacao pendente" value={dashboard.pendingModeration} />
          <Metric label="Questoes" value={dashboard.questions} />
          <Metric label="Usuarios" value={dashboard.users} />
        </div>
      </Panel>
      <Panel title="Auditoria recente" icon={<History className="h-4 w-4" />}>
        <div className="grid gap-2">
          {dashboard.recentAudit.map((item) => <AuditItem key={item.id} item={item} />)}
        </div>
      </Panel>
    </div>
  );
}

function UsersPanel(props: {
  catalog: AdminCatalog;
  users: Page<UserRow>;
  userForm: { email: string; fullName: string; nickname: string; password: string; role: RoleName };
  roleForm: { role: RoleName; permissions: string };
  saving: boolean;
  onUserForm: (value: { email: string; fullName: string; nickname: string; password: string; role: RoleName }) => void;
  onRoleForm: (value: { role: RoleName; permissions: string }) => void;
  onSubmitUser: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitRole: (event: FormEvent<HTMLFormElement>) => void;
  onSetRoles: (id: string, roles: RoleName[]) => void;
  onPage: (page: number) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <Panel title="Usuarios e perfis" icon={<UserCog className="h-4 w-4" />}>
        <form className="grid gap-3" onSubmit={props.onSubmitUser}>
          <TextInput label="E-mail" value={props.userForm.email} onChange={(email) => props.onUserForm({ ...props.userForm, email })} />
          <TextInput label="Nome" value={props.userForm.fullName} onChange={(fullName) => props.onUserForm({ ...props.userForm, fullName })} />
          <TextInput label="Apelido" value={props.userForm.nickname} onChange={(nickname) => props.onUserForm({ ...props.userForm, nickname })} />
          <TextInput label="Senha temporaria" type="password" value={props.userForm.password} onChange={(password) => props.onUserForm({ ...props.userForm, password })} />
          <Select label="Perfil" value={props.userForm.role} items={props.catalog.roleNames.map((role) => ({ id: role, name: role }))} onChange={(role) => props.onUserForm({ ...props.userForm, role: role as RoleName })} />
          <Button disabled={props.saving} type="submit">Criar usuario</Button>
        </form>
        <form className="mt-6 grid gap-3 border-t border-zinc-800 pt-4" onSubmit={props.onSubmitRole}>
          <Select label="Perfil" value={props.roleForm.role} items={props.catalog.roleNames.map((role) => ({ id: role, name: role }))} onChange={(role) => props.onRoleForm({ ...props.roleForm, role: role as RoleName })} />
          <Textarea label="Permissoes separadas por virgula" value={props.roleForm.permissions} onChange={(permissions) => props.onRoleForm({ ...props.roleForm, permissions })} />
          <Button disabled={props.saving} type="submit" variant="ghost">Atualizar perfil</Button>
        </form>
      </Panel>
      <Panel title="Lista de usuarios" icon={<Users className="h-4 w-4" />}>
        <div className="grid gap-3">
          {props.users.items.map((item) => (
            <article key={item.id} className="rounded-md border border-zinc-800 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">{item.fullName}</h3>
                  <p className="text-sm text-zinc-400">{item.email} / {item.nickname}</p>
                  <p className="mt-1 text-xs uppercase text-zinc-500">{item.roles.map((role) => role.role.name).join(", ") || "Sem perfil"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {props.catalog.roleNames.map((role) => (
                    <Button key={role} type="button" variant="ghost" onClick={() => props.onSetRoles(item.id, [role])}>{role}</Button>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
        <Pager page={props.users.page} pages={props.users.pages} onPage={props.onPage} />
      </Panel>
    </div>
  );
}

function CoursesPanel(props: {
  catalog: AdminCatalog;
  courses: Page<CourseRow>;
  form: { title: string; slug: string; description: string; status: CourseStatus; careerId: string; boardId: string; area: string };
  saving: boolean;
  onForm: (value: { title: string; slug: string; description: string; status: CourseStatus; careerId: string; boardId: string; area: string }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPublish: (id: string) => void;
  onPage: (page: number) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <Panel title="Criar curso" icon={<BookOpen className="h-4 w-4" />}>
        <form className="grid gap-3" onSubmit={props.onSubmit}>
          <TextInput label="Titulo" value={props.form.title} onChange={(title) => props.onForm({ ...props.form, title, slug: props.form.slug || slugFrom(title) })} />
          <TextInput label="Slug" value={props.form.slug} onChange={(slug) => props.onForm({ ...props.form, slug })} />
          <Textarea label="Descricao" value={props.form.description} onChange={(description) => props.onForm({ ...props.form, description })} />
          <Select label="Carreira" value={props.form.careerId} items={props.catalog.careers} onChange={(careerId) => props.onForm({ ...props.form, careerId })} />
          <Select label="Banca" value={props.form.boardId} items={props.catalog.boards} onChange={(boardId) => props.onForm({ ...props.form, boardId })} />
          <TextInput label="Area" value={props.form.area} onChange={(area) => props.onForm({ ...props.form, area })} />
          <Select label="Status" value={props.form.status} items={props.catalog.courseStatuses.map((status) => ({ id: status, name: status }))} onChange={(status) => props.onForm({ ...props.form, status: status as CourseStatus })} />
          <Button disabled={props.saving} type="submit">Criar curso</Button>
        </form>
      </Panel>
      <Panel title="Cursos" icon={<Video className="h-4 w-4" />}>
        <div className="grid gap-3">
          {props.courses.items.map((course) => (
            <article key={course.id} className="rounded-md border border-zinc-800 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase text-zinc-500">{course.career.name} / {course.status}</p>
                  <h3 className="font-semibold text-white">{course.title}</h3>
                  <p className="text-sm text-zinc-400">{course.modules.length} modulos / {course.enrollments.length} matriculas</p>
                </div>
                {!course.publishedAt && <Button type="button" variant="ghost" onClick={() => props.onPublish(course.id)}>Publicar</Button>}
              </div>
            </article>
          ))}
        </div>
        <Pager page={props.courses.page} pages={props.courses.pages} onPage={props.onPage} />
      </Panel>
    </div>
  );
}

function ProfessorsPanel(props: {
  catalog: AdminCatalog;
  professors: Page<UserRow>;
  enrollments: Page<EnrollmentRow>;
  professorForm: { userId: string; subjectId: string };
  enrollmentForm: { userId: string; courseId: string; entitlementType: string };
  saving: boolean;
  onProfessorForm: (value: { userId: string; subjectId: string }) => void;
  onEnrollmentForm: (value: { userId: string; courseId: string; entitlementType: string }) => void;
  onSubmitProfessor: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitEnrollment: (event: FormEvent<HTMLFormElement>) => void;
  onRevoke: (enrollment: EnrollmentRow) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Professores" icon={<GraduationCap className="h-4 w-4" />}>
        <form className="grid gap-3" onSubmit={props.onSubmitProfessor}>
          <Select label="Professor" value={props.professorForm.userId} items={props.professors.items.map((user) => ({ id: user.id, name: user.fullName }))} onChange={(userId) => props.onProfessorForm({ ...props.professorForm, userId })} />
          <Select label="Materia" value={props.professorForm.subjectId} items={props.catalog.subjects} onChange={(subjectId) => props.onProfessorForm({ ...props.professorForm, subjectId })} />
          <Button disabled={props.saving} type="submit">Vincular materia</Button>
        </form>
        <div className="mt-5 grid gap-2">
          {props.professors.items.map((user) => <p key={user.id} className="rounded border border-zinc-800 p-3 text-sm text-zinc-300">{user.fullName} / {user.email}</p>)}
        </div>
      </Panel>
      <Panel title="Matriculas" icon={<CheckCircle2 className="h-4 w-4" />}>
        <form className="grid gap-3" onSubmit={props.onSubmitEnrollment}>
          <TextInput label="ID do usuario" value={props.enrollmentForm.userId} onChange={(userId) => props.onEnrollmentForm({ ...props.enrollmentForm, userId })} />
          <Select label="Curso" value={props.enrollmentForm.courseId} items={props.catalog.courses.map((course) => ({ id: course.id, name: course.title }))} onChange={(courseId) => props.onEnrollmentForm({ ...props.enrollmentForm, courseId })} />
          <Select label="Tipo" value={props.enrollmentForm.entitlementType} items={props.catalog.entitlementTypes.map((type) => ({ id: type, name: type }))} onChange={(entitlementType) => props.onEnrollmentForm({ ...props.enrollmentForm, entitlementType })} />
          <Button disabled={props.saving} type="submit">Conceder matricula</Button>
        </form>
        <div className="mt-5 grid gap-2">
          {props.enrollments.items.map((item) => (
            <article key={item.id} className="rounded border border-zinc-800 p-3 text-sm">
              <p className="font-semibold text-white">{item.user.fullName}</p>
              <p className="text-zinc-400">{item.course.title}</p>
              <Button className="mt-2" type="button" variant="ghost" onClick={() => props.onRevoke(item)}>Revogar</Button>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function QuestionsPanel(props: {
  catalog: AdminCatalog;
  questions: Page<QuestionRow>;
  simulations: Page<SimulationRow>;
  importText: string;
  saving: boolean;
  onImportText: (value: string) => void;
  onSubmitImport: (event: FormEvent<HTMLFormElement>) => void;
  onPage: (page: number) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Panel title="Importar questao" icon={<FileQuestion className="h-4 w-4" />}>
        <form className="grid gap-3" onSubmit={props.onSubmitImport}>
          <Textarea label="JSON da questao" value={props.importText} onChange={props.onImportText} />
          <Button disabled={props.saving} type="submit">Importar questao</Button>
        </form>
      </Panel>
      <div className="grid gap-6">
        <Panel title="Banco de questoes" icon={<Database className="h-4 w-4" />}>
          <div className="grid gap-3">
            {props.questions.items.map((question) => (
              <article key={question.id} className="rounded-md border border-zinc-800 p-3">
                <p className="text-xs uppercase text-zinc-500">{question.code} / {question.kind} / {question.subject.name}</p>
                <h3 className="line-clamp-2 font-semibold text-white">{question.statement}</h3>
              </article>
            ))}
          </div>
          <Pager page={props.questions.page} pages={props.questions.pages} onPage={props.onPage} />
        </Panel>
        <Panel title="Simulados" icon={<SlidersHorizontal className="h-4 w-4" />}>
          <div className="grid gap-2">
            {props.simulations.items.map((sim) => <p key={sim.id} className="rounded border border-zinc-800 p-3 text-sm text-zinc-300">{sim.title} / {sim.user.email} / {sim.questionCount} questoes</p>)}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function PaymentsPanel(props: {
  catalog: AdminCatalog;
  payments: Page<PaymentRow>;
  coupons: Page<CouponRow>;
  form: { code: string; description: string; percentOff: string; amountOffCents: string; maxRedemptions: string; active: boolean };
  saving: boolean;
  onForm: (value: { code: string; description: string; percentOff: string; amountOffCents: string; maxRedemptions: string; active: boolean }) => void;
  onSubmitCoupon: (event: FormEvent<HTMLFormElement>) => void;
  onPaymentStatus: (id: string, status: PaymentStatus) => void;
  onToggleCoupon: (coupon: CouponRow) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Panel title="Cupons" icon={<Percent className="h-4 w-4" />}>
        <form className="grid gap-3" onSubmit={props.onSubmitCoupon}>
          <TextInput label="Codigo" value={props.form.code} onChange={(code) => props.onForm({ ...props.form, code })} />
          <TextInput label="Descricao" value={props.form.description} onChange={(description) => props.onForm({ ...props.form, description })} />
          <div className="grid gap-3 md:grid-cols-2">
            <TextInput label="% desconto" value={props.form.percentOff} onChange={(percentOff) => props.onForm({ ...props.form, percentOff })} />
            <TextInput label="Valor fixo centavos" value={props.form.amountOffCents} onChange={(amountOffCents) => props.onForm({ ...props.form, amountOffCents })} />
          </div>
          <TextInput label="Limite de uso" value={props.form.maxRedemptions} onChange={(maxRedemptions) => props.onForm({ ...props.form, maxRedemptions })} />
          <label className="flex items-center gap-2 text-sm text-zinc-300"><input checked={props.form.active} type="checkbox" onChange={(event) => props.onForm({ ...props.form, active: event.target.checked })} /> Ativo</label>
          <Button disabled={props.saving} type="submit">Criar cupom</Button>
        </form>
        <div className="mt-5 grid gap-2">
          {props.coupons.items.map((coupon) => (
            <button key={coupon.id} type="button" onClick={() => props.onToggleCoupon(coupon)} className="rounded border border-zinc-800 p-3 text-left text-sm">
              <strong className="text-white">{coupon.code}</strong>
              <span className="ml-2 text-zinc-400">{coupon.active ? "Ativo" : "Inativo"} / {coupon.percentOff ? `${coupon.percentOff}%` : money(coupon.amountOffCents ?? 0)}</span>
            </button>
          ))}
        </div>
      </Panel>
      <Panel title="Pagamentos" icon={<CreditCard className="h-4 w-4" />}>
        <div className="grid gap-3">
          {props.payments.items.map((payment) => (
            <article key={payment.id} className="rounded-md border border-zinc-800 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase text-zinc-500">{payment.provider} / {payment.status}</p>
                  <h3 className="font-semibold text-white">{payment.user.email}</h3>
                  <p className="text-sm text-zinc-400">{money(payment.amountCents)} / {payment.course?.title ?? "Ilimitado"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {props.catalog.paymentStatuses.map((status) => <Button key={status} type="button" variant="ghost" onClick={() => props.onPaymentStatus(payment.id, status)}>{status}</Button>)}
                </div>
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function SettingsPanel(props: {
  catalog: AdminCatalog;
  flags: FeatureFlagRow[];
  settings: SettingRow[];
  form: { key: string; value: string };
  saving: boolean;
  onForm: (value: { key: string; value: string }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFlag: (key: string, enabled: boolean) => void;
}) {
  const flagKeys = new Set(props.flags.map((flag) => flag.key));
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Feature flags" icon={<Flag className="h-4 w-4" />}>
        <div className="grid gap-2">
          {props.catalog.featureFlags.map((key) => {
            const enabled = props.flags.find((flag) => flag.key === key)?.enabled ?? false;
            return (
              <button key={key} type="button" onClick={() => props.onFlag(key, !enabled)} className="flex items-center justify-between rounded border border-zinc-800 p-3 text-left text-sm">
                <span>{key}{!flagKeys.has(key) && <span className="ml-2 text-zinc-500">padrao</span>}</span>
                <strong className={enabled ? "text-emerald-400" : "text-zinc-500"}>{enabled ? "Ligada" : "Desligada"}</strong>
              </button>
            );
          })}
        </div>
      </Panel>
      <Panel title="Configuracoes" icon={<Settings className="h-4 w-4" />}>
        <form className="grid gap-3" onSubmit={props.onSubmit}>
          <TextInput label="Chave" value={props.form.key} onChange={(key) => props.onForm({ ...props.form, key })} />
          <Textarea label="Valor JSON" value={props.form.value} onChange={(value) => props.onForm({ ...props.form, value })} />
          <Button disabled={props.saving} type="submit">Salvar configuracao</Button>
        </form>
        <div className="mt-5 grid gap-2">
          {props.settings.map((setting) => <p key={setting.key} className="rounded border border-zinc-800 p-3 text-sm text-zinc-300">{setting.key}: {JSON.stringify(setting.value)}</p>)}
        </div>
      </Panel>
    </div>
  );
}

function ModerationPanel(props: {
  moderation: ModerationPayload;
  reasons: Record<string, string>;
  saving: boolean;
  onReason: (value: Record<string, string>) => void;
  onAction: (contentType: string, contentId: string, action: "APPROVE" | "REJECT" | "ESCALATE") => void;
}) {
  const items = [
    ...props.moderation.answers.map((item) => ({ key: `QuestionAnswer:${item.id}`, type: "QuestionAnswer", id: item.id, title: item.question.code, body: item.body, author: item.user.email })),
    ...props.moderation.doubts.map((item) => ({ key: `LessonDoubt:${item.id}`, type: "LessonDoubt", id: item.id, title: item.lesson.title, body: item.message, author: item.user.email }))
  ];
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <Panel title="Fila de moderacao" icon={<AlertTriangle className="h-4 w-4" />}>
        <div className="grid gap-3">
          {items.map((item) => (
            <article key={item.key} className="rounded-md border border-zinc-800 p-4">
              <p className="text-xs uppercase text-zinc-500">{item.type} / {item.title} / {item.author}</p>
              <p className="mt-2 text-sm text-zinc-300">{item.body}</p>
              <TextInput label="Motivo" value={props.reasons[item.key] ?? ""} onChange={(reason) => props.onReason({ ...props.reasons, [item.key]: reason })} />
              <div className="mt-3 flex flex-wrap gap-2">
                {(["APPROVE", "REJECT", "ESCALATE"] as const).map((action) => <Button key={action} disabled={props.saving} type="button" variant="ghost" onClick={() => props.onAction(item.type, item.id, action)}>{action}</Button>)}
              </div>
            </article>
          ))}
          {items.length === 0 && <Empty text="Nenhum item encontrado para moderacao." />}
        </div>
      </Panel>
      <Panel title="Historico de moderacao" icon={<Tags className="h-4 w-4" />}>
        <div className="grid gap-2">
          {props.moderation.cases.map((item) => <p key={item.id} className="rounded border border-zinc-800 p-3 text-sm text-zinc-300">{item.action} / {item.contentType} / {item.reason}</p>)}
        </div>
      </Panel>
    </div>
  );
}

function AuditPanel({ audit }: { audit: AuditLog[] }) {
  return (
    <Panel title="Auditoria" icon={<History className="h-4 w-4" />}>
      <div className="grid gap-2">
        {audit.map((item) => <AuditItem key={item.id} item={item} />)}
        {audit.length === 0 && <Empty text="Nenhum registro de auditoria encontrado." />}
      </div>
    </Panel>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-950 p-5">
      <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold uppercase text-white">{icon} {title}</h2>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4"><p className="text-xs uppercase text-zinc-500">{label}</p><strong className="font-display text-2xl text-white">{value}</strong></div>;
}

function TextInput({ label, value, type = "text", onChange }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs uppercase text-zinc-500">
      {label}
      <input className="mt-1 h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-orange-500" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs uppercase text-zinc-500">
      {label}
      <textarea className="mt-1 min-h-28 w-full rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-white outline-none focus:border-orange-500" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({ label, value, items, onChange }: { label: string; value: string; items: Array<{ id: string; name: string }>; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs uppercase text-zinc-500">
      {label}
      <select className="mt-1 h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-orange-500" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Selecione</option>
        {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>
  );
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-zinc-400">
      <Button disabled={page <= 1} type="button" variant="ghost" onClick={() => onPage(page - 1)}>Anterior</Button>
      <span>{page}/{pages}</span>
      <Button disabled={page >= pages} type="button" variant="ghost" onClick={() => onPage(page + 1)}>Proxima</Button>
    </div>
  );
}

function AuditItem({ item }: { item: AuditLog }) {
  return (
    <div className="rounded border border-zinc-800 p-3 text-sm">
      <p className="font-semibold text-white">{item.action}</p>
      <p className="text-zinc-400">{item.actor?.email ?? "sistema"} / {item.entityType} {item.entityId ?? ""}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-md border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">{text}</p>;
}

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}
