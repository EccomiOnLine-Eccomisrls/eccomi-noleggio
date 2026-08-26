export const NOLEGGIO_ROLES = [
  "CEO",
  "NOLEGGIO_MANAGER",
  "NOLEGGIO_DEPUTY",
  "NOLEGGIO_OPERATOR",
  "PARTNER",
] as const;

export type NoleggioRole = (typeof NOLEGGIO_ROLES)[number];

export const NOLEGGIO_PERMISSIONS = [
  "NOLEGGIO_VIEW_ALL",
  "NOLEGGIO_MANAGE_ACCOUNTS",
  "NOLEGGIO_MANAGE_ROLE_GRANTS",
  "QUOTE_CREATE_OWN",
  "QUOTE_VIEW_ALL",
  "QUOTE_VERIFY",
  "QUOTE_APPROVE",
  "QUOTE_PUBLISH",
  "QUOTE_SUSPEND_ANY",
  "QUOTE_ARCHIVE_ANY",
  "QUOTE_SUSPEND_OWN",
  "QUOTE_ARCHIVE_OWN",
  "QUOTE_EXTEND_OWN",
  "PRACTICE_VIEW_ALL",
  "PRACTICE_VIEW_OWN",
  "PRACTICE_WORK_OWN",
  "PRACTICE_REASSIGN_RED",
  "COMMISSION_VIEW_ALL",
  "COMMISSION_VIEW_OWN",
] as const;

export type NoleggioPermission = (typeof NOLEGGIO_PERMISSIONS)[number];

export const DELEGABLE_PERMISSIONS = [
  "QUOTE_APPROVE",
  "QUOTE_PUBLISH",
] as const satisfies readonly NoleggioPermission[];

const BASE_PERMISSIONS: Record<NoleggioRole, readonly NoleggioPermission[]> = {
  CEO: NOLEGGIO_PERMISSIONS,
  NOLEGGIO_MANAGER: [
    "NOLEGGIO_VIEW_ALL",
    "QUOTE_CREATE_OWN",
    "QUOTE_VIEW_ALL",
    "QUOTE_VERIFY",
    "QUOTE_SUSPEND_ANY",
    "QUOTE_ARCHIVE_ANY",
    "PRACTICE_VIEW_ALL",
    "PRACTICE_REASSIGN_RED",
    "COMMISSION_VIEW_ALL",
  ],
  NOLEGGIO_DEPUTY: [
    "NOLEGGIO_VIEW_ALL",
    "QUOTE_CREATE_OWN",
    "QUOTE_VIEW_ALL",
    "QUOTE_VERIFY",
    "QUOTE_SUSPEND_ANY",
    "QUOTE_ARCHIVE_ANY",
    "PRACTICE_VIEW_ALL",
    "PRACTICE_REASSIGN_RED",
    "COMMISSION_VIEW_ALL",
  ],
  NOLEGGIO_OPERATOR: [
    "NOLEGGIO_VIEW_ALL",
    "QUOTE_CREATE_OWN",
    "QUOTE_VIEW_ALL",
    "QUOTE_VERIFY",
    "PRACTICE_VIEW_ALL",
  ],
  PARTNER: [
    "QUOTE_CREATE_OWN",
    "QUOTE_SUSPEND_OWN",
    "QUOTE_ARCHIVE_OWN",
    "QUOTE_EXTEND_OWN",
    "PRACTICE_VIEW_OWN",
    "PRACTICE_WORK_OWN",
    "COMMISSION_VIEW_OWN",
  ],
};

export function isNoleggioRole(value: string): value is NoleggioRole {
  return (NOLEGGIO_ROLES as readonly string[]).includes(value);
}

export function isInternalNoleggioRole(role: NoleggioRole) {
  return role === "CEO" || role === "NOLEGGIO_MANAGER" || role === "NOLEGGIO_DEPUTY" || role === "NOLEGGIO_OPERATOR";
}

export function basePermissionsForRole(role: NoleggioRole): readonly NoleggioPermission[] {
  return BASE_PERMISSIONS[role];
}

export function resolvePermissions(
  role: NoleggioRole,
  explicitGrants: readonly string[] = [],
): Set<NoleggioPermission> {
  const resolved = new Set<NoleggioPermission>(BASE_PERMISSIONS[role]);
  for (const grant of explicitGrants) {
    if ((NOLEGGIO_PERMISSIONS as readonly string[]).includes(grant)) {
      resolved.add(grant as NoleggioPermission);
    }
  }
  return resolved;
}

export function hasPermission(
  role: NoleggioRole,
  permission: NoleggioPermission,
  explicitGrants: readonly string[] = [],
) {
  return resolvePermissions(role, explicitGrants).has(permission);
}

export function canCeoGrantPermission(
  targetRole: NoleggioRole,
  permission: NoleggioPermission,
) {
  if (targetRole === "CEO" || targetRole === "PARTNER") return false;
  return (DELEGABLE_PERMISSIONS as readonly NoleggioPermission[]).includes(permission);
}

export function canAccessPartnerScope(input: {
  role: NoleggioRole;
  actorPartnerId: string | null;
  entityPartnerId: string | null;
}) {
  if (isInternalNoleggioRole(input.role)) return true;
  return Boolean(
    input.actorPartnerId
      && input.entityPartnerId
      && input.actorPartnerId === input.entityPartnerId,
  );
}
