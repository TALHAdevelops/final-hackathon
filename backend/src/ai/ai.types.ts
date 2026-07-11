import { IssuePriority } from '@prisma/client';

export interface TriageResult {
  title: string;
  category: string;
  priority: IssuePriority;
  possibleCauses: string[];
  initialChecks: string[];
  recurringWarning?: string | null;
  // Provenance so the UI can flag AI-suggested values and the DB can store them.
  source: 'ai' | 'fallback';
}

export interface AssetTriageContext {
  name: string;
  category: string;
  location: string;
  condition?: string | null;
  status: string;
  recentIssueTitles: string[];
}
