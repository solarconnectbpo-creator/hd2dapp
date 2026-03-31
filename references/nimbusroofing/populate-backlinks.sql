-- Populate backlinks table with discovered Nimbus Roofing URLs from Google Maps research

INSERT INTO backlinks (sourceUrl, targetUrl, anchorText, platform, status, domainAuthority, notes, lastChecked, createdAt) VALUES
-- High-Authority Directory Listings
('https://www.yelp.com/biz/nimbus-roofing-mckinney-2', 'https://www.nimbusroofing.com', 'Nimbus Roofing', 'Yelp', 'active', 95, '80 photos, 154 reviews, critical for local SEO', NOW(), NOW()),
('https://www.bbb.org/us/tx/mckinney/profile/roofing-contractors/nimbus-roofing-0875-91018091', 'https://www.nimbusroofing.com', 'Nimbus Roofing', 'BBB', 'active', 92, 'A+ BBB rating, trust signal for Google', NOW(), NOW()),
('https://www.owenscorning.com/en-us/roofing/contractors/contractor-profile/228267', 'http://www.nimbusroofing.com', 'Nimbus Roofing LLC', 'Owens Corning', 'active', 88, 'Certified contractor profile, industry authority', NOW(), NOW()),
('https://www.google.com/maps/place/Nimbus+Roofing/@33.279113,-96.6267297,17z', 'https://nimbusroofing.com', 'nimbusroofing.com', 'Google Maps', 'active', 100, '4.9 stars, 154 reviews, primary Google listing', NOW(), NOW()),

-- Major Search Engine Properties
('https://www.mapquest.com/us/texas/nimbus-roofing-425812353', 'https://www.nimbusroofing.com', 'Nimbus Roofing', 'MapQuest', 'active', 85, 'Map, directions, reviews, geographic relevance', NOW(), NOW()),
('https://local.yahoo.com/info-224536480-nimbus-roofing-mckinney/', 'https://www.nimbusroofing.com', 'Nimbus Roofing', 'Yahoo Local', 'active', 87, 'Major search engine property', NOW(), NOW()),
('https://sites.google.com/view/nimbusroofing/', 'https://www.nimbusroofing.com', 'Nimbus Roofing, LLC', 'Google Sites', 'active', 98, 'Direct Google property, portfolio and maps integration', NOW(), NOW()),

-- Industry-Specific Directories
('https://www.roofingdirect.com/contractors/nimbus-roofing/', 'https://www.nimbusroofing.com', 'Nimbus Roofing', 'RoofingDirect', 'active', 75, 'Industry-specific contractor directory', NOW(), NOW()),

-- Professional Networks & B2B
('https://www.linkedin.com/company/nimbus-roofing-texas', 'http://www.nimbusroofing.com', 'Nimbus General Contractors, LLC', 'LinkedIn', 'active', 96, 'Professional network authority, company profile', NOW(), NOW()),
('https://www.zoominfo.com/c/nimbus-roofing-llc/478159839', 'https://www.nimbusroofing.com', 'Nimbus Roofing LLC', 'ZoomInfo', 'active', 82, 'B2B authority, company overview and revenue data', NOW(), NOW()),
('https://rocketreach.co/nimbus-roofing-solar-management_b6c025e4c7900877', 'https://www.nimbusroofing.com', 'Nimbus Roofing & Solar', 'RocketReach', 'active', 78, 'B2B contact database', NOW(), NOW()),

-- Local Directories
('https://nimbus-general-contractors-llc.wheree.com/', 'https://www.nimbusroofing.com', 'Nimbus General Contractors, LLC', 'Wheree.com', 'active', 65, 'Local business directory', NOW(), NOW());
