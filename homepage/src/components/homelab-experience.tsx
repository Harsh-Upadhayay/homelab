"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useState,
} from "react";
import { motion } from "motion/react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  Clapperboard,
  Cloud,
  HardDrive,
  LayoutDashboard,
  Network,
  RadioTower,
  Shield,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import type { CheckedService, Overview } from "@/lib/overview";
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";
import { HyperText } from "@/components/ui/hyper-text";
import { Marquee } from "@/components/ui/marquee";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Spotlight } from "@/components/ui/spotlight-new";
import { cn } from "@/lib/utils";

const REFRESH_INTERVAL_MS = 60000;

const SECTION_META: Record<
  string,
  {
    icon: LucideIcon;
    eyebrow: string;
    description: string;
    accent: string;
  }
> = {
  Platform: {
    icon: Shield,
    eyebrow: "Control",
    description:
      "Edge routing, identity, CI, and the operator surfaces that keep the rest of the estate honest.",
    accent: "text-zinc-100",
  },
  Cloud: {
    icon: Cloud,
    eyebrow: "Data",
    description:
      "File sync, photos, personal media libraries, and the durable storage layer behind them.",
    accent: "text-slate-100",
  },
  Media: {
    icon: Clapperboard,
    eyebrow: "Playback",
    description:
      "Streaming, requests, and a media catalog that is designed to look automatic because it is.",
    accent: "text-white",
  },
  Automation: {
    icon: RadioTower,
    eyebrow: "Automation",
    description:
      "Indexers, release handling, and the VPN-routed download path that feeds the library.",
    accent: "text-cyan-100",
  },
  AI: {
    icon: Bot,
    eyebrow: "Inference",
    description:
      "Local GPU-backed model serving with an OpenAI-compatible path for tools and experiments.",
    accent: "text-sky-100",
  },
  Lab: {
    icon: LayoutDashboard,
    eyebrow: "Expansion",
    description:
      "Additional routes discovered from the environment and promoted into the public surface.",
    accent: "text-emerald-100",
  },
};

const FEATURE_PILLARS: Array<{
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
}> = [
  {
    icon: Network,
    eyebrow: "Edge",
    title: "Cloudflare and Traefik as the single front door",
    description:
      "Every public route lands on one hardened edge that handles DNS, TLS, redirects, headers, and app routing.",
    points: [
      "Cloudflare DNS plus tunnel support for ingress flexibility",
      "Traefik v3 reverse proxy with automatic certificate issuance",
      "Security headers and custom error surfaces at the edge",
    ],
  },
  {
    icon: Shield,
    eyebrow: "Identity",
    title: "Authelia, LLDAP, OIDC, and MFA by policy",
    description:
      "Sensitive surfaces are protected by forward-auth, per-host cookies, and group-based access rules instead of trust by proximity.",
    points: [
      "LLDAP-backed identity store for groups and app access",
      "Authelia forward-auth on protected admin and ARR routes",
      "OIDC clients wired into Nextcloud, Grafana, Immich, and Audiobookshelf",
    ],
  },
  {
    icon: HardDrive,
    eyebrow: "Cloud",
    title: "Personal cloud and stateful storage",
    description:
      "The lab carries actual user data, not demo payloads: files, photo uploads, audiobook metadata, model weights, and app databases.",
    points: [
      "Nextcloud on Postgres and Redis for file sync and sharing",
      "Immich with machine learning and hardware-assisted transcoding",
      "Persistent storage kept under a single homelab storage root",
    ],
  },
  {
    icon: Clapperboard,
    eyebrow: "Media",
    title: "Automated media intake and GPU playback",
    description:
      "Requests, discovery, acquisition, organization, and playback are split into purpose-built services instead of one oversized box.",
    points: [
      "Jellyfin plus Jellyseerr for viewing and request management",
      "Prowlarr, Sonarr, and Radarr for release automation",
      "qBittorrent isolated behind Gluetun on the media path",
    ],
  },
  {
    icon: Bot,
    eyebrow: "AI",
    title: "Local inference on the same fabric",
    description:
      "The homelab is also a private AI node, with Ollama exposed behind auth and a gateway that speaks the OpenAI-style `/v1` surface.",
    points: [
      "GPU-backed Ollama model serving",
      "Nginx gateway for compatible API clients",
      "Telemetry and access rules treated like any other production surface",
    ],
  },
  {
    icon: Activity,
    eyebrow: "Ops",
    title: "Measured, repeatable, and built to evolve",
    description:
      "Operational discipline matters more than screenshots, so the stack standardizes deployment, telemetry, and state layout from the start.",
    points: [
      "Prometheus, Grafana, cAdvisor, node-exporter, and DCGM",
      "Uniform `make` entrypoints across every stack",
      "Jenkins plus DinD for builds, maintenance, and automation",
    ],
  },
];

const REQUEST_FLOW = [
  {
    icon: Network,
    step: "01",
    title: "Cloudflare edge",
    detail: "DNS, origin protection, and optional tunnel ingress sit in front of every public hostname.",
  },
  {
    icon: RadioTower,
    step: "02",
    title: "Traefik routing",
    detail: "Traefik terminates HTTPS, applies headers, and dispatches each subdomain to the correct app surface.",
  },
  {
    icon: Shield,
    step: "03",
    title: "Authelia policy",
    detail: "Protected routes call forward-auth, apply one-factor or two-factor rules, and use LLDAP groups for decisions.",
  },
  {
    icon: HardDrive,
    step: "04",
    title: "Workload fabrics",
    detail: "Apps run on dedicated internal networks with their own databases, Redis instances, storage, and sidecars.",
  },
  {
    icon: Activity,
    step: "05",
    title: "Feedback loop",
    detail: "Prometheus and exporters watch node, container, network, and GPU behavior so the homepage can show real state.",
  },
];

const FABRIC_ZONES = [
  {
    title: "Public edge",
    description: "The public entry layer for visitors and API clients.",
    chips: ["Cloudflare", "Tunnel", "Traefik", "Homepage", "Public hostnames"],
  },
  {
    title: "Identity and control plane",
    description: "Routing, auth, dashboards, and operator tools.",
    chips: ["Authelia", "LLDAP", "Grafana", "Jenkins", "Traefik dashboard"],
  },
  {
    title: "Private app fabrics",
    description: "Workloads split across internal Docker networks.",
    chips: [
      "nextcloud_internal",
      "immich_internal",
      "mediaserver_internal",
      "jenkins_net",
    ],
  },
  {
    title: "Stateful core",
    description: "Persistent data and durable service state.",
    chips: [
      "Nextcloud data",
      "Immich upload + Postgres",
      "Media + downloads",
      "Ollama models",
      "Jenkins home",
    ],
  },
];

const SECURITY_CONTROLS = [
  {
    title: "Strict transport and headers",
    body:
      "HTTPS is enforced at the edge with Cloudflare DNS challenge certificates, plus HSTS, no-sniff, XSS, and frame protections.",
  },
  {
    title: "Per-host auth cookies",
    body:
      "Authelia is configured with host-specific cookies and redirect URLs so protected apps keep tighter session boundaries.",
  },
  {
    title: "Group-based access rules",
    body:
      "LLDAP groups drive one-factor or two-factor policies for the ARR stack, Audiobookshelf, Ollama, and OIDC-backed apps.",
  },
  {
    title: "Network and runtime containment",
    body:
      "Dedicated internal networks, `no-new-privileges`, read-only roots where practical, and VPN isolation for qBittorrent reduce blast radius.",
  },
];

const OPERATING_PRACTICES: Array<{
  icon: LucideIcon;
  title: string;
  body: string;
}> = [
  {
    icon: HardDrive,
    title: "State pinned to storage",
    body:
      "Authoritative service data is kept under the homelab storage root so app state is easy to reason about and back up.",
  },
  {
    icon: Shield,
    title: "Secrets out of Git",
    body:
      "Global secrets live in `ops/.env.local`, while committed `app.env` files only carry non-secret per-stack configuration.",
  },
  {
    icon: RadioTower,
    title: "One command surface",
    body:
      "The repo standardizes `make up`, `logs`, `pull`, `status`, and `exec` flows so every stack is operated the same way.",
  },
  {
    icon: LayoutDashboard,
    title: "Telemetry before guesswork",
    body:
      "Prometheus and Grafana expose container counts, node health, traffic, uptime, and GPU metrics to this homepage and the dashboards behind it.",
  },
];

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "n/a";
  }

  return `${value.toFixed(1)}%`;
}

function formatBandwidth(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "n/a";
  }

  const units = ["B/s", "KB/s", "MB/s", "GB/s"];
  let amount = value;
  let index = 0;

  while (amount >= 1024 && index < units.length - 1) {
    amount /= 1024;
    index += 1;
  }

  const digits = amount < 10 ? 2 : 1;
  return `${amount.toFixed(digits)} ${units[index]}`;
}

function formatDuration(seconds: number | null) {
  if (seconds === null || Number.isNaN(seconds)) {
    return "n/a";
  }

  const chunks = [
    { unit: "d", size: 86400 },
    { unit: "h", size: 3600 },
    { unit: "m", size: 60 },
  ];

  let remaining = Math.floor(seconds);
  const parts: string[] = [];

  for (const chunk of chunks) {
    if (remaining >= chunk.size || parts.length > 0) {
      const amount = Math.floor(remaining / chunk.size);
      remaining -= amount * chunk.size;
      parts.push(`${amount}${chunk.unit}`);
    }
  }

  return parts.length > 0 ? parts.slice(0, 2).join(" ") : `${remaining}s`;
}

function groupServices(services: CheckedService[]) {
  const buckets = new Map<string, CheckedService[]>();

  for (const service of services) {
    if (!buckets.has(service.section)) {
      buckets.set(service.section, []);
    }

    buckets.get(service.section)?.push(service);
  }

  return Array.from(buckets.entries()).map(([section, entries]) => ({
    section,
    services: entries,
  }));
}

function detailLabel(service: CheckedService) {
  if (service.error) {
    return service.error;
  }

  if (service.statusCode === null) {
    return "No response";
  }

  return `HTTP ${service.statusCode} · ${service.responseTimeMs} ms`;
}

function metricWidth(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "8%";
  }

  return `${Math.max(8, Math.min(100, value))}%`;
}

function formatRefreshTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-3xl", className)}>
      <p className="text-xs uppercase tracking-[0.32em] text-white/46">{eyebrow}</p>
      <h2 className="mt-4 font-heading text-[clamp(2rem,4vw,3.6rem)] leading-[0.92] tracking-[-0.07em] text-white">
        {title}
      </h2>
      <p className="mt-5 text-base leading-8 text-white/56 md:text-lg">
        {description}
      </p>
    </div>
  );
}

function MetricRail({
  label,
  value,
  helper,
  formatter = formatPercent,
}: {
  label: string;
  value: number | null;
  helper: string;
  formatter?: (value: number | null) => string;
}) {
  return (
    <div className="obs-panel rounded-[26px] p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm uppercase tracking-[0.24em] text-white/44">
          {label}
        </span>
        <span className="font-heading text-2xl tracking-[-0.06em] text-white">
          {formatter(value)}
        </span>
      </div>
      <div className="metric-track mt-4 h-2 rounded-full">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: metricWidth(value) }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="metric-fill h-full rounded-full"
        />
      </div>
      <p className="mt-3 text-sm leading-6 text-white/50">{helper}</p>
    </div>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-2.5 w-2.5 rounded-full",
        active
          ? "bg-emerald-300 shadow-[0_0_24px_rgba(110,231,183,0.65)]"
          : "bg-rose-300 shadow-[0_0_24px_rgba(253,164,175,0.55)]",
      )}
    />
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

  const metrics = overview.metrics;
  const serviceGroups = groupServices(deferredServices);
  const activeServices = deferredServices.filter((service) => service.active);
  const inactiveServices = deferredServices.filter((service) => !service.active);
  const protectedRoutes = deferredServices.filter(
    (service) => service.access !== "Public",
  );
  const dynamicRoutes = deferredServices.filter((service) => service.dynamic);
  const marqueeServices = activeServices.length > 0 ? activeServices : deferredServices;
  const sceneServices =
    activeServices.length > 0 ? activeServices.slice(0, 6) : deferredServices.slice(0, 6);
  const lastRefresh = formatRefreshTime(overview.meta.refreshedAt);
  const serviceTone = inactiveServices.length
    ? `${inactiveServices.length} route${
        inactiveServices.length === 1 ? "" : "s"
      } currently need attention.`
    : "Public routes are healthy, reachable, and behaving like the edge plan intended.";
  const runtimeTone =
    metrics.gpuPercent === null
      ? "GPU telemetry is unavailable at the moment."
      : metrics.gpuPercent > 0
        ? "GPU is active, which usually means inference or transcoding is doing real work."
        : "GPU is idle and ready for inference or media acceleration.";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="page-radial pointer-events-none absolute inset-0" />
      <div className="page-noise pointer-events-none absolute inset-0 opacity-60" />
      <div className="page-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="page-vignette pointer-events-none absolute inset-0" />

      <motion.div
        animate={{ x: [0, 70, 0], y: [0, 36, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        className="ambient-orb absolute -left-24 top-16 h-96 w-96 rounded-full opacity-70 blur-3xl"
      />
      <motion.div
        animate={{ x: [0, -64, 0], y: [0, -28, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        className="ambient-orb absolute right-[-8rem] top-44 h-[30rem] w-[30rem] rounded-full opacity-45 blur-3xl"
      />

      <Spotlight
        gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(205, 18%, 92%, .1) 0, hsla(205, 30%, 70%, .04) 48%, hsla(205, 30%, 55%, 0) 80%)"
        gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(195, 82%, 72%, .08) 0, hsla(195, 82%, 52%, .03) 80%, transparent 100%)"
        gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(220, 20%, 84%, .05) 0, hsla(220, 20%, 60%, .02) 80%, transparent 100%)"
        xOffset={120}
        duration={11}
      />
      <Spotlight
        gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(215, 14%, 92%, .06) 0, hsla(215, 18%, 70%, .03) 48%, hsla(215, 18%, 55%, 0) 80%)"
        gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(207, 72%, 76%, .04) 0, hsla(207, 72%, 54%, .02) 80%, transparent 100%)"
        gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(0, 0%, 88%, .03) 0, hsla(0, 0%, 62%, .01) 80%, transparent 100%)"
        translateY={-250}
        xOffset={-96}
        duration={13}
      />

      <main className="relative z-10 mx-auto max-w-[92rem] px-5 pb-24 pt-5 md:px-8 lg:px-10">
        <motion.header
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="glass-panel flex flex-col gap-4 rounded-full px-4 py-3 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="brand-chip flex h-11 w-11 items-center justify-center rounded-2xl font-mono text-sm font-semibold text-white/92">
              nv/
            </div>
            <div>
              <p className="font-heading text-sm uppercase tracking-[0.32em] text-white/70">
                Neovara Homelab
              </p>
              <p className="text-sm text-white/48">
                Architecture, features, security, and live surface
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.24em] text-white/52">
            <a href="#architecture" className="nav-pill">
              architecture
            </a>
            <a href="#security" className="nav-pill">
              security
            </a>
            <a href="#operations" className="nav-pill">
              operations
            </a>
            <a href="#services" className="nav-pill">
              live atlas
            </a>
          </nav>
        </motion.header>

        <section className="grid items-center gap-10 pt-14 lg:grid-cols-[1.04fr_0.96fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.82, delay: 0.08 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/60">
              <Sparkles className="size-4 text-sky-200" />
              dark minimal control surface
            </div>

            <HyperText
              as="h1"
              duration={1100}
              animateOnHover={false}
              className="mt-6 font-heading text-[clamp(3.25rem,10vw,8rem)] font-semibold leading-[0.86] tracking-[-0.09em] text-white"
            >
              Neovara
            </HyperText>

            <h2 className="font-heading text-[clamp(2.4rem,5vw,4.8rem)] uppercase leading-[0.9] tracking-[-0.08em] text-white/94">
              Homelab
            </h2>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/62">
              A self-hosted private cloud, media fabric, AI node, and operations
              plane built behind one hardened edge. This homepage is meant to be
              a map of the real system, not a decorative dashboard.
            </p>

            <p className="mt-5 max-w-3xl text-base leading-8 text-white/52">
              Visitors can understand the full shape of the lab from one page:
              ingress, identity, storage, observability, GPU-backed workloads,
              and the live condition of the public routes running on the stack.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#architecture" className="hero-action hero-action-primary">
                Explore the architecture
                <ArrowRight className="size-4" />
              </a>
              <a href="#services" className="hero-action hero-action-secondary">
                Inspect live routes
              </a>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="glass-panel-strong rounded-[28px] p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/46">
                  Live routes
                </p>
                <div className="mt-3 flex items-end gap-2">
                  <NumberTicker
                    value={overview.summary.activeServices}
                    className="font-heading text-4xl tracking-[-0.08em] text-white"
                  />
                  <span className="pb-1 text-white/40">
                    / {overview.summary.totalServices}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/50">
                  Public surfaces currently responding from the stack.
                </p>
              </div>

              <div className="glass-panel-strong rounded-[28px] p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/46">
                  Protected routes
                </p>
                <div className="mt-3 text-4xl font-heading tracking-[-0.08em] text-white">
                  {protectedRoutes.length}
                </div>
                <p className="mt-3 text-sm leading-6 text-white/50">
                  Surfaces that require sign-in, admin access, or forward-auth.
                </p>
              </div>

              <div className="glass-panel-strong rounded-[28px] p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/46">
                  Internal segments
                </p>
                <div className="mt-3 text-4xl font-heading tracking-[-0.08em] text-white">
                  4
                </div>
                <p className="mt-3 text-sm leading-6 text-white/50">
                  Dedicated app fabrics for Nextcloud, Immich, media, and Jenkins.
                </p>
              </div>

              <div className="glass-panel-strong rounded-[28px] p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-white/46">
                  Last refresh
                </p>
                <div className="mt-3 text-3xl font-heading tracking-[-0.08em] text-white">
                  {lastRefresh}
                  <span className="ml-2 text-base text-white/38">UTC</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/50">
                  Live route health and telemetry are refreshed continuously.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 lg:max-w-3xl">
              <div className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 text-sm leading-7 text-white/58 backdrop-blur-xl">
                <span className="text-white/80">{serviceTone}</span> {runtimeTone}
              </div>

              {refreshError ? (
                <div className="flex items-center gap-2 rounded-[24px] border border-rose-300/18 bg-rose-400/8 px-5 py-4 text-sm text-rose-100">
                  <AlertTriangle className="size-4 shrink-0" />
                  {refreshError}
                </div>
              ) : null}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.82, delay: 0.18 }}
            className="relative"
          >
            <CardContainer containerClassName="py-0" className="w-full">
              <CardBody className="hero-shell relative h-[640px] w-full overflow-hidden rounded-[38px] p-0">
                <CardItem translateZ={20} className="absolute inset-0">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.12),transparent_16%),radial-gradient(circle_at_86%_20%,rgba(125,211,252,0.12),transparent_20%),linear-gradient(180deg,rgba(4,6,11,0.98),rgba(9,11,17,0.94))]" />
                  <div className="hero-shell-grid absolute inset-0 opacity-45" />
                </CardItem>

                <CardItem
                  translateZ={60}
                  className="absolute left-6 top-6 rounded-full border border-white/10 bg-black/32 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-white/60 backdrop-blur-xl"
                >
                  live architecture scene
                </CardItem>

                <CardItem
                  translateZ={82}
                  className="absolute left-6 right-6 top-24 rounded-[30px] border border-white/10 bg-black/34 p-6 backdrop-blur-2xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-white/44">
                        Core edge
                      </p>
                      <h3 className="mt-3 max-w-lg font-heading text-4xl uppercase tracking-[-0.06em] text-white">
                        One front door. Many deliberate layers.
                      </h3>
                      <p className="mt-3 max-w-xl text-sm leading-7 text-white/54">
                        Cloudflare feeds Traefik, Traefik enforces the route plan,
                        Authelia inserts identity, and the rest of the workloads sit
                        behind tighter app-specific fabrics.
                      </p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/72">
                      {overview.summary.totalServices} published surfaces
                    </div>
                  </div>
                </CardItem>

                <CardItem
                  translateZ={96}
                  className="absolute left-6 top-[15.8rem] w-[17rem] rounded-[28px] border border-white/10 bg-black/38 p-5 backdrop-blur-2xl"
                >
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/44">
                    Ingress path
                  </p>
                  <div className="mt-4 space-y-3">
                    <div className="stack-node">
                      <Network className="size-4 text-slate-100" />
                      Cloudflare edge
                    </div>
                    <div className="stack-node">
                      <RadioTower className="size-4 text-slate-100" />
                      Traefik routers
                    </div>
                    <div className="stack-node">
                      <Shield className="size-4 text-slate-100" />
                      Authelia + LLDAP
                    </div>
                  </div>
                </CardItem>

                <CardItem
                  translateZ={108}
                  className="absolute right-6 top-[17.4rem] w-[16rem] rounded-[30px] border border-white/10 bg-black/38 p-5 backdrop-blur-2xl"
                >
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/44">
                    Compute lanes
                  </p>
                  <div className="mt-4 grid gap-3">
                    <div className="stack-chip">
                      <Cloud className="size-4 text-slate-100" />
                      Nextcloud / Immich / ABS
                    </div>
                    <div className="stack-chip">
                      <Clapperboard className="size-4 text-slate-100" />
                      Jellyfin / ARR / VPN
                    </div>
                    <div className="stack-chip">
                      <Bot className="size-4 text-slate-100" />
                      Ollama / OpenAI gateway
                    </div>
                    <div className="stack-chip">
                      <LayoutDashboard className="size-4 text-slate-100" />
                      Prometheus / Grafana
                    </div>
                  </div>
                </CardItem>

                <CardItem
                  translateZ={122}
                  className="absolute left-[22%] top-[23.8rem] w-[56%] rounded-[32px] border border-white/10 bg-gradient-to-b from-white/10 via-white/4 to-transparent p-6 backdrop-blur-3xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                        Security posture
                      </p>
                      <h4 className="mt-3 font-heading text-3xl uppercase tracking-[-0.05em] text-white">
                        Identity before interface
                      </h4>
                    </div>
                    <div className="signal-pill">
                      {protectedRoutes.length} protected
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="stack-mini">
                      Per-host cookies and OIDC clients
                    </div>
                    <div className="stack-mini">
                      One-factor and two-factor policy layers
                    </div>
                    <div className="stack-mini">
                      Secure headers and enforced HTTPS
                    </div>
                    <div className="stack-mini">
                      Network isolation for internal app fabrics
                    </div>
                  </div>
                </CardItem>

                <CardItem
                  translateZ={86}
                  className="absolute bottom-6 left-6 right-6 rounded-[28px] border border-white/10 bg-black/32 p-5 backdrop-blur-2xl"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                        Live surface
                      </p>
                      <p className="mt-2 text-sm leading-7 text-white/56">
                        The published surface currently includes the routes below.
                      </p>
                    </div>
                    <div className="text-xs uppercase tracking-[0.22em] text-white/42">
                      {overview.meta.domain}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {sceneServices.map((service) => (
                      <span key={service.id} className="route-chip">
                        <StatusDot active={service.active} />
                        {service.name}
                      </span>
                    ))}
                  </div>
                </CardItem>
              </CardBody>
            </CardContainer>
          </motion.div>
        </section>

        <section className="mt-10">
          <div className="glass-panel overflow-hidden rounded-full px-2 py-2">
            <Marquee pauseOnHover className="[--duration:32s] [--gap:0.75rem] py-0">
              {marqueeServices.map((service) => (
                <div key={service.id} className="route-chip">
                  <StatusDot active={service.active} />
                  {service.name}
                  <span className="text-white/28">/</span>
                  <span className="text-white/48">{service.host}</span>
                </div>
              ))}
            </Marquee>
          </div>
        </section>

        <motion.section
          id="architecture"
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7 }}
          className="pt-24"
        >
          <SectionHeading
            eyebrow="Homelab Features"
            title="The stack is organized like a small private platform, not a pile of unrelated containers."
            description="The homepage now explains what the lab actually does: edge ingress, identity, private storage, media automation, AI inference, CI, and the observability needed to keep all of it predictable."
          />

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {FEATURE_PILLARS.map((pillar, index) => {
              const Icon = pillar.icon;

              return (
                <motion.article
                  key={pillar.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.55, delay: index * 0.05 }}
                  className="feature-panel rounded-[32px] p-6"
                >
                  <div className="feature-icon">
                    <Icon className="size-5 text-white/88" />
                  </div>
                  <p className="mt-6 text-xs uppercase tracking-[0.28em] text-white/42">
                    {pillar.eyebrow}
                  </p>
                  <h3 className="mt-3 font-heading text-3xl leading-[1.02] tracking-[-0.05em] text-white">
                    {pillar.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-white/56">
                    {pillar.description}
                  </p>

                  <div className="mt-6 grid gap-3">
                    {pillar.points.map((point) => (
                      <div
                        key={point}
                        className="rounded-[22px] border border-white/9 bg-white/5 px-4 py-3 text-sm leading-6 text-white/66"
                      >
                        {point}
                      </div>
                    ))}
                  </div>
                </motion.article>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7 }}
          className="pt-24"
        >
          <SectionHeading
            eyebrow="Design Diagrams"
            title="A visitor can read the request path, trust model, and network shape in under a minute."
            description="These diagrams are tuned to the actual repository layout: Cloudflare and Traefik at the edge, Authelia and LLDAP in the access path, dedicated internal fabrics for workloads, and a stateful storage core behind them."
          />

          <div className="mt-12 grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
            <div className="diagram-panel rounded-[34px] p-6 md:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/42">
                    Request flow
                  </p>
                  <h3 className="mt-3 font-heading text-3xl tracking-[-0.05em] text-white">
                    Edge to workload path
                  </h3>
                </div>
                <div className="signal-pill">5-stage route lifecycle</div>
              </div>

              <div className="relative mt-8">
                <div className="diagram-beam hidden lg:block" />
                <div className="grid gap-4 lg:grid-cols-5">
                  {REQUEST_FLOW.map((step, index) => {
                    const Icon = step.icon;

                    return (
                      <motion.div
                        key={step.title}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.4 }}
                        transition={{ duration: 0.45, delay: index * 0.06 }}
                        className="diagram-node rounded-[28px] p-5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="feature-icon">
                            <Icon className="size-5 text-white/88" />
                          </div>
                          <span className="text-xs uppercase tracking-[0.24em] text-white/34">
                            {step.step}
                          </span>
                        </div>
                        <h4 className="mt-5 font-heading text-2xl tracking-[-0.05em] text-white">
                          {step.title}
                        </h4>
                        <p className="mt-4 text-sm leading-7 text-white/56">
                          {step.detail}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="diagram-panel rounded-[34px] p-6 md:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/42">
                    Network layout
                  </p>
                  <h3 className="mt-3 font-heading text-3xl tracking-[-0.05em] text-white">
                    Public edge, private fabrics, durable state
                  </h3>
                </div>
                <div className="signal-pill">4 segmented backplanes</div>
              </div>

              <div className="mt-8 grid gap-4">
                {FABRIC_ZONES.map((zone, index) => (
                  <motion.div
                    key={zone.title}
                    initial={{ opacity: 0, x: 18 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.45, delay: index * 0.05 }}
                    className="fabric-zone rounded-[28px] p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-heading text-2xl tracking-[-0.05em] text-white">
                          {zone.title}
                        </h4>
                        <p className="mt-3 text-sm leading-7 text-white/54">
                          {zone.description}
                        </p>
                      </div>
                      <div className="zone-index">{String(index + 1).padStart(2, "0")}</div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {zone.chips.map((chip) => (
                        <span key={chip} className="route-chip">
                          {chip}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="state-bar mt-5 rounded-[24px] px-5 py-4 text-sm leading-7 text-white/56">
                Durable state and user data are intentionally kept separate from disposable
                runtime paths, which makes storage, backups, and upgrades much less chaotic.
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          id="security"
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7 }}
          className="pt-24"
        >
          <SectionHeading
            eyebrow="Security"
            title="Security is part of the topology, not a coat of paint applied after the apps were already public."
            description="The repo already shows a strong pattern: TLS and headers at the edge, Authelia in front of sensitive routes, LLDAP-backed group policy, per-host session cookies, segmented networks, VPN-isolated downloads, and secrets kept out of committed config."
          />

          <div className="mt-12 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="security-shell rounded-[34px] p-6 md:p-7">
              <p className="text-xs uppercase tracking-[0.28em] text-white/42">
                Security model
              </p>
              <h3 className="mt-3 font-heading text-3xl tracking-[-0.05em] text-white">
                Layered controls from edge to app
              </h3>

              <div className="security-orbit mt-8">
                <div className="security-ring security-ring-outer" />
                <div className="security-ring security-ring-middle" />
                <div className="security-ring security-ring-inner" />
                <div className="security-core">
                  <Shield className="size-7 text-white" />
                  <span className="mt-3 text-xs uppercase tracking-[0.3em] text-white/52">
                    policy core
                  </span>
                </div>

                <div className="security-tag security-tag-top">TLS + headers</div>
                <div className="security-tag security-tag-right">Authelia + LDAP</div>
                <div className="security-tag security-tag-bottom">Private networks</div>
                <div className="security-tag security-tag-left">Secrets discipline</div>
              </div>

              <div className="mt-8 rounded-[26px] border border-white/10 bg-white/5 px-5 py-4 text-sm leading-7 text-white/56">
                Two-factor rules are defined for the ARR surfaces and Audiobookshelf,
                while OIDC-backed apps inherit identity policy from the same control plane.
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {SECURITY_CONTROLS.map((control, index) => (
                <motion.article
                  key={control.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.45, delay: index * 0.05 }}
                  className="feature-panel rounded-[30px] p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs uppercase tracking-[0.28em] text-white/38">
                      Control {index + 1}
                    </span>
                    <span className="h-2.5 w-2.5 rounded-full bg-sky-200 shadow-[0_0_22px_rgba(186,230,253,0.65)]" />
                  </div>
                  <h3 className="mt-4 font-heading text-3xl leading-[1.02] tracking-[-0.05em] text-white">
                    {control.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-white/56">
                    {control.body}
                  </p>
                </motion.article>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          id="operations"
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7 }}
          className="pt-24"
        >
          <SectionHeading
            eyebrow="Operations"
            title="The homepage still keeps the live signals, but now they support the story instead of trying to be the whole story."
            description="Current node and route health remain visible so the page stays truthful. If this system changes, the metrics, service states, and published routes shift with it."
          />

          <div className="mt-12 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="diagram-panel rounded-[34px] p-6 md:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/42">
                    Live telemetry
                  </p>
                  <h3 className="mt-3 font-heading text-3xl tracking-[-0.05em] text-white">
                    Node and platform signal board
                  </h3>
                </div>
                <div className="signal-pill">{overview.summary.activeServices} active</div>
              </div>

              <div className="mt-8 grid gap-4">
                <MetricRail
                  label="CPU utilization"
                  value={metrics.cpuPercent}
                  helper="Five-minute average CPU load from node-exporter and Prometheus."
                />
                <MetricRail
                  label="Memory pressure"
                  value={metrics.memoryPercent}
                  helper="Current node memory consumption as a percentage of total capacity."
                />
                <MetricRail
                  label="Root disk usage"
                  value={metrics.diskPercent}
                  helper="Root filesystem occupancy excluding temporary overlay and tmpfs layers."
                />
                <MetricRail
                  label="GPU utilization"
                  value={metrics.gpuPercent}
                  helper="DCGM-exporter view of the acceleration path shared by AI and media workloads."
                />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="obs-panel rounded-[26px] p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/44">
                    Network receive
                  </p>
                  <p className="mt-3 font-heading text-3xl tracking-[-0.06em] text-white">
                    {formatBandwidth(metrics.networkRxBps)}
                  </p>
                </div>
                <div className="obs-panel rounded-[26px] p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/44">
                    Network transmit
                  </p>
                  <p className="mt-3 font-heading text-3xl tracking-[-0.06em] text-white">
                    {formatBandwidth(metrics.networkTxBps)}
                  </p>
                </div>
                <div className="obs-panel rounded-[26px] p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/44">
                    Containers observed
                  </p>
                  <p className="mt-3 font-heading text-3xl tracking-[-0.06em] text-white">
                    {metrics.containerCount === null ? (
                      "n/a"
                    ) : (
                      <NumberTicker
                        value={metrics.containerCount}
                        decimalPlaces={0}
                        className="font-heading text-3xl tracking-[-0.06em] text-white"
                      />
                    )}
                  </p>
                </div>
                <div className="obs-panel rounded-[26px] p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/44">
                    Node uptime
                  </p>
                  <p className="mt-3 font-heading text-3xl tracking-[-0.06em] text-white">
                    {formatDuration(metrics.uptimeSeconds)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {OPERATING_PRACTICES.map((practice, index) => {
                const Icon = practice.icon;

                return (
                  <motion.article
                    key={practice.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ duration: 0.45, delay: index * 0.05 }}
                    className="feature-panel rounded-[30px] p-6"
                  >
                    <div className="feature-icon">
                      <Icon className="size-5 text-white/88" />
                    </div>
                    <h3 className="mt-6 font-heading text-3xl leading-[1.04] tracking-[-0.05em] text-white">
                      {practice.title}
                    </h3>
                    <p className="mt-4 text-sm leading-7 text-white/56">
                      {practice.body}
                    </p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </motion.section>

        <motion.section
          id="services"
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.12 }}
          transition={{ duration: 0.7 }}
          className="pt-24"
        >
          <SectionHeading
            eyebrow="Live Atlas"
            title="Published routes, grouped by role, with their current state attached."
            description="This is still the live surface of the lab, but now it sits in context. Each route below is part of the larger topology above and refreshed from the running stack."
          />

          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="glass-panel-strong rounded-[28px] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-white/46">
                Total routes
              </p>
              <p className="mt-3 font-heading text-4xl tracking-[-0.08em] text-white">
                {overview.summary.totalServices}
              </p>
            </div>
            <div className="glass-panel-strong rounded-[28px] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-white/46">
                Active now
              </p>
              <p className="mt-3 font-heading text-4xl tracking-[-0.08em] text-white">
                {overview.summary.activeServices}
              </p>
            </div>
            <div className="glass-panel-strong rounded-[28px] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-white/46">
                Needs attention
              </p>
              <p className="mt-3 font-heading text-4xl tracking-[-0.08em] text-white">
                {overview.summary.inactiveServices}
              </p>
            </div>
            <div className="glass-panel-strong rounded-[28px] p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-white/46">
                Dynamic routes
              </p>
              <p className="mt-3 font-heading text-4xl tracking-[-0.08em] text-white">
                {dynamicRoutes.length}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            {serviceGroups.map(({ section, services }, index) => {
              const meta = SECTION_META[section] ?? SECTION_META.Lab;
              const Icon = meta.icon;
              const activeCount = services.filter((service) => service.active).length;

              return (
                <motion.article
                  key={section}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.55, delay: index * 0.04 }}
                  className="service-panel rounded-[34px] p-6 md:p-7"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-2xl">
                      <div className="feature-icon">
                        <Icon className={cn("size-5", meta.accent)} />
                      </div>
                      <p className="mt-6 text-xs uppercase tracking-[0.28em] text-white/40">
                        {meta.eyebrow}
                      </p>
                      <h3 className="mt-3 font-heading text-4xl tracking-[-0.06em] text-white">
                        {section}
                      </h3>
                      <p className="mt-4 text-sm leading-7 text-white/56">
                        {meta.description}
                      </p>
                    </div>

                    <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-3 text-right">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                        Healthy
                      </p>
                      <p className="mt-2 font-heading text-3xl tracking-[-0.06em] text-white">
                        {activeCount}
                        <span className="ml-2 text-base text-white/36">
                          / {services.length}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-7 grid gap-4">
                    {services.map((service) => (
                      <div
                        key={service.id}
                        className="rounded-[26px] border border-white/9 bg-white/5 p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="max-w-2xl">
                            <div className="flex items-center gap-3">
                              <StatusDot active={service.active} />
                              <h4 className="font-heading text-2xl tracking-[-0.04em] text-white">
                                {service.name}
                              </h4>
                            </div>
                            <p className="mt-3 text-sm leading-7 text-white/56">
                              {service.description}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="route-chip">
                              {service.access}
                            </span>
                            {service.dynamic ? (
                              <span className="route-chip">discovered</span>
                            ) : null}
                            <span
                              className={cn(
                                "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em]",
                                service.active
                                  ? "border-emerald-300/18 bg-emerald-300/10 text-emerald-100"
                                  : "border-rose-300/18 bg-rose-300/10 text-rose-100",
                              )}
                            >
                              {service.active ? "active" : "inactive"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4 text-xs uppercase tracking-[0.2em] text-white/36">
                          <span>{service.host}</span>
                          <span>{detailLabel(service)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.article>
              );
            })}
          </div>
        </motion.section>
      </main>
    </div>
  );
}
