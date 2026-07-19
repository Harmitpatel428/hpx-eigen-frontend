import React, { useState } from 'react';
import { usePipelineAnalytics } from '../../hooks/useCrmApi';
import { PipelineAnalytics } from '../../types/crm';
import { formatINR } from '../../utils/crm';
import {
  LineChart, Line, BarChart, Bar, FunnelChart, Funnel, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, Area, AreaChart
} from 'recharts';
import { TrendingUp, Target, Percent, DollarSign } from 'lucide-react';

export function PipelineAnalyticsPage({ tenantId }: { tenantId: string }) {
  const [owner, setOwner] = useState<string | undefined>();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: analytics, isLoading, error } = usePipelineAnalytics(tenantId, {
    owner,
    dateRange: startDate && endDate ? [startDate, endDate] : undefined,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center">
        <div className="text-red-400">Failed to load analytics</div>
      </div>
    );
  }

  const data = analytics.data as PipelineAnalytics;

  return (
    <div className="min-h-screen bg-[#0a0e27] p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-4">Pipeline Analytics</h1>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Owner</label>
            <input
              type="text"
              value={owner || ''}
              onChange={(e) => setOwner(e.target.value || undefined)}
              className="px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white placeholder-gray-500"
              placeholder="Filter by owner"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <KPICard
          title="Total Pipeline"
          value={formatINR(data.totalPipelineValue)}
          icon={<DollarSign size={24} />}
          color="text-blue-400"
        />
        <KPICard
          title="Opportunities"
          value={String(data.opportunityCount)}
          icon={<Target size={24} />}
          color="text-purple-400"
        />
        <KPICard
          title="Avg Deal Size"
          value={formatINR(data.averageDealSize)}
          icon={<TrendingUp size={24} />}
          color="text-green-400"
        />
        <KPICard
          title="Win Rate"
          value={`${data.winRate.toFixed(1)}%`}
          icon={<Percent size={24} />}
          color="text-yellow-400"
        />
        <KPICard
          title="Forecast Value"
          value={formatINR(data.forecastValue)}
          icon={<DollarSign size={24} />}
          color="text-emerald-400"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Stage Velocity */}
        <div className="bg-[#1a1a2e] border border-[#16213e] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Stage Velocity (Avg Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={Object.entries(data.stageVelocity).map(([stage, days]) => ({ stage, days }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#16213e" />
              <XAxis dataKey="stage" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip
                contentStyle={{ backgroundColor: '#16213e', border: '1px solid #16213e' }}
                cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
              />
              <Bar dataKey="days" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                {Object.entries(data.stageVelocity).map(([_, days], idx) => {
                  const color = days < 30 ? '#10b981' : days < 60 ? '#f59e0b' : '#ef4444';
                  return <Cell key={`cell-${idx}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Win Rate Trend */}
        <div className="bg-[#1a1a2e] border border-[#16213e] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Win Rate Trend (12 months)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.winRateTrend}>
              <defs>
                <linearGradient id="colorWinRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#16213e" />
              <XAxis dataKey="month" stroke="#999" />
              <YAxis stroke="#999" domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#16213e', border: '1px solid #16213e' }}
                cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
              />
              <Area type="monotone" dataKey="winRate" stroke="#3b82f6" fillOpacity={1} fill="url(#colorWinRate)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Funnel Chart */}
      <div className="bg-[#1a1a2e] border border-[#16213e] rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Conversion Funnel</h2>
        <ResponsiveContainer width="100%" height={400}>
          <FunnelChart>
            <Tooltip
              contentStyle={{ backgroundColor: '#16213e', border: '1px solid #16213e' }}
              formatter={(value: any) => {
                if (typeof value === 'number') return `${value} deals`;
                return value;
              }}
            />
            <Funnel
              dataKey="count"
              data={data.funnelData.map((d) => ({
                name: d.stage,
                count: d.count,
                value: formatINR(d.value),
                conversion: `${d.conversionPercent.toFixed(0)}%`,
              }))}
            >
              {data.funnelData.map((_, idx) => (
                <Cell key={`cell-${idx}`} fill={getFunnelColor(idx, data.funnelData.length)} />
              ))}
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>

        {/* Funnel Details Table */}
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-sm text-gray-300">
            <thead>
              <tr className="border-b border-[#16213e]">
                <th className="text-left py-2 px-4">Stage</th>
                <th className="text-right py-2 px-4">Deals</th>
                <th className="text-right py-2 px-4">Value (₹)</th>
                <th className="text-right py-2 px-4">Conversion %</th>
              </tr>
            </thead>
            <tbody>
              {data.funnelData.map((item) => (
                <tr key={item.stage} className="border-b border-[#16213e] hover:bg-[#16213e]/50">
                  <td className="py-3 px-4">{item.stage}</td>
                  <td className="text-right py-3 px-4">{item.count}</td>
                  <td className="text-right py-3 px-4 font-semibold text-green-400">{formatINR(item.value)}</td>
                  <td className="text-right py-3 px-4">{item.conversionPercent.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPICard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-[#1a1a2e] border border-[#16213e] rounded-lg p-4">
      <div className={`${color} mb-2`}>{icon}</div>
      <p className="text-sm text-gray-400">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function getFunnelColor(index: number, total: number): string {
  const colors = [
    '#3b82f6',
    '#06b6d4',
    '#10b981',
    '#f59e0b',
    '#ef4444',
  ];
  return colors[Math.min(index, colors.length - 1)];
}
