# CompanyCam API Integration Notes

## Authentication
- Uses Bearer Token in Authorization header
- Format: `Authorization: Bearer [API_TOKEN]`
- Base URL: `https://api.companycam.com/v2/`

## Two Ways to Get Token:
1. **Access Token** - Generate directly through CompanyCam app (for personal use)
2. **OAuth 2.0** - For public integrations (required for partners)

## Key Endpoints (from docs):
- `GET /v2/projects` - List all projects
- `POST /v2/projects` - Create new project
- `GET /v2/photos` - List photos
- `POST /v2/photos` - Upload photos
- Supports webhooks for real-time updates

## Integration Plan for Nimbus:
1. Request Access Token from user
2. Sync existing projects and photos
3. Auto-create projects from leads
4. Upload roof inspection photos
5. Link photos to customer projects
6. Use SATCALC to analyze photos and generate supplements

## Required from User:
- CompanyCam Access Token (generated from their account)
- CompanyCam account must be on Pro, Premium, or Elite plan
