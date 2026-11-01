export interface GroundedWebSource {
  title: string;
  url: string;
}

export type GroundedAIDecision = 'VERIFIED' | 'ESCALATE_HUMAN' | 'UNABLE_TO_CONFIRM';

export function retainGroundedSources(
  proposed: Array<{ title?: string; url?: string }>,
  grounded: GroundedWebSource[]
): GroundedWebSource[] {
  const groundedByUrl = new Map(grounded.flatMap((source) => {
    try {
      const url = new URL(source.url);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return [];
      return [[url.toString(), { title: source.title, url: url.toString() }] as const];
    } catch {
      return [];
    }
  }));
  const retained = new Map<string, GroundedWebSource>();
  for (const citation of proposed) {
    try {
      const url = new URL(citation.url || '');
      if (url.protocol !== 'https:' && url.protocol !== 'http:') continue;
      const source = groundedByUrl.get(url.toString());
      if (source) retained.set(source.url, source);
    } catch {
      // Malformed model citations never become clickable sources.
    }
  }
  return [...retained.values()];
}

export function normalizeGroundedAIDecision(
  decision: string | undefined,
  sources: GroundedWebSource[]
): GroundedAIDecision {
  if (decision === 'ESCALATE_HUMAN') return 'ESCALATE_HUMAN';
  if (decision === 'VERIFIED' && sources.length > 0) return 'VERIFIED';
  return 'UNABLE_TO_CONFIRM';
}
