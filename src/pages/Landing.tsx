import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sparkles, Shield, Zap, CheckCircle2 } from "lucide-react";
import helaLogo from "@/assets/hela-logo.png";
import { toast } from "sonner";
import { useEffect } from "react";

const Landing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Generate random Kenyan phone number with masking
    const generateMaskedPhone = () => {
      const prefix = "+254 7";
      const lastDigits = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
      return `${prefix}** *** ${lastDigits}`;
    };

    // Generate random loan amount within our range
    const generateLoanAmount = () => {
      const min = 3450;
      const max = 14600;
      return Math.floor(Math.random() * (max - min + 1) + min);
    };

    // Show loan notification
    const showLoanNotification = () => {
      const phone = generateMaskedPhone();
      const amount = generateLoanAmount();
      
      toast.success(
        `${phone} just received KSh ${amount.toLocaleString()}!`,
        {
          icon: <CheckCircle2 className="w-5 h-5 text-primary" />,
          duration: 4000,
        }
      );
    };

    // Random intervals array
    const intervals = [3000, 4000, 5000, 6000, 7000];
    
    // Schedule next notification
    const scheduleNext = () => {
      const randomInterval = intervals[Math.floor(Math.random() * intervals.length)];
      setTimeout(() => {
        showLoanNotification();
        scheduleNext();
      }, randomInterval);
    };

    // Start the notification cycle after initial delay
    const initialTimeout = setTimeout(() => {
      showLoanNotification();
      scheduleNext();
    }, 2000);

    return () => clearTimeout(initialTimeout);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Hero Section */}
      <main className="container mx-auto px-4 py-8 md:py-16">
        <div className="flex flex-col items-center text-center space-y-8 max-w-3xl mx-auto">
          {/* Logo */}
          <div className="animate-float">
            <img 
              src={helaLogo} 
              alt="Hela Loans" 
              className="h-24 md:h-32 w-auto"
            />
          </div>

          {/* Tagline */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
              Fast, Friendly, and Reliable Loans for Everyone!
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
              Get the financial support you need in minutes. Simple application, quick approval, and transparent terms.
            </p>
          </div>

          {/* CTA Button */}
          <Button 
            variant="cute" 
            size="lg"
            onClick={() => navigate("/auth")}
            className="animate-bounce-soft"
          >
            <Sparkles className="w-5 h-5" />
            Apply Now
          </Button>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-16">
            <div className="bg-card p-6 rounded-2xl shadow-card hover:shadow-soft transition-all duration-300 hover:-translate-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">Lightning Fast</h3>
              <p className="text-muted-foreground text-sm">
                Get your loan approved in minutes, not days
              </p>
            </div>

            <div className="bg-card p-6 rounded-2xl shadow-card hover:shadow-soft transition-all duration-300 hover:-translate-y-2">
              <div className="w-12 h-12 bg-secondary/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Shield className="w-6 h-6 text-secondary-foreground" />
              </div>
              <h3 className="font-bold text-lg mb-2">Secure & Safe</h3>
              <p className="text-muted-foreground text-sm">
                Your data is protected with bank-level security
              </p>
            </div>

            <div className="bg-card p-6 rounded-2xl shadow-card hover:shadow-soft transition-all duration-300 hover:-translate-y-2">
              <div className="w-12 h-12 bg-accent/30 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <Sparkles className="w-6 h-6 text-accent-foreground" />
              </div>
              <h3 className="font-bold text-lg mb-2">Simple Process</h3>
              <p className="text-muted-foreground text-sm">
                No complicated paperwork, just a few simple steps
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-muted-foreground text-sm">
        <p>© 2025 Hela Loans. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Landing;
