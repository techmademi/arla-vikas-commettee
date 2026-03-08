import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { supabase, Member } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, CreditCard as Edit2, Trash2, X } from 'lucide-react';

export function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const { showToast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address: '',
    joining_date: new Date().toISOString().split('T')[0],
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    filterMembers();
  }, [members, searchTerm, statusFilter]);

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      showToast('Failed to load members', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterMembers = () => {
    let filtered = members;

    if (searchTerm) {
      filtered = filtered.filter(
        (member) =>
          member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.phone.includes(searchTerm) ||
          member.member_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((member) => member.status === statusFilter);
    }

    setFilteredMembers(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingMember) {
        const { error } = await supabase
          .from('members')
          .update(formData)
          .eq('id', editingMember.id);

        if (error) throw error;
        showToast('Member updated successfully', 'success');
      } else {
        const { data: memberIdData } = await supabase.rpc('generate_member_id');

        const { error } = await supabase.from('members').insert([
          {
            ...formData,
            member_id: memberIdData,
            created_by: user?.id,
          },
        ]);

        if (error) throw error;
        showToast('Member added successfully', 'success');
      }

      closeModal();
      loadMembers();
    } catch (error) {
      showToast((error as Error).message || 'Operation failed', 'error');
    }
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setFormData({
      full_name: member.full_name,
      phone: member.phone,
      address: member.address || '',
      joining_date: member.joining_date,
      status: member.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this member?')) return;

    try {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) throw error;
      showToast('Member deleted successfully', 'success');
      loadMembers();
    } catch (error) {
      showToast('Failed to delete member', 'error');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingMember(null);
    setFormData({
      full_name: '',
      phone: '',
      address: '',
      joining_date: new Date().toISOString().split('T')[0],
      status: 'active',
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Members</h1>
            <p className="text-gray-600 mt-1">Manage committee members</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Member
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, phone, or member ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {filteredMembers.length === 0 ? (
            <p className="text-gray-500 text-center py-12">No members found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Member ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Phone</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Address</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Joining Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{member.member_id}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{member.full_name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{member.phone}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{member.address || '-'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(member.joining_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            member.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {member.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(member)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(member.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingMember ? 'Edit Member' : 'Add Member'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Joining Date</label>
                <input
                  type="date"
                  required
                  value={formData.joining_date}
                  onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingMember ? 'Update' : 'Add'} Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
