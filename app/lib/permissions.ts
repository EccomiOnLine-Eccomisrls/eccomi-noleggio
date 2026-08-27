export const NOLEGGIO_ROLES = [
  "CEO",
  "NOLEGGIO_MANAGER",
  "NOLEGGIO_DEPUTY",
  "NOLEGGIO_OPERATOR",
  "PARTNER_ADMIN",
  "PARTNER",
] as const;

export type NoleggioRole = (typeof NOLEGGIO_ROLES)[number];

export const NOLEGGIO_PERMISSIONS = [
  "NOLEGGIO_VIEW_ALL",
  "NOLEGGIO_MANAGE_ACCOUNTS",
  "NOLEGGIO_MANAGE_ROLE_GRANTS",
  "NOLEGGIO_MANAGE_OPERATOR_GRANTS",
  "NOLEGGIO_PROPOSE_OPERATOR",
  "NOLEGGIO_APPROVE_OPERATOR",
  "PARTNER_ACTIVATE_ANY",
  "PARTNER_MANAGE_OWN_USERS",
  "QUOTE_CREATE_OWN",
  "QUOTE_VIEW_ALL",
  "QUOTE_VERIFY",
  "QUOTE_APPROVE",
  "QUOTE_PUBLISH",
  "QUOTE_SUSPEND_ANY",
  "QUOTE_ARCHIVE_ANY",
  "QUOTE_RESTORE_ARCHIVED_ANY",
  "QUOTE_SUSPEND_OWN",
  "QUOTE_ARCHIVE_OWN",
  "QUOTE_REACTIVATE_OWN",
  "QUOTE_EXTEND_OWN",
  "PRACTICE_VIEW_ALL",
  "PRACTICE_WORK_ALL",
  "PRACTICE_VIEW_OWN",
  "PRACTICE_WORK_OWN",
  "PRACTICE_REASSIGN_RED",
  "DOCUMENT_VIEW_ALL",
  "DOCUMENT_MANAGE_ALL",
  "DOCUMENT_VIEW_OWN",
  "DOCUMENT_REPLACE_OWN",
  "DOCUMENT_REMOVE_OWN",
  "COMMISSION_VIEW_ALL",
  "COMMISSION_VIEW_OWN",
  "COMMISSION_EDIT_ANY",
  "COMMISSION_SET_ECCOMI",
] as const;

export type NoleggioPermission = (typeof NOLEGGIO_PERMISSIONS)[number];

export type PermissionOverride = {
  permission: string;
  enabled: boolean;
};

export const SENSITIVE_DELEGABLE_PERMISSIONS = [
  "QUOTE_APPROVE",
  "QUOTE_PUBLISH",
  "COMMISSION_SET_ECCOMI",
] as const satisfies readonly NoleggioPermission[];

export const ORDINARY_OPERATOR_DELEGABLE_PERMISSIONS = [
  "QUOTE_VERIFY",
  "PRACTICE_WORK_ALL",
  "DOCUMENT_VIEW_ALL",
  "DOCUMENT_MANAGE_ALL",
] as const satisfies readonly NoleggioPermission[];

export const CEO_GRANTABLE_INTERNAL_PERMISSIONS = [
  "NOLEGGIO_VIEW_ALL",
  "NOLEGGIO_MANAGE_OPERATOR_GRANTS",
  "NOLEGGIO_PROPOSE_OPERATOR",
  "PARTNER_ACTIVATE_ANY",
  "QUOTE_CREATE_OWN",
  "QUOTE_VIEW_ALL",
  "QUOTE_VERIFY",
  "QUOTE_APPROVE",
  "QUOTE_PUBLISH",
  "QUOTE_SUSPEND_ANY",
  "QUOTE_ARCHIVE_ANY",
  "QUOTE_RESTORE_ARCHIVED_ANY",
  "PRACTICE_VIEW_ALL",
  "PRACTICE_WORK_ALL",
  "PRACTICE_REASSIGN_RED",
  "DOCUMENT_VIEW_ALL",
  "DOCUMENT_MANAGE_ALL",
  "COMMISSION_VIEW_ALL",
  "COMMISSION_SET_ECCOMI",
] as const satisfies readonly NoleggioPermission[];

const BASE_PERMISSIONS: Record<NoleggioRole, readonly NoleggioPermission[]> = {
  CEO: NOLEGGIO_PERMISSIONS,
  NOLEGGIO_MANAGER: [
    "NOLEGGIO_VIEW_ALL",
    "NOLEGGIO_MANAGE_OPERATOR_GRANTS",
    "NOLEGGIO_PROPOSE_OPERATOR",
    "PARTNER_ACTIVATE_ANY",
    "QUOTE_CREATE_OWN",
    "QUOTE_VIEW_ALL",
    "QUOTE_VERIFY",
    "QUOTE_SUSPEND_ANY",
    "QUOTE_ARCHIVE_ANY",
    "QUOTE_RESTORE_ARCHIVED_ANY",
    "PRACTICE_VIEW_ALL",
    "PRACTICE_WORK_ALL",
    "PRACTICE_REASSIGN_RED",
    "DOCUMENT_VIEW_ALL",
    "DOCUMENT_MANAGE_ALL",
    "COMMISSION_VIEW_ALL",
  ],
  NOLEGGIO_DEPUTY: [
    "QUOTE_VIEW_ALL",
    "PRACTICE_VIEW_ALL",
    "DOCUMENT_VIEW_ALL",
  ],
  NOLEGGIO_OPERATOR: [
    "NOLEGGIO_VIEW_ALL",
    "QUOTE_CREATE_OWN",
    "QUOTE_VIEW_ALL",
    "QUOTE_VERIFY",
    "PRACTICE_VIEW_ALL",
    "DOCUMENT_VIEW_ALL",
  ],
  PARTNER_ADMIN: [
    "PARTNER_MANAGE_OWN_USERS",
    "QUOTE_CREATE_OWN",
    "QUOTE_SUSPEND_OWN",
    "QUOTE_ARCHIVE_OWN",
    "QUOTE_REACTIVATE_OWN",
    "QUOTE_EXTEND_OWN",
    "PRACTICE_VIEW_OWN",
    "PRACTICE_WORK_OWN",
    "DOCUMENT_VIEW_OWN",
    "DOCUMENT_REPLACE_OWN",
    "DOCUMENT_REMOVE_OWN",
    "COMMISSION_VIEW_OWN",
  ],
  PARTNER: [
    "QUOTE_CREATE_OWN",
    "QUOTE_SUSPEND_OWN",
    "QUOTE_ARCHIVE_OWN",
    "QUOTE_REACTIVATE_OWN",
    "QUOTE_EXTEND_OWN",
    "PRACTICE_VIEW_OWN",
    "PRACTICE_WORK_OWN",
    "DOCUMENT_VIEW_OWN",
    "DOCUMENT_REPLACE_OWN",
    "DOCUMENT_REMOVE_OWN",
    "COMMISSION_VIEW_OWN",
  ],
};

export function isNoleggioRole(value: string): value is NoleggioRole {
  return (NOLEGGIO_ROLES as readonly string[]).includes(value);
}

export function isInternalNoleggioRole(role: NoleggioRole) {
  return role === "CEO" || role === "NOLEGGIO_MANAGER" || role === "NOLEGGIO_DEPUTY" || role === "NOLEGGIO_OPERATOR";
}

export function isPartnerNoleggioRole(role: NoleggioRole) {
  return role === "PARTNER_ADMIN" || role === "PARTNER";
}

export function basePermissionsForRole(role: NoleggioRole): readonly NoleggioPermission[] {
  return BASE_PERMISSIONS[role];
}

export function resolvePermissions(
  role: NoleggioRole,
  overrides: readonly PermissionOverride[] = [],
): Set<NoleggioPermission> {
  const resolved = new Set<NoleggioPermission>(BASE_PERMISSIONS[role]);
  for (const override of overrides) {
    if (!(NOLEGGIO_PERMISSIONS as readonly string[]).includes(override.permission)) continue;
    const permission = override.permission as NoleggioPermission;
    if (override.enabled) resolved.add(permission);
    else resolved.delete(permission);
  }
  return resolved;
}

export function hasPermission(
  role: NoleggioRole,
  permission: NoleggioPermission,
  overrides: readonly PermissionOverride[] = [],
) {
  return resolvePermissions(role, overrides).has(permission);
}

export function canCeoGrantPermission(
  targetRole: NoleggioRole,
  permission: NoleggioPermission,
) {
  if (targetRole === "CEO" || isPartnerNoleggioRole(targetRole)) return false;
  if (permission === "COMMISSION_SET_ECCOMI") {
    return targetRole === "NOLEGGIO_MANAGER" || targetRole === "NOLEGGIO_DEPUTY";
  }
  return (CEO_GRANTABLE_INTERNAL_PERMISSIONS as readonly NoleggioPermission[]).includes(permission);
}

export function canManagerManageOperatorPermission(
  targetRole: NoleggioRole,
  permission: NoleggioPermission,
) {
  if (targetRole !== "NOLEGGIO_OPERATOR") return false;
  return (ORDINARY_OPERATOR_DELEGABLE_PERMISSIONS as readonly NoleggioPermission[]).includes(permission);
}

export function canAccessPartnerScope(input: {
  role: NoleggioRole;
  actorPartnerId: string | null;
  entityPartnerId: string | null;
}) {
  if (isInternalNoleggioRole(input.role)) return true;
  return Boolean(
    isPartnerNoleggioRole(input.role)
      && input.actorPartnerId
      && input.entityPartnerId
      && input.actorPartnerId === input.entityPartnerId,
  );
}
