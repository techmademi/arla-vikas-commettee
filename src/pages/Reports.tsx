import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { supabase, Member, Payment } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { FileText, Download, Calendar, Users, TrendingUp } from 'lucide-react';

interface MemberPaymentReport {
  member: Member;
  payments: Payment[];
  totalPaid: number;
  monthsPaid: number;
}

interface MonthlyReport {
  month: number;
  year: number;
  totalAmount: number;
  paymentCount: number;
}

export function Reports() {
  const [reportType, setReportType] = useState<'member' | 'monthly' | 'yearly' | 'pending'>('member');
  const [loading, setLoading] = useState(false);
  const [memberReports, setMemberReports] = useState<MemberPaymentReport[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const { showToast } = useToast();

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    loadReports();
  }, [reportType, selectedYear, selectedMonth]);

  const loadReports = async () => {
    setLoading(true);
    try {
      if (reportType === 'member') {
        await loadMemberReports();
      } else if (reportType === 'monthly') {
        await loadMonthlyReports();
      } else if (reportType === 'yearly') {
        await loadYearlyReports();
      } else if (reportType === 'pending') {
        await loadPendingReports();
      }
    } catch (error) {
      showToast('Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMemberReports = async () => {
    const { data: members } = await supabase
      .from('members')
      .select('*')
      .order('full_name');

    const { data: payments } = await supabase
      .from('payments')
      .select('*');

    const reports: MemberPaymentReport[] = (members || []).map((member) => {
      const memberPayments = (payments || []).filter((p) => p.member_id === member.id);
      const totalPaid = memberPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      return {
        member,
        payments: memberPayments,
        totalPaid,
        monthsPaid: memberPayments.length,
      };
    });

    setMemberReports(reports);
  };

  const loadMonthlyReports = async () => {
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_year', selectedYear)
      .order('payment_month');

    const monthlyData: { [key: number]: MonthlyReport } = {};

    (payments || []).forEach((payment) => {
      if (!monthlyData[payment.payment_month]) {
        monthlyData[payment.payment_month] = {
          month: payment.payment_month,
          year: payment.payment_year,
          totalAmount: 0,
          paymentCount: 0,
        };
      }
      monthlyData[payment.payment_month].totalAmount += Number(payment.amount);
      monthlyData[payment.payment_month].paymentCount += 1;
    });

    setMonthlyReports(Object.values(monthlyData));
  };

  const loadYearlyReports = async () => {
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .order('payment_year', { ascending: false });

    const yearlyData: { [key: number]: MonthlyReport } = {};

    (payments || []).forEach((payment) => {
      if (!yearlyData[payment.payment_year]) {
        yearlyData[payment.payment_year] = {
          month: 0,
          year: payment.payment_year,
          totalAmount: 0,
          paymentCount: 0,
        };
      }
      yearlyData[payment.payment_year].totalAmount += Number(payment.amount);
      yearlyData[payment.payment_year].paymentCount += 1;
    });

    setMonthlyReports(Object.values(yearlyData));
  };

  const loadPendingReports = async () => {
    const { data: members } = await supabase
      .from('members')
      .select('*')
      .eq('status', 'active')
      .order('full_name');

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_month', selectedMonth)
      .eq('payment_year', selectedYear);

    const paidMemberIds = new Set((payments || []).map((p) => p.member_id));
    const pendingMembers = (members || []).filter((m) => !paidMemberIds.has(m.id));

    const reports: MemberPaymentReport[] = pendingMembers.map((member) => ({
      member,
      payments: [],
      totalPaid: 0,
      monthsPaid: 0,
    }));

    setMemberReports(reports);
  };

  const exportToCSV = () => {
    let csvContent = '';
    let filename = '';

    if (reportType === 'member') {
      csvContent = 'Member ID,Name,Phone,Total Paid,Months Paid\n';
      memberReports.forEach((report) => {
        csvContent += `${report.member.member_id},${report.member.full_name},${report.member.phone},${report.totalPaid},${report.monthsPaid}\n`;
      });
      filename = 'member-payment-report.csv';
    } else if (reportType === 'monthly') {
      csvContent = 'Month,Year,Total Amount,Payment Count\n';
      monthlyReports.forEach((report) => {
        csvContent += `${months[report.month - 1]},${report.year},${report.totalAmount},${report.paymentCount}\n`;
      });
      filename = `monthly-report-${selectedYear}.csv`;
    } else if (reportType === 'yearly') {
      csvContent = 'Year,Total Amount,Payment Count\n';
      monthlyReports.forEach((report) => {
        csvContent += `${report.year},${report.totalAmount},${report.paymentCount}\n`;
      });
      filename = 'yearly-report.csv';
    } else if (reportType === 'pending') {
      csvContent = 'Member ID,Name,Phone,Status\n';
      memberReports.forEach((report) => {
        csvContent += `${report.member.member_id},${report.member.full_name},${report.member.phone},Pending\n`;
      });
      filename = `pending-payments-${months[selectedMonth - 1]}-${selectedYear}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    showToast('Report exported successfully', 'success');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600 mt-1">View and export financial reports</p>
          </div>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setReportType('member')}
            className={`p-6 rounded-xl border-2 transition-all ${
              reportType === 'member'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <Users className={`w-8 h-8 mb-3 ${reportType === 'member' ? 'text-blue-600' : 'text-gray-400'}`} />
            <h3 className="font-semibold text-gray-900">Member-wise Report</h3>
            <p className="text-sm text-gray-600 mt-1">Payment summary per member</p>
          </button>

          <button
            onClick={() => setReportType('monthly')}
            className={`p-6 rounded-xl border-2 transition-all ${
              reportType === 'monthly'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <Calendar className={`w-8 h-8 mb-3 ${reportType === 'monthly' ? 'text-blue-600' : 'text-gray-400'}`} />
            <h3 className="font-semibold text-gray-900">Monthly Report</h3>
            <p className="text-sm text-gray-600 mt-1">Collection by month</p>
          </button>

          <button
            onClick={() => setReportType('yearly')}
            className={`p-6 rounded-xl border-2 transition-all ${
              reportType === 'yearly'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <TrendingUp className={`w-8 h-8 mb-3 ${reportType === 'yearly' ? 'text-blue-600' : 'text-gray-400'}`} />
            <h3 className="font-semibold text-gray-900">Yearly Report</h3>
            <p className="text-sm text-gray-600 mt-1">Annual collection summary</p>
          </button>

          <button
            onClick={() => setReportType('pending')}
            className={`p-6 rounded-xl border-2 transition-all ${
              reportType === 'pending'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <FileText className={`w-8 h-8 mb-3 ${reportType === 'pending' ? 'text-blue-600' : 'text-gray-400'}`} />
            <h3 className="font-semibold text-gray-900">Pending Payments</h3>
            <p className="text-sm text-gray-600 mt-1">Members with pending dues</p>
          </button>
        </div>

        {(reportType === 'monthly' || reportType === 'pending') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {reportType === 'monthly' ? 'Year' : 'Month'}
                </label>
                {reportType === 'monthly' ? (
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {months.map((month, index) => (
                      <option key={month} value={index + 1}>{month}</option>
                    ))}
                  </select>
                )}
              </div>
              {reportType === 'pending' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {reportType === 'member' || reportType === 'pending' ? (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Member ID</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Phone</th>
                      {reportType === 'member' && (
                        <>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Total Paid</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Months Paid</th>
                        </>
                      )}
                      {reportType === 'pending' && (
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {memberReports.length === 0 ? (
                      <tr>
                        <td colSpan={reportType === 'member' ? 5 : 4} className="text-center py-8 text-gray-500">
                          No data available
                        </td>
                      </tr>
                    ) : (
                      memberReports.map((report) => (
                        <tr key={report.member.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm font-medium text-gray-900">{report.member.member_id}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{report.member.full_name}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{report.member.phone}</td>
                          {reportType === 'member' && (
                            <>
                              <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                ₹{report.totalPaid.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">{report.monthsPaid}</td>
                            </>
                          )}
                          {reportType === 'pending' && (
                            <td className="py-3 px-4">
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                Pending
                              </span>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {reportType === 'monthly' && (
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Month</th>
                      )}
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Year</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Total Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Payment Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyReports.length === 0 ? (
                      <tr>
                        <td colSpan={reportType === 'monthly' ? 4 : 3} className="text-center py-8 text-gray-500">
                          No data available
                        </td>
                      </tr>
                    ) : (
                      monthlyReports.map((report, index) => (
                        <tr key={index} className="border-t border-gray-100 hover:bg-gray-50">
                          {reportType === 'monthly' && (
                            <td className="py-3 px-4 text-sm text-gray-900">{months[report.month - 1]}</td>
                          )}
                          <td className="py-3 px-4 text-sm text-gray-900">{report.year}</td>
                          <td className="py-3 px-4 text-sm font-medium text-gray-900">
                            ₹{report.totalAmount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{report.paymentCount}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
