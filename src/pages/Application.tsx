import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Application = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    idNumber: "",
    whatsappNumber: "",
    nextOfKinName: "",
    nextOfKinContact: "",
    incomeLevel: "",
    employmentStatus: "",
    occupation: "",
    contactPersonName: "",
    contactPersonPhone: "",
    loanReason: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.fullName || !formData.idNumber || !formData.whatsappNumber || 
        !formData.nextOfKinName || !formData.nextOfKinContact || !formData.incomeLevel || 
        !formData.employmentStatus || !formData.occupation || !formData.contactPersonName || !formData.contactPersonPhone) {
      toast({
        title: "Incomplete Form",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate phone numbers
    const phoneRegex = /^(254|0)[17]\d{8}$/;
    if (!phoneRegex.test(formData.whatsappNumber)) {
      toast({
        title: "Invalid WhatsApp Number",
        description: "Please enter a valid Kenyan phone number",
        variant: "destructive",
      });
      return;
    }

    if (!phoneRegex.test(formData.nextOfKinContact)) {
      toast({
        title: "Invalid Next of Kin Contact",
        description: "Please enter a valid Kenyan phone number",
        variant: "destructive",
      });
      return;
    }

    if (!phoneRegex.test(formData.contactPersonPhone)) {
      toast({
        title: "Invalid Contact Person Phone",
        description: "Please enter a valid Kenyan phone number",
        variant: "destructive",
      });
      return;
    }

    // Validate ID number
    if (formData.idNumber.length < 6 || formData.idNumber.length > 10) {
      toast({
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
        baseLoan = 5000;
        break;
      case "20k-50k":
        baseLoan = 15000;
        break;
      case "50k-100k":
        baseLoan = 35000;
        break;
      case "above-100k":
        baseLoan = 50000;
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
    }, 20000); // 20 seconds as specified
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

        {isLoading && (
          <Card className="mt-6 bg-primary/5 border-primary/20">
            <CardContent className="py-8 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-lg font-semibold text-primary">
                Please wait a few moments while we calculate your loan limit...
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                We're analyzing your information to provide you with the best loan offer
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Application;
