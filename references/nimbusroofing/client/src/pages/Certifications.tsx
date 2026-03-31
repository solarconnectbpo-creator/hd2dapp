import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Shield, Award, CheckCircle, FileCheck } from "lucide-react";
import { Link } from "wouter";

export default function Certifications() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3">
              <img src="/nimbus-ai-logo.png" alt="Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner" className="h-10 w-10" />
              <span className="font-bold text-xl">Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-sm font-medium hover:text-primary">Home</Link>
              <Link href="/services/residential" className="text-sm font-medium hover:text-primary">Services</Link>
              <Link href="/projects" className="text-sm font-medium hover:text-primary">Projects</Link>
              <Link href="/certifications" className="text-sm font-medium text-primary">Certifications</Link>
              <Link href="/contact" className="text-sm font-medium hover:text-primary">Contact</Link>
            </div>
            <a href="tel:+12146126696">
              <Button>
                <Phone className="h-4 w-4 mr-2" />
                (214) 612-6696
              </Button>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 py-16">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4" variant="secondary">
              <Shield className="h-4 w-4 mr-2" />
              Licensed & Certified
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Certifications & Credentials
            </h1>
            <p className="text-xl text-muted-foreground">
              Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner maintains the highest industry certifications and licenses to ensure 
              quality workmanship and professional service for every project.
            </p>
          </div>
        </div>
      </section>

      {/* Owens Corning Preferred Contractor */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <img 
                  src="/certifications/PINKPANTHERLOGO.png" 
                  alt="Owens Corning Preferred Contractor - Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner"
                  className="w-full max-w-md mx-auto"
                />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-4">
                  Owens Corning Preferred Contractor
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner is proud to be an **Owens Corning Preferred Contractor**, 
                  a distinction awarded to only the top roofing professionals who meet strict 
                  requirements for licensing, insurance, and customer satisfaction.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Extended Warranty Coverage</p>
                      <p className="text-sm text-muted-foreground">
                        Access to Owens Corning's industry-leading warranty programs
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Premium Materials</p>
                      <p className="text-sm text-muted-foreground">
                        Exclusive access to OC Duration and Total Protection Roofing System
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Ongoing Training</p>
                      <p className="text-sm text-muted-foreground">
                        Continuous education on latest roofing techniques and materials
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Texas Adjuster License */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1">
                <h2 className="text-3xl font-bold mb-4">
                  Texas All Lines Adjuster License
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Founder **Dustin Moore** holds a Texas All Lines Adjuster License (#2820344), 
                  providing expert insurance claim assistance to help homeowners navigate the 
                  complex claims process for storm damage and roof repairs.
                </p>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg">License Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">License Holder:</span>
                      <span className="font-semibold">Dustin Moore</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">License Number:</span>
                      <span className="font-semibold">2820344</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-semibold">Adjuster - All Lines</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Issue Date:</span>
                      <span className="font-semibold">March 31, 2022</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Address:</span>
                      <span className="font-semibold">McKinney, TX 75071</span>
                    </div>
                  </CardContent>
                </Card>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileCheck className="h-5 w-5" />
                  <span>Authorized by Texas Department of Insurance</span>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <img 
                  src="/certifications/Texasalllinesadjusterlicense.jpg" 
                  alt="Texas All Lines Adjuster License - Dustin Moore, Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner"
                  className="w-full rounded-lg shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Certifications */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Additional Certifications & Memberships
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <Award className="h-10 w-10 text-primary mb-3" />
                  <CardTitle>Licensed Contractor</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Fully licensed roofing contractor in the State of Texas with all required 
                    permits and certifications.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Shield className="h-10 w-10 text-primary mb-3" />
                  <CardTitle>Fully Insured</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Comprehensive general liability and workers' compensation insurance 
                    protecting you and our team.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Award className="h-10 w-10 text-primary mb-3" />
                  <CardTitle>NTRCA Member</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Member of North Texas Roofing Contractors Association, committed to 
                    industry best practices.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">
              Work with McKinney's Most Trusted Roofer
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Our certifications and licenses ensure you receive the highest quality roofing 
              services backed by industry-leading warranties and professional expertise.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a href="tel:+12146126696">
                <Button size="lg" variant="secondary">
                  <Phone className="h-5 w-5 mr-2" />
                  Call (214) 612-6696
                </Button>
              </a>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                  Request Free Inspection
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="container">
          <div className="text-center">
            <p className="text-sm">
              © 2025 Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner. All rights reserved. | Founded by Dustin Moore | 
              Licensed & Insured Roofing Contractor | Serving McKinney, Plano, Frisco, Allen, TX since 2015
            </p>
            <p className="text-xs mt-2 opacity-75">
              Owens Corning Preferred Contractor | Texas Adjuster License #2820344
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
