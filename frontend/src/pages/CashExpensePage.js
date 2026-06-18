import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Wallet, Plus, Trash2, Loader2, Receipt, Download, FileText, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const todayStr = () => {
  // Returns today's date in Asia/Jakarta tz (YYYY-MM-DD), avoiding UTC drift.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
};

const CashExpensePage = () => {
  const { user } = useAuth();
  // Today section state
  const [expenses, setExpenses] = useState([]);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  // Report section state
  const [reportStart, setReportStart] = useState('');
  const [reportEnd, setReportEnd] = useState('');
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const fetchTodayData = useCallback(async () => {
    setLoading(true);
    try {
      const [expensesRes, statsRes] = await Promise.all([
        api.getCashExpenses(todayStr()),
        api.getDashboardStats(),
      ]);
      setExpenses(expensesRes.data || []);
      setTodayRevenue(statsRes.data?.total_revenue_today || 0);
    } catch (error) {
      console.error('Error fetching cash expense data:', error);
      toast.error('Gagal memuat data kas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayData();
    // initialize report range to current month (Jakarta tz)
    const t = todayStr();
    setReportStart(t.slice(0, 8) + '01');
    setReportEnd(t);
  }, [fetchTodayData]);

  const totalExpense = useMemo(
    () => expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    [expenses]
  );

  const netCash = useMemo(() => todayRevenue - totalExpense, [todayRevenue, totalExpense]);

  const resetForm = () => {
    setAmount('');
    setCategory('');
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
        category: category.trim() || null,
        description: description.trim(),
        date: todayStr(),
      });
      toast.success('Pengeluaran dicatat');
      setShowDialog(false);
      resetForm();
      fetchTodayData();
    } catch (error) {
      console.error('Error creating cash expense:', error);
      toast.error(error.response?.data?.detail || 'Gagal mencatat pengeluaran');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteCashExpense(id);
      toast.success('Pengeluaran dihapus');
      fetchTodayData();
    } catch (error) {
      console.error('Error deleting cash expense:', error);
      toast.error('Gagal menghapus pengeluaran');
    }
  };

  const handleGenerateReport = async () => {
    if (!reportStart || !reportEnd) {
      toast.error('Pilih tanggal mulai dan akhir');
      return;
    }
    if (reportStart > reportEnd) {
      toast.error('Tanggal mulai harus sebelum atau sama dengan tanggal akhir');
      return;
    }
    setReportLoading(true);
    try {
      const res = await api.getCashExpenseReport(reportStart, reportEnd);
      setReportData(res.data);
      toast.success('Laporan berhasil dibuat');
    } catch (error) {
      console.error('Error loading cash expense report:', error);
      toast.error('Gagal memuat laporan');
    } finally {
      setReportLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!reportData?.expenses?.length) {
      toast.error('Tidak ada data untuk diexport');
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Laporan Pengeluaran Kas - Mulya Salon', 14, 15);
    doc.setFontSize(10);
    doc.text(`Periode: ${reportStart} s/d ${reportEnd}`, 14, 22);
    doc.text(`Total Pengeluaran: ${formatCurrency(reportData.summary.total_expense)}`, 14, 28);
    doc.text(`Total Pendapatan: ${formatCurrency(reportData.summary.total_revenue)}`, 14, 34);
    doc.text(`Kas Bersih: ${formatCurrency(reportData.summary.net_cash)}`, 14, 40);

    autoTable(doc, {
      startY: 46,
      head: [['Tanggal', 'Jam', 'Kategori', 'Keterangan', 'Dicatat oleh', 'Nominal']],
      body: reportData.expenses.map((e) => [
        e.date,
        e.created_at
          ? new Date(e.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : '-',
        e.category || '-',
        e.description,
        e.created_by || '-',
        formatCurrency(e.amount),
      ]),
    });

    doc.save(`laporan-kas-kasir-${reportStart}-${reportEnd}.pdf`);
    toast.success('PDF berhasil didownload');
  };

  const handleExportExcel = () => {
    if (!reportData?.expenses?.length) {
      toast.error('Tidak ada data untuk diexport');
      return;
    }
    const data = reportData.expenses.map((e) => ({
      Tanggal: e.date,
      Jam: e.created_at
        ? new Date(e.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        : '-',
      Kategori: e.category || '-',
      Keterangan: e.description,
      'Dicatat oleh': e.created_by || '-',
      Nominal: e.amount,
    }));

    // Add summary rows at the bottom
    data.push({});
    data.push({ Keterangan: 'TOTAL PENGELUARAN', Nominal: reportData.summary.total_expense });
    data.push({ Keterangan: 'TOTAL PENDAPATAN', Nominal: reportData.summary.total_revenue });
    data.push({ Keterangan: 'KAS BERSIH', Nominal: reportData.summary.net_cash });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pengeluaran Kas');
    const buf = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(
      new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `laporan-kas-kasir-${reportStart}-${reportEnd}.xlsx`
    );
    toast.success('Excel berhasil didownload');
  };

  return (
    <div className="space-y-6" data-testid="cash-expense-page">
      <div>
        <h1 className="font-heading text-4xl font-bold tracking-tight">Kas Kasir</h1>
        <p className="text-muted-foreground mt-2">Catat pengeluaran kas dari pendapatan hari ini</p>
      </div>

      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid grid-cols-2 max-w-md">
          <TabsTrigger value="today" data-testid="tab-today">Hari ini</TabsTrigger>
          <TabsTrigger value="report" data-testid="tab-report">Laporan</TabsTrigger>
        </TabsList>

        {/* ====== TODAY TAB ====== */}
        <TabsContent value="today" className="space-y-6 mt-6">
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Jam</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead>Dicatat oleh</TableHead>
                      <TableHead className="text-right">Nominal</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense, idx) => (
                      <TableRow key={expense.id} data-testid={`expense-item-${idx}`}>
                        <TableCell className="text-sm text-muted-foreground">
                          {expense.created_at
                            ? new Date(expense.created_at).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {expense.category ? (
                            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                              {expense.category}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{expense.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {expense.created_by || user?.name || '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-destructive">
                          - {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(expense.id)}
                            data-testid={`delete-expense-${idx}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== REPORT TAB ====== */}
        <TabsContent value="report" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Filter Periode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[180px]">
                  <Label htmlFor="report-start">Tanggal Mulai</Label>
                  <Input
                    id="report-start"
                    type="date"
                    value={reportStart}
                    onChange={(e) => setReportStart(e.target.value)}
                    data-testid="cash-report-start-date"
                  />
                </div>
                <div className="flex-1 min-w-[180px]">
                  <Label htmlFor="report-end">Tanggal Akhir</Label>
                  <Input
                    id="report-end"
                    type="date"
                    value={reportEnd}
                    onChange={(e) => setReportEnd(e.target.value)}
                    data-testid="cash-report-end-date"
                  />
                </div>
                <Button
                  onClick={handleGenerateReport}
                  disabled={reportLoading}
                  data-testid="generate-cash-report-button"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {reportLoading ? 'Memproses...' : 'Generate Laporan'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {reportData ? (
            <>
              <div className="grid gap-4 sm:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
                    <p
                      className="text-2xl font-bold mt-1 text-destructive"
                      data-testid="report-total-expense"
                    >
                      {formatCurrency(reportData.summary.total_expense)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Total Pendapatan</p>
                    <p className="text-2xl font-bold mt-1" data-testid="report-total-revenue">
                      {formatCurrency(reportData.summary.total_revenue)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Kas Bersih</p>
                    <p
                      className="text-2xl font-bold mt-1 text-primary"
                      data-testid="report-net-cash"
                    >
                      {formatCurrency(reportData.summary.net_cash)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Jumlah Entri</p>
                    <p className="text-2xl font-bold mt-1" data-testid="report-total-count">
                      {reportData.summary.total_count}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Export Laporan</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button
                    onClick={handleExportPDF}
                    variant="outline"
                    data-testid="export-cash-pdf-button"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                  <Button
                    onClick={handleExportExcel}
                    variant="outline"
                    data-testid="export-cash-excel-button"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Excel
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Detail Pengeluaran</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Keterangan</TableHead>
                        <TableHead>Dicatat oleh</TableHead>
                        <TableHead className="text-right">Nominal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.expenses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            <p className="text-muted-foreground">Tidak ada pengeluaran</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        reportData.expenses.map((e, idx) => (
                          <TableRow key={e.id} data-testid={`report-expense-${idx}`}>
                            <TableCell className="text-sm">{formatDateTime(e.created_at)}</TableCell>
                            <TableCell>
                              {e.category ? (
                                <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                                  {e.category}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{e.description}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {e.created_by || '-'}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-destructive">
                              - {formatCurrency(e.amount)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p className="text-muted-foreground">Pilih periode dan klik Generate Laporan</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

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
              <Label htmlFor="expense-category">Kategori (opsional)</Label>
              <Input
                id="expense-category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Contoh: Belanja Bahan, Listrik, Gaji"
                data-testid="expense-category-input"
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