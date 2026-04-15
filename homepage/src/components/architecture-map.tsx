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
type LaneId = "edge" | "control" | "runtime" | "foundation";
type LinkViewMode = "focused" | "all";

type ArchitectureNode = {
  id: string;
  label: string;
  description: string;
  kind: NodeKind;
  lane: LaneId;
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

const LANE_ORDER: LaneId[] = ["edge", "control", "runtime", "foundation"];

const NODES: ArchitectureNode[] = [
  {
    id: "internet",
    label: "Public Internet",
    description: "Client traffic enters over public DNS and HTTPS.",
    kind: "edge",
    lane: "edge",
    x: 18,
    y: 12,
  },
  {
    id: "cloudflare",
    label: "Cloudflare",
    description: "DNS, edge controls, and optional tunnel ingress for remote access.",
    kind: "edge",
    lane: "edge",
    x: 50,
    y: 12,
  },
  {
    id: "traefik",
    label: "Traefik v3",
    description:
      "Primary reverse proxy: TLS automation, entrypoint routing, and middleware chaining.",
    kind: "routing",
    lane: "control",
    x: 20,
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
    lane: "control",
    x: 50,
    y: 30,
    serviceIds: ["auth"],
    hostTemplates: ["auth.${domain}"],
    routes: ["/authelia/* portal", "ForwardAuth endpoint", "OIDC authorization/token"],
  },
  {
    id: "lldap",
    label: "LLDAP",
    description: "Directory backend for user/groups consumed by Authelia access rules.",
    kind: "identity",
    lane: "control",
    x: 80,
    y: 30,
    serviceIds: ["directory"],
    hostTemplates: ["lldap.${domain}"],
  },
  {
    id: "homepage",
    label: "Homepage",
    description:
      "Public root domain landing page with runtime service probes and architecture telemetry.",
    kind: "workload",
    lane: "runtime",
    x: 10,
    y: 56,
    hostTemplates: ["${domain}"],
  },
  {
    id: "nextcloud",
    label: "Nextcloud",
    description: "Personal cloud app backed by Postgres and Redis.",
    kind: "workload",
    lane: "runtime",
    x: 30,
    y: 56,
    serviceIds: ["nextcloud"],
    hostTemplates: ["nextcloud.${domain}"],
  },
  {
    id: "immich",
    label: "Immich",
    description: "Photo platform with machine-learning workers and vector search.",
    kind: "workload",
    lane: "runtime",
    x: 50,
    y: 56,
    serviceIds: ["immich"],
    hostTemplates: ["immich.${domain}"],
  },
  {
    id: "media",
    label: "Media Fabric",
    description:
      "Jellyfin/Jellyseerr/qBittorrent + ARR stack with VPN-isolated ingestion and automation.",
    kind: "workload",
    lane: "runtime",
    x: 70,
    y: 56,
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
    lane: "runtime",
    x: 90,
    y: 56,
    serviceIds: ["audiobookshelf"],
    hostTemplates: ["audiobookshelf.${domain}"],
  },
  {
    id: "ollama",
    label: "Ollama + Gateway",
    description:
      "GPU-backed inference node with OpenAI-compatible gateway routed on /v1.",
    kind: "workload",
    lane: "runtime",
    x: 30,
    y: 74,
    serviceIds: ["ollama"],
    hostTemplates: ["ollama.${domain}"],
    routes: ["Host(ollama) && PathPrefix(/v1)", "Bearer-gated gateway", "ForwardAuth for core API"],
  },
  {
    id: "observability",
    label: "Prometheus / Grafana",
    description:
      "Metrics pipeline scraping Traefik, node-exporter, cAdvisor, and GPU exporter.",
    kind: "operations",
    lane: "runtime",
    x: 60,
    y: 74,
    serviceIds: ["grafana"],
    hostTemplates: ["grafana.${domain}"],
    routes: ["Prometheus scrape: traefik,node,cadvisor,dcgm", "Grafana OIDC login via Authelia"],
  },
  {
    id: "jenkins",
    label: "Jenkins + DinD",
    description: "CI controller and isolated Docker executor network for build automation.",
    kind: "operations",
    lane: "runtime",
    x: 90,
    y: 74,
    serviceIds: ["jenkins"],
    hostTemplates: ["jenkins.${domain}"],
  },
  {
    id: "storage",
    label: "Persistent Storage",
    description:
      "State root for app data, media, model weights, and database volumes under /storage.",
    kind: "data",
    lane: "foundation",
    x: 38,
    y: 90,
  },
  {
    id: "gpu",
    label: "NVIDIA Compute",
    description:
      "Shared GPU resources serving Immich transcoding/ML, Ollama inference, and telemetry.",
    kind: "data",
    lane: "foundation",
    x: 68,
    y: 90,
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

const KIND_META: Record<NodeKind, { label: string; icon: typeof Globe }> = {
  edge: { label: "Edge", icon: Globe },
  routing: { label: "Routing", icon: Route },
  identity: { label: "Identity", icon: Shield },
  workload: { label: "Workload", icon: Layers },
  data: { label: "Data", icon: Database },
  operations: { label: "Operations", icon: Gauge },
};

const LANE_META: Record<
  LaneId,
  { label: string; description: string; top: number; height: number }
> = {
  edge: {
    label: "Edge",
    description: "Public ingress",
    top: 4,
    height: 14,
  },
  control: {
    label: "Control",
    description: "Routing and identity",
    top: 22,
    height: 18,
  },
  runtime: {
    label: "Runtime",
    description: "Apps and operations",
    top: 44,
    height: 38,
  },
  foundation: {
    label: "Foundation",
    description: "State and compute",
    top: 84,
    height: 12,
  },
};

const STATUS_META: Record<
  NodeStatus,
  { label: string; className: string; pingClass: string }
> = {
  online: {
    label: "Online",
    className: "text-emerald-200 border-emerald-300/25 bg-emerald-500/10",
    pingClass: "bg-emerald-300",
  },
  degraded: {
    label: "Degraded",
    className: "text-amber-100 border-amber-300/25 bg-amber-500/10",
    pingClass: "bg-amber-300",
  },
  offline: {
    label: "Offline",
    className: "text-rose-200 border-rose-300/25 bg-rose-500/10",
    pingClass: "bg-rose-300",
  },
  internal: {
    label: "Internal",
    className: "text-zinc-300 border-white/10 bg-white/[0.04]",
    pingClass: "bg-white/55",
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

function buildRoutePath(from: ArchitectureNode, to: ArchitectureNode) {
  if (Math.abs(from.y - to.y) < 1) {
    return `M ${from.x} ${from.y} H ${to.x}`;
  }

  const midY = from.y + (to.y - from.y) / 2;
  return `M ${from.x} ${from.y} V ${midY} H ${to.x} V ${to.y}`;
}

export function ArchitectureMap({ overview }: { overview: Overview }) {
  const [activeNodeId, setActiveNodeId] = useState<string>("traefik");
  const [linkViewMode, setLinkViewMode] = useState<LinkViewMode>("focused");

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

  const highlightedLinkIds = useMemo(
    () => new Set(relatedLinks.map((link) => link.id)),
    [relatedLinks],
  );

  const connectedNodes = useMemo(() => {
    const seen = new Set<string>();
    const nodes: ArchitectureNode[] = [];

    for (const link of relatedLinks) {
      for (const nodeId of [link.from, link.to]) {
        if (nodeId === activeNode.id || seen.has(nodeId)) {
          continue;
        }

        const node = nodeById.get(nodeId);
        if (node) {
          seen.add(nodeId);
          nodes.push(node);
        }
      }
    }

    return nodes;
  }, [activeNode.id, nodeById, relatedLinks]);

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
  const visibleLinks = linkViewMode === "all" ? LINKS : relatedLinks;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,380px)]">
      <section className="surface-panel rounded-[2rem] p-4 md:p-6">
        <div className="flex flex-col gap-4 border-b border-white/8 pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">
              Topology Board
            </p>
            <h3 className="mt-2 text-2xl font-light tracking-[-0.03em] text-white md:text-3xl">
              Flat, focused, and screen-safe.
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/50 md:text-[0.95rem]">
              Click any component to isolate its dependencies. Toggle full routes when you want
              the whole graph back.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] p-1">
            {(["focused", "all"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setLinkViewMode(mode)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] transition-colors",
                  linkViewMode === mode
                    ? "bg-white text-black"
                    : "text-white/55 hover:text-white/80",
                )}
              >
                {mode === "focused" ? "Focus Mode" : "Full Graph"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-[#010101] p-3 md:p-4">
          <div className="relative overflow-hidden rounded-[1.5rem] border border-white/8 bg-black">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:34px_34px] opacity-35" />

            <div className="relative aspect-[16/11] min-h-[540px] w-full md:min-h-[620px]">
              {LANE_ORDER.map((lane) => {
                const laneMeta = LANE_META[lane];
                const laneCount = NODES.filter((node) => node.lane === lane).length;

                return (
                  <div
                    key={lane}
                    className="pointer-events-none absolute left-3 right-3 rounded-[1.35rem] border border-white/[0.05] bg-white/[0.02]"
                    style={{ top: `${laneMeta.top}%`, height: `${laneMeta.height}%` }}
                  >
                    <div className="absolute left-3 top-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-white/35">
                      <span>{laneMeta.label}</span>
                      <span className="text-white/18">/</span>
                      <span className="text-white/22">{laneMeta.description}</span>
                      <span className="rounded-full border border-white/8 px-1.5 py-0.5 text-[9px] text-white/25">
                        {laneCount}
                      </span>
                    </div>
                  </div>
                );
              })}

              <svg
                viewBox="0 0 100 100"
                className="pointer-events-none absolute inset-0 h-full w-full"
                aria-hidden
              >
                {visibleLinks.map((link) => {
                  const from = nodeById.get(link.from);
                  const to = nodeById.get(link.to);

                  if (!from || !to) {
                    return null;
                  }

                  const isHighlighted = highlightedLinkIds.has(link.id);
                  const path = buildRoutePath(from, to);

                  return (
                    <g key={link.id}>
                      <path
                        d={path}
                        fill="none"
                        stroke="rgba(255,255,255,0.18)"
                        strokeWidth={isHighlighted ? 1.15 : 0.55}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeOpacity={isHighlighted ? 0.95 : 0.3}
                        className={cn(isHighlighted && "route-flow")}
                      />
                      {isHighlighted ? (
                        <circle r="0.75" fill="#ffffff">
                          <animateMotion dur="3.2s" repeatCount="indefinite" path={path} />
                        </circle>
                      ) : null}
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
                const fadeNode = linkViewMode === "focused" && !isConnected;

                return (
                  <motion.button
                    key={node.id}
                    type="button"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: fadeNode ? 0.42 : 1, y: 0, scale: isActive ? 1.03 : 1 }}
                    transition={{ duration: 0.28, delay: index * 0.02 }}
                    onMouseEnter={() => setActiveNodeId(node.id)}
                    onFocus={() => setActiveNodeId(node.id)}
                    onClick={() => setActiveNodeId(node.id)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/65"
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  >
                    <div
                      className={cn(
                        "w-[clamp(4.25rem,18vw,7rem)] rounded-[1.15rem] border bg-black/92 p-2.5 shadow-[0_24px_48px_rgba(0,0,0,0.45)] transition-colors md:w-[clamp(5rem,12vw,8rem)]",
                        isActive
                          ? "border-white/55 bg-[#050505]"
                          : isConnected
                            ? "border-white/20"
                            : "border-white/10",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="rounded-[0.8rem] border border-white/10 bg-white/[0.04] p-1.5">
                          <Icon className="h-3.5 w-3.5 text-white/88" />
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 h-2.5 w-2.5 rounded-full border border-black",
                            STATUS_META[nodeStatus].pingClass,
                          )}
                        />
                      </div>

                      <p className="mt-3 text-[9px] uppercase tracking-[0.22em] text-white/34">
                        {meta.label}
                      </p>
                      <p className="mt-1 text-[11px] font-medium leading-tight text-white/92 md:text-xs">
                        {node.label}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-white/40">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
            <Network className="h-3 w-3" /> Proxy path
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
            <KeyRound className="h-3 w-3" /> Auth boundary
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
            <HardDrive className="h-3 w-3" /> Shared state
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1">
            <Bot className="h-3 w-3" /> GPU workloads
          </span>
        </div>
      </section>

      <motion.aside
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35 }}
        className="surface-panel rounded-[2rem] p-5 md:p-6"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/8 pb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/36">
              Selected Component
            </p>
            <h3 className="mt-2 text-2xl font-light tracking-[-0.03em] text-white">
              {activeNode.label}
            </h3>
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

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-3">
            <p className="text-[9px] uppercase tracking-[0.22em] text-white/35">Type</p>
            <p className="mt-2 text-sm text-white/88">{KIND_META[activeNode.kind].label}</p>
          </div>
          <div className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-3">
            <p className="text-[9px] uppercase tracking-[0.22em] text-white/35">Flows</p>
            <p className="mt-2 text-sm text-white/88">{relatedLinks.length}</p>
          </div>
          <div className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-3">
            <p className="text-[9px] uppercase tracking-[0.22em] text-white/35">Endpoints</p>
            <p className="mt-2 text-sm text-white/88">{selectedHosts.length}</p>
          </div>
        </div>

        <p className="mt-5 text-sm leading-7 text-white/62">{activeNode.description}</p>

        <div className="mt-5 rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/36">
            Connected Components
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {connectedNodes.length ? (
              connectedNodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setActiveNodeId(node.id)}
                  className="rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-[11px] text-white/70 transition-colors hover:border-white/20 hover:text-white"
                >
                  {node.label}
                </button>
              ))
            ) : (
              <span className="text-xs text-white/45">No direct dependencies</span>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/36">Endpoints</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedHosts.length ? (
              selectedHosts.map((host) => (
                <a
                  key={host}
                  href={`https://${host}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/10 bg-black/70 px-3 py-1.5 font-mono text-[11px] text-white/72 transition-colors hover:border-white/20 hover:text-white"
                >
                  {host}
                </a>
              ))
            ) : (
              <span className="text-xs text-white/45">No public endpoint</span>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/36">Routing Notes</p>
          <ul className="mt-3 space-y-2">
            {(activeNode.routes?.length ? activeNode.routes : ["No custom route directives"])
              .slice(0, 4)
              .map((route) => (
                <li key={route} className="flex items-start gap-2 text-xs leading-6 text-white/62">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-white/35" />
                  <span>{route}</span>
                </li>
              ))}
          </ul>
        </div>

        <div className="mt-4 rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/36">Direct Flows</p>
          <div className="mt-3 space-y-2">
            {relatedLinks.length ? (
              relatedLinks.map((link) => {
                const from = nodeById.get(link.from)?.label ?? link.from;
                const to = nodeById.get(link.to)?.label ?? link.to;

                return (
                  <div
                    key={link.id}
                    className="rounded-[1rem] border border-white/8 bg-black/55 px-3 py-2.5"
                  >
                    <p className="text-sm text-white/86">{link.label}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/35">
                      {from} {"->"} {to} / {link.protocol}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-white/45">No direct flows</p>
            )}
          </div>
        </div>
      </motion.aside>
    </div>
  );
}
