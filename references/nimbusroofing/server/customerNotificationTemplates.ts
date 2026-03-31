/**
 * Customer Notification Template System
 * Based on the Mr. Rice Installation Notice template
 * Generates professional customer notifications for roofing installations
 */

export interface InstallationNotificationData {
  customerName: string; // "Mr. and Mrs. Rice"
  arrivalTime: string; // "sunrise 6:32 am"
  completionDate: string; // "Wednesday evening"
  workersCount: string; // "8-10 workers"
  vehiclesCount: string; // "5 vehicles"
  dumpsterPlacement: string; // "cursterter vil be place πrt-7-30"
  shingleType: string; // "Owens Corning Duration® shingles 50 St."
  shingleClass: string; // "Class 3 IR impact-resistant"
  ventType: string; // "new vents"
  ridgeType: string; // "high profile hip and rige"
  colorName: string; // "Driftwood"
  hoaCompliance?: string; // "All10 H.O.A."
  phone: string; // "(214) 612-6696"
}

/**
 * Generate installation notice notification
 */
export function generateInstallationNotice(data: InstallationNotificationData): string {
  const {
    customerName,
    arrivalTime,
    completionDate,
    workersCount,
    vehiclesCount,
    dumpsterPlacement,
    shingleType,
    shingleClass,
    ventType,
    ridgeType,
    colorName,
    hoaCompliance,
    phone,
  } = data;

  return `
🏠 **NIMBUS ROOFING - NO H.O.A.**
**IQ STEPS TO FINISH**

Dear ${customerName},

**Installation Schedule:**
✅ Arrival: ${arrivalTime}
✅ Estimated Completion: ${completionDate}

**What to Expect:**
- **Crew Size:** ${workersCount}
- **Vehicles:** ${vehiclesCount} parked around your home
- **Dumpster:** ${dumpsterPlacement} for installation

**Installation Process (6 Steps):**
1. **Roof tear off** - Remove existing materials
2. **Underlayment** - Install protective barrier
3. **Shingles** - Install premium roofing materials
4. **Vents** - Install ${ventType}
5. **Ridge-cap** - Complete ${ridgeType}
6. **Clean-up** - Final site cleanup

**Materials:**
- **Shingles:** ${shingleType}
- **Class:** ${shingleClass}
- **Color:** ${colorName}
${hoaCompliance ? `- **HOA:** ${hoaCompliance}` : ''}

**Questions?**
Call us anytime: ${phone}

Thank you for choosing Nimbus Roofing!
  `.trim();
}

/**
 * Generate storm damage notification
 */
export function generateStormDamageNotification(data: {
  customerName: string;
  inspectionDate: string;
  inspectorName: string;
  damageType: string;
  urgency: "high" | "medium" | "low";
  phone: string;
}): string {
  const urgencyEmoji = {
    high: "🚨",
    medium: "⚠️",
    low: "ℹ️",
  };

  return `
${urgencyEmoji[data.urgency]} **STORM DAMAGE INSPECTION SCHEDULED**

Dear ${data.customerName},

Your roof inspection has been scheduled:

**Inspection Details:**
- **Date:** ${data.inspectionDate}
- **Inspector:** ${data.inspectorName}
- **Damage Type:** ${data.damageType}
- **Priority:** ${data.urgency.toUpperCase()}

**What We'll Do:**
✅ 21-point roof inspection
✅ Drone/AI damage assessment
✅ Insurance documentation
✅ Free repair estimate

**Emergency Contact:**
${data.phone} (24/7)

We'll help you navigate the insurance claim process and maximize your settlement.

- Nimbus AI-Roofing Agent
  `.trim();
}

/**
 * Generate insurance claim update notification
 */
export function generateClaimUpdateNotification(data: {
  customerName: string;
  claimNumber: string;
  status: "submitted" | "approved" | "pending" | "supplemented";
  claimAmount?: number;
  supplementAmount?: number;
  nextSteps: string;
  phone: string;
}): string {
  const statusEmoji = {
    submitted: "📋",
    approved: "✅",
    pending: "⏳",
    supplemented: "💰",
  };

  let amountText = "";
  if (data.claimAmount) {
    amountText = `\n**Claim Amount:** $${data.claimAmount.toLocaleString()}`;
  }
  if (data.supplementAmount) {
    amountText += `\n**Supplement:** +$${data.supplementAmount.toLocaleString()}`;
  }

  return `
${statusEmoji[data.status]} **INSURANCE CLAIM UPDATE**

Dear ${data.customerName},

**Claim #${data.claimNumber}**
**Status:** ${data.status.toUpperCase()}${amountText}

**Next Steps:**
${data.nextSteps}

**Questions?**
Call your dedicated adjuster: ${data.phone}

Our AI-powered claim assistance has helped McKinney homeowners increase settlements by an average of $4,200+.

- Nimbus Roofing Claims Team
  `.trim();
}

/**
 * Generate completion notification
 */
export function generateCompletionNotification(data: {
  customerName: string;
  completionDate: string;
  projectType: string;
  warrantyYears: number;
  reviewLink?: string;
  phone: string;
}): string {
  return `
🎉 **PROJECT COMPLETE!**

Dear ${data.customerName},

Congratulations! Your ${data.projectType} project is complete.

**Completion Date:** ${data.completionDate}
**Warranty:** ${data.warrantyYears} years

**What's Included:**
✅ Owens Corning Preferred Contractor warranty
✅ Workmanship guarantee
✅ Storm damage protection
✅ 24/7 emergency support

${
  data.reviewLink
    ? `**Love Your New Roof?**
We'd appreciate a review: ${data.reviewLink}`
    : ""
}

**Questions or Concerns?**
Call us: ${data.phone}

Thank you for trusting Nimbus Roofing with your home!

- The Nimbus Team
  `.trim();
}

/**
 * Generate weather alert notification
 */
export function generateWeatherAlertNotification(data: {
  alertType: "hail" | "wind" | "tornado" | "severe_storm";
  severity: "warning" | "watch" | "advisory";
  location: string;
  startTime: string;
  endTime?: string;
  instructions: string;
  phone: string;
}): string {
  const alertEmoji = {
    hail: "🧊",
    wind: "💨",
    tornado: "🌪️",
    severe_storm: "⛈️",
  };

  const severityColor = {
    warning: "🔴",
    watch: "🟡",
    advisory: "🟢",
  };

  return `
${alertEmoji[data.alertType]} ${severityColor[data.severity]} **WEATHER ALERT**

**${data.severity.toUpperCase()}: ${data.alertType.replace("_", " ").toUpperCase()}**

**Location:** ${data.location}
**Start:** ${data.startTime}
${data.endTime ? `**End:** ${data.endTime}` : ""}

**What To Do:**
${data.instructions}

**After The Storm:**
📞 Call for FREE inspection: ${data.phone}
🤖 Use our AI damage assessment tool
📋 We handle all insurance paperwork

**Emergency Tarping Available 24/7**

Stay safe!
- Nimbus Storm Response Team
  `.trim();
}

/**
 * Template registry for easy access
 */
export const NOTIFICATION_TEMPLATES = {
  installation: generateInstallationNotice,
  stormDamage: generateStormDamageNotification,
  claimUpdate: generateClaimUpdateNotification,
  completion: generateCompletionNotification,
  weatherAlert: generateWeatherAlertNotification,
};

/**
 * Get all available template types
 */
export function getAvailableTemplates(): string[] {
  return Object.keys(NOTIFICATION_TEMPLATES);
}
