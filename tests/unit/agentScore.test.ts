import { describe, expect, it } from 'vitest';
import { buildLeaderboard, judgeAgent, wilsonLowerBound, type OutcomeRow } from '@/lib/agentScore';

describe('judgeAgent', () => {
  it('long menang: bullish benar, bearish salah', () => {
    expect(judgeAgent('BULLISH', 'LONG', 'win')).toBe('correct');
    expect(judgeAgent('BEARISH', 'LONG', 'win')).toBe('wrong');
  });
  it('long kalah: bearish benar, bullish salah', () => {
    expect(judgeAgent('BEARISH', 'LONG', 'loss')).toBe('correct');
    expect(judgeAgent('BULLISH', 'LONG', 'loss')).toBe('wrong');
  });
  it('short menang: bearish benar', () => expect(judgeAgent('BEARISH', 'SHORT', 'win')).toBe('correct'));
  it('short kalah: bullish benar', () => expect(judgeAgent('BULLISH', 'SHORT', 'loss')).toBe('correct'));
  it('breakeven & neutral = abstain', () => {
    expect(judgeAgent('BULLISH', 'LONG', 'breakeven')).toBe('abstain');
    expect(judgeAgent('NEUTRAL', 'LONG', 'win')).toBe('abstain');
  });
});

describe('wilsonLowerBound', () => {
  it('n=0 → null', () => expect(wilsonLowerBound(0, 0)).toBeNull());
  it('sampel besar mengalahkan sampel kecil walau akurasi lebih rendah', () => {
    expect(wilsonLowerBound(80, 100)! > wilsonLowerBound(1, 1)!).toBe(true);
  });
  it('selalu di antara 0 dan 1', () => {
    for (const [c, n] of [[0, 5], [5, 5], [3, 10]] as const) { const w = wilsonLowerBound(c, n)!; expect(w >= 0 && w <= 1).toBe(true); }
  });
});

describe('buildLeaderboard', () => {
  const agents = [
    { id: 'a', name: 'Alpha', role: '', category: 'Quantitative', avatar: '', description: '' },
    { id: 'b', name: 'Beta', role: '', category: 'Contrarian', avatar: '', description: '' },
    { id: 'c', name: 'Gamma', role: '', category: 'Fundamental', avatar: '', description: '' },
  ] as never;
  const rows: OutcomeRow[] = [
    { direction: 'LONG', result: 'win', evaluations: [{ agentId: 'a', bias: 'BULLISH' }, { agentId: 'b', bias: 'BEARISH' }] },
    { direction: 'LONG', result: 'win', evaluations: [{ agentId: 'a', bias: 'BULLISH' }, { agentId: 'b', bias: 'BEARISH' }] },
    { direction: 'SHORT', result: 'loss', evaluations: [{ agentId: 'a', bias: 'BEARISH' }, { agentId: 'b', bias: 'BULLISH' }] },
  ];
  it('mengurutkan, memberi rank, dan menaruh agent tanpa data di akhir', () => {
    const lb = buildLeaderboard(rows, agents);
    expect(lb[0].agentId).toBe('a');
    expect(lb[0].rank).toBe(1);
    expect(lb[0].accuracy).toBe(66.7); // 2 benar (menang long), 1 salah (short kalah, bias bearish = salah)
    expect(lb[1].agentId).toBe('b');
    expect(lb[1].accuracy).toBe(33.3);
    expect(lb[2].agentId).toBe('c');
    expect(lb[2].rank).toBeNull();
    expect(lb[2].accuracy).toBeNull();
  });
  it('agent tidak dikenal diabaikan; lowSample < 5', () => {
    const lb = buildLeaderboard([{ direction: 'LONG', result: 'win', evaluations: [{ agentId: 'zzz', bias: 'BULLISH' }] }], agents);
    expect(lb.every((s) => s.evaluated === 0)).toBe(true);
    expect(buildLeaderboard(rows, agents)[0].lowSample).toBe(true);
  });
});
