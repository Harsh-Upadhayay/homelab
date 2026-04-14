"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Bot,
  Database,
  Gauge,
  Globe,
  HardDrive,
  KeyRound,
  Layers,
  Network,
  Route,
  Shield,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Overview } from "@/lib/overview";

type NodeKind =
  | "edge"
  | "routing"
  | "identity"
  | "workload"
  | "data"
  | "operations";

type NodeStatus = "online" | "degraded" | "offline" | "internal";

type ArchitectureNode = {
  id: string;
  label: string;
  description: string;
  kind: NodeKind;
  x: number;
  y: number;
  hostTemplates?: string[];
  serviceIds?: string[];
  routes?: string[];
};

type ArchitectureLink = {
  id: string;
  from: string;
  to: string;
  label: string;
  protocol: string;
};

const NODES: ArchitectureNode[] = [
  {
    id: "internet",
    label: "Public Internet",
    description: "Client traffic enters over public DNS and HTTPS.",
    kind: "edge",
    x: 50,
    y: 8,
  },
  {
    id: "cloudflare",
    label: "Cloudflare",
    description: "DNS, edge controls, and optional tunnel ingress for remote access.",
    kind: "edge",
    x: 50,
    y: 18,
  },
  {
    id: "traefik",
    label: "Traefik v3",
    description:
      "Primary reverse proxy: TLS automation, entrypoint routing, and middleware chaining.",
    kind: "routing",
    x: 50,
    y: 30,
    serviceIds: ["traefik"],
    hostTemplates: ["traefik.${domain}"],
    routes: ["web -> websecure", "ACME DNS challenge", "secure-headers middleware"],
  },
  {
    id: "authelia",
    label: "Authelia",
    description:
      "Forward-auth policy engine and OIDC provider for protected services.",
    kind: "identity",
    x: 24,
    y: 45,
    serviceIds: ["auth"],
    hostTemplates: ["auth.${domain}"],
    routes: ["/authelia/* portal", "ForwardAuth endpoint", "OIDC authorization/token"],
  },
  {
    id: "lldap",
    label: "LLDAP",
    description: "Directory backend for user/groups consumed by Authelia access rules.",
    kind: "identity",
    x: 10,
    y: 58,
    serviceIds: ["directory"],
    hostTemplates: ["lldap.${domain}"],
  },
  {
    id: "homepage",
    label: "Homepage",
    description:
      "Public root domain landing page with runtime service probes and architecture telemetry.",
    kind: "workload",
    x: 50,
    y: 45,
    hostTemplates: ["${domain}"],
  },
  {
    id: "nextcloud",
    label: "Nextcloud",
    description: "Personal cloud app backed by Postgres and Redis.",
    kind: "workload",
    x: 36,
    y: 60,
    serviceIds: ["nextcloud"],
    hostTemplates: ["nextcloud.${domain}"],
  },
  {
    id: "immich",
    label: "Immich",
    description: "Photo platform with machine-learning workers and vector search.",
    kind: "workload",
    x: 48,
    y: 60,
    serviceIds: ["immich"],
    hostTemplates: ["immich.${domain}"],
  },
  {
    id: "media",
    label: "Media Fabric",
    description:
      "Jellyfin/Jellyseerr/qBittorrent + ARR stack with VPN-isolated ingestion and automation.",
    kind: "workload",
    x: 64,
    y: 60,
    serviceIds: ["jellyfin", "jellyseerr", "qbit", "prowlarr", "sonarr", "radarr"],
    hostTemplates: [
      "jellyfin.${domain}",
      "jellyseer.${domain}",
      "qbit.${domain}",
      "prowlarr.${domain}",
      "sonarr.${domain}",
      "radarr.${domain}",
    ],
  },
  {
    id: "audiobookshelf",
    label: "Audiobookshelf",
    description: "Audiobook and podcast library with OIDC auth integration.",
    kind: "workload",
    x: 76,
    y: 60,
    serviceIds: ["audiobookshelf"],
    hostTemplates: ["audiobookshelf.${domain}"],
  },
  {
    id: "ollama",
    label: "Ollama + Gateway",
    description:
      "GPU-backed inference node with OpenAI-compatible gateway routed on /v1.",
    kind: "workload",
    x: 86,
    y: 45,
    serviceIds: ["ollama"],
    hostTemplates: ["ollama.${domain}"],
    routes: ["Host(ollama) && PathPrefix(/v1)", "Bearer-gated gateway", "ForwardAuth for core API"],
  },
  {
    id: "jenkins",
    label: "Jenkins + DinD",
    description: "CI controller and isolated Docker executor network for build automation.",
    kind: "operations",
    x: 82,
    y: 73,
    serviceIds: ["jenkins"],
    hostTemplates: ["jenkins.${domain}"],
  },
  {
    id: "observability",
    label: "Prometheus / Grafana",
    description:
      "Metrics pipeline scraping Traefik, node-exporter, cAdvisor, and GPU exporter.",
    kind: "operations",
    x: 18,
    y: 73,
    serviceIds: ["grafana"],
    hostTemplates: ["grafana.${domain}"],
    routes: ["Prometheus scrape: traefik,node,cadvisor,dcgm", "Grafana OIDC login via Authelia"],
  },
  {
    id: "storage",
    label: "Persistent Storage",
    description:
      "State root for app data, media, model weights, and database volumes under /storage.",
    kind: "data",
    x: 50,
    y: 86,
  },
  {
    id: "gpu",
    label: "NVIDIA Compute",
    description:
      "Shared GPU resources serving Immich transcoding/ML, Ollama inference, and telemetry.",
    kind: "data",
    x: 66,
    y: 86,
  },
];

const LINKS: ArchitectureLink[] = [
  { id: "l1", from: "internet", to: "cloudflare", label: "DNS + HTTPS", protocol: "edge" },
  { id: "l2", from: "cloudflare", to: "traefik", label: "443 ingress", protocol: "edge" },
  { id: "l3", from: "traefik", to: "homepage", label: "Host(neovara.uk)", protocol: "route" },
  { id: "l4", from: "traefik", to: "authelia", label: "ForwardAuth", protocol: "auth" },
  { id: "l5", from: "authelia", to: "lldap", label: "LDAP groups", protocol: "auth" },
  { id: "l6", from: "traefik", to: "nextcloud", label: "Host(nextcloud)", protocol: "route" },
  { id: "l7", from: "traefik", to: "immich", label: "Host(immich)", protocol: "route" },
  { id: "l8", from: "traefik", to: "media", label: "Host(media apps)", protocol: "route" },
  { id: "l9", from: "traefik", to: "audiobookshelf", label: "Host(audiobookshelf)", protocol: "route" },
  { id: "l10", from: "traefik", to: "ollama", label: "Host(ollama) + /v1", protocol: "route" },
  { id: "l11", from: "traefik", to: "jenkins", label: "Host(jenkins)", protocol: "route" },
  { id: "l12", from: "traefik", to: "observability", label: "Host(grafana)", protocol: "route" },
  { id: "l13", from: "nextcloud", to: "storage", label: "files + db", protocol: "data" },
  { id: "l14", from: "immich", to: "storage", label: "uploads + postgres", protocol: "data" },
  { id: "l15", from: "media", to: "storage", label: "media library", protocol: "data" },
  { id: "l16", from: "audiobookshelf", to: "storage", label: "audio metadata", protocol: "data" },
  { id: "l17", from: "ollama", to: "storage", label: "model cache", protocol: "data" },
  { id: "l18", from: "observability", to: "traefik", label: "metrics scrape", protocol: "ops" },
  { id: "l19", from: "immich", to: "gpu", label: "nvenc + ml", protocol: "ops" },
  { id: "l20", from: "ollama", to: "gpu", label: "llm inference", protocol: "ops" },
  { id: "l21", from: "authelia", to: "nextcloud", label: "/authelia policy", protocol: "auth" },
  { id: "l22", from: "authelia", to: "immich", label: "/authelia policy", protocol: "auth" },
  { id: "l23", from: "authelia", to: "audiobookshelf", label: "/authelia policy", protocol: "auth" },
  { id: "l24", from: "authelia", to: "ollama", label: "one-factor + basic", protocol: "auth" },
  { id: "l25", from: "authelia", to: "observability", label: "OIDC auth", protocol: "auth" },
];

const KIND_META: Record<
  NodeKind,
  { label: string; icon: typeof Globe; dot: string; tone: string; ring: string }
> = {
  edge: {
    label: "Edge",
    icon: Globe,
    dot: "bg-cyan-300",
    tone: "from-cyan-400/20 to-cyan-200/0",
    ring: "shadow-[0_0_32px_rgba(34,211,238,0.28)]",
  },
  routing: {
    label: "Routing",
    icon: Route,
    dot: "bg-blue-300",
    tone: "from-blue-400/18 to-blue-200/0",
    ring: "shadow-[0_0_32px_rgba(96,165,250,0.25)]",
  },
  identity: {
    label: "Identity",
    icon: Shield,
    dot: "bg-violet-300",
    tone: "from-violet-400/18 to-violet-200/0",
    ring: "shadow-[0_0_32px_rgba(167,139,250,0.28)]",
  },
  workload: {
    label: "Workload",
    icon: Layers,
    dot: "bg-emerald-300",
    tone: "from-emerald-400/18 to-emerald-200/0",
    ring: "shadow-[0_0_32px_rgba(52,211,153,0.24)]",
  },
  data: {
    label: "Data",
    icon: Database,
    dot: "bg-amber-300",
    tone: "from-amber-400/16 to-amber-200/0",
    ring: "shadow-[0_0_32px_rgba(251,191,36,0.2)]",
  },
  operations: {
    label: "Operations",
    icon: Gauge,
    dot: "bg-zinc-300",
    tone: "from-zinc-300/16 to-zinc-200/0",
    ring: "shadow-[0_0_32px_rgba(212,212,216,0.2)]",
  },
};

const STATUS_META: Record<
  NodeStatus,
  { label: string; className: string; pingClass: string }
> = {
  online: {
    label: "Online",
    className: "text-emerald-200 border-emerald-300/35 bg-emerald-500/10",
    pingClass: "bg-emerald-300",
  },
  degraded: {
    label: "Degraded",
    className: "text-amber-100 border-amber-300/40 bg-amber-500/10",
    pingClass: "bg-amber-300",
  },
  offline: {
    label: "Offline",
    className: "text-rose-200 border-rose-300/40 bg-rose-500/10",
    pingClass: "bg-rose-300",
  },
  internal: {
    label: "Internal",
    className: "text-zinc-300 border-zinc-400/30 bg-zinc-500/10",
    pingClass: "bg-zinc-300",
  },
};

function expandHostTemplate(template: string, domain: string) {
  return template
    .replaceAll("${domain}", domain)
    .replaceAll("${HOMELAB_DOMAIN}", domain)
    .trim();
}

function getNodeStatus(node: ArchitectureNode, serviceState: Map<string, boolean>): NodeStatus {
  if (!node.serviceIds || node.serviceIds.length === 0) {
    return "internal";
  }

  const values = node.serviceIds
    .map((serviceId) => serviceState.get(serviceId))
    .filter((value): value is boolean => typeof value === "boolean");

  if (values.length === 0) {
    return "internal";
  }

  if (values.every(Boolean)) {
    return "online";
  }

  if (values.some(Boolean)) {
    return "degraded";
  }

  return "offline";
}

function buildCurvePath(from: ArchitectureNode, to: ArchitectureNode) {
  const controlWeight = Math.abs(from.x - to.x) > 22 ? 0.45 : 0.62;
  const c1y = from.y + (to.y - from.y) * controlWeight;
  const c2y = to.y - (to.y - from.y) * controlWeight;
  return `M ${from.x} ${from.y} C ${from.x} ${c1y} ${to.x} ${c2y} ${to.x} ${to.y}`;
}

export function ArchitectureMap({ overview }: { overview: Overview }) {
  const [activeNodeId, setActiveNodeId] = useState<string>("traefik");

  const domain = overview.meta.domain || "neovara.uk";

  const serviceState = useMemo(() => {
    const state = new Map<string, boolean>();
    for (const service of overview.services) {
      state.set(service.id, service.active);
    }
    return state;
  }, [overview.services]);

  const serviceHosts = useMemo(() => {
    const hosts = new Map<string, string>();
    for (const service of overview.services) {
      hosts.set(service.id, service.host);
    }
    return hosts;
  }, [overview.services]);

  const nodeById = useMemo(() => new Map(NODES.map((node) => [node.id, node])), []);

  const activeNode = nodeById.get(activeNodeId) ?? NODES[0];

  const relatedLinks = useMemo(
    () => LINKS.filter((link) => link.from === activeNode.id || link.to === activeNode.id),
    [activeNode.id],
  );

  const relatedNodeIds = useMemo(() => {
    const ids = new Set<string>([activeNode.id]);
    for (const link of relatedLinks) {
      ids.add(link.from);
      ids.add(link.to);
    }
    return ids;
  }, [activeNode.id, relatedLinks]);

  const selectedHosts = useMemo(() => {
    const hosts = new Set<string>();

    for (const serviceId of activeNode.serviceIds ?? []) {
      const host = serviceHosts.get(serviceId);
      if (host) {
        hosts.add(host);
      }
    }

    for (const template of activeNode.hostTemplates ?? []) {
      hosts.add(expandHostTemplate(template, domain));
    }

    return Array.from(hosts).sort((a, b) => a.localeCompare(b));
  }, [activeNode.hostTemplates, activeNode.serviceIds, domain, serviceHosts]);

  const selectedStatus = getNodeStatus(activeNode, serviceState);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,1fr)]">
      <div className="surface-panel relative overflow-hidden rounded-3xl p-4 md:p-6">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_12%,rgba(255,255,255,0.12),transparent_26%),radial-gradient(circle_at_78%_84%,rgba(255,255,255,0.08),transparent_30%)]" />
        <div className="map-stage relative mx-auto aspect-[16/11] w-full max-w-[940px]">
          <svg
            viewBox="0 0 100 100"
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden
          >
            <defs>
              <linearGradient id="route-line" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.65)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
              </linearGradient>
              <linearGradient id="route-line-active" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(96,165,250,0.95)" />
                <stop offset="100%" stopColor="rgba(167,139,250,0.35)" />
              </linearGradient>
            </defs>

            {LINKS.map((link) => {
              const from = nodeById.get(link.from);
              const to = nodeById.get(link.to);

              if (!from || !to) {
                return null;
              }

              const isRelated =
                link.from === activeNode.id ||
                link.to === activeNode.id ||
                (relatedNodeIds.has(link.from) && relatedNodeIds.has(link.to));

              const path = buildCurvePath(from, to);
              const midX = (from.x + to.x) / 2;
              const midY = (from.y + to.y) / 2;

              return (
                <g key={link.id}>
                  <path
                    d={path}
                    stroke={isRelated ? "url(#route-line-active)" : "url(#route-line)"}
                    strokeWidth={isRelated ? 0.65 : 0.35}
                    strokeOpacity={isRelated ? 0.95 : 0.45}
                    strokeLinecap="round"
                    fill="none"
                    className={cn(isRelated && "route-flow")}
                  />

                  {isRelated ? (
                    <circle r="0.45" fill="rgba(147,197,253,0.85)">
                      <animateMotion dur="7s" repeatCount="indefinite" path={path} />
                    </circle>
                  ) : null}

                  <g>
                    <rect
                      x={midX - 5.2}
                      y={midY - 1.8}
                      width={10.4}
                      height={3.6}
                      rx={1.8}
                      fill="rgba(0,0,0,0.78)"
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="0.1"
                    />
                    <text
                      x={midX}
                      y={midY + 0.35}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.7)"
                      style={{ fontSize: "1.15px", letterSpacing: "0.08px" }}
                    >
                      {link.label}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {NODES.map((node, index) => {
            const meta = KIND_META[node.kind];
            const Icon = meta.icon;
            const nodeStatus = getNodeStatus(node, serviceState);
            const isActive = node.id === activeNode.id;
            const isConnected = relatedNodeIds.has(node.id);

            return (
              <motion.button
                key={node.id}
                type="button"
                className={cn(
                  "group absolute -translate-x-1/2 -translate-y-1/2 text-left",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                )}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: [0, -1.8, 0],
                  scale: isActive ? 1.02 : 1,
                }}
                transition={{
                  opacity: { duration: 0.45, delay: index * 0.03 },
                  y: {
                    duration: 4 + (index % 5),
                    delay: index * 0.15,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: "reverse",
                    ease: "easeInOut",
                  },
                  scale: { duration: 0.2 },
                }}
                whileHover={{ scale: 1.05 }}
                onHoverStart={() => setActiveNodeId(node.id)}
                onFocus={() => setActiveNodeId(node.id)}
                onClick={() => setActiveNodeId(node.id)}
              >
                <div
                  className={cn(
                    "relative rounded-2xl border px-3 py-2 backdrop-blur-xl transition-all duration-300",
                    "bg-[linear-gradient(160deg,rgba(255,255,255,0.11),rgba(255,255,255,0.02))]",
                    meta.ring,
                    isActive
                      ? "border-white/45"
                      : isConnected
                        ? "border-white/26"
                        : "border-white/14",
                  )}
                >
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 transition-opacity duration-300",
                      meta.tone,
                      (isActive || isConnected) && "opacity-100",
                    )}
                  />

                  <div className="relative flex items-center gap-2.5">
                    <div className="rounded-xl border border-white/20 bg-black/55 p-1.5">
                      <Icon className="h-3.5 w-3.5 text-white/90" />
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">{meta.label}</p>
                      <p className="text-xs font-medium text-white/95">{node.label}</p>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full border border-black",
                      STATUS_META[nodeStatus].pingClass,
                    )}
                  />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <aside className="surface-panel rounded-3xl p-5 md:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">Selected Component</p>
            <h3 className="mt-1 text-xl font-semibold text-white">{activeNode.label}</h3>
          </div>

          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px]",
              STATUS_META[selectedStatus].className,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[selectedStatus].pingClass)} />
            {STATUS_META[selectedStatus].label}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-white/72">{activeNode.description}</p>

        <div className="mt-5 grid gap-3">
          <div className="rounded-2xl border border-white/12 bg-white/[0.03] p-3.5">
            <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-white/45">Endpoints</p>
            <div className="flex flex-wrap gap-1.5">
              {selectedHosts.length ? (
                selectedHosts.map((host) => (
                  <a
                    key={host}
                    href={`https://${host}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-white/15 bg-black/55 px-2 py-1 font-mono text-[11px] text-white/78 transition-colors hover:border-white/35 hover:text-white"
                  >
                    {host}
                  </a>
                ))
              ) : (
                <span className="text-xs text-white/52">No public endpoint</span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/12 bg-white/[0.03] p-3.5">
            <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-white/45">Routing Notes</p>
            <ul className="space-y-1.5">
              {(activeNode.routes?.length ? activeNode.routes : ["No custom route directives"])
                .slice(0, 4)
                .map((route) => (
                  <li key={route} className="flex items-start gap-2 text-xs text-white/72">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/35" />
                    <span>{route}</span>
                  </li>
                ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/12 bg-white/[0.03] p-3.5">
            <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-white/45">Connected Flows</p>
            <div className="space-y-1.5">
              {relatedLinks.length ? (
                relatedLinks.map((link) => (
                  <div key={link.id} className="rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5">
                    <p className="text-[11px] text-white/88">{link.label}</p>
                    <p className="mt-0.5 text-[10px] text-white/46">
                      {link.from} {"->"} {link.to} ({link.protocol})
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-white/52">No links</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.14em] text-white/45">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1">
            <Network className="h-3 w-3" /> Reverse Proxy
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1">
            <KeyRound className="h-3 w-3" /> Forward Auth
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1">
            <HardDrive className="h-3 w-3" /> Shared Storage
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1">
            <Bot className="h-3 w-3" /> GPU AI
          </span>
        </div>
      </aside>
    </div>
  );
}
