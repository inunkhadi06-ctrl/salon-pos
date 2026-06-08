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
import { Calendar, Plus, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const BookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stylists, setStylists] = useState([]);
  const [services, setServices] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    stylist_id: '',
    stylist_name: '',
    service_id: '',
    service_name: '',
    booking_date: '',
    booking_time: '',
    status: 'menunggu',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bookingsRes, customersRes, stylistsRes, servicesRes] = await Promise.all([
        api.getBookings(),
        api.getCustomers(),
        api.getStylists(),
        api.getServices()
      ]);
      setBookings(bookingsRes.data);
      setCustomers(customersRes.data);
      setStylists(stylistsRes.data);
      setServices(servicesRes.data);
    } catch (error) {
      toast.error('Gagal memuat data');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const customer = customers.find(c => c.id === formData.customer_id);
    const stylist = stylists.find(s => s.id === formData.stylist_id);
    const service = services.find(s => s.id === formData.service_id);

    const bookingData = {
      ...formData,
      customer_name: customer?.name || '',
      stylist_name: stylist?.name || '',
      service_name: service?.name || ''
    };

    try {
      if (editingBooking) {
        await api.updateBooking(editingBooking.id, { ...editingBooking, ...bookingData });
        toast.success('Booking berhasil diupdate');
      } else {
        await api.createBooking(bookingData);
        toast.success('Booking berhasil ditambahkan');
      }
      fetchData();
      handleCloseDialog();
    } catch (error) {
      toast.error('Gagal menyimpan booking');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus booking ini?')) return;
    try {
      await api.deleteBooking(id);
      toast.success('Booking berhasil dihapus');
      fetchData();
    } catch (error) {
      toast.error('Gagal menghapus booking');
    }
  };

  const handleEdit = (booking) => {
    setEditingBooking(booking);
    setFormData({
      customer_id: booking.customer_id,
      customer_name: booking.customer_name,
      stylist_id: booking.stylist_id,
      stylist_name: booking.stylist_name,
      service_id: booking.service_id,
      service_name: booking.service_name,
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      status: booking.status,
      notes: booking.notes || ''
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingBooking(null);
    setFormData({
      customer_id: '',
      customer_name: '',
      stylist_id: '',
      stylist_name: '',
      service_id: '',
      service_name: '',
      booking_date: '',
      booking_time: '',
      status: 'menunggu',
      notes: ''
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'menunggu': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'dikonfirmasi': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'selesai': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'dibatalkan': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return '';
    }
  };

  return (
    <div className="space-y-6" data-testid="bookings-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-heading text-4xl font-bold tracking-tight">Booking</h1>
          <p className="text-muted-foreground mt-2">Kelola jadwal booking pelanggan</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingBooking(null)} data-testid="add-booking-button">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Booking
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" data-testid="booking-dialog">
            <DialogHeader>
              <DialogTitle>{editingBooking ? 'Edit Booking' : 'Tambah Booking Baru'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Pelanggan</Label>
                <Select value={formData.customer_id} onValueChange={(value) => setFormData({ ...formData, customer_id: value })}>
                  <SelectTrigger data-testid="booking-customer-select">
                    <SelectValue placeholder="Pilih pelanggan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Stylist</Label>
                <Select value={formData.stylist_id} onValueChange={(value) => setFormData({ ...formData, stylist_id: value })}>
                  <SelectTrigger data-testid="booking-stylist-select">
                    <SelectValue placeholder="Pilih stylist..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stylists.map(stylist => (
                      <SelectItem key={stylist.id} value={stylist.id}>{stylist.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Layanan</Label>
                <Select value={formData.service_id} onValueChange={(value) => setFormData({ ...formData, service_id: value })}>
                  <SelectTrigger data-testid="booking-service-select">
                    <SelectValue placeholder="Pilih layanan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(service => (
                      <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="booking_date">Tanggal</Label>
                  <Input
                    id="booking_date"
                    type="date"
                    value={formData.booking_date}
                    onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
                    required
                    data-testid="booking-date-input"
                  />
                </div>
                <div>
                  <Label htmlFor="booking_time">Waktu</Label>
                  <Input
                    id="booking_time"
                    type="time"
                    value={formData.booking_time}
                    onChange={(e) => setFormData({ ...formData, booking_time: e.target.value })}
                    required
                    data-testid="booking-time-input"
                  />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger data-testid="booking-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="menunggu">Menunggu</SelectItem>
                    <SelectItem value="dikonfirmasi">Dikonfirmasi</SelectItem>
                    <SelectItem value="selesai">Selesai</SelectItem>
                    <SelectItem value="dibatalkan">Dibatalkan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" data-testid="save-booking-button">
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
          <CardTitle>Daftar Booking</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Stylist</TableHead>
                <TableHead>Layanan</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-muted-foreground">Belum ada data booking</p>
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((booking, idx) => (
                  <TableRow key={booking.id} data-testid={`booking-row-${idx}`}>
                    <TableCell className="font-medium">{booking.customer_name}</TableCell>
                    <TableCell>{booking.stylist_name}</TableCell>
                    <TableCell>{booking.service_name}</TableCell>
                    <TableCell>{booking.booking_date}</TableCell>
                    <TableCell>{booking.booking_time}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(booking)} data-testid={`edit-booking-${idx}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(booking.id)} data-testid={`delete-booking-${idx}`}>
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

export default BookingsPage;