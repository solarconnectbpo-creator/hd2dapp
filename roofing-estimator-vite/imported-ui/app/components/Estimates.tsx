import { Link } from 'react-router';
import { useRoofing } from '../context/RoofingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Plus, DollarSign } from 'lucide-react';
import { Badge } from './ui/badge';

export function Estimates() {
  const { estimates } = useRoofing();

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2 text-gray-900">Estimates</h1>
          <p className="text-gray-600">Manage your project estimates</p>
        </div>
        <Link to="/estimates/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Estimate
          </Button>
        </Link>
      </div>

      {estimates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <DollarSign className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl mb-2 text-gray-900">No estimates yet</h3>
            <p className="text-gray-600 mb-6">Create your first estimate to get started</p>
            <Link to="/estimates/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create First Estimate
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {estimates.map((estimate) => (
            <Card key={estimate.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{estimate.projectName}</CardTitle>
                    <CardDescription className="mt-1">{estimate.date}</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Estimate
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Materials</p>
                    <p className="text-lg text-gray-900">
                      ${estimate.materials.reduce((sum, m) => sum + m.totalCost, 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Labor</p>
                    <p className="text-lg text-gray-900">
                      ${estimate.labor.reduce((sum, l) => sum + l.totalCost, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl text-blue-600">${estimate.total.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
