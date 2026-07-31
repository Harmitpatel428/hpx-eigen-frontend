import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDepartments } from '../context/DepartmentContext';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import { Plus, Calendar, MoreHorizontal, Loader, AlertCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProjectStatus = 'ONBOARDING' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';
type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH';

/** Shape returned by GET /api/v1/process/projects */
interface ApiProject {
  id: string;
  title: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  dueDate: string | null;
  tag: string | null;
  description?: string | null;
  owner: { id: string };
  createdAt: string;
  updatedAt: string;
}

/** Internal UI model */
interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  dueDate?: string;
  tag?: string;
  assignee?: string;
}

function mapApiProject(p: ApiProject): Project {
  return {
    id: p.id,
    title: p.title,
    status: p.status,
    priority: p.priority,
    dueDate: p.dueDate ?? undefined,
    tag: p.tag ?? undefined,
    assignee: p.owner?.id?.slice(-4).toUpperCase() ?? '??',
  };
}

// ─── Column Config ────────────────────────────────────────────────────────────

const COLUMNS: { id: ProjectStatus; label: string; accent: string }[] = [
  { id: 'ONBOARDING', label: 'Onboarding', accent: '#3B82F6' },
  { id: 'IN_PROGRESS', label: 'In Progress', accent: '#F59E0B' },
  { id: 'REVIEW', label: 'Review', accent: '#8B5CF6' },
  { id: 'COMPLETED', label: 'Completed', accent: '#10B981' },
];

// ─── Skeleton Column ──────────────────────────────────────────────────────────

function SkeletonColumn({ label, accent }: { label: string; accent: string }) {
  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
        <span className="text-sm font-semibold text-[var(--text-primary)]">{label}</span>
      </div>
      <div className="flex-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-light)] p-2 flex flex-col gap-2 min-h-[200px]">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-lg bg-[var(--bg-muted)] animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// ─── Project Card ──────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: Project;
  isDragging?: boolean;
}

function ProjectCard({ project, isDragging = false }: ProjectCardProps) {
  const priorityDot = {
    HIGH: 'bg-red-500',
    MEDIUM: 'bg-amber-400',
    LOW: 'bg-blue-400',
  }[project.priority];

  return (
    <div
      className={`
        group bg-[var(--bg-app)] border border-[var(--border-light)] rounded-xl p-4
        transition-all duration-200
        ${isDragging
          ? 'shadow-2xl scale-[1.02] border-[var(--border-medium)] rotate-1 opacity-95'
          : 'shadow-sm hover:shadow-md hover:border-[var(--border-medium)] hover:-translate-y-0.5'
        }
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${priorityDot}`} />
          <p className="text-sm font-medium text-[var(--text-primary)] leading-snug">{project.title}</p>
        </div>
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-[var(--bg-muted)] text-[var(--text-tertiary)]"
          aria-label="More options"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          {project.tag && (
            <span className="text-[11px] font-medium text-[var(--text-tertiary)] bg-[var(--bg-muted)] px-2 py-0.5 rounded-full">
              {project.tag}
            </span>
          )}
          {project.dueDate && (
            <span className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
              <Calendar className="w-3 h-3" />
              {new Date(project.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
        {project.assignee && (
          <div className="w-6 h-6 rounded-full bg-[var(--bg-muted)] flex items-center justify-center text-[10px] font-semibold text-[var(--text-secondary)] flex-shrink-0">
            {project.assignee}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sortable Card Wrapper ─────────────────────────────────────────────────

function SortableCard({ project }: { project: Project }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: project.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded-xl">
      <ProjectCard project={project} />
    </div>
  );
}

// ─── Kanban Column ─────────────────────────────────────────────────────────

interface ColumnProps {
  columnId: ProjectStatus;
  label: string;
  accent: string;
  projects: Project[];
}

function KanbanColumn({ columnId, label, accent, projects }: ColumnProps) {
  return (
    <div className="flex flex-col w-72 flex-shrink-0 min-w-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
          <span className="text-sm font-semibold text-[var(--text-primary)]">{label}</span>
          <span className="text-xs text-[var(--text-tertiary)] font-medium bg-[var(--bg-muted)] px-2 py-0.5 rounded-full">
            {projects.length}
          </span>
        </div>
        <button
          aria-label={`Add project to ${label}`}
          className="p-1 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-all focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-light)] p-2 min-h-[200px] flex flex-col gap-2 transition-colors">
        <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
          {projects.map(project => (
            <SortableCard key={project.id} project={project} />
          ))}
        </SortableContext>

        {/* ─── Empty State ─── */}
        {projects.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-1 py-8">
            <p className="text-xs font-medium text-[var(--text-tertiary)]">No projects yet</p>
            <p className="text-[11px] text-[var(--text-tertiary)] opacity-70">Drag a card here or add one</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Process Dashboard ─────────────────────────────────────────────────────

export function ProcessDashboard() {
  const { activeDepartmentId } = useDepartments();
  const queryClient = useQueryClient();

  const { data: rawProjects, isLoading, isError } = useQuery({
    queryKey: ['process-projects', activeDepartmentId],
    queryFn: async (): Promise<Project[]> => {
      const res = await api.get<ApiProject[]>('/api/v1/process/projects');
      return res.data.map(mapApiProject);

      /* ── Offline dev mock (uncomment when backend is unavailable) ──
      await new Promise(r => setTimeout(r, 600));
      return [
        { id: 'p1', title: 'Client Onboarding – Apex Corp', status: 'ONBOARDING', priority: 'HIGH', dueDate: '2026-08-10', tag: 'Enterprise', assignee: 'AS' },
        { id: 'p2', title: 'KYC Document Verification', status: 'ONBOARDING', priority: 'MEDIUM', tag: 'Compliance', assignee: 'RK' },
        { id: 'p3', title: 'CRM Data Migration v2', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: '2026-08-15', tag: 'Technical', assignee: 'AS' },
        { id: 'p4', title: 'Q3 Pipeline Analytics', status: 'IN_PROGRESS', priority: 'MEDIUM', tag: 'Analytics', assignee: 'PR' },
        { id: 'p5', title: 'Security Audit – Q3 2026', status: 'REVIEW', priority: 'HIGH', dueDate: '2026-08-01', tag: 'Security', assignee: 'AS' },
        { id: 'p6', title: 'Onboarding Playbook v1', status: 'COMPLETED', priority: 'LOW', tag: 'Documentation', assignee: 'PR' },
      ];
      ── End mock ── */
    },
    staleTime: 30_000,
    enabled: !!activeDepartmentId,
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  React.useEffect(() => {
    if (rawProjects) setProjects(rawProjects);
  }, [rawProjects]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const projectsByColumn = useCallback(
    (colId: ProjectStatus) => projects.filter(p => p.status === colId),
    [projects]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveProject(projects.find(p => p.id === event.active.id) ?? null);
  }, [projects]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const overColumn = COLUMNS.find(c => c.id === overId);
    if (overColumn) {
      setProjects(prev => prev.map(p => p.id === activeId ? { ...p, status: overColumn.id } : p));
      return;
    }
    const overProject = projects.find(p => p.id === overId);
    if (overProject && overProject.status !== activeProject?.status) {
      setProjects(prev => prev.map(p => p.id === activeId ? { ...p, status: overProject.status } : p));
    }
  }, [projects, activeProject]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProject(null);
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    setProjects(prev => {
      const ai = prev.findIndex(p => p.id === activeId);
      const oi = prev.findIndex(p => p.id === overId);
      if (ai === -1 || oi === -1 || ai === oi) return prev;
      return arrayMove(prev, ai, oi);
    });
    // TODO: PATCH /api/v1/process/projects/:id with new status when drag settles
    queryClient.invalidateQueries({ queryKey: ['process-projects', activeDepartmentId] });
  }, [queryClient, activeDepartmentId]);

  // ── Loading state: skeleton columns ──
  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--border-light)] flex-shrink-0">
          <div>
            <div className="h-5 w-36 rounded bg-[var(--bg-muted)] animate-pulse mb-1.5" />
            <div className="h-3.5 w-24 rounded bg-[var(--bg-muted)] animate-pulse" />
          </div>
          <div className="h-9 w-28 rounded-full bg-[var(--bg-muted)] animate-pulse" />
        </div>
        <div className="flex-1 overflow-x-auto px-8 py-6">
          <div className="flex gap-5">
            {COLUMNS.map(col => <SkeletonColumn key={col.id} label={col.label} accent={col.accent} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--border-light)] flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Process Pipeline</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5">{projects.length} active projects</p>
        </div>
        <Button variant="primary" className="gap-1.5">
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {/* Error Banner */}
      {isError && (
        <div className="mx-8 mt-4 flex items-center gap-2.5 px-4 py-2.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load projects. Ensure the backend server is running and you are authenticated.
          </p>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-8 py-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-5 h-full">
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.id}
                columnId={col.id}
                label={col.label}
                accent={col.accent}
                projects={projectsByColumn(col.id)}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
            {activeProject ? <ProjectCard project={activeProject} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
