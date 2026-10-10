import { AGENT_IDS } from './agents';
import { TIMEFRAMES } from './validators';

const S = { type: 'STRING' } as const;
const str = () => S;
const nullNum = { type: 'NUMBER', nullable: true } as const;
const strArr = { type: 'ARRAY', items: S } as const;
const agentId = { type: 'STRING', enum: [...AGENT_IDS] } as const;
const tf = { type: 'STRING', enum: [...TIMEFRAMES] } as const;
const bias = { type: 'STRING', enum: ['BULLISH', 'BEARISH', 'NEUTRAL'] } as const;

/** responseSchema Gemini (subset OpenAPI). Zod tetap validator final. */
export const ANALYSIS_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  required: ['overallDecision', 'confidenceScore', 'tradeSetup', 'technicalAnalysis', 'fundamentalAnalysis', 'debate', 'chartReadings', 'timeframeAnalysis', 'topDown', 'dataQualityNotes', 'agentEvaluations'],
  properties: {
    overallDecision: { type: 'STRING', enum: ['STRONG BUY', 'BUY', 'NEUTRAL/HOLD', 'SELL', 'STRONG SELL'] },
    confidenceScore: { type: 'INTEGER' },
    tradeSetup: {
      type: 'OBJECT',
      required: ['bias', 'entryLow', 'entryHigh', 'stopLoss', 'takeProfit1', 'takeProfit2', 'keyLevels', 'insufficientDataReason'],
      properties: {
        bias,
        entryLow: nullNum, entryHigh: nullNum, stopLoss: nullNum, takeProfit1: nullNum, takeProfit2: nullNum,
        keyLevels: { type: 'ARRAY', items: { type: 'OBJECT', required: ['label', 'price'], properties: { label: str(), price: nullNum } } },
        insufficientDataReason: { type: 'STRING', nullable: true },
      },
    },
    technicalAnalysis: {
      type: 'OBJECT',
      required: ['summary', 'patternsDetected', 'indicatorStatus', 'marketStructure'],
      properties: { summary: S, patternsDetected: strArr, indicatorStatus: S, marketStructure: S },
    },
    fundamentalAnalysis: {
      type: 'OBJECT',
      required: ['summary', 'macroDrivers', 'riskFactors', 'sentimentRating'],
      properties: { summary: S, macroDrivers: strArr, riskFactors: strArr, sentimentRating: S },
    },
    debate: {
      type: 'OBJECT',
      required: ['summary', 'clashes'],
      properties: {
        summary: S,
        clashes: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            required: ['agentA', 'agentB', 'topic', 'argumentA', 'rebuttalB', 'resolution'],
            properties: { agentA: agentId, agentB: agentId, topic: S, argumentA: S, rebuttalB: S, resolution: S },
          },
        },
      },
    },
    chartReadings: {
      type: 'ARRAY',
      items: { type: 'OBJECT', required: ['timeframe', 'visibleLow', 'visibleHigh', 'lastVisiblePrice'], properties: { timeframe: tf, visibleLow: nullNum, visibleHigh: nullNum, lastVisiblePrice: nullNum } },
    },
    timeframeAnalysis: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['timeframe', 'trend', 'summary', 'zones'],
        properties: {
          timeframe: tf,
          trend: { type: 'STRING', enum: ['BULLISH', 'BEARISH', 'RANGING'] },
          summary: S,
          zones: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              required: ['type', 'low', 'high', 'note'],
              properties: { type: { type: 'STRING', enum: ['ORDER_BLOCK_BULL', 'ORDER_BLOCK_BEAR', 'FVG', 'SUPPORT', 'RESISTANCE', 'LIQUIDITY'] }, low: nullNum, high: nullNum, note: S },
            },
          },
        },
      },
    },
    topDown: {
      type: 'OBJECT',
      required: ['alignment', 'primaryTrend', 'entryTrigger'],
      properties: { alignment: { type: 'STRING', enum: ['ALIGNED', 'MIXED', 'CONFLICTING', 'NOT_AVAILABLE'] }, primaryTrend: S, entryTrigger: S },
    },
    dataQualityNotes: strArr,
    agentEvaluations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['id', 'bias', 'conviction', 'argument', 'evidence', 'highlightedKey'],
        properties: { id: agentId, bias, conviction: { type: 'INTEGER' }, argument: S, evidence: strArr, highlightedKey: S },
      },
    },
  },
} as const;
