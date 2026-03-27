import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useRoofing } from '../context/RoofingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { Calculator } from 'lucide-react';

export function NewMeasurement() {
  const navigate = useNavigate();
  const { addMeasurement } = useRoofing();
  
  const [projectName, setProjectName] = useState('');
  const [roofType, setRoofType] = useState<'gable' | 'hip' | 'flat' | 'mansard'>('gable');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [pitch, setPitch] = useState('');
  const [wastePercentage, setWastePercentage] = useState('10');

  const calculateArea = () => {
    const lengthNum = parseFloat(length);
    const widthNum = parseFloat(width);
    const pitchNum = parseFloat(pitch);
    
    if (!lengthNum || !widthNum || !pitchNum) return 0;
    
    // Base area
    const baseArea = lengthNum * widthNum;
    
    // Calculate pitch multiplier (pitch is in inches per 12 inches)
    const pitchMultiplier = Math.sqrt(1 + Math.pow(pitchNum / 12, 2));
    
    // Apply pitch to get total roof area
    const totalArea = baseArea * pitchMultiplier;
    
    return totalArea;
  };

  const totalArea = calculateArea();
  const adjustedArea = totalArea * (1 + parseFloat(wastePercentage || '0') / 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectName || !length || !width || !pitch) {
      toast.error('Please fill in all required fields');
      return;
    }

    const measurement = {
      id: Date.now().toString(),
      projectName,
      date: new Date().toLocaleDateString(),
      roofType,
      length: parseFloat(length),
      width: parseFloat(width),
      pitch: parseFloat(pitch),
      totalArea,
      wastePercentage: parseFloat(wastePercentage),
      adjustedArea,
    };

    addMeasurement(measurement);
    toast.success('Measurement saved successfully!');
    navigate('/projects');
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl mb-2 text-gray-900">New Roof Measurement</h1>
          <p className="text-gray-600">Calculate roof area with pitch adjustment</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Project Details</CardTitle>
                  <CardDescription>Enter roof measurements and specifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                    <Label htmlFor="roofType">Roof Type</Label>
                    <Select value={roofType} onValueChange={(value: any) => setRoofType(value)}>
                      <SelectTrigger id="roofType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gable">Gable</SelectItem>
                        <SelectItem value="hip">Hip</SelectItem>
                        <SelectItem value="flat">Flat</SelectItem>
                        <SelectItem value="mansard">Mansard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="length">Length (feet) *</Label>
                      <Input
                        id="length"
                        type="number"
                        step="0.1"
                        value={length}
                        onChange={(e) => setLength(e.target.value)}
                        placeholder="40"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="width">Width (feet) *</Label>
                      <Input
                        id="width"
                        type="number"
                        step="0.1"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        placeholder="30"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pitch">Roof Pitch (in/12) *</Label>
                      <Input
                        id="pitch"
                        type="number"
                        step="0.5"
                        value={pitch}
                        onChange={(e) => setPitch(e.target.value)}
                        placeholder="6"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Common: 4/12 (18°), 6/12 (27°), 8/12 (34°)
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="waste">Waste Factor (%)</Label>
                      <Input
                        id="waste"
                        type="number"
                        step="1"
                        value={wastePercentage}
                        onChange={(e) => setWastePercentage(e.target.value)}
                        placeholder="10"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Typical: 10-15% for shingles
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Calculation Results */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Calculations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Base Area</p>
                    <p className="text-2xl text-gray-900">
                      {(parseFloat(length || '0') * parseFloat(width || '0')).toFixed(0)} sq ft
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Pitch Adjusted Area</p>
                    <p className="text-2xl text-gray-900">
                      {totalArea.toFixed(0)} sq ft
                    </p>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Total Area (with waste)</p>
                    <p className="text-3xl text-blue-600">
                      {adjustedArea.toFixed(0)} sq ft
                    </p>
                  </div>

                  <div className="pt-4">
                    <p className="text-sm text-gray-600 mb-1">Roofing Squares</p>
                    <p className="text-xl text-gray-900">
                      {(adjustedArea / 100).toFixed(2)} squares
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      (1 square = 100 sq ft)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button type="submit" className="px-8">
              Save Measurement
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/projects')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
