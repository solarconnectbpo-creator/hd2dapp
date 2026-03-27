import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useRoofing } from '../context/RoofingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

interface MaterialItem {
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

interface LaborItem {
  description: string;
  hours: number;
  hourlyRate: number;
  totalCost: number;
}

export function NewEstimate() {
  const navigate = useNavigate();
  const { addEstimate, measurements } = useRoofing();
  
  const [projectName, setProjectName] = useState('');
  const [selectedMeasurement, setSelectedMeasurement] = useState('');
  const [materials, setMaterials] = useState<MaterialItem[]>([
    { name: 'Asphalt Shingles', quantity: 0, unit: 'square', unitCost: 150, totalCost: 0 },
  ]);
  const [labor, setLabor] = useState<LaborItem[]>([
    { description: 'Roof Installation', hours: 0, hourlyRate: 75, totalCost: 0 },
  ]);
  const [taxRate, setTaxRate] = useState('7');

  const updateMaterialItem = (index: number, field: keyof MaterialItem, value: any) => {
    const newMaterials = [...materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitCost') {
      newMaterials[index].totalCost = newMaterials[index].quantity * newMaterials[index].unitCost;
    }
    
    setMaterials(newMaterials);
  };

  const updateLaborItem = (index: number, field: keyof LaborItem, value: any) => {
    const newLabor = [...labor];
    newLabor[index] = { ...newLabor[index], [field]: value };
    
    if (field === 'hours' || field === 'hourlyRate') {
      newLabor[index].totalCost = newLabor[index].hours * newLabor[index].hourlyRate;
    }
    
    setLabor(newLabor);
  };

  const addMaterialRow = () => {
    setMaterials([...materials, { name: '', quantity: 0, unit: 'each', unitCost: 0, totalCost: 0 }]);
  };

  const addLaborRow = () => {
    setLabor([...labor, { description: '', hours: 0, hourlyRate: 75, totalCost: 0 }]);
  };

  const removeMaterialRow = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const removeLaborRow = (index: number) => {
    setLabor(labor.filter((_, i) => i !== index));
  };

  const subtotal = 
    materials.reduce((sum, m) => sum + m.totalCost, 0) +
    labor.reduce((sum, l) => sum + l.totalCost, 0);
  const tax = subtotal * (parseFloat(taxRate) / 100);
  const total = subtotal + tax;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectName) {
      toast.error('Please enter a project name');
      return;
    }

    const estimate = {
      id: Date.now().toString(),
      measurementId: selectedMeasurement,
      projectName,
      date: new Date().toLocaleDateString(),
      materials: materials.filter(m => m.name && m.quantity > 0),
      labor: labor.filter(l => l.description && l.hours > 0),
      subtotal,
      tax,
      total,
    };

    addEstimate(estimate);
    toast.success('Estimate created successfully!');
    navigate('/estimates');
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl mb-2 text-gray-900">New Estimate</h1>
          <p className="text-gray-600">Create a detailed cost estimate for your project</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Project Info */}
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="projectName">Project Name *</Label>
                    <Input
                      id="projectName"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="e.g., 123 Main St Roof Replacement"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="measurement">Link to Measurement (Optional)</Label>
                    <Select value={selectedMeasurement} onValueChange={setSelectedMeasurement}>
                      <SelectTrigger id="measurement">
                        <SelectValue placeholder="Select a measurement..." />
                      </SelectTrigger>
                      <SelectContent>
                        {measurements.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.projectName} - {m.adjustedArea.toFixed(0)} sq ft
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Materials */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Materials</CardTitle>
                    <CardDescription>List all materials needed for the project</CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addMaterialRow}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Material
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {materials.map((material, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <Label htmlFor={`mat-name-${index}`}>Material</Label>
                        <Input
                          id={`mat-name-${index}`}
                          value={material.name}
                          onChange={(e) => updateMaterialItem(index, 'name', e.target.value)}
                          placeholder="e.g., Asphalt Shingles"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor={`mat-qty-${index}`}>Quantity</Label>
                        <Input
                          id={`mat-qty-${index}`}
                          type="number"
                          step="0.01"
                          value={material.quantity || ''}
                          onChange={(e) => updateMaterialItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor={`mat-unit-${index}`}>Unit</Label>
                        <Input
                          id={`mat-unit-${index}`}
                          value={material.unit}
                          onChange={(e) => updateMaterialItem(index, 'unit', e.target.value)}
                          placeholder="e.g., square"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor={`mat-cost-${index}`}>Unit Cost ($)</Label>
                        <Input
                          id={`mat-cost-${index}`}
                          type="number"
                          step="0.01"
                          value={material.unitCost || ''}
                          onChange={(e) => updateMaterialItem(index, 'unitCost', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-1">
                        <Label>Total</Label>
                        <p className="text-sm text-gray-900 pt-2">${material.totalCost.toFixed(2)}</p>
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMaterialRow(index)}
                          disabled={materials.length === 1}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Labor */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Labor</CardTitle>
                    <CardDescription>List all labor costs for the project</CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addLaborRow}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Labor
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {labor.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Label htmlFor={`lab-desc-${index}`}>Description</Label>
                        <Input
                          id={`lab-desc-${index}`}
                          value={item.description}
                          onChange={(e) => updateLaborItem(index, 'description', e.target.value)}
                          placeholder="e.g., Roof Installation"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor={`lab-hours-${index}`}>Hours</Label>
                        <Input
                          id={`lab-hours-${index}`}
                          type="number"
                          step="0.5"
                          value={item.hours || ''}
                          onChange={(e) => updateLaborItem(index, 'hours', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor={`lab-rate-${index}`}>Hourly Rate ($)</Label>
                        <Input
                          id={`lab-rate-${index}`}
                          type="number"
                          step="0.01"
                          value={item.hourlyRate || ''}
                          onChange={(e) => updateLaborItem(index, 'hourlyRate', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Total</Label>
                        <p className="text-sm text-gray-900 pt-2">${item.totalCost.toFixed(2)}</p>
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLaborRow(index)}
                          disabled={labor.length === 1}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Estimate Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Materials Subtotal</span>
                    <span className="text-gray-900">
                      ${materials.reduce((sum, m) => sum + m.totalCost, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Labor Subtotal</span>
                    <span className="text-gray-900">
                      ${labor.reduce((sum, l) => sum + l.totalCost, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Tax</span>
                      <Input
                        type="number"
                        step="0.1"
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                        className="w-20"
                      />
                      <span className="text-gray-600">%</span>
                    </div>
                    <span className="text-gray-900">${tax.toFixed(2)}</span>
                  </div>
                  <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-xl text-gray-900">Total</span>
                    <span className="text-2xl text-blue-600">${total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex gap-3">
            <Button type="submit" className="px-8">
              Save Estimate
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/estimates')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
