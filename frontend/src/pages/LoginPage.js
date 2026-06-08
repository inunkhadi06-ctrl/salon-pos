import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LogIn, Loader2 } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      toast.success('Login berhasil!');
      navigate('/dashboard');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative"
      data-testid="login-page"
    >
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://static.prod-images.emergentagent.com/jobs/97d7c5c9-1c54-4247-a592-954b0b75281b/images/655e466502e54202a19f50c4b55f8e8f4c641ca5ebc0f205adfd7931df13a913.png')`,
        }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-card/95 backdrop-blur-md rounded-lg shadow-2xl border border-border p-8">
          <div className="flex flex-col items-center mb-8">
            <img 
              src="logobaru.jpeg"
              alt="Mulya Salon Logo"
              className="h-16 w-16 mb-4"
              data-testid="login-logo"
            />
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Mulya Salon & Barbershop
            </h1>
            <p className="text-muted-foreground mt-2">Sistem Manajemen POS</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email-input"
                className="focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="login-password-input"
                className="focus-visible:ring-primary"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
              data-testid="login-submit-button"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Masuk
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;