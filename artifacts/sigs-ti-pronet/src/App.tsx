import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CircleAlert,
  CircleDot,
  FolderKanban,
  Headphones,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import {
  getGetCurrentUserQueryKey,
  getGetDashboardSummaryQueryKey,
  getListClientsQueryKey,
  getListIncidentsQueryKey,
  getListProjectsQueryKey,
  useCreateClient,
  useCreateIncident,
  useCreateProject,
  useDeleteClient,
  useGetCurrentUser,
  useGetDashboardSummary,
  useListClients,
  useListIncidents,
  useListProjects,
  useListUsers,
  useLogin,
  useLogout,
  useUpdateClient,
  useUpdateIncident,
  useUpdateProject,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

const queryClient = new QueryClient();

type PageName = 'dashboard' | 'incidents' | 'projects' | 'clients' | 'users';
type Notice = { kind: 'success' | 'error'; text: string } | null;

const navItems: { href: string; label: string; icon: typeof LayoutDashboard; page: PageName }[] = [
  { href: '/dashboard', label: 'Resumen operativo', icon: LayoutDashboard, page: 'dashboard' },
  { href: '/incidents', label: 'Incidencias', icon: LifeBuoy, page: 'incidents' },
  { href: '/projects', label: 'Proyectos', icon: FolderKanban, page: 'projects' },
  { href: '/clients', label: 'Clientes', icon: Building2, page: 'clients' },
  { href: '/users', label: 'Usuarios', icon: UsersRound, page: 'users' },
];

function Mark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" data-testid="brand-pronet">
      <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-[hsl(var(--accent))] text-[hsl(var(--sidebar))]">
        <span className="absolute -right-2 -top-2 h-6 w-6 rounded-full border-2 border-[hsl(var(--sidebar))]/25" />
        <span className="font-display text-lg font-semibold leading-none">P</span>
      </div>
      {!compact && (
        <div className="leading-none">
          <div className="font-display text-xl text-[hsl(var(--sidebar-foreground))]">Pronet</div>
          <div className="mt-1 font-mono-app text-[9px] uppercase tracking-[0.22em] text-[hsl(var(--accent))]">SIGS-TI</div>
        </div>
      )}
    </div>
  );
}

function LogoWordmark() {
  return (
    <div className="flex items-center gap-3" data-testid="brand-login">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--accent))] font-display text-2xl font-semibold text-[hsl(var(--sidebar))]">P</div>
      <div>
        <div className="font-display text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))]">Pronet</div>
        <div className="font-mono-app text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--primary))]">System S.A.S.</div>
      </div>
    </div>
  );
}

function LoadingScreen({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))] ${compact ? 'min-h-[300px]' : ''}`} data-testid="loading-screen">
      <div className="w-64 space-y-3">
        <div className="h-2 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
        <div className="h-2 w-4/5 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
        <div className="h-2 w-2/5 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
      </div>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  const labels: Record<string, string> = {
    open: 'Abierta', in_progress: 'En curso', pending: 'Pendiente', resolved: 'Resuelta', closed: 'Cerrada',
    active: 'Activo', planning: 'Planeación', completed: 'Completado', paused: 'En pausa',
    critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja',
  };
  const tone = value === 'critical' || value === 'open' ? 'danger' : value === 'high' || value === 'pending' || value === 'paused' ? 'warning' : value === 'completed' || value === 'resolved' || value === 'active' ? 'success' : 'info';
  const tones = {
    danger: 'bg-[#fae3dc] text-[#9d3824]',
    warning: 'bg-[#fff0c7] text-[#896100]',
    success: 'bg-[#dcefe4] text-[#276445]',
    info: 'bg-[#dfeaf2] text-[#315975]',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`} data-testid={`status-${value}`}>{labels[value] ?? value}</span>;
}

function MetricCard({ label, value, sub, icon: Icon, accent = false }: { label: string; value: number | string; sub: string; icon: typeof Activity; accent?: boolean }) {
  return (
    <div className={`group rounded-2xl border p-5 transition-transform duration-200 hover:-translate-y-0.5 ${accent ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'}`} data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}>
      <div className="flex items-start justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent ? 'bg-white/10' : 'bg-[hsl(var(--secondary))]'}`}><Icon className="h-4 w-4" /></span>
        <ArrowRight className={`h-4 w-4 transition-transform group-hover:translate-x-1 ${accent ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted-foreground))]'}`} />
      </div>
      <div className="mt-6 font-display text-4xl font-semibold tracking-tight">{value}</div>
      <div className={`mt-1 text-sm font-semibold ${accent ? '' : 'text-[hsl(var(--foreground))]'}`}>{label}</div>
      <div className={`mt-1 text-xs ${accent ? 'text-white/65' : 'text-[hsl(var(--muted-foreground))]'}`}>{sub}</div>
    </div>
  );
}

function SearchField({ value, onChange, placeholder, testId }: { value: string; onChange: (v: string) => void; placeholder: string; testId: string }) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
      <input data-testid={testId} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-10 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20" />
    </div>
  );
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-16 text-center" data-testid="empty-state">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><CircleDot className="h-5 w-5" /></div>
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function ErrorState({ retry }: { retry: () => void }) {
  return (
    <div className="rounded-2xl border border-[#e8b7aa] bg-[#fff2ee] p-6 text-center" data-testid="error-state">
      <CircleAlert className="mx-auto h-6 w-6 text-[#ae452e]" />
      <div className="mt-3 font-semibold text-[#873b29]">No pudimos cargar esta vista</div>
      <p className="mt-1 text-sm text-[#9d5a46]">Revisa la conexión y vuelve a intentar.</p>
      <button data-testid="button-retry" onClick={retry} className="mt-4 rounded-lg bg-[#9d3824] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90">Reintentar</button>
    </div>
  );
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[hsl(var(--sidebar))]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="dialog" aria-modal="true" data-testid="modal">
      <div className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl sm:rounded-2xl ${wide ? 'max-w-2xl' : 'max-w-lg'}`}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">{title}</h2>
          <button data-testid="button-close-modal" onClick={onClose} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return <label className={`block space-y-2 ${className}`}><span className="text-xs font-semibold uppercase tracking-[0.08em] text-[hsl(var(--muted-foreground))]">{label}</span>{children}</label>;
}

const inputClass = 'h-10 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm outline-none transition-colors focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--ring))]/20';
const selectClass = `${inputClass} cursor-pointer`;
const buttonPrimary = 'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-[hsl(var(--primary-foreground))] transition-all hover:-translate-y-px hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50';
const buttonQuiet = 'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 text-sm font-semibold text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--secondary))]';

function Login() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setNotice('');
    login.mutate({ data: { email, password } }, {
      onSuccess: (session) => { qc.setQueryData(getGetCurrentUserQueryKey(), session.user); setLocation('/dashboard'); },
      onError: () => setNotice('No pudimos validar tus credenciales. Revisa los datos e intenta de nuevo.'),
    });
  };
  return (
    <main className="app-noise flex min-h-[100dvh] flex-col bg-[hsl(var(--background))] lg:flex-row" data-testid="login-screen">
      <section className="relative flex min-h-[290px] flex-1 overflow-hidden bg-[hsl(var(--sidebar))] p-7 text-[hsl(var(--sidebar-foreground))] sm:p-10 lg:min-h-[100dvh] lg:max-w-[51%] lg:p-14">
        <div className="relative z-10 flex w-full flex-col justify-between">
          <div className="animate-in-fade"><Mark /></div>
          <div className="max-w-xl animate-in-up">
            <div className="mb-4 font-mono-app text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--accent))]">Pronet System S.A.S.</div>
            <h1 className="max-w-lg font-display text-5xl leading-[.98] tracking-[-0.04em] sm:text-6xl lg:text-[5.5rem]">El servicio,<br /><span className="text-[hsl(var(--accent))]">bajo control.</span></h1>
            <p className="mt-6 max-w-md text-sm leading-6 text-[hsl(var(--sidebar-foreground))]/60 sm:text-base">Una vista compartida para que cada incidencia avance con contexto, evidencia y responsabilidad.</p>
          </div>
          <div className="flex items-center justify-between pt-10 font-mono-app text-[9px] uppercase tracking-[0.18em] text-[hsl(var(--sidebar-foreground))]/40"><span>Control operativo</span><span>v2.4 / LTMA</span></div>
        </div>
        <div className="absolute -bottom-28 -right-40 h-[440px] w-[440px] rounded-full border-[18px] border-[hsl(var(--accent))]/10 sm:h-[560px] sm:w-[560px]" />
        <div className="absolute -bottom-7 -right-20 h-[330px] w-[330px] rounded-full border-[1px] border-[hsl(var(--accent))]/25" />
      </section>
      <section className="flex flex-1 items-center justify-center px-6 py-12 sm:px-12 lg:p-16">
        <div className="w-full max-w-[380px] animate-in-up delay-1">
          <LogoWordmark />
          <div className="mt-14">
            <div className="font-mono-app text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Acceso seguro</div>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight">Bienvenido de vuelta</h2>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Ingresa a tu espacio operativo.</p>
          </div>
          <form onSubmit={submit} className="mt-9 space-y-5">
            <Field label="Correo corporativo"><input data-testid="input-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@pronetsystem.com" className={inputClass} /></Field>
            <Field label="Contraseña"><input data-testid="input-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputClass} /></Field>
            {notice && <div className="rounded-xl border border-[#e8b7aa] bg-[#fff2ee] px-3 py-2.5 text-sm text-[#873b29]" data-testid="login-error">{notice}</div>}
            <button data-testid="button-login" type="submit" disabled={login.isPending} className={`${buttonPrimary} h-12 w-full justify-between px-5`}>
              <span>{login.isPending ? 'Validando acceso…' : 'Ingresar al sistema'}</span><ArrowRight className="h-4 w-4" />
            </button>
          </form>
          <div className="mt-7 flex items-center justify-center gap-2 text-center text-xs text-[hsl(var(--muted-foreground))]"><ShieldCheck className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> Sesión protegida · Acceso por roles</div>
        </div>
      </section>
    </main>
  );
}

function Sidebar({ page, user, onLogout }: { page: PageName; user: any; onLogout: () => void }) {
  return (
    <aside className="hidden w-[250px] shrink-0 flex-col bg-[hsl(var(--sidebar))] p-5 text-[hsl(var(--sidebar-foreground))] lg:flex" data-testid="sidebar">
      <div className="px-2 py-2"><Mark /></div>
      <div className="mt-12 px-2 font-mono-app text-[9px] uppercase tracking-[0.18em] text-[hsl(var(--sidebar-foreground))]/35">Espacio de trabajo</div>
      <nav className="mt-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon, page: target }) => (
          <Link data-testid={`link-${target}`} key={href} href={href} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${page === target ? 'bg-[hsl(var(--sidebar-accent))] font-semibold text-[hsl(var(--sidebar-foreground))]' : 'text-[hsl(var(--sidebar-foreground))]/55 hover:bg-[hsl(var(--sidebar-accent))]/60 hover:text-[hsl(var(--sidebar-foreground))]'}`}>
            <Icon className={`h-[17px] w-[17px] ${page === target ? 'text-[hsl(var(--accent))]' : ''}`} /><span>{label}</span>{page === target && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />}
          </Link>
        ))}
      </nav>
      <div className="mt-auto border-t border-[hsl(var(--sidebar-border))] pt-4">
        <div className="flex items-center gap-3 rounded-xl px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--accent))] font-semibold text-[hsl(var(--sidebar))]" data-testid="avatar-current-user">{String(user?.name ?? 'U').split(' ').map((x: string) => x[0]).join('').slice(0, 2)}</div>
          <div className="min-w-0"><div className="truncate text-sm font-semibold" data-testid="text-current-user">{user?.name}</div><div className="truncate text-[10px] uppercase tracking-wider text-[hsl(var(--sidebar-foreground))]/40">{user?.role}</div></div>
        </div>
        <button data-testid="button-logout" onClick={onLogout} className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[hsl(var(--sidebar-foreground))]/55 transition-colors hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]"><LogOut className="h-4 w-4" />Cerrar sesión</button>
      </div>
    </aside>
  );
}

function Topbar({ page, user, onLogout, onMenu }: { page: PageName; user: any; onLogout: () => void; onMenu: () => void }) {
  const current = navItems.find((item) => item.page === page);
  return (
    <header className="sticky top-0 z-20 flex h-[74px] items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/90 px-5 backdrop-blur-md sm:px-8 lg:px-10" data-testid="topbar">
      <div className="flex items-center gap-3"><button data-testid="button-open-menu" onClick={onMenu} className="rounded-lg p-2 lg:hidden"><Menu className="h-5 w-5" /></button><div><div className="font-mono-app text-[9px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">SIGS-TI / Operaciones</div><h1 className="mt-1 font-display text-2xl font-semibold">{current?.label}</h1></div></div>
      <div className="flex items-center gap-2 sm:gap-5"><button data-testid="button-notifications" className="relative rounded-xl p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"><Bell className="h-[18px] w-[18px]" /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" /></button><div className="hidden text-right sm:block"><div className="text-sm font-semibold">{user?.name}</div><div className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{user?.role}</div></div><button data-testid="button-mobile-logout" onClick={onLogout} className="rounded-xl p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] lg:hidden"><LogOut className="h-4 w-4" /></button></div>
    </header>
  );
}

function MobileNav({ open, onClose, page }: { open: boolean; onClose: () => void; page: PageName }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-40 bg-[hsl(var(--sidebar))]/45 lg:hidden" onClick={onClose}><aside onClick={(e) => e.stopPropagation()} className="h-full w-[280px] bg-[hsl(var(--sidebar))] p-5 text-[hsl(var(--sidebar-foreground))]"><div className="flex items-center justify-between px-2"><Mark /><button data-testid="button-close-menu" onClick={onClose} className="rounded-lg p-2"><X className="h-4 w-4" /></button></div><nav className="mt-12 space-y-1">{navItems.map(({ href, label, icon: Icon, page: target }) => <Link data-testid={`mobile-link-${target}`} onClick={onClose} key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${page === target ? 'bg-[hsl(var(--sidebar-accent))] font-semibold' : 'text-[hsl(var(--sidebar-foreground))]/60'}`}><Icon className="h-4 w-4" />{label}</Link>)}</nav></aside></div>;
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="font-mono-app text-[9px] uppercase tracking-[0.22em] text-[hsl(var(--primary))]">{eyebrow}</div><h2 className="mt-2 font-display text-4xl font-semibold tracking-tight">{title}</h2><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{description}</p></div>{action}</div>;
}

function Dashboard() {
  const query = useGetDashboardSummary();
  const summary: any = query.data;
  if (query.isLoading) return <LoadingScreen compact />;
  if (query.isError || !summary) return <ErrorState retry={() => query.refetch()} />;
  const byStatus = summary.incidentByStatus ?? {};
  const total = Object.values(byStatus).reduce((a: number, b: any) => a + Number(b), 0) || summary.activeIncidents || 1;
  return <div className="animate-in-fade"><PageHeader eyebrow="Vista general / Hoy" title="El servicio, bajo control." description="Lectura rápida del pulso operativo de Pronet." action={<div className="hidden items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] sm:flex"><span className="h-2 w-2 rounded-full bg-[#4b9b70]" /> Datos actualizados</div>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Incidencias activas" value={summary.activeIncidents} sub="Requieren seguimiento" icon={LifeBuoy} accent /><MetricCard label="Atención crítica" value={summary.criticalIncidents} sub="Prioridad inmediata" icon={CircleAlert} /><MetricCard label="Proyectos activos" value={summary.activeProjects} sub="En ejecución" icon={FolderKanban} /><MetricCard label="Clientes" value={summary.clients} sub="Relaciones activas" icon={Building2} /></div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-6"><div className="flex items-center justify-between"><div><h3 className="font-display text-xl font-semibold">Incidencias recientes</h3><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Las últimas conversaciones del equipo</p></div><Link href="/incidents" className="text-xs font-semibold text-[hsl(var(--primary))] hover:underline">Ver todas <ArrowRight className="ml-1 inline h-3 w-3" /></Link></div><div className="mt-5 divide-y divide-[hsl(var(--border))]">{summary.recentIncidents?.length ? summary.recentIncidents.slice(0, 5).map((item: any) => <Link href="/incidents" key={item.id} data-testid={`incident-recent-${item.id}`} className="group flex items-center gap-3 py-3.5 first:pt-0 last:pb-0"><div className={`h-2 w-2 shrink-0 rounded-full ${item.priority === 'critical' ? 'bg-[#c94c32]' : item.priority === 'high' ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--primary))]'}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-mono-app text-[10px] text-[hsl(var(--muted-foreground))]">{item.code}</span><StatusPill value={item.status} /></div><div className="mt-1 truncate text-sm font-semibold group-hover:text-[hsl(var(--primary))]">{item.title}</div><div className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{item.clientName} · {item.assigneeName || 'Sin asignar'}</div></div><ArrowRight className="h-4 w-4 text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-1" /></Link>) : <EmptyState title="Sin actividad reciente" text="Las nuevas incidencias aparecerán aquí." />}</div></section>
      <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-6"><div><h3 className="font-display text-xl font-semibold">Estado de la cola</h3><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Distribución de incidencias registradas</p></div><div className="mt-7 space-y-5">{[['open', 'Abiertas'], ['in_progress', 'En curso'], ['pending', 'Pendientes'], ['resolved', 'Resueltas']].map(([key, label]) => { const count = Number(byStatus[key] ?? 0); return <div key={key} data-testid={`bar-status-${key}`}><div className="mb-2 flex justify-between text-xs"><span className="font-semibold">{label}</span><span className="font-mono-app text-[hsl(var(--muted-foreground))]">{count}</span></div><div className="h-2 rounded-full bg-[hsl(var(--secondary))]"><div className={`h-2 rounded-full transition-all ${key === 'open' ? 'bg-[#c94c32]' : key === 'in_progress' ? 'bg-[hsl(var(--primary))]' : key === 'pending' ? 'bg-[hsl(var(--accent))]' : 'bg-[#4b9b70]'}`} style={{ width: `${Math.max(count / total * 100, count ? 4 : 0)}%` }} /></div></div> })}</div><div className="mt-8 rounded-xl bg-[hsl(var(--secondary))] p-4"><div className="flex items-center gap-2 text-xs font-semibold"><BarChart3 className="h-4 w-4 text-[hsl(var(--primary))]" /> Ritmo operativo</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Mantén cada caso con un próximo paso claro. La trazabilidad es parte del servicio.</p></div></section>
    </div>
  </div>;
}

function Incidents() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const params = useMemo(() => ({ ...(search ? { search } : {}), ...(status ? { status: status as any } : {}), ...(priority ? { priority: priority as any } : {}) }), [search, status, priority]);
  const query = useListIncidents(params as any);
  const clients = useListClients();
  const users = useListUsers();
  const create = useCreateIncident();
  const update = useUpdateIncident();
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', description: '', clientId: '', priority: 'medium', category: 'Soporte general', assigneeId: '' });
  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate({ data: { ...form, clientId: Number(form.clientId), assigneeId: form.assigneeId ? Number(form.assigneeId) : null, priority: form.priority as any } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListIncidentsQueryKey() }); qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); setOpen(false); setNotice({ kind: 'success', text: 'Incidencia creada y agregada a la cola.' }); }, onError: () => setNotice({ kind: 'error', text: 'No pudimos crear la incidencia.' }) }); };
  const changeStatus = (id: number, next: string) => update.mutate({ id, data: { status: next as any } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListIncidentsQueryKey() }); qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); setNotice({ kind: 'success', text: 'Estado actualizado.' }); }, onError: () => setNotice({ kind: 'error', text: 'No pudimos actualizar el estado.' }) });
  return <div className="animate-in-fade"><PageHeader eyebrow="Operación / Seguimiento" title="Incidencias" description="Cada caso tiene un dueño, un estado y un siguiente paso." action={<button data-testid="button-new-incident" onClick={() => setOpen(true)} className={buttonPrimary}><Plus className="h-4 w-4" /> Nueva incidencia</button>} />
    {notice && <div data-testid="notice-incidents" className={`mb-5 flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${notice.kind === 'success' ? 'border-[#acd4bc] bg-[#edf8f1] text-[#276445]' : 'border-[#e8b7aa] bg-[#fff2ee] text-[#873b29]'}`}><span>{notice.text}</span><button data-testid="button-dismiss-notice" onClick={() => setNotice(null)}><X className="h-4 w-4" /></button></div>}
    <div className="mb-5 flex flex-col gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 sm:flex-row"><SearchField value={search} onChange={setSearch} placeholder="Buscar por código, título o cliente…" testId="input-search-incidents" /><select data-testid="select-incident-status" value={status} onChange={(e) => setStatus(e.target.value)} className={`${selectClass} w-full sm:w-44`}><option value="">Todos los estados</option><option value="open">Abiertas</option><option value="in_progress">En curso</option><option value="pending">Pendientes</option><option value="resolved">Resueltas</option><option value="closed">Cerradas</option></select><select data-testid="select-incident-priority" value={priority} onChange={(e) => setPriority(e.target.value)} className={`${selectClass} w-full sm:w-36`}><option value="">Prioridad</option><option value="critical">Crítica</option><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option></select></div>
    {query.isLoading ? <LoadingScreen compact /> : query.isError ? <ErrorState retry={() => query.refetch()} /> : query.data?.length ? <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]"><div className="hidden grid-cols-[.7fr_1.5fr_1fr_.7fr_.9fr_1fr] gap-4 border-b border-[hsl(var(--border))] px-5 py-3 font-mono-app text-[9px] uppercase tracking-[0.14em] text-[hsl(var(--muted-foreground))] md:grid"><span>Código</span><span>Incidencia</span><span>Cliente</span><span>Prioridad</span><span>Estado</span><span>Responsable</span></div>{query.data.map((item: any) => <div key={item.id} className="grid gap-3 border-b border-[hsl(var(--border))] px-5 py-4 last:border-0 md:grid-cols-[.7fr_1.5fr_1fr_.7fr_.9fr_1fr] md:items-center md:gap-4" data-testid={`row-incident-${item.id}`}><div className="font-mono-app text-[11px] text-[hsl(var(--primary))]">{item.code}</div><div><div className="font-semibold">{item.title}</div><div className="mt-1 line-clamp-1 text-xs text-[hsl(var(--muted-foreground))]">{item.description}</div></div><div className="text-sm text-[hsl(var(--muted-foreground))]">{item.clientName}</div><div><StatusPill value={item.priority} /></div><div><select data-testid={`select-status-${item.id}`} value={item.status} disabled={update.isPending} onChange={(e) => changeStatus(item.id, e.target.value)} className="h-8 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 text-xs font-semibold"><option value="open">Abierta</option><option value="in_progress">En curso</option><option value="pending">Pendiente</option><option value="resolved">Resuelta</option><option value="closed">Cerrada</option></select></div><div className="flex items-center gap-2 text-sm"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--secondary))] text-[10px] font-semibold">{(item.assigneeName || 'SA').split(' ').map((x: string) => x[0]).join('').slice(0, 2)}</div>{item.assigneeName || 'Sin asignar'}</div></div>)}</div> : <EmptyState title="La cola está despejada" text="No hay incidencias que coincidan con estos filtros." action={<button data-testid="button-empty-new-incident" onClick={() => setOpen(true)} className={buttonQuiet}><Plus className="h-4 w-4" /> Registrar incidencia</button>} />}
    {open && <Modal title="Nueva incidencia" onClose={() => setOpen(false)} wide><form onSubmit={submit} className="space-y-4"><Field label="Título"><input data-testid="input-incident-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} placeholder="Describe el problema en una línea" /></Field><Field label="Descripción"><textarea data-testid="input-incident-description" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputClass} h-24 resize-none py-2`} placeholder="Añade contexto para el equipo…" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Cliente"><select data-testid="select-incident-client" required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className={selectClass}><option value="">Selecciona un cliente</option>{clients.data?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Categoría"><input data-testid="input-incident-category" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass} /></Field><Field label="Prioridad"><select data-testid="select-new-incident-priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={selectClass}><option value="critical">Crítica</option><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option></select></Field><Field label="Asignar a"><select data-testid="select-incident-assignee" value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} className={selectClass}><option value="">Sin asignar</option>{users.data?.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field></div><div className="flex justify-end gap-2 pt-3"><button type="button" data-testid="button-cancel-incident" onClick={() => setOpen(false)} className={buttonQuiet}>Cancelar</button><button type="submit" data-testid="button-save-incident" disabled={create.isPending} className={buttonPrimary}>{create.isPending ? 'Guardando…' : 'Crear incidencia'}</button></div></form></Modal>}
  </div>;
}

function Projects() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const params = useMemo(() => ({ ...(search ? { search } : {}), ...(status ? { status: status as any } : {}) }), [search, status]);
  const query = useListProjects(params as any);
  const clients = useListClients();
  const create = useCreateProject();
  const update = useUpdateProject();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', clientId: '', status: 'planning', progress: '0', startDate: '', dueDate: '', leadName: '' });
  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate({ data: { ...form, clientId: Number(form.clientId), progress: Number(form.progress), status: form.status as any } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListProjectsQueryKey() }); qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); setOpen(false); setNotice({ kind: 'success', text: 'Proyecto creado.' }); }, onError: () => setNotice({ kind: 'error', text: 'No pudimos crear el proyecto.' }) }); };
  const updateStatus = (id: number, next: string) => update.mutate({ id, data: { status: next as any } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListProjectsQueryKey() }); setNotice({ kind: 'success', text: 'Estado de proyecto actualizado.' }); } });
  return <div className="animate-in-fade"><PageHeader eyebrow="Portafolio / Entrega" title="Proyectos" description="El trabajo de largo aliento, con fechas y responsables visibles." action={<button data-testid="button-new-project" onClick={() => setOpen(true)} className={buttonPrimary}><Plus className="h-4 w-4" /> Nuevo proyecto</button>} />
    {notice && <div data-testid="notice-projects" className={`mb-5 rounded-xl border px-4 py-3 text-sm ${notice.kind === 'success' ? 'border-[#acd4bc] bg-[#edf8f1] text-[#276445]' : 'border-[#e8b7aa] bg-[#fff2ee] text-[#873b29]'}`}>{notice.text}</div>}
    <div className="mb-5 flex flex-col gap-2 sm:flex-row"><SearchField value={search} onChange={setSearch} placeholder="Buscar proyecto o cliente…" testId="input-search-projects" /><select data-testid="select-project-status" value={status} onChange={(e) => setStatus(e.target.value)} className={`${selectClass} w-full sm:w-44`}><option value="">Todos los estados</option><option value="planning">Planeación</option><option value="active">Activos</option><option value="paused">En pausa</option><option value="completed">Completados</option></select></div>
    {query.isLoading ? <LoadingScreen compact /> : query.isError ? <ErrorState retry={() => query.refetch()} /> : query.data?.length ? <div className="grid gap-4 lg:grid-cols-2">{query.data.map((item: any, index: number) => <article key={item.id} className={`rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 transition-transform hover:-translate-y-0.5 ${index === 0 ? 'lg:col-span-2' : ''}`} data-testid={`card-project-${item.id}`}><div className="flex items-start justify-between gap-4"><div><div className="font-mono-app text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--primary))]">Proyecto PR-{String(item.id).padStart(3, '0')}</div><h3 className="mt-2 font-display text-2xl font-semibold">{item.name}</h3><div className="mt-1 flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]"><Building2 className="h-3.5 w-3.5" />{item.clientName}</div></div><select data-testid={`select-project-status-${item.id}`} value={item.status} onChange={(e) => updateStatus(item.id, e.target.value)} className="h-8 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 text-xs font-semibold"><option value="planning">Planeación</option><option value="active">Activo</option><option value="paused">En pausa</option><option value="completed">Completado</option></select></div><div className="mt-7 flex items-end justify-between"><div><div className="font-display text-4xl font-semibold">{item.progress}<span className="text-xl text-[hsl(var(--muted-foreground))]">%</span></div><div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">avance reportado</div></div><div className="text-right text-xs text-[hsl(var(--muted-foreground))]"><div className="flex items-center justify-end gap-1"><CalendarDays className="h-3 w-3" /> Entrega {item.dueDate || 'Por definir'}</div><div className="mt-1">Lidera {item.leadName || 'Sin asignar'}</div></div></div><div className="mt-4 h-2 rounded-full bg-[hsl(var(--secondary))]"><div className="h-2 rounded-full bg-[hsl(var(--primary))] transition-all" style={{ width: `${item.progress}%` }} /></div></article>)}</div> : <EmptyState title="Aún no hay proyectos" text="Crea el primer proyecto para empezar a seguir su avance." action={<button data-testid="button-empty-new-project" onClick={() => setOpen(true)} className={buttonPrimary}><Plus className="h-4 w-4" /> Crear proyecto</button>} />}
    {open && <Modal title="Nuevo proyecto" onClose={() => setOpen(false)}><form onSubmit={submit} className="space-y-4"><Field label="Nombre del proyecto"><input data-testid="input-project-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Ej. Renovación de red sede norte" /></Field><Field label="Cliente"><select data-testid="select-project-client" required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className={selectClass}><option value="">Selecciona un cliente</option>{clients.data?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Estado"><select data-testid="select-new-project-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={selectClass}><option value="planning">Planeación</option><option value="active">Activo</option><option value="paused">En pausa</option></select></Field><Field label="Avance (%)"><input data-testid="input-project-progress" type="number" min="0" max="100" value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} className={inputClass} /></Field><Field label="Fecha de inicio"><input data-testid="input-project-start" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inputClass} /></Field><Field label="Fecha de entrega"><input data-testid="input-project-due" required type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inputClass} /></Field></div><Field label="Líder del proyecto"><input data-testid="input-project-lead" value={form.leadName} onChange={(e) => setForm({ ...form, leadName: e.target.value })} className={inputClass} placeholder="Nombre del responsable" /></Field><div className="flex justify-end gap-2 pt-3"><button type="button" data-testid="button-cancel-project" onClick={() => setOpen(false)} className={buttonQuiet}>Cancelar</button><button type="submit" data-testid="button-save-project" disabled={create.isPending} className={buttonPrimary}>{create.isPending ? 'Guardando…' : 'Crear proyecto'}</button></div></form></Modal>}
  </div>;
}

function Clients() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const params = useMemo(() => search ? { search } : undefined, [search]);
  const query = useListClients(params);
  const create = useCreateClient();
  const update = useUpdateClient();
  const remove = useDeleteClient();
  const qc = useQueryClient();
  const empty = { name: '', industry: '', contactName: '', contactEmail: '', phone: '' };
  const [form, setForm] = useState(empty);
  const startCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const startEdit = (item: any) => { setEditing(item); setForm({ name: item.name, industry: item.industry, contactName: item.contactName, contactEmail: item.contactEmail, phone: item.phone || '' }); setOpen(true); };
  const submit = (e: FormEvent) => { e.preventDefault(); if (editing) update.mutate({ id: editing.id, data: form }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListClientsQueryKey() }); setOpen(false); setNotice({ kind: 'success', text: 'Cliente actualizado.' }); }, onError: () => setNotice({ kind: 'error', text: 'No pudimos actualizar el cliente.' }) }); else create.mutate({ data: form }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListClientsQueryKey() }); qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); setOpen(false); setNotice({ kind: 'success', text: 'Cliente creado.' }); }, onError: () => setNotice({ kind: 'error', text: 'No pudimos crear el cliente.' }) }); };
  const deleteClient = (id: number, name: string) => { if (!window.confirm(`¿Eliminar a ${name}? Esta acción no se puede deshacer.`)) return; remove.mutate({ id }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListClientsQueryKey() }); qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); setNotice({ kind: 'success', text: 'Cliente eliminado.' }); }, onError: () => setNotice({ kind: 'error', text: 'No pudimos eliminar el cliente.' }) }); };
  return <div className="animate-in-fade"><PageHeader eyebrow="Relaciones / Contexto" title="Clientes" description="La información que da contexto a cada servicio." action={<button data-testid="button-new-client" onClick={startCreate} className={buttonPrimary}><Plus className="h-4 w-4" /> Nuevo cliente</button>} />
    {notice && <div data-testid="notice-clients" className={`mb-5 rounded-xl border px-4 py-3 text-sm ${notice.kind === 'success' ? 'border-[#acd4bc] bg-[#edf8f1] text-[#276445]' : 'border-[#e8b7aa] bg-[#fff2ee] text-[#873b29]'}`}>{notice.text}</div>}
    <div className="mb-5 max-w-xl"><SearchField value={search} onChange={setSearch} placeholder="Buscar por empresa o contacto…" testId="input-search-clients" /></div>
    {query.isLoading ? <LoadingScreen compact /> : query.isError ? <ErrorState retry={() => query.refetch()} /> : query.data?.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{query.data.map((item: any) => <article key={item.id} className="group rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 transition-transform hover:-translate-y-0.5" data-testid={`card-client-${item.id}`}><div className="flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><Building2 className="h-5 w-5" /></div><div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"><button data-testid={`button-edit-client-${item.id}`} onClick={() => startEdit(item)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--primary))]"><Pencil className="h-3.5 w-3.5" /></button><button data-testid={`button-delete-client-${item.id}`} onClick={() => deleteClient(item.id, item.name)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[#fff0ec] hover:text-[#9d3824]"><Trash2 className="h-3.5 w-3.5" /></button></div></div><div className="mt-5 flex items-start justify-between gap-3"><div><h3 className="font-display text-xl font-semibold">{item.name}</h3><div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{item.industry}</div></div><StatusPill value={item.status} /></div><div className="mt-6 space-y-2 border-t border-[hsl(var(--border))] pt-4 text-sm"><div className="flex items-center gap-2"><UserRound className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />{item.contactName}</div><div className="flex items-center gap-2 truncate text-[hsl(var(--muted-foreground))]"><Headphones className="h-3.5 w-3.5 shrink-0" />{item.contactEmail}</div>{item.phone && <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]"><Activity className="h-3.5 w-3.5" />{item.phone}</div>}</div></article>)}</div> : <EmptyState title="Sin clientes registrados" text="Crea un cliente para asociar proyectos e incidencias." action={<button data-testid="button-empty-new-client" onClick={startCreate} className={buttonPrimary}><Plus className="h-4 w-4" /> Añadir cliente</button>} />}
    {open && <Modal title={editing ? 'Editar cliente' : 'Nuevo cliente'} onClose={() => setOpen(false)}><form onSubmit={submit} className="space-y-4"><Field label="Empresa"><input data-testid="input-client-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Nombre de la empresa" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Industria"><input data-testid="input-client-industry" required value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className={inputClass} /></Field><Field label="Teléfono"><input data-testid="input-client-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} /></Field></div><Field label="Persona de contacto"><input data-testid="input-client-contact" required value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className={inputClass} /></Field><Field label="Correo del contacto"><input data-testid="input-client-email" required type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className={inputClass} /></Field><div className="flex justify-end gap-2 pt-3"><button type="button" data-testid="button-cancel-client" onClick={() => setOpen(false)} className={buttonQuiet}>Cancelar</button><button type="submit" data-testid="button-save-client" disabled={create.isPending || update.isPending} className={buttonPrimary}>{create.isPending || update.isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear cliente'}</button></div></form></Modal>}
  </div>;
}

function Users() {
  const query = useListUsers();
  return <div className="animate-in-fade"><PageHeader eyebrow="Equipo / Permisos" title="Usuarios" description="Personas con acceso a la operación y sus niveles de responsabilidad." /><div className="mb-6 flex items-center gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"><ShieldCheck className="h-5 w-5 text-[hsl(var(--primary))]" /><p className="text-sm text-[hsl(var(--muted-foreground))]">Los accesos se gestionan desde la administración central. Esta vista es de consulta.</p></div>{query.isLoading ? <LoadingScreen compact /> : query.isError ? <ErrorState retry={() => query.refetch()} /> : query.data?.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{query.data.map((user: any) => <article key={user.id} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5" data-testid={`card-user-${user.id}`}><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-[hsl(var(--primary))] font-semibold text-[hsl(var(--primary-foreground))]" data-testid={`avatar-user-${user.id}`}>{user.name.split(' ').map((x: string) => x[0]).join('').slice(0, 2)}</div><div className="min-w-0"><h3 className="truncate font-semibold">{user.name}</h3><div className="truncate text-xs text-[hsl(var(--muted-foreground))]">{user.email}</div></div><span className="ml-auto h-2 w-2 rounded-full bg-[#4b9b70]" title="Activo" /></div><div className="mt-5 flex items-center justify-between border-t border-[hsl(var(--border))] pt-4"><span className="font-mono-app text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--primary))]">{user.role}</span><span className="text-xs text-[hsl(var(--muted-foreground))]">{user.status === 'active' ? 'Activo' : user.status}</span></div></article>)}</div> : <EmptyState title="Sin usuarios disponibles" text="No hay usuarios para mostrar en este momento." />}</div>;
}

function AppShell({ page, user }: { page: PageName; user: any }) {
  const [, setLocation] = useLocation();
  const logout = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);
  const qc = useQueryClient();
  const onLogout = () => logout.mutate(undefined, { onSuccess: () => { qc.removeQueries({ queryKey: getGetCurrentUserQueryKey() }); setLocation('/'); } });
  const content = page === 'dashboard' ? <Dashboard /> : page === 'incidents' ? <Incidents /> : page === 'projects' ? <Projects /> : page === 'clients' ? <Clients /> : <Users />;
  return <div className="flex min-h-[100dvh] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"><Sidebar page={page} user={user} onLogout={onLogout} /><div className="min-w-0 flex-1"><Topbar page={page} user={user} onLogout={onLogout} onMenu={() => setMobileOpen(true)} /><MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} page={page} /><main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">{content}</main></div></div>;
}

function Router() {
  const [location, setLocation] = useLocation();
  const current = useGetCurrentUser();
  useEffect(() => { if (location === '/' && current.data) setLocation('/dashboard'); }, [location, current.data, setLocation]);
  useEffect(() => { if (location !== '/' && current.isError) setLocation('/'); }, [location, current.isError, setLocation]);
  if (location === '/') return <Login />;
  if (current.isLoading) return <LoadingScreen />;
  if (current.isError || !current.data) return <LoadingScreen />;
  return <Switch><Route path="/dashboard"><AppShell page="dashboard" user={current.data} /></Route><Route path="/incidents"><AppShell page="incidents" user={current.data} /></Route><Route path="/projects"><AppShell page="projects" user={current.data} /></Route><Route path="/clients"><AppShell page="clients" user={current.data} /></Route><Route path="/users"><AppShell page="users" user={current.data} /></Route><Route component={NotFound} /></Switch>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><ErrorBoundary resetKey={useLocation()[0]}><Router /></ErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;