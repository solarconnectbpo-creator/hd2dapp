/**
 * Backlink URLs and Platform Constants
 * 
 * Strategic backlinks discovered from Google Maps research
 * These URLs should be integrated into website action buttons
 */

export const BACKLINK_URLS = {
  // Google Maps - Primary Listing
  GOOGLE_MAPS: "https://www.google.com/maps/place/Nimbus+Roofing/@33.279113,-96.6267297,17z/data=!3m1!4b1!4m6!3m5!1s0x864c6cdc06ac0001:0xef6d57aa1f78cddf!8m2!3d33.279113!4d-96.6267297!16s%2Fg%2F11rxh_02t2",
  GOOGLE_MAPS_REVIEW: "https://www.google.com/maps/place/Nimbus+Roofing/@33.279113,-96.6267297,17z/data=!3m1!4b1!4m6!3m5!1s0x864c6cdc06ac0001:0xef6d57aa1f78cddf!8m2!3d33.279113!4d-96.6267297!16s%2Fg%2F11rxh_02t2?entry=ttu#modal=lu_review",
  GOOGLE_MAPS_PHOTOS: "https://www.google.com/maps/place/Nimbus+Roofing/@33.279113,-96.6267297,17z/data=!3m1!4b1!4m6!3m5!1s0x864c6cdc06ac0001:0xef6d57aa1f78cddf!8m2!3d33.279113!4d-96.6267297!16s%2Fg%2F11rxh_02t2?entry=ttu#modal=lu_photos",
  
  // High-Authority Review Platforms
  YELP: "https://www.yelp.com/biz/nimbus-roofing-mckinney-2",
  YELP_WRITE_REVIEW: "https://www.yelp.com/writeareview/biz/nimbus-roofing-mckinney-2",
  BBB: "https://www.bbb.org/us/tx/mckinney/profile/roofing-contractors/nimbus-roofing-0875-91018091",
  
  // Industry Authority
  OWENS_CORNING: "https://www.owenscorning.com/en-us/roofing/contractors/contractor-profile/228267",
  ROOFING_DIRECT: "https://www.roofingdirect.com/contractors/nimbus-roofing/",
  
  // Major Search Engines
  YAHOO_LOCAL: "https://local.yahoo.com/info-224536480-nimbus-roofing-mckinney/",
  MAPQUEST: "https://www.mapquest.com/us/texas/nimbus-roofing-425812353",
  
  // Google Properties
  GOOGLE_SITES: "https://sites.google.com/view/nimbusroofing/",
  
  // Professional Networks
  LINKEDIN: "https://www.linkedin.com/company/nimbus-roofing-texas",
  
  // B2B Directories
  ZOOMINFO: "https://www.zoominfo.com/c/nimbus-roofing-llc/478159839",
  ROCKETREACH: "https://rocketreach.co/nimbus-roofing-solar-management_b6c025e4c7900877",
  
  // Local Directories
  WHEREE: "https://nimbus-general-contractors-llc.wheree.com/",
} as const;

export const PLATFORM_NAMES = {
  GOOGLE_MAPS: "Google Maps",
  YELP: "Yelp",
  BBB: "Better Business Bureau",
  OWENS_CORNING: "Owens Corning",
  ROOFING_DIRECT: "RoofingDirect",
  YAHOO_LOCAL: "Yahoo Local",
  MAPQUEST: "MapQuest",
  GOOGLE_SITES: "Google Sites",
  LINKEDIN: "LinkedIn",
  ZOOMINFO: "ZoomInfo",
  ROCKETREACH: "RocketReach",
  WHEREE: "Wheree.com",
} as const;

export const DOMAIN_AUTHORITY = {
  GOOGLE_MAPS: 100,
  GOOGLE_SITES: 98,
  LINKEDIN: 96,
  YELP: 95,
  BBB: 92,
  OWENS_CORNING: 88,
  YAHOO_LOCAL: 87,
  MAPQUEST: 85,
  ZOOMINFO: 82,
  ROCKETREACH: 78,
  ROOFING_DIRECT: 75,
  WHEREE: 65,
} as const;

/**
 * Action button configurations for strategic backlink integration
 */
export const BACKLINK_ACTIONS = [
  {
    id: "google_review",
    label: "Leave a Google Review",
    url: BACKLINK_URLS.GOOGLE_MAPS_REVIEW,
    icon: "star",
    placement: ["footer", "after_contact_form", "testimonials_page"],
    priority: 1,
    description: "Share your experience with Nimbus Roofing on Google",
  },
  {
    id: "view_google_photos",
    label: "See Our Work on Google Maps",
    url: BACKLINK_URLS.GOOGLE_MAPS_PHOTOS,
    icon: "image",
    placement: ["projects_page", "homepage"],
    priority: 2,
    description: "View 150+ project photos on Google Maps",
  },
  {
    id: "yelp_reviews",
    label: "Read Reviews on Yelp",
    url: BACKLINK_URLS.YELP,
    icon: "star",
    placement: ["testimonials_page", "footer"],
    priority: 3,
    description: "Check out our 80+ Yelp reviews",
  },
  {
    id: "bbb_rating",
    label: "Verify Our A+ BBB Rating",
    url: BACKLINK_URLS.BBB,
    icon: "shield",
    placement: ["about_page", "certifications_page"],
    priority: 4,
    description: "See our Better Business Bureau accreditation",
  },
  {
    id: "owens_corning_profile",
    label: "View Owens Corning Profile",
    url: BACKLINK_URLS.OWENS_CORNING,
    icon: "award",
    placement: ["certifications_page"],
    priority: 5,
    description: "Certified Owens Corning contractor",
  },
  {
    id: "get_directions",
    label: "Get Directions",
    url: BACKLINK_URLS.GOOGLE_MAPS,
    icon: "map-pin",
    placement: ["contact_page", "footer"],
    priority: 6,
    description: "Find our office in McKinney, TX",
  },
] as const;

export type BacklinkAction = typeof BACKLINK_ACTIONS[number];
