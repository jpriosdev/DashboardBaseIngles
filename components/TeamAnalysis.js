// TeamAnalysis.js - Scaffold for Team Analysis tab
import React, { useMemo, useState } from 'react';
import ActionableRecommendations from './ActionableRecommendations';
import DetailModal from './DetailModal';

function TeamKpiCard({ title, value, sub, children }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
      {children}
    </div>
  );
}

export default function TeamAnalysis({ data, filteredSprintData }) {
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPayload, setModalPayload] = useState(null);

  const totals = useMemo(() => {
    if (!filteredSprintData || filteredSprintData.length === 0) return {};
    const totalBugs = filteredSprintData.reduce((s, it) => s + (it.bugs || it.bugs_encontrados || 0), 0);
    const totalTestCases = filteredSprintData.reduce((s, it) => s + (it.testCases || it.casosEjecutados || 0), 0);
    const avgResolution = Math.round((filteredSprintData.reduce((s, it) => s + (it.resolutionDays || 0), 0) / filteredSprintData.length) || 0);
    return { totalBugs, totalTestCases, avgResolution };
  }, [filteredSprintData]);

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Analysis</h2>
          <p className="text-sm text-gray-500">Team-level health, velocity and quality indicators</p>
        </div>

        <div className="flex items-center gap-3">
          <select className="border rounded px-2 py-1" value={selectedSprint || ''} onChange={e => setSelectedSprint(e.target.value)}>
            <option value="">All Sprints</option>
            {(filteredSprintData || []).map(s => (
              <option key={s.sprint || s.name} value={s.sprint || s.name}>{s.sprint || s.name}</option>
            ))}
          </select>
          <select className="border rounded px-2 py-1" value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}>
            <option>All</option>
            <option>Team A</option>
            <option>Team B</option>
          </select>
          <button className="bg-executive-600 text-white px-3 py-1 rounded">Export CSV</button>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <TeamKpiCard title="Velocity" value={data.velocity || '—'} sub="Completed / Planned" />
        <TeamKpiCard title="Throughput" value={data.throughput || '—'} sub="Tickets / week" />
        <TeamKpiCard title="Bug Rate" value={totals.totalBugs ?? '—'} sub="bugs / HU" />
        <TeamKpiCard title="Avg Resolution" value={`${totals.avgResolution || '—'} d`} sub="days" />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Main column */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-2">Team Timeline</h3>
            <div className="h-56 flex items-center justify-center text-gray-400">[Timeline chart placeholder]</div>
          </div>

          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-2">Ownership Heatmap</h3>
            <div className="h-48 flex items-center justify-center text-gray-400">[Heatmap placeholder]</div>
          </div>

          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-2">Recent Critical Issues</h3>
            <div className="text-sm text-gray-600">No critical issues in the current selection.</div>
          </div>
        </div>

        {/* Side column */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-2">Quality Trend</h3>
            <div className="h-40 flex items-center justify-center text-gray-400">[Quality trend chart]</div>
          </div>

          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-2">Actionable Recommendations</h3>
            <ActionableRecommendations data={data} filteredSprintData={filteredSprintData} />
          </div>

          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-2">Member Spotlight</h3>
            <div className="text-sm text-gray-600">Select a member to view metrics.</div>
          </div>
        </div>
      </div>

      {/* Tickets table placeholder */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-2">Tickets by Module</h3>
        <div className="h-40 flex items-center justify-center text-gray-400">[Table placeholder]</div>
      </div>

      {modalOpen && <DetailModal modal={modalPayload} onClose={() => setModalOpen(false)} />}
    </div>
  );
}
