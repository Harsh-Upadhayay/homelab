export type ServiceDefinition = {
  id: string;
  name: string;
  hostEnv: string;
  section: string;
  access: string;
  description: string;
  priority: number;
  dynamic?: boolean;
};

export type CheckedService = {
  id: string;
  name: string;
  host: string;
  section: string;
  access: string;
  description: string;
  priority: number;
  url: string;
  dynamic?: boolean;
  active: boolean;
  state: "active" | "inactive";
  statusCode: number | null;
  responseTimeMs: number;
  error: string | null;
};

export type Overview = {
  meta: {
    ownerName: string;
    domain: string;
    refreshedAt: string;
    cacheTtlMs: number;
  };
  summary: {
    totalServices: number;
    activeServices: number;
    inactiveServices: number;
  };
  metrics: Record<string, number | null>;
  services: CheckedService[];
};

const OWNER_NAME = process.env.HOMEPAGE_OWNER || "Harsh Upadhayay";
const DOMAIN = process.env.HOMELAB_DOMAIN || "localhost";
const PROMETHEUS_URL =
  process.env.HOMEPAGE_PROMETHEUS_URL || "http://prometheus:9090";
const CACHE_TTL_MS = Number(process.env.HOMEPAGE_CACHE_TTL_MS || 30000);
const STATUS_TIMEOUT_MS = Number(
  process.env.HOMEPAGE_STATUS_TIMEOUT_MS || 4500,
);

const KNOWN_SERVICES: ServiceDefinition[] = [
  {
    id: "auth",
    name: "Authelia",
    hostEnv: "AUTH_HOST",
    section: "Platform",
    access: "Sign-in",
    description: "Identity, MFA, and the shared access portal.",
    priority: 10,
  },
  {
    id: "grafana",
    name: "Grafana",
    hostEnv: "GRAFANA_HOST",
    section: "Platform",
    access: "Sign-in",
    description: "Dashboards for node health, containers, and GPU telemetry.",
    priority: 20,
  },
  {
    id: "traefik",
    name: "Traefik",
    hostEnv: "TRAEFIK_HOST",
    section: "Platform",
    access: "Admin",
    description: "Edge proxy, certificates, and routing across the stack.",
    priority: 30,
  },
  {
    id: "directory",
    name: "LLDAP",
    hostEnv: "DIRECTORY_HOST",
    section: "Platform",
    access: "Admin",
    description: "Directory service backing identity and group management.",
    priority: 40,
  },
  {
    id: "jenkins",
    name: "Jenkins",
    hostEnv: "JENKINS_HOST",
    section: "Platform",
    access: "Admin",
    description: "CI workflows, image builds, and task automation.",
    priority: 50,
  },
  {
    id: "nextcloud",
    name: "Nextcloud",
    hostEnv: "NEXTCLOUD_HOST",
    section: "Cloud",
    access: "Sign-in",
    description: "Files, sync, and personal cloud storage.",
    priority: 100,
  },
  {
    id: "immich",
    name: "Immich",
    hostEnv: "IMMICH_HOST",
    section: "Cloud",
    access: "Sign-in",
    description: "Photo library, uploads, and search.",
    priority: 110,
  },
  {
    id: "audiobookshelf",
    name: "Audiobookshelf",
    hostEnv: "AUDIOBOOKSHELF_HOST",
    section: "Cloud",
    access: "Public",
    description: "Audiobooks, podcasts, and reading queue.",
    priority: 120,
  },
  {
    id: "jellyfin",
    name: "Jellyfin",
    hostEnv: "JELLYFIN_HOST",
    section: "Media",
    access: "Public",
    description: "Media streaming and playback.",
    priority: 200,
  },
  {
    id: "jellyseerr",
    name: "Jellyseerr",
    hostEnv: "JELLYSEERR_HOST",
    section: "Media",
    access: "Public",
    description: "Requests and discovery for the media catalog.",
    priority: 210,
  },
  {
    id: "qbit",
    name: "qBittorrent",
    hostEnv: "QBIT_HOST",
    section: "Automation",
    access: "Public",
    description: "Torrent ingestion behind the VPN edge.",
    priority: 300,
  },
  {
    id: "prowlarr",
    name: "Prowlarr",
    hostEnv: "PROWLARR_HOST",
    section: "Automation",
    access: "Sign-in",
    description: "Indexer management for the media stack.",
    priority: 310,
  },
  {
    id: "sonarr",
    name: "Sonarr",
    hostEnv: "SONARR_HOST",
    section: "Automation",
    access: "Sign-in",
    description: "TV library automation and release handling.",
    priority: 320,
  },
  {
    id: "radarr",
    name: "Radarr",
    hostEnv: "RADARR_HOST",
    section: "Automation",
    access: "Sign-in",
    description: "Movie automation and library management.",
    priority: 330,
  },
  {
    id: "ollama",
    name: "Ollama",
    hostEnv: "OLLAMA_HOST",
    section: "AI",
    access: "Sign-in",
    description: "Local model serving plus the OpenAI-compatible gateway.",
    priority: 400,
  },
];

const IGNORED_DYNAMIC_HOSTS = new Set([
  "AUTH_HOST",
  "AUDIOBOOKSHELF_HOST",
  "DIRECTORY_HOST",
  "GRAFANA_HOST",
  "IMMICH_HOST",
  "JELLYFIN_HOST",
  "JELLYSEERR_HOST",
  "JENKINS_HOST",
  "NEXTCLOUD_HOST",
  "OLLAMA_HOST",
  "PROMETHEUS_HOST",
  "PROWLARR_HOST",
  "QBIT_HOST",
  "RADARR_HOST",
  "SONARR_HOST",
  "TRAEFIK_HOST",
]);

const SECTION_ORDER = new Map([
  ["Platform", 10],
  ["Cloud", 20],
  ["Media", 30],
  ["Automation", 40],
  ["AI", 50],
  ["Lab", 60],
]);

type CacheState = {
  expiresAt: number;
  data: Overview | null;
  pending: Promise<Overview> | null;
};

const globalCache = globalThis as typeof globalThis & {
  __homepageOverviewCache?: CacheState;
};

const cacheState =
  globalCache.__homepageOverviewCache ??
  (globalCache.__homepageOverviewCache = {
    expiresAt: 0,
    data: null,
    pending: null,
  });

function humanizeEnvName(value: string) {
  return value
    .replace(/_HOST$/, "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildServiceCatalog() {
  const catalog: Array<
    Omit<CheckedService, "active" | "state" | "statusCode" | "responseTimeMs" | "error">
  > = [];

  for (const service of KNOWN_SERVICES) {
    const host = process.env[service.hostEnv];
    if (!host) {
      continue;
    }

    catalog.push({
      id: service.id,
      name: service.name,
      host,
      section: service.section,
      access: service.access,
      description: service.description,
      priority: service.priority,
      dynamic: service.dynamic,
      url: `https://${host}`,
    });
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (!key.endsWith("_HOST") || !value || IGNORED_DYNAMIC_HOSTS.has(key)) {
      continue;
    }

    if (!value.includes(DOMAIN)) {
      continue;
    }

    catalog.push({
      id: key.toLowerCase().replace(/_host$/, ""),
      name: humanizeEnvName(key),
      host: value,
      section: "Lab",
      access: "Sign-in",
      description: "Additional subdomain configured in the homelab environment.",
      priority: 900,
      dynamic: true,
      url: `https://${value}`,
    });
  }

  return catalog.sort((left, right) => left.priority - right.priority);
}

async function queryPrometheus(query: string) {
  const url = new URL("/api/v1/query", PROMETHEUS_URL);
  url.searchParams.set("query", query);

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "neovara-homepage/2.0",
    },
    signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Prometheus query failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: { result?: Array<{ value?: [number, string] }> };
  };

  const rawValue = payload?.data?.result?.[0]?.value?.[1];
  if (rawValue === undefined) {
    return null;
  }

  const value = Number(rawValue);
  return Number.isFinite(value) ? value : null;
}

async function getMetrics() {
  const metricQueries = {
    cpuPercent:
      '100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])))',
    memoryPercent:
      "100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))",
    diskPercent:
      '100 * (1 - (node_filesystem_avail_bytes{mountpoint="/",fstype!~"tmpfs|overlay"} / node_filesystem_size_bytes{mountpoint="/",fstype!~"tmpfs|overlay"}))',
    uptimeSeconds: "node_time_seconds - node_boot_time_seconds",
    networkRxBps:
      'sum(rate(node_network_receive_bytes_total{device!~"lo|docker.*|veth.*"}[5m]))',
    networkTxBps:
      'sum(rate(node_network_transmit_bytes_total{device!~"lo|docker.*|veth.*"}[5m]))',
    containerCount: 'count(container_last_seen{name!=""})',
    gpuPercent: "avg(DCGM_FI_DEV_GPU_UTIL)",
  };

  const entries = Object.entries(metricQueries);
  const results = await Promise.allSettled(
    entries.map(([, query]) => queryPrometheus(query)),
  );

  return entries.reduce<Record<string, number | null>>((accumulator, [name], index) => {
    const result = results[index];
    accumulator[name] = result.status === "fulfilled" ? result.value : null;
    return accumulator;
  }, {});
}

function sanitizeError(error: unknown) {
  if (!error) {
    return "Unknown error";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  ) {
    return "Timed out";
  }

  if (typeof error === "object" && error !== null) {
    const withCode = error as {
      message?: string;
      code?: string;
      cause?: { code?: string };
    };
    return withCode.cause?.code || withCode.code || withCode.message || "Unknown error";
  }

  return String(error);
}

function sortServices(services: CheckedService[]) {
  return services.sort((left, right) => {
    const leftSectionRank = SECTION_ORDER.get(left.section) || 999;
    const rightSectionRank = SECTION_ORDER.get(right.section) || 999;

    if (leftSectionRank !== rightSectionRank) {
      return leftSectionRank - rightSectionRank;
    }

    if (left.active !== right.active) {
      return left.active ? -1 : 1;
    }

    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }

    return left.name.localeCompare(right.name);
  });
}

async function checkService(
  service: Omit<
    CheckedService,
    "active" | "state" | "statusCode" | "responseTimeMs" | "error"
  >,
): Promise<CheckedService> {
  const startedAt = Date.now();

  try {
    const response = await fetch(service.url, {
      redirect: "manual",
      signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
      headers: {
        accept: "text/html,application/json;q=0.9,*/*;q=0.1",
        "user-agent": "neovara-homepage/2.0",
      },
      cache: "no-store",
    });

    const statusCode = response.status;
    const active =
      (statusCode >= 200 && statusCode < 400) ||
      statusCode === 401 ||
      statusCode === 403;

    return {
      ...service,
      active,
      state: active ? "active" : "inactive",
      statusCode,
      responseTimeMs: Date.now() - startedAt,
      error: null,
    };
  } catch (error) {
    return {
      ...service,
      active: false,
      state: "inactive",
      statusCode: null,
      responseTimeMs: Date.now() - startedAt,
      error: sanitizeError(error),
    };
  }
}

async function buildOverview(): Promise<Overview> {
  const checkedServices = await Promise.all(
    buildServiceCatalog().map((service) => checkService(service)),
  );
  const services = sortServices(
    checkedServices.filter(
      (service) => !service.dynamic || service.active || service.statusCode !== 404,
    ),
  );
  const metrics = await getMetrics();
  const activeServices = services.filter((service) => service.active).length;
  const inactiveServices = services.length - activeServices;

  return {
    meta: {
      ownerName: OWNER_NAME,
      domain: DOMAIN,
      refreshedAt: new Date().toISOString(),
      cacheTtlMs: CACHE_TTL_MS,
    },
    summary: {
      totalServices: services.length,
      activeServices,
      inactiveServices,
    },
    metrics,
    services,
  };
}

export async function getOverview() {
  const now = Date.now();

  if (cacheState.data && now < cacheState.expiresAt) {
    return cacheState.data;
  }

  if (cacheState.pending) {
    return cacheState.pending;
  }

  cacheState.pending = buildOverview()
    .then((data) => {
      cacheState.data = data;
      cacheState.expiresAt = Date.now() + CACHE_TTL_MS;
      cacheState.pending = null;
      return data;
    })
    .catch((error) => {
      cacheState.pending = null;
      throw error;
    });

  return cacheState.pending;
}
