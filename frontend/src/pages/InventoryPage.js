import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Archive, AlertTriangle, TrendingUp, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const InventoryPage = () => {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await api.getProducts();
      const data = response.data;
      setProducts(data);

      // Calculate stats
      const lowStock = data.filter(p => p.stock > 0 && p.stock <= p.min_stock).length;
      const outOfStock = data.filter(p => p.stock === 0).length;
      const totalValue = data.reduce((sum, p) => sum + (p.stock * p.buy_price), 0);

      setStats({
        totalProducts: data.length,
        lowStock,
        outOfStock,
        totalValue
      });
    } catch (error) {
      toast.error('Gagal memuat data inventori');
    }
  };

  return (
    <div className="space-y-6" data-testid="inventory-page">
      <div>
        <h1 className="font-heading text-4xl font-bold tracking-tight">Inventori</h1>
        <p className="text-muted-foreground mt-2">Monitor stok dan inventori produk</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-heading font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">Jenis produk</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Rendah</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-heading font-bold text-yellow-500">{stats.lowStock}</div>
            <p className="text-xs text-muted-foreground mt-1">Perlu restock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Habis</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-heading font-bold text-red-500">{stats.outOfStock}</div>
            <p className="text-xs text-muted-foreground mt-1">Produk kosong</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nilai Inventori</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-heading font-bold">{formatCurrency(stats.totalValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total nilai stok</p>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Status Inventori</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Stok Saat Ini</TableHead>
                <TableHead>Stok Minimum</TableHead>
                <TableHead>Harga Beli</TableHead>
                <TableHead>Nilai Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Archive className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-muted-foreground">Belum ada data inventori</p>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product, idx) => (
                  <TableRow key={product.id} data-testid={`inventory-row-${idx}`}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{product.stock}</TableCell>
                    <TableCell>{product.min_stock}</TableCell>
                    <TableCell>{formatCurrency(product.buy_price)}</TableCell>
                    <TableCell>{formatCurrency(product.stock * product.buy_price)}</TableCell>
                    <TableCell>
                      {product.stock === 0 ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Habis
                        </Badge>
                      ) : product.stock <= product.min_stock ? (
                        <Badge variant="outline" className="gap-1 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                          <AlertTriangle className="h-3 w-3" />
                          Rendah
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                          Aman
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryPage;