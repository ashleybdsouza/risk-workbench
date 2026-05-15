// src/pages/RiskWorkbench.jsx
import { useState, useEffect, useRef } from "react";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from "recharts";
import "../styles/workbench.css";
import {
  mockEvents,
  getSummaryStats,
  EVENT_TYPES,
  STATUS,
} from "../data/mockEvents";
import { mockBriefs } from "../data/mockBriefs";
import {
  getRiskDistribution,
  getEventTypeSplit,
  getStatusOverview,
  getTopSignals,
  getKycStats,
  getSummaryKpis,
  hourlyFlagVolume,
  weeklyFlagVolume,
} from "../data/dashboardData";

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
function formatTimeShort(iso) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  });
}
function riskClass(level)  { return `wb-risk--${level}`; }
function scoreClass(level) { return `wb-score-value--${level}`; }

// ─── Chart helpers ─────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="wb-tooltip">
      <div className="wb-tooltip-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="wb-tooltip-row">
          <span className="wb-tooltip-dot" style={{ background: p.color }} />
          <span>{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
}

const AXIS_STYLE = {
  tick: { fill: "#4a5168", fontSize: 10, fontFamily: "IBM Plex Mono" },
  axisLine: { stroke: "rgba(255,255,255,0.07)" },
  tickLine: false,
};

// ─── Analytics Dashboard ───────────────────────────────────────────────────

function Dashboard({ eventStatuses }) {
  const [volumeView, setVolumeView] = useState("today");

  const kpis       = getSummaryKpis(eventStatuses);
  const riskDist   = getRiskDistribution();
  const typeSplit  = getEventTypeSplit();
  const statusData = getStatusOverview(eventStatuses);
  const topSignals = getTopSignals();
  const kycStats   = getKycStats();
  const maxSignal  = Math.max(...topSignals.map((s) => s.count));
  const volumeData = volumeView === "today" ? hourlyFlagVolume : weeklyFlagVolume;
  const volumeKey  = volumeView === "today" ? "time" : "day";

  return (
    <div className="wb-dashboard">

      {/* KPI row */}
      <div className="wb-kpi-row">
        <div className="wb-kpi-card">
          <span className="wb-kpi-label">Total Flagged</span>
          <span className="wb-kpi-value">{kpis.totalFlagged}</span>
          <span className="wb-kpi-sub">across all queues</span>
        </div>
        <div className="wb-kpi-card">
          <span className="wb-kpi-label">Critical Events</span>
          <span className="wb-kpi-value wb-kpi-value--critical">{kpis.criticalCount}</span>
          <span className="wb-kpi-sub">require immediate action</span>
        </div>
        <div className="wb-kpi-card">
          <span className="wb-kpi-label">Avg Risk Score</span>
          <span className="wb-kpi-value wb-kpi-value--accent">{kpis.avgRiskScore}</span>
          <span className="wb-kpi-sub">out of 100</span>
        </div>
        <div className="wb-kpi-card">
          <span className="wb-kpi-label">Resolution Rate</span>
          <span className="wb-kpi-value wb-kpi-value--green">{kpis.resolutionRate}%</span>
          <span className="wb-kpi-sub">{kpis.resolved} of {kpis.totalFlagged} resolved</span>
        </div>
      </div>

      {/* Row 1 — three charts */}
      <div className="wb-chart-grid">

        {/* Risk distribution donut */}
        <div className="wb-chart-card">
          <div className="wb-chart-header">
            <span className="wb-chart-title">Risk Distribution</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={riskDist}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {riskDist.map((entry, i) => (
                  <Cell key={i} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend
                iconType="circle"
                iconSize={7}
                formatter={(value) => (
                  <span style={{ color: "#8b92a5", fontSize: 11, fontFamily: "IBM Plex Mono" }}>
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Event type split stacked bar */}
        <div className="wb-chart-card">
          <div className="wb-chart-header">
            <span className="wb-chart-title">Event Type Split</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeSplit} barSize={40}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" {...AXIS_STYLE} />
              <YAxis {...AXIS_STYLE} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="critical" name="Critical" stackId="a" fill="#ff3b3b" radius={[0,0,0,0]} />
              <Bar dataKey="high"     name="High"     stackId="a" fill="#ff8c00" />
              <Bar dataKey="medium"   name="Medium"   stackId="a" fill="#f5c400" />
              <Bar dataKey="low"      name="Low"      stackId="a" fill="#22c55e" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status overview horizontal */}
        <div className="wb-chart-card">
          <div className="wb-chart-header">
            <span className="wb-chart-title">Status Overview</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={statusData}
              layout="vertical"
              barSize={14}
              margin={{ left: 10 }}
            >
              <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" {...AXIS_STYLE} />
              <YAxis
                type="category"
                dataKey="name"
                width={70}
                tick={{ fill: "#8b92a5", fontSize: 11, fontFamily: "IBM Plex Mono" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name="Events" radius={[0, 3, 3, 0]}>
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2 — full-width volume chart */}
      <div className="wb-chart-grid" style={{ gridTemplateColumns: "1fr" }}>
        <div className="wb-chart-card">
          <div className="wb-chart-header">
            <span className="wb-chart-title">Flag Volume</span>
            <div className="wb-chart-toggle">
              <button
                className={`wb-chart-toggle-btn ${volumeView === "today" ? "active" : ""}`}
                onClick={() => setVolumeView("today")}
              >
                Today
              </button>
              <button
                className={`wb-chart-toggle-btn ${volumeView === "week" ? "active" : ""}`}
                onClick={() => setVolumeView("week")}
              >
                7 Days
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={volumeData} margin={{ right: 12 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey={volumeKey} {...AXIS_STYLE} interval={volumeView === "today" ? 3 : 0} />
              <YAxis {...AXIS_STYLE} />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="flags"
                name="Total Flags"
                stroke="#3b7fff"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#3b7fff" }}
              />
              <Line
                type="monotone"
                dataKey="critical"
                name="Critical"
                stroke="#ff3b3b"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                activeDot={{ r: 3, fill: "#ff3b3b" }}
              />
              <Line
                type="monotone"
                dataKey="high"
                name="High"
                stroke="#ff8c00"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                activeDot={{ r: 3, fill: "#ff8c00" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3 — signals + KYC */}
      <div className="wb-chart-grid wb-chart-grid--wide">

        {/* Top signals */}
        <div className="wb-chart-card">
          <div className="wb-chart-header">
            <span className="wb-chart-title">Top Signal Types</span>
          </div>
          <div className="wb-signal-bars">
            {topSignals.map((sig, i) => (
              <div key={i} className="wb-signal-bar-row">
                <span className="wb-signal-bar-label" title={sig.label}>{sig.label}</span>
                <div className="wb-signal-bar-track">
                  <div
                    className="wb-signal-bar-fill"
                    style={{ width: `${(sig.count / maxSignal) * 100}%` }}
                  />
                </div>
                <span className="wb-signal-bar-count">{sig.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* KYC stats */}
        <div className="wb-chart-card">
          <div className="wb-chart-header">
            <span className="wb-chart-title">KYC Status Breakdown</span>
          </div>
          <div className="wb-kyc-grid">
            <div>
              <div className="wb-kyc-section-label">Transactions</div>
              {[
                ["Verified", kycStats.transactions.verified, "verified"],
                ["Failed",   kycStats.transactions.failed,   "failed"],
                ["Pending",  kycStats.transactions.pending,  "pending"],
              ].map(([k, v, cls]) => (
                <div key={k} className="wb-kyc-row">
                  <span className="wb-kyc-key">{k}</span>
                  <span className={`wb-kyc-val wb-kyc-val--${cls}`}>{v}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="wb-kyc-section-label">Onboardings</div>
              {[
                ["Verified", kycStats.onboardings.verified, "verified"],
                ["Failed",   kycStats.onboardings.failed,   "failed"],
                ["Pending",  kycStats.onboardings.pending,  "pending"],
              ].map(([k, v, cls]) => (
                <div key={k} className="wb-kyc-row">
                  <span className="wb-kyc-key">{k}</span>
                  <span className={`wb-kyc-val wb-kyc-val--${cls}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// ─── Worklist card ─────────────────────────────────────────────────────────

function RiskPill({ level, score }) {
  return (
    <span className={`wb-risk-pill ${riskClass(level)}`}>
      <span className={`wb-risk-dot wb-risk-dot--${level}`} />
      {score}
    </span>
  );
}

function StatusBadge({ status }) {
  const labels = { pending: "Pending", in_review: "In Review", resolved: "Resolved", escalated: "Escalated" };
  return <span className={`wb-badge wb-badge--status-${status}`}>{labels[status] ?? status}</span>;
}

function TypeBadge({ type }) {
  return (
    <span className={`wb-badge wb-badge--${type === EVENT_TYPES.TRANSACTION ? "txn" : "onb"}`}>
      {type === EVENT_TYPES.TRANSACTION ? "TXN" : "ONB"}
    </span>
  );
}

function EventCard({ event, selected, onClick, overrideStatus }) {
  const status = overrideStatus ?? event.status;
  return (
    <div className={`wb-event-card ${selected ? "selected" : ""}`} onClick={onClick}>
      <div className="wb-event-card-top">
        <div className="wb-event-card-badges">
          <TypeBadge type={event.type} />
          <StatusBadge status={status} />
        </div>
        <RiskPill level={event.riskLevel} score={event.riskScore} />
      </div>
      <div className="wb-event-card-name">{event.customer.name}</div>
      <div className="wb-event-card-meta">{event.id} · {formatTime(event.createdAt)}</div>
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
      {open && <div className="wb-collapsible-body">{JSON.stringify(data, null, 2)}</div>}
    </div>
  );
}

function OverviewTab({ event }) {
  const { customer, signals, plaidData, transunionData, internalData } = event;
  return (
    <div className="wb-tab-content">
      <div className="wb-overview-grid">
        <div>
          <div className="wb-panel">
            <div className="wb-panel-header">
              Risk Signals <span className="wb-panel-count">{signals.length}</span>
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
          <CollapsibleRaw title="Plaid Data"       data={plaidData} />
          <CollapsibleRaw title="TransUnion Data"  data={transunionData} />
          <CollapsibleRaw title="Internal Data"    data={internalData} />
        </div>
        <div>
          <div className="wb-panel">
            <div className="wb-panel-header">Customer</div>
            <div className="wb-info-list">
              {[["ID", customer.id], ["Email", customer.email], ["Phone", customer.phone],
                ["Acct Age", customer.accountAge], ["KYC", customer.kycStatus]].map(([k, v]) => (
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
                {[["Score", transunionData.creditScore ?? "N/A"],
                  ["Utilization", transunionData.utilization],
                  ["Inquiries", `${transunionData.inquiriesLast90Days} (90d)`],
                  ["Oldest Acct", transunionData.oldestAccount],
                  ["Thin File", transunionData.thin ? "Yes" : "No"]].map(([k, v]) => (
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
                {[["Prior Flags", internalData.previousFlags],
                  ["Devices Seen", internalData.devicesSeen],
                  ["Linked Accts", internalData.linkedAccounts],
                  ["Failed Logins", internalData.failedLoginAttempts],
                  ["Chargebacks", internalData.chargebackHistory],
                  ...(internalData.vpnDetected !== undefined
                    ? [["VPN Detected", internalData.vpnDetected ? "Yes" : "No"]] : [])
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

function AiBriefTab({ event }) {
  const [output, setOutput]           = useState("");
  const [loading, setLoading]         = useState(false);
  const [done, setDone]               = useState(false);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [lastEventId, setLastEventId] = useState(null);
  const timeoutsRef                   = useRef([]);

  useEffect(() => {
    if (event.id !== lastEventId) {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      setOutput(""); setDone(false); setGeneratedAt(null);
      setLastEventId(event.id);
    }
  }, [event.id]);

  function generate() {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setOutput(""); setDone(false); setLoading(true);
    const brief = mockBriefs[event.id] ?? "No pre-generated brief available for this event.";
    let i = 0;
    function typeNext() {
      if (i >= brief.length) {
        setLoading(false); setDone(true); setGeneratedAt(new Date().toISOString()); return;
      }
      setOutput((prev) => prev + brief.slice(i, i + 3));
      i += 3;
      const t = setTimeout(typeNext, brief[i] === "\n" ? 30 : 12);
      timeoutsRef.current.push(t);
    }
    timeoutsRef.current.push(setTimeout(typeNext, 200));
  }

  function renderOutput(text) {
    if (!text) return null;
    return text.split("\n").map((line, i) => {
      if (line.startsWith("### ")) return <h3 key={i}>{line.slice(4)}</h3>;
      if (line.startsWith("• ") || line.startsWith("- ")) return <p key={i}>• {line.slice(2)}</p>;
      if (line.trim() === "") return <br key={i} />;
      return <p key={i}>{line}</p>;
    });
  }

  return (
    <div className="wb-tab-content">
      <div className="wb-brief-wrap">
        <button className="wb-brief-trigger" onClick={generate} disabled={loading}>
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

// ─── Analyst Actions panel ─────────────────────────────────────────────────

function AnalystActionsPanel({ event, eventStatuses, onStatusChange, notes, onAddNote }) {
  const [noteText, setNoteText] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [shaking, setShaking]   = useState(false);
  const textareaRef             = useRef(null);

  const currentStatus = eventStatuses[event.id] ?? event.status;
  const isActioned    = currentStatus === STATUS.RESOLVED || currentStatus === STATUS.ESCALATED;
  const eventNotes    = notes[event.id] ?? [];

  useEffect(() => { setNoteText(""); setShowHint(false); }, [event.id]);

  function requireNote() {
    if (!noteText.trim()) {
      setShowHint(true); setShaking(true);
      textareaRef.current?.focus();
      setTimeout(() => setShaking(false), 400);
      return false;
    }
    return true;
  }

  function handleResolve() {
    if (!requireNote()) return;
    onAddNote(event.id, noteText.trim(), "resolved");
    onStatusChange(event.id, STATUS.RESOLVED);
    setNoteText(""); setShowHint(false);
  }

  function handleEscalate() {
    if (!requireNote()) return;
    onAddNote(event.id, noteText.trim(), "escalated");
    onStatusChange(event.id, STATUS.ESCALATED);
    setNoteText(""); setShowHint(false);
  }

  function handleSaveNote() {
    if (!noteText.trim()) return;
    onAddNote(event.id, noteText.trim(), "note");
    setNoteText("");
  }

  return (
    <div className="wb-actions-panel">
      <div className="wb-actions-header">Analyst Actions · {event.id}</div>

      {eventNotes.length > 0 && (
        <div className="wb-notes-log">
          {eventNotes.map((note, i) => (
            <div key={i} className={`wb-note-entry ${note.type !== "note" ? "wb-note-entry--action" : ""}`}>
              <span className="wb-note-entry-meta">{formatTimeShort(note.timestamp)}</span>
              <span className="wb-note-entry-text">
                {note.type === "resolved"  && "✓ Resolved — "}
                {note.type === "escalated" && "↑ Escalated — "}
                {note.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {isActioned && (
        <div className={`wb-actioned-badge wb-actioned-badge--${currentStatus}`}>
          {currentStatus === STATUS.RESOLVED  && "✓ Resolved"}
          {currentStatus === STATUS.ESCALATED && "↑ Escalated to fraud team"}
          <span style={{ fontWeight: 400, opacity: 0.7, marginLeft: 6 }}>— add further notes above</span>
        </div>
      )}

      <div className="wb-actions-row">
        <div className="wb-note-input-wrap">
          <textarea
            ref={textareaRef}
            className={`wb-note-input ${shaking ? "required-shake" : ""}`}
            placeholder={isActioned ? "Add a follow-up note..." : "Add a note — required before resolving or escalating..."}
            value={noteText}
            onChange={(e) => { setNoteText(e.target.value); if (e.target.value.trim()) setShowHint(false); }}
            rows={2}
          />
          <span className={`wb-note-required-hint ${showHint ? "visible" : ""}`}>
            A note is required before taking action.
          </span>
        </div>
        <div className="wb-action-buttons">
          {!isActioned && (
            <>
              <button className="wb-action-btn wb-action-btn--resolve"  onClick={handleResolve}>✓ Resolve</button>
              <button className="wb-action-btn wb-action-btn--escalate" onClick={handleEscalate}>↑ Escalate</button>
            </>
          )}
          <button className="wb-action-btn wb-action-btn--save-note" onClick={handleSaveNote} disabled={!noteText.trim()}>
            + Note
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail panel ──────────────────────────────────────────────────────────

function DetailPanel({ event, eventStatuses, onStatusChange, notes, onAddNote }) {
  const [activeTab, setActiveTab] = useState("overview");
  useEffect(() => { setActiveTab("overview"); }, [event.id]);
  const currentStatus = eventStatuses[event.id] ?? event.status;

  return (
    <div className="wb-main" style={{ display: "flex", flexDirection: "column" }}>
      <div className="wb-detail-header">
        <div className="wb-detail-header-top">
          <div className="wb-detail-header-left">
            <div className="wb-detail-header-badges">
              <TypeBadge type={event.type} />
              <StatusBadge status={currentStatus} />
              <span className="wb-detail-id">{event.id}</span>
            </div>
            <div className="wb-detail-name">{event.customer.name}</div>
            <div className="wb-detail-email">{event.customer.email}</div>
          </div>
          <div className="wb-score-display">
            <span className="wb-score-label">Risk Score</span>
            <span className={`wb-score-value ${scoreClass(event.riskLevel)}`}>{event.riskScore}</span>
            <div className="wb-score-bar-wrap">
              <div className={`wb-score-bar wb-score-bar--${event.riskLevel}`} style={{ width: `${event.riskScore}%` }} />
            </div>
          </div>
        </div>
        <div className="wb-tabs">
          {[{ id: "overview", label: "Overview" }, { id: "ai-brief", label: "✦ AI Brief" }, { id: "timeline", label: "Timeline" }].map((tab) => (
            <button key={tab.id} className={`wb-tab ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {activeTab === "overview" && <OverviewTab event={event} />}
        {activeTab === "ai-brief" && <AiBriefTab event={event} />}
        {activeTab === "timeline" && <TimelineTab event={event} />}
      </div>
      <AnalystActionsPanel
        event={event}
        eventStatuses={eventStatuses}
        onStatusChange={onStatusChange}
        notes={notes}
        onAddNote={onAddNote}
      />
    </div>
  );
}

// ─── Root component ────────────────────────────────────────────────────────

export default function RiskWorkbench() {
  const stats                             = getSummaryStats();
  const [view, setView]                   = useState("queue");   // "queue" | "dashboard"
  const [filter, setFilter]               = useState("all");
  const [search, setSearch]               = useState("");
  const [selectedId, setSelectedId]       = useState(null);
  const [now, setNow]                     = useState(new Date());
  const [eventStatuses, setEventStatuses] = useState({});
  const [notes, setNotes]                 = useState({});

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  function handleStatusChange(eventId, newStatus) {
    setEventStatuses((prev) => ({ ...prev, [eventId]: newStatus }));
  }

  function handleAddNote(eventId, text, type) {
    setNotes((prev) => ({
      ...prev,
      [eventId]: [...(prev[eventId] ?? []), { text, type, timestamp: new Date().toISOString() }],
    }));
  }

  const liveStats = {
    ...stats,
    pending:   mockEvents.filter((e) => (eventStatuses[e.id] ?? e.status) === STATUS.PENDING).length,
    inReview:  mockEvents.filter((e) => (eventStatuses[e.id] ?? e.status) === STATUS.IN_REVIEW).length,
    escalated: mockEvents.filter((e) => (eventStatuses[e.id] ?? e.status) === STATUS.ESCALATED).length,
  };

  const filtered = mockEvents.filter((e) => {
    if (filter === "txn" && e.type !== EVENT_TYPES.TRANSACTION) return false;
    if (filter === "onb" && e.type !== EVENT_TYPES.ONBOARDING)  return false;
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

        {/* Nav toggle */}
        <div style={{ display: "flex", gap: 6 }}>
          <button
            className={`wb-header-nav-btn ${view === "queue" ? "active" : ""}`}
            onClick={() => setView("queue")}
          >
            Queue
          </button>
          <button
            className={`wb-header-nav-btn ${view === "dashboard" ? "active" : ""}`}
            onClick={() => setView("dashboard")}
          >
            Dashboard
          </button>
        </div>

        <div className="wb-header-divider" />

        <div className="wb-stats-bar">
          {[
            { cls: "total",    val: liveStats.totalFlagged, label: "Flagged" },
            { cls: "critical", val: liveStats.critical,     label: "Critical" },
            { cls: "pending",  val: liveStats.pending,      label: "Pending" },
            { cls: "review",   val: liveStats.inReview,     label: "In Review" },
            { cls: "escalated",val: liveStats.escalated,    label: "Escalated" },
          ].map(({ cls, val, label }) => (
            <div key={label} className={`wb-stat wb-stat--${cls}`}>
              <span className="wb-stat-value">{val}</span>
              <span className="wb-stat-label">{label}</span>
            </div>
          ))}
        </div>

        <div className="wb-header-time">
          {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          {" · "}
          {now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
      </header>

      {/* Body */}
      {view === "dashboard" ? (
        <Dashboard eventStatuses={eventStatuses} />
      ) : (
        <div className="wb-body">
          {/* Sidebar */}
          <aside className="wb-sidebar">
            <div className="wb-sidebar-toolbar">
              <div className="wb-filter-tabs">
                {[{ id: "all", label: "All" }, { id: "txn", label: "Transactions" }, { id: "onb", label: "Onboardings" }].map((f) => (
                  <button key={f.id} className={`wb-filter-tab ${filter === f.id ? "active" : ""}`} onClick={() => setFilter(f.id)}>
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
                    overrideStatus={eventStatuses[event.id]}
                  />
                ))
              )}
            </div>
          </aside>

          {/* Main */}
          {selectedEvent ? (
            <DetailPanel
              event={selectedEvent}
              eventStatuses={eventStatuses}
              onStatusChange={handleStatusChange}
              notes={notes}
              onAddNote={handleAddNote}
            />
          ) : (
            <div className="wb-main">
              <div className="wb-empty-state">
                <div className="wb-empty-state-icon">⊡</div>
                <p>Select an event from the queue to begin review</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
