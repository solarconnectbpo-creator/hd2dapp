import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, 
  Shield, 
  Clock, 
  Award, 
  CheckCircle, 
  Star,
  Home as HomeIcon,
  Building2,
  CloudRain,
  FileText,
  Wrench,
  MapPin,
  ArrowRight,
  Menu,
  MessageSquare,
  Download,
  ClipboardList
} from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { RoofingChatbot } from "@/components/RoofingChatbot";
import { StructuredData } from "@/components/StructuredData";
import { GOOGLE_REVIEW_URL } from "@/const";
import { BACKLINK_URLS } from "@shared/backlinks";
import NotificationBell from "@/components/NotificationBell";
import EmergencyBanner from "@/components/EmergencyBanner";

export default function Home() {
  const featuresAnim = useScrollAnimation();
  const statsAnim = useScrollAnimation();
  const mobileAppAnim = useScrollAnimation();
  
  return (
    <div className="min-h-screen bg-background">
      <StructuredData type="LocalBusiness" />
      <RoofingChatbot />
      
      {/* Header with Final Logo & Google Reviews */}
      <nav className="bg-gray-900 shadow-2xl sticky top-0 z-50 border-b border-gray-700">
        <div className="container">
          <div className="flex items-center justify-between h-24">
            {/* Logo & Badges */}
            <div className="flex items-center gap-6">
              <img 
                src="/nimbus-logo-final.png" 
                alt="Nimbus Roofing" 
                className="h-20 w-20 rounded-lg shadow-lg" 
              />
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 rounded-full border border-blue-400">
                    <span className="text-xs font-bold text-white">Google for Startups</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-600 rounded-full border border-purple-400">
                    <span className="text-xs font-bold text-white">Gemini AI</span>
                  </div>
                </div>
                {/* Google Reviews Badge */}
                <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="text-sm font-bold text-gray-900">4.9</span>
                    <span className="text-xs text-gray-600">154 reviews</span>
                  </div>
                </a>
              </div>
            </div>
            
            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              <Link href="/">
                <Button variant="ghost" className="text-base font-bold text-gray-100 hover:text-white hover:bg-gray-800">HOME</Button>
              </Link>
              <Link href="/services">
                <Button variant="ghost" className="text-base font-bold text-gray-100 hover:text-white hover:bg-gray-800">SERVICES</Button>
              </Link>
              <Link href="/projects">
                <Button variant="ghost" className="text-base font-bold text-gray-100 hover:text-white hover:bg-gray-800">PROJECTS</Button>
              </Link>
              <Link href="/testimonials">
                <Button variant="ghost" className="text-base font-bold text-gray-100 hover:text-white hover:bg-gray-800">TESTIMONIALS</Button>
              </Link>
              <Link href="/contact">
                <Button variant="ghost" className="text-base font-bold text-gray-100 hover:text-white hover:bg-gray-800">CONTACT</Button>
              </Link>
            </div>
            
            {/* Phone & Mobile Menu */}
            <div className="flex items-center gap-3">
              <NotificationBell />
              <a href="tel:+12146126696">
                <Button className="bg-cyan-500 text-white hover:bg-cyan-600 ripple shadow-lg text-base font-bold px-6">
                  <Phone className="h-5 w-5 mr-2" />
                  <span className="hidden sm:inline">(214) 612-6696</span>
                </Button>
              </a>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6 text-gray-100" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Emergency Banner - Material Design */}
      <div className="bg-destructive text-destructive-foreground py-3 shadow-sm">
        <div className="container">
          <p className="text-center text-sm font-medium">
            🚨 24/7 Emergency Service Available | Call Now: 
            <a href="tel:+12146126696" className="ml-1 underline font-semibold hover:text-white transition-colors">
              (214) 612-6696
            </a>
          </p>
        </div>
      </div>

      {/* Hero Section - Hail Damage Roofing Contractor */}
      <section className="relative bg-background text-foreground overflow-hidden min-h-[600px] flex items-center">
        {/* Hail Damage Background with Storm Imagery */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://files.manuscdn.com/user_upload_by_module/session_file/310519663196531548/DbdXaQQfSWUXGEaq.png')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/60"></div>
        
        <div className="container relative py-20 md:py-28">
          <motion.div 
            className="max-w-3xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <Badge className="bg-primary/20 text-primary border-primary/30 mb-6 px-4 py-2 text-sm font-semibold">
              ⚡ AI-Powered Roof Inspections
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-white">
              Hail Damage?
              <span className="block text-accent mt-2">We've Got You Covered</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 mb-8 font-medium">
              Expert roof replacement for storm damage across Dallas-Fort Worth. Our AI technology speeds up inspections and insurance claims.
            </p>
            
            <motion.div 
              className="flex flex-wrap gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <Link href="#contact">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl ripple text-lg px-8 py-6">
                  <FileText className="mr-2 h-6 w-6" />
                  Free Inspection
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              
              <Link href="tel:+12146126696">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-2 border-white text-white hover:bg-white/10 shadow-lg text-lg px-8 py-6"
                >
                  <Phone className="mr-2 h-6 w-6" />
                  Call (214) 612-6696
                </Button>
              </Link>
            </motion.div>
            
            {/* Trust Indicators */}
            <motion.div 
              className="flex flex-wrap items-center gap-6 mt-10 text-white/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">GAF Certified</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">Insurance Approved</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">24/7 Emergency Service</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
        
        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Features Section - Material Design Cards */}
      <section className="py-20 bg-muted/30">
        <div className="container" ref={featuresAnim.ref}>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Roofing Services</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Complete roof replacement solutions for storm and hail damage across North Texas
            </p>
          </div>
          
          <motion.div 
            className="grid md:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 50 }}
            animate={featuresAnim.isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ duration: 0.6, staggerChildren: 0.2 }}
          >
            {/* Service 1: Storm Damage Assessment */}
            <Card className="shadow-xl p-8 hover:shadow-2xl transition-all border-t-4 border-primary">
              <CardContent className="p-0">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Storm Damage Assessment</h3>
                <p className="text-muted-foreground mb-6 text-base leading-relaxed">
                  AI-powered roof inspections detect hail damage, wind damage, and structural issues in minutes. Get accurate assessments for insurance claims.
                </p>
                <Link href="#contact">
                  <Button variant="ghost" className="text-primary p-0 h-auto font-semibold uppercase text-sm hover:gap-2 transition-all">
                    Schedule Inspection
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Service 2: Total Roof Replacement */}
            <Card className="shadow-xl p-8 hover:shadow-2xl transition-all border-t-4 border-accent">
              <CardContent className="p-0">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-6">
                  <FileText className="h-8 w-8 text-accent" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Total Roof Replacement</h3>
                <p className="text-muted-foreground mb-6 text-base leading-relaxed">
                  Complete roof replacement with GAF certified materials. We handle everything from tear-off to final inspection. Lifetime warranty available.
                </p>
                <Link href="#contact">
                  <Button variant="ghost" className="text-primary p-0 h-auto font-semibold uppercase text-sm hover:gap-2 transition-all">
                    Get Free Quote
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Service 3: Insurance Claims Help */}
            <Card className="shadow-xl p-8 hover:shadow-2xl transition-all border-t-4 border-secondary">
              <CardContent className="p-0">
                <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mb-6">
                  <Star className="h-8 w-8 text-secondary" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Insurance Claims Help</h3>
                <p className="text-muted-foreground mb-6 text-base leading-relaxed">
                  We work directly with your insurance company. Our AI technology creates detailed reports that get claims approved faster.
                </p>
                <Link href="#contact">
                  <Button variant="ghost" className="text-primary p-0 h-auto font-semibold uppercase text-sm hover:gap-2 transition-all">
                    File Your Claim
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Stats Section - Roofing Contractor Metrics */}
      <section className="py-20 bg-primary text-white">
        <div className="container" ref={statsAnim.ref}>
          <motion.div 
            className="grid md:grid-cols-4 gap-8 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={statsAnim.isVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.6 }}
          >
            <div>
              <div className="text-5xl font-bold mb-2">500+</div>
              <div className="text-white/90 uppercase text-sm tracking-wide font-semibold">Roofs Replaced</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">15+</div>
              <div className="text-white/90 uppercase text-sm tracking-wide font-semibold">Years Experience</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">98%</div>
              <div className="text-white/90 uppercase text-sm tracking-wide font-semibold">Customer Satisfaction</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">24/7</div>
              <div className="text-white/90 uppercase text-sm tracking-wide font-semibold">Emergency Service</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works - Material Design Stepper */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How Our AI Process Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From inspection to insurance approval - faster than traditional methods
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-xl">
                  1
                </div>
                <h3 className="text-2xl font-bold mb-4">Free Inspection</h3>
                <p className="text-muted-foreground text-base leading-relaxed">
                  Our AI-powered drones and imaging technology detect every hail impact and structural issue in minutes, not hours.
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-accent text-white flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-xl">
                  2
                </div>
                <h3 className="text-2xl font-bold mb-4">Insurance Claim</h3>
                <p className="text-muted-foreground text-base leading-relaxed">
                  Gemini AI generates detailed reports with photos, measurements, and Xactimate codes that insurance companies trust.
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-secondary text-white flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-xl">
                  3
                </div>
                <h3 className="text-2xl font-bold mb-4">Roof Replacement</h3>
                <p className="text-muted-foreground text-base leading-relaxed">
                  GAF certified installation with lifetime warranty. We handle everything from tear-off to final cleanup.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service Areas Section */}
      <section className="py-20 bg-muted/30">
        <div className="container" ref={mobileAppAnim.ref}>
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={mobileAppAnim.isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Serving North Texas</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Expert roof replacement across the Dallas-Fort Worth metroplex and beyond
            </p>
          </motion.div>
          
          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 50 }}
            animate={mobileAppAnim.isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            {/* Dallas */}
            <Card className="p-6 hover:shadow-xl transition-all border-l-4 border-primary">
              <CardContent className="p-0">
                <h3 className="text-2xl font-bold mb-2 text-primary">Dallas</h3>
                <p className="text-muted-foreground mb-4">
                  Complete coverage across Dallas County with 24/7 emergency response for storm damage.
                </p>
                <Link href="#contact">
                  <Button variant="ghost" className="text-primary p-0 h-auto font-semibold">
                    Get Free Quote
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Fort Worth */}
            <Card className="p-6 hover:shadow-xl transition-all border-l-4 border-accent">
              <CardContent className="p-0">
                <h3 className="text-2xl font-bold mb-2 text-accent">Fort Worth</h3>
                <p className="text-muted-foreground mb-4">
                  Serving Tarrant County with GAF certified installations and lifetime warranties.
                </p>
                <Link href="#contact">
                  <Button variant="ghost" className="text-primary p-0 h-auto font-semibold">
                    Get Free Quote
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* McKinney */}
            <Card className="p-6 hover:shadow-xl transition-all border-l-4 border-secondary">
              <CardContent className="p-0">
                <h3 className="text-2xl font-bold mb-2 text-secondary">McKinney</h3>
                <p className="text-muted-foreground mb-4">
                  Expert hail damage repair and roof replacement throughout Collin County.
                </p>
                <Link href="#contact">
                  <Button variant="ghost" className="text-primary p-0 h-auto font-semibold">
                    Get Free Quote
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Amarillo */}
            <Card className="p-6 hover:shadow-xl transition-all border-l-4 border-primary">
              <CardContent className="p-0">
                <h3 className="text-2xl font-bold mb-2 text-primary">Amarillo</h3>
                <p className="text-muted-foreground mb-4">
                  Panhandle storm damage specialists with AI-powered inspection technology.
                </p>
                <Link href="#contact">
                  <Button variant="ghost" className="text-primary p-0 h-auto font-semibold">
                    Get Free Quote
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Austin */}
            <Card className="p-6 hover:shadow-xl transition-all border-l-4 border-accent">
              <CardContent className="p-0">
                <h3 className="text-2xl font-bold mb-2 text-accent">Austin</h3>
                <p className="text-muted-foreground mb-4">
                  Central Texas roofing solutions with fast insurance claim processing.
                </p>
                <Link href="#contact">
                  <Button variant="ghost" className="text-primary p-0 h-auto font-semibold">
                    Get Free Quote
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Surrounding Areas */}
            <Card className="p-6 hover:shadow-xl transition-all border-l-4 border-secondary">
              <CardContent className="p-0">
                <h3 className="text-2xl font-bold mb-2 text-secondary">Surrounding Areas</h3>
                <p className="text-muted-foreground mb-4">
                  Plano, Frisco, Allen, Richardson, Irving, Arlington, and more.
                </p>
                <Link href="#contact">
                  <Button variant="ghost" className="text-primary p-0 h-auto font-semibold">
                    Get Free Quote
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* AI Technology Showcase Section */}
      <section className="py-20 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Powered by Nimbus IQ AI</h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Our proprietary AI technology stack combines Gemini AI, Vertex AI, and Quantum Computing to deliver the fastest, most accurate roof inspections in the industry.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Nimbus Roofing OS Dashboard */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden hover:scale-105 transition-transform">
              <CardContent className="p-0">
                <img 
                  src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663196531548/rOISxUivDcVtqqZt.png" 
                  alt="Nimbus Roofing OS - Storm Tracking Dashboard" 
                  className="w-full h-auto"
                />
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-3">Nimbus Roofing OS</h3>
                  <p className="text-white/80">
                    Real-time storm tracking, AI business agent, and automated SMS queue for instant customer engagement.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Nimbus IQ AI Ecosystem */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden hover:scale-105 transition-transform">
              <CardContent className="p-0">
                <img 
                  src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663196531548/pOinMouwojoovfDu.png" 
                  alt="Nimbus IQ AI Ecosystem - Google Cloud Integration" 
                  className="w-full h-auto"
                />
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-3">AI Ecosystem</h3>
                  <p className="text-white/80">
                    Integrated with Google Cloud, Gemini AI, Vertex AI, and advanced security protocols for enterprise-grade performance.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quantum Computing & Infrastructure */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-6 hover:bg-white/10 transition-all">
              <CardContent className="p-0 text-center">
                <img 
                  src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663196531548/yoolVRTQMLNgbORQ.png" 
                  alt="Quantum Inference Engine" 
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
                <h4 className="text-xl font-bold mb-2">Quantum Inference Engine</h4>
                <p className="text-white/70 text-sm">Multi-layer AI architecture with 99.8% confidence ratings</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-6 hover:bg-white/10 transition-all">
              <CardContent className="p-0 text-center">
                <img 
                  src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663196531548/FoetKvYbHfkrhVJY.png" 
                  alt="AI Agent Dev Environment" 
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
                <h4 className="text-xl font-bold mb-2">AI Agent Development</h4>
                <p className="text-white/70 text-sm">Autonomous database backup and execution replication</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-6 hover:bg-white/10 transition-all">
              <CardContent className="p-0 text-center">
                <img 
                  src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663196531548/HrtCGyrbPvYsxPph.png" 
                  alt="Storm Lead to Cash Flow Workflow" 
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
                <h4 className="text-xl font-bold mb-2">Lead-to-Cash Automation</h4>
                <p className="text-white/70 text-sm">End-to-end workflow from storm detection to payment</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Sample Reports Section */}
      <section className="py-16 bg-gray-50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Sample Reports & Documents</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              See the professional-grade reports our AI technology generates for every project.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Scope Sheet */}
            <a 
              href="https://d2xsxph8kpxj0f.cloudfront.net/310519663196531548/Da8Aqq7vdypxzx6Gdf6sLN/Nimbus-Roofing-Scope-Sheet_3aa905b5.pdf" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group"
            >
              <Card className="shadow-lg hover:shadow-2xl transition-all border-t-4 border-cyan-500 h-full">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-cyan-50 flex items-center justify-center mb-6 mx-auto group-hover:bg-cyan-100 transition-colors">
                    <ClipboardList className="h-8 w-8 text-cyan-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Nimbus Roofing Scope Sheet</h3>
                  <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                    Xactimate-format scope sheet with room diagrams, line items, calculations, and depreciation tracking. Used for insurance claim documentation.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-cyan-600 font-semibold group-hover:gap-3 transition-all">
                    <Download className="h-4 w-4" />
                    View Sample PDF
                  </div>
                </CardContent>
              </Card>
            </a>

            {/* Measurement Report */}
            <a 
              href="https://d2xsxph8kpxj0f.cloudfront.net/310519663196531548/Da8Aqq7vdypxzx6Gdf6sLN/Nimbus-Roofing-Measurement-Report_47ce4de6.pdf" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group"
            >
              <Card className="shadow-lg hover:shadow-2xl transition-all border-t-4 border-blue-500 h-full">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-6 mx-auto group-hover:bg-blue-100 transition-colors">
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Measurement Report</h3>
                  <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                    7-page comprehensive report with roof diagrams, length/area/pitch measurements, waste calculator, and material estimates for all major brands.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-blue-600 font-semibold group-hover:gap-3 transition-all">
                    <Download className="h-4 w-4" />
                    View Sample PDF
                  </div>
                </CardContent>
              </Card>
            </a>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact" className="py-20 bg-gradient-to-br from-primary to-accent text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                Get Your Free Roof Inspection
              </h2>
              <p className="text-xl text-white/90 max-w-2xl mx-auto">
                AI-powered inspection in 24 hours. No obligation. Most insurance claims approved.
              </p>
            </div>
            
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-8">
                <form className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-white font-semibold mb-2">Full Name *</label>
                      <input 
                        type="text" 
                        required
                        className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                        placeholder="John Smith"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-semibold mb-2">Phone Number *</label>
                      <input 
                        type="tel" 
                        required
                        className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                        placeholder="(214) 555-0123"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-white font-semibold mb-2">Email Address *</label>
                    <input 
                      type="email" 
                      required
                      className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                      placeholder="john@example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white font-semibold mb-2">Property Address *</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                      placeholder="123 Main St, Dallas, TX 75201"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white font-semibold mb-2">Type of Damage *</label>
                    <select 
                      required
                      className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                    >
                      <option value="" className="text-gray-900">Select damage type...</option>
                      <option value="hail" className="text-gray-900">Hail Damage</option>
                      <option value="wind" className="text-gray-900">Wind Damage</option>
                      <option value="storm" className="text-gray-900">Storm Damage</option>
                      <option value="leak" className="text-gray-900">Roof Leak</option>
                      <option value="age" className="text-gray-900">Old Roof / Replacement</option>
                      <option value="other" className="text-gray-900">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-white font-semibold mb-2">Insurance Company (Optional)</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                      placeholder="State Farm, Allstate, etc."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white font-semibold mb-2">Additional Details</label>
                    <textarea 
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                      placeholder="Tell us about your roofing needs..."
                    ></textarea>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                      type="submit" 
                      size="lg" 
                      className="flex-1 bg-white text-primary hover:bg-white/90 shadow-xl font-bold text-lg py-6"
                    >
                      <FileText className="mr-2 h-6 w-6" />
                      Request Free Inspection
                    </Button>
                    <a href="tel:+12146126696" className="flex-1">
                      <Button 
                        type="button"
                        size="lg" 
                        variant="outline" 
                        className="w-full border-2 border-white text-white hover:bg-white/10 font-bold text-lg py-6"
                      >
                        <Phone className="mr-2 h-6 w-6" />
                        Call Now
                      </Button>
                    </a>
                    <a href="sms:+12146126696?body=Hi%20Nimbus%20Roofing%2C%20I%20need%20a%20roof%20inspection." className="flex-1">
                      <Button 
                        type="button"
                        size="lg" 
                        variant="outline" 
                        className="w-full border-2 border-white text-white hover:bg-white/10 font-bold text-lg py-6"
                      >
                        <MessageSquare className="mr-2 h-6 w-6" />
                        Text Us
                      </Button>
                    </a>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Google Maps Embed */}
      <section className="py-12 bg-muted/20">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Find Us</h2>
            <p className="text-muted-foreground">1308 Caney Creek Ln, McKinney, TX 75071</p>
          </div>
          <div className="rounded-xl overflow-hidden shadow-2xl border">
            <iframe
              src="https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=Nimbus+Roofing,McKinney+TX&zoom=15"
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Nimbus Roofing - McKinney, TX"
            ></iframe>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <a href={BACKLINK_URLS.GOOGLE_MAPS} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <MapPin className="h-4 w-4" />
                Get Directions
              </Button>
            </a>
            <a href="tel:+12146126696">
              <Button variant="outline" className="gap-2">
                <Phone className="h-4 w-4" />
                Call (214) 612-6696
              </Button>
            </a>
            <a href="sms:+12146126696?body=Hi%20Nimbus%20Roofing%2C%20I%20need%20a%20roof%20inspection.">
              <Button variant="outline" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Text Us
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer - Material Design */}
      <footer className="bg-card border-t py-12">
        <div className="container">
          <div className="grid md:grid-cols-5 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/nimbus-logo-final.png" alt="Nimbus Roofing" className="h-10 w-10 rounded" />
                <span className="font-bold text-lg">Nimbus Roofing</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                AI-powered roofing contractor serving Dallas-Fort Worth since 2019. GAF Certified. Owens Corning Preferred.
              </p>
              <div className="flex items-center gap-3">
                <a href={BACKLINK_URLS.GOOGLE_MAPS} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="Google Maps">
                  <MapPin className="h-5 w-5" />
                </a>
                <a href={BACKLINK_URLS.LINKEDIN} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="LinkedIn">
                  <Building2 className="h-5 w-5" />
                </a>
                <a href={BACKLINK_URLS.YELP} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="Yelp">
                  <Star className="h-5 w-5" />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-4 uppercase text-sm">Services</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/services" className="hover:text-primary transition-colors">Storm Damage Assessment</Link></li>
                <li><Link href="/services" className="hover:text-primary transition-colors">Roof Replacement</Link></li>
                <li><Link href="/services" className="hover:text-primary transition-colors">Insurance Claims Help</Link></li>
                <li><Link href="/services" className="hover:text-primary transition-colors">Emergency Repairs</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-4 uppercase text-sm">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/" className="hover:text-primary transition-colors">About Us</Link></li>
                <li><Link href="/projects" className="hover:text-primary transition-colors">Projects</Link></li>
                <li><Link href="/testimonials" className="hover:text-primary transition-colors">Testimonials</Link></li>
                <li><Link href="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
                <li><Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-4 uppercase text-sm">Reviews & Trust</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href={BACKLINK_URLS.GOOGLE_MAPS_REVIEW} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Leave Google Review</a></li>
                <li><a href={BACKLINK_URLS.YELP} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Read Yelp Reviews</a></li>
                <li><a href={BACKLINK_URLS.BBB} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">BBB A+ Rating</a></li>
                <li><a href={BACKLINK_URLS.OWENS_CORNING} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Owens Corning Certified</a></li>
                <li><a href={BACKLINK_URLS.GOOGLE_MAPS} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Get Directions</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-4 uppercase text-sm">Contact Us</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0" />
                  <a href="tel:+12146126696" className="hover:text-primary transition-colors font-semibold">(214) 612-6696</a>
                </li>
                <li className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <a href="sms:+12146126696?body=Hi%20Nimbus%20Roofing%2C%20I%20need%20a%20roof%20inspection." className="hover:text-primary transition-colors">Text Us</a>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <a href={BACKLINK_URLS.GOOGLE_MAPS} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">1308 Caney Creek Ln<br/>McKinney, TX 75071</a>
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0" />
                  <a href="mailto:info@nimbusroofing.com" className="hover:text-primary transition-colors">info@nimbusroofing.com</a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Nimbus General Contractors, LLC dba Nimbus Roofing. All rights reserved.</p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <span>•</span>
              <Link href="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</Link>
              <span>•</span>
              <a href={BACKLINK_URLS.OWENS_CORNING} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Owens Corning Certified</a>
              <span>•</span>
              <a href={BACKLINK_URLS.BBB} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">BBB A+ Rated</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
