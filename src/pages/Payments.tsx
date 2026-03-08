import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { supabase, Member, Payment } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, CreditCard as Edit2, Trash2, X, Filter } from 'lucide-react';

interface PaymentWithMember extends Payment {
  member: Member;
}

export function Payments() {
  const [payments, setPayments] = useState<PaymentWithMember[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentWithMember[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentWithMember | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const { showToast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    member_id: '',
    amount: '',
    payment_month: new Date().getMonth() + 1,
    payment_year: new Date().getFullYear(),
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash' as 'cash' | 'upi' | 'bank_transfer',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, monthFilter, yearFilter]);

  const loadData = async () => {
    try {
      const { data: membersData } = await supabase
        .from('members')
        .select('*')
        .eq('status', 'active')
        .order('full_name');

      const { data: paymentsData } = await supabase
        .from('payments')
        .select(`
          *,
          member:members(*)
        `)
        .order('payment_date', { ascending: false });

      setMembers(membersData || []);
      setPayments(paymentsData as PaymentWithMember[] || []);
    } catch (error) {
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = payments;

    if (searchTerm) {
      filtered = filtered.filter(
        (payment) =>
          payment.member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.member.member_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (monthFilter) {
      filtered = filtered.filter((payment) => payment.payment_month === parseInt(monthFilter));
    }

    if (yearFilter) {
      filtered = filtered.filter((payment) => payment.payment_year === parseInt(yearFilter));
    }

    setFilteredPayments(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingPayment) {
        const { error } = await supabase
          .from('payments')
          .update({
            amount: parseFloat(formData.amount),
            payment_month: formData.payment_month,
            payment_year: formData.payment_year,
            payment_date: formData.payment_date,
            payment_method: formData.payment_method,
            notes: formData.notes,
          })
          .eq('id', editingPayment.id);

        if (error) throw error;
        showToast('Payment updated successfully', 'success');
      } else {
        const { error } = await supabase.from('payments').insert([
          {
            member_id: formData.member_id,
            amount: parseFloat(formData.amount),
            payment_month: formData.payment_month,
            payment_year: formData.payment_year,
            payment_date: formData.payment_date,
            payment_method: formData.payment_method,
            notes: formData.notes,
            created_by: user?.id,
          },
        ]);

        if (error) {
          if (error.code === '23505') {
            showToast('Payment already exists for this member and month', 'error');
          } else {
            throw error;
          }
          return;
        }
        showToast('Payment recorded successfully', 'success');
      }

      closeModal();
      loadData();
    } catch (error) {
      showToast((error as Error).message || 'Operation failed', 'error');
    }
  };

  const handleEdit = (payment: PaymentWithMember) => {
    setEditingPayment(payment);
    setFormData({
      member_id: payment.member_id,
      amount: payment.amount.toString(),
      payment_month: payment.payment_month,
      payment_year: payment.payment_year,
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      notes: payment.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;

    try {
      const { error } = await supabase.from('payments').delete().eq('id', id);
      if (error) throw error;
      showToast('Payment deleted successfully', 'success');
      loadData();
    } catch (error) {
      showToast('Failed to delete payment', 'error');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPayment(null);
    setFormData({
      member_id: '',
      amount: '',
      payment_month: new Date().getMonth() + 1,
      payment_year: new Date().getFullYear(),
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      notes: '',
    });
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

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
            <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
            <p className="text-gray-600 mt-1">Manage member payments</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Record Payment
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by member name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Months</option>
              {months.map((month, index) => (
                <option key={month} value={index + 1}>{month}</option>
              ))}
            </select>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Years</option>
              {[2024, 2025, 2026].map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {filteredPayments.length === 0 ? (
            <p className="text-gray-500 text-center py-12">No payments found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Member</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Month</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Method</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Notes</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{payment.member.full_name}</p>
                          <p className="text-xs text-gray-500">{payment.member.member_id}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        ₹{Number(payment.amount).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {months[payment.payment_month - 1]} {payment.payment_year}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 capitalize">
                        {payment.payment_method.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{payment.notes || '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(payment)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(payment.id)}
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
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingPayment ? 'Edit Payment' : 'Record Payment'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Member</label>
                <select
                  required
                  disabled={!!editingPayment}
                  value={formData.member_id}
                  onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Select Member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.member_id} - {member.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                  <select
                    value={formData.payment_month}
                    onChange={(e) => setFormData({ ...formData, payment_month: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {months.map((month, index) => (
                      <option key={month} value={index + 1}>{month}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <input
                    type="number"
                    required
                    value={formData.payment_year}
                    onChange={(e) => setFormData({ ...formData, payment_year: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date</label>
                <input
                  type="date"
                  required
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as 'cash' | 'upi' | 'bank_transfer' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
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
                  {editingPayment ? 'Update' : 'Record'} Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
