import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Scissors, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const StylistsPage = () => {
  const [stylists, setStylists] = useState([]);
  const [filteredStylists, setFilteredStylists] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStylist, setEditingStylist] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    specialty: '',
    commission_rate: 0,
    status: 'active'
  });

  useEffect(() => {
    fetchStylists();
  }, []);

  useEffect(() => {
    const filtered = stylists.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.specialty.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStylists(filtered);
  }, [searchTerm, stylists]);

  const fetchStylists = async () => {
    try {
      const response = await api.getStylists();
      setStylists(response.data);
      setFilteredStylists(response.data);
    } catch (error) {
      toast.error('Gagal memuat data stylist');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStylist) {
        await api.updateStylist(editingStylist.id, { ...editingStylist, ...formData });
        toast.success('Stylist berhasil diupdate');
      } else {
        await api.createStylist(formData);
        toast.success('Stylist berhasil ditambahkan');
      }
      fetchStylists();
      handleCloseDialog();
    } catch (error) {
      toast.error('Gagal menyimpan data stylist');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus stylist ini?')) return;
    try {
      await api.deleteStylist(id);
      toast.success('Stylist berhasil dihapus');
      fetchStylists();
    } catch (error) {
      toast.error('Gagal menghapus stylist');
    }
  };

  const handleEdit = (stylist) => {
    setEditingStylist(stylist);
    setFormData({
      name: stylist.name,
      phone: stylist.phone,
      specialty: stylist.specialty,
      commission_rate: stylist.commission_rate,
      status: stylist.status
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingStylist(null);
    setFormData({ name: '', phone: '', specialty: '', commission_rate: 0, status: 'active' });
  };

  return (
    <div className="space-y-6" data-testid="stylists-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-heading text-4xl font-bold tracking-tight">Stylist / Barber</h1>
          <p className="text-muted-foreground mt-2">Kelola data karyawan salon</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingStylist(null)} data-testid="add-stylist-button">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Stylist
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="stylist-dialog">
            <DialogHeader>
              <DialogTitle>{editingStylist ? 'Edit Stylist' : 'Tambah Stylist Baru'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nama</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="stylist-name-input"
                />
              </div>
              <div>
                <Label htmlFor="phone">Nomor HP</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  data-testid="stylist-phone-input"
                />
              </div>
              <div>
                <Label htmlFor="specialty">Spesialisasi</Label>
                <Input
                  id="specialty"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  placeholder="e.g. Potong Rambut, Hair Coloring"
                  required
                  data-testid="stylist-specialty-input"
                />
              </div>
              <div>
                <Label htmlFor="commission_rate">Komisi (%)</Label>
                <Input
                  id="commission_rate"
                  type="number"
                  value={formData.commission_rate}
                  onChange={(e) => setFormData({ ...formData, commission_rate: Number(e.target.value) })}
                  min="0"
                  max="100"
                  required
                  data-testid="stylist-commission-input"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger id="status" data-testid="stylist-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="inactive">Tidak Aktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" data-testid="save-stylist-button">
                  Simpan
                </Button>
                <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                  Batal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Stylist</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari stylist..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-stylist-input"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Nomor HP</TableHead>
                <TableHead>Spesialisasi</TableHead>
                <TableHead>Komisi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStylists.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Scissors className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-muted-foreground">Belum ada data stylist</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStylists.map((stylist, idx) => (
                  <TableRow key={stylist.id} data-testid={`stylist-row-${idx}`}>
                    <TableCell className="font-medium">{stylist.name}</TableCell>
                    <TableCell>{stylist.phone}</TableCell>
                    <TableCell>{stylist.specialty}</TableCell>
                    <TableCell>{stylist.commission_rate}%</TableCell>
                    <TableCell>
                      <Badge variant={stylist.status === 'active' ? 'default' : 'outline'}>
                        {stylist.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(stylist)}
                        data-testid={`edit-stylist-${idx}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDelete(stylist.id)}
                        data-testid={`delete-stylist-${idx}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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

export default StylistsPage;