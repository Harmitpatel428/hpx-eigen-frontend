import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Phone, Mail, FileText, CheckCircle2, Plus, Calendar } from 'lucide-react';
import type { Activity } from '../types';
import { activityService } from '../services/activity.service';

const ICONS: Record<string, React.ReactNode> = { 
  CALL: <Phone size={14} />, 
  EMAIL: <Mail size={14} />, 
  MEETING: <Calendar size={14} />, 
  NOTE: <FileText size={14} />, 
  TASK: <CheckCircle2 size={14} /> 
};

function TimelineGroup({ title, activities }: { title: string, activities: Activity[] }) {
  if (activities.length === 0) return null;
  return (
    <div style={{ marginBottom: 'var(--space-12)' }}>
      <h3 className="type-h2" style={{ marginBottom: 'var(--space-6)', position: 'relative', display: 'flex', alignItems: 'center' }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--color-accent)', backgroundColor: 'var(--bg-app)', position: 'absolute', left: -26 }} />
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', position: 'relative' }}>
        {activities.map((act) => (
          <div key={act.id} style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'flex-start', position: 'relative' }}>
            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', backgroundColor: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0, zIndex: 1, border: '1px solid var(--bg-app)', marginLeft: -36 }}>
              {ICONS[act.type]}
            </div>
            <div className="surface" style={{ flex: 1, padding: 'var(--space-5)', cursor: 'pointer', transition: 'all var(--transition-fast)' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                <div className="type-h2" style={{ fontSize: 16 }}>{act.subject}</div>
                <div className="type-micro" style={{ color: 'var(--text-tertiary)' }}>{new Date(act.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              {act.notes && <div className="type-body" style={{ marginBottom: 'var(--space-4)' }}>{act.notes}</div>}
              
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <span className="chip">{act.type}</span>
                {act.completedAt ? (
                  <span className="chip" style={{ backgroundColor: 'var(--color-success)', color: 'var(--text-inverse)' }}>Completed</span>
                ) : (
                  <span className="chip" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)' }}>Action Required</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActivitiesPage() {
  const [typeFilter, setTypeFilter] = useState('ALL');

  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: ['activities', typeFilter],
    queryFn: () => activityService.findAll({ type: typeFilter !== 'ALL' ? typeFilter : undefined }),
  });

  const sorted = [...activities].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const now = new Date();
  const todayStr = now.toLocaleDateString();
  
  const todayActs = sorted.filter(a => !a.completedAt && new Date(a.createdAt).toLocaleDateString() === todayStr);
  const completedActs = sorted.filter(a => !!a.completedAt);
  const otherActs = sorted.filter(a => !a.completedAt && new Date(a.createdAt).toLocaleDateString() !== todayStr);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-12)' }}>
        <div>
          <h1 className="type-title" style={{ marginBottom: 'var(--space-2)' }}>Activities</h1>
          <p className="type-body">Timeline of interactions</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-primary">
            <Plus size={16} /> Log Activity
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-12)' }}>
        {['ALL', 'CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK'].map(type => (
          <button 
            key={type}
            onClick={() => setTypeFilter(type)}
            className="type-ui"
            style={{ 
              padding: '6px 16px', 
              borderRadius: 'var(--radius-full)', 
              backgroundColor: typeFilter === type ? 'var(--bg-app)' : 'transparent',
              color: typeFilter === type ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: typeFilter === type ? '1px solid var(--border-medium)' : '1px solid transparent',
              transition: 'all var(--transition-fast)'
            }}
          >
            {type === 'ALL' ? 'Everything' : type.charAt(0) + type.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading timeline...</div>
      ) : sorted.length === 0 ? (
        <div style={{ padding: 'var(--space-24) 0', textAlign: 'center' }}>
          <div className="type-h2" style={{ marginBottom: 'var(--space-2)' }}>No activities recorded</div>
          <div className="type-body" style={{ color: 'var(--text-tertiary)' }}>Log your first call, email, or meeting.</div>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 'var(--space-8)' }}>
          {/* Vertical timeline spine */}
          <div style={{ position: 'absolute', left: 19, top: 0, bottom: 0, width: 2, backgroundColor: 'var(--border-light)' }} />
          
          <TimelineGroup title="Today" activities={todayActs} />
          <TimelineGroup title="Upcoming & Overdue" activities={otherActs} />
          <TimelineGroup title="Completed" activities={completedActs} />
        </div>
      )}
    </div>
  );
}
