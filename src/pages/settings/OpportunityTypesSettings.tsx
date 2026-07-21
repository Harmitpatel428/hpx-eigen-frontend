import { useState } from 'react';
import { GripVertical, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  useOpportunityTypes,
  useCreateOpportunityType,
  useUpdateOpportunityType,
  useDeleteOpportunityType,
  useReorderOpportunityTypes,
  OpportunityType,
} from '../../hooks/useOpportunityTypes';

export function OpportunityTypesSettings() {
  const tenantId = localStorage.getItem('tenantId') || '';
  
  const { data: types, isLoading } = useOpportunityTypes(tenantId);
  const createMutation = useCreateOpportunityType();
  const updateMutation = useUpdateOpportunityType();
  const deleteMutation = useDeleteOpportunityType();
  const reorderMutation = useReorderOpportunityTypes();

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  if (isLoading) {
    return <div className="p-8 text-[var(--text-secondary)]">Loading...</div>;
  }

  const activeTypes = types || [];
  
  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createMutation.mutateAsync({ name: newName });
      setNewName('');
      setIsAdding(false);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Error creating type');
    }
  };

  const handleToggleActive = async (type: OpportunityType) => {
    if (type.isDefault) return;
    try {
      await updateMutation.mutateAsync({ id: type.id, isActive: !type.isActive });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Error updating type');
    }
  };

  const handleDelete = async (type: OpportunityType) => {
    if (type.isDefault) return;
    if (confirm(`Are you sure you want to delete "${type.name}"?`)) {
      try {
        await deleteMutation.mutateAsync(type.id);
      } catch (e: any) {
        alert(e?.response?.data?.message || 'Cannot delete type, it may be in use');
      }
    }
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const newTypes = [...activeTypes];
    const temp = newTypes[index];
    newTypes[index] = newTypes[index - 1];
    newTypes[index - 1] = temp;
    await reorderMutation.mutateAsync({ typeIds: newTypes.map(t => t.id) });
  };

  const moveDown = async (index: number) => {
    if (index === activeTypes.length - 2) return; // Cannot move past 'Other'
    if (activeTypes[index].isDefault) return;
    const newTypes = [...activeTypes];
    const temp = newTypes[index];
    newTypes[index] = newTypes[index + 1];
    newTypes[index + 1] = temp;
    await reorderMutation.mutateAsync({ typeIds: newTypes.map(t => t.id) });
  };

  return (
    <div className="max-w-4xl flex flex-col gap-[var(--space-6)]">
      <section>
        <div className="flex justify-between items-center mb-[var(--space-6)]">
          <div>
            <h2 className="type-h1 mb-2">Opportunity Types</h2>
            <p className="type-body text-[var(--text-secondary)]">
              Customize the list of available opportunity types for your organization.
            </p>
          </div>
          <button
            className="btn btn-primary flex items-center gap-2"
            onClick={() => setIsAdding(true)}
            disabled={isAdding}
          >
            <Plus size={16} />
            Add Type
          </button>
        </div>

        <div className="surface p-0 overflow-hidden bg-white rounded-xl border border-[var(--border-light)] shadow-sm">
          {activeTypes.map((type, index) => {
            const isOther = type.isDefault && type.name === 'Other';
            
            return (
              <div
                key={type.id}
                className="flex items-center justify-between p-4 border-b border-[var(--border-light)] last:border-0 hover:bg-[var(--bg-app)] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col text-[var(--text-tertiary)]">
                    <button
                      className="p-1 hover:text-[var(--text-primary)] disabled:opacity-30 disabled:hover:text-[var(--text-tertiary)]"
                      disabled={index === 0 || isOther}
                      onClick={() => moveUp(index)}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      className="p-1 hover:text-[var(--text-primary)] disabled:opacity-30 disabled:hover:text-[var(--text-tertiary)]"
                      disabled={index >= activeTypes.length - 2 || isOther}
                      onClick={() => moveDown(index)}
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                  <GripVertical size={16} className="text-[var(--border-dark)]" />
                  <div>
                    <span className="type-ui font-medium text-[var(--text-primary)] block mb-1">
                      {type.name}
                    </span>
                    {isOther && (
                      <span className="type-micro bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        System Default
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {!isOther && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="type-micro text-[var(--text-secondary)]">
                        {type.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <input
                        type="checkbox"
                        className="toggle"
                        checked={type.isActive}
                        onChange={() => handleToggleActive(type)}
                      />
                    </label>
                  )}

                  <button
                    className="p-2 text-[var(--color-danger)] hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                    disabled={isOther}
                    onClick={() => handleDelete(type)}
                    title="Delete Type"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full border border-[var(--border-light)]">
            <h3 className="type-h3 mb-4">Add Opportunity Type</h3>
            <div className="mb-6">
              <label className="type-micro block mb-2 text-[var(--text-secondary)]">Type Name</label>
              <input
                autoFocus
                type="text"
                className="input w-full bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-slate-900"
                placeholder="e.g., Enterprise Software"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                maxLength={100}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button className="btn btn-secondary" onClick={() => { setIsAdding(false); setNewName(''); }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={!newName.trim()}>
                Save Type
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
