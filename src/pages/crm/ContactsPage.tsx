import React, { useState } from 'react';
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact, useLinkContactToLead } from '../../hooks/useCrmApi';
import { Modal } from '../../components/Modal';
import { DataTable, Column } from '../../components/DataTable';
import { FilterSidebar, FilterSelect } from '../../components/FilterSidebar';
import { Contact } from '../../types/crm';
import { formatDate, isValidEmail, isValidPhone, debounce } from '../../utils/crm';
import { Plus, Edit2, Trash2, Link as LinkIcon, Search, Filter } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

const contactSchema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Invalid email'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  companyId: z.string().min(1, 'Company required'),
  roleTitle: z.string().optional(),
  notes: z.string().optional(),
});

type ContactForm = z.infer<typeof contactSchema>;

const linkSchema = z.object({
  leadId: z.string().min(1, 'Lead required'),
});

type LinkForm = z.infer<typeof linkSchema>;

export function ContactsPage({ tenantId }: { tenantId: string }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>('firstName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [isNewContactOpen, setIsNewContactOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [linkingContact, setLinkingContact] = useState<Contact | null>(null);

  const { data: contactsData, isLoading, error } = useContacts(tenantId, { ...filters, searchQuery }, { page, pageSize: 25 });
  const createMut = useCreateContact();
  const updateMut = useUpdateContact();
  const deleteMut = useDeleteContact();
  const linkMut = useLinkContactToLead();

  const formMethods = useForm<ContactForm>({ resolver: zodResolver(contactSchema) });
  const linkMethods = useForm<LinkForm>({ resolver: zodResolver(linkSchema) });

  const contacts = contactsData?.data || [];
  const totalContacts = contactsData?.total || 0;

  const handleSearchChange = debounce((q: string) => {
    setSearchQuery(q);
    setPage(1);
  }, 300);

  const handleSort = (key: string, order: 'asc' | 'desc') => {
    setSortKey(key);
    setSortOrder(order);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    formMethods.reset({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      companyId: contact.companyId,
      roleTitle: contact.roleTitle,
      notes: contact.notes,
    });
    setIsNewContactOpen(true);
  };

  const onSubmitContact = async (data: ContactForm) => {
    try {
      if (editingContact) {
        await updateMut.mutateAsync({ id: editingContact.id, ...data });
        toast.success('Contact updated');
      } else {
        await createMut.mutateAsync({ tenantId, ...data });
        toast.success('Contact created');
      }
      setIsNewContactOpen(false);
      setEditingContact(null);
      formMethods.reset();
    } catch (err) {
      toast.error('Failed to save contact');
    }
  };

  const onSubmitLink = async (data: LinkForm) => {
    if (!linkingContact) return;
    try {
      await linkMut.mutateAsync({ contactId: linkingContact.id, leadId: data.leadId });
      toast.success('Contact linked to lead');
      setLinkingContact(null);
      linkMethods.reset();
    } catch (err) {
      toast.error('Failed to link contact');
    }
  };

  const columns: Column<Contact>[] = [
    {
      key: 'firstName',
      label: 'Name',
      sortable: true,
      render: (val, row) => (
        <span className="font-medium text-blue-400">
          {row.firstName} {row.lastName}
        </span>
      ),
    },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'phone', label: 'Phone', sortable: true },
    { key: 'companyName', label: 'Company', sortable: true },
    { key: 'roleTitle', label: 'Role', sortable: false },
    {
      key: 'createdAt',
      label: 'Created',
      render: (val) => formatDate(val),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0e27]">
      {/* Header */}
      <div className="bg-[#1a1a2e] border-b border-[#16213e] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Contacts</h1>
            <p className="text-gray-400">{totalContacts} contacts</p>
          </div>
          <button
            onClick={() => {
              setEditingContact(null);
              formMethods.reset();
              setIsNewContactOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            New Contact
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
            label="Company"
            value={filters.company || ''}
            options={[
              { value: 'ABC Corp', label: 'ABC Corp' },
              { value: 'XYZ Ltd', label: 'XYZ Ltd' },
              { value: 'Other', label: 'Other' },
            ]}
            onChange={(val) => setFilters({ ...filters, company: val })}
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
                placeholder="Search by name, email, or company..."
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

          {error && <div className="text-red-400 mb-4">Error loading contacts</div>}

          {/* Table */}
          <DataTable
            columns={columns}
            data={contacts}
            rowKey="id"
            isLoading={isLoading}
            emptyMessage="No contacts found"
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={handleSort}
            rowActions={(contact) => (
              <div className="flex gap-2">
                <button
                  onClick={() => setLinkingContact(contact)}
                  className="p-1 text-purple-400 hover:bg-purple-500/10 rounded transition-colors"
                  title="Link to lead"
                >
                  <LinkIcon size={16} />
                </button>
                <button
                  onClick={() => handleEditContact(contact)}
                  className="p-1 text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={async () => {
                    if (confirm('Delete this contact?')) {
                      await deleteMut.mutateAsync(contact.id);
                      toast.success('Contact deleted');
                    }
                  }}
                  className="p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          />

          {/* Pagination */}
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
              disabled={contacts.length < 25}
              className="px-4 py-2 bg-[#1a1a2e] border border-[#16213e] rounded-lg text-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* New/Edit Contact Modal */}
      <Modal
        isOpen={isNewContactOpen}
        onClose={() => {
          setIsNewContactOpen(false);
          setEditingContact(null);
          formMethods.reset();
        }}
        title={editingContact ? 'Edit Contact' : 'New Contact'}
        size="md"
      >
        <form onSubmit={formMethods.handleSubmit(onSubmitContact)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">First Name *</label>
              <input
                {...formMethods.register('firstName')}
                className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white placeholder-gray-500"
                placeholder="First name"
              />
              {formMethods.formState.errors.firstName && (
                <p className="text-red-400 text-xs mt-1">{formMethods.formState.errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Last Name *</label>
              <input
                {...formMethods.register('lastName')}
                className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white placeholder-gray-500"
                placeholder="Last name"
              />
              {formMethods.formState.errors.lastName && (
                <p className="text-red-400 text-xs mt-1">{formMethods.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Email *</label>
            <input
              {...formMethods.register('email')}
              type="email"
              className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white placeholder-gray-500"
              placeholder="Email"
            />
            {formMethods.formState.errors.email && (
              <p className="text-red-400 text-xs mt-1">{formMethods.formState.errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Phone *</label>
            <input
              {...formMethods.register('phone')}
              className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white placeholder-gray-500"
              placeholder="10 digits"
            />
            {formMethods.formState.errors.phone && (
              <p className="text-red-400 text-xs mt-1">{formMethods.formState.errors.phone.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Company *</label>
            <input
              {...formMethods.register('companyId')}
              className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white placeholder-gray-500"
              placeholder="Company ID or name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Role/Title</label>
            <input
              {...formMethods.register('roleTitle')}
              className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white placeholder-gray-500"
              placeholder="E.g., Sales Manager"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">Notes</label>
            <textarea
              {...formMethods.register('notes')}
              className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white placeholder-gray-500 h-20 resize-none"
              placeholder="Add notes..."
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingContact ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsNewContactOpen(false);
                setEditingContact(null);
                formMethods.reset();
              }}
              className="flex-1 px-4 py-2 bg-[#16213e] text-white rounded-lg hover:bg-[#16213e]/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Link to Lead Modal */}
      <Modal
        isOpen={!!linkingContact}
        onClose={() => {
          setLinkingContact(null);
          linkMethods.reset();
        }}
        title="Link Contact to Lead"
        size="md"
      >
        {linkingContact && (
          <form onSubmit={linkMethods.handleSubmit(onSubmitLink)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">Contact</label>
              <p className="text-white font-medium">
                {linkingContact.firstName} {linkingContact.lastName}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">Lead ID *</label>
              <input
                {...linkMethods.register('leadId')}
                className="w-full px-3 py-2 bg-[#16213e] border border-[#16213e] rounded-lg text-white placeholder-gray-500"
                placeholder="Lead ID to link"
              />
              {linkMethods.formState.errors.leadId && (
                <p className="text-red-400 text-xs mt-1">{linkMethods.formState.errors.leadId.message}</p>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Link
              </button>
              <button
                type="button"
                onClick={() => {
                  setLinkingContact(null);
                  linkMethods.reset();
                }}
                className="flex-1 px-4 py-2 bg-[#16213e] text-white rounded-lg hover:bg-[#16213e]/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
