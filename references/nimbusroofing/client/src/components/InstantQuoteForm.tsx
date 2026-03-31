import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calculator, Home, Loader2, TrendingUp } from 'lucide-react';
import { Streamdown } from 'streamdown';

export default function InstantQuoteForm() {
  const [roofSqft, setRoofSqft] = useState('2000');
  const [pitch, setPitch] = useState('6/12');
  const [stories, setStories] = useState('1');
  const [shingleType, setShingleType] = useState<'standard' | 'architectural' | 'impact_resistant'>('architectural');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);
  const [quoteResult, setQuoteResult] = useState<any>(null);

  const getQuoteMutation = trpc.quote.getQuickEstimate.useMutation({
    onSuccess: (data) => {
      setQuoteResult(data);
      toast.success('Quote Generated!', {
        description: `Estimated Total: $${data.estimate.summary.grandTotal.toLocaleString()}`,
      });
    },
    onError: (error) => {
      toast.error('Failed to generate quote', {
        description: error.message,
      });
    },
  });

  const handleGetQuote = () => {
    const sqft = parseInt(roofSqft);
    if (isNaN(sqft) || sqft < 500 || sqft > 10000) {
      toast.error('Invalid roof size', {
        description: 'Please enter a roof size between 500 and 10,000 sq ft',
      });
      return;
    }

    getQuoteMutation.mutate({
      roofSqft: sqft,
      pitch,
      stories: parseInt(stories),
      shingleType,
      customerName: customerName || undefined,
      customerEmail: customerEmail || undefined,
      customerPhone: customerPhone || undefined,
      address: address || undefined,
    });
  };

  const handleRequestDetailed = () => {
    if (!customerEmail && !customerPhone) {
      toast.error('Contact information required', {
        description: 'Please provide your email or phone number to receive a detailed quote',
      });
      return;
    }
    setShowContactForm(false);
    toast.success('Request submitted!', {
      description: 'Our team will contact you within 24 hours with a detailed estimate',
    });
  };

  if (quoteResult) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Your Instant Quote
          </CardTitle>
          <CardDescription>Quote ID: {quoteResult.quoteId}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* AI Summary */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <Streamdown>{quoteResult.aiSummary}</Streamdown>
          </div>

          {/* Price Breakdown */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Estimated Total</span>
              <span className="text-3xl text-green-600">
                ${quoteResult.estimate.summary.grandTotal.toLocaleString()}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <div className="text-sm text-muted-foreground">Roof Size</div>
                <div className="font-medium">{quoteResult.estimate.summary.totalSlopedSquares} squares</div>
                <div className="text-xs text-muted-foreground">
                  ({quoteResult.estimate.summary.totalSlopedSqft} sq ft)
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Shingle Type</div>
                <div className="font-medium">
                  {shingleType === 'impact_resistant' ? 'Class 4 IR' :
                   shingleType === 'architectural' ? 'Architectural' : 'Standard'}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Labor</div>
                <div className="font-medium">${quoteResult.estimate.summary.laborSubtotal.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Materials</div>
                <div className="font-medium">${quoteResult.estimate.summary.materialSubtotal.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Tax (8.25%)</div>
                <div className="font-medium">${quoteResult.estimate.summary.tax.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">O&P (20%)</div>
                <div className="font-medium">${quoteResult.estimate.summary.op.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <h3 className="font-semibold">Included Services</h3>
            <div className="space-y-1 text-sm">
              {quoteResult.estimate.lineItems.slice(0, 5).map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between">
                  <span className="text-muted-foreground">{item.desc}</span>
                  <span className="font-medium">${item.total.toLocaleString()}</span>
                </div>
              ))}
              {quoteResult.estimate.lineItems.length > 5 && (
                <div className="text-xs text-muted-foreground italic">
                  + {quoteResult.estimate.lineItems.length - 5} more items...
                </div>
              )}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1"
              onClick={() => setShowContactForm(true)}
            >
              Request Detailed Estimate
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setQuoteResult(null);
                setShowContactForm(false);
              }}
            >
              Start Over
            </Button>
          </div>

          {/* Contact Form */}
          {showContactForm && (
            <div className="space-y-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
              <h3 className="font-semibold">Get Your Detailed Estimate</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="(214) 555-0123"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="address">Property Address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St, McKinney, TX 75070"
                  />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={handleRequestDetailed}
              >
                Submit Request
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Get an Instant Quote
        </CardTitle>
        <CardDescription>
          Enter your roof details for an AI-powered estimate in seconds
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Roof Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="sqft">Roof Size (sq ft) *</Label>
            <Input
              id="sqft"
              type="number"
              value={roofSqft}
              onChange={(e) => setRoofSqft(e.target.value)}
              placeholder="2000"
              min="500"
              max="10000"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Typical home: 1,500-3,000 sq ft
            </p>
          </div>

          <div>
            <Label htmlFor="pitch">Roof Pitch</Label>
            <Select value={pitch} onValueChange={setPitch}>
              <SelectTrigger id="pitch">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4/12">4/12 (Low Slope)</SelectItem>
                <SelectItem value="6/12">6/12 (Standard)</SelectItem>
                <SelectItem value="8/12">8/12 (Steep)</SelectItem>
                <SelectItem value="10/12">10/12 (Very Steep)</SelectItem>
                <SelectItem value="12/12">12/12 (45°)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="stories">Stories</Label>
            <Select value={stories} onValueChange={setStories}>
              <SelectTrigger id="stories">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Story</SelectItem>
                <SelectItem value="2">2 Stories</SelectItem>
                <SelectItem value="3">3 Stories</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <Label htmlFor="shingleType">Shingle Type</Label>
            <Select value={shingleType} onValueChange={(v: any) => setShingleType(v)}>
              <SelectTrigger id="shingleType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard 3-Tab ($$$)</SelectItem>
                <SelectItem value="architectural">Architectural ($$$$)</SelectItem>
                <SelectItem value="impact_resistant">Class 4 Impact-Resistant ($$$$$)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Class 4 IR shingles qualify for insurance discounts in Texas
            </p>
          </div>
        </div>

        {/* Optional Contact Info */}
        <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Home className="h-4 w-4" />
            <span>Optional: Get a detailed estimate sent to you</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="name-opt">Name</Label>
              <Input
                id="name-opt"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <div>
              <Label htmlFor="email-opt">Email</Label>
              <Input
                id="email-opt"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div>
              <Label htmlFor="phone-opt">Phone</Label>
              <Input
                id="phone-opt"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="(214) 555-0123"
              />
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleGetQuote}
          disabled={getQuoteMutation.isPending}
        >
          {getQuoteMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Quote...
            </>
          ) : (
            <>
              <Calculator className="mr-2 h-4 w-4" />
              Get Instant Quote
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          This is an estimated quote. Final pricing may vary based on site inspection and specific project requirements.
        </p>
      </CardContent>
    </Card>
  );
}
