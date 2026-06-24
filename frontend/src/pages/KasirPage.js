import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Plus, Minus, Trash2, ShoppingCart, Loader2, Printer, X, User, Scissors as ScissorsIcon, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const KasirPage = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [stylists, setStylists] = useState([]);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedStylist, setSelectedStylist] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('tunai');
  const [cashPaid, setCashPaid] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [newCustomerDialog, setNewCustomerDialog] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', birth_date: '' });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('Semua');
  const [variableServiceModal, setVariableServiceModal] = useState(null);
  const [variablePrice, setVariablePrice] = useState(0);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [customersRes, stylistsRes, servicesRes, productsRes] = await Promise.all([
        api.getCustomers(),
        api.getStylists(),
        api.getServices(),
        api.getProducts()
      ]);
      setCustomers(customersRes.data);
      setStylists(stylistsRes.data.filter(s => s.status === 'active'));
      setServices(servicesRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data');
    }
  };

  const addServiceToCart = (service) => {
    const existingItem = cart.find(item => item.id === service.id && item.type === 'service');
    if (existingItem) {
      toast.info('Layanan sudah ada di keranjang');
      return;
    }
    if (service.price_type === 'variable') {
      setVariablePrice(service.min_price || 0);
      setVariableServiceModal(service);
      return;
    }
    setCart([...cart, { ...service, type: 'service', quantity: 1 }]);
    toast.success(`${service.name} ditambahkan`);
  };

  const confirmVariablePrice = () => {
    if (!variableServiceModal) return;
    if (!variablePrice || variablePrice <= 0) {
      toast.error('Masukkan harga yang valid');
      return;
    }
    setCart([...cart, { 
      ...variableServiceModal, 
      type: 'service', 
      quantity: 1,
      price: variablePrice
    }]);
    toast.success(`${variableServiceModal.name} ditambahkan`);
    setVariableServiceModal(null);
    setVariablePrice(0);
  };

  const addProductToCart = (product) => {
    if (product.stock <= 0) {
      toast.error('Stok produk habis');
      return;
    }
    const existingItem = cart.find(item => item.id === product.id && item.type === 'product');
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.error('Stok tidak mencukupi');
        return;
      }
      updateQuantity(product.id, 'product', existingItem.quantity + 1);
    } else {
      setCart([...cart, { ...product, type: 'product', price: product.sell_price, quantity: 1 }]);
      toast.success(`${product.name} ditambahkan`);
    }
  };

  const updateQuantity = (id, type, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(id, type);
      return;
    }
    if (type === 'product') {
      const product = products.find(p => p.id === id);
      if (newQuantity > product.stock) {
        toast.error('Stok tidak mencukupi');
        return;
      }
    }
    setCart(cart.map(item => 
      item.id === id && item.type === type ? { ...item, quantity: newQuantity } : item
    ));
  };

  const removeFromCart = (id, type) => {
    setCart(cart.filter(item => !(item.id === id && item.type === type)));
  };

  const subtotal = useMemo(() => 
    cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  , [cart]);

  const total = useMemo(() => 
    Math.max(0, subtotal - discount)
  , [subtotal, discount]);

  const change = useMemo(() => 
    paymentMethod === 'tunai' ? Math.max(0, cashPaid - total) : 0
  , [cashPaid, total, paymentMethod]);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Keranjang masih kosong');
      return;
    }
    if (!selectedCustomer) {
      toast.error('Pilih pelanggan terlebih dahulu');
      return;
    }
    if (!selectedStylist) {
      toast.error('Pilih stylist terlebih dahulu');
      return;
    }
    if (paymentMethod === 'tunai' && cashPaid < total) {
      toast.error('Uang dibayar kurang dari total');
      return;
    }

    setLoading(true);
    try {
      const transactionData = {
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        stylist_id: selectedStylist.id,
        stylist_name: selectedStylist.name,
        items: cart.map(item => ({
          type: item.type,
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        subtotal: subtotal,
        discount: discount,
        total: total,
        payment_method: paymentMethod,
        cash_paid: paymentMethod === 'tunai' ? cashPaid : total,
        change_amount: change,
        payment_status: 'lunas',
        served_by: user?.name || 'Kasir'
      };

      const response = await api.createTransaction(transactionData);
      setLastTransaction(response.data);
      setShowReceipt(true);
      
      // Reset form
      setCart([]);
      setSelectedCustomer(null);
      setSelectedStylist(null);
      setDiscount(0);
      setCashPaid(0);
      setPaymentMethod('tunai');
      
      toast.success('Transaksi berhasil disimpan!');
      fetchData();
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('Gagal menyimpan transaksi');
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = () => {
  if (!lastTransaction) return;

  const ESC = '\x1b';
  const GS = '\x1d';
  let cmds = '';

  // Init printer
  cmds += ESC + '@';

  // Center align
  const center = ESC + 'a' + '\x01';
  const left = ESC + 'a' + '\x00';
  const boldOn = ESC + 'E' + '\x01';
  const boldOff = ESC + 'E' + '\x00';

  const line = '--------------------------------';
  const dline = '================================';

  // Helper: pad left/right text to fit 32 chars (58mm paper)
  const row = (left_, right_) => {
    const maxLen = 32;
    const space = maxLen - left_.length - right_.length;
    return left_ + ' '.repeat(Math.max(1, space)) + right_ + '\n';
  };

  // Header
  cmds += center + boldOn + 'MULYA\n' + boldOff;
  cmds += 'Salon & Barbershop\n';
  cmds += left + line + '\n';

  // Info
  cmds += `Invoice : ${lastTransaction.invoice_number}\n`;
  cmds += `Tanggal : ${formatDateTime(lastTransaction.created_at)}\n`;
  cmds += `Pelanggan: ${lastTransaction.customer_name}\n`;
  cmds += `Stylist : ${lastTransaction.stylist_name}\n`;
  cmds += `Kasir   : ${lastTransaction.served_by}\n`;
  cmds += line + '\n';

  // Items
  cmds += boldOn + 'DETAIL ITEM:\n' + boldOff;
  lastTransaction.items.forEach(item => {
    const name = item.name + (item.quantity > 1 ? ` x${item.quantity}` : '');
    const price = formatCurrency(item.price * item.quantity);
    cmds += row(name.substring(0, 20), price);
  });
  cmds += line + '\n';

  // Totals
  cmds += row('Subtotal', formatCurrency(lastTransaction.subtotal));
  if (lastTransaction.discount > 0) {
    cmds += row('Diskon', '-' + formatCurrency(lastTransaction.discount));
  }
  cmds += dline + '\n';
  cmds += boldOn + row('TOTAL', formatCurrency(lastTransaction.total)) + boldOff;
  cmds += line + '\n';

  // Payment
  cmds += row('Metode Bayar', lastTransaction.payment_method.toUpperCase());
  if (lastTransaction.payment_method === 'tunai') {
    cmds += row('Dibayar', formatCurrency(lastTransaction.cash_paid));
    cmds += boldOn + row('Kembalian', formatCurrency(lastTransaction.change_amount)) + boldOff;
  }
  cmds += '\n';

  // Footer
  cmds += center + 'Terima kasih telah berkunjung.\n';
  cmds += 'Sampai jumpa kembali!\n';
  cmds += '\n\n\n';

  // Cut paper
  cmds += GS + 'V' + '\x42' + '\x00';

  // Convert to base64
  const bytes = [];
  for (let i = 0; i < cmds.length; i++) {
    bytes.push(cmds.charCodeAt(i) & 0xff);
  }
  const base64 = btoa(String.fromCharCode(...bytes));

  // Send to RawBT
  window.location.href = `rawbt:base64,${base64}`;
};
  const handleCreateCustomer = async () => {
  if (!newCustomerForm.name || !newCustomerForm.phone) {
    toast.error('Nama dan nomor HP wajib diisi');
    return;
  }
  setSavingCustomer(true);
  try {
    const response = await api.createCustomer(newCustomerForm);
    const created = response.data;
    await fetchData();
    setSelectedCustomer(created);
    setNewCustomerDialog(false);
    setNewCustomerForm({ name: '', phone: '', birth_date: '' });
    toast.success(`Pelanggan ${created.name} berhasil ditambahkan`);
  } catch (error) {
    toast.error('Gagal menyimpan pelanggan');
  } finally {
    setSavingCustomer(false);
  }
};


  return (
    <div className="space-y-6" data-testid="kasir-page">
      <div>
        <h1 className="font-heading text-4xl font-bold tracking-tight">Kasir (POS)</h1>
        <p className="text-muted-foreground mt-2">Proses transaksi penjualan</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Side - Selection & Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Stylist Selection */}
          <Card data-testid="selection-card">
            <CardHeader>
              <CardTitle>1. Pilih Pelanggan & Stylist</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4" />
                Pelanggan <span className="text-destructive">*</span>
  </Label>
  <div className="flex gap-2">
  <div className="relative flex-1">
    <Input
      data-testid="customer-search"
      placeholder={selectedCustomer ? selectedCustomer.name : "Cari nama pelanggan..."}
      value={customerSearch}
      onChange={(e) => {
        setCustomerSearch(e.target.value);
        setShowCustomerDropdown(true);
        if (!e.target.value) setSelectedCustomer(null);
      }}
      onFocus={() => setShowCustomerDropdown(true)}
      onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
      className={selectedCustomer ? 'border-primary' : ''}
    />
    {showCustomerDropdown && customerSearch && (
      <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-md max-h-48 overflow-y-auto">
        {customers
          .filter(c =>
            c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
            c.phone.includes(customerSearch)
          )
          .length === 0 ? (
          <p className="text-sm text-muted-foreground px-3 py-2">Pelanggan tidak ditemukan</p>
        ) : (
          customers
            .filter(c =>
              c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
              c.phone.includes(customerSearch)
            )
            .map(customer => (
              <button
                key={customer.id}
                type="button"
                onMouseDown={() => {
                  setSelectedCustomer(customer);
                  setCustomerSearch('');
                  setShowCustomerDropdown(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex flex-col"
              >
                <span className="font-medium">{customer.name}</span>
                <span className="text-xs text-muted-foreground">{customer.phone}</span>
              </button>
            ))
        )}
      </div>
    )}
  </div>
  <Button variant="outline" size="icon" onClick={() => setNewCustomerDialog(true)}>
    <Plus className="h-4 w-4" />
  </Button>
</div>
  {selectedCustomer && (
    <p className="text-xs text-muted-foreground mt-2">
      Poin: {selectedCustomer.loyalty_points} | Kunjungan: {selectedCustomer.visit_count}x
    </p>
  )}
</div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <ScissorsIcon className="h-4 w-4" />
                  Stylist <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={selectedStylist?.id || ''} 
                  onValueChange={(value) => {
                    const stylist = stylists.find(s => s.id === value);
                    setSelectedStylist(stylist);
                  }}
                >
                  <SelectTrigger data-testid="stylist-select">
                    <SelectValue placeholder="Pilih stylist..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stylists.map(stylist => (
                      <SelectItem key={stylist.id} value={stylist.id}>
                        {stylist.name} ({stylist.commission_rate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedStylist && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Komisi: {selectedStylist.commission_rate}% | {selectedStylist.specialty}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Services */}
          <Card data-testid="services-card">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Sparkles className="h-5 w-5" />
      2. Pilih Layanan
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    <Input
      placeholder="Cari layanan..."
      value={serviceSearch}
      onChange={(e) => setServiceSearch(e.target.value)}
      data-testid="service-search"
    />
    <div className="flex gap-2">
      {['Semua', ...new Set(services.map(s => s.category?.trim()).filter(Boolean))].map(f => (
        <button
          key={f}
          onClick={() => setServiceFilter(f)}
          className={`px-3 py-1 rounded-full text-sm border transition
            ${serviceFilter === f
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:bg-accent'
            }`}
        >
          {f}
        </button>
      ))}
    </div>

    {(() => {
      const filtered = services.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(serviceSearch.toLowerCase());
        const matchFilter = serviceFilter === 'Semua' || s.category?.trim().toLowerCase() === serviceFilter.trim().toLowerCase();
        return matchSearch && matchFilter;
      });

      if (services.length === 0) return (
        <p className="text-center text-muted-foreground py-4">Belum ada layanan</p>
      );
      if (filtered.length === 0) return (
        <p className="text-center text-muted-foreground py-4">Layanan tidak ditemukan</p>
      );
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(service => (
            <button
              key={service.id}
              onClick={() => addServiceToCart(service)}
              className="p-4 border border-border rounded-lg hover:bg-accent hover:border-primary transition text-left relative"
              data-testid={`service-item-${service.id}`}
            >
              {service.price_type === 'variable' && (
                <span className="absolute top-2 right-2 text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Variabel
                </span>
              )}
              <p className="font-medium">{service.name}</p>
              <p className="text-sm text-muted-foreground">{service.category}</p>
              <p className="text-sm font-semibold text-primary mt-2">
                {service.price_type === 'variable'
                  ? `${formatCurrency(service.min_price)} – ${formatCurrency(service.max_price)}`
                  : formatCurrency(service.price)
                }
              </p>
            </button>
          ))}
        </div>
      );
    })()}
  </CardContent>
</Card>

          {/* Products */}
          <Card data-testid="products-card">
            <CardHeader>
              <CardTitle>3. Tambah Produk Retail</CardTitle>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Belum ada produk</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {products.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addProductToCart(product)}
                      disabled={product.stock <= 0}
                      className="p-4 border border-border rounded-lg hover:bg-accent hover:border-primary transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid={`product-item-${product.id}`}
                    >
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.category}</p>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-sm font-semibold text-primary">
                          {formatCurrency(product.sell_price)}
                        </p>
                        <p className="text-xs text-muted-foreground">Stok: {product.stock}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side - Cart & Payment */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20" data-testid="cart-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Keranjang ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cart Items */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Keranjang kosong</p>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div 
                      key={`${item.type}-${item.id}`}
                      className="flex items-center gap-2 p-2 border border-border rounded-lg"
                      data-testid={`cart-item-${idx}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.price)}</p>
                      </div>
                      {item.type === 'product' ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.id, item.type, item.quantity - 1)}
                            data-testid={`decrease-qty-${idx}`}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm w-6 text-center">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.id, item.type, item.quantity + 1)}
                            data-testid={`increase-qty-${idx}`}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm w-6 text-center">1x</span>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive"
                        onClick={() => removeFromCart(item.id, item.type)}
                        data-testid={`remove-item-${idx}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {/* Payment Details */}
              <div className="space-y-3 pt-4 border-t border-border">
                <div>
                  <Label htmlFor="discount">Diskon (Rp)</Label>
                  <Input
                    id="discount"
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    min="0"
                    data-testid="discount-input"
                  />
                </div>

                <div>
                  <Label htmlFor="payment">Metode Pembayaran</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="payment" data-testid="payment-method-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tunai">Tunai</SelectItem>
                      <SelectItem value="qris">QRIS</SelectItem>
                      <SelectItem value="transfer">Transfer Bank</SelectItem>
                      <SelectItem value="e-wallet">E-Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Cash Payment Fields - Only show for Tunai */}
                {paymentMethod === 'tunai' && (
                  <>
                    <div>
                      <Label htmlFor="total-readonly">Total Transaksi</Label>
                      <Input
                        id="total-readonly"
                        type="text"
                        value={formatCurrency(total)}
                        readOnly
                        className="bg-muted/20 font-semibold"
                        data-testid="total-readonly"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cash-paid">Uang Dibayar (Rp)</Label>
                      <Input
                        id="cash-paid"
                        type="number"
                        value={cashPaid}
                        onChange={(e) => setCashPaid(Number(e.target.value) || 0)}
                        min="0"
                        placeholder="Masukkan nominal..."
                        data-testid="cash-paid-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="change">Kembalian</Label>
                      <Input
                        id="change"
                        type="text"
                        value={formatCurrency(change)}
                        readOnly
                        className="bg-muted/20 font-semibold text-primary"
                        data-testid="change-display"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Summary */}
              <div className="space-y-2 pt-4 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span data-testid="subtotal">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Diskon:</span>
                  <span className="text-red-500" data-testid="discount-amount">-{formatCurrency(discount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                  <span>Total:</span>
                  <span className="text-primary" data-testid="total-amount">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={loading || cart.length === 0 || !selectedCustomer || !selectedStylist}
                data-testid="checkout-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Simpan Transaksi
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md" data-testid="receipt-dialog">
          <DialogHeader>
            <DialogTitle>Struk Pembayaran</DialogTitle>
          </DialogHeader>
          {lastTransaction && (
            <div className="print-area space-y-3 font-mono text-sm">
              <div className="text-center border-b border-dashed pb-3">
                <h2 className="font-heading text-xl font-bold">MULYA SALON</h2>
                <p className="text-xs text-muted-foreground">Sistem POS Salon & Barbershop</p>
              </div>
              
              <div className="space-y-1 text-xs border-b border-dashed pb-3">
                <div className="flex justify-between">
                  <span>Invoice</span>
                  <span className="font-semibold" data-testid="receipt-invoice">: {lastTransaction.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal</span>
                  <span>: {formatDateTime(lastTransaction.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pelanggan</span>
                  <span data-testid="receipt-customer">: {lastTransaction.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Stylist</span>
                  <span data-testid="receipt-stylist">: {lastTransaction.stylist_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir</span>
                  <span>: {lastTransaction.served_by}</span>
                </div>
              </div>

              <div className="border-b border-dashed pb-3">
                <p className="text-xs font-semibold mb-2">DETAIL ITEM:</p>
                <div className="space-y-1 text-xs">
                  {lastTransaction.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>
                        {item.name}
                        {item.quantity > 1 && ` x${item.quantity}`}
                      </span>
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1 text-xs border-b border-dashed pb-3">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(lastTransaction.subtotal)}</span>
                </div>
                {lastTransaction.discount > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>Diskon</span>
                    <span>-{formatCurrency(lastTransaction.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1 border-t">
                  <span>TOTAL</span>
                  <span data-testid="receipt-total">{formatCurrency(lastTransaction.total)}</span>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Metode Bayar</span>
                  <span className="uppercase font-semibold" data-testid="receipt-payment-method">: {lastTransaction.payment_method}</span>
                </div>
                {lastTransaction.payment_method === 'tunai' && (
                  <>
                    <div className="flex justify-between">
                      <span>Dibayar</span>
                      <span data-testid="receipt-cash-paid">{formatCurrency(lastTransaction.cash_paid)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Kembalian</span>
                      <span data-testid="receipt-change">{formatCurrency(lastTransaction.change_amount)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="text-center text-xs text-muted-foreground border-t border-dashed pt-3">
                <p>Terima kasih telah berkunjung.</p>
                <p className="mt-1">Sampai jumpa kembali!</p>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={printReceipt} variant="outline" className="flex-1" data-testid="print-receipt-button">
              <Printer className="mr-2 h-4 w-4" />
              Cetak Struk
            </Button>
            <Button onClick={() => setShowReceipt(false)} className="flex-1" data-testid="close-receipt-button">
              <X className="mr-2 h-4 w-4" />
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>

              {/* Dialog Tambah Pelanggan Baru */}
<Dialog open={newCustomerDialog} onOpenChange={setNewCustomerDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Tambah Pelanggan Baru</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <div>
        <Label>Nama</Label>
        <Input
          value={newCustomerForm.name}
          onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
          placeholder="Nama pelanggan..."
          required
        />
      </div>
      <div>
        <Label>Nomor HP</Label>
        <Input
          value={newCustomerForm.phone}
          onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
          placeholder="08xx..."
          required
        />
      </div>
      <div>
        <Label>Tanggal Lahir</Label>
        <Input
          type="date"
          value={newCustomerForm.birth_date}
          onChange={(e) => setNewCustomerForm({ ...newCustomerForm, birth_date: e.target.value })}
        />
      </div>
      <div className="flex gap-2">
        <Button onClick={handleCreateCustomer} disabled={savingCustomer} className="flex-1">
          {savingCustomer ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Simpan
        </Button>
        <Button variant="outline" onClick={() => setNewCustomerDialog(false)} className="flex-1">
          Batal
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>

          {/* Modal Harga Variabel */}
<Dialog open={!!variableServiceModal} onOpenChange={(open) => !open && setVariableServiceModal(null)}>
  <DialogContent className="max-w-sm">
    <DialogHeader>
      <DialogTitle>{variableServiceModal?.name}</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Layanan ini punya harga variabel. Masukkan harga untuk transaksi ini.
      </p>
      <div>
        <Label>Harga (Rp)</Label>
        <Input
          type="number"
          value={variablePrice}
          onChange={(e) => setVariablePrice(Number(e.target.value) || 0)}
          autoFocus
        />
      </div>
      {variableServiceModal?.min_price && variableServiceModal?.max_price && (
        <div className="flex gap-2 flex-wrap">
          {[variableServiceModal.min_price,
            Math.round((variableServiceModal.min_price + variableServiceModal.max_price) / 2),
            variableServiceModal.max_price
          ].map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setVariablePrice(p)}
              className="px-3 py-1.5 text-xs border border-border rounded-full hover:border-primary hover:text-primary transition"
            >
              {formatCurrency(p)}
            </button>
          ))}
        </div>
      )}
      {variablePrice > 0 && variableServiceModal?.min_price && variableServiceModal?.max_price && (
        variablePrice < variableServiceModal.min_price || variablePrice > variableServiceModal.max_price
      ) && (
        <p className="text-xs text-amber-600">
          Harga di luar rentang biasa ({formatCurrency(variableServiceModal.min_price)} – {formatCurrency(variableServiceModal.max_price)}). Tetap bisa dilanjutkan.
        </p>
      )}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => setVariableServiceModal(null)}>
          Batal
        </Button>
        <Button className="flex-1" onClick={confirmVariablePrice}>
          Tambah ke Keranjang
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
    </div>
  );
};

export default KasirPage;
