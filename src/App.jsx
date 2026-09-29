import { useState, useEffect, useMemo } from "react";

// ── BRANCH PROFILES (the "who is reading" layer) ──────────────────────────────
const BRANCHES = [
  { id: "westlands", name: "Westlands Branch",   manager: "Joyce Wanjiku", role: "Branch Manager", region: "Nairobi Central Region",
    baseRevenue: 1156000, baseTxns: 2710, budgetFactor: 1.04, lyFactor: 0.90, loyaltyBase: 29.8, newBase: 127 },
  { id: "nyali",     name: "Nyali Mega Branch",  manager: "Amina Hassan",  role: "Branch Manager", region: "Coast Region",
    baseRevenue: 1480000, baseTxns: 3320, budgetFactor: 1.05, lyFactor: 0.88, loyaltyBase: 33.1, newBase: 158 },
  { id: "kisumu",    name: "Kisumu Mega Branch", manager: "Peter Otieno",  role: "Branch Manager", region: "Western Region",
    baseRevenue: 980000,  baseTxns: 2350, budgetFactor: 1.03, lyFactor: 0.92, loyaltyBase: 26.4, newBase: 96 },
  { id: "eldoret",   name: "Eldoret Branch",     manager: "Brian Kiprop",  role: "Branch Manager", region: "Rift Valley Region",
    baseRevenue: 860000,  baseTxns: 2080, budgetFactor: 1.02, lyFactor: 0.93, loyaltyBase: 24.9, newBase: 81 },
];

const yesterday = new Date(Date.now() - 86400000);
const DATE_LABEL = yesterday.toLocaleDateString("en-KE", {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
});

// ── CATALOGUE POOLS ───────────────────────────────────────────────────────────
const CATEGORIES = [
  { name: "Fresh Produce", share: 0.25 },
  { name: "Dry Groceries", share: 0.23 },
  { name: "Household",     share: 0.19 },
  { name: "Beverages",     share: 0.16 },
  { name: "Personal Care", share: 0.17 },
];

const SKU_POOL = [
  { sku: "Cooking Oil 3L",   vendor: "Bidco Africa" },
  { sku: "Baby Diapers L",   vendor: "P&G Kenya" },
  { sku: "Maize Flour 2kg",  vendor: "Unga Group" },
  { sku: "Sugar 2kg",        vendor: "Mumias Sugar" },
  { sku: "Fresh Milk 500ml", vendor: "Brookside Dairy" },
  { sku: "Rice Pishori 2kg", vendor: "Mwea Millers" },
  { sku: "Bar Soap 800g",    vendor: "Unilever Kenya" },
  { sku: "Bottled Water 1L", vendor: "Keringet" },
  { sku: "Wheat Flour 2kg",  vendor: "Exe Limited" },
];

// ── STORYLINES (the "what happened yesterday" layer) ─────────────────────────
// txn / basket = % effect ranges; cats = % effect on category vs average
const STORIES = [
  { id: "payday", label: "Payday surge",
    txn: [4, 10], basket: [6, 12], stock: [1, 3], loyalty: [1, 3],
    cats: { "Fresh Produce": 8, "Dry Groceries": 12, "Household": 6, "Beverages": 2, "Personal Care": 1 },
    context: "Yesterday was close to month-end payday; footfall and basket sizes typically lift across staples." },
  { id: "rain", label: "Heavy rain day",
    txn: [-14, -7], basket: [1, 5], stock: [0, 2], loyalty: [-1, 1],
    cats: { "Fresh Produce": -9, "Dry Groceries": 4, "Household": -3, "Beverages": -8, "Personal Care": -4 },
    context: "Heavy rain hit the area for most of the afternoon; shoppers came less often but bought bigger, planned baskets." },
  { id: "promo", label: "Promo lift", promo: true,
    txn: [3, 8], basket: [0, 4], stock: [1, 3], loyalty: [2, 4],
    cats: {},
    context: "A weekend promotion ran on one category; expect a strong lift there and possible pressure on related stock." },
  { id: "competitor", label: "Competitor opening",
    txn: [-11, -5], basket: [-3, 1], stock: [0, 1], loyalty: [-4, -2],
    cats: { "Fresh Produce": -4, "Dry Groceries": -5, "Household": -2, "Beverages": -3, "Personal Care": -6 },
    context: "A competing supermarket opened nearby this week with launch discounts; loyalty return rates are the metric to watch." },
  { id: "supplier", label: "Supplier delay",
    txn: [-3, 2], basket: [-3, 1], stock: [3, 4], loyalty: [-1, 1],
    cats: { "Fresh Produce": -2, "Dry Groceries": -7, "Household": -3, "Beverages": -2, "Personal Care": 1 },
    context: "Several inbound deliveries arrived late or short this week, so availability rather than demand is the story." },
  { id: "calm", label: "Steady trading day",
    txn: [-2, 3], basket: [-1, 2], stock: [0, 1], loyalty: [-1, 2],
    cats: { "Fresh Produce": 1, "Dry Groceries": 0, "Household": 1, "Beverages": 0, "Personal Care": -1 },
    context: "No unusual external events. Trading was close to normal, so the brief should focus on small drifts worth protecting." },
];

// ── SEEDED RANDOM (repeatable scenarios for demos) ────────────────────────────
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── DATA GENERATOR — stands in for the SQL / semantic-model layer ─────────────
function generateDay(branch, seed) {
  const r = rng(seed);
  const rand = (lo, hi) => lo + (hi - lo) * r();
  const range = ([lo, hi]) => rand(lo, hi);
  const story = STORIES[Math.floor(r() * STORIES.length)];

  // category effects (story + noise)
  const promoCat = CATEGORIES[Math.floor(r() * CATEGORIES.length)].name;
  const categories = CATEGORIES.map(c => {
    const storyEffect = story.promo ? (c.name === promoCat ? rand(22, 38) : rand(-3, 2)) : (story.cats[c.name] ?? 0);
    const vsAvg = +(storyEffect + rand(-3.5, 3.5)).toFixed(1);
    const revenue = Math.round(c.share * branch.baseRevenue * (1 + vsAvg / 100));
    return { name: c.name, revenue, vsAvg };
  });

  const revenueValue = categories.reduce((s, c) => s + c.revenue, 0);
  const txnEffect = range(story.txn);
  const txnValue = Math.round(branch.baseTxns * (1 + txnEffect / 100));
  const basketValue = +(revenueValue / txnValue).toFixed(1);
  const baseBasket = +(branch.baseRevenue / branch.baseTxns).toFixed(1);

  // stockouts
  const [sLo, sHi] = story.stock;
  const stockCount = Math.round(rand(sLo, sHi));
  const stockout = [...SKU_POOL]
    .sort(() => r() - 0.5)
    .slice(0, stockCount)
    .map(s => ({ ...s, coverDays: +rand(0.8, 3.2).toFixed(1) }))
    .sort((a, b) => a.coverDays - b.coverDays);

  // customers
  const loyaltyReturn = +(branch.loyaltyBase + range(story.loyalty)).toFixed(1);
  const newCustomers = Math.round(branch.newBase * (1 + rand(-0.15, 0.25)));

  return {
    seed, story: { id: story.id, label: story.label, context: story.context, promoCat: story.promo ? promoCat : null },
    revenue: {
      value: revenueValue,
      sevenDayAvg: branch.baseRevenue,
      budget: Math.round(branch.baseRevenue * branch.budgetFactor),
      lastYear: Math.round(branch.baseRevenue * branch.lyFactor),
    },
    transactions: { value: txnValue, sevenDayAvg: branch.baseTxns },
    basketSize: { value: basketValue, sevenDayAvg: baseBasket },
    categories,
    stockout,
    customers: {
      loyaltyReturn, loyaltyReturnAvg: branch.loyaltyBase,
      newCustomers, newCustomersVsAvg: +(((newCustomers - branch.newBase) / branch.newBase) * 100).toFixed(1),
      avgBasketLoyalty: Math.round(basketValue * rand(1.35, 1.5)),
      avgBasketNonLoyalty: Math.round(basketValue * rand(0.62, 0.72)),
    },
  };
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
const pct  = (v, base) => (((v - base) / base) * 100).toFixed(1);
const fmtK = (n) => n >= 1e6 ? `${(n/1e6).toFixed(2)}M` : `${(n/1000).toFixed(0)}K`;
const sign = (n) => Number(n) >= 0 ? `+${n}` : `${n}`;
const clr  = (n) => Number(n) >= 0 ? "#34d399" : "#f87171";
const newSeed = () => Math.floor(Math.random() * 9000) + 1000;

// ── PROMPT BUILDER (the intelligence engine) ──────────────────────────────────
function buildPrompt(branch, data) {
  const top   = [...data.categories].sort((a, b) => b.vsAvg - a.vsAvg)[0];
  const worst = [...data.categories].sort((a, b) => a.vsAvg - b.vsAvg)[0];
  const first = branch.manager.split(" ")[0];
  const hasStock = data.stockout.length > 0;
  const promoLine = data.story.promoCat ? `\nActive promotion category: ${data.story.promoCat}` : "";

  return `Write a morning intelligence briefing for ${branch.manager}, ${branch.role} at ${branch.name} (${branch.region}). Date: ${DATE_LABEL}.

CONTEXT SIGNAL: ${data.story.context}${promoLine}

PERFORMANCE SNAPSHOT:
Revenue: KES ${fmtK(data.revenue.value)} | vs 7-day avg: ${sign(pct(data.revenue.value, data.revenue.sevenDayAvg))}% | vs budget: ${sign(pct(data.revenue.value, data.revenue.budget))}% | vs last year: ${sign(pct(data.revenue.value, data.revenue.lastYear))}%
Transactions: ${data.transactions.value.toLocaleString()} (${sign(pct(data.transactions.value, data.transactions.sevenDayAvg))}% vs avg)
Basket size: KES ${data.basketSize.value} (${sign(pct(data.basketSize.value, data.basketSize.sevenDayAvg))}% vs avg)
Strongest category: ${top.name} at ${sign(top.vsAvg)}% vs average
Weakest category: ${worst.name} at ${sign(worst.vsAvg)}% vs average

STOCK POSITION:
${hasStock
  ? data.stockout.map(s => `- ${s.sku}: only ${s.coverDays} days of stock remaining (vendor: ${s.vendor})`).join("\n")
  : "No SKUs below 4 days of cover."}

CUSTOMER INTELLIGENCE:
Loyalty return rate (7-day): ${data.customers.loyaltyReturn}% vs branch avg ${data.customers.loyaltyReturnAvg}%
New customers yesterday: ${data.customers.newCustomers} (${sign(data.customers.newCustomersVsAvg)}% vs avg)
Loyalty basket: KES ${data.customers.avgBasketLoyalty} vs non-loyalty KES ${data.customers.avgBasketNonLoyalty}

Write exactly 3 short paragraphs addressed directly to ${first}.
Para 1: What drove yesterday. Be specific about the biggest mover and use the context signal to offer a likely explanation, without inventing facts beyond the data.
Para 2: ${hasStock
  ? "What needs her/his direct attention today. Lead with the stock position; name the most urgent SKU and vendor."
  : "There are no stock emergencies, so say what to protect or watch today given the trading pattern (e.g. the weakest category or the loyalty trend)."}
Para 3: One customer or basket insight worth carrying through the day.
Tone: trusted senior colleague, warm but direct. Vary your opening; do not start with "Good morning". Under 190 words total. No bullets. No headers. No jargon.`;
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
  .rs-blink { animation: blink 1.1s step-end infinite; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  .rs-fadein { animation: fadein 0.9s ease both; }
  @keyframes fadein { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
  .rs-bar { transition: width 1.1s cubic-bezier(.4,0,.2,1); }

  .rs-btn {
    background: #f59e0b; color: #080c18;
    border: none; border-radius: 6px;
    font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 13px;
    padding: 9px 22px; cursor: pointer; letter-spacing: 0.02em;
    transition: background 0.2s, transform 0.15s;
  }
  .rs-btn:hover:not(:disabled) { background: #fcd34d; transform: translateY(-1px); }
  .rs-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .rs-btn-ghost {
    background: transparent; color: #f59e0b;
    border: 1px solid rgba(245,158,11,0.35); border-radius: 6px;
    font-family: 'DM Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
    padding: 7px 14px; cursor: pointer; transition: background 0.2s;
  }
  .rs-btn-ghost:hover { background: rgba(245,158,11,0.10); }

  .rs-select {
    background: #0d1524; color: #e2ddd5; border: 1px solid #1b2a42; border-radius: 6px;
    font-family: 'DM Sans', sans-serif; font-size: 12px; padding: 7px 10px; cursor: pointer; outline: none;
  }

  .rs-card { background: #0d1524; border: 1px solid #1b2a42; border-radius: 10px; }

  .rs-alert-row {
    background: rgba(248,113,113,0.07);
    border: 1px solid rgba(248,113,113,0.2);
    border-radius: 6px; padding: 10px 13px; margin-bottom: 8px;
  }
  .rs-hr { border: none; border-top: 1px solid #1b2a42; margin: 12px 0; }

  .rs-key-row {
    display: flex; align-items: center; gap: 10px;
    background: #070b14; border: 1px solid #1b2a42;
    border-radius: 8px; padding: 10px 14px; margin-bottom: 20px;
  }
  .rs-key-label {
    font-family: 'DM Mono', monospace; font-size: 10px;
    color: #3a4d6a; text-transform: uppercase; letter-spacing: 0.07em;
    white-space: nowrap;
  }
  .rs-key-input {
    flex: 1; background: transparent; border: none; outline: none;
    font-family: 'DM Mono', monospace; font-size: 12px;
    color: #6b7a9a; letter-spacing: 0.03em;
  }
  .rs-key-input::placeholder { color: #2d3d5a; }
  .rs-key-dot {
    width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
    transition: background 0.3s, box-shadow 0.3s;
  }
  .rs-key-dot.ready   { background: #34d399; box-shadow: 0 0 6px #34d399; }
  .rs-key-dot.empty   { background: #2d3d5a; }

  /* ── The brief itself (editorial treatment) ── */
  .rs-brief-wrap {
    position: relative; padding: 4px 0 4px 26px; max-width: 66ch;
  }
  .rs-brief-wrap::before {
    content: ""; position: absolute; left: 0; top: 6px; bottom: 6px; width: 2px; border-radius: 2px;
    background: linear-gradient(180deg, #f59e0b 0%, rgba(245,158,11,0.15) 100%);
  }
  .rs-brief-eyebrow {
    font-family: 'DM Mono', monospace; font-size: 10px; text-transform: uppercase;
    letter-spacing: 0.09em; color: #f59e0b; margin-bottom: 16px;
    display: flex; align-items: center; gap: 8px;
  }
  .rs-brief-eyebrow::before {
    content: ""; width: 6px; height: 6px; border-radius: 50%;
    background: #f59e0b; box-shadow: 0 0 8px rgba(245,158,11,0.7);
  }
  .rs-brief p {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 17px; line-height: 1.85; color: #d8d3c9;
    margin: 0 0 20px; letter-spacing: 0.005em;
  }
  .rs-brief p:last-child { margin-bottom: 0; }
  .rs-brief p:first-child::first-letter {
    font-size: 3.1em; font-weight: 700; color: #f59e0b;
    float: left; line-height: 0.85; padding: 6px 10px 0 0;
  }
  .rs-brief-foot {
    margin-top: 22px; padding-top: 14px; border-top: 1px solid #1b2a42;
    font-family: 'DM Mono', monospace; font-size: 10px; color: #3a4d6a;
    text-transform: uppercase; letter-spacing: 0.06em;
  }
`;

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [branchId,  setBranchId]  = useState(BRANCHES[0].id);
  const [seed,      setSeed]      = useState(() => newSeed());
  const [briefing,  setBriefing]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [barsReady, setBarsReady] = useState(false);
  const [apiKey,    setApiKey]    = useState("");

  const BRANCH = BRANCHES.find(b => b.id === branchId);
  const DATA   = useMemo(() => generateDay(BRANCH, seed), [BRANCH, seed]);

  useEffect(() => {
    const style = Object.assign(document.createElement("style"), { textContent: CSS });
    document.head.append(style);
    return () => style.remove();
  }, []);

  // re-animate bars whenever the scenario changes
  useEffect(() => {
    setBarsReady(false);
    const t = setTimeout(() => setBarsReady(true), 250);
    return () => clearTimeout(t);
  }, [branchId, seed]);

  const resetOutput = () => { setBriefing(null); setError(null); };
  const nextDay = () => { setSeed(newSeed()); resetOutput(); };
  const changeBranch = (id) => { setBranchId(id); setSeed(newSeed()); resetOutput(); };

  const generate = async () => {
    if (!apiKey.trim()) { setError("Paste your Anthropic API key above to generate the briefing."); return; }
    setLoading(true); setError(null);
    try {
      const res  = await fetch("https://api.anthropic.com/v1/messages", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey.trim(),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model:      "claude-sonnet-4-6",
          max_tokens: 1000,
          system:     "You are a senior retail intelligence analyst writing daily briefings for branch managers. Write like a trusted advisor who studied every number overnight — warm, specific, direct. No bullet points. No headers. Flowing paragraphs only.",
          messages:   [{ role: "user", content: buildPrompt(BRANCH, DATA) }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setBriefing(data.content?.[0]?.text ?? "No response received.");
    } catch (e) {
      setError(e.message || "Connection failed — check your API key and try again.");
    }
    setLoading(false);
  };

  const rVsAvg    = parseFloat(pct(DATA.revenue.value,      DATA.revenue.sevenDayAvg));
  const rVsBudget = parseFloat(pct(DATA.revenue.value,      DATA.revenue.budget));
  const rVsLY     = parseFloat(pct(DATA.revenue.value,      DATA.revenue.lastYear));
  const tVsAvg    = parseFloat(pct(DATA.transactions.value, DATA.transactions.sevenDayAvg));
  const bVsAvg    = parseFloat(pct(DATA.basketSize.value,   DATA.basketSize.sevenDayAvg));
  const maxRev    = Math.max(...DATA.categories.map(c => c.revenue));
  const sortedCats = [...DATA.categories].sort((a, b) => b.revenue - a.revenue);
  const loyaltyPos = DATA.customers.loyaltyReturn >= DATA.customers.loyaltyReturnAvg;

  const M   = { fontFamily: "'DM Mono', monospace" };
  const LBL = { fontSize:"10px", color:"#3a4d6a", textTransform:"uppercase", letterSpacing:"0.07em", fontFamily:"'DM Mono',monospace", marginBottom:"8px" };

  return (
    <div style={{ background:"#080c18", minHeight:"100vh", fontFamily:"'DM Sans',sans-serif", color:"#e2ddd5" }}>

      {/* Header */}
      <div style={{ borderBottom:"1px solid #1b2a42", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"10px" }}>
        <div>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"20px", fontWeight:700, color:"#f59e0b", letterSpacing:"-0.02em" }}>RetailSignal</span>
          <span style={{ fontSize:"10px", color:"#2d3d5a", marginLeft:"10px", ...M, textTransform:"uppercase", letterSpacing:"0.08em" }}>Intelligence Briefing</span>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:"10px", color:"#3a4d6a", ...M, textTransform:"uppercase", letterSpacing:"0.05em" }}>{DATE_LABEL}</div>
          <div style={{ fontSize:"11px", color:"#4a5a7a", marginTop:"3px" }}>{BRANCH.name} · {BRANCH.manager}</div>
        </div>
      </div>

      <div style={{ maxWidth:"920px", margin:"0 auto", padding:"24px 20px" }}>

        {/* Scenario controls */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"12px", marginBottom:"22px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap" }}>
            <span style={{ background:"rgba(245,158,11,0.10)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:"4px", padding:"4px 10px", fontSize:"10px", ...M, color:"#f59e0b", textTransform:"uppercase", letterSpacing:"0.07em" }}>
              ⬡ {BRANCH.role}
            </span>
            <span style={{ fontSize:"11px", color:"#3a4d6a" }}>{BRANCH.region}</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
            <select className="rs-select" value={branchId} onChange={e => changeBranch(e.target.value)}>
              {BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name} — {b.manager}</option>)}
            </select>
            <button className="rs-btn-ghost" onClick={nextDay}>↻ New day</button>
          </div>
        </div>

        {/* Signal chip */}
        <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"14px", ...M, fontSize:"10px", textTransform:"uppercase", letterSpacing:"0.06em" }}>
          <span style={{ color:"#3a4d6a" }}>Signal detected</span>
          <span style={{ color:"#e2ddd5", background:"#0d1524", border:"1px solid #1b2a42", borderRadius:"4px", padding:"3px 9px" }}>
            {DATA.story.label}{DATA.story.promoCat ? ` · ${DATA.story.promoCat}` : ""}
          </span>
          <span style={{ color:"#2d3d5a" }}>Scenario #{DATA.seed}</span>
        </div>

        {/* Briefing card */}
        <div className="rs-card" style={{ padding:"26px", marginBottom:"16px" }}>

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"16px", fontWeight:500, color:"#6b7a9a", fontStyle:"italic" }}>
              Morning Intelligence Brief
            </div>
            <button className="rs-btn" onClick={generate} disabled={loading || !apiKey.trim()}>
              {loading ? "Analysing…" : briefing ? "↺  Regenerate" : "▶  Generate Briefing"}
            </button>
          </div>

          {/* API key input */}
          <div className="rs-key-row">
            <span className="rs-key-label">API Key</span>
            <input
              className="rs-key-input"
              type="password"
              placeholder="sk-ant-api03-…  (paste your Anthropic key — not stored)"
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); setError(null); }}
            />
            <div className={`rs-key-dot ${apiKey.trim().startsWith("sk-") ? "ready" : "empty"}`} />
          </div>

          {!briefing && !loading && !error && (
            <div style={{ textAlign:"center", padding:"44px 0" }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"40px", color:"#1e2d42", marginBottom:"10px" }}>◈</div>
              <div style={{ fontSize:"12px", color:"#2d3d5a" }}>Paste your API key above, then generate the briefing</div>
            </div>
          )}

          {loading && (
            <div style={{ padding:"44px 0", textAlign:"center", ...M, fontSize:"13px", color:"#3a4d6a" }}>
              Scanning branch data<span className="rs-blink">_</span>
            </div>
          )}

          {error && (
            <div style={{ color:"#f87171", fontSize:"13px", padding:"12px 0", ...M }}>{error}</div>
          )}

          {briefing && (
            <div className="rs-fadein rs-brief-wrap">
              <div className="rs-brief-eyebrow">For {BRANCH.manager.split(" ")[0]} · {BRANCH.name}</div>
              <div className="rs-brief">
                {briefing.replace(/\*\*|__|^#+\s*/gm, "").split(/\n\s*\n/).filter(Boolean).map((para, i) => (
                  <p key={i}>{para.trim()}</p>
                ))}
              </div>
              <div className="rs-brief-foot">Signal: {DATA.story.label} · Scenario #{DATA.seed}</div>
            </div>
          )}
        </div>

        {/* KPI row */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:"12px", marginBottom:"14px" }}>
          {[
            { label:"Revenue", value:`KES ${fmtK(DATA.revenue.value)}`,
              rows:[{ l:"vs 7-day avg", v:rVsAvg }, { l:"vs budget", v:rVsBudget }, { l:"vs last year", v:rVsLY }] },
            { label:"Transactions", value:DATA.transactions.value.toLocaleString(),
              rows:[{ l:"vs 7-day avg", v:tVsAvg }] },
            { label:"Basket Size", value:`KES ${DATA.basketSize.value}`,
              rows:[{ l:"vs 7-day avg", v:bVsAvg }] },
          ].map((kpi, i) => (
            <div key={i} className="rs-card" style={{ padding:"18px" }}>
              <div style={LBL}>{kpi.label}</div>
              <div style={{ ...M, fontSize:"22px", fontWeight:500, color:"#f0ede8", marginBottom:"14px" }}>{kpi.value}</div>
              {kpi.rows.map((r, j) => (
                <div key={j} style={{ display:"flex", justifyContent:"space-between", marginBottom:"5px" }}>
                  <span style={{ fontSize:"10px", color:"#3a4d6a" }}>{r.l}</span>
                  <span style={{ ...M, fontSize:"12px", color:clr(r.v), fontWeight:500 }}>{sign(r.v)}%</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom grid */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:"12px" }}>

          {/* Categories */}
          <div className="rs-card" style={{ padding:"20px" }}>
            <div style={LBL}>Category Revenue & Trend</div>
            {sortedCats.map((cat, i) => (
              <div key={cat.name} style={{ marginBottom:"14px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"5px" }}>
                  <span style={{ fontSize:"12px", color:"#9ca3af" }}>{cat.name}</span>
                  <div style={{ display:"flex", gap:"12px" }}>
                    <span style={{ ...M, fontSize:"11px", color:"#4a5a7a" }}>KES {fmtK(cat.revenue)}</span>
                    <span style={{ ...M, fontSize:"11px", color:clr(cat.vsAvg), minWidth:"44px", textAlign:"right", fontWeight:500 }}>{sign(cat.vsAvg)}%</span>
                  </div>
                </div>
                <div style={{ background:"#1b2a42", height:"3px", borderRadius:"2px", overflow:"hidden" }}>
                  <div className="rs-bar" style={{ height:"3px", borderRadius:"2px", background:cat.vsAvg >= 0 ? "#34d399" : "#f87171", width: barsReady ? `${(cat.revenue/maxRev)*100}%` : "0%" }} />
                </div>
              </div>
            ))}
          </div>

          {/* Right column */}
          <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>

            {/* Stock position */}
            <div className="rs-card" style={{ padding:"20px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"7px", marginBottom:"14px" }}>
                <div style={{ width:"7px", height:"7px", borderRadius:"50%",
                  background: DATA.stockout.length ? "#f87171" : "#34d399",
                  boxShadow: DATA.stockout.length ? "0 0 7px #f87171" : "0 0 7px #34d399" }} />
                <div style={{ ...LBL, color: DATA.stockout.length ? "#f87171" : "#34d399", marginBottom:0 }}>
                  {DATA.stockout.length ? "Stockout Alerts" : "Stock Position"}
                </div>
              </div>
              {DATA.stockout.length === 0 && (
                <div style={{ fontSize:"12px", color:"#4a5a7a" }}>All tracked SKUs above 4 days of cover.</div>
              )}
              {DATA.stockout.map((s) => (
                <div key={s.sku} className="rs-alert-row">
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:"12px", color:"#e2ddd5" }}>{s.sku}</span>
                    <span style={{ ...M, fontSize:"14px", color:"#f87171", fontWeight:500 }}>{s.coverDays}d</span>
                  </div>
                  <div style={{ fontSize:"10px", color:"#4a5a7a", marginTop:"3px" }}>{s.vendor}</div>
                </div>
              ))}
            </div>

            {/* Customer intelligence */}
            <div className="rs-card" style={{ padding:"20px" }}>
              <div style={LBL}>Customer Intelligence</div>
              {[
                { label:"Loyalty Return Rate (7d)", value:`${DATA.customers.loyaltyReturn}%`,    sub:`avg ${DATA.customers.loyaltyReturnAvg}%`, pos:loyaltyPos },
                { label:"New Customers",            value:DATA.customers.newCustomers,           sub:`${sign(DATA.customers.newCustomersVsAvg)}% vs avg`, pos:DATA.customers.newCustomersVsAvg >= 0 },
                { label:"Loyalty vs Non-Loyalty Basket", value:`KES ${DATA.customers.avgBasketLoyalty}`, sub:`vs KES ${DATA.customers.avgBasketNonLoyalty}`, pos:null },
              ].map((row, i) => (
                <div key={i}>
                  {i > 0 && <hr className="rs-hr" />}
                  <div style={{ fontSize:"10px", color:"#3a4d6a", marginBottom:"4px" }}>{row.label}</div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                    <span style={{ ...M, fontSize:"16px", color: row.pos === true ? "#34d399" : row.pos === false ? "#f87171" : "#e2ddd5" }}>{row.value}</span>
                    <span style={{ fontSize:"10px", color:"#3a4d6a" }}>{row.sub}</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

        <div style={{ marginTop:"28px", textAlign:"center", ...M, fontSize:"10px", color:"#1b2838" }}>
          RetailSignal Prototype · Demo build · Simulated branch data · Intelligence computed from pre-aggregated summaries
        </div>

      </div>
    </div>
  );
}