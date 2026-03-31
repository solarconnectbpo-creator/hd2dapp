/**
 * National Weather Service (NWS) API Integration
 * Free U.S. government weather data service
 * 
 * API Documentation: https://www.weather.gov/documentation/services-web-api
 * No API key required - completely free public service
 */

export interface NWSAlert {
  id: string;
  type: string;
  properties: {
    event: string; // e.g., "Severe Thunderstorm Warning", "Tornado Warning"
    headline: string;
    description: string;
    instruction: string;
    severity: "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
    certainty: "Observed" | "Likely" | "Possible" | "Unlikely" | "Unknown";
    urgency: "Immediate" | "Expected" | "Future" | "Past" | "Unknown";
    onset: string; // ISO 8601 timestamp
    expires: string; // ISO 8601 timestamp
    areaDesc: string;
    sent: string;
  };
}

export interface WeatherAlert {
  id: string;
  event: string;
  headline: string;
  description: string;
  severity: string;
  urgency: string;
  onset: Date;
  expires: Date;
  areaDesc: string;
  isStormRelated: boolean;
  shouldTriggerContent: boolean;
}

/**
 * McKinney, TX coordinates for NWS API
 * Latitude: 33.1972, Longitude: -96.6397
 */
const MCKINNEY_LAT = 33.1972;
const MCKINNEY_LON = -96.6397;

/**
 * Collin County, TX - NWS zone identifier
 * Used for county-wide alerts
 */
const COLLIN_COUNTY_ZONE = "TXZ104";

/**
 * Storm-related event types that should trigger content generation
 */
const STORM_EVENT_TYPES = [
  "Severe Thunderstorm Warning",
  "Severe Thunderstorm Watch",
  "Tornado Warning",
  "Tornado Watch",
  "Flash Flood Warning",
  "Flash Flood Watch",
  "Hail",
  "High Wind Warning",
  "High Wind Watch",
  "Special Weather Statement" // Often includes hail/storm info
];

/**
 * NWS Weather Service Class
 */
export class NWSWeatherService {
  private baseUrl = "https://api.weather.gov";
  
  /**
   * Get active weather alerts for McKinney/Collin County
   */
  async getActiveAlerts(): Promise<WeatherAlert[]> {
    try {
      // Method 1: Get alerts by point (McKinney coordinates)
      const pointUrl = `${this.baseUrl}/alerts/active?point=${MCKINNEY_LAT},${MCKINNEY_LON}`;
      
      const response = await fetch(pointUrl, {
        headers: {
          "User-Agent": "NimbusRoofing.com (contact@nimbusroofing.com)",
          "Accept": "application/geo+json"
        }
      });

      if (!response.ok) {
        console.error(`[NWS API] Error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      const alerts: NWSAlert[] = data.features || [];

      // Transform NWS alerts to our format
      return alerts.map(alert => this.transformAlert(alert));
    } catch (error) {
      console.error("[NWS API] Failed to fetch alerts:", error);
      return [];
    }
  }

  /**
   * Get alerts specifically for Collin County
   */
  async getCollinCountyAlerts(): Promise<WeatherAlert[]> {
    try {
      const zoneUrl = `${this.baseUrl}/alerts/active/zone/${COLLIN_COUNTY_ZONE}`;
      
      const response = await fetch(zoneUrl, {
        headers: {
          "User-Agent": "NimbusRoofing.com (contact@nimbusroofing.com)",
          "Accept": "application/geo+json"
        }
      });

      if (!response.ok) {
        console.error(`[NWS API] Zone error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      const alerts: NWSAlert[] = data.features || [];

      return alerts.map(alert => this.transformAlert(alert));
    } catch (error) {
      console.error("[NWS API] Failed to fetch zone alerts:", error);
      return [];
    }
  }

  /**
   * Get all storm-related alerts that should trigger content generation
   */
  async getStormAlerts(): Promise<WeatherAlert[]> {
    const alerts = await this.getActiveAlerts();
    return alerts.filter(alert => alert.shouldTriggerContent);
  }

  /**
   * Check if there are any active storm alerts
   */
  async hasActiveStormAlerts(): Promise<boolean> {
    const stormAlerts = await this.getStormAlerts();
    return stormAlerts.length > 0;
  }

  /**
   * Transform NWS alert to our internal format
   */
  private transformAlert(nwsAlert: NWSAlert): WeatherAlert {
    const props = nwsAlert.properties;
    const isStormRelated = this.isStormRelatedEvent(props.event);
    const shouldTriggerContent = this.shouldTriggerContentGeneration(props);

    return {
      id: nwsAlert.id,
      event: props.event,
      headline: props.headline,
      description: props.description,
      severity: props.severity,
      urgency: props.urgency,
      onset: new Date(props.onset),
      expires: new Date(props.expires),
      areaDesc: props.areaDesc,
      isStormRelated,
      shouldTriggerContent
    };
  }

  /**
   * Check if event type is storm-related
   */
  private isStormRelatedEvent(eventType: string): boolean {
    return STORM_EVENT_TYPES.some(stormType => 
      eventType.toLowerCase().includes(stormType.toLowerCase())
    );
  }

  /**
   * Determine if alert should trigger content generation
   */
  private shouldTriggerContentGeneration(props: NWSAlert["properties"]): boolean {
    // Must be storm-related
    if (!this.isStormRelatedEvent(props.event)) {
      return false;
    }

    // Must be severe or extreme
    if (props.severity !== "Severe" && props.severity !== "Extreme") {
      return false;
    }

    // Must be immediate or expected urgency
    if (props.urgency !== "Immediate" && props.urgency !== "Expected") {
      return false;
    }

    // Must mention McKinney, Collin County, or nearby areas
    const areaLower = props.areaDesc.toLowerCase();
    const relevantAreas = ["mckinney", "collin", "plano", "frisco", "allen"];
    const isRelevantArea = relevantAreas.some(area => areaLower.includes(area));

    return isRelevantArea;
  }

  /**
   * Generate content topic from weather alert
   */
  generateContentTopic(alert: WeatherAlert): string {
    const eventType = alert.event.toLowerCase();
    
    if (eventType.includes("hail")) {
      return "Emergency Hail Damage Roof Repair in McKinney After Severe Storm";
    }
    
    if (eventType.includes("tornado")) {
      return "Tornado Damage Roof Restoration Services in McKinney TX";
    }
    
    if (eventType.includes("thunderstorm") || eventType.includes("wind")) {
      return "Storm Damage Roof Repair After Severe Weather in McKinney";
    }
    
    if (eventType.includes("flood")) {
      return "Emergency Roof Leak Repair After Flash Flooding in McKinney";
    }
    
    // Default storm damage topic
    return "Emergency Storm Damage Roof Repair in McKinney TX - Immediate Response";
  }

  /**
   * Generate keywords from weather alert
   */
  generateKeywords(alert: WeatherAlert): string[] {
    const baseKeywords = [
      "emergency roof repair McKinney TX",
      "storm damage restoration",
      "24/7 emergency roofing service"
    ];

    const eventType = alert.event.toLowerCase();
    
    if (eventType.includes("hail")) {
      baseKeywords.push(
        "hail damage roof repair McKinney",
        "emergency hail damage repair",
        "hail storm roof replacement"
      );
    }
    
    if (eventType.includes("tornado")) {
      baseKeywords.push(
        "tornado damage roof repair",
        "emergency tornado restoration",
        "tornado roof replacement McKinney"
      );
    }
    
    if (eventType.includes("wind")) {
      baseKeywords.push(
        "wind damage roof repair",
        "high wind roof damage",
        "emergency wind damage repair"
      );
    }

    return baseKeywords;
  }
}

/**
 * Singleton instance
 */
export const nwsWeatherService = new NWSWeatherService();
