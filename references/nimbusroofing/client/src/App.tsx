import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Services from "./pages/Services";
import ResidentialRoofing from "./pages/services/Residential";
import StormDamage from "./pages/services/StormDamage";
import Commercial from "./pages/services/Commercial";
import InsuranceClaims from "./pages/services/InsuranceClaims";
import StonebridgeRanch from "./pages/neighborhoods/StonebridgeRanch";
import CraigRanch from "./pages/neighborhoods/CraigRanch";
import EldoradoHeights from "./pages/neighborhoods/EldoradoHeights";
import TrinityFalls from "./pages/neighborhoods/TrinityFalls";
import TuckerHill from "./pages/neighborhoods/TuckerHill";
import Admin from "./pages/Admin";
import Contact from "./pages/Contact";
import Projects from "./pages/Projects";
import Certifications from "./pages/Certifications";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import AIContentGenerator from "./pages/AIContentGenerator";
import WeatherMonitoring from "./pages/WeatherMonitoring";
import NotificationManager from "./pages/NotificationManager";
import AdminContentScaling from "./pages/AdminContentScaling";
import AILearningsDashboard from "./pages/AILearningsDashboard";
import CallbackManagement from "./pages/CallbackManagement";
import APIKeysManagement from "./pages/APIKeysManagement";
import EmailDeliveryMonitoring from "./pages/EmailDeliveryMonitoring";
import SEODashboard from "./pages/SEODashboard";
import SEOManagement from "./pages/SEOManagement";
import BacklinkDashboard from "./pages/BacklinkDashboard";
import Technology from "./pages/Technology";
import Videos from "./pages/Videos";
import AutomationDashboard from "@/pages/AutomationDashboard";
import VoiceAI from "@/pages/VoiceAI";
import RoofInspectionAI from "@/pages/RoofInspectionAI";
import WorkflowBuilder from "@/pages/WorkflowBuilder";
import IntegrationHub from "@/pages/IntegrationHub";
import AutomationAnalytics from "@/pages/AutomationAnalytics";
import SATCALCAnalyzer from "@/pages/SATCALCAnalyzer";
import AIEcosystemDashboard from "@/pages/AIEcosystemDashboard";
import { AIChatWidget } from "@/components/AIChatWidget";
import PromptLibraryPage from "@/pages/PromptLibraryPage";
import FavoritesPage from "@/pages/FavoritesPage";
import AIAgentsDashboard from "./pages/AIAgentsDashboard";
import ClaimsUpload from "./pages/ClaimsUpload";
import LeadsManagement from "./pages/LeadsManagement";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Testimonials from "./pages/Testimonials";
import AIInfo from "./pages/AIInfo";
import NimbusIQ from "./pages/NimbusIQ";
import NimbusIQPitch from "./pages/NimbusIQPitch";
import AIVoicePricing from "./pages/AIVoicePricing";
import AutomationsCatalog from "./pages/AutomationsCatalog";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/services" component={Services} />
      <Route path="/technology" component={Technology} />
      <Route path="/videos" component={Videos} />
      <Route path="/services/residential" component={ResidentialRoofing} />
      <Route path="/services/storm-damage" component={StormDamage} />
      <Route path="/services/commercial" component={Commercial} />
      <Route path="/services/insurance-claims" component={InsuranceClaims} />
      <Route path="/neighborhoods/stonebridge-ranch" component={StonebridgeRanch} />
      <Route path="/neighborhoods/craig-ranch" component={CraigRanch} />
      <Route path="/neighborhoods/eldorado-heights" component={EldoradoHeights} />
      <Route path="/neighborhoods/trinity-falls" component={TrinityFalls} />
      <Route path="/neighborhoods/tucker-hill" component={TuckerHill} />
      <Route path="/admin" component={Admin} />
      <Route path="/contact" component={Contact} />
      <Route path="/projects" component={Projects} />
      <Route path="/certifications" component={Certifications} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={BlogPost} />
      <Route path="/admin/ai-content" component={AIContentGenerator} />
      <Route path="/admin/weather" component={WeatherMonitoring} />
      <Route path="/admin/notifications" component={NotificationManager} />
      <Route path="/admin/content-scaling" component={AdminContentScaling} />
      <Route path="/admin/ai-learnings" component={AILearningsDashboard} />
      <Route path="/admin/callbacks" component={CallbackManagement} />
      <Route path="/admin/api-keys" component={APIKeysManagement} />
      <Route path="/admin/email-delivery" component={EmailDeliveryMonitoring} />
      <Route path="/admin/seo-dashboard" component={SEODashboard} />
      <Route path="/automation/seo" component={SEOManagement} />
      <Route path="/automation/backlinks" component={BacklinkDashboard} />
      <Route path="/prompts" component={PromptLibraryPage} />
      <Route path="/favorites" component={FavoritesPage} />
      <Route path="/admin/ai-agents" component={AIAgentsDashboard} />
      <Route path="/claims" component={ClaimsUpload} />
      <Route path="/admin/leads" component={LeadsManagement} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-of-service" component={TermsOfService} />
      <Route path="/testimonials" component={Testimonials} />
      <Route path="/ai-info" component={AIInfo} />
      {/* Nimbus iQ AI — Sovereign Intelligence */}
      <Route path="/nimbus-iq" component={NimbusIQ} />
      <Route path="/nimbus-iq/pitch" component={NimbusIQPitch} />
      {/* AI Voice & Automations */}
      <Route path="/ai-voice-pricing" component={AIVoicePricing} />
      <Route path="/automations" component={AutomationsCatalog} />
      <Route path="/voice-ai" component={VoiceAI} />
      {/* Nimbus IQ AI Automation Platform */}
      <Route path="/automation" component={AutomationDashboard} />
      <Route path="/automation/voice-ai" component={VoiceAI} />
      <Route path="/automation/roof-inspection" component={RoofInspectionAI} />
      <Route path="/automation/workflows" component={WorkflowBuilder} />
      <Route path="/automation/integrations" component={IntegrationHub} />
      <Route path="/automation/analytics" component={AutomationAnalytics} />
      <Route path="/automation/satcalc" component={SATCALCAnalyzer} />
      <Route path="/automation/ecosystem" component={AIEcosystemDashboard} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
          <AIChatWidget />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
