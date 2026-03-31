import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, CheckCircle, MapPin, Home, DollarSign, Users } from "lucide-react";
import { Link } from "wouter";
import { useEffect } from "react";

export default function TrinityFalls() {
  useEffect(() => {
    // Update page title and meta description for SEO
    document.title = "Trinity Falls Roof Replacement Cost | McKinney TX Roofing Contractor";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Expert roofing services for Trinity Falls homes. HOA-approved materials, transparent pricing, 150+ completed projects. Licensed McKinney roofer. Call (214) 612-6696.');
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
              <Link href="/services" className="text-sm font-medium hover:text-primary transition-colors">Services</Link>
              <Link href="/neighborhoods" className="text-sm font-medium text-primary">Neighborhoods</Link>
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
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5" />
              <Badge className="bg-accent text-accent-foreground">Trinity Falls, McKinney TX</Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Trinity Falls Roofing Services & Roof Replacement Cost Guide
            </h1>
            <p className="text-xl mb-8 text-white/90">
              Expert roofing contractor serving Trinity Falls since 2015. We understand your HOA requirements and deliver quality roofing solutions that meet neighborhood standards.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                <Phone className="mr-2 h-5 w-5" />
                Call (214) 612-6696
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary">
                Get Free Quote
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-b">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">150+</div>
              <p className="text-muted-foreground">Completed Projects in Trinity Falls</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-secondary mb-2">$12K-$18K</div>
              <p className="text-muted-foreground">Average Roof Replacement Cost</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">100%</div>
              <p className="text-muted-foreground">HOA Approval Rate</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-12">
              {/* About Trinity Falls */}
              <div>
                <h2 className="text-3xl font-bold mb-6">Roofing Services for Trinity Falls Homes</h2>
                <p className="text-lg text-muted-foreground mb-4">
                  Trinity Falls is one of McKinney's most prestigious master-planned communities, known for its beautiful homes and strict HOA guidelines. As your local roofing contractor, we've completed over 150 roofing projects in Trinity Falls and have deep expertise in meeting your community's specific requirements.
                </p>
                <p className="text-lg text-muted-foreground mb-6">
                  Whether you need a complete roof replacement after storm damage, architectural shingle installation, or routine maintenance, our team understands the unique needs of Trinity Falls homeowners.
                </p>
              </div>

              {/* Roof Replacement Cost */}
              <div>
                <h2 className="text-3xl font-bold mb-6">Trinity Falls Roof Replacement Cost Breakdown</h2>
                <Card className="mb-6">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-3 border-b">
                        <span className="font-semibold">Typical Home Size</span>
                        <span className="text-muted-foreground">2,500 - 3,500 sq ft</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b">
                        <span className="font-semibold">Average Roof Area</span>
                        <span className="text-muted-foreground">2,800 - 4,000 sq ft</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b">
                        <span className="font-semibold">Architectural Shingles</span>
                        <span className="text-primary font-bold">$12,000 - $18,000</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b">
                        <span className="font-semibold">Premium/Designer Shingles</span>
                        <span className="text-primary font-bold">$16,000 - $24,000</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Metal Roofing</span>
                        <span className="text-primary font-bold">$20,000 - $32,000</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <p className="text-sm text-muted-foreground">
                  *Costs include complete tear-off, disposal, new underlayment, architectural shingles, and installation. Final pricing depends on roof complexity, pitch, and material selection.
                </p>
              </div>

              {/* HOA Requirements */}
              <div>
                <h2 className="text-3xl font-bold mb-6">Trinity Falls HOA Roofing Requirements</h2>
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                        <div>
                          <h3 className="font-bold mb-2">Approved Shingle Colors</h3>
                          <p className="text-muted-foreground">
                            Trinity Falls HOA requires pre-approval for roofing colors. We stock all approved colors including Weathered Wood, Driftwood, Pewter Gray, and Charcoal. We handle all HOA paperwork and approval process.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                        <div>
                          <h3 className="font-bold mb-2">Architectural Standards</h3>
                          <p className="text-muted-foreground">
                            Only architectural (dimensional) shingles are permitted. 3-tab shingles do not meet community standards. We exclusively install premium architectural shingles that exceed HOA requirements.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                        <div>
                          <h3 className="font-bold mb-2">Installation Timeline</h3>
                          <p className="text-muted-foreground">
                            HOA requires timely completion once started. Most Trinity Falls homes are completed in 1-2 days with complete cleanup. We coordinate with HOA to ensure compliance with all guidelines.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Why Choose Us */}
              <div>
                <h2 className="text-3xl font-bold mb-6">Why Trinity Falls Homeowners Choose Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <Home className="h-8 w-8 text-primary mb-3" />
                      <h3 className="font-bold mb-2">Local Expertise</h3>
                      <p className="text-sm text-muted-foreground">
                        150+ completed projects in Trinity Falls. We know your neighborhood inside and out.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <CheckCircle className="h-8 w-8 text-secondary mb-3" />
                      <h3 className="font-bold mb-2">HOA Approval Guarantee</h3>
                      <p className="text-sm text-muted-foreground">
                        100% HOA approval rate. We handle all paperwork and ensure compliance with community standards.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <DollarSign className="h-8 w-8 text-primary mb-3" />
                      <h3 className="font-bold mb-2">Transparent Pricing</h3>
                      <p className="text-sm text-muted-foreground">
                        Detailed quotes with no hidden fees. Financing options available for qualified homeowners.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <Users className="h-8 w-8 text-secondary mb-3" />
                      <h3 className="font-bold mb-2">Insurance Claim Assistance</h3>
                      <p className="text-sm text-muted-foreground">
                        We work directly with your insurance company to maximize your claim for storm damage.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact Card */}
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4">Get Your Free Trinity Falls Roof Quote</h3>
                  <p className="text-muted-foreground mb-6">
                    Free inspection and detailed quote for your Trinity Falls home. HOA-approved materials and expert installation.
                  </p>
                  <div className="space-y-4">
                    <Button className="w-full" size="lg">
                      <Phone className="mr-2 h-5 w-5" />
                      Call (214) 612-6696
                    </Button>
                    <Button variant="outline" className="w-full" size="lg">
                      Schedule Inspection
                    </Button>
                  </div>
                  <div className="mt-6 pt-6 border-t space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Free Inspection</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>HOA Approval Assistance</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Financing Available</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span>Licensed & Insured</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Testimonial */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-3">
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} className="w-5 h-5 fill-yellow-400" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                      </svg>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    "Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner did an excellent job on our Trinity Falls home. They handled all the HOA paperwork, completed the job in one day, and the roof looks fantastic. Highly recommend!"
                  </p>
                  <p className="text-sm font-semibold">- Sarah M., Trinity Falls</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-secondary text-white">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Replace Your Trinity Falls Roof?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto text-white/90">
            Get a free inspection and detailed quote. We handle HOA approval and deliver quality results.
          </p>
          <Button size="lg" className="bg-white text-primary hover:bg-white/90">
            <Phone className="mr-2 h-5 w-5" />
            Call (214) 612-6696 Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12">
        <div className="container">
          <div className="text-center text-sm text-background/60">
            <p>&copy; {new Date().getFullYear()} Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner. All rights reserved. | Founded by Dustin Moore | Licensed & Insured</p>
            <p className="mt-2">Trinity Falls Roofing Contractor | McKinney, TX | Serving your neighborhood since 2015</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
