import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, ShoppingCart, Calendar, Users, TrendingUp, Loader2, Award, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const isOwner = user?.role === 'owner';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, chartRes, bookingsRes, transactionsRes] = await Promise.all([
        api.getDashboardStats(),
        api.getRevenueChart(),
        api.getRecentBookings(),
        api.getRecentTransactions()
      ]);

      setStats(statsRes.data);
      setChartData(chartRes.data);
      setRecentBookings(bookingsRes.data);
      setRecentTransactions(transactionsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'menunggu': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'dikonfirmasi': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'selesai': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'dibatalkan': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="dashboard-loading">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div>
        <h1 className="font-heading text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Ringkasan aktivitas dan performa bisnis Anda</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="kpi-transactions-today">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transaksi Hari Ini</CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-heading font-bold tracking-tight">{stats?.total_transactions_today || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Total transaksi terbaru</p>
          </CardContent>
        </Card>

        <Card data-testid="kpi-bookings-today">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Booking Hari Ini</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-heading font-bold tracking-tight">{stats?.total_bookings_today || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Jadwal hari ini</p>
          </CardContent>
        </Card>

        <Card data-testid="kpi-total-customers">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pelanggan</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-heading font-bold tracking-tight">{stats?.total_customers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Pelanggan terdaftar</p>
          </CardContent>
        </Card>

        <Card data-testid="kpi-revenue-month">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendapatan Bulan Ini</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-heading font-bold tracking-tight">
              {formatCurrency(stats?.total_revenue_month || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Revenue bulan berjalan
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Owner-Only Widgets */}
      {isOwner && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card data-testid="kpi-revenue-today" className="border-primary/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendapatan Hari Ini</CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-heading font-bold tracking-tight text-primary">
                {formatCurrency(stats?.total_revenue_today || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total revenue hari ini</p>
            </CardContent>
          </Card>

          <Card data-testid="kpi-commission-today" className="border-primary/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Komisi Stylist Hari Ini</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-heading font-bold tracking-tight">
                {formatCurrency(stats?.total_commission_today || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Komisi yang dibayarkan</p>
            </CardContent>
          </Card>

          <Card data-testid="kpi-top-stylist" className="border-primary/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Stylist Bulan Ini</CardTitle>
              <Award className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-heading font-bold tracking-tight">
                {stats?.top_stylist_name || '-'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Omzet: {formatCurrency(stats?.top_stylist_revenue || 0)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue Chart */}
      <Card data-testid="revenue-chart-card">
        <CardHeader>
          <CardTitle className="font-heading">Grafik Pendapatan (7 Hari Terakhir)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                formatter={(value) => formatCurrency(value)}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="hsl(var(--primary))" 
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Bookings */}
        <Card data-testid="recent-bookings-card">
          <CardHeader>
            <CardTitle className="font-heading">Booking Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Belum ada booking</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentBookings.map((booking, idx) => (
                  <div 
                    key={booking.id} 
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition"
                    data-testid={`recent-booking-${idx}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{booking.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{booking.service_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {booking.booking_date} - {booking.booking_time}
                      </p>
                    </div>
                    <Badge className={getStatusColor(booking.status)} variant="outline">
                      {booking.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card data-testid="recent-transactions-card">
          <CardHeader>
            <CardTitle className="font-heading">Transaksi Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Belum ada transaksi</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((transaction, idx) => (
                  <div 
                    key={transaction.id} 
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition"
                    data-testid={`recent-transaction-${idx}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{transaction.customer_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.items.length} item(s) - {transaction.payment_method}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDateTime(transaction.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">{formatCurrency(transaction.total)}</p>
                      <p className="text-xs text-green-500">Lunas</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
