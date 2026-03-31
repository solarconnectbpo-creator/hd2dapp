import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, MapPin, Calendar, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import VideoGallery from "@/components/VideoGallery";

interface Project {
  id: string;
  title: string;
  location: string;
  city: string;
  date: string;
  type: string;
  image: string;
  description: string;
}

const PROJECTS: Project[] = [
  {
    id: "1",
    title: "Residential Roof Replacement - Stonebridge Ranch",
    location: "Stonebridge Ranch",
    city: "McKinney, TX",
    date: "2024",
    type: "Residential Roofing",
    image: "/projects/01de549ad25a7b4f1ca37a057df1c3730c1c3974de.jpg",
    description: "Complete roof replacement with Owens Corning Duration shingles. Storm damage restoration with insurance claim assistance."
  },
  {
    id: "2",
    title: "Storm Damage Repair - Craig Ranch",
    location: "Craig Ranch",
    city: "McKinney, TX",
    date: "2024",
    type: "Storm Damage",
    image: "/projects/01e7745967febc2010eb51c6649a19212ed3c2a2df.jpg",
    description: "Hail damage repair including shingle replacement and gutter restoration. Full insurance claim support provided."
  },
  {
    id: "3",
    title: "Residential Re-Roof - Plano",
    location: "West Plano",
    city: "Plano, TX",
    date: "2024",
    type: "Residential Roofing",
    image: "/projects/01a7c0902905364116ba6dcc6718aff7007f28ca79.jpg",
    description: "Premium architectural shingle installation with enhanced ventilation system for improved energy efficiency."
  },
  {
    id: "4",
    title: "Emergency Roof Repair - Frisco",
    location: "Frisco",
    city: "Frisco, TX",
    date: "2024",
    type: "Emergency Repair",
    image: "/projects/01cdbc6e8da3a9b8c05e301f4058d5d4072a6e719e.jpg",
    description: "24-hour emergency response for wind damage. Temporary tarping and permanent repair completed within 48 hours."
  },
  {
    id: "5",
    title: "Roof Inspection & Maintenance - Allen",
    location: "Allen",
    city: "Allen, TX",
    date: "2024",
    type: "Inspection",
    image: "/projects/01cb9a187fa869236cd008129d5cda0879eca91f56.jpg",
    description: "Comprehensive roof inspection with detailed report. Minor repairs and preventive maintenance performed."
  },
  {
    id: "6",
    title: "Complete Roof Replacement - McKinney",
    location: "Eldorado Heights",
    city: "McKinney, TX",
    date: "2024",
    type: "Residential Roofing",
    image: "/projects/01b0982fbfe3212be73f6be209452f2894510a0825.jpg",
    description: "Full tear-off and replacement with impact-resistant shingles. Enhanced warranty coverage included."
  },
  {
    id: "7",
    title: "Storm Restoration - Trinity Falls",
    location: "Trinity Falls",
    city: "McKinney, TX",
    date: "2024",
    type: "Storm Damage",
    image: "/projects/01cf24322f71d3be9bd34f96ccbeb0b650a1fb7823.jpg",
    description: "Severe hail damage restoration. Complete roof system replacement with upgraded materials."
  },
  {
    id: "8",
    title: "Residential Roofing - Prosper",
    location: "Prosper",
    city: "Prosper, TX",
    date: "2024",
    type: "Residential Roofing",
    image: "/projects/01d32c542ce035e5b4d4f3a31f92d2135842e7659d.jpg",
    description: "New construction roofing with premium GAF Timberline HDZ shingles and lifetime warranty."
  },
  {
    id: "9",
    title: "Roof Repair - McKinney",
    location: "Tucker Hill",
    city: "McKinney, TX",
    date: "2024",
    type: "Repair",
    image: "/projects/01d868c6601755ebddb83a23beefa329f57df95baf.jpg",
    description: "Targeted repair of wind-damaged sections. Matching existing shingles for seamless appearance."
  },
  {
    id: "10",
    title: "Commercial Roofing - Plano",
    location: "East Plano",
    city: "Plano, TX",
    date: "2023",
    type: "Commercial",
    image: "/projects/01ea01730ab8af9743adaca9def77af3faf500cab1.jpg",
    description: "Commercial flat roof restoration with TPO membrane. Minimal business disruption during installation."
  },
  {
    id: "11",
    title: "Residential Re-Roof - Frisco",
    location: "Frisco",
    city: "Frisco, TX",
    date: "2023",
    type: "Residential Roofing",
    image: "/projects/01e629a4e90e0bf072478827f115e9656b66d54178.jpg",
    description: "Complete roof replacement with designer shingles. Enhanced curb appeal and property value."
  },
  {
    id: "12",
    title: "Storm Damage Assessment - Allen",
    location: "Allen",
    city: "Allen, TX",
    date: "2023",
    type: "Inspection",
    image: "/projects/01e6376ed284372de5d45ef1328dd0058df94308b5.jpg",
    description: "Post-storm inspection and documentation for insurance claim. Full damage assessment report provided."
  },
  {
    id: "13",
    title: "Roof Replacement - McKinney",
    location: "Adriatica Village",
    city: "McKinney, TX",
    date: "2023",
    type: "Residential Roofing",
    image: "/projects/01c2ccd6b0fc5d59fa1c44b138e87560492dff06cb.jpg",
    description: "Mediterranean-style tile roof replacement. Custom color matching for HOA compliance."
  },
  {
    id: "14",
    title: "Emergency Leak Repair - Plano",
    location: "Central Plano",
    city: "Plano, TX",
    date: "2023",
    type: "Emergency Repair",
    image: "/projects/01ac8dc5dadbb9a9da48b348ba3440688f28346869.jpg",
    description: "Emergency leak detection and repair. Water damage prevention and interior protection."
  },
  {
    id: "15",
    title: "Residential Roofing - McKinney",
    location: "Stonebridge Ranch",
    city: "McKinney, TX",
    date: "2023",
    type: "Residential Roofing",
    image: "/projects/01a81342329264ae6867eeb321229991bc38c527ed.jpg",
    description: "Premium roofing installation with advanced underlayment and ventilation system."
  },
];

export default function Projects() {
  const [selectedType, setSelectedType] = useState<string>("All");
  
  const types = ["All", "Residential Roofing", "Storm Damage", "Emergency Repair", "Inspection", "Commercial"];
  
  const filteredProjects = selectedType === "All" 
    ? PROJECTS 
    : PROJECTS.filter(p => p.type === selectedType);

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
              <Link href="/projects" className="text-sm font-medium text-primary">Projects</Link>
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
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Our Roofing Projects
            </h1>
            <p className="text-xl text-muted-foreground mb-6">
              Real projects from real customers across McKinney, Plano, Frisco, Allen, and surrounding areas. 
              Over 500+ successful roofing projects since 2015.
            </p>
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>500+ Projects Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Licensed & Insured</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>10+ Years Experience</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Gallery Section */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Watch Our Work in Action</h2>
              <p className="text-lg text-muted-foreground">
                See real job site videos from our roofing projects across McKinney and the DFW area
              </p>
            </div>
            <VideoGallery />
          </div>
        </div>
      </section>

      {/* Filter Section */}
      <section className="py-8 bg-muted/30">
        <div className="container">
          <div className="flex flex-wrap gap-3 justify-center">
            {types.map((type) => (
              <Button
                key={type}
                variant={selectedType === type ? "default" : "outline"}
                onClick={() => setSelectedType(type)}
                size="sm"
              >
                {type}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="py-16">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="overflow-hidden hover:shadow-xl transition-shadow">
                <div className="aspect-video overflow-hidden">
                  <img 
                    src={project.image} 
                    alt={`${project.title} - Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner project in ${project.city}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary">{project.type}</Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {project.date}
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{project.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <MapPin className="h-4 w-4" />
                    <span>{project.location}, {project.city}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {project.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Your Roofing Project?</h2>
            <p className="text-lg mb-8 opacity-90">
              Join hundreds of satisfied customers across the Dallas-Fort Worth area. 
              Get your free inspection and quote today.
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
              All project photos taken by Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner team. Real projects, real results.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
