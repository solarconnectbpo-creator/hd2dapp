import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  Image,
  Platform,
  StyleSheet,
  Switch,
  TextInput,
  View,
  ScrollView,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { AppColors, BorderRadius, Spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import type {
  DamageRoofReport,
  DamageType,
  RecommendedAction,
  PropertySelection,
  Severity,
  RoofMeasurements,
  RoofReportImage,
  BuildingCodeInfo,
  RoofDamageEstimate,
} from "@/src/roofReports/roofReportTypes";
import type { ReportsStackParamList } from "@/navigation/ReportsStackNavigator";
import { upsertRoofReport } from "@/src/roofReports/roofReportStorage";
import type { RoofTraceMetrics } from "@/src/roofReports/RoofTraceMap";
import RoofTraceMap from "@/src/roofReports/RoofTraceMap";
import { computeRoofDamageEstimate } from "@/src/roofReports/roofEstimate";
import { reverseGeocodeNominatimDetailed } from "@/src/roofReports/reverseGeocode";
import { filterIrcChecksForRoofType, getBuildingCodeInfoForLocation } from "@/src/roofReports/buildingCodeTemplates";
import { extractCompanyCamDataFromPdfFile } from "@/src/roofReports/parseCompanyCamPdf";
import { loadRoofLeads } from "@/src/roofReports/roofLeadsStorage";
import { findBestMatchingLead, inferRoofTypeIfMissing } from "@/src/roofReports/propertyLeadMatching";
import { getCompanyLogoUrlByName } from "@/src/roofReports/companyBranding";
import {
  EAVEMEASURE_AERIAL_SERVICES_URL,
  EAVEMEASURE_GITHUB_README_URL,
  EAVEMEASURE_PROVIDER_LABEL,
  mergeEaveMeasureFields,
  openEaveMeasureAerialServices,
  roofMeasurementsHaveContent,
} from "@/src/roofReports/eavemeasureIntegration";
import { buildRoofDiagramSvgDataUrl } from "@/src/roofReports/roofDiagram";
import { buildRoofScopeOfWork, classifyRoofSystem } from "@/src/roofReports/roofSystemScope";
import { buildRoofLengthsDiagramSvgDataUrl, buildRoofPitchDiagramSvgDataUrl } from "@/src/roofReports/roofExtraDiagrams";
import { classifyRoofAndMaterials, classifyRoofFormFromTrace, computeAiDamageRisk, parseRoofPitchRise } from "@/src/roofReports/roofLogicEngine";
import { calculateEagleViewLikeEstimate } from "@/src/roofReports/eagleviewEstimator";
import { QUICK_PRICE_NON_ROOF } from "@/src/roofReports/quickPriceReference";

type Props = NativeStackScreenProps<ReportsStackParamList, "CreateDamageRoofReport">;

const damageTypeOptions: DamageType[] = ["Hail", "Wind", "Missing Shingles", "Leaks", "Flashing", "Structural"];
const recommendedActionOptions: RecommendedAction[] = [
  "Replace",
  "Repair",
  "Insurance Claim Help",
  "Further Inspection",
];

type RoofMaterialChoice = "shingle" | "tile" | "slate" | "tpo";
const roofMaterialChoices: RoofMaterialChoice[] = ["shingle", "tile", "slate", "tpo"];
const roofMaterialLabels: Record<RoofMaterialChoice, string> = {
  shingle: "Asphalt Shingle (Standard)",
  tile: "Clay / Concrete Tile",
  slate: "Natural Slate",
  tpo: "TPO / Flat Membrane",
};

// Default IRC/building assumptions for roof-aware code checklist filtering.
// (These can be upgraded to UI-driven fields later.)
const DEFAULT_IRC_EDITION: "2024" = "2024";
const DEFAULT_OCCUPANCY: "otherOcc" = "otherOcc";
const DEFAULT_LOW_SLOPE_RISE_CUTOFF = 2; // <= 2:12 (rise <= 2.0)

function inferRoofMaterialChoice(rawRoofType?: string): RoofMaterialChoice {
  const t = (rawRoofType ?? "").toLowerCase();
  if (/\bslate\b/.test(t)) return "slate";
  if (/\b(tile|clay|concrete tile)\b/.test(t)) return "tile";
  if (/\btpo\b/.test(t)) return "tpo";
  if (/\bshingle\b/.test(t) || /\basphalt\b/.test(t) || /\blaminate\b/.test(t) || /\bcomposition\b/.test(t)) return "shingle";
  return "shingle";
}

function parseRiseRunPitchValue(pitch?: string): number | undefined {
  // Your app stores pitch as "rise/run" (e.g. "6/12" or "4:12").
  // The logic engine expects numeric "rise".
  return parseRoofPitchRise(pitch);
}

function getTodayYmd() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function createReportId() {
  return `r_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const PROPERTY_RECORD_TAG = "[Property record]";

function buildPropertyMeasurementNote(p: PropertySelection): string {
  const roof =
    typeof p.roofSqFt === "number" && Number.isFinite(p.roofSqFt) && p.roofSqFt > 0
      ? `${Math.round(p.roofSqFt)} sq ft (from lead/import)`
      : "— (trace roof or import PDF for area)";
  const rtype = p.roofType?.trim() ? p.roofType.trim() : "—";
  const contactBits = [p.homeownerName?.trim() || null, p.email?.trim() || null, p.phone?.trim() || null]
    .filter(Boolean)
    .join(" · ");
  const contactLine = contactBits ? `Contact: ${contactBits}` : "Contact: —";
  return `${PROPERTY_RECORD_TAG}
Address: ${p.address}
Coordinates: ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}
${contactLine}
Roof area (lead/CSV): ${roof}
Roof type (lead/CSV): ${rtype}`;
}

function mergePropertyRecordIntoNotes(prevNotes: string | undefined, block: string): string {
  const raw = (prevNotes ?? "").trim();
  const start = raw.indexOf(PROPERTY_RECORD_TAG);
  if (start === -1) return raw ? `${raw}\n\n${block}` : block;
  const afterToken = raw.slice(start + PROPERTY_RECORD_TAG.length);
  const nextBlock = /\n\n(?=\[)/.exec(afterToken);
  const end = nextBlock ? start + PROPERTY_RECORD_TAG.length + nextBlock.index : raw.length;
  const before = raw.slice(0, start).trimEnd();
  const after = raw.slice(end).trim();
  return [before, block, after].filter(Boolean).join("\n\n");
}

function getAutoPropertyImageUrl(lat: number, lng: number): string | undefined {
  const token =
    typeof process !== "undefined" && (process as any)?.env
      ? ((process as any).env.EXPO_PUBLIC_MAPBOX_TOKEN as string | undefined)
      : undefined;
  if (!token) return undefined;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  const style = "mapbox/satellite-streets-v11";
  const zoom = 20;
  const bearing = 0;
  const pitch = 0;
  const width = 1200;
  const height = 700;
  return `https://api.mapbox.com/styles/v1/${style}/static/${lng},${lat},${zoom},${bearing},${pitch}/${width}x${height}?access_token=${token}`;
}

export default function CreateDamageRoofReportScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { property, mode, autoBuildReport } = route.params;
  const reportMode: "full" | "estimate" = mode === "estimate" ? "estimate" : "full";
  const shouldAutoBuildReport = autoBuildReport === true;
  const [autoBuildEnabled, setAutoBuildEnabled] = useState(shouldAutoBuildReport);

  const autoReportNavigatedRef = useRef(false);
  const buildReportPayloadRef = useRef<() => DamageRoofReport | null>(() => null);

  const [companyName, setCompanyName] = useState("Cox Roofing");
  const [reportLogoDataUrl, setReportLogoDataUrl] = useState<string>("");
  const [inspectorName, setInspectorName] = useState<string>(user?.name ?? "");

  const [inspectionDate, setInspectionDate] = useState(getTodayYmd());
  const [homeownerName, setHomeownerName] = useState(property.homeownerName ?? "");
  const [homeownerEmail, setHomeownerEmail] = useState(property.email ?? "");
  const [homeownerPhone, setHomeownerPhone] = useState(property.phone ?? "");
  const [roofType, setRoofType] = useState(property.roofType ?? "");
  const [roofAgeYears, setRoofAgeYears] = useState<string>("");
  const selectedRoofMaterial = useMemo(() => inferRoofMaterialChoice(roofType), [roofType]);
  const [damageTypes, setDamageTypes] = useState<DamageType[]>(["Hail"]);
  const [severity, setSeverity] = useState<Severity>(3);
  const [recommendedAction, setRecommendedAction] = useState<RecommendedAction>("Insurance Claim Help");
  const [notes, setNotes] = useState("");

  const [measurements, setMeasurements] = useState<RoofMeasurements>({});
  const [buildingCode, setBuildingCode] = useState<BuildingCodeInfo | undefined>(undefined);
  const [roofTraceGeoJson, setRoofTraceGeoJson] = useState<any>(undefined);
  const [images, setImages] = useState<RoofReportImage[]>([]);

  // Roof-aware IRC filtering (updates the checklist shown in the report preview/export).
  const roofFormType = useMemo(
    () => classifyRoofFormFromTrace({ roofTraceGeoJson, roofPitch: measurements.roofPitch }) ?? undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roofTraceGeoJson, measurements.roofPitch],
  );
  const pitchRise = useMemo(() => parseRiseRunPitchValue(measurements.roofPitch), [measurements.roofPitch]);
  const effectiveBuildingCode = useMemo(
    () =>
      filterIrcChecksForRoofType(buildingCode, {
        roofMaterialType: selectedRoofMaterial,
        roofFormType,
        roofPitchRise: pitchRise,
        roofStories: measurements.roofStories,
        roofSystemCategory: undefined,
        ircEdition: DEFAULT_IRC_EDITION,
        occupancy: DEFAULT_OCCUPANCY,
        lowSlopeRiseCutoff: DEFAULT_LOW_SLOPE_RISE_CUTOFF,
        damageTypes,
        recommendedAction,
      }),
    [buildingCode, roofFormType, pitchRise, measurements.roofStories, selectedRoofMaterial, damageTypes, recommendedAction],
  );

  // Estimate template state (estimate-only mode uses this instead of roof tracing).
  const [roofAreaSqFtManual, setRoofAreaSqFtManual] = useState<string>("");
  const [estimateNotes, setEstimateNotes] = useState<string>("");
  const [estimate, setEstimate] = useState<RoofDamageEstimate | null>(null);

  // Optional non-roof hail items (Fencing & HVAC cheat sheet).
  // These add to the low/high estimate totals.
  const [hvacUnits, setHvacUnits] = useState<number>(0); // number of AC units replaced
  const [finCombUnits, setFinCombUnits] = useState<number>(0); // condenser fin comb/straighten
  const [fenceCleanSqFt, setFenceCleanSqFt] = useState<number>(0);
  const [fenceStainSqFt, setFenceStainSqFt] = useState<number>(0);
  const [windowWrapSmallQty, setWindowWrapSmallQty] = useState<number>(0);
  const [windowWrapStandardQty, setWindowWrapStandardQty] = useState<number>(0);
  const [houseWrapSqFt, setHouseWrapSqFt] = useState<number>(0);
  const [fanfoldSqFt, setFanfoldSqFt] = useState<number>(0);

  const [companyCamImporting, setCompanyCamImporting] = useState(false);
  const [companyCamImportProgress, setCompanyCamImportProgress] = useState<string>("");
  const [contactAutofillStatus, setContactAutofillStatus] = useState<string>("");

  /** Draft sq ft from EaveMeasure (applied explicitly so it doesn’t fight map trace mid-edit). */
  const [eaveMeasureSqFtDraft, setEaveMeasureSqFtDraft] = useState("");

  const [autoTraceFromFootprintEnabled, setAutoTraceFromFootprintEnabled] = useState(true);

  const unitHvacReplace = QUICK_PRICE_NON_ROOF.hvacReplaceWithTax;
  const unitFinComb = QUICK_PRICE_NON_ROOF.finCombReplaceWithTax;
  const unitFenceClean = QUICK_PRICE_NON_ROOF.fenceCleanReplaceWithTax;
  const unitFenceStain = QUICK_PRICE_NON_ROOF.fenceStainReplaceWithTax;
  const unitWindowWrapSmall = QUICK_PRICE_NON_ROOF.windowWrapSmallReplaceWithTax;
  const unitWindowWrapStandard = QUICK_PRICE_NON_ROOF.windowWrapStandardReplaceWithTax;
  const unitHouseWrap = QUICK_PRICE_NON_ROOF.houseWrapReplaceWithTax;
  const unitFanfold = QUICK_PRICE_NON_ROOF.fanfoldReplaceWithTax;

  const nonRoofLowUsd = Math.round(
    hvacUnits * unitHvacReplace * 0.9 +
      finCombUnits * unitFinComb * 0.95 +
      fenceCleanSqFt * unitFenceClean * 0.95 +
      fenceStainSqFt * unitFenceStain * 0.95 +
      windowWrapSmallQty * unitWindowWrapSmall * 0.95 +
      windowWrapStandardQty * unitWindowWrapStandard * 0.95 +
      houseWrapSqFt * unitHouseWrap * 0.95 +
      fanfoldSqFt * unitFanfold * 0.95,
  );
  const nonRoofHighUsd = Math.round(
    hvacUnits * unitHvacReplace * 1.05 +
      finCombUnits * unitFinComb * 1.05 +
      fenceCleanSqFt * unitFenceClean * 1.05 +
      fenceStainSqFt * unitFenceStain * 1.05 +
      windowWrapSmallQty * unitWindowWrapSmall * 1.05 +
      windowWrapStandardQty * unitWindowWrapStandard * 1.05 +
      houseWrapSqFt * unitHouseWrap * 1.05 +
      fanfoldSqFt * unitFanfold * 1.05,
  );

  const toggleDamage = (d: DamageType) => {
    setDamageTypes((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const createdBy = useMemo(() => {
    if (!user) return undefined;
    const name = inspectorName.trim() ? inspectorName.trim() : user.name;
    return {
      id: user.id,
      email: user.email,
      name,
      userType: user.userType,
    };
  }, [user, inspectorName]);

  buildReportPayloadRef.current = (): DamageRoofReport | null => {
    if (!property?.address?.trim()) return null;
    if (!damageTypes.length) return null;
    if (!inspectionDate.trim()) return null;

    const classified = classifyRoofSystem(roofType.trim() || undefined);
    const scopeOfWork = buildRoofScopeOfWork({
      roofType: classified.normalizedRoofType,
      damageTypes,
      severity,
      recommendedAction,
      roofAreaSqFt: measurements.roofAreaSqFt,
    });

    const roofMaterialType = selectedRoofMaterial;
    const pitchRise = parseRiseRunPitchValue(measurements.roofPitch);
    const materialRequirements = classifyRoofAndMaterials(undefined, roofMaterialType, pitchRise);
    const roofFormType = classifyRoofFormFromTrace({ roofTraceGeoJson, roofPitch: measurements.roofPitch }) ?? undefined;
    const aiDamageRisk = computeAiDamageRisk({
      roofAgeYears: roofAgeYears.trim() ? roofAgeYears : undefined,
      severity,
      damageTypes,
      roofMaterialType,
      pitchRise,
    });

    const roofPitchDiagramImageUrl = buildRoofPitchDiagramSvgDataUrl({
      roofPitch: measurements.roofPitch,
      roofFormType,
      roofMaterialType: classified.normalizedRoofType,
    });

    const roofLengthsDiagramImageUrl = buildRoofLengthsDiagramSvgDataUrl({
      roofTraceGeoJson,
      roofPerimeterFt: measurements.roofPerimeterFt,
    });

    const shingleGrade = (() => {
      if (selectedRoofMaterial !== "shingle") return "architectural";
      const rt = roofType.trim().toLowerCase();
      if (rt.includes("premium") || rt.includes("designer")) return "premium";
      if (rt.includes("architectural") || rt.includes("laminate")) return "architectural";
      return "basic";
    })() as "basic" | "architectural" | "premium";

    const underlaymentType = "synthetic" as const;

    const eagleViewEstimate =
      measurements.roofAreaSqFt && measurements.roofAreaSqFt > 0
        ? calculateEagleViewLikeEstimate({
            roofAreaSqFt: measurements.roofAreaSqFt,
            roofPerimeterFt: measurements.roofPerimeterFt,
            roofTraceGeoJson,
            predominantPitch: measurements.roofPitch,
            numberOfStories: measurements.roofStories,
            shingleGrade,
            underlaymentType,
            includePermit: false,
            includeDumpster: false,
          })
        : undefined;

    return {
      id: createReportId(),
      createdAtIso: new Date().toISOString(),
      property: property as PropertySelection,
      inspectionDate: inspectionDate.trim(),
      homeownerName: homeownerName.trim() || undefined,
      homeownerEmail: homeownerEmail.trim() || undefined,
      homeownerPhone: homeownerPhone.trim() || undefined,
      roofType: classified.normalizedRoofType,
      roofFormType,
      roofSystemCategory: classified.category,
      roofMaterialType,
      materialRequirements,
      aiDamageRisk,
      eagleViewEstimate,
      scopeOfWork,
      damageTypes,
      severity,
      recommendedAction,
      notes: notes.trim() || undefined,
      createdBy,
      companyName: companyName.trim() || undefined,
      companyLogoUrl: reportLogoDataUrl.trim() ? reportLogoDataUrl.trim() : getCompanyLogoUrlByName(companyName.trim() || undefined),
      creatorName: createdBy?.name,
      measurements: roofMeasurementsHaveContent(measurements) ? measurements : undefined,
      buildingCode: effectiveBuildingCode,
      images: images.length ? images : undefined,
      roofTraceGeoJson,
      propertyImageUrl: getAutoPropertyImageUrl(property.lat, property.lng),
      propertyImageSource: "Mapbox Satellite",
      roofDiagramImageUrl: buildRoofDiagramSvgDataUrl({
        roofTraceGeoJson,
        roofAreaSqFt: measurements.roofAreaSqFt,
        roofPerimeterFt: measurements.roofPerimeterFt,
        roofType: roofType.trim() || undefined,
      }),
      roofDiagramSource: "Auto-generated from traced roof geometry and measurements",
      roofPitchDiagramImageUrl,
      roofPitchDiagramSource: roofPitchDiagramImageUrl ? "Auto-generated from roof pitch" : undefined,
      roofLengthsDiagramImageUrl,
      roofLengthsDiagramSource: roofLengthsDiagramImageUrl ? "Auto-generated from traced roof outline" : undefined,
      estimate: estimate ?? undefined,
      nonRoofEstimate:
        hvacUnits ||
        finCombUnits ||
        fenceCleanSqFt ||
        fenceStainSqFt ||
        windowWrapSmallQty ||
        windowWrapStandardQty ||
        houseWrapSqFt ||
        fanfoldSqFt
          ? {
              hvacUnits: hvacUnits || undefined,
              finCombUnits: finCombUnits || undefined,
              fenceCleanSqFt: fenceCleanSqFt || undefined,
              fenceStainSqFt: fenceStainSqFt || undefined,
              windowWrapSmallQty: windowWrapSmallQty || undefined,
              windowWrapStandardQty: windowWrapStandardQty || undefined,
              houseWrapSqFt: houseWrapSqFt || undefined,
              fanfoldSqFt: fanfoldSqFt || undefined,
              lowCostUsd: nonRoofLowUsd,
              highCostUsd: nonRoofHighUsd,
            }
          : undefined,
    };
  };

  const previewAndExport = async () => {
    if (!property?.address) {
      Alert.alert("Missing property", "Please select a property first.");
      return;
    }
    if (!damageTypes.length) {
      Alert.alert("Missing damage types", "Select at least one damage type.");
      return;
    }
    if (!inspectionDate.trim()) {
      Alert.alert("Missing inspection date", "Add an inspection date (YYYY-MM-DD).");
      return;
    }

    const report = buildReportPayloadRef.current();
    if (!report) {
      Alert.alert("Report incomplete", "Could not build the report payload.");
      return;
    }

    await upsertRoofReport(report);
    navigation.navigate("ReportPreview", { report });
  };

  useEffect(() => {
    autoReportNavigatedRef.current = false;
  }, [property.address, property.lat, property.lng]);

  useEffect(() => {
    if (!autoBuildEnabled || autoReportNavigatedRef.current) return;

    const areaFromManual = roofAreaSqFtManual.trim() ? Number(roofAreaSqFtManual) : undefined;
    const area =
      typeof areaFromManual === "number" && Number.isFinite(areaFromManual)
        ? areaFromManual
        : measurements.roofAreaSqFt ??
          (typeof property.roofSqFt === "number" && Number.isFinite(property.roofSqFt) && property.roofSqFt > 0
            ? Math.round(property.roofSqFt)
            : undefined);

    if (!area || !Number.isFinite(area) || !damageTypes.length) return;
    if (!estimate) return;

    const delayMs = Platform.OS === "web" ? 2600 : 1200;
    const t = setTimeout(() => {
      if (autoReportNavigatedRef.current) return;
      const report = buildReportPayloadRef.current();
      if (!report) return;
      autoReportNavigatedRef.current = true;
      void upsertRoofReport(report).then(() => {
        navigation.navigate("ReportPreview", { report });
      });
    }, delayMs);

    return () => clearTimeout(t);
    // Use estimate $ fields (not object identity) so we don't reset the timer every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- buildReportPayloadRef always has latest state
  }, [
    autoBuildEnabled,
    estimate?.lowCostUsd,
    estimate?.highCostUsd,
    estimate?.roofAreaSqFt,
    estimate?.scope,
    measurements.roofAreaSqFt,
    roofAreaSqFtManual,
    property.roofSqFt,
    damageTypes.length,
    navigation,
  ]);

  const autoFillBuildingCode = async () => {
    try {
      const details = await reverseGeocodeNominatimDetailed(property.lat, property.lng);
      const stateCode = details.address.state_code || details.address.state;
      const codeInfo = getBuildingCodeInfoForLocation(stateCode);

      const locationString = [
        details.address.city,
        details.address.county ? `(${details.address.county})` : undefined,
      ]
        .filter(Boolean)
        .join(" ");

      setBuildingCode({
        ...codeInfo,
        jurisdiction: [codeInfo.jurisdiction, locationString].filter(Boolean).join(" - ") || codeInfo.jurisdiction,
      });
    } catch (e) {
      console.error(e);
      Alert.alert("Auto-fill failed", "Could not pull building code info for this location.");
    }
  };

  useEffect(() => {
    // Keep CSV-loaded contact + roof type in sync if a different property is selected.
    setHomeownerName(property.homeownerName ?? "");
    setHomeownerEmail(property.email ?? "");
    setHomeownerPhone(property.phone ?? "");
    setRoofType(property.roofType?.trim() ? property.roofType.trim() : inferRoofTypeIfMissing(property));
    const hasDirectContact = !!(property.homeownerName || property.email || property.phone);
    const hasRoofLead = typeof property.roofSqFt === "number" && property.roofSqFt > 0;
    if (hasDirectContact && hasRoofLead) {
      setContactAutofillStatus("Contact + roof data autofilled from selected property (lead/import).");
    } else if (hasDirectContact) {
      setContactAutofillStatus("Contact autofilled from selected property.");
    } else if (hasRoofLead) {
      setContactAutofillStatus("Roof measurement hints from lead — add contact or pick a CSV lead.");
    } else {
      setContactAutofillStatus("");
    }
  }, [
    property.address,
    property.lat,
    property.lng,
    property.homeownerName,
    property.email,
    property.phone,
    property.roofType,
    property.roofSqFt,
  ]);

  useEffect(() => {
    // Autofill structured property + contact + roof lead lines into measurements (for export/review).
    const block = buildPropertyMeasurementNote(property);
    setMeasurements((prev) => ({
      ...prev,
      notes: mergePropertyRecordIntoNotes(prev.notes, block),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when property identity / coords / lead fields change
  }, [
    property.address,
    property.lat,
    property.lng,
    property.homeownerName,
    property.email,
    property.phone,
    property.roofSqFt,
    property.roofType,
  ]);

  useEffect(() => {
    // Merge saved/imported leads by address + proximity (fills email / roof type after map pick).
    (async () => {
      try {
        const leads = await loadRoofLeads();
        if (!leads.length) return;

        const match = findBestMatchingLead(property, leads);
        if (!match) return;

        let filled = false;
        if (match.homeownerName) {
          setHomeownerName((prev) => (prev.trim() ? prev : match.homeownerName || ""));
          filled = true;
        }
        if (match.email) {
          setHomeownerEmail((prev) => (prev.trim() ? prev : match.email || ""));
          filled = true;
        }
        if (match.phone) {
          setHomeownerPhone((prev) => (prev.trim() ? prev : match.phone || ""));
          filled = true;
        }
        if (match.roofType?.trim()) {
          setRoofType((prev) => (prev.trim() ? prev : match.roofType!.trim()));
          filled = true;
        }
        if (filled) {
          setContactAutofillStatus((prev) =>
            prev.includes("selected property") ? prev : "Contact / roof type matched from saved leads.",
          );
        }
      } catch (e) {
        console.error("Lead contact autofill fallback failed:", e);
        setContactAutofillStatus("Contact autofill failed. You can enter it manually.");
      }
    })();
  }, [property.address, property.lat, property.lng, property.homeownerName, property.email, property.phone, property.roofType]);

  useEffect(() => {
    // Best-effort auto-fill company from authenticated user profile.
    if (!user?.name) return;
    setCompanyName((prev) => (prev.trim() && prev.trim() !== "Cox Roofing" ? prev : user.name));
    setInspectorName((prev) => (prev.trim() ? prev : user.name));
  }, [user?.name]);

  useEffect(() => {
    setAutoBuildEnabled(shouldAutoBuildReport);
  }, [shouldAutoBuildReport]);

  useEffect(() => {
    // Auto-fill demo building code checks based on location (best-effort).
    autoFillBuildingCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property.lat, property.lng, reportMode]);

  const handleRoofTraceChange = (metrics: RoofTraceMetrics | null) => {
    if (!metrics) {
      // RoofTraceMap calls `onTraceChange(null)` on initial load (no polygon drawn yet).
      // If the lead CSV provided a roof sqft, preserve it so the report still auto-fills instantly.
      const hasCsvRoofArea =
        typeof property.roofSqFt === "number" && Number.isFinite(property.roofSqFt) && property.roofSqFt > 0;

      setMeasurements((prev) => {
        if (hasCsvRoofArea) {
          // Keep whatever roofAreaSqFt we already have (likely from CSV),
          // but clear perimeter (not traced yet) and any pitch from a prior job.
          return { ...prev, roofPerimeterFt: undefined, roofPitch: undefined };
        }
        return { notes: prev.notes };
      });
      setRoofTraceGeoJson(undefined);
      return;
    }

    setMeasurements((prev) => ({
      ...prev,
      roofAreaSqFt: metrics.roofAreaSqFt ? Math.round(metrics.roofAreaSqFt) : undefined,
      roofPerimeterFt: metrics.roofPerimeterFt ? Math.round(metrics.roofPerimeterFt) : undefined,
    }));

    // Keep estimate inputs aligned with the latest trace.
    if (metrics.roofAreaSqFt && Number.isFinite(metrics.roofAreaSqFt)) {
      setRoofAreaSqFtManual(String(Math.round(metrics.roofAreaSqFt)));
    }

    setRoofTraceGeoJson(metrics.geoJson);
  };

  useEffect(() => {
    // If CSV included roof_sqft, we can skip tracing for an initial area.
    if (typeof property.roofSqFt === "number" && Number.isFinite(property.roofSqFt) && property.roofSqFt > 0) {
      const rounded = Math.round(property.roofSqFt);
      setMeasurements((prev) => ({
        ...prev,
        roofAreaSqFt: rounded,
      }));
      setRoofAreaSqFtManual((prev) => (prev.trim() ? prev : String(rounded)));
    }
  }, [property.roofSqFt]);

  const buildEstimateComplianceNotes = () => {
    const base = estimateNotes.trim();
    const codeRefs = (effectiveBuildingCode?.checks ?? []).slice(0, 10).map((c) => c.label);
    if (!codeRefs.length) return base || undefined;
    const complianceBlock = `IRC code checks considered: ${codeRefs.join("; ")}`;
    return base ? `${base}\n\n${complianceBlock}` : complianceBlock;
  };

  const handleCalculateEstimate = () => {
    const areaFromManual = roofAreaSqFtManual.trim()
      ? Number(roofAreaSqFtManual)
      : undefined;
    const areaFromTrace = measurements.roofAreaSqFt;
    const area =
      typeof areaFromManual === "number" && Number.isFinite(areaFromManual)
        ? areaFromManual
        : areaFromTrace;

    if (!area || !Number.isFinite(area)) {
      Alert.alert("Roof area required", "Trace the roof or enter Roof Area (sq ft) to calculate an estimate.");
      return;
    }

    const next = computeRoofDamageEstimate({
      roofAreaSqFt: area,
      damageTypes,
      severity,
      roofType,
      notes: buildEstimateComplianceNotes(),
    });

    setEstimate({
      ...next,
      lowCostUsd: next.lowCostUsd + nonRoofLowUsd,
      highCostUsd: next.highCostUsd + nonRoofHighUsd,
    });
  };

  useEffect(() => {
    // Automatically recompute estimate whenever roof area or damage inputs change.
    const areaFromManual = roofAreaSqFtManual.trim()
      ? Number(roofAreaSqFtManual)
      : undefined;
    const areaFromTrace = measurements.roofAreaSqFt;
    const area =
      typeof areaFromManual === "number" && Number.isFinite(areaFromManual)
        ? areaFromManual
        : areaFromTrace;

    if (!area || !Number.isFinite(area) || !damageTypes.length) return;

    const next = computeRoofDamageEstimate({
      roofAreaSqFt: area,
      damageTypes,
      severity,
      roofType,
      notes: buildEstimateComplianceNotes(),
    });

    setEstimate({
      ...next,
      lowCostUsd: next.lowCostUsd + nonRoofLowUsd,
      highCostUsd: next.highCostUsd + nonRoofHighUsd,
    });
  }, [
    roofAreaSqFtManual,
    measurements.roofAreaSqFt,
    damageTypes,
    severity,
    estimateNotes,
    hvacUnits,
    finCombUnits,
    fenceCleanSqFt,
    fenceStainSqFt,
    windowWrapSmallQty,
    windowWrapStandardQty,
    houseWrapSqFt,
    fanfoldSqFt,
    roofType,
    buildingCode,
  ]);

  const handleUploadImages = async () => {
    if (Platform.OS !== "web") {
      Alert.alert("Photos (web only)", "Photo upload is supported in the web build for now.");
      return;
    }

    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.multiple = true;

      input.onchange = async () => {
        const files = input.files ? Array.from(input.files) : [];
        if (!files.length) return;

        const nowIso = new Date().toISOString();

        const readFileAsDataUrl = (file: File): Promise<string> =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ""));
            reader.onerror = () => reject(new Error("Failed to read image"));
            reader.readAsDataURL(file);
          });

        const nextImages: RoofReportImage[] = [];
        for (const file of files) {
          const dataUrl = await readFileAsDataUrl(file);
          nextImages.push({
            id: `img_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            dataUrl,
            caption: file.name.replace(/\.[^/.]+$/, ""),
            uploadedAtIso: nowIso,
          });
        }

        setImages((prev) => [...nextImages, ...prev]);
        Alert.alert("Photos added", `${nextImages.length} photo(s) added to this report.`);
      };

      input.click();
    } catch (e) {
      console.error(e);
      Alert.alert("Photo upload failed", "Could not read one or more image files.");
    }
  };

  const handleUploadReportLogo = async () => {
    if (Platform.OS !== "web") {
      Alert.alert("Logo upload (web only)", "Report logo upload is supported in the web build for now.");
      return;
    }

    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.multiple = false;

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;

        const readFileAsDataUrl = (f: File): Promise<string> =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ""));
            reader.onerror = () => reject(new Error("Failed to read logo image"));
            reader.readAsDataURL(f);
          });

        const dataUrl = await readFileAsDataUrl(file);
        if (!dataUrl.trim()) {
          Alert.alert("Logo upload failed", "Could not read the selected file.");
          return;
        }

        setReportLogoDataUrl(dataUrl);
        Alert.alert("Logo added", "Logo override saved for this report.");
      };

      input.click();
    } catch (e) {
      console.error(e);
      Alert.alert("Logo upload failed", "Could not read the logo file.");
    }
  };

  const handleClearReportLogo = () => {
    setReportLogoDataUrl("");
  };

  const handleImportCompanyCamPdf = async () => {
    if (Platform.OS !== "web") {
      Alert.alert("CompanyCam PDF (web only)", "PDF import with OCR is supported in the web build only.");
      return;
    }

    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/pdf";
      input.multiple = false;

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;

        setCompanyCamImporting(true);
        setCompanyCamImportProgress("Starting OCR...");

        try {
          const extracted = await extractCompanyCamDataFromPdfFile(file, (p) => {
            const status = p.status ? `${p.status}` : "processing";
            setCompanyCamImportProgress(`${status}: ${p.page} / ${p.totalPages}`);
          });

          const updated: string[] = [];

          if (extracted.homeownerName) {
            setHomeownerName(extracted.homeownerName);
            updated.push("homeowner name");
          }
          if (extracted.email) {
            setHomeownerEmail(extracted.email);
            updated.push("email");
          }
          if (extracted.phone) {
            setHomeownerPhone(extracted.phone);
            updated.push("phone");
          }
          if (extracted.roofType) {
            setRoofType(extracted.roofType);
            updated.push("roof type");
          }
          if (extracted.damageTypes?.length) {
            setDamageTypes(extracted.damageTypes);
            updated.push("damage types");
          }
          if (extracted.severity) {
            setSeverity(extracted.severity);
            updated.push("severity");
          }
          if (extracted.recommendedAction) {
            setRecommendedAction(extracted.recommendedAction);
            updated.push("recommended action");
          }
          if (extracted.roofAreaSqFt && Number.isFinite(extracted.roofAreaSqFt)) {
            const rounded = Math.round(extracted.roofAreaSqFt);
            setMeasurements((prev) => ({ ...prev, roofAreaSqFt: rounded }));
            setRoofAreaSqFtManual((prev) => (prev.trim() ? prev : String(rounded)));
            updated.push("roof area (sq ft)");
          }
          if (extracted.roofPerimeterFt && Number.isFinite(extracted.roofPerimeterFt)) {
            const rounded = Math.round(extracted.roofPerimeterFt);
            setMeasurements((prev) => ({ ...prev, roofPerimeterFt: rounded }));
            updated.push("roof perimeter (ft)");
          }
          if (extracted.pitch) {
            const pitch = extracted.pitch.trim();
            if (pitch) {
              setMeasurements((prev) => ({ ...prev, roofPitch: pitch }));
              updated.push("pitch");
            }
          }
          if (extracted.inspectionDateYmd) {
            setInspectionDate(extracted.inspectionDateYmd);
            updated.push("inspection date");
          }
          if (typeof extracted.hvacUnits === "number" && extracted.hvacUnits > 0) {
            setHvacUnits(Math.round(extracted.hvacUnits));
            updated.push("HVAC units");
          }
          if (typeof extracted.finCombUnits === "number" && extracted.finCombUnits > 0) {
            setFinCombUnits(Math.round(extracted.finCombUnits));
            updated.push("condenser fin comb qty");
          }
          if (typeof extracted.fenceCleanSqFt === "number" && extracted.fenceCleanSqFt > 0) {
            setFenceCleanSqFt(Math.round(extracted.fenceCleanSqFt));
            updated.push("fence clean sq ft");
          }
          if (typeof extracted.fenceStainSqFt === "number" && extracted.fenceStainSqFt > 0) {
            setFenceStainSqFt(Math.round(extracted.fenceStainSqFt));
            updated.push("fence stain sq ft");
          }
          if (typeof extracted.windowWrapSmallQty === "number" && extracted.windowWrapSmallQty > 0) {
            setWindowWrapSmallQty(Math.round(extracted.windowWrapSmallQty));
            updated.push("window wrap small qty");
          }
          if (typeof extracted.windowWrapStandardQty === "number" && extracted.windowWrapStandardQty > 0) {
            setWindowWrapStandardQty(Math.round(extracted.windowWrapStandardQty));
            updated.push("window wrap standard qty");
          }
          if (typeof extracted.houseWrapSqFt === "number" && extracted.houseWrapSqFt > 0) {
            setHouseWrapSqFt(Math.round(extracted.houseWrapSqFt));
            updated.push("house wrap sq ft");
          }
          if (typeof extracted.fanfoldSqFt === "number" && extracted.fanfoldSqFt > 0) {
            setFanfoldSqFt(Math.round(extracted.fanfoldSqFt));
            updated.push("fanfold sq ft");
          }
          if (extracted.buildingCodeFromPdf) {
            setBuildingCode((prev) => extracted.buildingCodeFromPdf ?? prev);
            updated.push("building code references");
          }
          if (extracted.notes) {
            setNotes((prev) => (prev.trim() ? `${prev}\n\n${extracted.notes}` : extracted.notes || prev));
            setEstimateNotes((prev) =>
              prev.trim() ? prev : `Auto-filled from PDF. ${extracted.notes}`,
            );
            updated.push("estimate metadata notes");
          }
          if (
            extracted.propertyAddress ||
            extracted.measurementSource ||
            extracted.roofSquares ||
            extracted.wasteFactorPct ||
            extracted.pitch ||
            extracted.stories
          ) {
            const measurementMeta: string[] = [];
            if (extracted.propertyAddress) measurementMeta.push(`Property Address (PDF): ${extracted.propertyAddress}`);
            if (extracted.measurementSource) measurementMeta.push(`Measurement Source: ${extracted.measurementSource}`);
            if (typeof extracted.roofSquares === "number") measurementMeta.push(`Roof Squares: ${extracted.roofSquares}`);
            if (typeof extracted.wasteFactorPct === "number") measurementMeta.push(`Waste Factor: ${extracted.wasteFactorPct}%`);
            if (extracted.pitch) measurementMeta.push(`Pitch: ${extracted.pitch}`);
            if (typeof extracted.stories === "number") measurementMeta.push(`Stories: ${extracted.stories}`);

            if (measurementMeta.length) {
              const stories =
                typeof extracted.stories === "number" && Number.isFinite(extracted.stories)
                  ? Math.round(extracted.stories)
                  : undefined;
              setMeasurements((prev) => ({
                ...prev,
                roofStories: stories ?? prev.roofStories,
                notes: prev.notes?.trim()
                  ? `${prev.notes}\n${measurementMeta.join(" | ")}`
                  : measurementMeta.join(" | "),
              }));
              updated.push("measurement metadata");
            }
          }

          setCompanyCamImportProgress("Import complete.");
          Alert.alert("CompanyCam import complete", updated.length ? `Filled: ${updated.join(", ")}` : "No fields found to auto-fill from OCR.");
        } catch (e) {
          console.error(e);
          Alert.alert("Import failed", "Could not OCR this PDF. Try another file or try again.");
        } finally {
          setCompanyCamImporting(false);
          // Keep last progress message briefly.
          setTimeout(() => setCompanyCamImportProgress(""), 1500);
        }
      };

      input.click();
    } catch (e) {
      console.error(e);
      Alert.alert("Import failed", "Could not start PDF import.");
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  return (
    <ScreenKeyboardAwareScrollView style={styles.screen}>
      <View style={styles.container}>
        <ThemedText type="h2" style={styles.title}>
          Damage Roof Report
        </ThemedText>
        <ThemedText type="small" style={styles.subtitle}>
          {reportMode === "estimate"
            ? "Damage estimate template: select damage and generate an estimate with photos."
            : "Select the damage details for the property you clicked on."}
        </ThemedText>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconBadge}>
              <Feather name="map-pin" size={18} color="#fff" />
            </View>
            <ThemedText type="h4" style={{ flex: 1 }}>
              Property
            </ThemedText>
          </View>

          <ThemedText type="small" style={styles.propAddress}>
            {property.address}
          </ThemedText>
          <ThemedText type="caption" style={styles.propCoords}>
            {property.lat.toFixed(6)}, {property.lng.toFixed(6)}
          </ThemedText>
        </Card>

        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Inspection Details
          </ThemedText>

          <View style={{ height: 10 }} />

          <View style={styles.inputRow}>
            <ThemedText type="small" style={styles.inputLabel}>
              Inspection Date (YYYY-MM-DD)
            </ThemedText>
            <TextInput
              value={inspectionDate}
              onChangeText={setInspectionDate}
              style={[
                styles.textInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              placeholder="2026-03-19"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={{ height: 12 }} />

          <View style={styles.inputRow}>
            <ThemedText type="small" style={styles.inputLabel}>
              Inspector (who made the report)
            </ThemedText>
            <TextInput
              value={inspectorName}
              onChangeText={setInspectorName}
              style={[
                styles.textInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              placeholder="e.g., John Smith"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={{ height: 12 }} />

          <View style={styles.inputRow}>
            <ThemedText type="small" style={styles.inputLabel}>
              Report Logo (web)
            </ThemedText>
            <View style={{ flex: 1, justifyContent: "center" }}>
              {reportLogoDataUrl ? (
                <View style={{ alignItems: "flex-start" }}>
                  <Image source={{ uri: reportLogoDataUrl }} style={styles.reportLogoPreview} />
                  <View style={{ height: 8 }} />
                  <Button onPress={handleClearReportLogo} style={styles.autoButton}>
                    Clear Logo
                  </Button>
                </View>
              ) : (
                <>
                  <Button onPress={handleUploadReportLogo} style={styles.autoButton}>
                    Upload Logo
                  </Button>
                </>
              )}
            </View>
          </View>

          <View style={styles.inputRow}>
            <ThemedText type="small" style={styles.inputLabel}>
              Homeowner Name (optional)
            </ThemedText>
            <TextInput
              value={homeownerName}
              onChangeText={setHomeownerName}
              style={[
                styles.textInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              placeholder="e.g., John Smith"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          {contactAutofillStatus ? (
            <>
              <View style={{ height: 8 }} />
              <ThemedText type="caption" style={styles.autofillStatus}>
                {contactAutofillStatus}
              </ThemedText>
            </>
          ) : null}

          <View style={{ height: 12 }} />

          <View style={styles.inputRow}>
            <ThemedText type="small" style={styles.inputLabel}>
              Homeowner Email (optional)
            </ThemedText>
            <TextInput
              value={homeownerEmail}
              onChangeText={setHomeownerEmail}
              style={[
                styles.textInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              placeholder="e.g., name@email.com"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
            />
          </View>

          <View style={{ height: 12 }} />

          <View style={styles.inputRow}>
            <ThemedText type="small" style={styles.inputLabel}>
              Homeowner Phone (optional)
            </ThemedText>
            <TextInput
              value={homeownerPhone}
              onChangeText={setHomeownerPhone}
              style={[
                styles.textInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              placeholder="e.g., (555) 123-4567"
              placeholderTextColor={theme.textSecondary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={{ height: 12 }} />

          <ThemedText type="small" style={styles.inputLabel}>
            Roofing Material
          </ThemedText>

          <View style={styles.chipsWrap}>
            {roofMaterialChoices.map((m) => {
              const selected = selectedRoofMaterial === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => setRoofType(m)}
                  style={[styles.chip, selected ? styles.chipSelected : styles.chipUnselected]}
                >
                  <ThemedText type="caption" style={selected ? styles.chipTextSelected : styles.chipText}>
                    {roofMaterialLabels[m]}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {selectedRoofMaterial === "tile" ? (
            <ThemedText type="caption" style={{ color: "#f59e0b", fontWeight: "700", marginTop: 6, lineHeight: 16 }}>
              Warning: Tile roofs require structural verification due to weight.
            </ThemedText>
          ) : null}

          <View style={{ height: 12 }} />

          <View style={styles.inputRow}>
            <ThemedText type="small" style={styles.inputLabel}>
              Roof Age (years, optional)
            </ThemedText>
            <TextInput
              value={roofAgeYears}
              onChangeText={(t) => {
                const cleaned = t.replace(/[^0-9.]/g, "");
                setRoofAgeYears(cleaned);
              }}
              keyboardType="numeric"
              style={[
                styles.textInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              placeholder="e.g., 12"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <ThemedText type="caption" style={[styles.helperText, { marginTop: 6 }]}>
            Used for the AI-style damage risk score (optional but improves accuracy).
          </ThemedText>

          <View style={{ height: 12 }} />

          <View style={styles.inputRow}>
            <ThemedText type="small" style={styles.inputLabel}>
              Roof Type (optional, manual override)
            </ThemedText>
            <TextInput
              value={roofType}
              onChangeText={setRoofType}
              style={[
                styles.textInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              placeholder="e.g., Asphalt Shingle / TPO / Slate / Tile"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconBadge}>
              <Feather name="file-text" size={18} color="#fff" />
            </View>
            <ThemedText type="h4" style={{ flex: 1 }}>
              CompanyCam PDF Import
            </ThemedText>
          </View>

          <ThemedText type="caption" style={styles.helperText}>
            Upload your CompanyCam PDF; we’ll OCR it (web only) and fill what we can.
          </ThemedText>

          <View style={{ height: 12 }} />

          <Button onPress={handleImportCompanyCamPdf} disabled={companyCamImporting} style={styles.autoButton}>
            {companyCamImporting ? "Importing..." : "Upload CompanyCam PDF"}
          </Button>

          {companyCamImportProgress ? (
            <>
              <View style={{ height: 10 }} />
              <ThemedText type="caption" style={styles.helperText}>
                {companyCamImportProgress}
              </ThemedText>
            </>
          ) : null}
        </Card>

        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Damage Types
          </ThemedText>
          <ThemedText type="caption" style={styles.helperText}>
            Tap to select one or more.
          </ThemedText>

          <View style={styles.chipsWrap}>
            {damageTypeOptions.map((d) => {
              const selected = damageTypes.includes(d);
              return (
                <Pressable
                  key={d}
                  onPress={() => toggleDamage(d)}
                  style={[
                    styles.chip,
                    selected ? styles.chipSelected : styles.chipUnselected,
                  ]}
                >
                  <ThemedText type="caption" style={selected ? styles.chipTextSelected : styles.chipText}>
                    {d}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconBadge}>
              <Feather name="dollar-sign" size={18} color="#fff" />
            </View>
            <ThemedText type="h4" style={{ flex: 1 }}>
              Damage Estimate
            </ThemedText>
          </View>

          <ThemedText type="caption" style={styles.helperText}>
            {reportMode === "estimate"
              ? "Estimate-only template: enter roof area and calculate low/high range."
              : "Estimate can use traced roof area (if available)."}
          </ThemedText>

          {reportMode === "estimate" ? (
            <>
              <View style={{ height: 10 }} />
              <View style={styles.inputRow}>
                <ThemedText type="small" style={styles.inputLabel}>
                  Roof Area (sq ft)
                </ThemedText>
                <TextInput
                  value={roofAreaSqFtManual}
                  onChangeText={(t) => setRoofAreaSqFtManual(t.replace(/[^0-9]/g, ""))}
                  keyboardType="numeric"
                  style={[
                    styles.textInput,
                    {
                      color: theme.text,
                      borderColor: theme.border,
                      backgroundColor: theme.backgroundSecondary,
                    },
                  ]}
                  placeholder="e.g., 1500"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            </>
          ) : null}

          <View style={{ height: 12 }} />
          <Button onPress={handleCalculateEstimate} style={styles.autoButton}>
            Calculate Estimate
          </Button>

          {estimate ? (
            <>
              <View style={{ height: 12 }} />
              <View style={styles.kvRow}>
                <ThemedText type="small" style={styles.kvLabel}>
                  Scope
                </ThemedText>
                <ThemedText type="small" style={styles.kvValue}>
                  {estimate.scope.toUpperCase()}
                </ThemedText>
              </View>
              <View style={styles.kvRow}>
                <ThemedText type="small" style={styles.kvLabel}>
                  Estimated Range
                </ThemedText>
                <ThemedText type="small" style={styles.kvValue}>
                  ${estimate.lowCostUsd.toLocaleString()} - ${estimate.highCostUsd.toLocaleString()}
                </ThemedText>
              </View>
              <View style={{ height: 8 }} />
              <ThemedText type="caption" style={styles.helperText}>
                Confidence: {estimate.confidence}
              </ThemedText>
            </>
          ) : null}

          <View style={{ height: 12 }} />
          <ThemedText type="small" style={styles.inputLabel}>
            Estimate Notes (optional)
          </ThemedText>
          <TextInput
            value={estimateNotes}
            onChangeText={setEstimateNotes}
            multiline
            style={[
              styles.notesInput,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.backgroundSecondary,
              },
            ]}
            placeholder="E.g., estimated due to hail impact patterns; pricing range is approximate."
            placeholderTextColor={theme.textSecondary}
          />
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconBadge}>
              <Feather name="navigation" size={18} color="#fff" />
            </View>
            <ThemedText type="h4" style={{ flex: 1 }}>
              Aerial roof measurements (EaveMeasure)
            </ThemedText>
          </View>

          <ThemedText type="caption" style={styles.helperText}>
            The{" "}
            <ThemedText type="link" onPress={() => void Linking.openURL(EAVEMEASURE_GITHUB_README_URL)}>
              eavemeasure-aerial-roof-measurement
            </ThemedText>{" "}
            GitHub repo is informational (links to services). There is no API there — order reports on EaveMeasure’s site,
            then record the reference and roof area here so estimates and exports include them.
          </ThemedText>

          <View style={{ height: 12 }} />

          <Button onPress={() => void openEaveMeasureAerialServices()} style={styles.autoButton}>
            Open EaveMeasure aerial services
          </Button>

          <View style={{ height: 8 }} />
          <ThemedText type="caption" style={styles.mutedCaption}>
            {EAVEMEASURE_AERIAL_SERVICES_URL}
          </ThemedText>

          <View style={{ height: 14 }} />

          <View style={styles.inputRow}>
            <ThemedText type="small" style={styles.inputLabel}>
              Report / job reference (optional)
            </ThemedText>
            <TextInput
              value={measurements.aerialMeasurementReference ?? ""}
              onChangeText={(t) =>
                setMeasurements((prev) =>
                  mergeEaveMeasureFields(prev, t, prev.aerialMeasurementReportUrl ?? ""),
                )
              }
              style={[
                styles.textInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              placeholder="e.g., order # or report ID"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={{ height: 12 }} />

          <View style={styles.inputRow}>
            <ThemedText type="small" style={styles.inputLabel}>
              Report link (optional)
            </ThemedText>
            <TextInput
              value={measurements.aerialMeasurementReportUrl ?? ""}
              onChangeText={(t) =>
                setMeasurements((prev) =>
                  mergeEaveMeasureFields(prev, prev.aerialMeasurementReference ?? "", t),
                )
              }
              style={[
                styles.textInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              placeholder="https://…"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
            />
          </View>

          <View style={{ height: 12 }} />

          <View style={styles.inputRow}>
            <ThemedText type="small" style={styles.inputLabel}>
              Roof area from aerial report (sq ft)
            </ThemedText>
            <TextInput
              value={eaveMeasureSqFtDraft}
              onChangeText={(t) => setEaveMeasureSqFtDraft(t.replace(/[^0-9]/g, ""))}
              keyboardType="numeric"
              style={[
                styles.textInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              placeholder="e.g., 2450"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={{ height: 12 }} />

          <Button
            onPress={() => {
              const raw = eaveMeasureSqFtDraft.trim();
              const n = raw ? Number(raw) : NaN;
              if (!Number.isFinite(n) || n <= 0) {
                Alert.alert(
                  "Roof area",
                  "Enter the living / roof area from your EaveMeasure report (square feet), then apply.",
                );
                return;
              }
              const rounded = Math.round(n);
              setMeasurements((prev) => {
                const base = mergeEaveMeasureFields(
                  prev,
                  prev.aerialMeasurementReference ?? "",
                  prev.aerialMeasurementReportUrl ?? "",
                );
                return {
                  ...base,
                  roofAreaSqFt: rounded,
                  aerialMeasurementProvider: base.aerialMeasurementProvider || EAVEMEASURE_PROVIDER_LABEL,
                };
              });
              setRoofAreaSqFtManual(String(rounded));
              Alert.alert(
                "Applied",
                `Roof area set to ${rounded.toLocaleString()} sq ft for this report and estimate calculations.`,
              );
            }}
            style={styles.autoButton}
          >
            Apply aerial sq ft to report & estimate
          </Button>
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconBadge}>
              <Feather name="tool" size={18} color="#fff" />
            </View>
            <ThemedText type="h4" style={{ flex: 1 }}>
              Non-Roof Hail Items (Optional)
            </ThemedText>
          </View>

          <ThemedText type="caption" style={styles.helperText}>
            Adds HVAC repair costs into the estimate (from Fencing & HVAC.csv). Enter quantities as needed.
          </ThemedText>

          <View style={{ height: 12 }} />

          <View style={styles.inputRow}>
            <ThemedText type="small" style={styles.inputLabel}>
              HVAC Units Replaced
            </ThemedText>
            <TextInput
              value={String(hvacUnits)}
              onChangeText={(t) => {
                const n = Number(t.replace(/[^0-9]/g, ""));
                setHvacUnits(Number.isFinite(n) ? n : 0);
              }}
              keyboardType="numeric"
              style={[
                styles.textInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              placeholder="0"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={{ height: 12 }} />

          <View style={styles.inputRow}>
            <ThemedText type="small" style={styles.inputLabel}>
              Condenser Fin Comb / Straighten
            </ThemedText>
            <TextInput
              value={String(finCombUnits)}
              onChangeText={(t) => {
                const n = Number(t.replace(/[^0-9]/g, ""));
                setFinCombUnits(Number.isFinite(n) ? n : 0);
              }}
              keyboardType="numeric"
              style={[
                styles.textInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              placeholder="0"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={{ height: 12 }} />

          <View style={styles.inputRow}>
            <ThemedText type="small" style={styles.inputLabel}>
              Fence Clean (sq ft)
            </ThemedText>
            <TextInput
              value={String(fenceCleanSqFt)}
              onChangeText={(t) => {
                const n = Number(t.replace(/[^0-9]/g, ""));
                setFenceCleanSqFt(Number.isFinite(n) ? n : 0);
              }}
              keyboardType="numeric"
              style={[
                styles.textInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              placeholder="0"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={{ height: 12 }} />

          <View style={styles.inputRow}>
            <ThemedText type="small" style={styles.inputLabel}>
              Fence Stain (sq ft)
            </ThemedText>
            <TextInput
              value={String(fenceStainSqFt)}
              onChangeText={(t) => {
                const n = Number(t.replace(/[^0-9]/g, ""));
                setFenceStainSqFt(Number.isFinite(n) ? n : 0);
              }}
              keyboardType="numeric"
              style={[
                styles.textInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              placeholder="0"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={{ height: 12 }} />

          <View style={styles.inputRow}>
            <ThemedText type="small" style={styles.inputLabel}>
              Window Wrap Small (qty)
            </ThemedText>
            <TextInput
              value={String(windowWrapSmallQty)}
              onChangeText={(t) => {
                const n = Number(t.replace(/[^0-9]/g, ""));
                setWindowWrapSmallQty(Number.isFinite(n) ? n : 0);
              }}
              keyboardType="numeric"
              style={[
                styles.textInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              placeholder="0"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={{ height: 12 }} />

          <View style={styles.inputRow}>
            <ThemedText type="small" style={styles.inputLabel}>
              Window Wrap Standard (qty)
            </ThemedText>
            <TextInput
              value={String(windowWrapStandardQty)}
              onChangeText={(t) => {
                const n = Number(t.replace(/[^0-9]/g, ""));
                setWindowWrapStandardQty(Number.isFinite(n) ? n : 0);
              }}
              keyboardType="numeric"
              style={[
                styles.textInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              placeholder="0"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={{ height: 12 }} />

          <View style={styles.inputRow}>
            <ThemedText type="small" style={styles.inputLabel}>
              House Wrap (sq ft)
            </ThemedText>
            <TextInput
              value={String(houseWrapSqFt)}
              onChangeText={(t) => {
                const n = Number(t.replace(/[^0-9]/g, ""));
                setHouseWrapSqFt(Number.isFinite(n) ? n : 0);
              }}
              keyboardType="numeric"
              style={[
                styles.textInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              placeholder="0"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={{ height: 12 }} />

          <View style={styles.inputRow}>
            <ThemedText type="small" style={styles.inputLabel}>
              Fanfold Foam (sq ft)
            </ThemedText>
            <TextInput
              value={String(fanfoldSqFt)}
              onChangeText={(t) => {
                const n = Number(t.replace(/[^0-9]/g, ""));
                setFanfoldSqFt(Number.isFinite(n) ? n : 0);
              }}
              keyboardType="numeric"
              style={[
                styles.textInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              placeholder="0"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={{ height: 12 }} />
          <View style={styles.kvRow}>
            <ThemedText type="small" style={styles.kvLabel}>
              Add-on Estimate
            </ThemedText>
            <ThemedText type="small" style={styles.kvValue}>
              ${nonRoofLowUsd.toLocaleString()} - ${nonRoofHighUsd.toLocaleString()}
            </ThemedText>
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconBadge}>
              <Feather name="droplet" size={18} color="#fff" />
            </View>
            <ThemedText type="h4" style={{ flex: 1 }}>
              Measurements (Auto)
            </ThemedText>
          </View>

          <ThemedText type="caption" style={styles.helperText}>
            {Platform.OS === "web"
              ? "Web: the map flies to the property and tries to auto-fill the roof outline from Microsoft building footprints under the green pin. Adjust with the polygon tool if needed."
              : "Trace the roof polygon on the web build for auto area/perimeter."}
            {autoBuildEnabled
              ? " After area and estimate are ready, the report opens automatically (you can go back to edit)."
              : ""}
          </ThemedText>

          <View style={{ height: 12 }} />
          <View style={styles.toggleRow}>
            <ThemedText type="caption" style={styles.toggleLabel}>
              Auto-open preview ({reportMode === "estimate" ? "estimate" : "damage report"})
            </ThemedText>
            <Switch
              value={autoBuildEnabled}
              onValueChange={setAutoBuildEnabled}
              trackColor={{ false: "#94a3b8", true: AppColors.primary }}
            />
          </View>

          <View style={{ height: 12 }} />
          <View style={styles.toggleRow}>
            <ThemedText type="caption" style={styles.toggleLabel}>
              Auto-trace from footprint
            </ThemedText>
            <Switch
              value={autoTraceFromFootprintEnabled}
              onValueChange={setAutoTraceFromFootprintEnabled}
              trackColor={{ false: "#94a3b8", true: AppColors.primary }}
            />
          </View>

          <View style={{ height: 12 }} />
          <RoofTraceMap
            initialCenter={{ lat: property.lat, lng: property.lng }}
            onTraceChange={handleRoofTraceChange}
            autoTraceFromFootprint={autoTraceFromFootprintEnabled}
          />

          <View style={{ height: 12 }} />

          <View style={styles.kvRow}>
            <ThemedText type="small" style={styles.kvLabel}>
              Roof Area
            </ThemedText>
            <ThemedText type="small" style={styles.kvValue}>
              {measurements.roofAreaSqFt ? `${measurements.roofAreaSqFt.toLocaleString()} sq ft` : "Not traced yet"}
            </ThemedText>
          </View>
          <View style={styles.kvRow}>
            <ThemedText type="small" style={styles.kvLabel}>
              Roof Perimeter
            </ThemedText>
            <ThemedText type="small" style={styles.kvValue}>
              {measurements.roofPerimeterFt ? `${measurements.roofPerimeterFt.toLocaleString()} ft` : "Not traced yet"}
            </ThemedText>
          </View>

          <View style={{ height: 12 }} />
          <View style={styles.inputRow}>
            <ThemedText type="small" style={styles.inputLabel}>
              Roof Pitch (rise/run)
            </ThemedText>
            <TextInput
              value={measurements.roofPitch ?? ""}
              onChangeText={(t) => {
                const next = t.trim();
                setMeasurements((prev) => ({
                  ...prev,
                  roofPitch: next.length ? next : undefined,
                }));
              }}
              autoCapitalize="none"
              placeholder="6/12"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.textInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              keyboardType="default"
            />
          </View>

          <ThemedText type="caption" style={[styles.helperText, { marginTop: 6 }]}>
            Used to generate the Pitches Diagram. Example formats: <ThemedText type="small">6/12</ThemedText> or <ThemedText type="small">4:12</ThemedText>.
          </ThemedText>
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconBadge}>
              <Feather name="book-open" size={18} color="#fff" />
            </View>
            <ThemedText type="h4" style={{ flex: 1 }}>
              Building Codes (Auto)
            </ThemedText>
          </View>

          <ThemedText type="caption" style={styles.helperText}>
            Auto-fills a demo set of checks based on your property location.
          </ThemedText>

          <View style={{ height: 12 }} />

          <Button onPress={autoFillBuildingCode} style={styles.autoButton}>
            Auto-fill building code checks
          </Button>

          {effectiveBuildingCode ? (
            <>
              <View style={{ height: 12 }} />
              <ThemedText type="small" style={styles.buildingRef}>
                {effectiveBuildingCode.codeReference || "Building code reference"}
              </ThemedText>
              <ThemedText type="caption" style={styles.buildingJurisdiction}>
                {effectiveBuildingCode.jurisdiction || "Jurisdiction not found"}
              </ThemedText>
              <View style={{ height: 10 }} />
              {effectiveBuildingCode.checks.map((c) => (
                <View key={c.id} style={styles.checkRow}>
                  <ThemedText type="caption" style={styles.checkLabel}>
                    • {c.label}
                  </ThemedText>
                  {c.details ? (
                    <ThemedText type="caption" style={styles.checkDetails}>
                      {c.details}
                    </ThemedText>
                  ) : null}
                </View>
              ))}
            </>
          ) : null}
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconBadge}>
              <Feather name="image" size={18} color="#fff" />
            </View>
            <ThemedText type="h4" style={{ flex: 1 }}>
              Photos (for Report)
            </ThemedText>
          </View>

          <ThemedText type="caption" style={styles.helperText}>
            Upload photos to populate the exported report. (Web build)
          </ThemedText>

          <View style={{ height: 12 }} />
          <Button onPress={handleUploadImages} style={styles.autoButton}>
            Upload Photos
          </Button>

          {images.length ? (
            <>
              <View style={{ height: 12 }} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.thumbRow}>
                  {images.map((img) => (
                    <View key={img.id} style={styles.thumbWrap}>
                      <Image source={{ uri: img.dataUrl }} style={styles.thumb} />
                      <Pressable
                        onPress={() => removeImage(img.id)}
                        style={({ pressed }) => [styles.thumbRemove, pressed ? { opacity: 0.7 } : null]}
                      >
                        <Feather name="x" size={16} color="#fff" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </>
          ) : null}
        </Card>

        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Severity (1-5)
          </ThemedText>
          <ThemedText type="caption" style={styles.helperText}>
            1 = light, 5 = severe.
          </ThemedText>

          <View style={styles.severityRow}>
            {[1, 2, 3, 4, 5].map((n) => {
              const sev = n as Severity;
              const selected = sev === severity;
              return (
                <Pressable
                  key={n}
                  onPress={() => setSeverity(sev)}
                  style={[styles.severityDot, selected ? styles.severityDotSelected : styles.severityDotUnselected]}
                >
                  <ThemedText type="caption" style={selected ? styles.sevTextSelected : styles.sevText}>
                    {n}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Recommended Action
          </ThemedText>
          <View style={styles.actionWrap}>
            {recommendedActionOptions.map((a) => {
              const selected = a === recommendedAction;
              return (
                <Pressable
                  key={a}
                  onPress={() => setRecommendedAction(a)}
                  style={[styles.actionPill, selected ? styles.actionPillSelected : styles.actionPillUnselected]}
                >
                  <ThemedText type="caption" style={selected ? styles.actionTextSelected : styles.actionText}>
                    {a}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Notes (optional)
          </ThemedText>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            style={[
              styles.notesInput,
              { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
            ]}
            placeholder="Any key findings, measurements, or photo notes..."
            placeholderTextColor={theme.textSecondary}
          />
        </Card>

        <View style={{ height: 12 }} />

        <Button onPress={previewAndExport} style={styles.previewButton}>
          Preview / Export Report
        </Button>

        <View style={{ height: 22 }} />
      </View>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: Spacing.lg, gap: 14 },
  title: { marginBottom: 2 },
  subtitle: { opacity: 0.8, marginBottom: 10, lineHeight: 18 },

  sectionCard: { padding: Spacing.lg },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  propAddress: { lineHeight: 18 },
  propCoords: { marginTop: 6, opacity: 0.75 },

  sectionTitle: { marginBottom: 6 },
  helperText: { opacity: 0.75, marginBottom: 10 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  toggleLabel: { opacity: 0.85 },
  mutedCaption: { opacity: 0.55, fontSize: 11, lineHeight: 15 },
  metarErrorText: { color: "#dc2626", fontWeight: "600", lineHeight: 18 },
  metarSnapshotBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  metarLine: { lineHeight: 18, marginBottom: 4, opacity: 0.95 },
  autofillStatus: { color: "#16a34a", fontWeight: "600" },

  inputRow: { gap: 8 },
  inputLabel: { opacity: 0.85 },
  textInput: {
    width: "100%",
    minHeight: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 15,
  },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipUnselected: { borderColor: "#64748b", backgroundColor: "transparent" },
  chipSelected: { borderColor: AppColors.primary, backgroundColor: AppColors.primary },
  chipText: { color: "#334155" },
  chipTextSelected: { color: "#fff" },

  severityRow: { flexDirection: "row", gap: 10, justifyContent: "space-between", marginTop: 8 },
  severityDot: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  severityDotUnselected: { borderColor: "#64748b", backgroundColor: "transparent" },
  severityDotSelected: { borderColor: AppColors.primary, backgroundColor: AppColors.primary },
  sevText: { color: "#0f172a" },
  sevTextSelected: { color: "#fff", fontWeight: "700" },

  actionWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  actionPill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  actionPillUnselected: { borderColor: "#64748b", backgroundColor: "transparent" },
  actionPillSelected: { borderColor: AppColors.primary, backgroundColor: AppColors.primary },
  actionText: { color: "#334155" },
  actionTextSelected: { color: "#fff" },

  notesInput: {
    width: "100%",
    minHeight: 110,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    textAlignVertical: "top",
  },

  previewButton: { marginTop: 2 },

  kvRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 8 },
  kvLabel: { opacity: 0.85 },
  kvValue: { fontWeight: "700", color: AppColors.primary },

  autoButton: { width: "100%", marginTop: 2 },

  buildingRef: { fontWeight: "700", marginTop: 8 },
  buildingJurisdiction: { opacity: 0.8, marginTop: 4 },
  checkRow: { marginTop: 10 },
  checkLabel: { fontWeight: "600", opacity: 0.9 },
  checkDetails: { opacity: 0.75, marginTop: 4, lineHeight: 18 },

  thumbRow: { flexDirection: "row", gap: 12, paddingHorizontal: 2, paddingVertical: 2 },
  thumbWrap: { width: 110, height: 110, borderRadius: 10, overflow: "hidden", backgroundColor: "#0b1220" },
  thumb: { width: "100%", height: "100%" },
  reportLogoPreview: { width: 220, height: 55, resizeMode: "contain", borderRadius: 8 },
  thumbRemove: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(239,68,68,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
});

