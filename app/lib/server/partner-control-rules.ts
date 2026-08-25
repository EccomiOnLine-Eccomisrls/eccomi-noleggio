export type PracticeSlaOwner = "ECCOMI" | "PARTNER" | "CLIENTE" | "NESSUNO";

export type PracticeSla = {
  hours: number;
  limitHours: number | null;
  stale: boolean;
  owner: PracticeSlaOwner;
  phase: string;
};

const CLOSED_STATUSES = new Set(["DELIVERED", "ARCHIVED"]);

const SLA_RULES: Record<string, { limitHours: number; owner: PracticeSlaOwner; phase: string }> = {
  NEW: { limitHours: 24, owner: "ECCOMI", phase: "Richiesta ricevuta" },
  ECCOMI_REVIEW: { limitHours: 24, owner: "ECCOMI", phase: "Verifica ECCOMI" },
  NEEDS_INFO: { limitHours: 72, owner: "CLIENTE", phase: "Integrazione richiesta" },
  SENT_TO_PARTNER: { limitHours: 4, owner: "PARTNER", phase: "Presa in carico partner" },
  PARTNER_REVIEW: { limitHours: 24, owner: "PARTNER", phase: "Lavorazione partner" },
  QUOTE: { limitHours: 48, owner: "PARTNER", phase: "Preventivo" },
  CONTRACT: { limitHours: 72, owner: "PARTNER", phase: "Contratto" },
};

export function hoursSince(value: string | null | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 3600000));
}

export function getPracticeSla(status: string, updatedAt: string, internalEccomi = false): PracticeSla {
  if (CLOSED_STATUSES.has(status)) {
    return {
      hours: hoursSince(updatedAt),
      limitHours: null,
      stale: false,
      owner: "NESSUNO",
      phase: "Conclusa",
    };
  }

  const rule = SLA_RULES[status] || { limitHours: 24, owner: "ECCOMI" as const, phase: "Operatività ECCOMI" };
  const owner = internalEccomi && rule.owner === "PARTNER" ? "ECCOMI" : rule.owner;
  const hours = hoursSince(updatedAt);
  return {
    hours,
    limitHours: rule.limitHours,
    stale: hours >= rule.limitHours,
    owner,
    phase: rule.phase,
  };
}

export function isClosedPractice(status: string) {
  return CLOSED_STATUSES.has(status);
}

export function isInternalEccomiPartner(name: string, legalName?: string | null) {
  const normalizedName = name.trim().toUpperCase();
  const normalizedLegalName = (legalName || "").trim().toUpperCase();
  return normalizedName === "ECCOMI" || normalizedLegalName === "ECCOMI SRLS" || normalizedLegalName === "ECCOMI S.R.L.S.";
}

export function internalSummaryHealth(input: {
  openPractices: number;
  lastActivityAt: string | null;
}) {
  if (input.openPractices <= 0) {
    return {
      health: "REGULAR" as const,
      reason: "Operatività interna sotto controllo",
      stalePractices: 0,
    };
  }

  const age = hoursSince(input.lastActivityAt);
  if (age >= 72) {
    return {
      health: "INTERVENTION" as const,
      reason: input.openPractices === 1
        ? `Pratica interna ferma da ${age} ore`
        : `${input.openPractices} pratiche interne da verificare · ultima attività ${age} ore fa`,
      stalePractices: input.openPractices,
    };
  }
  if (age >= 24) {
    return {
      health: "ATTENTION" as const,
      reason: input.openPractices === 1
        ? "Pratica interna ferma oltre 24 ore"
        : `${input.openPractices} pratiche interne da verificare`,
      stalePractices: input.openPractices,
    };
  }
  return {
    health: "REGULAR" as const,
    reason: "Operatività interna sotto controllo",
    stalePractices: 0,
  };
}
