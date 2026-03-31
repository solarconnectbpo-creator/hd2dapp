import { useEffect } from "react";

interface StructuredDataProps {
  type: "LocalBusiness" | "Organization" | "Service" | "Review";
  data?: any;
}

export function StructuredData({ type, data }: StructuredDataProps) {
  useEffect(() => {
    let structuredData: any = {};

    if (type === "LocalBusiness") {
      structuredData = {
        "@context": "https://schema.org",
        "@type": "RoofingContractor",
        "name": "Nimbus Roofing",
        "image": "https://www.nimbusroofing.com/nimbus-ai-logo.png",
        "@id": "https://www.nimbusroofing.com",
        "url": "https://www.nimbusroofing.com",
        "telephone": "+12146126696",
        "priceRange": "$$",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "1308 Caney Creek Ln",
          "addressLocality": "McKinney",
          "addressRegion": "TX",
          "postalCode": "75071",
          "addressCountry": "US"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 33.1972,
          "longitude": -96.6397
        },
        "openingHoursSpecification": [
          {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            "opens": "07:00",
            "closes": "19:00"
          },
          {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": "Saturday",
            "opens": "08:00",
            "closes": "17:00"
          }
        ],
        "sameAs": [
          "https://www.linkedin.com/company/nimbus-roofing-texas",
          "https://www.yelp.com/biz/nimbus-roofing-mckinney-2",
          "https://www.bbb.org/us/tx/mckinney/profile/roofing-contractors/nimbus-roofing-0875-91018091",
          "https://www.owenscorning.com/en-us/roofing/contractors/contractor-profile/228267"
        ],
        "founder": {
          "@type": "Person",
          "name": "Dustin Moore",
          "jobTitle": "Founder & Roofing Professional"
        },
        "foundingDate": "2019",
        "areaServed": [
          {
            "@type": "City",
            "name": "McKinney",
            "containedIn": {
              "@type": "State",
              "name": "Texas"
            }
          },
          {
            "@type": "City",
            "name": "Plano",
            "containedIn": {
              "@type": "State",
              "name": "Texas"
            }
          },
          {
            "@type": "City",
            "name": "Frisco",
            "containedIn": {
              "@type": "State",
              "name": "Texas"
            }
          },
          {
            "@type": "City",
            "name": "Allen",
            "containedIn": {
              "@type": "State",
              "name": "Texas"
            }
          }
        ],
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": "Roofing Services",
          "itemListElement": [
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Residential Roofing",
                "description": "Complete residential roof installation and replacement services"
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Storm Damage Restoration",
                "description": "24/7 emergency storm damage repair and restoration services"
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Commercial Roofing",
                "description": "Professional commercial roofing installation and maintenance"
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Insurance Claim Assistance",
                "description": "Expert assistance with insurance claims for roof damage"
              }
            }
          ]
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "reviewCount": "154",
          "bestRating": "5",
          "worstRating": "1"
        },
        "email": "info@nimbusroofing.com",
        "description": "McKinney's trusted AI-powered roofing contractor since 2019. Expert storm damage restoration, insurance claims assistance, and quality roofing services. GAF certified, licensed, insured, and Owens Corning Preferred Contractor. Serving Dallas-Fort Worth metroplex with 24/7 emergency service.",
        "slogan": "Your Home. Informed & Protected.",
        "paymentAccepted": "Cash, Check, Credit Card, Financing Available",
        "currenciesAccepted": "USD",
        "hasMap": "https://g.page/r/Cd_NeB-qV23vEAE",
        "logo": "https://www.nimbusroofing.com/nimbus-ai-logo.png",
        "knowsAbout": ["Roofing", "Storm Damage Restoration", "Insurance Claims", "Roof Repair", "Roof Replacement", "Hail Damage", "Wind Damage"],
        "memberOf": ["Owens Corning Preferred Contractor Network", "Better Business Bureau"],
        "award": "A+ BBB Rating"
      };
    }

    // Inject script into document head
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(structuredData);
    script.id = `structured-data-${type}`;
    
    // Remove existing script if present
    const existing = document.getElementById(`structured-data-${type}`);
    if (existing) {
      existing.remove();
    }
    
    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount
      const scriptToRemove = document.getElementById(`structured-data-${type}`);
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [type, data]);

  return null; // This component doesn't render anything
}
