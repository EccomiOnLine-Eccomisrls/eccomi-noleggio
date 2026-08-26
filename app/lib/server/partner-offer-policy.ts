export type PartnerOfferAction = "SUSPEND" | "ARCHIVE" | "EXTEND";

const onlineStatuses = new Set(["ONLINE", "ACTIVE", "EXPIRING"]);
const extendableStatuses = new Set(["ONLINE", "ACTIVE", "EXPIRING", "EXPIRED", "SUSPENDED"]);

export function partnerOfferStatusLabel(status: string) {
  return ({
    DRAFT: "BOZZA",
    PENDING_APPROVAL: "IN VERIFICA ECCOMI",
    APPROVED: "APPROVATA ECCOMI",
    ONLINE: "PUBBLICATA",
    ACTIVE: "PUBBLICATA",
    EXPIRING: "IN SCADENZA",
    EXPIRED: "SCADUTA",
    SUSPENDED: "SOSPESA",
    ARCHIVED: "ARCHIVIATA",
    TRASHED: "ARCHIVIATA",
  } as Record<string, string>)[status] || status.replaceAll("_", " ");
}

export function partnerCanManageOffer(status: string, action: PartnerOfferAction) {
  if (action === "SUSPEND") return onlineStatuses.has(status);
  if (action === "ARCHIVE") return !["ARCHIVED", "TRASHED"].includes(status);
  return extendableStatuses.has(status);
}

export function statusAfterPartnerExtension(input: {
  currentStatus: string;
  remainingDays: number;
  hasShopifyProduct: boolean;
}) {
  if (input.currentStatus === "SUSPENDED") return "SUSPENDED";
  if (input.currentStatus === "EXPIRED" && !input.hasShopifyProduct) return "PENDING_APPROVAL";
  return input.remainingDays <= 7 ? "EXPIRING" : "ONLINE";
}
