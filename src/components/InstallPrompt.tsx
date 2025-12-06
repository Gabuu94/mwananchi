import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import helaPesaLogo from "@/assets/hela-pesa-logo.png";

const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const { isInstallable, isInstalled, installApp } = usePWAInstall();

  useEffect(() => {
    // Check if user has already dismissed the prompt
    const dismissed = localStorage.getItem("installPromptDismissed");
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const dayInMs = 24 * 60 * 60 * 1000;
    
    // Show prompt again after 1 day if dismissed
    const shouldShow = !dismissed || (Date.now() - dismissedTime > dayInMs);
    
    if (shouldShow && !isInstalled) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000); // Show after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [isInstalled]);

  const handleDismiss = () => {
    localStorage.setItem("installPromptDismissed", Date.now().toString());
    setShowPrompt(false);
  };

  const handleInstall = async () => {
    if (isInstallable) {
      await installApp();
      setShowPrompt(false);
    }
  };

  // Don't show if already installed
  if (isInstalled) return null;

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 rounded-full p-1 hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        
        <DialogHeader className="text-center space-y-4">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto overflow-hidden">
            <img src={helaPesaLogo} alt="Hela Loans" className="w-full h-full object-cover" />
          </div>
          <DialogTitle className="text-xl">Get Hela Loans App</DialogTitle>
          <DialogDescription className="text-center">
            Install our app for quick access to loans, savings, and more. No app store needed!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* PWA Install Button */}
          {isInstallable && (
            <Button 
              variant="cute" 
              className="w-full gap-2"
              onClick={handleInstall}
            >
              <Download className="w-5 h-5" />
              Install Now
            </Button>
          )}

          {/* Store Links */}
          <div className="flex flex-col gap-3">
            <p className="text-xs text-center text-muted-foreground">
              {isInstallable ? "Or get it from:" : "Download from:"}
            </p>
            
            {/* Google Play Store */}
            <a 
              href="https://play.google.com/store" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors"
            >
              <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 512 512" className="w-6 h-6">
                  <linearGradient id="playGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00C4CC"/>
                    <stop offset="25%" stopColor="#00C4CC"/>
                    <stop offset="50%" stopColor="#F2BC00"/>
                    <stop offset="75%" stopColor="#E8453C"/>
                    <stop offset="100%" stopColor="#AB36B8"/>
                  </linearGradient>
                  <path fill="#00C4CC" d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0z"/>
                  <path fill="#FFCE00" d="M325.3 277.7l60.1 60.1L104.6 499l220.7-221.3z"/>
                  <path fill="#F14C48" d="M486.7 256L425 220.7l-60.1 60.1 60.1 60.1L486.7 256z"/>
                  <path fill="#AB36B8" d="M104.6 499l280.8-161.2-60.1-60.1L104.6 499z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">GET IT ON</p>
                <p className="font-semibold text-sm">Google Play</p>
              </div>
            </a>

            {/* Apple App Store */}
            <a 
              href="https://apps.apple.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors"
            >
              <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 384 512" className="w-5 h-6 fill-current">
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Download on the</p>
                <p className="font-semibold text-sm">App Store</p>
              </div>
            </a>
          </div>

          {/* Dismiss Button */}
          <Button 
            variant="ghost" 
            className="w-full text-muted-foreground"
            onClick={handleDismiss}
          >
            Maybe Later
          </Button>
        </div>

        {/* Features */}
        <div className="mt-2 pt-4 border-t border-border">
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Smartphone className="w-3 h-3" />
              <span>Works Offline</span>
            </div>
            <div className="flex items-center gap-1">
              <Download className="w-3 h-3" />
              <span>Fast & Light</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InstallPrompt;