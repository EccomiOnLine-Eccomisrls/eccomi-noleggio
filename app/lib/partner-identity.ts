export type PartnerIdentity = {
  name?: string | null;
  legalName?: string | null;
};

function normalize(value: string | null | undefined) {
  return (value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

export function isInternalEccomiPartner(partner: PartnerIdentity | null | undefined) {
  if (!partner) return false;

  // Esiste una sola struttura interna: il record ECCOMI / eccomi-direct.
  // La ragione sociale non deve trasformare altri Partner in strutture interne.
  return normalize(partner.name) === "ECCOMI";
}
