import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Phone, 
  PhoneCall, 
  Clock, 
  User,
  MapPin,
  Mail,
  AlertCircle,
  CheckCircle2,
  Search,
  Play,
  Download,
  Calendar
} from "lucide-react";

/**
 * Voice AI Call Management Interface
 * View call history, transcripts, and AI analysis
 */
export default function VoiceAI() {
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Mock call data
  const calls = [
    {
      id: "call-001",
      timestamp: "2025-01-09 14:32",
      duration: "4:23",
      caller: "John Smith",
      phone: "(214) 555-0123",
      email: "john.smith@email.com",
      address: "123 Oak Street, McKinney, TX",
      status: "completed",
      intent: "emergency",
      urgency: "high",
      transcript: "AI: Hi, this is Nimbus Roofing AI. How can I help you today?\nCaller: I need help urgently. We have a major roof leak after last night's storm. Water is coming into our living room.\nAI: I'm so sorry to hear that! That sounds like an emergency. Let me get our team out to you right away. Can I get your name?\nCaller: John Smith.\nAI: Thank you, John. What's the best email to send your emergency confirmation to?\nCaller: john.smith@email.com\nAI: Got it. And your phone number for our crew to reach you?\nCaller: 214-555-0123\nAI: Perfect. I've scheduled an emergency inspection for today at 3:00 PM. You'll receive a confirmation email shortly with your crew's details. Our team lead will call you 30 minutes before arrival. Is there anything else I can help with?\nCaller: No, that's it. Thank you!\nAI: Thank you for choosing Nimbus Roofing, John — we'll take great care of you! If anything changes, call us at (214) 612-6696. Stay safe!",
      aiSummary: "Emergency roof leak requiring same-day service. Customer has active water intrusion in living room. Storm damage from previous night. Email collected: john.smith@email.com. High urgency.",
      aiActions: [
        "✅ Collected email: john.smith@email.com",
        "Schedule emergency inspection within 2 hours",
        "Send emergency crew notification",
        "Create high-priority lead in CRM",
        "Send confirmation email with ETA",
        "Provided warm wrap-up with next steps"
      ],
      outcome: "Appointment scheduled for 3:00 PM today. Confirmation sent to john.smith@email.com."
    },
    {
      id: "call-002",
      timestamp: "2025-01-09 13:15",
      duration: "6:45",
      caller: "Sarah Johnson",
      phone: "(214) 555-0456",
      email: "sarah.j@gmail.com",
      address: "456 Maple Drive, Plano, TX",
      status: "completed",
      intent: "quote",
      urgency: "medium",
      transcript: "AI: Welcome to Nimbus Roofing! I'm here to help. What can I do for you?\nCaller: I'm looking to get a quote for a full roof replacement. Our roof is about 20 years old.\nAI: A 20-year-old roof is definitely due for a look! We offer free inspections. Can I get your name to set one up?\nCaller: Sarah Johnson.\nAI: Great, Sarah! What's the best email to send your quote details and inspection confirmation to?\nCaller: sarah.j@gmail.com\nAI: Perfect. And a phone number so our inspector can confirm the day of?\nCaller: 214-555-0456\nAI: Wonderful! I've scheduled a free inspection for January 12th at 10:00 AM at your address. Here's what to expect: our certified inspector will do a full assessment, take photos, and have a detailed estimate emailed to you within 24 hours. Is there anything else you'd like to know?\nCaller: How long does a replacement usually take?\nAI: Most residential replacements take 1-3 days depending on size and complexity. We'll have exact timing in your estimate. Any other questions?\nCaller: No, that covers it.\nAI: Excellent! You'll receive a confirmation at sarah.j@gmail.com shortly. If you need anything before the 12th, call us at (214) 612-6696. Thank you for choosing Nimbus Roofing, Sarah!",
      aiSummary: "Quote request for full roof replacement. Existing roof is 20 years old with visible wear. Email collected: sarah.j@gmail.com. Customer scheduled for inspection.",
      aiActions: [
        "✅ Collected email: sarah.j@gmail.com",
        "Schedule inspection within 3-5 days",
        "Send confirmation email with inspection details",
        "Create lead in CRM with 'quote' tag",
        "Provided warm wrap-up with timeline expectations"
      ],
      outcome: "Inspection scheduled for January 12, 10:00 AM. Confirmation sent to sarah.j@gmail.com."
    },
    {
      id: "call-003",
      timestamp: "2025-01-09 11:48",
      duration: "3:45",
      caller: "Mike Davis",
      phone: "(214) 555-0789",
      email: "mike.davis@davisbiz.com",
      address: "789 Pine Lane, Frisco, TX",
      status: "completed",
      intent: "general_inquiry",
      urgency: "low",
      transcript: "AI: Nimbus Roofing, how can I help you today?\nCaller: Hi, I'm just calling to ask about your services. Do you handle commercial roofing? We have a small office building.\nAI: Absolutely! We handle commercial roofing including TPO, EPDM, and flat roof systems. What kind of building do you have?\nCaller: It's a small office, maybe 5,000 square feet.\nAI: Perfect size for our commercial team. We can do a free assessment. Can I get your name?\nCaller: Mike Davis.\nAI: Thanks, Mike! What's the best email to send our commercial services info and a free assessment offer to?\nCaller: mike.davis@davisbiz.com\nAI: Great, I'll send that right over. You'll get our commercial brochure with pricing ranges, warranty info, and some case studies. Would you like to schedule a free roof assessment?\nCaller: Not yet, let me review the info first.\nAI: No problem at all! Take your time reviewing. When you're ready, just reply to that email or call us at (214) 612-6696 to schedule. Is there anything else I can help with?\nCaller: No, that's all.\nAI: Wonderful! You'll have that info in your inbox within the hour. Thank you for considering Nimbus Roofing, Mike — we look forward to working with you!",
      aiSummary: "General inquiry about commercial roofing services. Customer has small office building (~5,000 sqft). Email collected: mike.davis@davisbiz.com. Informational stage — follow up after brochure review.",
      aiActions: [
        "✅ Collected email: mike.davis@davisbiz.com",
        "Send commercial services brochure to email",
        "Add to newsletter list",
        "Create low-priority lead with commercial tag",
        "Schedule follow-up in 1 week",
        "Provided warm wrap-up with clear next steps"
      ],
      outcome: "Commercial brochure sent to mike.davis@davisbiz.com. Follow-up scheduled for 1 week."
    }
  ];

  const stats = [
    { label: "Total Calls Today", value: "23", icon: Phone, color: "text-blue-500" },
    { label: "Answered by AI", value: "21", icon: PhoneCall, color: "text-green-500" },
    { label: "Emails Captured", value: "19", icon: Mail, color: "text-cyan-500" },
    { label: "Avg Duration", value: "4:32", icon: Clock, color: "text-purple-500" }
  ];

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high": return "bg-red-100 text-red-700";
      case "medium": return "bg-yellow-100 text-yellow-700";
      case "low": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getIntentIcon = (intent: string) => {
    switch (intent) {
      case "emergency": return <AlertCircle className="w-4 h-4" />;
      case "quote": return <Calendar className="w-4 h-4" />;
      default: return <Phone className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Voice AI Call Management</h1>
          <p className="text-slate-600 text-lg">Automated call handling with natural language understanding</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</div>
                <div className="text-sm text-slate-600">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Call List */}
          <div>
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Recent Calls</CardTitle>
                <CardDescription>AI-analyzed call history with transcripts</CardDescription>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Search calls..." 
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {calls.map((call) => (
                    <div 
                      key={call.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedCall?.id === call.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => setSelectedCall(call)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{call.caller}</div>
                            <div className="text-xs text-blue-600 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {call.email}
                            </div>
                          </div>
                        </div>
                        <Badge className={getUrgencyColor(call.urgency)}>
                          {call.urgency}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {call.timestamp}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {call.duration}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        {getIntentIcon(call.intent)}
                        <span className="text-sm font-medium capitalize">{call.intent.replace('_', ' ')}</span>
                      </div>

                      <div className="text-sm text-slate-700 line-clamp-2">
                        {call.aiSummary}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Call Details */}
          <div>
            {selectedCall ? (
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Call Details</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Play className="w-4 h-4 mr-2" />
                        Play Recording
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Caller Info */}
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">Caller Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-900">{selectedCall.caller}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-blue-500" />
                        <span className="text-slate-900 font-medium">{selectedCall.email}</span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Captured</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-900">{selectedCall.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-900">{selectedCall.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* AI Summary */}
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">AI Summary</h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-slate-700">{selectedCall.aiSummary}</p>
                    </div>
                  </div>

                  {/* Transcript */}
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">Full Transcript</h3>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 max-h-[300px] overflow-y-auto space-y-2">
                      {selectedCall.transcript.split('\n').map((line: string, i: number) => {
                        const isAI = line.startsWith('AI:');
                        const isCaller = line.startsWith('Caller:');
                        return (
                          <div key={i} className={`text-sm ${isAI ? 'text-blue-700 font-medium' : isCaller ? 'text-slate-800' : 'text-slate-600'}`}>
                            {isAI && <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2 mb-0.5" />}
                            {isCaller && <span className="inline-block w-2 h-2 bg-slate-400 rounded-full mr-2 mb-0.5" />}
                            {line}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Recommended Actions */}
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">AI Recommended Actions</h3>
                    <div className="space-y-2">
                      {selectedCall.aiActions.map((action: string, index: number) => (
                        <div key={index} className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-slate-700">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Outcome */}
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">Outcome</h3>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-slate-700">{selectedCall.outcome}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-none shadow-lg">
                <CardContent className="flex items-center justify-center h-[600px]">
                  <div className="text-center text-slate-400">
                    <Phone className="w-16 h-16 mx-auto mb-4" />
                    <p>Select a call to view details</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
