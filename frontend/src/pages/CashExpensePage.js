import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Wallet, Plus, Trash2, Loader2, Receipt } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const todayStr = () => new Date().toISOString().split('T')[0];

const CashExpensePage = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expensesRes, statsRes] = await Promise.all([
        api.getCashExpenses(todayStr()),
        api.getDashboardStats(),
      ]);
      setExpenses(expensesRes.data || []);
      setTodayRevenue(statsRes.data?.today_revenue || 0);
    } catch (error) {
      console.error('Error fetching cash expense data:', error);
      toast.error('Gagal memuat data kas');
    } finally {
      setLoading(false);
    }
  };

  const totalExpense = useMemo(
    () => expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    [expenses]
  );

  const netCash = useMemo(() => todayRevenue - totalExpense, [todayRevenue, totalExpense]);

  const resetForm = () => {
    setAmount('');
    setDescription('');
  };

  const handleSubmit = async () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Masukkan nominal yang valid');
      return;
    }
    if (!description.trim()) {
      toast.error('Keterangan tidak boleh kosong');
      return;
    }

    setSubmitting(true);
    try {
      await api.createCashExpense({
        amount: numAmount,
        description: description.trim(),
        date: todayStr(),
      });
      toast.success('Pengeluaran dicatat');
      setShowDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error creating cash expense:', error);
      toast.error('Gagal mencatat pengeluaran');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteCashExpense(id);
      toast.success('Pengeluaran dihapus');
      fetchData();
    } catch (error) {
      console.error('Error deleting cash expense:', error);
      toast.error('Gagal menghapus pengeluaran');
    }
  };

  return (
    <div className="space-y-6" data-testid="cash-expense-page">
      <div>
        <h1 className="font-heading text-4xl font-bold tracking-tight">Kas Kasir</h1>
        <p className="text-muted-foreground mt-2">Catat pengeluaran kas dari pendapatan hari ini</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pendapatan hari ini</p>
            <p className="text-2xl font-bold mt-1" data-testid="today-revenue">
              {formatCurrency(todayRevenue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pengeluaran hari ini</p>
            <p className="text-2xl font-bold mt-1 text-destructive" data-testid="today-expense">
              {formatCurrency(totalExpense)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Kas bersih</p>
            <p className="text-2xl font-bold mt-1 text-primary" data-testid="net-cash">
              {formatCurrency(netCash)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="expense-list-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Pengeluaran kas hari ini
          </CardTitle>
          <Button onClick={() => setShowDialog(true)} data-testid="open-add-expense-button">
            <Plus className="mr-2 h-4 w-4" />
            Catat Pengeluaran
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Belum ada pengeluaran hari ini</p>
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.map((expense, idx) => (
                <div
                  key={expense.id}
                  className="flex items-center gap-3 p-3 border border-border rounded-lg"
                  data-testid={`expense-item-${idx}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{expense.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {expense.created_at
                        ? new Date(expense.created_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                      {' · '}
                      {expense.created_by || user?.name || 'Kasir'}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-destructive">
                    - {formatCurrency(expense.amount)}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDelete(expense.id)}
                    data-testid={`delete-expense-${idx}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm" data-testid="add-expense-dialog">
          <DialogHeader>
            <DialogTitle>Catat Pengeluaran Kas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="expense-amount">Nominal (Rp)</Label>
              <Input
                id="expense-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Contoh: 25000"
                min="0"
                data-testid="expense-amount-input"
              />
            </div>
            <div>
              <Label htmlFor="expense-description">Keterangan</Label>
              <Input
                id="expense-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Beli galon air"
                data-testid="expense-description-input"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={submitting}
              data-testid="submit-expense-button"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Pengeluaran'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashExpensePage;
