import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Building2, CloudRain, FileText, Wrench, Shield } from "lucide-react";

export default function Services() {
  const services = [
    {
      icon: Home,
      title: "Residential Roofing",
      description: "Complete roof replacement and repair services for homeowners across Dallas-Fort Worth. GAF certified installations with lifetime warranties.",
      link: "/services/residential",
      features: ["Asphalt Shingles", "Metal Roofing", "Tile Roofing", "Lifetime Warranty"]
    },
    {
      icon: Building2,
      title: "Commercial Roofing",
      description: "Professional commercial roofing solutions for businesses, warehouses, and multi-family properties. Minimize downtime with our efficient installation process.",
      link: "/services/commercial",
      features: ["TPO & EPDM", "Metal Systems", "Built-Up Roofing", "Maintenance Plans"]
    },
    {
      icon: CloudRain,
      title: "Storm Damage Restoration",
      description: "24/7 emergency response for hail and wind damage. Our AI-powered inspections detect every impact and structural issue for accurate insurance claims.",
      link: "/services/storm-damage",
      features: ["Hail Damage", "Wind Damage", "Emergency Tarping", "Fast Response"]
    },
    {
      icon: FileText,
      title: "Insurance Claims Assistance",
      description: "We work directly with your insurance company to ensure your claim is approved. Our AI technology creates detailed reports that adjusters trust.",
      link: "/services/insurance-claims",
      features: ["Claim Documentation", "Adjuster Meetings", "Xactimate Reports", "Claim Advocacy"]
    },
    {
      icon: Wrench,
      title: "Roof Repairs",
      description: "Expert roof leak repair and maintenance services. From minor fixes to major structural repairs, we handle it all with precision and care.",
      link: "/contact",
      features: ["Leak Repair", "Flashing Repair", "Vent Replacement", "Same-Day Service"]
    },
    {
      icon: Shield,
      title: "Roof Inspections",
      description: "AI-powered drone inspections detect damage invisible to the naked eye. Get a comprehensive assessment in 24 hours with detailed photo documentation.",
      link: "/contact",
      features: ["Drone Inspection", "Thermal Imaging", "Detailed Reports", "Free Estimates"]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 text-white py-20">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-extrabold mb-6">Our Roofing Services</h1>
          <p className="text-xl text-gray-300 max-w-3xl">
            Complete roofing solutions powered by AI technology. From residential roof replacement to commercial installations and emergency storm damage repair, we deliver exceptional results backed by industry-leading warranties.
          </p>
        </div>
      </div>

      {/* Services Grid */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card key={index} className="hover:shadow-xl transition-shadow duration-300 border-2 hover:border-primary">
                <CardHeader>
                  <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{service.title}</CardTitle>
                  <CardDescription className="text-base">{service.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href={service.link}>
                    <Button className="w-full">
                      Learn More
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 opacity-90">
            Get your free AI-powered roof inspection today. Most insurance claims approved within 48 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Schedule Free Inspection
              </Button>
            </Link>
            <Link href="tel:+12146126696">
              <Button size="lg" variant="outline" className="text-lg px-8 bg-white/10 hover:bg-white/20 border-white/30">
                Call (214) 612-6696
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Why Choose Us */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-center mb-12">Why Choose Nimbus Roofing?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-5xl font-bold text-primary mb-2">7+</div>
            <div className="text-xl font-semibold mb-2">Years Experience</div>
            <p className="text-muted-foreground">Serving Dallas-Fort Worth since 2019</p>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-primary mb-2">4.9★</div>
            <div className="text-xl font-semibold mb-2">Google Rating</div>
            <p className="text-muted-foreground">154 five-star reviews from satisfied customers</p>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-primary mb-2">24/7</div>
            <div className="text-xl font-semibold mb-2">Emergency Service</div>
            <p className="text-muted-foreground">Always available when you need us most</p>
          </div>
        </div>
      </div>
    </div>
  );
}
