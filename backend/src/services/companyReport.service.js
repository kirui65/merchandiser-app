function timestampMillis(value) {
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  if (value && typeof value._seconds === 'number') return value._seconds * 1000;
  if (typeof value === 'number') return value;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildCompanyReport({ sales, activations, leads, audits, teams, from, to, campaignId, regionId }) {
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const matches = (record, dateValue) => {
    const time = timestampMillis(dateValue);
    return Number.isFinite(time)
      && time >= from
      && time <= to
      && (!campaignId || record.campaignId === campaignId)
      && (!regionId || teamById.get(record.teamId)?.regionId === regionId);
  };
  const filteredSales = sales.filter((record) => matches(record, record.timestamp));
  const filteredActivations = activations.filter((record) => matches(record, record.startedAt));
  const filteredLeads = leads.filter((record) => matches(record, record.createdAt));
  const filteredAudits = audits.filter((record) => matches(record, record.observedAt));

  return {
    sales: {
      count: filteredSales.length,
      total: Number(filteredSales.reduce((sum, record) => sum + Number(record.total || 0), 0).toFixed(2)),
    },
    activations: {
      count: filteredActivations.length,
      footfallCount: filteredActivations.reduce((sum, record) => sum + Number(record.footfallCount || 0), 0),
    },
    leads: {
      count: filteredLeads.length,
      byStatus: Object.fromEntries(['new', 'contacted', 'qualified', 'converted', 'not_interested', 'closed']
        .map((status) => [status, filteredLeads.filter((lead) => lead.status === status).length])),
    },
    merchandisingAudits: {
      count: filteredAudits.length,
      lowStockChecks: filteredAudits.reduce((sum, record) => sum
        + (record.stockChecks || []).filter((check) => check.lowStock).length, 0),
      compliantPlanograms: filteredAudits.filter((record) => record.planogram?.compliant === true).length,
    },
  };
}

module.exports = { buildCompanyReport };
