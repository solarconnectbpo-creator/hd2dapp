import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmergencyBanner() {
  const [dismissed, setDismissed] = useState(false);
  
  const { data: alerts } = trpc.weather.getActiveAlerts.useQuery(undefined, {
    refetchInterval: 60000, // Refresh every minute
  });

  // Check if there are any severe storm alerts
  const hasSevereAlert = alerts && alerts.some((alert: any) => 
    alert.severity === "Severe" || alert.severity === "Extreme"
  );

  // Reset dismissed state when new alert comes in
  useEffect(() => {
    if (hasSevereAlert) {
      setDismissed(false);
    }
  }, [hasSevereAlert]);

  if (!hasSevereAlert || dismissed) {
    return null;
  }

  const severeAlert = alerts?.find((alert: any) => 
    alert.severity === "Severe" || alert.severity === "Extreme"
  );

  return (
    <div className="bg-red-600 text-white sticky top-0 z-50 shadow-lg">
      <div className="container">
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3 flex-1">
            <AlertTriangle className="h-6 w-6 flex-shrink-0 animate-pulse" />
            <div className="flex-1">
              <div className="font-bold text-sm md:text-base">
                {severeAlert?.event || "Severe Weather Alert"}
              </div>
              <div className="text-xs md:text-sm opacity-90">
                {severeAlert?.headline || "Storm damage? We offer 24/7 emergency roof repair service."}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <a href="tel:+12146126696">
              <Button 
                size="sm" 
                variant="secondary"
                className="bg-white text-red-600 hover:bg-gray-100 font-bold"
              >
                <Phone className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Call Now</span>
                <span className="sm:hidden">(214) 612-6696</span>
              </Button>
            </a>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:bg-red-700"
              onClick={() => setDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
