/**
 * Measurement Types - Foundation Layer
 * No dependencies - safe to load first
 */

export interface RoofMeasurementData {
  roofArea: number;
  pitch: number;
  directions: number[];
  valleys: number;
  ridges: number;
  hips: number;
  rakes: number;
  eaves: number;
  flashings: string[];
  penetrations: Array<{
    type: string;
    count: number;
    area: number;
  }>;
  confidence: number;
  method: 'eagleview' | 'nearmap' | 'lidar' | 'photogrammetry';
}

export interface PrecisionBuildingData {
  address: string;
  coordinates: [number, number];
  height: number;
  squareFootage: number;
  parcelNumber: string;
  yearBuilt?: number;
  roofData: RoofMeasurementData;
  imagery: {
    url: string;
    resolution: number;
    captureDate: string;
    cloudCover: number;
  };
  metadata: {
    provider: string;
    accuracy: number;
    processingMethod: string;
    timestamp: string;
  };
}

export interface MeasurementRequest {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  priority: 'accuracy' | 'speed' | 'cost';
}

export interface MeasurementResult {
  success: boolean;
  data: PrecisionBuildingData | null;
  provider: 'eagleview' | 'nearmap' | 'hybrid' | 'fallback';
  confidence: number;
  errorMessage?: string;
  retryCount?: number;
  processingTime: number;
}
