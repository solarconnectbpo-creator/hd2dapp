import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { Link } from "wouter";

export default function PrivacyPolicy() {
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
        <h1 className="text-4xl font-bold mb-2 text-foreground">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last Updated: February 6, 2026</p>

        <div className="prose prose-lg max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nimbus Roofing ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services. By using our website, you consent to the data practices described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-semibold mb-3 mt-6">2.1 Personal Information</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We collect personal information that you voluntarily provide to us when you:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Fill out contact forms or request free roof inspections</li>
              <li>Call or email us for roofing services</li>
              <li>Submit insurance claim information</li>
              <li>Subscribe to our newsletter or blog updates</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              This information may include: full name, email address, phone number, property address, insurance company details, and information about roof damage or service needs.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.2 Automatically Collected Information</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you visit our website, we automatically collect certain information about your device, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>IP address and browser type</li>
              <li>Operating system and device information</li>
              <li>Pages viewed and time spent on pages</li>
              <li>Referring website and search terms used</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Provide roofing services, including inspections, estimates, and installations</li>
              <li>Respond to your inquiries and customer service requests</li>
              <li>Process insurance claims and communicate with insurance companies on your behalf</li>
              <li>Send you marketing communications about our services (with your consent)</li>
              <li>Improve our website and services through analytics</li>
              <li>Detect and prevent fraud or security threats</li>
              <li>Comply with legal obligations and enforce our terms</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use the following third-party services that may collect information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Google Gemini AI:</strong> We use Google's Gemini AI to power our chatbot, analyze roof damage from photos, and generate insurance claim reports. Google may collect and process data according to their privacy policy.</li>
              <li><strong>Google Analytics:</strong> We use Google Analytics to understand how visitors use our website. Google Analytics collects information anonymously and reports website trends.</li>
              <li><strong>Google Maps:</strong> We use Google Maps to display service areas and provide directions. Google may collect location data.</li>
              <li><strong>Email Service Providers:</strong> We use email services to send notifications and marketing communications.</li>
              <li><strong>SMS Services (Twilio):</strong> We may send SMS notifications for emergency roof repair requests.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Cookies and Tracking Technologies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar tracking technologies to enhance your experience on our website. Cookies are small data files stored on your device. You can control cookie preferences through your browser settings, but disabling cookies may limit website functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your personal information from unauthorized access, disclosure, alteration, or destruction. However, no internet transmission is completely secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required by law. Customer records and project documentation may be retained for warranty and legal compliance purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Your Privacy Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications at any time</li>
              <li><strong>Data Portability:</strong> Request transfer of your data to another service</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise these rights, please contact us at the information provided below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. California Privacy Rights (CCPA)</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information we collect, the right to delete your information, and the right to opt-out of the sale of your information. We do not sell personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. We encourage you to review this Privacy Policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
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
