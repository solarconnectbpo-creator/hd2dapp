import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, CheckCircle, FileText, Shield, DollarSign, Clock, Award, Users } from "lucide-react";
import { Link } from "wouter";
import { APP_LOGO, APP_TITLE } from "@/const";

export default function InsuranceClaims() {
  useEffect(() => {
    document.title = `Insurance Claims Assistance | Roofing Claims Expert | ${APP_TITLE}`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Expert insurance claims assistance for roof damage in McKinney, TX. Texas All Lines Adjuster on staff. We handle the entire claims process. Average $4,200+ supplement value. Call (214) 612-6696.');
    }
  }, []);

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3">
              <img src={APP_LOGO} alt={APP_TITLE} className="h-10 w-10" />
              <span className="font-bold text-xl">{APP_TITLE}</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-sm font-medium hover:text-primary">Home</Link>
              <Link href="/services/residential" className="text-sm font-medium hover:text-primary">Residential</Link>
              <Link href="/services/commercial" className="text-sm font-medium hover:text-primary">Commercial</Link>
              <Link href="/contact" className="text-sm font-medium hover:text-primary">Contact</Link>
            </div>
            
            <a href="tel:+12146126696" className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-all">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">(214) 612-6696</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white py-20">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1920')] bg-cover bg-center opacity-10"></div>
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-semibold">Texas All Lines Adjuster on Staff</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Expert Insurance Claims Assistance for Roof Damage
            </h1>
            <p className="text-xl mb-8 text-white/90">
              We handle the entire insurance claims process for you. Dustin Moore (Texas All Lines Adjuster License #2820344) ensures you get every dollar you deserve.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="tel:+12146126696">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                  <Phone className="mr-2 h-5 w-5" />
                  Call (214) 612-6696
                </Button>
              </a>
              <Button size="lg" variant="outline" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary">
                Free Claims Consultation
              </Button>
            </div>
            
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <div className="text-3xl font-bold mb-2">$4,200+</div>
                <div className="text-sm opacity-90">Average Supplement Value</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <div className="text-3xl font-bold mb-2">500+</div>
                <div className="text-sm opacity-90">Claims Successfully Handled</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <div className="text-3xl font-bold mb-2">98%</div>
                <div className="text-sm opacity-90">Claim Approval Rate</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why We're Different */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">The Nimbus Insurance Claims Advantage</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Most roofers just install roofs. We're licensed insurance professionals who fight for your claim.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-2 border-primary">
              <CardContent className="p-6 text-center">
                <Award className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-bold mb-2">Licensed Adjuster</h3>
                <p className="text-sm text-muted-foreground">
                  Dustin Moore holds Texas All Lines Adjuster License #2820344
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <DollarSign className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-bold mb-2">$4,200+ Supplements</h3>
                <p className="text-sm text-muted-foreground">
                  We recover an average of $4,200+ in additional claim value
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-bold mb-2">Complete Documentation</h3>
                <p className="text-sm text-muted-foreground">
                  Professional photos, measurements, and damage reports
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="font-bold mb-2">Adjuster Representation</h3>
                <p className="text-sm text-muted-foreground">
                  We meet with your insurance adjuster on your behalf
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Our Claims Process */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Insurance Claims Process</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              We handle everything from initial inspection to final payment
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-xl">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">Free Inspection & Damage Assessment</h3>
                    <p className="text-muted-foreground">
                      We conduct a thorough roof inspection to identify all storm damage. Our AI-powered measurement system provides 99.7% accurate roof dimensions, and we document every piece of damage with professional photography.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-xl">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">File Your Insurance Claim</h3>
                    <p className="text-muted-foreground">
                      We help you file your insurance claim with all necessary documentation. We know exactly what insurance companies need to see and how to present your claim for maximum approval.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-xl">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">Meet with Insurance Adjuster</h3>
                    <p className="text-muted-foreground">
                      Dustin Moore (Texas All Lines Adjuster #2820344) meets with your insurance adjuster to ensure all damage is properly documented. We speak their language and know how to negotiate effectively.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-xl">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">Supplement Negotiation</h3>
                    <p className="text-muted-foreground">
                      Insurance companies often miss damage or undervalue repairs. We submit detailed supplements to recover the full value of your claim—averaging $4,200+ in additional coverage.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-xl">
                    5
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">Complete Roof Replacement</h3>
                    <p className="text-muted-foreground">
                      Once your claim is approved, we complete your roof replacement using premium Owens Corning materials. We handle all permitting, inspections, and warranty registration.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-xl">
                    6
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">Final Payment & Warranty</h3>
                    <p className="text-muted-foreground">
                      We coordinate final payment with your insurance company and provide you with comprehensive warranty documentation. You're protected with both manufacturer and workmanship warranties.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Common Questions */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Common Insurance Claims Questions</h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-2">Will filing a claim raise my insurance rates?</h3>
                <p className="text-muted-foreground">
                  Storm damage claims (hail, wind, tornado) are typically considered "Act of God" events and should not raise your rates. However, this varies by insurance company and your policy. We recommend reviewing your policy or contacting your agent.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-2">Do I have to pay my deductible upfront?</h3>
                <p className="text-muted-foreground">
                  Your deductible is typically deducted from your insurance payout. You pay it when you receive your final insurance check. Texas law requires contractors to collect deductibles—beware of anyone offering to "waive" or "cover" your deductible, as this is illegal.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-2">What if my insurance company denies my claim?</h3>
                <p className="text-muted-foreground">
                  We can help you appeal denied claims with additional documentation and expert testimony. Our licensed adjuster knows how to present evidence that insurance companies must consider. We've successfully overturned many denied claims.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-2">How long does the claims process take?</h3>
                <p className="text-muted-foreground">
                  Most claims are resolved within 2-4 weeks. Complex claims or those requiring supplements may take 4-8 weeks. We expedite the process by providing complete documentation upfront and maintaining constant communication with your insurance company.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-2">Do you charge extra for insurance claims assistance?</h3>
                <p className="text-muted-foreground">
                  No. Our insurance claims assistance is included in our roofing services at no additional cost. We only get paid when you get paid by your insurance company. Our goal is to maximize your claim value so you get the quality roof you deserve.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* What We Document */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Complete Damage Documentation</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              We document every detail to maximize your insurance claim
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <CheckCircle className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-bold mb-2">Shingle Damage</h3>
                <p className="text-sm text-muted-foreground">
                  Hail impacts, wind damage, missing shingles, granule loss
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <CheckCircle className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-bold mb-2">Metal Components</h3>
                <p className="text-sm text-muted-foreground">
                  Vents, flashing, drip edge, gutters, downspouts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <CheckCircle className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-bold mb-2">Collateral Damage</h3>
                <p className="text-sm text-muted-foreground">
                  Siding, windows, screens, AC units, fencing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <CheckCircle className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-bold mb-2">Interior Damage</h3>
                <p className="text-sm text-muted-foreground">
                  Water stains, ceiling damage, insulation issues
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <CheckCircle className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-bold mb-2">Code Upgrades</h3>
                <p className="text-sm text-muted-foreground">
                  Decking, ventilation, underlayment requirements
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <CheckCircle className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-bold mb-2">Measurements</h3>
                <p className="text-sm text-muted-foreground">
                  AI-powered 99.7% accurate roof measurements
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Get Every Dollar You Deserve
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Free insurance claims consultation. We'll inspect your roof, assess the damage, and tell you if you have a valid claim—at no cost to you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:+12146126696">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                <Phone className="mr-2 h-5 w-5" />
                Call (214) 612-6696
              </Button>
            </a>
            <Button size="lg" variant="outline" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary">
              Schedule Free Inspection
            </Button>
          </div>
          
          <div className="mt-8 text-sm opacity-75">
            <p>Dustin Moore | Texas All Lines Adjuster License #2820344</p>
          </div>
        </div>
      </section>
    </div>
  );
}
