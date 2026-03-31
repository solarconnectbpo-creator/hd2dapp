import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContactForm } from "@/components/ContactForm";
import { 
  Phone, 
  Shield, 
  Clock, 
  FileText,
  CheckCircle,
  AlertTriangle,
  CloudRain,
  Wind
} from "lucide-react";
import { Link } from "wouter";

export default function StormDamage() {
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
              <Link href="/neighborhoods/stonebridge-ranch" className="text-sm font-medium hover:text-primary">Neighborhoods</Link>
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

      {/* Emergency Banner */}
      <div className="bg-destructive text-destructive-foreground py-3">
        <div className="container text-center">
          <p className="text-sm font-semibold">
            ⚡ 24/7 Emergency Storm Damage Response | Same-Day Inspections | Call Now: <a href="tel:+12146126696" className="hover:underline">(214) 612-6696</a>
          </p>
        </div>
      </div>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-20">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-destructive/20 border border-destructive px-4 py-2 rounded-full mb-6">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-semibold">Emergency Storm Damage Service</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Storm Damage Roof Repair in McKinney, TX
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              24/7 emergency response for hail damage, wind damage, and severe weather. Free inspections and insurance claim assistance.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a href="tel:+12146126696">
                <Button size="lg" variant="destructive">
                  <Phone className="h-5 w-5 mr-2" />
                  Call for Emergency Service
                </Button>
              </a>
              <Button size="lg" variant="outline" className="bg-white text-slate-900 hover:bg-slate-100">
                Schedule Free Inspection
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Storm Damage Types */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Types of Storm Damage We Repair</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              McKinney experiences severe weather including hailstorms, high winds, and heavy rain. We're experts at identifying and repairing all types of storm damage.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <CloudRain className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Hail Damage</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Dented or cracked shingles</li>
                      <li>• Granule loss exposing asphalt</li>
                      <li>• Damaged flashing and vents</li>
                      <li>• Bruised or split wood shakes</li>
                      <li>• Dented gutters and downspouts</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <Wind className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Wind Damage</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Missing or lifted shingles</li>
                      <li>• Torn or creased roofing materials</li>
                      <li>• Exposed roof deck</li>
                      <li>• Damaged ridge caps</li>
                      <li>• Debris impact damage</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Water Damage</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Leaks from compromised seals</li>
                      <li>• Water stains on ceilings</li>
                      <li>• Mold and mildew growth</li>
                      <li>• Damaged insulation</li>
                      <li>• Rotted decking or rafters</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Shield className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Tree & Debris Damage</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Fallen branches or trees</li>
                      <li>• Punctured roof deck</li>
                      <li>• Structural damage</li>
                      <li>• Damaged skylights or chimneys</li>
                      <li>• Emergency tarping needed</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Emergency Response Process */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Storm Damage Response Process</h2>
            <p className="text-muted-foreground">Fast, professional service when you need it most</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <h3 className="font-bold mb-2">Emergency Call</h3>
                <p className="text-sm text-muted-foreground">
                  Call us 24/7 at (214) 612-6696 for immediate response
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <h3 className="font-bold mb-2">Free Inspection</h3>
                <p className="text-sm text-muted-foreground">
                  Same-day inspection to assess all damage
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <h3 className="font-bold mb-2">Insurance Claim</h3>
                <p className="text-sm text-muted-foreground">
                  We handle your insurance claim documentation
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">4</span>
                </div>
                <h3 className="font-bold mb-2">Professional Repair</h3>
                <p className="text-sm text-muted-foreground">
                  Expert restoration using premium materials
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Insurance Claims Assistance */}
      <section className="py-16">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Insurance Claim Specialists</h2>
              <p className="text-muted-foreground mb-6">
                Dealing with insurance companies after storm damage can be overwhelming. We're experts at navigating the claims process and ensuring you get the coverage you deserve.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Complete Documentation</h3>
                    <p className="text-sm text-muted-foreground">Detailed photos, measurements, and damage reports for your claim</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Insurance Adjuster Meetings</h3>
                    <p className="text-sm text-muted-foreground">We meet with adjusters to ensure all damage is properly assessed</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">Claim Advocacy</h3>
                    <p className="text-sm text-muted-foreground">We advocate for fair coverage and handle claim disputes</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">No Out-of-Pocket Costs</h3>
                    <p className="text-sm text-muted-foreground">In most cases, insurance covers the full cost of storm damage repairs</p>
                  </div>
                </div>
              </div>

              <a href="tel:+12146126696">
                <Button size="lg">
                  <Phone className="h-5 w-5 mr-2" />
                  Get Free Storm Damage Inspection
                </Button>
              </a>
            </div>

            <div>
              <ContactForm 
                title="Request Storm Damage Inspection"
                description="Fill out this form and we'll contact you within 2 hours for emergency service."
                defaultService="Storm Damage"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Why McKinney Trusts Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner for Storm Damage</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <Clock className="h-12 w-12 mx-auto mb-4" />
                <h3 className="font-bold mb-2">24/7 Emergency Response</h3>
                <p className="text-sm opacity-90">
                  Available around the clock for urgent storm damage repairs
                </p>
              </div>
              <div className="text-center">
                <Shield className="h-12 w-12 mx-auto mb-4" />
                <h3 className="font-bold mb-2">Licensed & Insured</h3>
                <p className="text-sm opacity-90">
                  Fully licensed Texas contractor with comprehensive insurance
                </p>
              </div>
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4" />
                <h3 className="font-bold mb-2">Insurance Experts</h3>
                <p className="text-sm opacity-90">
                  We handle the entire insurance claim process for you
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="container">
          <div className="text-center">
            <p className="text-sm">© 2025 Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner. All rights reserved. | Founded by Dustin Moore | Licensed & Insured | Serving McKinney, TX since 2015</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
