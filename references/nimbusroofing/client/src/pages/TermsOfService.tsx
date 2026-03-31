import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { Link } from "wouter";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3">
              <img 
                src="/nimbus-ai-logo.png" 
                alt="Nimbus Roofing Logo" 
                className="h-14 w-auto" 
              />
              <div className="flex flex-col">
                <span className="font-bold text-2xl text-gray-900">Nimbus Roofing</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-blue-600 font-semibold">Google for Startups</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-purple-600 font-semibold">Gemini</span>
                </div>
              </div>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-base font-semibold text-gray-700 hover:text-cyan-500 transition-colors">
                HOME
              </Link>
              <Link href="/services/residential" className="text-base font-semibold text-gray-700 hover:text-cyan-500 transition-colors">
                SERVICES
              </Link>
              <Link href="/contact" className="text-base font-semibold text-gray-700 hover:text-cyan-500 transition-colors">
                CONTACT
              </Link>
            </div>
            <a href="tel:+12146126696">
              <Button size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold">
                <Phone className="h-5 w-5 mr-2" />
                (214) 612-6696
              </Button>
            </a>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-2 text-foreground">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last Updated: February 6, 2026</p>

        <div className="prose prose-lg max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using the Nimbus Roofing website and services, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our website or services. We reserve the right to modify these Terms at any time, and your continued use constitutes acceptance of any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Services Provided</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Nimbus Roofing provides professional roofing services including, but not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Storm damage assessment and hail damage inspections</li>
              <li>Total roof replacement and installation</li>
              <li>Insurance claims assistance and documentation</li>
              <li>Emergency roof repair services</li>
              <li>AI-powered roof inspection and analysis</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              All services are subject to availability, scheduling, and weather conditions. We serve the Dallas-Fort Worth metroplex and surrounding areas in Texas.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Estimates and Pricing</h2>
            <p className="text-muted-foreground leading-relaxed">
              Free roof inspections and estimates are provided at no obligation. Final pricing is determined after a thorough inspection and assessment of your roofing needs. Prices may vary based on materials, labor, project scope, and unforeseen conditions discovered during work. All estimates are valid for 30 days unless otherwise specified. We reserve the right to adjust pricing if project scope changes or additional work is required.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Warranties and Guarantees</h2>
            <h3 className="text-xl font-semibold mb-3 mt-6">4.1 Workmanship Warranty</h3>
            <p className="text-muted-foreground leading-relaxed">
              We stand behind our work with a comprehensive workmanship warranty. The specific terms and duration of the warranty will be provided in your service contract. This warranty covers defects in installation and workmanship under normal use and conditions.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.2 Manufacturer Warranties</h3>
            <p className="text-muted-foreground leading-relaxed">
              Roofing materials come with manufacturer warranties (such as GAF System Plus Limited Warranty). These warranties are separate from our workmanship warranty and are subject to the manufacturer's terms and conditions. We will assist you in understanding and maintaining these warranties.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.3 Warranty Exclusions</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Warranties do not cover:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Damage caused by severe weather events (hail, tornadoes, hurricanes)</li>
              <li>Damage from improper maintenance or neglect</li>
              <li>Modifications or repairs performed by unauthorized parties</li>
              <li>Normal wear and tear over time</li>
              <li>Acts of God, vandalism, or accidents</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Insurance Claims Assistance</h2>
            <p className="text-muted-foreground leading-relaxed">
              We provide insurance claims assistance as a courtesy service. While we work to help you navigate the insurance claim process, we cannot guarantee claim approval or specific outcomes. You are ultimately responsible for your insurance claim and any deductibles or out-of-pocket expenses. We are not licensed insurance adjusters and do not provide legal or insurance advice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Payment Terms</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Payment terms will be outlined in your service contract. Generally:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>A deposit may be required to schedule work and order materials</li>
              <li>Progress payments may be required for large projects</li>
              <li>Final payment is due upon project completion and your satisfaction</li>
              <li>We accept cash, checks, credit cards, and insurance claim payments</li>
              <li>Late payments may incur additional fees as specified in your contract</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Cancellation and Rescheduling</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may cancel or reschedule services with reasonable notice. Cancellation policies and any associated fees will be outlined in your service contract. If materials have been ordered or work has begun, you may be responsible for costs incurred. We reserve the right to reschedule work due to weather conditions, material delays, or other circumstances beyond our control.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the fullest extent permitted by law, Nimbus Roofing shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from our services. Our total liability for any claim shall not exceed the amount paid for the specific service giving rise to the claim. This limitation applies to all claims, whether based on warranty, contract, tort, or any other legal theory.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Property Access and Safety</h2>
            <p className="text-muted-foreground leading-relaxed">
              By scheduling services, you grant us permission to access your property to perform roofing work. You are responsible for ensuring safe access to the work area, including removing vehicles, outdoor furniture, and other obstacles. We will take reasonable precautions to protect your property, but are not responsible for damage to landscaping, sprinkler systems, or other property features that may be unavoidably affected during roofing work.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. AI Technology Disclaimer</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use Google Gemini AI technology to enhance our roof inspection and claims documentation services. While AI technology improves accuracy and efficiency, all AI-generated reports and assessments are reviewed by licensed roofing professionals. AI technology is a tool to assist our services and does not replace professional judgment. We do not guarantee the accuracy of AI-generated content and are not liable for any errors or omissions in AI-assisted reports.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content on the Nimbus Roofing website, including text, images, logos, and software, is the property of Nimbus Roofing or its licensors and is protected by copyright and trademark laws. You may not reproduce, distribute, or create derivative works from our content without express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Dispute Resolution</h2>
            <p className="text-muted-foreground leading-relaxed">
              Any disputes arising from these Terms or our services shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. Arbitration shall take place in Dallas County, Texas. You waive any right to participate in a class action lawsuit or class-wide arbitration.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">13. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the State of Texas, without regard to its conflict of law provisions. Any legal action must be brought in the state or federal courts located in Dallas County, Texas.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">14. Severability</h2>
            <p className="text-muted-foreground leading-relaxed">
              If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect. The invalid provision shall be modified to the minimum extent necessary to make it valid and enforceable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">15. Entire Agreement</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms, together with any service contract you sign, constitute the entire agreement between you and Nimbus Roofing regarding our services. These Terms supersede any prior agreements or understandings, whether written or oral.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">16. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you have questions about these Terms of Service, please contact us:
            </p>
            <div className="bg-muted p-6 rounded-lg">
              <p className="font-semibold text-foreground mb-2">Nimbus Roofing</p>
              <p className="text-muted-foreground">Phone: <a href="tel:+12146126696" className="text-cyan-500 hover:underline">(214) 612-6696</a></p>
              <p className="text-muted-foreground">Email: <a href="mailto:info@nimbusroofing.com" className="text-cyan-500 hover:underline">info@nimbusroofing.com</a></p>
              <p className="text-muted-foreground">Service Area: Dallas-Fort Worth Metroplex, Texas</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
