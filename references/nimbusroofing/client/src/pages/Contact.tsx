import { ContactForm } from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Mail, MapPin, Clock, MessageSquare } from "lucide-react";
import { Link } from "wouter";

export default function Contact() {
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
              <Link href="/contact" className="text-sm font-medium text-primary">Contact</Link>
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
            🚨 24/7 Emergency Roof Repair Available | Same-Day Service in McKinney, TX | Call Now: <a href="tel:+12146126696" className="hover:underline">(214) 612-6696</a>
          </p>
        </div>
      </div>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 py-16">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Contact Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner
            </h1>
            <p className="text-xl text-muted-foreground mb-6">
              Get your free roof inspection today. We serve McKinney, TX and surrounding areas with expert roofing solutions.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Information & Form */}
      <section className="py-16">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Contact Info Cards */}
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold mb-2">Phone</h3>
                      <a href="tel:+12146126696" className="text-primary hover:underline">
                        (214) 612-6696
                      </a>
                      <p className="text-sm text-muted-foreground mt-1">
                        Available 24/7 for emergencies
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-secondary/10 p-3 rounded-lg">
                      <Mail className="h-6 w-6 text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-bold mb-2">Email</h3>
                      <a href="mailto:info@nimbusroofing.com" className="text-primary hover:underline">
                        info@nimbusroofing.com
                      </a>
                      <p className="text-sm text-muted-foreground mt-1">
                        We respond within 24 hours
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-accent/10 p-3 rounded-lg">
                      <MapPin className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-bold mb-2">Service Area</h3>
                      <p className="text-sm">
                        McKinney, TX 75071<br />
                        Stonebridge Ranch<br />
                        Craig Ranch<br />
                        Trinity Falls
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-green-100 p-3 rounded-lg">
                      <Clock className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-bold mb-2">Business Hours</h3>
                      <p className="text-sm">
                        Monday - Friday: 7am - 7pm<br />
                        Saturday: 8am - 5pm<br />
                        Sunday: Emergency only<br />
                        <span className="text-green-600 font-semibold">24/7 Emergency Service</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-primary text-primary-foreground">
                <CardContent className="p-6">
                  <MessageSquare className="h-8 w-8 mb-3" />
                  <h3 className="font-bold mb-2">Live Chat Available</h3>
                  <p className="text-sm mb-4">
                    Chat with our AI assistant powered by Nimbus iQ for instant answers to your roofing questions.
                  </p>
                  <p className="text-xs opacity-90">
                    Look for the chat icon in the bottom-right corner
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Why McKinney Homeowners Trust Us</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-bold mb-2">✓ Licensed & Insured</h3>
                  <p className="text-sm text-muted-foreground">
                    Fully licensed Texas roofing contractor with comprehensive insurance coverage for your peace of mind.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-bold mb-2">✓ 10+ Years Experience</h3>
                  <p className="text-sm text-muted-foreground">
                    Founded by Dustin Moore in 2015, we've completed 500+ successful roofing projects in McKinney.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-bold mb-2">✓ Free Inspections</h3>
                  <p className="text-sm text-muted-foreground">
                    Comprehensive roof inspection at no cost. We'll identify issues and provide detailed recommendations.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-bold mb-2">✓ Insurance Claim Experts</h3>
                  <p className="text-sm text-muted-foreground">
                    We handle the entire insurance claim process, working directly with your insurance company.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/nimbus-ai-logo.png" alt="Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner" className="h-8 w-8" />
                <span className="font-bold text-white">Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner</span>
              </div>
              <p className="text-sm mb-4">
                McKinney's trusted roofing contractor since 2015. Expert storm damage restoration and quality roofing services.
              </p>
              <a href="tel:+12146126696" className="text-sm font-semibold text-white hover:underline">(214) 612-6696</a>
            </div>
            
            <div>
              <h3 className="font-bold text-white mb-4">Services</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/services/residential" className="hover:text-white">Residential Roofing</Link></li>
                <li><Link href="/services/commercial" className="hover:text-white">Commercial Roofing</Link></li>
                <li><Link href="/services/storm-damage" className="hover:text-white">Storm Damage Restoration</Link></li>
                <li><Link href="/services/insurance" className="hover:text-white">Insurance Claims</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-white mb-4">Neighborhoods</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/neighborhoods/stonebridge-ranch" className="hover:text-white">Stonebridge Ranch</Link></li>
                <li><Link href="/neighborhoods/craig-ranch" className="hover:text-white">Craig Ranch</Link></li>
                <li><Link href="/neighborhoods/eldorado-heights" className="hover:text-white">Eldorado Heights</Link></li>
                <li><Link href="/neighborhoods/trinity-falls" className="hover:text-white">Trinity Falls</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-white mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white">About</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-700 mt-8 pt-8 text-center text-sm">
            <p>© 2025 Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner. All rights reserved. | Founded by Dustin Moore | Licensed & Insured Roofing Contractor | Serving McKinney, TX since 2015</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
