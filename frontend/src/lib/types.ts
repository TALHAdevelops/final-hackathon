export type UserRole = "ADMIN" | "TECHNICIAN" | "SUPERVISOR" | "REPORTER";

export type AssetStatus =
  | "OPERATIONAL"
  | "ISSUE_REPORTED"
  | "UNDER_INSPECTION"
  | "UNDER_MAINTENANCE"
  | "OUT_OF_SERVICE"
  | "RETIRED";

export type IssueStatus =
  | "REPORTED"
  | "ASSIGNED"
  | "INSPECTION_STARTED"
  | "MAINTENANCE_IN_PROGRESS"
  | "WAITING_FOR_PARTS"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED";

export type IssuePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResult {
  accessToken: string;
  user: AuthUser;
}

export interface Asset {
  id: string;
  code: string;
  publicId: string;
  name: string;
  category: string;
  location: string;
  condition?: string | null;
  status: AssetStatus;
  description?: string | null;
  lastServiceDate?: string | null;
  nextServiceDate?: string | null;
  createdAt: string;
  updatedAt: string;
  issues?: Issue[];
}

export interface Issue {
  id: string;
  number: string;
  assetId: string;
  title: string;
  description: string;
  category?: string | null;
  priority: IssuePriority;
  status: IssueStatus;
  reporterName?: string | null;
  reporterContact?: string | null;
  assignedTechnicianId?: string | null;
  aiSuggested?: TriageResult | null;
  aiEdited?: boolean;
  createdAt: string;
  updatedAt: string;
  asset?: Pick<Asset, "id" | "code" | "name" | "location">;
  assignedTechnician?: { id: string; name: string; email?: string } | null;
  maintenanceRecords?: MaintenanceRecord[];
}

export interface MaintenanceRecord {
  id: string;
  issueId: string;
  technicianId: string;
  notes: string;
  partsReplaced?: unknown;
  cost?: string | number | null;
  timeSpent?: number | null;
  finalCondition?: string | null;
  completedAt?: string | null;
  createdAt: string;
  technician?: { id: string; name: string };
}

export interface HistoryEvent {
  id: string;
  assetId: string;
  action: string;
  actorId?: string | null;
  detail?: Record<string, unknown> | null;
  relatedIssueId?: string | null;
  createdAt: string;
  actor?: { id: string; name: string; role: string } | null;
}

export interface TriageResult {
  title: string;
  category: string;
  priority: IssuePriority;
  possibleCauses: string[];
  initialChecks: string[];
  recurringWarning?: string | null;
  source: "ai" | "fallback";
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export interface PublicAsset {
  publicId: string;
  code: string;
  name: string;
  category: string;
  location: string;
  condition?: string | null;
  status: AssetStatus;
  lastServiceDate?: string | null;
  nextServiceDate?: string | null;
  isRetired: boolean;
  canReportIssue: boolean;
  recentActivity: { action: string; createdAt: string }[];
}

export interface DashboardSummary {
  assets: {
    total: number;
    byStatus: Record<string, number>;
    dueService: number;
  };
  issues: {
    total: number;
    open: number;
    criticalOpen: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
  };
  recentIssues: Array<
    Pick<Issue, "number" | "title" | "status" | "priority" | "createdAt"> & {
      asset: { code: string; name: string };
    }
  >;
}
