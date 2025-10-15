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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
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

    // Validate phone number format (Kenyan format)
    const phoneRegex = /^(254|0)[17]\d{8}$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid Kenyan phone number (e.g., 0712345678)",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Validate ID number (numeric only)
    if (!isLogin && !/^\d+$/.test(formData.idNumber)) {
      toast({
        title: "Invalid ID Number",
        description: "ID Number must contain only numbers",
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
      if (isLogin) {
        // Use phone as email (phone@helaloans.com)
        const email = `${formData.phoneNumber}@helaloans.com`;
        
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: formData.password,
        });

        if (error) throw error;

        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });
        
        navigate("/terms");
      } else {
        // Send OTP to phone number for signup
        const { error } = await supabase.auth.signInWithOtp({
          phone: formData.phoneNumber.startsWith('0') 
            ? '+254' + formData.phoneNumber.slice(1) 
            : '+' + formData.phoneNumber,
        });

        if (error) throw error;

        setShowOtpInput(true);
        toast({
          title: "OTP Sent",
          description: "Please check your phone for the verification code",
        });
      }
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

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Verify OTP
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: formData.phoneNumber.startsWith('0') 
          ? '+254' + formData.phoneNumber.slice(1) 
          : '+' + formData.phoneNumber,
        token: otp,
        type: 'sms',
      });

      if (verifyError) throw verifyError;

      // After OTP verification, update user metadata with additional info
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: formData.fullName,
          id_number: formData.idNumber,
          phone: formData.phoneNumber,
        }
      });

      if (updateError) throw updateError;

      // Set password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (passwordError) throw passwordError;

      toast({
        title: "Account Created",
        description: "Welcome to Hela Loans!",
      });

      navigate("/terms");
    } catch (error: any) {
      toast({
        title: "Verification Failed",
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
          {showOtpInput ? (
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <Label>Enter Verification Code</Label>
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit code to {formData.phoneNumber}
                </p>
              </div>
              
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button 
                onClick={handleVerifyOtp}
                variant="cute" 
                className="w-full" 
                size="lg"
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Create Account"
                )}
              </Button>

              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setShowOtpInput(false);
                    setOtp("");
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  Back to sign up
                </button>
              </div>
            </div>
          ) : (
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
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="12345678"
                      value={formData.idNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setFormData({ ...formData, idNumber: value });
                      }}
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
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0712345678"
                  value={formData.phoneNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setFormData({ ...formData, phoneNumber: value });
                  }}
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
                    Send Verification Code
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
