import React, { useState } from 'react';
import { useActivities, useCreateActivity, useUpdateActivity, useDeleteActivity, useMarkActivityComplete } from '../../hooks/useCrmApi';
import { Modal } from '../../components/Modal';
import { TimelineCard } from '../../components/TimelineCard';
import { FilterSidebar, FilterSelect, FilterDateRange } from '../../components/FilterSidebar';
import { Activity, ActivityType } from '../../types/crm';
import { formatINR, formatDateTime, debounce } from '../../utils/crm';
import { Plus, Search, Filter, Phone, Mail, Users, CheckSquare, FileText, Trash2, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

const activitySchema = z.object({
  type: z.enum(['Call', 'Email', 'Meeting', 'Task', 'Note']),
  description: z.string().min(1, 'Description required'),
  linkedLeadId: z.string().optional(),
  linkedOpportunityId: z.string().optional(),
  date: z.string().min(1, 'Date required'),
  ownerId: z.string().min(1, 'Owner required'),
  outcome: z.enum(['Not Set', 'Positive', 'Neutral', 'Negative', 'Interested', 'Not Interested', 'Callback', 'No Answer']).optional(),
  notes: z.string().optional(),
  priority: z.enum(['High', 'Medium', 'Low']).optional(),
  duration: z.number().optional(),
  subject: z.string().optional(),
  emailAddress: z.string().optional(),
  attendees: z.string().optional(),
  location: z.string().optional(),
  dueDate: z.string().optional(),
});

type ActivityForm = z.infer<typeof activitySchema>;

const activityIcons: Record<ActivityType, React.ReactNode> = {
  Call: <Phone size={16} />,
  Email: <Mail size={16} />,
  Meeting: <Users size={16} />,
  Task: <CheckSquare size={16} />,
  Note: <FileText size={16} />,
};

export function ActivitiesPage({ tenantId }: { tenantId: string }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [isNewActivityOpen, setIsNewActivityOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [selectedActivityType, setSelectedActivityType] = useState<ActivityType>('Call');

  const { data: activitiesData, isLoading, error } = useActivities(tenantId, { ...filters, searchQuery }, { page, pageSize: 30 });
  const createMut = useCreateActivity();
  const updateMut = useUpdateActivity();
  const deleteMut = useDeleteActivity();
  const completeMut = useMarkActivityComplete();

  const formMethods = useForm<ActivityForm>({
    resolver: zodResolver(activitySchema),
    defaultValues: { type: 'Call' },
  });

  const activities = activitiesData?.data || [];
  const totalActivities = activitiesData?.total || 0;

  const handleSearchChange = debounce((q: string) => {
    setSearchQuery(q);
    setPage(1);
  }, 300);

  const onSubmitActivity = async (data: ActivityForm) => {
    try {
      if (editingActivity) {
        await updateMut.mutateAsync({ id: editingActivity.id, ...data } as any);
        toast.success('Activity updated');
      } else {
        await createMut.mutateAsync({
          tenantId,
          ...data,
          attendees: data.attendees ? data.attendees.split(',') : null,
        } as any);
        toast.success('Activity created');
      }
      setIsNewActivityOpen(false);
      setEditingActivity(null);
      formMethods.reset();
    } catch (err) {
      toast.error('Failed to save activity');
    }
  };

  const handleMarkComplete = async (id: string) => {
    try {
      await completeMut.mutateAsync(id);
      toast.success('Activity completed');
    } catch (err) {
      toast.error('Failed to mark complete');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e27]">
      {/* Header */}
      <div className="bg-[#1a1a2e] border-b border-[#16213e] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Activities</h1>
            <p className="text-gray-400">{totalActivities} activities</p>
          </div>
          <button
            onClick={() => {
              setEditingActivity(null);
              formMethods.reset({ type: 'Call' });
              setSelectedActivityType('Call');
              setIsNewActivityOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            New Activity
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-140px)]">
        {/* Filter sidebar */}
        <FilterSidebar
          isOpen={filterOpen}
          onClose={() => setFilterOpen(false)}
          onApply={() => setFilterOpen(false)}
          onReset={() => setFilters({})}
        >
          <FilterSelect
            label="Type"
            value={filters.type?.[0] || ''}
            options={[
              { value: 'Call', label: 'Call' },
              { value: 'Email', label: 'Email' },
              { value: 'Meeting', label: 'Meeting' },
              { value: 'Task', label: 'Task' },
              { value: 'Note', label: 'Note' },
            ]}
            onChange={(val) => setFilters({ ...filters, type: [val] })}
          />
          <FilterSelect
            label="Status"
            value={filters.status || ''}
            options={[
              { value: 'Completed', label: 'Completed' },
              { value: 'Pending', label: 'Pending' },
              { value: 'Cancelled', label: 'Cancelled' },
            ]}
            onChange={(val) => setFilters({ ...filters, status: val })}
          />
          <FilterDateRange
            label="Date Range"
            startDate={filters.dateRange?.[0] || ''}
            endDate={filters.dateRange?.[1] || new Date().toISOString().split('T')[0]}
            onStartDateChange={(d) => setFilters({ ...filters, dateRange: [d, filters.dateRange?.[1] || ''] })}
            onEndDateChange={(d) => setFilters({ ...filters, dateRange: [filters.dateRange?.[0] || '', d] })}
          />
        </FilterSidebar>

        {/* Main content */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Search bar */}
          <div className="mb-6 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search activities..."
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#1a1a2e] border border-[#16213e] rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setFilterOpen(true)}
              className="md:hidden px-4 py-2 bg-[#1a1a2e] border border-[#16213e] rounded-lg text-white hover:border-blue-500/50"
            >
              <Filter size={18} />
            </button>
          </div>

          {error && <div className="text-red-400 mb-4">Error loading activities</div>}

          {isLoading && <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" /></div>}

          {!isLoading && activities.length === 0 && (
            <div className="flex items-center justify-center h-64 text-gray-400">No activities found</div>
          )}

          {/* Timeline */}
          {!isLoading && activities.length > 0 && (
            <div className="space-y-4 max-w-2xl">
              {activities.map((activity: Activity) => (
                <TimelineCard
                  key={activity.id}
                  activity={activity}
                  icon={activityIcons[activity.type as ActivityType]}
                  actions={
                    <div className="flex gap-1">
                      {activity.status === 'Pending' && (
                        <button
                          onClick={() => handleMarkComplete(activity.id)}
                          className="p-1 text-green-400 hover:bg-green-500/10 rounded transition-colors"
                          title="Mark complete"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingActivity(activity);
                          setSelectedActivityType(activity.type);
                          formMethods.reset({
                            type: activity.type,
                            description: activity.description,
                            linkedLeadId: activity.linkedLeadId || undefined,
                            linkedOpportunityId: activity.linkedOpportunityId || undefined,
                            date: activity.date,
                            ownerId: activity.ownerId,
                            outcome: activity.outcome,
                            notes: activity.notes,
                            priority: activity.priority || undefined,
                            duration: activity.duration || undefined,
                            subject: activity.subject || undefined,
                            emailAddress: activity.emailAddress || undefined,
                            attendees: activity.attendees?.join(', ') || undefined,
                            location: activity.location || undefined,
                            dueDate: activity.dueDate || undefined,
                          });
                          setIsNewActivityOpen(true);
                        }}
                        className="p-1 text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                        title="Edit"
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Delete this activity?')) {
                            await deleteMut.mutateAsync(activity.id);
                            toast.success('Activity deleted');
                          }
                        }}
                        className="p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  }
                >
                  {activity.outcome && (
                    <div>
                      <p className="text-xs text-gray-400">Outcome</p>
                      <p className="text-sm text-white">{activity.outcome}</p>
                    </div>
                  )}
                  {activity.duration && (
                    <div>
                      <p className="text-xs text-gray-400">Duration</p>
                      <p className="text-sm text-white">{activity.duration} minutes</p>
                    </div>
                  )}
                  {activity.priority && (
                    <div>
                      <p className="text-xs text-gray-400">Priority</p>
                      <p className={`text-sm font-medium ${
                        activity.priority === 'High' ? 'text-red-400' :
                        activity.priority === 'Medium' ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>{activity.priority}</p>
                    </div>
                  )}
                  {activity.notes && (
                    <div>
                      <p className="text-xs text-gray-400">Notes</p>
                      <p className="text-sm text-white">{activity.notes}</p>
                    </div>
                  )}
                </TimelineCard>
              ))}
            </div>
          )}

          {/* Pagination */}
          {activities.length > 0 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-[#1a1a2e] border border-[#16213e] rounded-lg text-white disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-gray-400">Page {page}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={activities.length < 30}
                className="px-4 py-2 bg-[#1a1a2e] border border-[#16213e] rounded-lg text-white disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New/Edit Activity Modal */}
      <Modal
        isOpen={isNewActivityOpen}
        onClose={() => {
          setIsNewActivityOpen(false);
          setEditingActivity(null);
          formMethods.reset({ type: 'Call' });
        }}
        title={editingActivity ? 'Edit Activity' : 'New Activity'}
        size="lg"
      >
        <form onSubmit={formMethods.handleSubmit(onSubmitActivity)} className="space-y-4 max-h-96 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-white mb-1">Type *</label>
            <select
              {...formMethods.register('type')}
              onChange={(e) => {
                formMethods.setValue('type', e.target.value as ActivityType);
                setSelectedActivityType(e.target.value as ActivityType);
              }}
              className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
            >
              <option value="Call">Call</option>
              <option value="Email">Email</option>
              <option value="Meeting">Meeting</option>
              <option value="Task">Task</option>
              <option value="Note">Note</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Description *</label>
            <textarea
              {...formMethods.register('description')}
              className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white h-16 resize-none"
              placeholder="Activity description"
            />
            {formMethods.formState.errors.description && (
              <p className="text-red-400 text-xs mt-1">{formMethods.formState.errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">Date *</label>
              <input
                {...formMethods.register('date')}
                type="datetime-local"
                className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Owner *</label>
              <input
                {...formMethods.register('ownerId')}
                className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
                placeholder="Owner ID"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">Related Lead</label>
              <input
                {...formMethods.register('linkedLeadId')}
                className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
                placeholder="Lead ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Related Opportunity</label>
              <input
                {...formMethods.register('linkedOpportunityId')}
                className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
                placeholder="Opp ID"
              />
            </div>
          </div>

          {selectedActivityType === 'Call' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Duration (minutes)</label>
                  <input
                    {...formMethods.register('duration', { valueAsNumber: true })}
                    type="number"
                    className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Outcome</label>
                  <select
                    {...formMethods.register('outcome')}
                    className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
                  >
                    <option value="Not Set">Not Set</option>
                    <option value="Interested">Interested</option>
                    <option value="Not Interested">Not Interested</option>
                    <option value="Callback">Callback</option>
                    <option value="No Answer">No Answer</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {selectedActivityType === 'Email' && (
            <>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Subject</label>
                <input
                  {...formMethods.register('subject')}
                  className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
                  placeholder="Email subject"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Email Address</label>
                <input
                  {...formMethods.register('emailAddress')}
                  type="email"
                  className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
                  placeholder="recipient@example.com"
                />
              </div>
            </>
          )}

          {selectedActivityType === 'Meeting' && (
            <>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Location</label>
                <input
                  {...formMethods.register('location')}
                  className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
                  placeholder="Meeting location"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Attendees (comma-separated)</label>
                <input
                  {...formMethods.register('attendees')}
                  className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
                  placeholder="Name1, Name2, Name3"
                />
              </div>
            </>
          )}

          {selectedActivityType === 'Task' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Due Date</label>
                  <input
                    {...formMethods.register('dueDate')}
                    type="date"
                    className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Priority</label>
                  <select
                    {...formMethods.register('priority')}
                    className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white"
                  >
                    <option value="">None</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-white mb-1">Notes</label>
            <textarea
              {...formMethods.register('notes')}
              className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white h-16 resize-none"
              placeholder="Add notes..."
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingActivity ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsNewActivityOpen(false);
                setEditingActivity(null);
                formMethods.reset({ type: 'Call' });
              }}
              className="flex-1 px-4 py-2 bg-[#16213e] text-white rounded-lg hover:bg-[#16213e]/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
