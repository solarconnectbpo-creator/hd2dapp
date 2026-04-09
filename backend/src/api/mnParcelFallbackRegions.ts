/**
 * Minnesota public parcel MapServer layers for point-in-parcel fallback (Worker).
 * Met Council covers the 7-county metro; Dakota County adds a second host for the south/east ring.
 * Greater Minnesota: add counties via ARCGIS_EXTRA_PARCEL_FALLBACKS_JSON or extend this list.
 */

import type { ParcelFallbackRegion } from "./moIlParcelFallbackRegions";

export const MN_PARCEL_FALLBACK_REGIONS: readonly ParcelFallbackRegion[] = [
  {
    id: "metc_mn_metro",
    /** Twin Cities regional parcels — OWNER_NAME, TAX_NAME, mailing fields. */
    layerUrl: "https://arcgis.metc.state.mn.us/arcgis/rest/services/BaseLayer/Parcels/MapServer/0",
    west: -94.05,
    south: 44.38,
    east: -92.0,
    north: 45.72,
  },
  {
    id: "dakota_mn",
    /** Dakota County — owner in FULLNAME. */
    layerUrl: "https://gis2.co.dakota.mn.us/arcgis/rest/services/DC_OL_DCPI/MapServer/4",
    west: -93.65,
    south: 44.38,
    east: -92.55,
    north: 45.02,
  },
];
