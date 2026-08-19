import { memo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { LeadNote } from '../../services/lead-notes.service';
import { leadNotesService } from '../../services/lead-notes.service';
import { AddLeadNote } from './AddLeadNote';
import { LeadNoteItem } from './LeadNoteItem';
import { EditLeadNote } from './EditLeadNote';

interface LeadNotesSectionProps {
  leadId: string;
  authorName?: string;
}

function isEditableToday(note: LeadNote): boolean {
  const today = new Date();
  const noteDate = new Date(note.createdAt);

  return (
    today.getDate() === noteDate.getDate() &&
    today.getMonth() === noteDate.getMonth() &&
    today.getFullYear() === noteDate.getFullYear()
  );
}

export const LeadNotesSection = memo(function LeadNotesSection({
  leadId,
  authorName = 'You',
}: LeadNotesSectionProps) {
  const queryClient = useQueryClient();
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', leadId],
    queryFn: () => leadNotesService.list(leadId),
  });

  const invalidateNotes = () => {
    queryClient.invalidateQueries({ queryKey: ['notes', leadId] });
    queryClient.invalidateQueries({ queryKey: ['notes-summary', leadId] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof leadNotesService.create>[1]) =>
      leadNotesService.create(leadId, payload),
    onSuccess: invalidateNotes,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      noteId: string;
      content?: string;
      followUpDate?: string | null;
      followUpTime?: string | null;
    }) =>
      leadNotesService.update(leadId, payload.noteId, {
        content: payload.content,
        followUpDate: payload.followUpDate,
        followUpTime: payload.followUpTime,
      }),
    onSuccess: () => {
      invalidateNotes();
      setEditingNoteId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => leadNotesService.delete(leadId, noteId),
    onSuccess: invalidateNotes,
  });

  const handleAddNote = async (content: string) => {
    await createMutation.mutateAsync({ content });
  };

  const handleEditNote = (note: LeadNote) => {
    setEditingNoteId(note.id);
  };

  const handleSaveNote = async (
    content: string,
    followUpDate?: string | null,
    followUpTime?: string | null
  ) => {
    if (!editingNoteId) return;

    await updateMutation.mutateAsync({
      noteId: editingNoteId,
      content,
      followUpDate: followUpDate ?? undefined,
      followUpTime: followUpTime ?? undefined,
    });
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;
    await deleteMutation.mutateAsync(noteId);
  };

  const editingNote = editingNoteId ? notes.find((n) => n.id === editingNoteId) : null;

  const atLimit = notes.length >= 15;

  return (
    <div style={{ marginTop: '1.5rem' }}>
      {atLimit ? (
        <div style={{ fontSize: 12, color: '#dc2626', marginBottom: '0.75rem', padding: '6px 0' }}>
          Maximum of 15 notes reached.
        </div>
      ) : (
        <AddLeadNote
          onAdd={handleAddNote}
          isLoading={createMutation.isPending}
        />
      )}

      {isLoading ? (
        <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
          Loading notes...
        </div>
      ) : notes.length === 0 ? (
        <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
          No notes yet. Add one to get started.
        </div>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          {notes.map((note) => {
            if (editingNote?.id === note.id) {
              return (
                <EditLeadNote
                  key={note.id}
                  note={note}
                  onSave={handleSaveNote}
                  onCancel={() => setEditingNoteId(null)}
                  isLoading={updateMutation.isPending}
                />
              );
            }

            return (
              <LeadNoteItem
                key={note.id}
                note={note}
                isEditable={isEditableToday(note)}
                onEdit={handleEditNote}
                onDelete={handleDeleteNote}
                authorName={authorName}
                isDeleting={deleteMutation.isPending && deleteMutation.variables === note.id}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});
