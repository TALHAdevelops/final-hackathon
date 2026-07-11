import { AssetStatus, IssueStatus } from '@prisma/client';

/**
 * Allowed issue status transitions. Any transition not listed here is rejected
 * to prevent invalid workflow jumps (e.g. REPORTED -> RESOLVED).
 */
export const ISSUE_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  [IssueStatus.REPORTED]: [IssueStatus.ASSIGNED],
  [IssueStatus.ASSIGNED]: [IssueStatus.INSPECTION_STARTED],
  [IssueStatus.INSPECTION_STARTED]: [
    IssueStatus.MAINTENANCE_IN_PROGRESS,
    IssueStatus.WAITING_FOR_PARTS,
  ],
  [IssueStatus.MAINTENANCE_IN_PROGRESS]: [
    IssueStatus.WAITING_FOR_PARTS,
    IssueStatus.RESOLVED,
  ],
  [IssueStatus.WAITING_FOR_PARTS]: [IssueStatus.MAINTENANCE_IN_PROGRESS],
  [IssueStatus.RESOLVED]: [IssueStatus.CLOSED, IssueStatus.REOPENED],
  [IssueStatus.CLOSED]: [IssueStatus.REOPENED],
  [IssueStatus.REOPENED]: [
    IssueStatus.INSPECTION_STARTED,
    IssueStatus.MAINTENANCE_IN_PROGRESS,
  ],
};

export function canTransition(from: IssueStatus, to: IssueStatus): boolean {
  return ISSUE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Map an issue status to the asset status it should drive. Returns null when
 * the issue status does not by itself dictate an asset status (asset stays).
 */
export function assetStatusForIssue(
  issueStatus: IssueStatus,
): AssetStatus | null {
  switch (issueStatus) {
    case IssueStatus.INSPECTION_STARTED:
      return AssetStatus.UNDER_INSPECTION;
    case IssueStatus.MAINTENANCE_IN_PROGRESS:
    case IssueStatus.WAITING_FOR_PARTS:
      return AssetStatus.UNDER_MAINTENANCE;
    case IssueStatus.REOPENED:
      return AssetStatus.ISSUE_REPORTED;
    default:
      return null;
  }
}

// Transitions that must go through dedicated endpoints (not the generic one).
export const DEDICATED_TRANSITIONS: IssueStatus[] = [
  IssueStatus.ASSIGNED, // via /assign
  IssueStatus.RESOLVED, // via /resolve (requires maintenance note)
  IssueStatus.CLOSED, // via /close
  IssueStatus.REOPENED, // via /reopen
];
