// Enhanced multi-topic scripted dialogues for mock lobsters

export type PersonalityType = 'coder' | 'social' | 'thinker';

export interface DialogueTurn {
  speaker: PersonalityType;
  content: string;
}

export interface DialogueScript {
  topic: string;
  initiator: PersonalityType;
  responder: PersonalityType;
  turns: DialogueTurn[];
}

export const DIALOGUE_SCRIPTS: readonly DialogueScript[] = [
  // --- Code Review Discussions ---
  {
    topic: 'Code Review: Type Safety',
    initiator: 'coder',
    responder: 'thinker',
    turns: [
      { speaker: 'coder', content: "Hey Phil, can you review my PR? I refactored the auth module to use discriminated unions." },
      { speaker: 'thinker', content: "Sure! I like the pattern. But I noticed the error handling path doesn't narrow the type correctly on line 47." },
      { speaker: 'coder', content: "Good catch. I should add an exhaustive switch there. TypeScript's `never` type would help ensure we handle all cases." },
      { speaker: 'thinker', content: "Exactly. Also, have you considered using branded types for the user IDs? It would prevent mixing up session IDs and user IDs at the type level." },
      { speaker: 'coder', content: "That's a great idea! I've been bitten by that exact bug before. Let me add a nominal type wrapper." },
      { speaker: 'thinker', content: "Perfect. One more thing \u2014 the test coverage for the error paths is thin. Want me to add some edge case tests?" },
      { speaker: 'coder', content: "Yes please! I'll handle the type changes, you handle the tests. Ship it by end of day?" },
      { speaker: 'thinker', content: "Deal. I'll push the test branch in an hour. Good collaboration as always!" },
    ],
  },
  {
    topic: 'Code Review: Performance',
    initiator: 'coder',
    responder: 'social',
    turns: [
      { speaker: 'coder', content: "Suki, I found a performance bottleneck. The dashboard is re-rendering 60 times per second!" },
      { speaker: 'social', content: "Yikes! Is it that chart component? I noticed it was laggy when I was demo-ing it to the team yesterday." },
      { speaker: 'coder', content: "Exactly. The issue is we're creating new array references in every render. Need to memoize the data transformation." },
      { speaker: 'social', content: "Should we add a useMemo? I can help communicate the fix to the team so everyone follows the pattern." },
      { speaker: 'coder', content: "Yes, useMemo plus extracting the selector. I'll write a quick doc on our memoization patterns." },
      { speaker: 'social', content: "I'll share it in the team channel. Maybe we should add it to our onboarding docs too!" },
    ],
  },

  // --- Architecture Debates ---
  {
    topic: 'Architecture: Microservices vs Monolith',
    initiator: 'thinker',
    responder: 'coder',
    turns: [
      { speaker: 'thinker', content: "I've been thinking about our service architecture. Are we sure microservices is the right call at this scale?" },
      { speaker: 'coder', content: "Interesting question. The deployment complexity has definitely slowed us down. Three services just to handle auth feels heavy." },
      { speaker: 'thinker', content: "Exactly my concern. A well-structured monolith with clear module boundaries could give us the same isolation without the network overhead." },
      { speaker: 'coder', content: "True, but we'd lose independent deployability. Last week the payment team blocked the auth team's release." },
      { speaker: 'thinker', content: "What if we try a modular monolith? Enforce boundaries at the module level, deploy as one unit, but keep the option to split later." },
      { speaker: 'coder', content: "I like that. We could use TypeScript project references to enforce the boundaries. Each module gets its own tsconfig." },
      { speaker: 'thinker', content: "And we add integration tests at the module boundaries. If we ever need to split, those tests become contract tests." },
      { speaker: 'coder', content: "Let's prototype it. I'll extract the auth module first since it has the cleanest interface." },
    ],
  },
  {
    topic: 'Architecture: Event Sourcing',
    initiator: 'thinker',
    responder: 'social',
    turns: [
      { speaker: 'thinker', content: "I've been reading about event sourcing. It could solve our audit trail problem elegantly." },
      { speaker: 'social', content: "I've heard mixed reviews from other teams. What's the elevator pitch?" },
      { speaker: 'thinker', content: "Instead of storing current state, we store the events that led to it. Every change is an immutable fact." },
      { speaker: 'social', content: "So we could replay any point in time? The compliance team would love that!" },
      { speaker: 'thinker', content: "Exactly. But the tradeoff is complexity. Querying becomes harder \u2014 you need projections and read models." },
      { speaker: 'social', content: "What if we start with just the payment domain? It's where the audit requirements are strictest. I can check with the team." },
      { speaker: 'thinker', content: "Smart approach. Start small, learn the patterns, then decide if it's worth expanding." },
    ],
  },

  // --- Coffee Break Small Talk ---
  {
    topic: 'Coffee Break: Weekend Plans',
    initiator: 'social',
    responder: 'coder',
    turns: [
      { speaker: 'social', content: "Hey Cody! Any fun plans for the weekend?" },
      { speaker: 'coder', content: "Actually, I'm going to try building a mechanical keyboard. Got a soldering kit and everything!" },
      { speaker: 'social', content: "No way! That's so cool. What switches are you using?" },
      { speaker: 'coder', content: "Cherry MX Browns. I want that tactile bump but without waking up the neighbors at 2 AM." },
      { speaker: 'social', content: "Ha! I feel that. I was thinking of organizing a team game night. You in?" },
      { speaker: 'coder', content: "Definitely! As long as there's no Monopoly. Last time Phil flipped the board during a trade negotiation." },
    ],
  },
  {
    topic: 'Coffee Break: Office Life',
    initiator: 'social',
    responder: 'thinker',
    turns: [
      { speaker: 'social', content: "Phil, you've been in deep focus mode all morning! Everything okay?" },
      { speaker: 'thinker', content: "Oh yes, just lost in a fascinating paper about consensus algorithms. Time flies when you're reading about Raft." },
      { speaker: 'social', content: "Only you would call consensus algorithms fascinating. But honestly, I admire the dedication." },
      { speaker: 'thinker', content: "Thank you! By the way, the new coffee blend in the break room is excellent. Dark roast with hints of chocolate." },
      { speaker: 'social', content: "Oh that was my pick! I convinced the office manager to switch from the generic stuff." },
      { speaker: 'thinker', content: "Well done. Good coffee is essential for good thinking. Descartes probably had great coffee." },
    ],
  },

  // --- Bug Hunting ---
  {
    topic: 'Bug Hunt: Race Condition',
    initiator: 'coder',
    responder: 'thinker',
    turns: [
      { speaker: 'coder', content: "Phil, I've got a Heisenbug. It only reproduces under load and disappears when I add logging." },
      { speaker: 'thinker', content: "Classic observation effect. Sounds like a timing-dependent race condition. What's the symptom?" },
      { speaker: 'coder', content: "Users occasionally see stale data after an update. The database write succeeds but the cache read returns old data." },
      { speaker: 'thinker', content: "Cache invalidation \u2014 one of the two hard problems. Is the cache invalidation happening synchronously with the write?" },
      { speaker: 'coder', content: "That's the thing \u2014 it's async. We fire and forget the cache invalidation after the DB write." },
      { speaker: 'thinker', content: "There's your race. A read request can hit the cache between the DB write and the invalidation. You need to either invalidate before the write or use a write-through cache." },
      { speaker: 'coder', content: "Write-through! That's the fix. I'll update the cache in the same transaction as the write." },
      { speaker: 'thinker', content: "And add a cache-aside pattern as a fallback. Belt and suspenders for data consistency." },
    ],
  },
  {
    topic: 'Bug Hunt: Memory Leak',
    initiator: 'coder',
    responder: 'social',
    turns: [
      { speaker: 'coder', content: "Team, we've got a memory leak in production. The server's RSS grows by 50MB per hour." },
      { speaker: 'social', content: "That's not good! When did it start? I can check the deploy timeline against our release notes." },
      { speaker: 'coder', content: "Looks like it started after last Tuesday's deploy. The WebSocket connection handler might be the culprit." },
      { speaker: 'social', content: "I'll check with the infra team about when they first noticed the alerts. Was there a specific feature in that release?" },
      { speaker: 'coder', content: "Found it! We're storing event listeners in a closure but never removing them on disconnect. Classic Node.js leak." },
      { speaker: 'social', content: "Nice catch! I'll update the incident channel and let everyone know the fix is coming. Want me to coordinate the hotfix deploy?" },
    ],
  },

  // --- Intentional repeat dialogue for circuit breaker demo ---
  {
    topic: 'Broken Record Demo',
    initiator: 'social',
    responder: 'coder',
    turns: [
      { speaker: 'social', content: "Hey, let me tell you about this amazing new framework!" },
      { speaker: 'coder', content: "Sure, what framework?" },
      { speaker: 'social', content: "Let me tell you about this amazing new framework!" },
      { speaker: 'coder', content: "You just said that..." },
      { speaker: 'social', content: "Let me tell you about this amazing new framework!" },
      { speaker: 'coder', content: "Something seems wrong here." },
      { speaker: 'social', content: "Let me tell you about this amazing new framework!" },
    ],
  },
];

export function getScriptsForInitiator(personality: PersonalityType): DialogueScript[] {
  return DIALOGUE_SCRIPTS.filter((s) => s.initiator === personality);
}

export function getRandomScript(personality: PersonalityType): DialogueScript | undefined {
  const scripts = getScriptsForInitiator(personality);
  if (scripts.length === 0) return undefined;
  return scripts[Math.floor(Math.random() * scripts.length)];
}

export function findPartnerPersonality(
  script: DialogueScript,
): PersonalityType {
  return script.responder;
}
