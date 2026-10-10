import 'server-only';
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { AGENT_BY_ID } from './agents';
import { DISCLAIMER } from './alertMessages';
import { fmtPrice, pdfSafe as S } from './pdfFormat';
import type { AnalysisResult } from '@/types/analysis';

const C = { ink: '#0f172a', mute: '#64748b', line: '#e2e8f0', green: '#059669', red: '#dc2626', amber: '#d97706', panel: '#f8fafc' };
const st = StyleSheet.create({
  page: { padding: 36, paddingBottom: 56, fontSize: 9, fontFamily: 'Helvetica', color: C.ink },
  head: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: C.ink, paddingBottom: 8, marginBottom: 12 },
  brand: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  mute: { color: C.mute },
  h2: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 14, marginBottom: 6 },
  row: { flexDirection: 'row' },
  box: { backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, borderRadius: 4, padding: 8 },
  th: { fontFamily: 'Helvetica-Bold', color: C.mute, fontSize: 8 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 3 },
  footer: { position: 'absolute', left: 36, right: 36, bottom: 22, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6, fontSize: 7.5, color: C.mute },
});
const biasColor = (b: string) => (b === 'BULLISH' ? C.green : b === 'BEARISH' ? C.red : C.mute);
const decColor = (d: string) => (d.includes('BUY') ? C.green : d.includes('SELL') ? C.red : C.mute);

function Bar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <View style={[st.row, { alignItems: 'center', marginBottom: 4 }]}>
      <Text style={{ width: 60 }}>{label}</Text>
      <View style={{ flex: 1, height: 8, backgroundColor: C.line, borderRadius: 4 }}><View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: 8, backgroundColor: color, borderRadius: 4 }} /></View>
      <Text style={{ width: 34, textAlign: 'right' }}>{pct}%</Text>
    </View>
  );
}
const KV = ({ k, v, color }: { k: string; v: string; color?: string }) => (
  <View style={[st.row, { marginBottom: 3 }]}><Text style={[st.mute, { width: 90 }]}>{k}</Text><Text style={{ flex: 1, fontFamily: 'Helvetica-Bold', color }}>{v}</Text></View>
);

export function ReportDocument({ r }: { r: AnalysisResult }) {
  const t = r.tradeSetup;
  const when = new Date(r.meta.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long', timeStyle: 'short' });
  const agents = [...r.agentEvaluations].sort((a, b) => (AGENT_BY_ID[a.id]?.category ?? '').localeCompare(AGENT_BY_ID[b.id]?.category ?? '') || b.conviction - a.conviction);
  return (
    <Document title={S(`MarketMind ${r.asset} ${r.timeframe}`)} author="MarketMind AI" subject="Laporan analisa">
      <Page size="A4" style={st.page}>
        <View style={st.head} fixed>
          <View><Text style={st.brand}>MarketMind AI</Text><Text style={st.mute}>Laporan Analisa Dewan 25 Agent</Text></View>
          <View style={{ alignItems: 'flex-end' }}><Text>{S(when)} WIB</Text><Text style={st.mute}>Model {S(r.meta.model)} · prompt {S(r.meta.promptVersion)}</Text></View>
        </View>

        <Text style={{ fontSize: 20, fontFamily: 'Helvetica-Bold' }}>{S(r.asset)}</Text>
        <Text style={st.mute}>Timeframe eksekusi {S(r.timeframe)} · {S(r.marketType)}</Text>

        <View style={[st.box, { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View><Text style={st.mute}>KEPUTUSAN</Text><Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: decColor(r.overallDecision) }}>{S(r.overallDecision)}</Text></View>
          <View style={{ alignItems: 'flex-end' }}><Text style={st.mute}>KEYAKINAN</Text><Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold' }}>{r.confidenceScore}%</Text></View>
        </View>

        <Text style={st.h2}>Konsensus</Text>
        <Bar label="Bullish" pct={r.consensus.bullishPct} color={C.green} />
        <Bar label="Bearish" pct={r.consensus.bearishPct} color={C.red} />
        <Bar label="Netral" pct={r.consensus.neutralPct} color="#94a3b8" />

        <Text style={st.h2}>Trade Setup</Text>
        <View style={st.box} wrap={false}>
          <KV k="Bias" v={S(t.bias)} color={biasColor(t.bias)} />
          <KV k="Zona entry" v={`${fmtPrice(t.entryLow)} - ${fmtPrice(t.entryHigh)}`} />
          <KV k="Stop loss" v={fmtPrice(t.stopLoss)} color={C.red} />
          <KV k="Take profit 1" v={fmtPrice(t.takeProfit1)} color={C.green} />
          <KV k="Take profit 2" v={fmtPrice(t.takeProfit2)} color={C.green} />
          <KV k="R:R (TP1 / TP2)" v={`${r.riskReward.rr1 ? `1:${r.riskReward.rr1}` : '-'} / ${r.riskReward.rr2 ? `1:${r.riskReward.rr2}` : '-'}`} />
          {r.marketData && <KV k="Harga live" v={`${r.marketData.summary.livePrice} (${S(r.marketData.provider)})`} />}
          {t.insufficientDataReason && <KV k="Catatan" v={S(t.insufficientDataReason)} color={C.amber} />}
        </View>

        {r.warnings.length > 0 && (
          <View wrap={false} style={[st.box, { marginTop: 8, borderColor: C.amber }]}>
            <Text style={{ fontFamily: 'Helvetica-Bold', color: C.amber, marginBottom: 3 }}>Peringatan</Text>
            {r.warnings.slice(0, 8).map((w, i) => <Text key={i} style={{ marginBottom: 2 }}>• {S(w)}</Text>)}
          </View>
        )}

        {r.timeframeAnalysis.length > 0 && (
          <View wrap={false}>
            <Text style={st.h2}>Analisa Top-Down ({S(r.topDown.alignment)})</Text>
            <Text style={{ marginBottom: 4 }}>{S(r.topDown.primaryTrend)}</Text>
            {r.timeframeAnalysis.map((x) => <Text key={x.timeframe} style={{ marginBottom: 2 }}><Text style={{ fontFamily: 'Helvetica-Bold' }}>{x.timeframe} ({x.trend}): </Text>{S(x.summary)}</Text>)}
            <Text style={{ marginTop: 3 }}><Text style={{ fontFamily: 'Helvetica-Bold' }}>Trigger entry: </Text>{S(r.topDown.entryTrigger)}</Text>
          </View>
        )}

        <Text style={st.h2}>Ringkasan Teknikal</Text>
        <Text>{S(r.technicalAnalysis.summary)}</Text>
        <Text style={st.h2}>Ringkasan Fundamental</Text>
        <Text>{S(r.fundamentalAnalysis.summary)}</Text>

        <Text style={st.h2}>Ringkasan Debat</Text>
        <Text style={{ marginBottom: 6 }}>{S(r.debate.summary)}</Text>
        {r.debate.clashes.map((c, i) => (
          <View key={i} wrap={false} style={[st.box, { marginBottom: 5 }]}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{S(c.topic)}</Text>
            <Text style={{ marginTop: 2 }}><Text style={{ fontFamily: 'Helvetica-Bold' }}>{S(AGENT_BY_ID[c.agentA]?.name ?? c.agentA)}: </Text>{S(c.argumentA)}</Text>
            <Text style={{ marginTop: 2 }}><Text style={{ fontFamily: 'Helvetica-Bold' }}>{S(AGENT_BY_ID[c.agentB]?.name ?? c.agentB)}: </Text>{S(c.rebuttalB)}</Text>
            <Text style={{ marginTop: 2, color: C.mute }}>Resolusi: {S(c.resolution)}</Text>
          </View>
        ))}

        <Text style={st.h2} break>Penilaian 25 Agent</Text>
        <View style={[st.tr, { borderBottomColor: C.ink }]} fixed><Text style={[st.th, { flex: 3 }]}>AGENT</Text><Text style={[st.th, { flex: 2 }]}>KATEGORI</Text><Text style={[st.th, { width: 50 }]}>BIAS</Text><Text style={[st.th, { width: 40, textAlign: 'right' }]}>KEYAKINAN</Text></View>
        {agents.map((a) => (
          <View key={a.id} style={st.tr} wrap={false}>
            <Text style={{ flex: 3 }}>{S(AGENT_BY_ID[a.id]?.name ?? a.id)}</Text>
            <Text style={{ flex: 2, color: C.mute }}>{S(AGENT_BY_ID[a.id]?.category ?? '')}</Text>
            <Text style={{ width: 50, color: biasColor(a.bias), fontFamily: 'Helvetica-Bold' }}>{a.bias}</Text>
            <Text style={{ width: 40, textAlign: 'right' }}>{a.conviction}</Text>
          </View>
        ))}

        <View style={st.footer} fixed>
          <Text>{S(DISCLAIMER)} Laporan ini dihasilkan AI untuk tujuan edukasi dan dapat mengandung kesalahan; verifikasi level pada chart Anda.</Text>
          <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} / ${totalPages} · ID ${r.meta.requestId.slice(0, 8)}`} />
        </View>
      </Page>
    </Document>
  );
}

export const renderReport = (r: AnalysisResult) => renderToBuffer(<ReportDocument r={r} />);
