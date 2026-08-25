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

  const name = normalize(partner.name);
  const legalName = normalize(partner.legalName);

  return name === "ECCOMI"
    || name.startsWith("ECCOMI ")
    || legalName === "ECCOMI SRLS"
    || legalName.startsWith("ECCOMI SRLS ");
}
