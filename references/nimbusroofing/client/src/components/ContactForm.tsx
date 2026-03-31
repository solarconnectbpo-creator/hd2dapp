import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, CheckCircle, Star } from "lucide-react";
import { GOOGLE_REVIEW_URL } from "@/const";

interface ContactFormProps {
  title?: string;
  description?: string;
  defaultService?: string;
  compact?: boolean;
}

export function ContactForm({ 
  title = "Get Your Free Roof Inspection",
  description = "Fill out the form below and we'll contact you within 24 hours to schedule your free inspection.",
  defaultService,
  compact = false
}: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "McKinney",
    zipCode: "",
    serviceType: defaultService || "",
    urgency: "medium",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const createLeadMutation = trpc.leads.create.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Thank you! We'll contact you soon.", {
        description: "Your request has been received. We'll reach out within 24 hours.",
      });
      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData({
          name: "",
          email: "",
          phone: "",
          address: "",
          city: "McKinney",
          zipCode: "",
          serviceType: defaultService || "",
          urgency: "medium",
          message: "",
        });
        setSubmitted(false);
      }, 3000);
    },
    onError: (error: any) => {
      toast.error("Something went wrong", {
        description: "Please call us at (214) 612-6696 or try again later.",
      });
      console.error("Lead creation error:", error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.phone) {
      toast.error("Please fill in required fields", {
        description: "Name and phone number are required.",
      });
      return;
    }

    createLeadMutation.mutate({
      ...formData,
      urgency: formData.urgency as "low" | "medium" | "high" | "emergency",
      source: "contact_form",
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (submitted) {
    return (
      <Card className="border-2 border-green-500">
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">Thank You!</h3>
          <p className="text-muted-foreground mb-4">
            We've received your request and will contact you within 24 hours.
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            For urgent matters, call us at <a href="tel:+12146126696" className="text-primary font-semibold">(214) 612-6696</a>
          </p>
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-muted-foreground mb-3">Have you worked with us before? We'd love your feedback!</p>
            <a 
              href={GOOGLE_REVIEW_URL} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-all"
            >
              <Star className="h-4 w-4 fill-current" />
              Leave a Google Review
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="John Smith"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="(214) 555-0123"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="john@example.com"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="123 Main St"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">Zip Code</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) => handleChange("zipCode", e.target.value)}
                placeholder="75071"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serviceType">Service Needed</Label>
              <Select value={formData.serviceType} onValueChange={(value) => handleChange("serviceType", value)}>
                <SelectTrigger id="serviceType">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Residential Roofing">Residential Roofing</SelectItem>
                  <SelectItem value="Commercial Roofing">Commercial Roofing</SelectItem>
                  <SelectItem value="Storm Damage">Storm Damage Restoration</SelectItem>
                  <SelectItem value="Insurance Claim">Insurance Claim Assistance</SelectItem>
                  <SelectItem value="Roof Inspection">Free Roof Inspection</SelectItem>
                  <SelectItem value="Emergency Repair">Emergency Repair</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency</Label>
              <Select value={formData.urgency} onValueChange={(value) => handleChange("urgency", value)}>
                <SelectTrigger id="urgency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Not Urgent</SelectItem>
                  <SelectItem value="medium">Normal</SelectItem>
                  <SelectItem value="high">Soon (Within a week)</SelectItem>
                  <SelectItem value="emergency">Emergency (ASAP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Additional Details</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleChange("message", e.target.value)}
              placeholder="Tell us about your roofing needs, any visible damage, or questions you have..."
              rows={4}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={createLeadMutation.isPending}
          >
            {createLeadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Get Free Inspection"
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By submitting this form, you agree to be contacted by Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner. 
            We respect your privacy and will never share your information.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
