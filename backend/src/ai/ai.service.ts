import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IssuePriority } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GrokService } from './grok.service';
import { AssetTriageContext, TriageResult } from './ai.types';

const SYSTEM_PROMPT = `You are a professional facility-maintenance triage assistant.
Given an asset's context and a user's natural-language complaint, produce a
structured, professional issue triage.

Rules:
- Respond with a SINGLE valid JSON object, no markdown, matching exactly:
  {
    "title": string,               // concise professional issue title
    "category": string,            // e.g. "Leakage / Performance"
    "priority": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL",
    "possibleCauses": string[],    // 2-5 plausible causes
    "initialChecks": string[],     // 2-5 SAFE initial diagnostic checks
    "recurringWarning": string|null // note if the recent history suggests a recurring pattern, else null
  }
- Safety first: never give unsafe instructions for electrical, mechanical, fire,
  medical, or industrial hazards. For any such risk, advise powering down and
  calling a qualified technician.
- If the complaint indicates a safety hazard, set priority to HIGH or CRITICAL.
- Keep everything concise and factual.`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly grok: GrokService,
  ) {}

  async triageForPublicAsset(
    publicId: string,
    complaint: string,
  ): Promise<TriageResult> {
    const asset = await this.prisma.asset.findUnique({
      where: { publicId },
      select: {
        id: true,
        name: true,
        category: true,
        location: true,
        condition: true,
        status: true,
      },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    const recentIssues = await this.prisma.issue.findMany({
      where: { assetId: asset.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { title: true },
    });

    const context: AssetTriageContext = {
      name: asset.name,
      category: asset.category,
      location: asset.location,
      condition: asset.condition,
      status: asset.status,
      recentIssueTitles: recentIssues.map((i) => i.title),
    };

    return this.triage(context, complaint);
  }

  async triage(
    context: AssetTriageContext,
    complaint: string,
  ): Promise<TriageResult> {
    if (!this.grok.isConfigured()) {
      return this.fallback(complaint);
    }

    const userPrompt = this.buildUserPrompt(context, complaint);
    try {
      const raw = await this.grok.completeJson(SYSTEM_PROMPT, userPrompt);
      const parsed = this.validate(raw);
      return { ...parsed, source: 'ai' };
    } catch (err) {
      this.logger.warn(
        `AI triage failed, using fallback: ${(err as Error).message}`,
      );
      return this.fallback(complaint);
    }
  }

  private buildUserPrompt(
    ctx: AssetTriageContext,
    complaint: string,
  ): string {
    return [
      'ASSET CONTEXT:',
      `- Name: ${ctx.name}`,
      `- Type/Category: ${ctx.category}`,
      `- Location: ${ctx.location}`,
      `- Condition: ${ctx.condition ?? 'unknown'}`,
      `- Current status: ${ctx.status}`,
      ctx.recentIssueTitles.length
        ? `- Recent issues: ${ctx.recentIssueTitles.join('; ')}`
        : '- Recent issues: none',
      '',
      'USER COMPLAINT:',
      complaint,
      '',
      'Return the triage JSON now.',
    ].join('\n');
  }

  /** Validate + coerce the model output into a safe TriageResult. */
  private validate(raw: string): Omit<TriageResult, 'source'> {
    let obj: Record<string, unknown>;
    try {
      // Strip accidental code fences if present.
      const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '');
      obj = JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      throw new Error('AI returned non-JSON output');
    }

    const priority = this.coercePriority(obj.priority);
    const asArray = (v: unknown): string[] =>
      Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean).slice(0, 5) : [];

    const title = typeof obj.title === 'string' ? obj.title.trim() : '';
    if (!title) throw new Error('AI output missing title');

    return {
      title: title.slice(0, 140),
      category:
        typeof obj.category === 'string' && obj.category.trim()
          ? obj.category.trim().slice(0, 80)
          : 'General',
      priority,
      possibleCauses: asArray(obj.possibleCauses),
      initialChecks: asArray(obj.initialChecks),
      recurringWarning:
        typeof obj.recurringWarning === 'string' && obj.recurringWarning.trim()
          ? obj.recurringWarning.trim()
          : null,
    };
  }

  private coercePriority(v: unknown): IssuePriority {
    const s = String(v).toUpperCase();
    if (s in IssuePriority) return IssuePriority[s as keyof typeof IssuePriority];
    return IssuePriority.MEDIUM;
  }

  /**
   * Heuristic fallback used when the AI service is unconfigured or unavailable,
   * so issue reporting never blocks on the AI. Marked source: 'fallback'.
   */
  private fallback(complaint: string): TriageResult {
    const text = complaint.toLowerCase();
    const hazard =
      /spark|smoke|fire|burn|shock|gas leak|electric|exposed wire/.test(text);
    const urgent = /leak|flood|not working|down|stopped|broken|noise/.test(text);

    const priority = hazard
      ? IssuePriority.CRITICAL
      : urgent
        ? IssuePriority.HIGH
        : IssuePriority.MEDIUM;

    const title =
      complaint.trim().split(/[.!?\n]/)[0].slice(0, 80) || 'Reported issue';

    return {
      title: title.charAt(0).toUpperCase() + title.slice(1),
      category: 'General',
      priority,
      possibleCauses: [],
      initialChecks: hazard
        ? [
            'Do not touch the equipment if there is any electrical or fire risk.',
            'Power down the area if safe to do so and call a qualified technician.',
          ]
        : ['Inspect the asset visually for obvious faults.'],
      recurringWarning: null,
      source: 'fallback',
    };
  }
}
