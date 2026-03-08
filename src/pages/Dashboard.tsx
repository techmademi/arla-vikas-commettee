import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { Users, DollarSign, Calendar, AlertCircle, TrendingUp } from 'lucide-react';

interface Stats {
  totalMembers: number;
  activeMembers: number;
  totalCollection: number;
  currentMonthCollection: number;
  pendingPayments: number;
}

interface RecentPayment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  member: {
    full_name: string;
    member_id: string;
  };
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0,
    activeMembers: 0,
    totalCollection: 0,
    currentMonthCollection: 0,
    pendingPayments: 0,
  });
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const { data: members } = await supabase
        .from('members')
        .select('id, status');

      const { data: payments } = await supabase
        .from('payments')
        .select('amount, payment_month, payment_year');

      const { data: currentMonthPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('payment_month', currentMonth)
        .eq('payment_year', currentYear);

      const { data: recent } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          payment_method,
          member:members(full_name, member_id)
        `)
        .order('payment_date', { ascending: false })
        .limit(5);

      const totalMembers = members?.length || 0;
      const activeMembers = members?.filter((m) => m.status === 'active').length || 0;
      const totalCollection = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const currentMonthCollection = currentMonthPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const pendingPayments = activeMembers - (currentMonthPayments?.length || 0);

      setStats({
        totalMembers,
        activeMembers,
        totalCollection,
        currentMonthCollection,
        pendingPayments: Math.max(0, pendingPayments),
      });

      setRecentPayments(recent as RecentPayment[] || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Members',
      value: stats.totalMembers,
      icon: Users,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Active Members',
      value: stats.activeMembers,
      icon: TrendingUp,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total Collection',
      value: `₹${stats.totalCollection.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Current Month',
      value: `₹${stats.currentMonthCollection.toLocaleString()}`,
      icon: Calendar,
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Pending Payments',
      value: stats.pendingPayments,
      icon: AlertCircle,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
    },
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome to Arla Vikas Committee Management System</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${card.bgColor}`}>
                    <Icon className={`w-6 h-6 ${card.textColor}`} />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Payments</h2>
          {recentPayments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent payments</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Member ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Member Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Method</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">{payment.member.member_id}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{payment.member.full_name}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        ₹{Number(payment.amount).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 capitalize">
                        {payment.payment_method.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
