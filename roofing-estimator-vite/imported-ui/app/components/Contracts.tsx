import { useState } from 'react';
import { useRoofing } from '../context/RoofingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { Plus, FileText, Download } from 'lucide-react';
import { Badge } from './ui/badge';

export function Contracts() {
  const { contracts, estimates, addContract } = useRoofing();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [startDate, setStartDate] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [depositPercentage, setDepositPercentage] = useState('30');
  const [terms, setTerms] = useState(
    'Payment Terms: 30% deposit due upon signing, remaining balance due upon completion.\n\n' +
    'Warranty: All work is guaranteed for 12 months from completion date.\n\n' +
    'Weather: Work schedule may be adjusted due to weather conditions.\n\n' +
    'Permits: Contractor will obtain all necessary permits.'
  );

  const selectedEstimateData = estimates.find(e => e.id === selectedEstimate);
  const depositAmount = selectedEstimateData 
    ? selectedEstimateData.total * (parseFloat(depositPercentage) / 100)
    : 0;

  const handleCreateContract = () => {
    if (!selectedEstimate || !clientName || !clientAddress || !startDate || !completionDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    const estimate = estimates.find(e => e.id === selectedEstimate);
    if (!estimate) {
      toast.error('Selected estimate not found');
      return;
    }

    const contract = {
      id: Date.now().toString(),
      estimateId: selectedEstimate,
      projectName: estimate.projectName,
      clientName,
      clientAddress,
      clientPhone,
      clientEmail,
      date: new Date().toLocaleDateString(),
      startDate,
      completionDate,
      terms,
      totalAmount: estimate.total,
      depositAmount,
      status: 'draft' as const,
    };

    addContract(contract);
    toast.success('Contract created successfully!');
    setIsDialogOpen(false);
    
    // Reset form
    setSelectedEstimate('');
    setClientName('');
    setClientAddress('');
    setClientPhone('');
    setClientEmail('');
    setStartDate('');
    setCompletionDate('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'sent': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'signed': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2 text-gray-900">Contracts</h1>
          <p className="text-gray-600">Generate and manage project contracts</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Contract
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Contract</DialogTitle>
              <DialogDescription>
                Generate a contract from an existing estimate
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="estimate">Select Estimate *</Label>
                <Select value={selectedEstimate} onValueChange={setSelectedEstimate}>
                  <SelectTrigger id="estimate">
                    <SelectValue placeholder="Choose an estimate..." />
                  </SelectTrigger>
                  <SelectContent>
                    {estimates.map((estimate) => (
                      <SelectItem key={estimate.id} value={estimate.id}>
                        {estimate.projectName} - ${estimate.total.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="clientPhone">Phone</Label>
                  <Input
                    id="clientPhone"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="clientAddress">Client Address *</Label>
                <Input
                  id="clientAddress"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="123 Main St, City, State 12345"
                />
              </div>

              <div>
                <Label htmlFor="clientEmail">Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="completionDate">Completion Date *</Label>
                  <Input
                    id="completionDate"
                    type="date"
                    value={completionDate}
                    onChange={(e) => setCompletionDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="deposit">Deposit Percentage (%)</Label>
                <Input
                  id="deposit"
                  type="number"
                  step="1"
                  value={depositPercentage}
                  onChange={(e) => setDepositPercentage(e.target.value)}
                />
                {selectedEstimateData && (
                  <p className="text-sm text-gray-600 mt-1">
                    Deposit Amount: ${depositAmount.toFixed(2)}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="terms">Contract Terms</Label>
                <Textarea
                  id="terms"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateContract}>
                Create Contract
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {contracts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl mb-2 text-gray-900">No contracts yet</h3>
            <p className="text-gray-600 mb-6">Create your first contract from an estimate</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Contract
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {contracts.map((contract) => (
            <Card key={contract.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{contract.projectName}</CardTitle>
                    <CardDescription className="mt-1">
                      Client: {contract.clientName}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className={getStatusColor(contract.status)}>
                    {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Contact Information</p>
                    <p className="text-sm text-gray-900">{contract.clientAddress}</p>
                    {contract.clientPhone && (
                      <p className="text-sm text-gray-600">{contract.clientPhone}</p>
                    )}
                    {contract.clientEmail && (
                      <p className="text-sm text-gray-600">{contract.clientEmail}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Project Timeline</p>
                    <p className="text-sm text-gray-900">Start: {contract.startDate}</p>
                    <p className="text-sm text-gray-900">Completion: {contract.completionDate}</p>
                    <p className="text-sm text-gray-600 mt-1">Created: {contract.date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Financial Details</p>
                    <p className="text-sm text-gray-900">
                      Total: <span className="text-lg">${contract.totalAmount.toLocaleString()}</span>
                    </p>
                    <p className="text-sm text-gray-900">
                      Deposit: ${contract.depositAmount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-900">
                      Balance: ${(contract.totalAmount - contract.depositAmount).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
