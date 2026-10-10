// Sumber kebenaran tunggal untuk 25 agent. Diekstrak dari prototype.
// Server memakai daftar ini untuk memvalidasi output AI; UI memakainya untuk tampilan.

export const AGENT_CATEGORIES = ['Institutional','Retail Pros','Contrarian','Fundamental','Quantitative'] as const;
export type AgentCategory = (typeof AGENT_CATEGORIES)[number];

export interface AgentProfile {
  id: string;
  name: string;
  role: string;
  category: AgentCategory;
  avatar: string;
  description: string;
}

export const AGENTS = [
  { id: "ict_smart_money", name: "ICT & Order Block Specialist", role: "Trader Institusi - Smart Money Concepts", category: "Institutional", avatar: "🏦", description: "Fokus pada Liquidity Sweeps, Fair Value Gap (FVG), Breaker Blocks, & Market Structure Shift." },
  { id: "institutional_orderflow", name: "Order Flow & Footprint Quant", role: "Analis Institutional Order Flow", category: "Institutional", avatar: "📊", description: "Menganalisis akumulasi delta volume, footprint chart, DOM absorption, dan hidden liquidity." },
  { id: "macro_hedge_fund", name: "Global Macro Portfolio Manager", role: "Pengelola Dana Institutional", category: "Institutional", avatar: "💼", description: "Melihat pergerakan aset dalam skala makro, korelasi antar pasar, yield obligasi, dan liquidity cycle." },
  { id: "darkpool_tracker", name: "Dark Pool & Whale Tracker", role: "Spesialis Pergerakan Paus", category: "Institutional", avatar: "🐋", description: "Melacak transaksi off-exchange volume besar, perpindahan dompet paus, & institusi besar." },
  { id: "inst_risk_officer", name: "Chief Risk Officer (CRO)", role: "Manajer Risiko Institusi", category: "Institutional", avatar: "🛡️", description: "Menghitung Value at Risk (VaR), Max Drawdown, dan membatasi eksposur modal berlebih." },
  { id: "price_action_pro", name: "Pure Price Action Veteran", role: "Senior Retail Price Action Trader", category: "Retail Pros", avatar: "🕯️", description: "Pengalaman 15 tahun membaca candlestick telanjang, Higher High/Low, & level S/R klasik." },
  { id: "chart_pattern_master", name: "Classical Pattern Strategist", role: "Pakar Pola Grafik Klasik", category: "Retail Pros", avatar: "📐", description: "Menganalisis Head & Shoulders, Double Top/Bottom, Triangles, Pennants, & Wedges." },
  { id: "harmonic_trader", name: "Fibonacci & Harmonic Architect", role: "Pakar Fibonacci Ratio", category: "Retail Pros", avatar: "🌀", description: "Mengukur rasio Fibonacci Retracement, PRZ (Potential Reversal Zone), Gartley, & Bat patterns." },
  { id: "scalper_momentum", name: "High-Velocity Scalper", role: "Momentum & Scalping Specialist", category: "Retail Pros", avatar: "⚡", description: "Mencari ledakan momentum di timeframe kecil (1m-15m) menggunakan RSI divergence & EMA Ribbon." },
  { id: "swing_trend_rider", name: "Multi-Timeframe Trend Rider", role: "Swing Trader Berpengalaman", category: "Retail Pros", avatar: "📈", description: "Fokus menunggangi tren utama (Weekly/Daily/4H) menggunakan Donchian & Moving Average Alignment." },
  { id: "extreme_sentiment_contrarian", name: "Fear & Greed Contrarian", role: "Trader Kontrarian Sentimen Ekstrem", category: "Contrarian", avatar: "🔄", description: "Melakukan BUY saat publik sangat panik (Extreme Fear) dan SELL saat publik terlalu serakah." },
  { id: "liquidity_grab_hunter", name: "Stop-Loss Hunt Specialist", role: "Pakar Trap & False Breakout", category: "Contrarian", avatar: "🪤", description: "Mencari area di mana retail menaruh Stop Loss untuk masuk berlawanan arah (Bull Trap / Bear Trap)." },
  { id: "mean_reversion_architect", name: "Statistical Mean Reversion", role: "Pakar Reversi Rata-rata", category: "Contrarian", avatar: "🧮", description: "Mengidentifikasi harga yang sudah overextended secara statistik (3 Standard Deviation dari VWAP)." },
  { id: "gamma_squeeze_trader", name: "Short Squeeze & Options Vol", role: "Spesialis Squeeze & Gamma", category: "Contrarian", avatar: "💣", description: "Mencari penumpukan posisi short/long ritel yang rentan terkena liquidation cascade." },
  { id: "black_swan_hunter", name: "Tail-Risk & Volatility Hunter", role: "Trader Event Volatilitas Ekstrem", category: "Contrarian", avatar: "🦅", description: "Memanfaatkan anomali harga sebelum pengumuman berita makro besar & lonjakan Implied Volatility." },
  { id: "fed_policy_watcher", name: "Central Bank Policy Expert", role: "Analis Kebijakan Moneter (Fed/ECB)", category: "Fundamental", avatar: "🏛️", description: "Menganalisis suku bunga, dot plot, neraca The Fed, laju inflasi CPI, dan kondisi ketenagakerjaan." },
  { id: "geopolitical_risk_analyst", name: "Geopolitical Risk Strategist", role: "Analis Risiko Geopolitik", category: "Fundamental", avatar: "🌍", description: "Mengukur dampak perang, ketegangan perdagangan global, serta sanksi ekonomi pada komoditas/forex." },
  { id: "onchain_crypto_analyst", name: "On-Chain Metrics Analyst", role: "Pakar Metrik On-Chain & Wallet Flow", category: "Fundamental", avatar: "🔗", description: "Menganalisis MVRV Ratio, NUP risk score, Exchange Inflow/Outflow, & miner reserves." },
  { id: "dxy_commodities_expert", name: "Intermarket Correlation Strategist", role: "Analis Korelasi DXY & Gold/Oil", category: "Fundamental", avatar: "💵", description: "Menganalisis hubungan indeks Dolar US (DXY) terhadap Emas, Minyak, & Pasar Saham." },
  { id: "earnings_macro_auditor", name: "Corporate Earnings & Liquidity", role: "Analis Laporan Keuangan & Likuiditas", category: "Fundamental", avatar: "📑", description: "Melihat laporan arus kas, buyback saham institusi, serta pertumbuhan pendapatan riil." },
  { id: "quant_backtester", name: "Algorithmic Expectancy Quant", role: "Pakar Monte Carlo & Backtesting", category: "Quantitative", avatar: "🖥️", description: "Menghitung Sharpe Ratio, Win-Rate probabilistik historis, & expectancy berdasarkan 10,000 simulasi." },
  { id: "stat_arb_quant", name: "Statistical Arbitrage Engine", role: "Quant Kointegrasi & Pairs Trading", category: "Quantitative", avatar: "📐", description: "Mengukur Z-Score harga terhadap mean statistik jangka panjang untuk sinyal overbought/oversold." },
  { id: "ml_pattern_predictor", name: "Machine Learning Neural Predictor", role: "AI Neural Model Trader", category: "Quantitative", avatar: "🤖", description: "Menggunakan algoritma Deep Learning untuk mencocokkan fraktal pola grafik saat ini dengan sejarah 20 tahun." },
  { id: "volatility_greeks_quant", name: "Greeks & Volatility Surface Model", role: "Quant Derivatives & Delta Neutral", category: "Quantitative", avatar: "📊", description: "Menganalisis Implied Volatility (IV) Rank, Delta exposure, & skew opsi untuk mengukur expected move." },
  { id: "hft_microstructure_quant", name: "Market Microstructure Profiler", role: "Analis Latensi & Slippage HFT", category: "Quantitative", avatar: "⚙️", description: "Mengevaluasi slippage, kedalaman order book, serta estimasi dampak biaya spread pada trade." },
] as const satisfies readonly AgentProfile[];

export const AGENT_IDS = AGENTS.map((a) => a.id) as unknown as [string, ...string[]];
export const AGENT_BY_ID: Record<string, AgentProfile> = Object.fromEntries(AGENTS.map((a) => [a.id, a]));
