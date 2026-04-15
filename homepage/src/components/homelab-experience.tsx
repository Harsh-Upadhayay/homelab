"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Cloud,
  Clapperboard,
  GitBranch,
  HardDrive,
  Lock,
  Route,
  Server,
  Shield,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { ArchitectureMap } from "@/components/architecture-map";
import type { CheckedService, Overview } from "@/lib/overview";
import { cn } from "@/lib/utils";
import { Spotlight } from "@/components/ui/spotlight-new";

const REFRESH_INTERVAL_MS = 60000;

const SECTION_ORDER = ["Platform", "Cloud", "Media", "Automation", "AI", "Lab"] as const;

type SectionMeta = {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
};

const SECTION_META: Record<string, SectionMeta> = {
  Platform: {
    title: "Platform",
    description: "Ingress, identity, and operator surfaces.",
    icon: Shield,
    tone: "from-blue-400/18 to-blue-200/0",
  },
  Cloud: {
    title: "Cloud",
    description: "Personal cloud applications and sync workloads.",
    icon: Cloud,
    tone: "from-cyan-400/16 to-cyan-200/0",
  },
  Media: {
    title: "Media",
    description: "Streaming, discovery, and request layer.",
    icon: Clapperboard,
    tone: "from-emerald-400/16 to-emerald-200/0",
  },
  Automation: {
    title: "Automation",
    description: "Indexer orchestration and release handling.",
    icon: GitBranch,
    tone: "from-violet-400/16 to-violet-200/0",
  },
  AI: {
    title: "AI",
    description: "GPU-backed local inference and API gateway.",
    icon: Bot,
    tone: "from-fuchsia-400/16 to-fuchsia-200/0",
  },
  Lab: {
    title: "Lab",
    description: "Additional domains and experimental services.",
    icon: Server,
    tone: "from-zinc-400/16 to-zinc-200/0",
  },
};

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }
  return `${value.toFixed(1)}%`;
}

function formatUptime(value: number | null) {
  if (value === null || value <= 0) {
    return "--";
  }

  const totalHours = Math.floor(value / 3600);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  return `${hours}h`;
}

function formatThroughput(bytesPerSecond: number | null) {
  if (bytesPerSecond === null || bytesPerSecond <= 0) {
    return "--";
  }

  const units = ["B/s", "KB/s", "MB/s", "GB/s"];
  let value = bytesPerSecond;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 10 ? 1 : 2;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function formatEndpointStatus(service: CheckedService) {
  if (service.statusCode !== null) {
    return `HTTP ${service.statusCode}`;
  }

  if (service.error) {
    return service.error;
  }

  return "No response";
}

function getAccessTone(access: string) {
  switch (access) {
    case "Public":
      return "border-emerald-300/20 bg-emerald-500/10 text-emerald-200";
    case "Admin":
      return "border-amber-300/20 bg-amber-500/10 text-amber-200";
    default:
      return "border-sky-300/20 bg-sky-500/10 text-sky-200";
  }
}

function StatusPill({ active, error }: { active: boolean; error: string | null }) {
  if (error) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/35 bg-rose-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-rose-200">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-300" />
        Down
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]",
        active
          ? "border-emerald-300/35 bg-emerald-500/10 text-emerald-200"
          : "border-zinc-300/35 bg-zinc-500/10 text-zinc-200",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-emerald-300" : "bg-zinc-300")} />
      {active ? "Online" : "Offline"}
    </span>
  );
}

function EndpointRow({
  service,
  isLast,
}: {
  service: CheckedService;
  isLast: boolean;
}) {
  return (
    <a
      href={service.url}
      target="_blank"
      rel="noreferrer"
      className="endpoint-row group relative grid gap-3 px-4 py-4 pl-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-5 md:pl-12"
    >
      <span
        className={cn(
          "pointer-events-none absolute left-4 top-[1.45rem] h-3 w-3 rounded-full border shadow-[0_0_0_6px_rgba(255,255,255,0.03)] md:left-5",
          service.active
            ? "border-emerald-300/70 bg-emerald-300"
            : "border-rose-300/60 bg-rose-300",
        )}
      />
      {!isLast ? (
        <span
          className={cn(
            "pointer-events-none absolute bottom-[-0.8rem] left-[21px] top-7 w-px md:left-6",
            service.active
              ? "bg-gradient-to-b from-emerald-300/35 via-white/8 to-transparent"
              : "bg-gradient-to-b from-rose-300/25 via-white/8 to-transparent",
          )}
        />
      ) : null}

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h4 className="text-base font-light tracking-[0.01em] text-white/92">{service.name}</h4>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]",
              getAccessTone(service.access),
            )}
          >
            {service.access}
          </span>
          {service.dynamic ? (
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/45">
              Dynamic
            </span>
          ) : null}
        </div>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/52">{service.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.18em] text-white/35">
          <span className="font-mono normal-case tracking-[0.08em] text-white/42">{service.host}</span>
          <span className="hidden sm:inline text-white/15">/</span>
          <span>{formatEndpointStatus(service)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <span className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
          {service.statusCode !== null ? `${service.responseTimeMs}ms` : "n/a"}
        </span>
        <StatusPill active={service.active} error={service.error} />
        <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-white/35 transition-colors group-hover:text-white/70">
          Open
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      </div>
    </a>
  );
}

export function HomelabExperience({
  initialOverview,
}: {
  initialOverview: Overview;
}) {
  const [overview, setOverview] = useState(initialOverview);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const deferredServices = useDeferredValue(overview.services);

  const refreshOverview = useEffectEvent(async () => {
    try {
      const response = await fetch("/api/overview", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Refresh failed with ${response.status}`);
      }

      const nextOverview = (await response.json()) as Overview;
      startTransition(() => {
        setOverview(nextOverview);
        setRefreshError(null);
      });
    } catch (error) {
      startTransition(() => {
        setRefreshError(error instanceof Error ? error.message : "Refresh failed");
      });
    }
  });

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshOverview();
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const servicesBySection = useMemo(() => {
    const grouped = new Map<string, CheckedService[]>();

    for (const service of deferredServices) {
      if (!grouped.has(service.section)) {
        grouped.set(service.section, []);
      }
      grouped.get(service.section)?.push(service);
    }

    const known = SECTION_ORDER
      .map((section) => [section, grouped.get(section) ?? []] as const)
      .filter(([, services]) => services.length > 0);

    const additional = Array.from(grouped.entries())
      .filter(([section]) => !SECTION_ORDER.includes(section as (typeof SECTION_ORDER)[number]))
      .sort(([left], [right]) => left.localeCompare(right));

    return [...known, ...additional];
  }, [deferredServices]);

  const protectedServices = overview.services.filter(
    (service) => service.access !== "Public",
  ).length;

  const publicServices = overview.services.filter((service) => service.access === "Public").length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white selection:bg-white/20 selection:text-white">
      <div className="pointer-events-none fixed inset-0">
        <Spotlight />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
        <div className="depth-noise absolute inset-0 opacity-20" />
      </div>

      <main className="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-12 md:px-8 md:pt-24 lg:px-12">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.62 }}
          className="relative"
        >
          <div className="surface-panel-strong relative overflow-hidden rounded-3xl p-8 md:p-14">
            <div className="pointer-events-none absolute right-8 top-8 hidden rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-white/50 md:block">
              Live Stack
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/60">
              <Sparkles className="h-3.5 w-3.5" />
              neovara.uk homelab
            </div>

            <h1 className="mt-8 max-w-4xl text-5xl font-light tracking-tight text-white md:text-7xl md:leading-[1.1] [text-wrap:balance]">
              Platform Engineering on a Single Domain.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/50 md:text-xl font-light">
              This lab routes every workload through a hardened Traefik edge, enforces
              policy via Authelia, and runs containerized infrastructure for cloud, media,
              and AI workloads.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#architecture"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
              >
                Inspect Architecture
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#services"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-6 py-3 text-sm font-medium text-white/70 transition hover:bg-black/60 hover:text-white hover:border-white/20"
              >
                Browse Services
              </a>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="metric-card">
                <p className="metric-label">Published Endpoints</p>
                <p className="metric-value">{overview.summary.totalServices}</p>
              </div>
              <div className="metric-card">
                <p className="metric-label">Protected Routes</p>
                <p className="metric-value">{protectedServices}</p>
              </div>
              <div className="metric-card">
                <p className="metric-label">Public Surfaces</p>
                <p className="metric-value">{publicServices}</p>
              </div>
              <div className="metric-card flex flex-col justify-center">
                <p className="metric-label">Runtime Domain</p>
                <p className="metric-value text-xl md:text-2xl mt-2">{overview.meta.domain}</p>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          id="about"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="mt-28 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
        >
          <div className="surface-panel rounded-[2rem] p-8 md:p-12 border border-white/5 bg-black/40">
            <p className="section-eyebrow">About The Lab</p>
            <h2 className="section-title">A segmented stack built for real workloads.</h2>
            <p className="section-copy">
              Every internet-facing request enters through Cloudflare and Traefik. Access
              policy is centralized in Authelia with LLDAP groups and OIDC clients for
              application login. Stateful workloads are isolated by stack-specific networks,
              and persistent data lives under a unified storage root for reliable backups.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="info-tile">
                <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10 shrink-0">
                  <Route className="h-4 w-4 text-white/70" />
                </div>
                <div>
                  <p className="info-title">Edge Routing</p>
                  <p className="info-copy">Traefik v3 with TLS automation, strict headers, and middleware chaining.</p>
                </div>
              </div>
              <div className="info-tile">
                <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10 shrink-0">
                  <Lock className="h-4 w-4 text-white/70" />
                </div>
                <div>
                  <p className="info-title">Identity Layer</p>
                  <p className="info-copy">ForwardAuth + OIDC with per-domain policy and session boundaries.</p>
                </div>
              </div>
              <div className="info-tile">
                <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10 shrink-0">
                  <HardDrive className="h-4 w-4 text-white/70" />
                </div>
                <div>
                  <p className="info-title">State & Storage</p>
                  <p className="info-copy">Service state and user data persisted under /storage for deterministic recovery.</p>
                </div>
              </div>
              <div className="info-tile">
                <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10 shrink-0">
                  <Bot className="h-4 w-4 text-white/70" />
                </div>
                <div>
                  <p className="info-title">Local AI</p>
                  <p className="info-copy">Ollama node with OpenAI-compatible gateway routed on /v1.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="surface-panel rounded-[2rem] p-8 md:p-12 border border-white/5 bg-black/40 flex flex-col">
            <p className="section-eyebrow">Operational Telemetry</p>
            <h3 className="section-title text-3xl md:text-4xl">Live Node Metrics.</h3>
            <div className="mt-8 flex-1 flex flex-col justify-between gap-3">
              <div className="metric-row">
                <span>CPU Utilization</span>
                <strong>{formatPercent(overview.metrics.cpuPercent)}</strong>
              </div>
              <div className="metric-row">
                <span>Memory Utilization</span>
                <strong>{formatPercent(overview.metrics.memoryPercent)}</strong>
              </div>
              <div className="metric-row">
                <span>Disk Utilization</span>
                <strong>{formatPercent(overview.metrics.diskPercent)}</strong>
              </div>
              <div className="metric-row">
                <span>GPU Utilization</span>
                <strong>{formatPercent(overview.metrics.gpuPercent)}</strong>
              </div>
              <div className="metric-row">
                <span>Network Receive</span>
                <strong>{formatThroughput(overview.metrics.networkRxBps)}</strong>
              </div>
              <div className="metric-row">
                <span>Network Transmit</span>
                <strong>{formatThroughput(overview.metrics.networkTxBps)}</strong>
              </div>
              <div className="metric-row">
                <span>Node Uptime</span>
                <strong>{formatUptime(overview.metrics.uptimeSeconds)}</strong>
              </div>
              <div className="metric-row">
                <span>Containers Seen</span>
                <strong>
                  {overview.metrics.containerCount !== null
                    ? Math.round(overview.metrics.containerCount)
                    : "--"}
                </strong>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          id="architecture"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.54 }}
          className="mt-28"
        >
          <p className="section-eyebrow">Architecture</p>
          <h2 className="section-title">Interactive service topology.</h2>
          <p className="section-copy max-w-3xl">
            Hover or click nodes to inspect routing and trust boundaries. The map reflects
            the deployed stack: Cloudflare ingress, Traefik routers, Authelia forward-auth,
            OIDC flows, workload fabrics, observability, and storage dependencies.
          </p>

          <div className="mt-10">
            <ArchitectureMap overview={overview} />
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="surface-panel rounded-[1.5rem] p-6 border border-white/5 bg-black/40 hover:bg-black/60 transition-colors">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Proxy Strategy</p>
              <p className="mt-3 text-sm text-white/60 font-light leading-relaxed">
                `Host(ollama)` routes core inference while `Host(ollama) && PathPrefix(/v1)`
                targets the OpenAI-compatible gateway.
              </p>
            </div>
            <div className="surface-panel rounded-[1.5rem] p-6 border border-white/5 bg-black/40 hover:bg-black/60 transition-colors">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Security Boundary</p>
              <p className="mt-3 text-sm text-white/60 font-light leading-relaxed">
                Protected surfaces consume Authelia forward-auth and host-specific `/authelia`
                routers for portal and cookie handling.
              </p>
            </div>
            <div className="surface-panel rounded-[1.5rem] p-6 border border-white/5 bg-black/40 hover:bg-black/60 transition-colors">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Observability</p>
              <p className="mt-3 text-sm text-white/60 font-light leading-relaxed">
                Prometheus scrapes Traefik, node-exporter, cAdvisor, and DCGM; Grafana is
                exposed via Traefik with OIDC-backed authentication.
              </p>
            </div>
          </div>
        </motion.section>

        <motion.section
          id="services"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.12 }}
          transition={{ duration: 0.54 }}
          className="mt-28"
        >
          <p className="section-eyebrow">Services</p>
          <h2 className="section-title">Published endpoints.</h2>

          <div className="mt-10 space-y-5">
            {servicesBySection.map(([section, services]) => {
              const meta = SECTION_META[section] ?? SECTION_META.Lab;
              const Icon = meta.icon;
              const onlineCount = services.filter((service) => service.active).length;

              return (
                <section key={section} className="endpoint-cluster relative overflow-hidden p-5 md:p-6 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
                  <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-br opacity-80", meta.tone)} />

                  <div className="relative lg:pr-2">
                    <div>
                      <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-white/40">
                        <Icon className="h-4 w-4" />
                        {meta.title}
                      </div>
                      <h3 className="mt-4 text-2xl font-light tracking-wide text-white md:text-3xl">{section}</h3>
                      <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/50 font-light md:text-[15px]">
                        {meta.description}
                      </p>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-white/40">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-300" />
                        {onlineCount} live
                      </span>
                      <span className="h-1 w-1 rounded-full bg-white/20" />
                      <span>{services.length} routes</span>
                    </div>

                    <div className={cn("mt-6 hidden h-px w-28 bg-gradient-to-r lg:block", meta.tone)} />
                  </div>

                  <div className="relative mt-6 lg:mt-0">
                    <div className="endpoint-board">
                      {services.map((service, index) => (
                        <EndpointRow
                          key={service.id}
                          service={service}
                          isLast={index === services.length - 1}
                        />
                      ))}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </motion.section>

        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-28 mb-8 rounded-2xl border border-white/5 bg-black/40 p-5 text-xs text-white/40 flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>
              System operational. Last refreshed {new Date(overview.meta.refreshedAt).toLocaleString("en-GB", { timeZone: "UTC" })} UTC
            </span>
          </div>
          <div className="font-mono tracking-wider">
            {overview.summary.activeServices} / {overview.summary.totalServices} ONLINE
          </div>
        </motion.footer>
      </main>

      <AnimatePresence>
        {refreshError ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-5 right-5 z-30 inline-flex max-w-xs items-start gap-2 rounded-xl border border-rose-300/35 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 backdrop-blur-xl"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {refreshError}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
