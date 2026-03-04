// TeamAnalysis.js - Refactored to use centralized data from the hook
import React, { useMemo, useState } from 'react';
import { User, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

export default function TeamAnalysis({ data, setDetailModal }) {
  const { developerData = [] } = data || {};
  
  const [sortBy, setSortBy] = useState('pending');
  const [sortOrder, setSortOrder] = useState('desc');

  const sortedDeveloperData = useMemo(() => {
    const sorted = [...developerData];
    sorted.sort((a, b) => {
      let aVal = a[sortBy] ?? 0;
      let bVal = b[sortBy] ?? 0;
      
      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [developerData, sortBy, sortOrder]);

  const handleHeaderClick = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const SortableHeader = ({ column, label }) => (
    <th 
      onClick={() => handleHeaderClick(column)}
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {sortBy === column && (
          <span className="text-sm">
            {sortOrder === 'asc' ? '▲' : '▼'}
          </span>
        )}
      </div>
    </th>
  );

  if (!developerData || developerData.length === 0) {
    return (
      <div className="executive-card p-8 text-center bg-amber-50 border-2 border-amber-300">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-amber-900 mb-2">No Developer Data</h3>
        <p className="text-amber-800 mb-6 text-base">
          No developer data is available for the current filter selection.
        </p>
      </div>
    );
  }

  const totalBugs = sortedDeveloperData.reduce((sum, d) => sum + d.totalBugs, 0);
  const totalPending = sortedDeveloperData.reduce((sum, d) => sum + d.pending, 0);
  const totalResolved = sortedDeveloperData.reduce((sum, d) => sum + d.resolved, 0);
  const overallEfficiency = totalBugs > 0 ? Math.round((totalResolved / totalBugs) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="executive-card text-center">
          <User className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{sortedDeveloperData.length}</div>
          <div className="text-sm text-gray-600">Active Developers</div>
        </div>
        <div className="executive-card text-center">
          <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{totalBugs}</div>
          <div className="text-sm text-gray-600">Total Assigned Bugs</div>
        </div>
        <div className="executive-card text-center">
          <TrendingUp className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{totalResolved}</div>
          <div className="text-sm text-gray-600">Resolved</div>
        </div>
        <div className="executive-card text-center">
          <TrendingDown className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{totalPending}</div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
      </div>

      {/* Detailed Developer Analysis Table */}
      <div className="executive-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Developer Performance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableHeader column="name" label="Developer" />
                <SortableHeader column="totalBugs" label="Total Bugs" />
                <SortableHeader column="pending" label="Pending" />
                <SortableHeader column="resolved" label="Resolved" />
                <SortableHeader column="efficiency" label="Efficiency" />
                <SortableHeader column="workload" label="Workload" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedDeveloperData.map((dev, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
                        {(dev.name || 'NA').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{dev.name || 'Unassigned'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{dev.totalBugs}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-bold">{dev.pending}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-bold">{dev.resolved}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{dev.efficiency}%</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${dev.efficiency}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      dev.workload === 'High' ? 'bg-red-100 text-red-800' :
                      dev.workload === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {dev.workload}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}