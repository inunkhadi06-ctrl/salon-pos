import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Sparkles, Plus, Pencil, Trash2, Search } from 'lucide-react';

const ServicesPage = () => {
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    duration: 0,
    priceType: 'fixed',
    price: 0,
    minPrice: 0,
    maxPrice: 0,
    description: ''
  });

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
  const filtered = services.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = categoryFilter === 'Semua' || 
      s.category?.toLowerCase() === categoryFilter.toLowerCase();
    return matchSearch && matchCategory;
  });
  setFilteredServices(filtered);
}, [searchTerm, categoryFilter, services]);

  const fetchServices = async () => {
    try {
      const response = await api.getServices();
      setServices(response.data);  // cukup set services aja, filter handle sendiri via useEffect
    } catch (error) {
      toast.error('Gagal memuat data layanan');
    }
  };

  const buildServicePayload = () => {
    const isVariable = formData.priceType === 'variable';
    return {
      name: formData.name,
      category: formData.category,
      duration: formData.duration,
      description: formData.description,
      price_type: formData.priceType,
      price: isVariable ? 0 : formData.price,
      min_price: isVariable ? formData.minPrice : null,
      max_price: isVariable ? formData.maxPrice : null,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = buildServicePayload();
    try {
      if (editingService) {
        await api.updateService(editingService.id, { ...editingService, ...payload });
        toast.success('Layanan berhasil diupdate');
      } else {
        await api.createService(payload);
        toast.success('Layanan berhasil ditambahkan');
      }
      fetchServices();
      handleCloseDialog();
    } catch (error) {
      toast.error('Gagal menyimpan data layanan');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus layanan ini?')) return;
    try {
      await api.deleteService(id);
      toast.success('Layanan berhasil dihapus');
      fetchServices();
    } catch (error) {
      toast.error('Gagal menghapus layanan');
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      category: service.category,
      duration: service.duration,
      priceType: service.price_type || 'fixed',
      price: service.price || 0,
      minPrice: service.min_price || 0,
      maxPrice: service.max_price || 0,
      description: service.description || ''
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingService(null);
    setFormData({
      name: '',
      category: '',
      duration: 0,
      priceType: 'fixed',
      price: 0,
      minPrice: 0,
      maxPrice: 0,
      description: ''
    });
  };

  return (
    <div className="space-y-6" data-testid="services-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-heading text-4xl font-bold tracking-tight">Layanan</h1>
          <p className="text-muted-foreground mt-2">Kelola layanan salon & barbershop</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingService(null)} data-testid="add-service-button">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Layanan
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="service-dialog">
            <DialogHeader>
              <DialogTitle>{editingService ? 'Edit Layanan' : 'Tambah Layanan Baru'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Layanan</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="service-name-input"
                />
              </div>
              <div>
                <Label htmlFor="category">Kategori</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g. Potong Rambut, Hair Coloring"
                  required
                  data-testid="service-category-input"
                />
              </div>
              <div>
                <Label htmlFor="duration">Durasi (menit)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                  required
                  data-testid="service-duration-input"
                />
              </div>
              <div>
                <Label>Tipe Harga</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={formData.priceType === 'fixed' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setFormData({ ...formData, priceType: 'fixed' })}
                    data-testid="price-type-fixed-button"
                  >
                    Harga Tetap
                  </Button>
                  <Button
                    type="button"
                    variant={formData.priceType === 'variable' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setFormData({ ...formData, priceType: 'variable' })}
                    data-testid="price-type-variable-button"
                  >
                    Harga Variabel
                  </Button>
                </div>
              </div>

              {formData.priceType === 'fixed' ? (
                <div>
                  <Label htmlFor="price">Harga</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    required
                    data-testid="service-price-input"
                  />
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label htmlFor="minPrice">Harga Minimum</Label>
                    <Input
                      id="minPrice"
                      type="number"
                      value={formData.minPrice}
                      onChange={(e) => setFormData({ ...formData, minPrice: Number(e.target.value) })}
                      required
                      data-testid="service-min-price-input"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="maxPrice">Harga Maksimum</Label>
                    <Input
                      id="maxPrice"
                      type="number"
                      value={formData.maxPrice}
                      onChange={(e) => setFormData({ ...formData, maxPrice: Number(e.target.value) })}
                      required
                      data-testid="service-max-price-input"
                    />
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="service-description-input"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" data-testid="save-service-button">
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
          <CardTitle>Daftar Layanan</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari layanan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-service-input"
            />
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
  {['Semua', ...new Set(services.map(s => s.category).filter(Boolean))].map(f => (
    <button
      key={f}
      onClick={() => setCategoryFilter(f)}
      className={`px-3 py-1 rounded-full text-sm border transition
        ${categoryFilter === f
          ? 'bg-primary text-primary-foreground border-primary'
          : 'border-border text-muted-foreground hover:bg-accent'
        }`}
    >
      {f}
    </button>
  ))}
</div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Layanan</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Durasi</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-muted-foreground">Belum ada data layanan</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredServices.map((service, idx) => (
                  <TableRow key={service.id} data-testid={`service-row-${idx}`}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>{service.category}</TableCell>
                    <TableCell>{service.duration} menit</TableCell>
                    <TableCell>
                      {service.price_type === 'variable'
                        ? `${formatCurrency(service.min_price)} – ${formatCurrency(service.max_price)}`
                        : formatCurrency(service.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(service)}
                        data-testid={`edit-service-${idx}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDelete(service.id)}
                        data-testid={`delete-service-${idx}`}
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

export default ServicesPage;