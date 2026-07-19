import React, { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Activity } from '../types/crm';
import { activityTypeColor, activityTypeBg, formatRelativeTime } from '../utils/crm';

interface TimelineCardProps {
  activity: Activity;
  icon: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}

export function TimelineCard({ activity, icon, children, actions }: TimelineCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className={`flex gap-4 ${activity.status === 'Completed' ? 'opacity-60' : ''}`}>
      {/* Timeline dot and line */}
      <div className="flex flex-col items-center">
        <div className={`${activityTypeBg(activity.type)} p-2 rounded-full border border-current ${activityTypeColor(activity.type)}`}>
          {icon}
        </div>
        <div className="w-0.5 h-12 bg-gradient-to-b from-current to-transparent mt-2 opacity-30" />
      </div>

      {/* Card content */}
      <div className="flex-1 pb-4">
        <div className={`bg-[#1a1a2e] border border-[#16213e] rounded-lg p-4 hover:border-blue-500/50 transition-all ${isExpanded ? 'ring-1 ring-blue-500/50' : ''}`}>
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-semibold text-white">{activity.type}</p>
              <p className="text-sm text-gray-400">{formatRelativeTime(activity.date)}</p>
            </div>
            {activity.status === 'Completed' && (
              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">Completed</span>
            )}
          </div>

          {/* Description */}
          <p className={`text-sm text-gray-300 ${activity.status === 'Completed' ? 'line-through' : ''}`}>
            {activity.description}
          </p>

          {/* Related entities */}
          {(activity.linkedLeadName || activity.linkedOpportunityName) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {activity.linkedLeadName && (
                <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                  Lead: {activity.linkedLeadName}
                </span>
              )}
              {activity.linkedOpportunityName && (
                <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
                  Opp: {activity.linkedOpportunityName}
                </span>
              )}
            </div>
          )}

          {/* Expanded details */}
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-[#16213e] space-y-3 text-sm">
              {children}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#16213e]">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                {activity.ownerName?.charAt(0).toUpperCase()}
              </div>
              {activity.ownerName}
            </div>

            <div className="flex items-center gap-2">
              {actions}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
