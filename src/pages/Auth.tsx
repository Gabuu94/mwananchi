import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import helaLogo from "@/assets/hela-logo.png";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    idNumber: "",
    phoneNumber: "",
    password: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (!formData.phoneNumber || !formData.password) {
      toast({
        title: "Incomplete Form",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (!isLogin && (!formData.fullName || !formData.idNumber)) {
      toast({
        title: "Incomplete Form",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      // Use phone as email (phone@helaloans.com)
      const email = `${formData.phoneNumber}@helaloans.com`;

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: formData.password,
        });

        if (error) throw error;

        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              id_number: formData.idNumber,
              phone: formData.phoneNumber,
            }
          }
        });

        if (error) throw error;

        toast({
          title: "Account Created",
          description: "Welcome to Hela Loans!",
        });
      }

      navigate("/terms");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center space-y-4">
          <img 
            src={helaLogo} 
            alt="Hela Loans" 
            className="h-16 w-auto mx-auto"
          />
          <div>
            <CardTitle className="text-2xl">
              {isLogin ? "Welcome Back!" : "Join Hela Loans"}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? "Sign in to continue your loan application" 
                : "Create an account to get started"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required={!isLogin}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="idNumber">ID Number</Label>
                  <Input
                    id="idNumber"
                    placeholder="12345678"
                    value={formData.idNumber}
                    onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                    required={!isLogin}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number (M-Pesa Registered)</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="0712345678"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <Button 
              type="submit" 
              variant="cute" 
              className="w-full" 
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Please wait...
                </>
              ) : isLogin ? (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Create Account
                </>
              )}
            </Button>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:underline font-medium"
              >
                {isLogin 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
