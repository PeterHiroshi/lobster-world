import { describe, it, expect } from 'vitest';
import {
  DIALOGUE_SCRIPTS,
  getScriptsForInitiator,
  getRandomScript,
  findPartnerPersonality,
} from '../src/mock/dialogues.js';
import type { PersonalityType } from '../src/mock/dialogues.js';

describe('DialogueScripts', () => {
  it('has at least 8 dialogue scripts', () => {
    expect(DIALOGUE_SCRIPTS.length).toBeGreaterThanOrEqual(8);
  });

  it('each script has valid structure', () => {
    for (const script of DIALOGUE_SCRIPTS) {
      expect(script.topic).toBeTruthy();
      expect(['coder', 'social', 'thinker']).toContain(script.initiator);
      expect(['coder', 'social', 'thinker']).toContain(script.responder);
      expect(script.turns.length).toBeGreaterThanOrEqual(4);

      for (const turn of script.turns) {
        expect(['coder', 'social', 'thinker']).toContain(turn.speaker);
        expect(turn.content.length).toBeGreaterThan(10);
      }
    }
  });

  it('scripts have 4-8 turns each', () => {
    for (const script of DIALOGUE_SCRIPTS) {
      expect(script.turns.length).toBeGreaterThanOrEqual(4);
      expect(script.turns.length).toBeLessThanOrEqual(8);
    }
  });

  it('each personality type has at least one script as initiator', () => {
    const personalities: PersonalityType[] = ['coder', 'social', 'thinker'];
    for (const p of personalities) {
      const scripts = getScriptsForInitiator(p);
      expect(scripts.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('getRandomScript returns a script for valid personality', () => {
    const script = getRandomScript('coder');
    expect(script).toBeDefined();
    expect(script!.initiator).toBe('coder');
  });

  it('findPartnerPersonality returns the responder', () => {
    const script = DIALOGUE_SCRIPTS[0];
    expect(findPartnerPersonality(script)).toBe(script.responder);
  });

  it('has a circuit breaker demo script with repeated lines', () => {
    const repeatScript = DIALOGUE_SCRIPTS.find((s) => s.topic.includes('Broken Record'));
    expect(repeatScript).toBeDefined();
    // Check that it has repeated content
    const contents = repeatScript!.turns.map((t) => t.content);
    const unique = new Set(contents);
    expect(unique.size).toBeLessThan(contents.length);
  });

  it('scripts reference correct personalities for speakers', () => {
    for (const script of DIALOGUE_SCRIPTS) {
      const validSpeakers = new Set([script.initiator, script.responder]);
      for (const turn of script.turns) {
        expect(validSpeakers.has(turn.speaker)).toBe(true);
      }
    }
  });

  it('first turn speaker matches initiator', () => {
    for (const script of DIALOGUE_SCRIPTS) {
      expect(script.turns[0].speaker).toBe(script.initiator);
    }
  });
});
