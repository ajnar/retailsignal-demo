import { useState, useEffect } from "react";

// ── SIMULATED BRANCH DATA ─────────────────────────────────────────────────────
const BRANCH = {
  name: "Westlands Branch",
  manager: "Joyce Wanjiku",
  role: "Branch Manager",
  region: "Nairobi Central Region",
};

const yesterday = new Date(Date.now() - 86400000);
const DATE_LABEL = yesterday.toLocaleDateString("en-KE", {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
});

const DATA = {
  revenue:      { value: 1243500, sevenDayAvg: 1156000, budget: 1200000, lastYear: 1098000 },
  transactions: { value: 2847,    sevenDayAvg: 2710 },
  basketSize:   { value: 436.7,   sevenDayAvg: 426.5 },
  categories: [
    { name: "Fresh Produce",  revenue: 312000, vsAvg:  18.3 },
    { name: "Dry Groceries",  revenue: 287000, vsAvg:   4.2 },
    { name: "Household",      revenue: 245000, vsAvg:   2.8 },
    { name: "Beverages",      revenue: 198000, vsAvg:  -3.1 },
    { name: "Personal Care",  revenue: 201500, vsAvg:  -8.7 },
  ],
  stockout: [
    { sku: "Cooking Oil 3L",  coverDays: 1.2, vendor: "Bidco Africa" },
    { sku: "Baby Diapers L",  coverDays: 1.8, vendor: "P&G Kenya"   },
    { sku: "Maize Flour 2kg", coverDays: 2.1, vendor: "Unga Group"  },
  ],
  customers: {
    loyaltyReturn: 34.2, loyaltyReturnAvg: 29.8,
    newCustomers: 143,   newCustomersVsAvg: 12.3,
    avgBasketLoyalty: 612, avgBasketNonLoyalty: 298,
  },
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const pct  = (v, base) => (((v - base) / base) * 100).toFixed(1);
const fmtK = (n) => n >= 1e6 ? `${(n/1e6).toFixed(2)}M` : `${(n/1000).toFixed(0)}K`;
const sign = (n) => Number(n) >= 0 ? `+${n}` : `${n}`;
const clr  = (n) => Number(n) >= 0 ? "#34d399" : "#f87171";

// ── PROMPT BUILDER ────────────────────────────────────────────────────────────
function buildPrompt() {
  const top   = [...DATA.categories].sort((a, b) => b.vsAvg - a.vsAvg)[0];
  const worst = [...DATA.categories].sort((a, b) => a.vsAvg - b.vsAvg)[0];
  return `Write a morning intelligence briefing for ${BRANCH.manager}, Branch Manager at ${BRANCH.name}. Date: ${DATE_LABEL}.

PERFORMANCE SNAPSHOT:
Revenue: KES ${fmtK(DATA.revenue.value)} | vs 7-day avg: ${sign(pct(DATA.revenue.value, DATA.revenue.sevenDayAvg))}% | vs budget: ${sign(pct(DATA.revenue.value, DATA.revenue.budget))}% | vs last year: ${sign(pct(DATA.revenue.value, DATA.revenue.lastYear))}%
Transactions: ${DATA.transactions.value.toLocaleString()} (${sign(pct(DATA.transactions.value, DATA.transactions.sevenDayAvg))}% vs avg)
Basket size: KES ${DATA.basketSize.value} (${sign(pct(DATA.basketSize.value, DATA.basketSize.sevenDayAvg))}% vs avg)
Strongest category: ${top.name} at ${sign(top.vsAvg)}% vs average
Weakest category: ${worst.name} at ${sign(worst.vsAvg)}% vs average

STOCKOUT ALERTS — URGENT:
${DATA.stockout.map(s => `- ${s.sku}: only ${s.coverDays} days of stock remaining (vendor: ${s.vendor})`).join("\n")}

CUSTOMER INTELLIGENCE:
Loyalty return rate (7-day): ${DATA.customers.loyaltyReturn}% vs branch avg ${DATA.customers.loyaltyReturnAvg}%
New customers yesterday: ${DATA.customers.newCustomers} (${sign(DATA.customers.newCustomersVsAvg)}% vs avg)
Loyalty basket: KES ${DATA.customers.avgBasketLoyalty} vs non-loyalty KES ${DATA.customers.avgBasketNonLoyalty}

Write exactly 3 short paragraphs addressed directly to Joyce.
Para 1: What drove yesterday — be specific about the biggest mover and what might explain it.
Para 2: What needs her direct attention today — the stockout situation is urgent.
Para 3: One customer or basket insight worth carrying through the day.
Tone: trusted senior colleague, warm but direct. Under 190 words total. No bullets. No headers. No jargon.`;
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
`;

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [briefing,  setBriefing]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [barsReady, setBarsReady] = useState(false);
  const [apiKey,    setApiKey]    = useState("");

  useEffect(() => {
    const style = Object.assign(document.createElement("style"), { textContent: CSS });
    document.head.append(style);
    setTimeout(() => setBarsReady(true), 400);
    return () => style.remove();
  }, []);

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
          model:      "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system:     "You are a senior retail intelligence analyst writing daily briefings for branch managers. Write like a trusted advisor who studied every number overnight — warm, specific, direct. No bullet points. No headers. Flowing paragraphs only.",
          messages:   [{ role: "user", content: buildPrompt() }],
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

  const M   = { fontFamily: "'DM Mono', monospace" };
  const LBL = { fontSize:"10px", color:"#3a4d6a", textTransform:"uppercase", letterSpacing:"0.07em", fontFamily:"'DM Mono',monospace", marginBottom:"8px" };

  return (
    <div style={{ background:"#080c18", minHeight:"100vh", fontFamily:"'DM Sans',sans-serif", color:"#e2ddd5" }}>

      {/* Header */}
      <div style={{ borderBottom:"1px solid #1b2a42", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
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

        {/* Role badge */}
        <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"22px" }}>
          <span style={{ background:"rgba(245,158,11,0.10)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:"4px", padding:"4px 10px", fontSize:"10px", ...M, color:"#f59e0b", textTransform:"uppercase", letterSpacing:"0.07em" }}>
            ⬡ {BRANCH.role}
          </span>
          <span style={{ fontSize:"11px", color:"#3a4d6a" }}>{BRANCH.region}</span>
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
            <div className="rs-fadein" style={{ fontFamily:"'Playfair Display',serif", fontSize:"15.5px", lineHeight:"1.95", color:"#ccc8bf" }}>
              {briefing.split(/\n\n+/).filter(Boolean).map((para, i) => (
                <p key={i} style={{ marginBottom: i < 2 ? "18px" : 0 }}>{para}</p>
              ))}
            </div>
          )}
        </div>

        {/* KPI row */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"12px", marginBottom:"14px" }}>
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
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>

          {/* Categories */}
          <div className="rs-card" style={{ padding:"20px" }}>
            <div style={LBL}>Category Revenue & Trend</div>
            {sortedCats.map((cat, i) => (
              <div key={i} style={{ marginBottom:"14px" }}>
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

            {/* Stockout alerts */}
            <div className="rs-card" style={{ padding:"20px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"7px", marginBottom:"14px" }}>
                <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:"#f87171", boxShadow:"0 0 7px #f87171" }} />
                <div style={{ ...LBL, color:"#f87171", marginBottom:0 }}>Stockout Alerts</div>
              </div>
              {DATA.stockout.map((s, i) => (
                <div key={i} className="rs-alert-row">
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
                { label:"Loyalty Return Rate (7d)", value:`${DATA.customers.loyaltyReturn}%`,    sub:`avg ${DATA.customers.loyaltyReturnAvg}%`, pos:true },
                { label:"New Customers",            value:DATA.customers.newCustomers,           sub:`${sign(DATA.customers.newCustomersVsAvg)}% vs avg`, pos:true },
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
          RetailSignal Prototype · Demo build · Intelligence computed from pre-aggregated branch summaries
        </div>

      </div>
    </div>
  );
}
