import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, CheckCircle, Home, Shield, Clock, Award } from "lucide-react";
import { Link } from "wouter";
import { useEffect } from "react";

export default function ResidentialRoofing() {
  useEffect(() => {
    // Update page title and meta description for SEO
    document.title = "Residential Roofing McKinney TX | Architectural Shingle Installation";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Expert residential roofing services in McKinney, TX. Architectural shingles, metal roofing, roof replacement & repair. Licensed & insured. Call (214) 612-6696 for free inspection.');
    }
  }, []);

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3">
              <img src="/nimbus-ai-logo.png" alt="Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner" className="h-12 w-12" />
              <div>
                <h1 className="text-xl font-bold text-primary">Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner</h1>
                <p className="text-xs text-muted-foreground">McKinney, TX</p>
              </div>
            </Link>
            
            <div className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">Home</Link>
              <Link href="/services" className="text-sm font-medium text-primary">Services</Link>
              <Link href="/neighborhoods" className="text-sm font-medium hover:text-primary transition-colors">Neighborhoods</Link>
              <Link href="/contact" className="text-sm font-medium hover:text-primary transition-colors">Contact</Link>
            </div>
            
            <a href="tel:+12146126696" className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-all">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">(214) 612-6696</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-secondary text-white py-16">
        <div className="container">
          <div className="max-w-4xl">
            <Badge className="mb-4 bg-accent text-accent-foreground">Residential Roofing Services</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Expert Residential Roofing Services in McKinney, TX
            </h1>
            <p className="text-xl mb-8 text-white/90">
              Protect your McKinney home with premium roofing solutions. Architectural shingles, metal roofing, roof replacement, and repair services from licensed professionals.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                <Phone className="mr-2 h-5 w-5" />
                Call (214) 612-6696
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary">
                Get Free Inspection
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-20">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h2 className="text-3xl font-bold mb-6">Comprehensive Residential Roofing Solutions</h2>
              <p className="text-lg text-muted-foreground mb-6">
                As McKinney's trusted residential roofing contractor since 2015, we specialize in protecting your home with quality materials and expert craftsmanship. Whether you need a complete roof replacement or minor repairs, our team delivers exceptional results.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Architectural Shingle Installation</h3>
                    <p className="text-muted-foreground">Premium dimensional shingles designed for McKinney's climate. Superior wind and hail resistance.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Metal Roofing Systems</h3>
                    <p className="text-muted-foreground">Energy-efficient metal roofing with 50+ year lifespan. Standing seam and metal shingle options.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Complete Roof Replacement</h3>
                    <p className="text-muted-foreground">Full tear-off and replacement with proper ventilation and underlayment systems.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Roof Repair Services</h3>
                    <p className="text-muted-foreground">Leak repairs, shingle replacement, flashing repairs, and storm damage fixes.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-8">
              <h3 className="text-2xl font-bold mb-6">Why Choose Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner?</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Certified Contractors</h4>
                    <p className="text-sm text-muted-foreground">Owens Corning Preferred and GAF Certified professionals</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-secondary/10 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Lifetime Warranty</h4>
                    <p className="text-sm text-muted-foreground">Comprehensive warranty on workmanship and materials</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">10+ Years Experience</h4>
                    <p className="text-sm text-muted-foreground">Serving McKinney homeowners since 2015</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-secondary/10 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Home className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Local Expertise</h4>
                    <p className="text-sm text-muted-foreground">Deep understanding of McKinney HOA requirements</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Roofing Materials */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-8 text-center">Premium Roofing Materials</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-3">Architectural Shingles</h3>
                  <p className="text-muted-foreground mb-4">
                    Dimensional shingles offering superior aesthetics and durability. Available in multiple colors to match your home's style.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      30-50 year lifespan
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      Class 4 impact resistance
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      130 MPH wind rating
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-3">Metal Roofing</h3>
                  <p className="text-muted-foreground mb-4">
                    Energy-efficient metal roofing systems that reduce cooling costs and last a lifetime. Standing seam and metal shingle options.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      50+ year lifespan
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      Energy Star certified
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      Fire resistant
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-3">Synthetic Underlayment</h3>
                  <p className="text-muted-foreground mb-4">
                    Advanced synthetic underlayment provides superior protection against water infiltration and extends roof life.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      Waterproof barrier
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      UV resistant
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      Tear resistant
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Process */}
          <div className="bg-muted/30 rounded-lg p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-8 text-center">Our Residential Roofing Process</h2>
            <div className="grid md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">1</div>
                <h3 className="font-bold mb-2">Free Inspection</h3>
                <p className="text-sm text-muted-foreground">Comprehensive roof assessment and detailed report</p>
              </div>
              <div className="text-center">
                <div className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">2</div>
                <h3 className="font-bold mb-2">Detailed Quote</h3>
                <p className="text-sm text-muted-foreground">Transparent pricing with material options and timeline</p>
              </div>
              <div className="text-center">
                <div className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">3</div>
                <h3 className="font-bold mb-2">Professional Installation</h3>
                <p className="text-sm text-muted-foreground">Expert installation with minimal disruption</p>
              </div>
              <div className="text-center">
                <div className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">4</div>
                <h3 className="font-bold mb-2">Final Walkthrough</h3>
                <p className="text-sm text-muted-foreground">Complete cleanup and warranty documentation</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-secondary text-white">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Upgrade Your McKinney Home's Roof?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto text-white/90">
            Get a free residential roofing inspection and quote. No obligation, just expert advice from McKinney's trusted roofing professionals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90">
              <Phone className="mr-2 h-5 w-5" />
              Call (214) 612-6696
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary">
              Schedule Free Inspection
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12">
        <div className="container">
          <div className="text-center text-sm text-background/60">
            <p>&copy; {new Date().getFullYear()} Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner. All rights reserved. | Founded by Dustin Moore | Licensed & Insured</p>
            <p className="mt-2">Residential Roofing Contractor serving McKinney, TX and surrounding areas since 2015</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
