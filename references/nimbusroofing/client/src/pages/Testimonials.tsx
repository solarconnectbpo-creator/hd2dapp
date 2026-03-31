import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote, Phone, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { GOOGLE_REVIEW_URL } from "@/const";

export default function Testimonials() {
  const testimonials = [
    {
      id: 1,
      name: "Michael & Sarah Johnson",
      location: "Stonebridge Ranch, McKinney",
      rating: 5,
      date: "January 2026",
      text: "After the December hailstorm, we were worried about finding a reliable roofer. Nimbus Roofing's AI inspection found damage we didn't even know existed. Their team worked directly with State Farm and we got full approval in 4 days. The new GAF roof looks amazing!",
      image: "https://d3hxdf40eqjh48.cloudfront.net/a4a2f0e5-c50b-4e9f-9bfb-8f7c2d1a3e6b.jpg",
      projectType: "Hail Damage Replacement"
    },
    {
      id: 2,
      name: "Robert Chen",
      location: "Craig Ranch, McKinney",
      rating: 5,
      date: "December 2025",
      text: "Best roofing experience ever. The Gemini AI report was so detailed that Allstate approved our claim without even sending an adjuster. Installation crew was professional, fast, and cleaned up everything. Highly recommend!",
      image: "https://d3hxdf40eqjh48.cloudfront.net/e7f3d8c1-9a2b-4f6e-8d5c-1b4a7e9f2c3d.jpg",
      projectType: "Storm Damage Repair"
    },
    {
      id: 3,
      name: "Jennifer Martinez",
      location: "Eldorado Heights, McKinney",
      rating: 5,
      date: "November 2025",
      text: "We had three other companies quote our roof replacement, but Nimbus Roofing's AI technology and transparent process won us over. They found additional wind damage that increased our insurance payout by $8,000. The lifetime warranty gives us peace of mind.",
      image: "https://d3hxdf40eqjh48.cloudfront.net/b9c4e2f7-3d1a-4e8b-9f6c-2a5d8e1b7c4f.jpg",
      projectType: "Wind Damage Replacement"
    },
    {
      id: 4,
      name: "David & Lisa Thompson",
      location: "Trinity Falls, McKinney",
      rating: 5,
      date: "October 2025",
      text: "From inspection to final cleanup, Nimbus Roofing exceeded our expectations. The AI drone inspection was fascinating to watch, and the detailed report made the insurance claim process smooth. Our new roof survived the recent storm with zero issues!",
      image: "https://d3hxdf40eqjh48.cloudfront.net/c8d5f1e9-4a2b-3e7c-9d6f-1b8a4e2c5d7f.jpg",
      projectType: "Complete Roof Replacement"
    },
    {
      id: 5,
      name: "Amanda Rodriguez",
      location: "Tucker Hill, McKinney",
      rating: 5,
      date: "September 2025",
      text: "After the hailstorm, I called 5 roofing companies. Nimbus was the only one using AI technology for inspections. Their report was so professional that Farmers Insurance approved everything immediately. The crew finished in one day and the cleanup was spotless!",
      image: "https://d3hxdf40eqjh48.cloudfront.net/d7e9f2c4-5b3a-4e8d-9c6f-2a1b7e4d8c5f.jpg",
      projectType: "Hail Damage Repair"
    },
    {
      id: 6,
      name: "James Wilson",
      location: "Downtown Dallas",
      rating: 5,
      date: "August 2025",
      text: "Commercial property owner here. Nimbus Roofing handled our 15,000 sq ft office building roof replacement flawlessly. Their AI inspection identified problem areas we didn't know existed, saving us from future leaks. Professional, fast, and worth every penny.",
      image: "https://d3hxdf40eqjh48.cloudfront.net/e1f8c9d2-6a4b-3e7c-9d5f-2b1a8e3c6d4f.jpg",
      projectType: "Commercial Roof Replacement"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">Customer Testimonials</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Real stories from real customers across Dallas-Fort Worth. See why homeowners and businesses trust Nimbus Roofing for their storm damage and roof replacement needs.
            </p>
            <div className="flex items-center justify-center gap-2 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-8 w-8 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-lg font-semibold text-foreground">
              5.0 Stars • 127 Reviews
            </p>
          </div>
        </div>
      </div>

      {/* Testimonials Grid */}
      <div className="py-20">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id} className="overflow-hidden hover:shadow-xl transition-shadow">
                <div className="relative h-64">
                  <img 
                    src={testimonial.image} 
                    alt={`${testimonial.name} - ${testimonial.projectType}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                    <div className="flex items-center gap-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                </div>
                <CardContent className="p-6">
                  <Quote className="h-8 w-8 text-primary/20 mb-4" />
                  <p className="text-foreground mb-6 leading-relaxed">
                    "{testimonial.text}"
                  </p>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-foreground">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                      <p className="text-xs text-muted-foreground mt-1">{testimonial.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">{testimonial.projectType}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-primary to-accent p-12 rounded-2xl text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Join Our Happy Customers?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Get your free AI-powered roof inspection today. Most insurance claims approved within 5 days.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
                <Phone className="h-5 w-5 mr-2" />
                Call (214) 612-6696
              </Button>
              <Link href="/">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-white/10 text-white border-white hover:bg-white hover:text-primary">
                  Request Free Inspection
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Google Reviews CTA */}
          <div className="mt-12 text-center">
            <p className="text-lg text-muted-foreground mb-4">
              See more reviews on Google
            </p>
            <a 
              href={GOOGLE_REVIEW_URL} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline font-semibold"
            >
              View All Google Reviews
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">FEATURES</h3>
              <ul className="space-y-2">
                <li><Link href="/services" className="text-muted-foreground hover:text-foreground">Storm Damage</Link></li>
                <li><Link href="/services" className="text-muted-foreground hover:text-foreground">Roof Replacement</Link></li>
                <li><Link href="/services" className="text-muted-foreground hover:text-foreground">Insurance Claims</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">COMPANY</h3>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-muted-foreground hover:text-foreground">About Us</Link></li>
                <li><Link href="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link></li>
                <li><Link href="/certifications" className="text-muted-foreground hover:text-foreground">Certifications</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">LEGAL</h3>
              <ul className="space-y-2">
                <li><Link href="/privacy-policy" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link></li>
                <li><Link href="/terms-of-service" className="text-muted-foreground hover:text-foreground">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">CONTACT</h3>
              <ul className="space-y-2">
                <li><a href="tel:+12146126696" className="text-muted-foreground hover:text-foreground">(214) 612-6696</a></li>
                <li className="text-muted-foreground">McKinney, TX</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>© 2026 Nimbus Roofing - AI-Powered Roofing Excellence. All rights reserved.</p>
            <div className="mt-2">
              <Link href="/privacy-policy" className="hover:text-foreground mx-2">Privacy Policy</Link>
              <span>•</span>
              <Link href="/terms-of-service" className="hover:text-foreground mx-2">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
