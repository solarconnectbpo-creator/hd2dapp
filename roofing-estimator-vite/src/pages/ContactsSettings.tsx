import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Building2,
  Download,
  Layers,
  Loader2,
  MapPin,
  Save,
  Upload,
  UserRound,
  FileSpreadsheet,
  ExternalLink,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { LeadsMap } from "../components/LeadsMap";
import {
  type ContactRecord,
  CONTACTS_CSV_TEMPLATE_HEADERS,
  parseContactsCsv,
} from "../lib/contactsCsv";
import { geocodeContactsMissing } from "../lib/geocodeContact";
import {
  loadContactsFromStorage,
  loadOrgSettings,
  type OrgSettings,
  saveContactsToStorageSafe,
  saveOrgSettingsSafe,
} from "../lib/orgSettings";

function canAutoEstimateFromContact(c: ContactRecord): boolean {
  const a = Number.parseFloat(c.areaSqFt ?? "");
  const sq = Number.parseFloat(c.measuredSquares ?? "");
  return (Number.isFinite(a) && a > 0) || (Number.isFinite(sq) && sq > 0);
}

async function compressLogoToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const maxEdge = 360;
    const w = bitmap.width;
    const h = bitmap.height;
    const scale = Math.min(1, maxEdge / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No canvas context");
    ctx.drawImage(bitmap, 0, 0, cw, ch);
    return canvas.toDataURL("image/png", 0.9);
  } finally {
    bitmap.close();
  }
}

/** Smaller JPEG fallback when PNG logo exceeds storage quota. */
async function compressLogoAggressiveToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const maxEdge = 220;
    const w = bitmap.width;
    const h = bitmap.height;
    const scale = Math.min(1, maxEdge / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No canvas context");
    ctx.drawImage(bitmap, 0, 0, cw, ch);
    return canvas.toDataURL("image/jpeg", 0.72);
  } finally {
    bitmap.close();
  }
}

export function ContactsSettings() {
  const navigate = useNavigate();
  const csvInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const orgRef = useRef<OrgSettings>(loadOrgSettings());
  const [org, setOrg] = useState<OrgSettings>(() => loadOrgSettings());
  const [contacts, setContacts] = useState<ContactRecord[]>(() => loadContactsFromStorage());
  const [replaceOnImport, setReplaceOnImport] = useState(false);
  const [banner, setBanner] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [geocodeBusy, setGeocodeBusy] = useState(false);

  useEffect(() => {
    orgRef.current = org;
  }, [org]);

  useEffect(() => {
    const r = saveContactsToStorageSafe(contacts);
    if (!r.ok && contacts.length > 0) {
      setBanner({ kind: "error", text: r.message });
    }
  }, [contacts]);

  const persistOrg = useCallback(() => {
    const r = saveOrgSettingsSafe(org);
    if (!r.ok) {
      setBanner({ kind: "error", text: r.message });
      return;
    }
    window.dispatchEvent(new Event("roofing-org-updated"));
    setBanner({ kind: "success", text: "Settings saved to this browser." });
    window.setTimeout(() => setBanner(null), 5000);
  }, [org]);

  const onCsv = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onerror = () => {
        setBanner({ kind: "error", text: "Could not read the CSV file. Try another export or re-save as UTF-8 CSV." });
      };
      reader.onload = () => {
        const text = String(reader.result || "").trim();
        if (!text) {
          setBanner({ kind: "error", text: "CSV file is empty." });
          return;
        }
        const parsed = parseContactsCsv(text);
        if (parsed.length === 0) {
          setBanner({
            kind: "error",
            text: 'No contact rows found after the header row. Use the template columns (name, address, city, state, zip, …).',
          });
          return;
        }
        setContacts((prev) => (replaceOnImport ? parsed : [...prev, ...parsed]));
        setBanner({ kind: "success", text: `Imported ${parsed.length} row(s).` });
        window.setTimeout(() => setBanner(null), 5000);
      };
      reader.readAsText(file);
    },
    [replaceOnImport],
  );

  const onGeocodeLeads = useCallback(async () => {
    if (contacts.length === 0) return;
    setGeocodeBusy(true);
    setBanner(null);
    try {
      const { next, updated } = await geocodeContactsMissing(contacts);
      setContacts(next);
      setBanner({
        kind: "success",
        text: updated
          ? `Geocoded ${updated} address(es). Open markers on the map below.`
          : "No rows needed geocoding, or addresses were too empty for lookup.",
      });
      window.setTimeout(() => setBanner(null), 6000);
    } catch {
      setBanner({ kind: "error", text: "Geocoding failed. Check your connection and try again." });
    } finally {
      setGeocodeBusy(false);
    }
  }, [contacts]);

  const downloadTemplate = useCallback(() => {
    const blob = new Blob(
      [
        `${CONTACTS_CSV_TEMPLATE_HEADERS}\n` +
          "Jane Homeowner,,jane@email.com,555-0100,123 Main St,Springfield,IL,62701,,,2400,,Asphalt Shingle,6/12,180,12,Example row\n",
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "roofing-contacts-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  const openContact = useCallback(
    (c: ContactRecord, auto: boolean) => {
      const q = new URLSearchParams();
      q.set("contactId", c.id);
      if (auto) q.set("auto", "1");
      navigate(`/measurement/new?${q.toString()}`);
    },
    [navigate],
  );

  const openContactById = useCallback(
    (id: string, auto: boolean) => {
      const c = contacts.find((x) => x.id === id);
      if (c) openContact(c, auto);
    },
    [contacts, openContact],
  );

  const contactRows = useMemo(
    () =>
      contacts.map((c) => ({
        c,
        canAuto: canAutoEstimateFromContact(c),
      })),
    [contacts],
  );

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-black">Contacts &amp; settings</h1>
        <p className="text-black">
          Upload a contact list (CSV), set company branding and report defaults. Everything is stored locally in your
          browser.
        </p>
      </div>

      {banner ? (
        <div
          className={
            banner.kind === "error"
              ? "mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900"
              : "mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-900"
          }
        >
          {banner.text}
        </div>
      ) : null}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Company &amp; branding
            </CardTitle>
            <CardDescription>Used on printed proposals and PDF exports from the estimator.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm">
                <span className="text-black block mb-1">Company name</span>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={org.companyName}
                  onChange={(e) => setOrg((o) => ({ ...o, companyName: e.target.value }))}
                />
              </label>
              <label className="text-sm">
                <span className="text-black block mb-1">Prepared by</span>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={org.preparedBy}
                  onChange={(e) => setOrg((o) => ({ ...o, preparedBy: e.target.value }))}
                />
              </label>
              <label className="text-sm md:col-span-2">
                <span className="text-black block mb-1">Company address</span>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Street, City, ST ZIP"
                  value={org.companyAddress}
                  onChange={(e) => setOrg((o) => ({ ...o, companyAddress: e.target.value }))}
                />
              </label>
              <label className="text-sm">
                <span className="text-black block mb-1">Website</span>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="https://"
                  value={org.companyWebsite}
                  onChange={(e) => setOrg((o) => ({ ...o, companyWebsite: e.target.value }))}
                />
              </label>
              <label className="text-sm">
                <span className="text-black block mb-1">Estimator email</span>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={org.contactEmail}
                  onChange={(e) => setOrg((o) => ({ ...o, contactEmail: e.target.value }))}
                />
              </label>
              <label className="text-sm">
                <span className="text-black block mb-1">Estimator phone</span>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={org.contactPhone}
                  onChange={(e) => setOrg((o) => ({ ...o, contactPhone: e.target.value }))}
                />
              </label>
              <label className="text-sm">
                <span className="text-black block mb-1">Default report template</span>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={org.defaultTemplateProfile}
                  onChange={(e) =>
                    setOrg((o) => ({ ...o, defaultTemplateProfile: e.target.value as OrgSettings["defaultTemplateProfile"] }))
                  }
                >
                  <option value="residential">Residential (inclusions, warranty, payment text)</option>
                  <option value="commercial">Commercial</option>
                </select>
              </label>
            </div>
            <div>
              <span className="text-black text-sm block mb-2">Logo (PNG/JPG, shown on proposals)</span>
              <div className="flex flex-wrap items-center gap-4">
                {org.logoDataUrl ? (
                  <img src={org.logoDataUrl} alt="Logo" className="h-16 w-auto max-w-[200px] object-contain border rounded" />
                ) : (
                  <span className="text-sm text-black">No logo uploaded</span>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    const base = orgRef.current;
                    try {
                      let url = await compressLogoToDataUrl(f);
                      let next: OrgSettings = { ...base, logoDataUrl: url };
                      let r = saveOrgSettingsSafe(next);
                      if (!r.ok) {
                        url = await compressLogoAggressiveToDataUrl(f);
                        next = { ...base, logoDataUrl: url };
                        r = saveOrgSettingsSafe(next);
                      }
                      if (!r.ok) {
                        setBanner({ kind: "error", text: r.message });
                        return;
                      }
                      setOrg(next);
                      orgRef.current = next;
                      setBanner({ kind: "success", text: "Logo saved to this browser." });
                      window.setTimeout(() => setBanner(null), 4000);
                    } catch {
                      setBanner({ kind: "error", text: "Could not read that image." });
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-1" />
                  Upload logo
                </Button>
                {org.logoDataUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const base = orgRef.current;
                      const next = { ...base, logoDataUrl: "" };
                      const r = saveOrgSettingsSafe(next);
                      if (!r.ok) {
                        setBanner({ kind: "error", text: r.message });
                        return;
                      }
                      setOrg(next);
                      orgRef.current = next;
                      setBanner({ kind: "success", text: "Logo removed." });
                      window.setTimeout(() => setBanner(null), 4000);
                    }}
                  >
                    Remove logo
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-black">
                <Layers className="h-4 w-4 text-black" />
                Canvassing map — ArcGIS overlay
              </h3>
              <p className="mb-4 text-xs text-black">
                Draw public (or secured) <strong>Feature Server</strong> polygons/lines on the satellite map. Paste the
                layer URL through <code className="rounded bg-gray-100 px-1">/FeatureServer/&lt;id&gt;</code> (no{" "}
                <code className="rounded bg-gray-100 px-1">/query</code>). Optional token for private portals. Env
                overrides: <code className="rounded bg-gray-100 px-1">VITE_ARCGIS_FEATURE_LAYER_URL</code>,{" "}
                <code className="rounded bg-gray-100 px-1">VITE_ARCGIS_API_KEY</code>. Canvassing also runs an
                ArcGIS REST <strong>point-in-parcel</strong> query on the same layer so owner fields can load even when
                you click off the drawn polygon. Some county servers block browser CORS from localhost — use a public
                layer on <code className="rounded bg-gray-100 px-1">arcgis.com</code> or deploy behind a same-origin
                proxy if needed.
              </p>
              <div className="space-y-3">
                <label className="text-sm block">
                  <span className="text-black mb-1 block">Feature layer URL</span>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs"
                    placeholder="https://services.arcgis.com/.../FeatureServer/0"
                    value={org.arcgisFeatureLayerUrl}
                    onChange={(e) => setOrg((o) => ({ ...o, arcgisFeatureLayerUrl: e.target.value }))}
                  />
                </label>
                <label className="text-sm block">
                  <span className="text-black mb-1 block">API key / token (optional)</span>
                  {import.meta.env.VITE_ARCGIS_API_KEY ? (
                    <p className="mb-2 text-xs text-emerald-800">
                      <strong>Saved for this app:</strong> <code className="rounded bg-emerald-50 px-1">VITE_ARCGIS_API_KEY</code> is set
                      in <code className="rounded bg-emerald-50 px-1">.env.local</code> and is copied into browser storage here on first
                      load (if this field was empty). Restart the dev server after changing the env file.
                    </p>
                  ) : null}
                  <input
                    type="password"
                    autoComplete="off"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="If the service requires authentication"
                    value={org.arcgisApiKey}
                    onChange={(e) => setOrg((o) => ({ ...o, arcgisApiKey: e.target.value }))}
                  />
                </label>
              </div>
            </div>

            <Button onClick={persistOrg}>
              <Save className="w-4 h-4 mr-2" />
              Save company &amp; mapping settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Contacts (CSV)
            </CardTitle>
            <CardDescription>
              Columns supported: name, company, email, phone, address, city, state, zip, lat, lng, area_sqft,
              measured_squares, roof_type, roof_pitch, perimeter_ft, waste_percent, notes. Include{" "}
              <strong>area_sqft</strong> or <strong>measured_squares</strong> to enable &quot;Open &amp; run estimate&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download CSV template
              </Button>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) onCsv(f);
                }}
              />
              <Button type="button" variant="default" size="sm" onClick={() => csvInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Upload CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={contacts.length === 0 || geocodeBusy}
                onClick={() => void onGeocodeLeads()}
              >
                {geocodeBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
                Geocode addresses
              </Button>
              <label className="flex items-center gap-2 text-sm text-black cursor-pointer">
                <input type="checkbox" checked={replaceOnImport} onChange={(e) => setReplaceOnImport(e.target.checked)} />
                Replace all contacts (otherwise append)
              </label>
              <span className="text-sm text-black">{contacts.length} saved</span>
            </div>

            {contactRows.length === 0 ? (
              <p className="text-sm text-black">No contacts yet. Upload a CSV or add rows from the estimator map page.</p>
            ) : (
              <>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-black flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Leads map
                  </h3>
                  <p className="text-xs text-black">
                    Click a marker or a table row to highlight a lead. Popups can open the estimator for that property.
                  </p>
                  <LeadsMap
                    contacts={contacts}
                    selectedId={selectedLeadId}
                    onSelectContact={setSelectedLeadId}
                    onOpenContact={(id) => openContactById(id, false)}
                  />
                </div>

                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-black">
                      <tr>
                        <th className="p-2 font-medium">Name</th>
                        <th className="p-2 font-medium">Location</th>
                        <th className="p-2 font-medium">Area / SQ</th>
                        <th className="p-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contactRows.map(({ c, canAuto }) => (
                        <tr
                          key={c.id}
                          className={`border-t border-gray-100 cursor-pointer ${selectedLeadId === c.id ? "bg-blue-50" : "hover:bg-gray-50"}`}
                          onClick={() => setSelectedLeadId(c.id)}
                        >
                          <td className="p-2">
                            <div className="font-medium text-black">{c.name || "—"}</div>
                            <div className="text-black text-xs">{c.email || c.phone || ""}</div>
                          </td>
                          <td className="p-2 text-black">
                            {[c.address, c.city, c.state].filter(Boolean).join(", ") || "—"}
                          </td>
                          <td className="p-2 text-black">
                            {c.areaSqFt ? `${c.areaSqFt} SF` : "—"}
                            {c.measuredSquares ? ` · ${c.measuredSquares} SQ` : ""}
                          </td>
                          <td className="p-2 text-right whitespace-nowrap">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="mr-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                openContact(c, false);
                              }}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Open
                            </Button>
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              disabled={!canAuto}
                              title={canAuto ? "Runs estimate from CSV numbers" : "Add area_sqft or measured_squares in CSV"}
                              onClick={(e) => {
                                e.stopPropagation();
                                openContact(c, true);
                              }}
                            >
                              Open &amp; run
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <p className="text-xs text-black">
              Tip: Use <strong>Geocode addresses</strong> above (or bulk geocode on{" "}
              <Link className="text-black underline" to="/measurement/new">
                New Measurement
              </Link>
              ) so leads appear on the map.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="w-5 h-5" />
              Estimator
            </CardTitle>
            <CardDescription>Jump to the full measurement and proposal workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/measurement/new">
              <Button variant="outline">Go to New Measurement</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
