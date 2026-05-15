// src/data/dashboardData.js
// All chart data for the analytics dashboard.
// Some is derived from mockEvents, some is simulated historical data.

import { mockEvents, RISK_LEVELS, EVENT_TYPES, STATUS } from "./mockEvents";

// ─── Derived from live mockEvents ─────────────────────────────────────────

export function getRiskDistribution() {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  mockEvents.forEach((e) => counts[e.riskLevel]++);
  return [
    { name: "Critical", value: counts.critical, color: "#ff3b3b" },
    { name: "High",     value: counts.high,     color: "#ff8c00" },
    { name: "Medium",   value: counts.medium,   color: "#f5c400" },
    { name: "Low",      value: counts.low,      color: "#22c55e" },
  ];
}

export function getEventTypeSplit() {
  const txn = mockEvents.filter((e) => e.type === EVENT_TYPES.TRANSACTION);
  const onb = mockEvents.filter((e) => e.type === EVENT_TYPES.ONBOARDING);

  function countByRisk(events) {
    return {
      critical: events.filter((e) => e.riskLevel === RISK_LEVELS.CRITICAL).length,
      high:     events.filter((e) => e.riskLevel === RISK_LEVELS.HIGH).length,
      medium:   events.filter((e) => e.riskLevel === RISK_LEVELS.MEDIUM).length,
      low:      events.filter((e) => e.riskLevel === RISK_LEVELS.LOW).length,
    };
  }

  return [
    { name: "Transactions", ...countByRisk(txn) },
    { name: "Onboardings",  ...countByRisk(onb) },
  ];
}

export function getStatusOverview(eventStatuses = {}) {
  const counts = { pending: 0, in_review: 0, escalated: 0, resolved: 0 };
  mockEvents.forEach((e) => {
    const status = eventStatuses[e.id] ?? e.status;
    if (counts[status] !== undefined) counts[status]++;
  });
  return [
    { name: "Pending",   value: counts.pending,   color: "#f5c400" },
    { name: "In Review", value: counts.in_review,  color: "#3b7fff" },
    { name: "Escalated", value: counts.escalated,  color: "#ff3b3b" },
    { name: "Resolved",  value: counts.resolved,   color: "#22c55e" },
  ];
}

export function getTopSignals() {
  const counts = {};
  mockEvents.forEach((e) => {
    e.signals.forEach((s) => {
      counts[s.label] = (counts[s.label] ?? 0) + 1;
    });
  });
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);
}

export function getKycStats() {
  const txn = mockEvents.filter((e) => e.type === EVENT_TYPES.TRANSACTION);
  const onb = mockEvents.filter((e) => e.type === EVENT_TYPES.ONBOARDING);

  function kyc(events) {
    return {
      verified: events.filter((e) => e.customer.kycStatus === "verified").length,
      failed:   events.filter((e) => e.customer.kycStatus === "failed").length,
      pending:  events.filter((e) => e.customer.kycStatus === "pending").length,
    };
  }

  return { transactions: kyc(txn), onboardings: kyc(onb) };
}

// ─── Simulated historical data ────────────────────────────────────────────

// Today hourly — simulates a realistic fraud ops morning pattern:
// quiet overnight, ramps up at 6am, peaks at 9-10am, plateaus through day
export const hourlyFlagVolume = [
  { time: "00:00", flags: 2,  critical: 0, high: 1 },
  { time: "01:00", flags: 1,  critical: 0, high: 0 },
  { time: "02:00", flags: 3,  critical: 1, high: 1 },
  { time: "03:00", flags: 1,  critical: 0, high: 1 },
  { time: "04:00", flags: 2,  critical: 1, high: 0 },
  { time: "05:00", flags: 4,  critical: 0, high: 2 },
  { time: "06:00", flags: 8,  critical: 1, high: 3 },
  { time: "07:00", flags: 14, critical: 2, high: 5 },
  { time: "08:00", flags: 22, critical: 3, high: 8 },
  { time: "09:00", flags: 31, critical: 4, high: 11 },
  { time: "10:00", flags: 28, critical: 3, high: 9 },
  { time: "11:00", flags: 24, critical: 2, high: 8 },
  { time: "12:00", flags: 19, critical: 2, high: 6 },
  { time: "13:00", flags: 21, critical: 3, high: 7 },
  { time: "14:00", flags: 18, critical: 1, high: 6 },
  { time: "15:00", flags: 16, critical: 2, high: 5 },
  { time: "16:00", flags: 13, critical: 1, high: 4 },
  { time: "17:00", flags: 9,  critical: 1, high: 3 },
  { time: "18:00", flags: 7,  critical: 0, high: 2 },
  { time: "19:00", flags: 5,  critical: 1, high: 2 },
  { time: "20:00", flags: 4,  critical: 0, high: 1 },
  { time: "21:00", flags: 3,  critical: 0, high: 1 },
  { time: "22:00", flags: 2,  critical: 0, high: 1 },
  { time: "23:00", flags: 1,  critical: 0, high: 0 },
];

// Last 7 days — shows a realistic weekly pattern with a spike mid-week
export const weeklyFlagVolume = [
  { day: "Mon May 7",  flags: 98,  critical: 12, high: 34 },
  { day: "Tue May 8",  flags: 112, critical: 15, high: 41 },
  { day: "Wed May 9",  flags: 143, critical: 21, high: 58 },
  { day: "Thu May 10", flags: 129, critical: 18, high: 49 },
  { day: "Fri May 11", flags: 137, critical: 19, high: 52 },
  { day: "Sat May 12", flags: 74,  critical: 8,  high: 28 },
  { day: "Sun May 13", flags: 61,  critical: 7,  high: 22 },
];

// ─── Summary KPIs ─────────────────────────────────────────────────────────

export function getSummaryKpis(eventStatuses = {}) {
  const resolved = mockEvents.filter(
    (e) => (eventStatuses[e.id] ?? e.status) === STATUS.RESOLVED
  ).length;

  const totalFlagged   = mockEvents.length;
  const criticalCount  = mockEvents.filter((e) => e.riskLevel === RISK_LEVELS.CRITICAL).length;
  const avgRiskScore   = Math.round(
    mockEvents.reduce((sum, e) => sum + e.riskScore, 0) / mockEvents.length
  );
  const resolutionRate = Math.round((resolved / totalFlagged) * 100);

  return { totalFlagged, criticalCount, avgRiskScore, resolutionRate, resolved };
}
