import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useWorldStore } from '../src/store/useWorldStore';
import { startDemoScenario, stopDemoScenario } from '../src/lib/DemoScenario';

vi.mock('../src/lib/audio', () => ({
  playChatPing: vi.fn(),
  playJoinSound: vi.fn(),
  playTypingClick: vi.fn(),
  setMuted: vi.fn(),
  getMuted: () => true,
}));

describe('DemoScenario', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useWorldStore.setState({
      permissionRequests: [],
      activeDialogues: {},
      budgetStatus: null,
      lobsters: {},
      stats: { lobsterCount: 0, realLobsterCount: 0, demoLobsterCount: 0, activeDialogues: 0, totalMessages: 0 },
      lobsterStats: {},
      effects: [],
    });
  });

  afterEach(() => {
    stopDemoScenario();
    vi.useRealTimers();
  });

  it('triggers consent request after DEMO_NPC_DELAY_MS', () => {
    startDemoScenario();
    expect(useWorldStore.getState().permissionRequests).toHaveLength(0);

    // Fast-forward past NPC delay (10s)
    vi.advanceTimersByTime(10000);
    expect(useWorldStore.getState().permissionRequests).toHaveLength(1);
    expect(useWorldStore.getState().permissionRequests[0].dataType).toBe('dialogue');
  });

  it('starts dialogue after consent + 5s', () => {
    startDemoScenario();
    vi.advanceTimersByTime(10000); // consent
    vi.advanceTimersByTime(5000); // dialogue start
    expect(useWorldStore.getState().activeDialogues['demo-session-1']).toBeDefined();
  });

  it('sends chat messages at 3s intervals', () => {
    startDemoScenario();
    vi.advanceTimersByTime(15000); // consent + dialogue start
    vi.advanceTimersByTime(3000); // first message
    const dialogue = useWorldStore.getState().activeDialogues['demo-session-1'];
    expect(dialogue?.messages.length).toBe(1);

    vi.advanceTimersByTime(3000); // second message
    expect(useWorldStore.getState().activeDialogues['demo-session-1']?.messages.length).toBe(2);
  });

  it('updates budget status with each message', () => {
    startDemoScenario();
    vi.advanceTimersByTime(18000); // consent + dialogue + 1st msg
    expect(useWorldStore.getState().budgetStatus).not.toBeNull();
    expect(useWorldStore.getState().budgetStatus?.dailyTokensUsed).toBeGreaterThan(0);
  });

  it('triggers permission request after messages', () => {
    startDemoScenario();
    vi.advanceTimersByTime(15000); // consent + dialogue start
    vi.advanceTimersByTime(15000); // all 4 messages + permission request
    const requests = useWorldStore.getState().permissionRequests;
    // Should have the skills permission request (consent may have auto-dismissed)
    const skillsReq = requests.find((r) => r.dataType === 'skills');
    expect(skillsReq).toBeDefined();
  });

  it('ends dialogue after all steps', () => {
    startDemoScenario();
    vi.advanceTimersByTime(15000 + 18000); // all steps
    const dialogue = useWorldStore.getState().activeDialogues['demo-session-1'];
    expect(dialogue?.ended).toBe(true);
  });

  it('stopDemoScenario cancels timers', () => {
    startDemoScenario();
    stopDemoScenario();
    vi.advanceTimersByTime(60000);
    expect(useWorldStore.getState().permissionRequests).toHaveLength(0);
    expect(useWorldStore.getState().activeDialogues).toEqual({});
  });
});
