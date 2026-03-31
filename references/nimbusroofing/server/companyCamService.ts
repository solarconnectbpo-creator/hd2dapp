/**
 * CompanyCam API Integration Service
 * 
 * Connects to CompanyCam API to sync photos, projects, and enable
 * SATCALC roof analysis with automatic supplement generation.
 */

const COMPANYCAM_API_BASE = 'https://api.companycam.com/v2';

interface CompanyCamProject {
  id: string;
  name: string;
  address?: {
    street_address_1?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  };
  created_at: string;
  updated_at: string;
}

interface CompanyCamPhoto {
  id: string;
  project_id: string;
  uri: string;
  thumbnail_uri: string;
  created_at: string;
  tags?: string[];
  coordinates?: {
    lat: number;
    lon: number;
  };
}

/**
 * Make authenticated request to CompanyCam API
 */
async function companyCamRequest(
  endpoint: string,
  apiToken: string,
  options: RequestInit = {}
): Promise<any> {
  const response = await fetch(`${COMPANYCAM_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`CompanyCam API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get all projects from CompanyCam
 */
export async function getCompanyCamProjects(apiToken: string): Promise<CompanyCamProject[]> {
  const data = await companyCamRequest('/projects', apiToken);
  return data.data || [];
}

/**
 * Get all photos from a specific project
 */
export async function getProjectPhotos(
  apiToken: string,
  projectId: string
): Promise<CompanyCamPhoto[]> {
  const data = await companyCamRequest(`/projects/${projectId}/photos`, apiToken);
  return data.data || [];
}

/**
 * Get all photos across all projects (paginated)
 */
export async function getAllPhotos(
  apiToken: string,
  limit: number = 100
): Promise<CompanyCamPhoto[]> {
  const data = await companyCamRequest(`/photos?per_page=${limit}`, apiToken);
  return data.data || [];
}

/**
 * Create a new project in CompanyCam
 */
export async function createCompanyCamProject(
  apiToken: string,
  projectData: {
    name: string;
    address?: {
      street_address_1?: string;
      city?: string;
      state?: string;
      postal_code?: string;
    };
  }
): Promise<CompanyCamProject> {
  const data = await companyCamRequest('/projects', apiToken, {
    method: 'POST',
    body: JSON.stringify(projectData),
  });
  return data.data;
}

/**
 * Upload a photo to CompanyCam project
 */
export async function uploadPhotoToProject(
  apiToken: string,
  projectId: string,
  photoData: {
    uri: string; // URL or base64
    tags?: string[];
  }
): Promise<CompanyCamPhoto> {
  const data = await companyCamRequest(`/projects/${projectId}/photos`, apiToken, {
    method: 'POST',
    body: JSON.stringify(photoData),
  });
  return data.data;
}

/**
 * Sync CompanyCam projects to Nimbus database
 * Returns count of projects synced
 */
export async function syncCompanyCamProjects(
  apiToken: string
): Promise<{ synced: number; projects: CompanyCamProject[] }> {
  const projects = await getCompanyCamProjects(apiToken);
  
  // TODO: Store projects in Nimbus database
  // For now, just return the data
  
  return {
    synced: projects.length,
    projects,
  };
}

/**
 * Sync all photos from CompanyCam
 * Returns count of photos synced
 */
export async function syncCompanyCamPhotos(
  apiToken: string,
  limit: number = 500
): Promise<{ synced: number; photos: CompanyCamPhoto[] }> {
  const photos = await getAllPhotos(apiToken, limit);
  
  // TODO: Store photos in Nimbus database with project links
  
  return {
    synced: photos.length,
    photos,
  };
}
