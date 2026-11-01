import { normalizeGroundedAIDecision, retainGroundedSources } from '../services/groundedAIVerification.js';

export async function runGroundedAIVerificationTests(): Promise<{ success: boolean; assertionsPassed: number; assertionsFailed: number; logs: string[] }> {
  const logs: string[] = [];
  let assertionsPassed = 0;
  let assertionsFailed = 0;
  const assert = (condition: boolean, description: string) => {
    if (condition) { assertionsPassed++; logs.push(`[PASS] ${description}`); }
    else { assertionsFailed++; logs.push(`[FAIL] ${description}`); }
  };

  const grounded = [
    { title: 'Official docket', url: 'https://court.example/case/42' },
    { title: 'Second source', url: 'https://registry.example/notice/42' },
  ];
  const retained = retainGroundedSources([
    { title: 'Official docket', url: 'https://court.example/case/42' },
    { title: 'Invented path', url: 'https://court.example/case/43' },
    { title: 'Unsafe scheme', url: 'javascript:alert(1)' },
    { title: 'Duplicate citation', url: 'https://court.example/case/42' },
  ], grounded);
  assert(retained.length === 1 && retained[0].url === 'https://court.example/case/42', 'Only exact HTTP(S) URLs returned by Google grounding are retained once');
  assert(normalizeGroundedAIDecision('VERIFIED', retained) === 'VERIFIED', 'A verification decision requires at least one grounded citation');
  assert(normalizeGroundedAIDecision('VERIFIED', []) === 'UNABLE_TO_CONFIRM', 'A model cannot mark an uncited claim verified');
  assert(normalizeGroundedAIDecision('ESCALATE_HUMAN', retained) === 'ESCALATE_HUMAN', 'Explicit material conflicts remain routed to human review');
  assert(normalizeGroundedAIDecision('UNEXPECTED', retained) === 'UNABLE_TO_CONFIRM', 'Unknown model decisions fail closed');

  return { success: assertionsFailed === 0, assertionsPassed, assertionsFailed, logs };
}
