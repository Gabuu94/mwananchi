import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Shield, Zap, Users } from "lucide-react";
import mwananchiLogo from "@/assets/mwananchi-credit-logo.png";
import DecorativeBackground from "@/components/DecorativeBackground";
import AppDownloadSection from "@/components/AppDownloadSection";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-soft relative">
      <DecorativeBackground />
      {/* Hero Section */}
      <main className="container mx-auto px-4 py-8 md:py-16">
        <div className="flex flex-col items-center text-center space-y-8 max-w-3xl mx-auto">
          {/* Logo */}
          <div className="animate-float">
            <img 
              src={mwananchiLogo} 
              alt="Mwananchi Credit" 
              className="h-24 md:h-32 w-auto rounded-2xl"
            />
          </div>

          {/* Tagline */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
              Fast, Friendly, and Reliable Loans for Everyone!
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
              Get the financial support you need in minutes with simple application and quick approval. Plus, grow your wealth with our Money Market Fund savings—earn competitive returns while building your financial future.
            </p>
          </div>

          {/* CTA Button */}
          <Button 
            variant="cute" 
            size="lg"
            onClick={() => navigate("/auth")}
            className="animate-bounce-soft"
          >
            <Users className="w-5 h-5 mr-2" />
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
                <Users className="w-6 h-6 text-accent-foreground" />
              </div>
              <h3 className="font-bold text-lg mb-2">Simple Process</h3>
              <p className="text-muted-foreground text-sm">
                No complicated paperwork, just a few simple steps
              </p>
            </div>

            {/* App Download Section */}
            <AppDownloadSection />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-muted-foreground text-sm">
        <p>© 2025 Mwananchi Credit. Investor in People. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Landing;