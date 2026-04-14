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
  Activity,
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

function StatusPill({ active, error }: { active: boolean; error: string | null }) {
  if (error) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/35 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-200">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-300" />
        Error
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px]",
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

function ServiceCard({ service }: { service: CheckedService }) {
  return (
    <motion.article
      whileHover={{ y: -5, rotateX: 2, rotateY: -2 }}
      transition={{ duration: 0.22 }}
      className="group relative rounded-2xl border border-white/12 bg-[linear-gradient(170deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-4 backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.06] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-white">{service.name}</h4>
            <p className="mt-0.5 text-[11px] text-white/55">{service.description}</p>
          </div>
          <StatusPill active={service.active} error={service.error} />
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 px-2.5 py-2">
          <p className="truncate font-mono text-[11px] text-white/72">{service.host}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] text-white/65">
          <div className="rounded-lg border border-white/10 bg-black/35 px-2 py-1.5">
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/42">Access</p>
            <p className="mt-1 font-medium text-white/84">{service.access}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/35 px-2 py-1.5">
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/42">Latency</p>
            <p className="mt-1 font-medium text-white/84">
              {service.statusCode ? `${service.responseTimeMs}ms` : "--"}
            </p>
          </div>
        </div>

        <a
          href={service.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] text-white/70 transition-colors hover:text-white"
        >
          Open Endpoint <ArrowRight className="h-3 w-3" />
        </a>
      </div>
    </motion.article>
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
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.08),transparent_20%),radial-gradient(circle_at_82%_20%,rgba(255,255,255,0.05),transparent_24%),radial-gradient(circle_at_40%_88%,rgba(255,255,255,0.04),transparent_24%)]" />
        <motion.div
          className="absolute -left-40 top-20 h-[28rem] w-[28rem] rounded-full bg-white/[0.06] blur-[140px]"
          animate={{ x: [0, 70, 0], y: [0, -18, 0] }}
          transition={{ duration: 24, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-44 bottom-10 h-[30rem] w-[30rem] rounded-full bg-white/[0.05] blur-[160px]"
          animate={{ x: [0, -90, 0], y: [0, 24, 0] }}
          transition={{ duration: 29, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <div className="depth-grid absolute inset-0" />
        <div className="depth-noise absolute inset-0 opacity-35" />
      </div>

      <main className="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-12 md:px-8 md:pt-16 lg:px-12">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.62 }}
          className="relative"
        >
          <div className="surface-panel-strong relative overflow-hidden rounded-3xl p-7 md:p-10">
            <div className="pointer-events-none absolute right-8 top-8 hidden rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/70 md:block">
              Live Stack
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[10px] uppercase tracking-[0.19em] text-white/72">
              <Sparkles className="h-3.5 w-3.5" />
              neovara.uk homelab
            </div>

            <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-white md:text-6xl md:leading-[1.05]">
              Platform Engineering on a Single Domain, With Production-Grade Controls.
            </h1>

            <p className="mt-5 max-w-3xl text-sm leading-relaxed text-white/70 md:text-base">
              This lab routes every workload through a hardened Traefik edge, enforces
              policy via Authelia + LLDAP, and runs cloud, media, automation, observability,
              and local AI services behind typed, containerized infrastructure.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#architecture"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:border-white/45 hover:bg-white/16"
              >
                Inspect Architecture
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#services"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-white/82 transition hover:border-white/30 hover:text-white"
              >
                Browse Services
              </a>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              <div className="metric-card">
                <p className="metric-label">Runtime Domain</p>
                <p className="metric-value text-lg md:text-xl">{overview.meta.domain}</p>
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
          className="mt-16 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
        >
          <div className="surface-panel rounded-3xl p-6 md:p-8">
            <p className="section-eyebrow">About The Lab</p>
            <h2 className="section-title">A segmented stack built for real workloads, not demos.</h2>
            <p className="section-copy">
              Every internet-facing request enters through Cloudflare and Traefik. Access
              policy is centralized in Authelia with LLDAP groups and OIDC clients for
              application login. Stateful workloads are isolated by stack-specific networks,
              and persistent data lives under a unified storage root for reliable backups.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="info-tile">
                <Route className="h-4 w-4 text-white/90" />
                <div>
                  <p className="info-title">Edge Routing</p>
                  <p className="info-copy">Traefik v3 with TLS automation, strict headers, and middleware chaining.</p>
                </div>
              </div>
              <div className="info-tile">
                <Lock className="h-4 w-4 text-white/90" />
                <div>
                  <p className="info-title">Identity Layer</p>
                  <p className="info-copy">ForwardAuth + OIDC with per-domain policy and session boundaries.</p>
                </div>
              </div>
              <div className="info-tile">
                <HardDrive className="h-4 w-4 text-white/90" />
                <div>
                  <p className="info-title">State & Storage</p>
                  <p className="info-copy">Service state and user data persisted under /storage for deterministic recovery.</p>
                </div>
              </div>
              <div className="info-tile">
                <Bot className="h-4 w-4 text-white/90" />
                <div>
                  <p className="info-title">Local AI</p>
                  <p className="info-copy">Ollama node with OpenAI-compatible gateway routed on /v1.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="surface-panel rounded-3xl p-6 md:p-8">
            <p className="section-eyebrow">Operational Telemetry</p>
            <h3 className="section-title text-2xl md:text-3xl">Live Node Metrics</h3>
            <div className="mt-5 space-y-3">
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
          className="mt-20"
        >
          <p className="section-eyebrow">Architecture</p>
          <h2 className="section-title">Interactive service topology for neovara.uk</h2>
          <p className="section-copy max-w-3xl">
            Hover or click nodes to inspect routing and trust boundaries. The map reflects
            the deployed stack: Cloudflare ingress, Traefik routers, Authelia forward-auth,
            OIDC flows, workload fabrics, observability, and storage dependencies.
          </p>

          <div className="mt-6">
            <ArchitectureMap overview={overview} />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="surface-panel rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-[0.17em] text-white/45">Proxy Strategy</p>
              <p className="mt-2 text-sm text-white/78">
                `Host(ollama)` routes core inference while `Host(ollama) && PathPrefix(/v1)`
                targets the OpenAI-compatible gateway.
              </p>
            </div>
            <div className="surface-panel rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-[0.17em] text-white/45">Security Boundary</p>
              <p className="mt-2 text-sm text-white/78">
                Protected surfaces consume Authelia forward-auth and host-specific `/authelia`
                routers for portal and cookie handling.
              </p>
            </div>
            <div className="surface-panel rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-[0.17em] text-white/45">Observability</p>
              <p className="mt-2 text-sm text-white/78">
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
          className="mt-20"
        >
          <p className="section-eyebrow">Services</p>
          <h2 className="section-title">Published endpoints with live checks</h2>

          <div className="mt-6 space-y-7">
            {servicesBySection.map(([section, services]) => {
              const meta = SECTION_META[section] ?? SECTION_META.Lab;
              const Icon = meta.icon;
              const onlineCount = services.filter((service) => service.active).length;

              return (
                <section key={section} className="surface-panel rounded-3xl p-5 md:p-6">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/42">
                        <Icon className="h-3.5 w-3.5" />
                        {meta.title}
                      </div>
                      <h3 className="mt-1 text-2xl font-semibold text-white">{section}</h3>
                      <p className="text-sm text-white/66">{meta.description}</p>
                    </div>

                    <div className="rounded-xl border border-white/12 bg-black/40 px-3 py-2 text-right">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-white/42">Health</p>
                      <p className="mt-1 text-sm font-medium text-white">
                        {onlineCount}/{services.length} online
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {services.map((service) => (
                      <ServiceCard key={service.id} service={service} />
                    ))}
                  </div>

                  <div className={cn("pointer-events-none mt-4 h-px bg-gradient-to-r", meta.tone)} />
                </section>
              );
            })}
          </div>
        </motion.section>

        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-white/58"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Last refreshed {new Date(overview.meta.refreshedAt).toLocaleString("en-GB", { timeZone: "UTC" })} UTC
            </span>
            <span>
              {overview.summary.activeServices}/{overview.summary.totalServices} services reachable
            </span>
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
