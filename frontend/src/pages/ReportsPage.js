import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import { FileText, Download, Calendar, Scissors, Award } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const ReportsPage = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [commissionData, setCommissionData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Default ke hari ini untuk konsistensi dengan dashboard
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
    // Auto-generate report for today on mount
    loadReport(today, today);
  }, []);

  const loadReport = async (start, end) => {
    setLoading(true);

    try {
      const transactionRes = await api.getTransactionReport(start, end);
      setReportData(transactionRes.data);
    } catch (error) {
      console.error('Error loading transaction report:', error);
    }

    try {
      const commissionRes = await api.getStylistCommissionReport(start, end);
      setCommissionData(commissionRes.data);
    } catch (error) {
      console.error('Error loading commission report:', error);
    }

    setLoading(false);
  };

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Pilih tanggal mulai dan akhir');
      return;
    }
    if (startDate > endDate) {
      toast.error('Tanggal mulai harus sebelum atau sama dengan tanggal akhir');
      return;
    }
    await loadReport(startDate, endDate);
    toast.success('Laporan berhasil dibuat');
  };

  const handleExportPDF = () => {
  if (!reportData?.transactions?.length) {
    toast.error("Tidak ada data untuk diexport");
    return;
  }

  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Laporan Transaksi Mulya Salon", 14, 15);

  autoTable(doc, {
    startY: 25,
    head: [[
      "Invoice",
      "Tanggal",
      "Pelanggan",
      "Stylist",
      "Pembayaran",
      "Total"
    ]],
    body: reportData.transactions.map(item => [
      item.invoice_number || "-",
      formatDateTime(item.created_at),
      item.customer_name,
      item.stylist_name || "-",
      item.payment_method,
      formatCurrency(item.total)
    ])
  });

  doc.save(`laporan-${startDate}-${endDate}.pdf`);

  toast.success("PDF berhasil didownload");
};

  const handleExportExcel = () => {
  if (!reportData?.transactions?.length) {
    toast.error("Tidak ada data untuk diexport");
    return;
  }

  const data = reportData.transactions.map(item => ({
    Invoice: item.invoice_number,
    Tanggal: formatDateTime(item.created_at),
    Pelanggan: item.customer_name,
    Stylist: item.stylist_name,
    Pembayaran: item.payment_method,
    Total: item.total
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Laporan"
  );

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array"
  });

  const fileData = new Blob(
    [excelBuffer],
    {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
  );

  saveAs(
    fileData,
    `laporan-${startDate}-${endDate}.xlsx`
  );

  toast.success("Excel berhasil didownload");
};

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div>
        <h1 className="font-heading text-4xl font-bold tracking-tight">Laporan</h1>
        <p className="text-muted-foreground mt-2">Buat dan analisis laporan transaksi & komisi</p>
      </div>

      {/* Filter Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Periode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="start_date">Tanggal Mulai</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="report-start-date"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="end_date">Tanggal Akhir</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="report-end-date"
              />
            </div>
            <Button onClick={handleGenerateReport} disabled={loading} data-testid="generate-report-button">
              <FileText className="mr-2 h-4 w-4" />
              {loading ? 'Memproses...' : 'Generate Laporan'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="grid grid-cols-2 max-w-md">
          <TabsTrigger value="transactions" data-testid="tab-transactions">Transaksi</TabsTrigger>
          <TabsTrigger value="commission" data-testid="tab-commission">Komisi Stylist</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-6 mt-6">
          {reportData ? (
            <>
              <div className="grid gap-4 sm:grid-cols-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Transaksi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-heading font-bold" data-testid="report-total-transactions">{reportData.summary.total_transactions}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Pendapatan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-heading font-bold text-primary" data-testid="report-total-revenue">
                      {formatCurrency(reportData.summary.total_revenue)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Komisi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-heading font-bold" data-testid="report-total-commission">
                      {formatCurrency(reportData.summary.total_commission || 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Rata-rata</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-heading font-bold">
                      {formatCurrency(reportData.summary.average_transaction)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Export Laporan</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button onClick={handleExportPDF} variant="outline" data-testid="export-pdf-button">
                    <Download className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                  <Button onClick={handleExportExcel} variant="outline" data-testid="export-excel-button">
                    <Download className="mr-2 h-4 w-4" />
                    Export Excel
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Detail Transaksi</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Pelanggan</TableHead>
                        <TableHead>Stylist</TableHead>
                        <TableHead>Pembayaran</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.transactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            <p className="text-muted-foreground">Tidak ada transaksi</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        reportData.transactions.map((transaction, idx) => (
                          <TableRow key={transaction.id} data-testid={`report-transaction-${idx}`}>
                            <TableCell className="font-mono text-sm">{transaction.invoice_number || '-'}</TableCell>
                            <TableCell>{formatDateTime(transaction.created_at)}</TableCell>
                            <TableCell className="font-medium">{transaction.customer_name}</TableCell>
                            <TableCell>{transaction.stylist_name || '-'}</TableCell>
                            <TableCell className="capitalize">{transaction.payment_method}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(transaction.total)}
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

        <TabsContent value="commission" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Laporan Komisi Stylist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Stylist</TableHead>
                    <TableHead className="text-center">Jumlah Transaksi</TableHead>
                    <TableHead className="text-right">Omzet</TableHead>
                    <TableHead className="text-right">Total Komisi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!commissionData || commissionData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <Scissors className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p className="text-muted-foreground">Belum ada data komisi</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    commissionData.map((item, idx) => (
                      <TableRow key={item._id || idx} data-testid={`commission-row-${idx}`}>
                        <TableCell className="font-medium">{item.stylist_name || '-'}</TableCell>
                        <TableCell className="text-center">{item.total_transactions}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.total_revenue)}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {formatCurrency(item.total_commission)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;