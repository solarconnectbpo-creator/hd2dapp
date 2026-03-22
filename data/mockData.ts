export interface Lead {
  id: string;
  industry: "roofing" | "solar" | "windows" | "hvac" | "siding";
  location: string;
  city: string;
  qualityScore: number;
  price: number;
  leadType: "aged" | "local-exclusive" | "appointment" | "live-transfer";
  contactName: string;
  phone: string;
  email: string;
  notes: string;
  createdAt: string;
  latitude: number;
  longitude: number;
}

export interface Deal {
  id: string;
  contactName: string;
  company: string;
  value: number;
  stage:
    | "new"
    | "contacted"
    | "qualified"
    | "proposal"
    | "negotiation"
    | "won"
    | "lost";
  daysInStage: number;
  phone: string;
  email: string;
  notes: string;
  industry: string;
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: number;
  content: string;
  hashtags: string[];
  likes: number;
  comments: number;
  isLiked: boolean;
  createdAt: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: "full-time" | "part-time" | "contract";
  experienceLevel: "entry" | "mid" | "senior";
  salary: string;
  description: string;
  requirements: string[];
  postedAt: string;
}

export interface Course {
  id: string;
  title: string;
  instructor: string;
  duration: string;
  price: number;
  level: "beginner" | "intermediate" | "advanced";
  description: string;
  enrolled: boolean;
  progress: number;
}

export interface Certification {
  id: string;
  name: string;
  requirements: string;
  progress: number;
  earned: boolean;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: "conference" | "training" | "networking" | "trade-show";
  attendees: number;
  description: string;
  isRsvped: boolean;
}

export interface CallCenterAgent {
  id: string;
  name: string;
  status: "active" | "inactive" | "break";
  callsHandled: number;
  averageCallDuration: number;
}

export interface CallCenter {
  id: string;
  name: string;
  agents: CallCenterAgent[];
  status: "active" | "inactive";
  monthlyPrice: number;
  purchasedAt: string;
}

export const LEADS: Lead[] = [
  {
    id: "1",
    industry: "roofing",
    location: "Dallas, TX",
    city: "Dallas",
    qualityScore: 92,
    price: 85,
    leadType: "local-exclusive",
    contactName: "Mike Johnson",
    phone: "(214) 555-0123",
    email: "mike.j@email.com",
    notes: "Interested in roof replacement, storm damage",
    createdAt: "2024-01-15",
    latitude: 32.7767,
    longitude: -96.797,
  },
  {
    id: "2",
    industry: "solar",
    location: "Phoenix, AZ",
    city: "Phoenix",
    qualityScore: 88,
    price: 225,
    leadType: "appointment",
    contactName: "Sarah Williams",
    phone: "(602) 555-0456",
    email: "sarah.w@email.com",
    notes: "High electricity bills, looking to reduce costs",
    createdAt: "2024-01-14",
    latitude: 33.4484,
    longitude: -112.074,
  },
  {
    id: "3",
    industry: "windows",
    location: "Denver, CO",
    city: "Denver",
    qualityScore: 85,
    price: 3,
    leadType: "aged",
    contactName: "Tom Davis",
    phone: "(303) 555-0789",
    email: "tom.d@email.com",
    notes: "Older windows, energy efficiency concerns",
    createdAt: "2024-01-13",
    latitude: 39.7392,
    longitude: -104.9903,
  },
  {
    id: "4",
    industry: "hvac",
    location: "Houston, TX",
    city: "Houston",
    qualityScore: 78,
    price: 400,
    leadType: "live-transfer",
    contactName: "Lisa Chen",
    phone: "(713) 555-0321",
    email: "lisa.c@email.com",
    notes: "AC unit 15 years old, needs replacement",
    createdAt: "2024-01-12",
    latitude: 29.7604,
    longitude: -95.3698,
  },
  {
    id: "5",
    industry: "siding",
    location: "Atlanta, GA",
    city: "Atlanta",
    qualityScore: 90,
    price: 65,
    leadType: "local-exclusive",
    contactName: "James Brown",
    phone: "(404) 555-0654",
    email: "james.b@email.com",
    notes: "Looking for vinyl siding, full house",
    createdAt: "2024-01-11",
    latitude: 33.749,
    longitude: -84.388,
  },
  {
    id: "6",
    industry: "roofing",
    location: "Tampa, FL",
    city: "Tampa",
    qualityScore: 95,
    price: 275,
    leadType: "appointment",
    contactName: "Emily Roberts",
    phone: "(813) 555-0987",
    email: "emily.r@email.com",
    notes: "Hurricane damage, insurance claim pending",
    createdAt: "2024-01-10",
    latitude: 27.9506,
    longitude: -82.4572,
  },
];

export const DEALS: Deal[] = [
  {
    id: "1",
    contactName: "Robert Miller",
    company: "Miller Residence",
    value: 15000,
    stage: "new",
    daysInStage: 2,
    phone: "(555) 123-4567",
    email: "r.miller@email.com",
    notes: "Referred by neighbor",
    industry: "Roofing",
    createdAt: "2024-01-14",
  },
  {
    id: "2",
    contactName: "Amanda Green",
    company: "Green Family Home",
    value: 22000,
    stage: "contacted",
    daysInStage: 5,
    phone: "(555) 234-5678",
    email: "a.green@email.com",
    notes: "Scheduled for site visit",
    industry: "Solar",
    createdAt: "2024-01-10",
  },
  {
    id: "3",
    contactName: "David Lee",
    company: "Lee Properties",
    value: 8500,
    stage: "qualified",
    daysInStage: 3,
    phone: "(555) 345-6789",
    email: "d.lee@email.com",
    notes: "Budget confirmed, ready for quote",
    industry: "Windows",
    createdAt: "2024-01-08",
  },
  {
    id: "4",
    contactName: "Jennifer White",
    company: "White Residence",
    value: 35000,
    stage: "proposal",
    daysInStage: 7,
    phone: "(555) 456-7890",
    email: "j.white@email.com",
    notes: "Sent detailed proposal",
    industry: "Solar",
    createdAt: "2024-01-05",
  },
  {
    id: "5",
    contactName: "Chris Taylor",
    company: "Taylor Home",
    value: 12000,
    stage: "negotiation",
    daysInStage: 4,
    phone: "(555) 567-8901",
    email: "c.taylor@email.com",
    notes: "Discussing financing options",
    industry: "HVAC",
    createdAt: "2024-01-03",
  },
  {
    id: "6",
    contactName: "Patricia Adams",
    company: "Adams Family",
    value: 28000,
    stage: "won",
    daysInStage: 0,
    phone: "(555) 678-9012",
    email: "p.adams@email.com",
    notes: "Contract signed, installation scheduled",
    industry: "Roofing",
    createdAt: "2023-12-28",
  },
];

export const POSTS: Post[] = [
  {
    id: "1",
    userId: "u1",
    userName: "Marcus Thompson",
    userAvatar: 1,
    content:
      "Just closed a $45K roofing deal after 3 follow-ups. Persistence pays off! Never give up on a quality lead.",
    hashtags: ["roofing", "sales", "closing"],
    likes: 47,
    comments: 12,
    isLiked: false,
    createdAt: "2h ago",
  },
  {
    id: "2",
    userId: "u2",
    userName: "Jessica Rivera",
    userAvatar: 2,
    content:
      "Pro tip: Always do a full home assessment even if they only called for one thing. Found 3 upsell opportunities on my last visit.",
    hashtags: ["salestips", "doortodoor"],
    likes: 89,
    comments: 23,
    isLiked: true,
    createdAt: "4h ago",
  },
  {
    id: "3",
    userId: "u3",
    userName: "Derek Washington",
    userAvatar: 3,
    content:
      "Storm season is here! Time to hit the ground running. Who else is crushing it in the Houston area?",
    hashtags: ["stormchasing", "roofing", "houston"],
    likes: 34,
    comments: 8,
    isLiked: false,
    createdAt: "6h ago",
  },
  {
    id: "4",
    userId: "u4",
    userName: "Rachel Kim",
    userAvatar: 4,
    content:
      "Earned my Solar Pro Certification today! 6 months of hard work paid off. Ready to take my career to the next level.",
    hashtags: ["certification", "solar", "careergrowth"],
    likes: 156,
    comments: 45,
    isLiked: false,
    createdAt: "8h ago",
  },
  {
    id: "5",
    userId: "u5",
    userName: "Brandon Scott",
    userAvatar: 5,
    content:
      "Best objection handler: 'I understand you want to think about it. What specific concerns can I address right now?' Works every time.",
    hashtags: ["salestips", "objectionhandling"],
    likes: 203,
    comments: 67,
    isLiked: true,
    createdAt: "12h ago",
  },
];

export const JOBS: Job[] = [
  {
    id: "1",
    title: "Senior Sales Representative",
    company: "SolarMax Solutions",
    location: "Austin, TX",
    type: "full-time",
    experienceLevel: "senior",
    salary: "$80K - $150K OTE",
    description:
      "Looking for experienced door-to-door sales professionals to join our growing solar team.",
    requirements: [
      "3+ years D2D experience",
      "Proven track record",
      "Valid drivers license",
    ],
    postedAt: "2 days ago",
  },
  {
    id: "2",
    title: "Sales Team Lead",
    company: "Premier Roofing Co",
    location: "Dallas, TX",
    type: "full-time",
    experienceLevel: "senior",
    salary: "$100K - $200K OTE",
    description: "Lead a team of 8-10 sales reps in the Dallas metro area.",
    requirements: [
      "5+ years sales experience",
      "2+ years leadership",
      "Roofing industry preferred",
    ],
    postedAt: "3 days ago",
  },
  {
    id: "3",
    title: "Entry Level Sales Rep",
    company: "WindowPro USA",
    location: "Phoenix, AZ",
    type: "full-time",
    experienceLevel: "entry",
    salary: "$45K - $90K OTE",
    description:
      "No experience needed! We provide full training and mentorship.",
    requirements: [
      "Strong work ethic",
      "Reliable transportation",
      "Positive attitude",
    ],
    postedAt: "1 week ago",
  },
  {
    id: "4",
    title: "Regional Sales Manager",
    company: "HVAC Experts Inc",
    location: "Atlanta, GA",
    type: "full-time",
    experienceLevel: "senior",
    salary: "$120K - $250K OTE",
    description: "Oversee sales operations across the Southeast region.",
    requirements: [
      "7+ years sales experience",
      "3+ years management",
      "HVAC industry experience",
    ],
    postedAt: "5 days ago",
  },
];

export const COURSES: Course[] = [
  {
    id: "1",
    title: "D2D Mastery Certification",
    instructor: "Mike Reynolds",
    duration: "8 weeks",
    price: 497,
    level: "beginner",
    description:
      "Master the fundamentals of door-to-door selling with our comprehensive certification program.",
    enrolled: true,
    progress: 65,
  },
  {
    id: "2",
    title: "Roofing Sales Accelerator",
    instructor: "Sarah Martinez",
    duration: "10 weeks",
    price: 997,
    level: "intermediate",
    description:
      "Accelerate your roofing sales career with advanced techniques and field strategies.",
    enrolled: false,
    progress: 0,
  },
  {
    id: "3",
    title: "Solar Closer Blueprint",
    instructor: "James Wilson",
    duration: "12 weeks",
    price: 1497,
    level: "advanced",
    description:
      "Complete blueprint for closing high-ticket solar deals with confidence and consistency.",
    enrolled: true,
    progress: 30,
  },
  {
    id: "4",
    title: "Leadership / Recruiting Course",
    instructor: "Lisa Chen",
    duration: "6 weeks",
    price: 997,
    level: "advanced",
    description:
      "Learn to build and lead high-performing sales teams while recruiting top talent.",
    enrolled: false,
    progress: 0,
  },
];

export const CERTIFICATIONS: Certification[] = [
  {
    id: "1",
    name: "Certified Sales Professional",
    requirements: "Complete 3 courses and pass exam",
    progress: 66,
    earned: false,
  },
  {
    id: "2",
    name: "Solar Pro Certification",
    requirements: "Solar Sales Mastery + 10 closed deals",
    progress: 100,
    earned: true,
  },
  {
    id: "3",
    name: "Roofing Specialist",
    requirements: "Complete roofing course + field assessment",
    progress: 25,
    earned: false,
  },
];

export const EVENTS: Event[] = [
  {
    id: "1",
    title: "D2D Sales Summit 2024",
    date: "Mar 15, 2024",
    time: "9:00 AM",
    location: "Las Vegas, NV",
    type: "conference",
    attendees: 2500,
    description: "The biggest door-to-door sales conference of the year.",
    isRsvped: true,
  },
  {
    id: "2",
    title: "Solar Sales Workshop",
    date: "Feb 20, 2024",
    time: "2:00 PM",
    location: "Phoenix, AZ",
    type: "training",
    attendees: 150,
    description: "Hands-on training for solar sales professionals.",
    isRsvped: false,
  },
  {
    id: "3",
    title: "Closers Networking Night",
    date: "Feb 8, 2024",
    time: "6:00 PM",
    location: "Dallas, TX",
    type: "networking",
    attendees: 75,
    description: "Connect with top performers in your area.",
    isRsvped: false,
  },
  {
    id: "4",
    title: "Home Improvement Expo",
    date: "Apr 5, 2024",
    time: "10:00 AM",
    location: "Houston, TX",
    type: "trade-show",
    attendees: 5000,
    description: "Major trade show featuring latest products and vendors.",
    isRsvped: true,
  },
];

export const STAGES = [
  { key: "new", label: "New Lead", color: "#6B7280" },
  { key: "contacted", label: "Contacted", color: "#3B82F6" },
  { key: "qualified", label: "Qualified", color: "#8B5CF6" },
  { key: "proposal", label: "Proposal", color: "#F59E0B" },
  { key: "negotiation", label: "Negotiation", color: "#EC4899" },
  { key: "won", label: "Won", color: "#10B981" },
  { key: "lost", label: "Lost", color: "#EF4444" },
];

export const INDUSTRIES = [
  { key: "roofing", label: "Roofing", icon: "home" },
  { key: "solar", label: "Solar", icon: "sun" },
  { key: "windows", label: "Windows", icon: "square" },
  { key: "hvac", label: "HVAC", icon: "thermometer" },
  { key: "siding", label: "Siding", icon: "layers" },
];

export const LEAD_TYPE_LABELS: Record<string, string> = {
  aged: "Aged Lead: $1–$5",
  "local-exclusive": "Local Exclusive: $45–$125",
  appointment: "Booked Appointment: $125–$350",
  "live-transfer": "Live Transfer: $200–$600",
};

export const JOB_POSTING_PACKAGES = [
  { id: "1", name: "1 Job Post", price: 47, posts: 1 },
  { id: "2", name: "5 Job Posts", price: 197, posts: 5 },
  { id: "3", name: "Featured (7 days)", price: 297, featured: true },
];

export const CALL_CENTER_PRICING = {
  firstAgent: 1500,
  additionalAgent: 1000,
};

export const MOCK_CALL_CENTER: CallCenter = {
  id: "1",
  name: "HD2D Sales Center",
  status: "active",
  purchasedAt: "2024-01-01",
  agents: [
    {
      id: "1",
      name: "John Smith",
      status: "active",
      callsHandled: 127,
      averageCallDuration: 8.5,
    },
    {
      id: "2",
      name: "Maria Garcia",
      status: "active",
      callsHandled: 143,
      averageCallDuration: 7.2,
    },
    {
      id: "3",
      name: "David Lee",
      status: "break",
      callsHandled: 98,
      averageCallDuration: 9.1,
    },
  ],
  get monthlyPrice() {
    const agentCount = this.agents.length;
    return (
      CALL_CENTER_PRICING.firstAgent +
      (agentCount - 1) * CALL_CENTER_PRICING.additionalAgent
    );
  },
};
