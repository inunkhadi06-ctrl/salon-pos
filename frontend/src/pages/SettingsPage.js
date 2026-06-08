import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Save, Loader2 } from 'lucide-react';

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    business_name: '',
    phone: '',
    address: '',
    open_time: '',
    close_time: '',
    tax_rate: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.getSettings();
      setSettings(response.data);
    } catch (error) {
      toast.error('Gagal memuat pengaturan');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSettings(settings);
      toast.success('Pengaturan berhasil disimpan');
    } catch (error) {
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <h1 className="font-heading text-4xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground mt-2">Kelola pengaturan aplikasi dan bisnis</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Informasi Bisnis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="business_name">Nama Usaha</Label>
                <Input
                  id="business_name"
                  value={settings.business_name}
                  onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                  required
                  data-testid="settings-business-name"
                />
              </div>

              <div>
                <Label htmlFor="phone">Nomor Telepon</Label>
                <Input
                  id="phone"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  data-testid="settings-phone"
                />
              </div>

              <div>
                <Label htmlFor="address">Alamat</Label>
                <Input
                  id="address"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  data-testid="settings-address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="open_time">Jam Buka</Label>
                  <Input
                    id="open_time"
                    type="time"
                    value={settings.open_time}
                    onChange={(e) => setSettings({ ...settings, open_time: e.target.value })}
                    data-testid="settings-open-time"
                  />
                </div>
                <div>
                  <Label htmlFor="close_time">Jam Tutup</Label>
                  <Input
                    id="close_time"
                    type="time"
                    value={settings.close_time}
                    onChange={(e) => setSettings({ ...settings, close_time: e.target.value })}
                    data-testid="settings-close-time"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="tax_rate">Pajak (%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.tax_rate}
                  onChange={(e) => setSettings({ ...settings, tax_rate: Number(e.target.value) })}
                  required
                  data-testid="settings-tax-rate"
                />
              </div>
            </div>

            <Button type="submit" disabled={saving} data-testid="save-settings-button">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Simpan Pengaturan
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;