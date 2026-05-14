// src/pages/RiskWorkbench.jsx
import { useState, useEffect, useRef } from "react";
import "../styles/workbench.css";
import {
  mockEvents,
  getSummaryStats,
  EVENT_TYPES,
  STATUS,
} from "../data/mockEvents";

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatDateTime(iso) {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

function riskClass(level) {
  return `wb-risk--${level}`;
}

function scoreClass(level) {
  return `wb-score-value--${level}`;
}

// ─── Sub-components ────────────────────────────────────────────────────────

function RiskPill({ level, score }) {
  return (
    <span className={`wb-risk-pill ${riskClass(level)}`}>
      <span className={`wb-risk-dot wb-risk-dot--${level}`} />
      {score}
    </span>
  );
}

function StatusBadge({ status }) {
  const labels = {
    pending: "Pending",
    in_review: "In Review",
    resolved: "Resolved",
    escalated: "Escalated",
  };
  return (
    <span className={`wb-badge wb-badge--status-${status}`}>
      {labels[status] ?? status}
    </span>
  );
}

function TypeBadge({ type }) {
  return (
    <span className={`wb-badge wb-badge--${type === EVENT_TYPES.TRANSACTION ? "txn" : "onb"}`}>
      {type === EVENT_TYPES.TRANSACTION ? "TXN" : "ONB"}
    </span>
  );
}

// ─── Worklist card ─────────────────────────────────────────────────────────

function EventCard({ event, selected, onClick }) {
  return (
    <div
      className={`wb-event-card ${selected ? "selected" : ""}`}
      onClick={onClick}
    >
      <div className="wb-event-card-top">
        <div className="wb-event-card-badges">
          <TypeBadge type={event.type} />
          <StatusBadge status={event.status} />
        </div>
        <RiskPill level={event.riskLevel} score={event.riskScore} />
      </div>
      <div className="wb-event-card-name">{event.customer.name}</div>
      <div className="wb-event-card-meta">
        {event.id} · {formatTime(event.createdAt)}
      </div>
    </div>
  );
}

// ─── Overview tab ──────────────────────────────────────────────────────────

function CollapsibleRaw({ title, data }) {
  const [open, setOpen] = useState(false);
  if (!data) return null;
  return (
    <div className="wb-collapsible">
      <button className="wb-collapsible-trigger" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span className={`wb-collapsible-arrow ${open ? "open" : ""}`}>▼</span>
      </button>
      {open && (
        <div className="wb-collapsible-body">
          {JSON.stringify(data, null, 2)}
        </div>
      )}
    </div>
  );
}

function OverviewTab({ event }) {
  const { customer, signals, riskLevel, plaidData, transunionData, internalData } = event;

  return (
    <div className="wb-tab-content">
      <div className="wb-overview-grid">
        {/* Left col — signals */}
        <div>
          <div className="wb-panel">
            <div className="wb-panel-header">
              Risk Signals
              <span className="wb-panel-count">{signals.length}</span>
            </div>
            <div className="wb-signal-list">
              {signals.map((sig) => (
                <div key={sig.id} className={`wb-signal wb-signal--${sig.severity}`}>
                  <span className="wb-signal-dot" />
                  <div className="wb-signal-body">
                    <div className="wb-signal-label">{sig.label}</div>
                    <div className="wb-signal-detail">{sig.detail}</div>
                    <div className="wb-signal-source">Source: {sig.source}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Raw data collapsibles */}
          <CollapsibleRaw title="Plaid Data" data={plaidData} />
          <CollapsibleRaw title="TransUnion Data" data={transunionData} />
          <CollapsibleRaw title="Internal Data" data={internalData} />
        </div>

        {/* Right col — customer info */}
        <div>
          <div className="wb-panel">
            <div className="wb-panel-header">Customer</div>
            <div className="wb-info-list">
              {[
                ["ID",         customer.id],
                ["Email",      customer.email],
                ["Phone",      customer.phone],
                ["Acct Age",   customer.accountAge],
                ["KYC",        customer.kycStatus],
              ].map(([k, v]) => (
                <div className="wb-info-row" key={k}>
                  <span className="wb-info-key">{k}</span>
                  <span className="wb-info-val">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {transunionData && (
            <div className="wb-panel" style={{ marginTop: 12 }}>
              <div className="wb-panel-header">TransUnion</div>
              <div className="wb-info-list">
                {[
                  ["Score",       transunionData.creditScore ?? "N/A"],
                  ["Utilization", transunionData.utilization],
                  ["Inquiries",   `${transunionData.inquiriesLast90Days} (90d)`],
                  ["Oldest Acct", transunionData.oldestAccount],
                  ["Thin File",   transunionData.thin ? "Yes" : "No"],
                ].map(([k, v]) => (
                  <div className="wb-info-row" key={k}>
                    <span className="wb-info-key">{k}</span>
                    <span className="wb-info-val">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {internalData && (
            <div className="wb-panel" style={{ marginTop: 12 }}>
              <div className="wb-panel-header">Internal</div>
              <div className="wb-info-list">
                {[
                  ["Prior Flags",    internalData.previousFlags],
                  ["Devices Seen",   internalData.devicesSeen],
                  ["Linked Accts",   internalData.linkedAccounts],
                  ["Failed Logins",  internalData.failedLoginAttempts],
                  ["Chargebacks",    internalData.chargebackHistory],
                  ...(internalData.vpnDetected !== undefined
                    ? [["VPN Detected", internalData.vpnDetected ? "Yes" : "No"]]
                    : []),
                ].map(([k, v]) => (
                  <div className="wb-info-row" key={k}>
                    <span className="wb-info-key">{k}</span>
                    <span className="wb-info-val">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AI Brief tab ──────────────────────────────────────────────────────────

function buildPrompt(event) {
  return `You are a senior fraud analyst AI assistant. Analyze the following risk event and produce a structured analyst brief.

EVENT SUMMARY:
- Event ID: ${event.id}
- Type: ${event.type === "transaction" ? "Transaction" : "Onboarding"}
- Customer: ${event.customer.name} (${event.customer.email})
- Account Age: ${event.customer.accountAge}
- KYC Status: ${event.customer.kycStatus}
- Risk Score: ${event.riskScore}/100
- Risk Level: ${event.riskLevel.toUpperCase()}
- Status: ${event.status}

RISK SIGNALS DETECTED:
${event.signals.map((s) => `- [${s.severity.toUpperCase()}] ${s.label}: ${s.detail} (Source: ${s.source})`).join("\n")}

TRANSUNION SUMMARY:
${event.transunionData ? `Credit Score: ${event.transunionData.creditScore ?? "N/A"}, Utilization: ${event.transunionData.utilization}, Inquiries (90d): ${event.transunionData.inquiriesLast90Days}, Thin File: ${event.transunionData.thin}, Oldest Account: ${event.transunionData.oldestAccount}` : "Not available (onboarding — no linked account yet)"}

INTERNAL DATA:
${event.internalData ? `Prior Flags: ${event.internalData.previousFlags}, Devices Seen: ${event.internalData.devicesSeen}, Linked Accounts: ${event.internalData.linkedAccounts}, Failed Logins: ${event.internalData.failedLoginAttempts}, VPN Detected: ${event.internalData.vpnDetected ?? "N/A"}` : "N/A"}

Produce a concise analyst brief with EXACTLY these four sections, using these exact headings:

### Why It Was Flagged
2-3 sentences. Be specific — reference the actual signals and data points. Explain what pattern or combination of signals drove the score.

### Recommended Action
1-2 sentences. Be direct. Tell the analyst exactly what to do next (e.g. freeze account, request step-up verification, escalate to fraud team, monitor, approve).

### Confidence Assessment
1 sentence. State your confidence level (High / Medium / Low) and briefly explain why (e.g. strength of signal corroboration, data availability).

### What To Look For Next
2-4 bullet points. Specific things the analyst should investigate or watch for in the next 24-48 hours.

Be concise, clinical, and direct. This is an operational tool — no preamble, no disclaimers.`;
}

function AiBriefTab({ event }) {
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [lastEventId, setLastEventId] = useState(null);
  const abortRef = useRef(null);

  // Reset when event changes
  useEffect(() => {
    if (event.id !== lastEventId) {
      setOutput("");
      setDone(false);
      setGeneratedAt(null);
      setLastEventId(event.id);
    }
  }, [event.id]);

  async function generate() {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setOutput("");
    setDone(false);
    setLoading(true);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          stream: true,
          messages: [{ role: "user", content: buildPrompt(event) }],
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              setOutput((prev) => prev + parsed.delta.text);
            }
          } catch {}
        }
      }

      setDone(true);
      setGeneratedAt(new Date().toISOString());
    } catch (err) {
      if (err.name !== "AbortError") {
        setOutput("Error generating brief. Check your API key in the environment config.");
        setDone(true);
      }
    } finally {
      setLoading(false);
    }
  }

  // Render markdown-lite: ### headings and bullet points
  function renderOutput(text) {
    if (!text) return null;
    return text.split("\n").map((line, i) => {
      if (line.startsWith("### ")) {
        return <h3 key={i}>{line.slice(4)}</h3>;
      }
      if (line.startsWith("- ")) {
        return <p key={i}>• {line.slice(2)}</p>;
      }
      if (line.trim() === "") return <br key={i} />;
      return <p key={i}>{line}</p>;
    });
  }

  return (
    <div className="wb-tab-content">
      <div className="wb-brief-wrap">
        <button
          className="wb-brief-trigger"
          onClick={generate}
          disabled={loading}
        >
          <span className="wb-brief-trigger-icon">✦</span>
          {loading ? "Generating brief..." : done ? "Regenerate Brief" : "Generate AI Analyst Brief"}
        </button>

        {(output || loading) && (
          <div className="wb-brief-output">
            {renderOutput(output)}
            {loading && <span className="wb-brief-cursor" />}
          </div>
        )}

        {done && generatedAt && (
          <div className="wb-brief-meta">
            <span>Generated {formatDateTime(generatedAt)}</span>
            <span>Model: claude-sonnet-4-20250514</span>
            <span>Event: {event.id}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Timeline tab ──────────────────────────────────────────────────────────

function TimelineTab({ event }) {
  return (
    <div className="wb-tab-content">
      <div className="wb-timeline">
        {event.customerTimeline.map((item, i) => (
          <div key={i} className="wb-timeline-item">
            <span className={`wb-timeline-dot wb-timeline-dot--${item.type}`} />
            <div className="wb-timeline-date">{item.date}</div>
            <div className="wb-timeline-event">{item.event}</div>
            <div className="wb-timeline-detail">{item.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Detail panel ──────────────────────────────────────────────────────────

function DetailPanel({ event }) {
  const [activeTab, setActiveTab] = useState("overview");

  // Reset tab when event changes
  useEffect(() => { setActiveTab("overview"); }, [event.id]);

  return (
    <div className="wb-main" style={{ display: "flex", flexDirection: "column" }}>
      <div className="wb-detail-header">
        <div className="wb-detail-header-top">
          <div className="wb-detail-header-left">
            <div className="wb-detail-header-badges">
              <TypeBadge type={event.type} />
              <StatusBadge status={event.status} />
              <span className="wb-detail-id">{event.id}</span>
            </div>
            <div className="wb-detail-name">{event.customer.name}</div>
            <div className="wb-detail-email">{event.customer.email}</div>
          </div>

          <div className="wb-score-display">
            <span className="wb-score-label">Risk Score</span>
            <span className={`wb-score-value ${scoreClass(event.riskLevel)}`}>
              {event.riskScore}
            </span>
            <div className="wb-score-bar-wrap">
              <div
                className={`wb-score-bar wb-score-bar--${event.riskLevel}`}
                style={{ width: `${event.riskScore}%` }}
              />
            </div>
          </div>
        </div>

        <div className="wb-tabs">
          {[
            { id: "overview",  label: "Overview" },
            { id: "ai-brief",  label: "✦ AI Brief" },
            { id: "timeline",  label: "Timeline" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`wb-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview"  && <OverviewTab event={event} />}
      {activeTab === "ai-brief"  && <AiBriefTab event={event} />}
      {activeTab === "timeline"  && <TimelineTab event={event} />}
    </div>
  );
}

// ─── Root component ────────────────────────────────────────────────────────

export default function RiskWorkbench() {
  const stats = getSummaryStats();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [now, setNow] = useState(new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const filtered = mockEvents.filter((e) => {
    if (filter === "txn" && e.type !== EVENT_TYPES.TRANSACTION) return false;
    if (filter === "onb" && e.type !== EVENT_TYPES.ONBOARDING) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        e.customer.name.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        e.riskLevel.includes(q) ||
        e.status.includes(q)
      );
    }
    return true;
  });

  const selectedEvent = mockEvents.find((e) => e.id === selectedId);

  return (
    <div className="wb-root">

      {/* Header */}
      <header className="wb-header">
        <div className="wb-header-brand">
          <div className="wb-header-logo">R</div>
          <span className="wb-header-name">Risk Workbench</span>
        </div>

        <div className="wb-header-divider" />

        <div className="wb-stats-bar">
          <div className="wb-stat wb-stat--total">
            <span className="wb-stat-value">{stats.totalFlagged}</span>
            <span className="wb-stat-label">Flagged</span>
          </div>
          <div className="wb-stat wb-stat--critical">
            <span className="wb-stat-value">{stats.critical}</span>
            <span className="wb-stat-label">Critical</span>
          </div>
          <div className="wb-stat wb-stat--pending">
            <span className="wb-stat-value">{stats.pending}</span>
            <span className="wb-stat-label">Pending</span>
          </div>
          <div className="wb-stat wb-stat--review">
            <span className="wb-stat-value">{stats.inReview}</span>
            <span className="wb-stat-label">In Review</span>
          </div>
          <div className="wb-stat wb-stat--escalated">
            <span className="wb-stat-value">{stats.escalated}</span>
            <span className="wb-stat-label">Escalated</span>
          </div>
        </div>

        <div className="wb-header-time">
          {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          {" · "}
          {now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
      </header>

      {/* Body */}
      <div className="wb-body">

        {/* Sidebar */}
        <aside className="wb-sidebar">
          <div className="wb-sidebar-toolbar">
            <div className="wb-filter-tabs">
              {[
                { id: "all", label: "All" },
                { id: "txn", label: "Transactions" },
                { id: "onb", label: "Onboardings" },
              ].map((f) => (
                <button
                  key={f.id}
                  className={`wb-filter-tab ${filter === f.id ? "active" : ""}`}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="wb-search">
              <span className="wb-search-icon">⌕</span>
              <input
                type="text"
                className="wb-search-input"
                placeholder="Search name, ID, risk level..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="wb-worklist">
            {filtered.length === 0 ? (
              <div className="wb-worklist-empty">No events match your filter.</div>
            ) : (
              filtered.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  selected={event.id === selectedId}
                  onClick={() => setSelectedId(event.id)}
                />
              ))
            )}
          </div>
        </aside>

        {/* Main */}
        {selectedEvent ? (
          <DetailPanel event={selectedEvent} />
        ) : (
          <div className="wb-main">
            <div className="wb-empty-state">
              <div className="wb-empty-state-icon">⊡</div>
              <p>Select an event from the queue to begin review</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
