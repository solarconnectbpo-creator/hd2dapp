import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  ImageIcon,
  Layers,
  Loader2,
  Palette,
  Share2,
  Sparkles,
  Target,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useAuth } from "../context/AuthContext";
import {
  AD_CREATIVE_DRAFTS_STORAGE_KEY,
  type AdCreativeDraftStored,
  loadJsonArray,
  loadMetaLastCampaignId,
  newDraftId,
  saveJsonArray,
  saveMetaLastCampaignId,
} from "../lib/localJsonStorage";
import { generateMarketingImage } from "../lib/marketingImageClient";
import {
  createMetaAdBundleDraft,
  createMetaCampaignDraft,
  fetchMetaConfig,
  fetchMetaPages,
  fetchMetaStatus,
  uploadMetaAdImage,
  type MetaPage,
} from "../lib/metaMarketingClient";
import { isHd2dApiConfigured } from "../lib/hd2dApiBase";

const cardChrome = "border-white/[0.07] ring-1 ring-white/[0.04]";
const inputClass =
  "w-full rounded-md border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-sm text-black placeholder:text-[#8b9199] focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30";
const textareaClass =
  "min-h-[100px] w-full rounded-md border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-sm text-black placeholder:text-[#8b9199] focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30";
const codeChip = "rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs text-[#e7e9ea]";

function draftLabel(d: AdCreativeDraftStored): string {
  const h = d.headline.trim();
  if (h) return h.length > 64 ? `${h.slice(0, 61)}…` : h;
  return "Creative draft";
}

/**
 * Ad maker automation — local creative drafts plus references for future platform APIs.
 */
export function AdMakerAutomation() {
  const { session, user } = useAuth();
  const token = session?.token ?? "";
  const canMeta = user?.user_type === "company" || user?.user_type === "admin";

  const [headline, setHeadline] = useState("");
  const [cta, setCta] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [drafts, setDrafts] = useState<AdCreativeDraftStored[]>([]);
  const [metaConnected, setMetaConnected] = useState(false);
  const [metaHasAdAccount, setMetaHasAdAccount] = useState(false);
  const [metaCampaignBusy, setMetaCampaignBusy] = useState(false);
  const [metaPages, setMetaPages] = useState<MetaPage[]>([]);

  const [imagePrompt, setImagePrompt] = useState("");
  const [imageSize, setImageSize] = useState<"1024x1024" | "1792x1024" | "1024x1792">("1024x1024");
  const [generatedImageDataUrl, setGeneratedImageDataUrl] = useState<string | null>(null);
  const [imageGenBusy, setImageGenBusy] = useState(false);

  const [adBundleCampaignId, setAdBundleCampaignId] = useState("");
  const [adBundlePageId, setAdBundlePageId] = useState("");
  const [adBundleLink, setAdBundleLink] = useState("");
  const [lastImageHash, setLastImageHash] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [adBundleBusy, setAdBundleBusy] = useState(false);

  useEffect(() => {
    if (!token || !canMeta || !isHd2dApiConfigured()) return;
    void (async () => {
      try {
        const cfg = await fetchMetaConfig(token);
        setMetaHasAdAccount(cfg.hasAdAccount);
        const ok = await fetchMetaStatus(token);
        setMetaConnected(ok);
      } catch {
        /* ignore */
      }
    })();
  }, [token, canMeta]);

  const persist = useCallback((next: AdCreativeDraftStored[]) => {
    const r = saveJsonArray(AD_CREATIVE_DRAFTS_STORAGE_KEY, next);
    if (!r.ok) toast.error(r.error);
  }, []);

  useEffect(() => {
    setDrafts(loadJsonArray<AdCreativeDraftStored>(AD_CREATIVE_DRAFTS_STORAGE_KEY, []));
    setAdBundleCampaignId(loadMetaLastCampaignId());
  }, []);

  useEffect(() => {
    if (!token || !canMeta || !metaConnected || !isHd2dApiConfigured()) return;
    void (async () => {
      try {
        const pages = await fetchMetaPages(token);
        setMetaPages(pages);
        setAdBundlePageId((prev) => prev || pages[0]?.id || "");
      } catch {
        /* ignore */
      }
    })();
  }, [token, canMeta, metaConnected]);

  const composedCopy = () =>
    [headline.trim(), body.trim(), cta.trim()].filter(Boolean).join("\n\n");

  const saveDraft = () => {
    if (!headline.trim() && !cta.trim() && !body.trim() && !generatedImageDataUrl) {
      toast.message("Add copy or generate an image first");
      return;
    }
    const entry: AdCreativeDraftStored = {
      id: newDraftId(),
      headline: headline.trim(),
      cta: cta.trim(),
      body: body.trim(),
      savedAt: new Date().toISOString(),
      imageDataUrl: generatedImageDataUrl || undefined,
      imagePrompt: imagePrompt.trim() || undefined,
      linkUrl: linkUrl.trim() || undefined,
    };
    const next = [entry, ...drafts];
    setDrafts(next);
    persist(next);
    setHeadline("");
    setCta("");
    setBody("");
    setLinkUrl("");
    setGeneratedImageDataUrl(null);
    setImagePrompt("");
    toast.success("Creative saved in this browser");
  };

  const applyDraft = (d: AdCreativeDraftStored) => {
    setHeadline(d.headline);
    setCta(d.cta);
    setBody(d.body);
    setLinkUrl(d.linkUrl || "");
    setGeneratedImageDataUrl(d.imageDataUrl || null);
    setImagePrompt(d.imagePrompt || "");
    toast.message("Loaded draft into editor");
  };

  const removeDraft = (id: string) => {
    const next = drafts.filter((d) => d.id !== id);
    setDrafts(next);
    persist(next);
  };

  return (
    <div className="hd2d-page-shell">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4 text-black hover:bg-white/[0.06]">
          <Link to="/marketing" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Marketing
          </Link>
        </Button>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8b9199]">Marketing</p>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-black sm:text-3xl">Ad maker automation</h1>
        <p className="max-w-3xl text-sm text-[#8b9199]">
          Build headline, CTA, and body variants locally. Connect Meta on Social media, then create a PAUSED draft campaign in
          your ad account from this page (company/admin). Saved in this browser only.
        </p>
      </div>

      {canMeta ? (
        <Card className={`mb-8 ${cardChrome} border-blue-500/20 bg-blue-500/[0.04]`}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-blue-400" aria-hidden />
              <CardTitle className="text-black">Meta Ads — draft campaign</CardTitle>
            </div>
            <CardDescription className="text-[#8b9199]">
              Creates a <strong className="text-black">PAUSED</strong> traffic campaign in the ad account set as{" "}
              <code className={codeChip}>META_DEFAULT_AD_ACCOUNT_ID</code> on the Worker. Finish targeting and creative in Ads
              Manager. Requires Meta connected (Marketing → Social) and <code className={codeChip}>ads_management</code>{" "}
              approval on your Meta app.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              disabled={
                metaCampaignBusy ||
                !token ||
                !metaConnected ||
                !metaHasAdAccount ||
                !isHd2dApiConfigured()
              }
              onClick={() => {
                if (!token) return;
                setMetaCampaignBusy(true);
                void (async () => {
                  try {
                    const name =
                      headline.trim() ||
                      `HD2D draft ${new Date().toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}`;
                    const { campaignId, adsManagerUrl } = await createMetaCampaignDraft(token, name);
                    if (campaignId) {
                      saveMetaLastCampaignId(campaignId);
                      setAdBundleCampaignId(campaignId);
                    }
                    toast.success("Draft campaign created — opening Ads Manager");
                    window.open(adsManagerUrl, "_blank", "noopener,noreferrer");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Campaign draft failed");
                  } finally {
                    setMetaCampaignBusy(false);
                  }
                })();
              }}
            >
              {metaCampaignBusy ? "Creating…" : "Create PAUSED draft campaign"}
            </Button>
            {!isHd2dApiConfigured() ? (
              <span className="text-xs text-amber-200/90">Worker not configured.</span>
            ) : !metaHasAdAccount ? (
              <span className="text-xs text-[#8b9199]">Set META_DEFAULT_AD_ACCOUNT_ID on the Worker.</span>
            ) : !metaConnected ? (
              <span className="text-xs text-[#8b9199]">
                Connect Meta under <Link className="text-sky-400 underline" to="/marketing/social">Social media</Link>.
              </span>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {canMeta && isHd2dApiConfigured() && token ? (
        <Card className={`mb-8 ${cardChrome} border-violet-500/20 bg-violet-500/[0.04]`}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-400" aria-hidden />
              <CardTitle className="text-black">AI image for ads</CardTitle>
            </div>
            <CardDescription className="text-[#8b9199]">
              Generates a PNG via the Worker (OpenAI Images). Images stay in this browser until you upload to Meta or save a
              draft. Rate-limited per user on the server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <label className="min-w-[200px] flex-1 text-sm">
                <span className="mb-1 block font-medium text-black">Prompt</span>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Professional roofing crew on a suburban home, sunny, banner ad style"
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                />
              </label>
              <label className="w-full sm:w-40 text-sm">
                <span className="mb-1 block font-medium text-black">Size</span>
                <select
                  className={inputClass}
                  value={imageSize}
                  onChange={(e) => setImageSize(e.target.value as typeof imageSize)}
                >
                  <option value="1024x1024">1024×1024</option>
                  <option value="1792x1024">1792×1024</option>
                  <option value="1024x1792">1024×1792</option>
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                disabled={imageGenBusy || !imagePrompt.trim()}
                onClick={() => {
                  if (!token) return;
                  setImageGenBusy(true);
                  void (async () => {
                    try {
                      const { b64_json, mimeType } = await generateMarketingImage(token, {
                        prompt: imagePrompt.trim(),
                        size: imageSize,
                      });
                      setGeneratedImageDataUrl(`data:${mimeType};base64,${b64_json}`);
                      setLastImageHash(null);
                      toast.success("Image generated");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Image generation failed");
                    } finally {
                      setImageGenBusy(false);
                    }
                  })();
                }}
              >
                {imageGenBusy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Generate image
                  </>
                )}
              </Button>
              {generatedImageDataUrl ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setGeneratedImageDataUrl(null)}>
                  Clear preview
                </Button>
              ) : null}
            </div>
            {generatedImageDataUrl ? (
              <div className="flex flex-wrap gap-4 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
                <img
                  src={generatedImageDataUrl}
                  alt="Generated preview"
                  className="max-h-48 max-w-full rounded-md border border-white/[0.08] object-contain"
                />
                {metaConnected && metaHasAdAccount ? (
                  <div className="flex min-w-[200px] flex-col justify-center gap-2 text-xs text-[#8b9199]">
                    <p>
                      <strong className="text-black">Meta hash:</strong> {lastImageHash || "— upload to get hash"}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      disabled={uploadBusy}
                      onClick={() => {
                        if (!token || !generatedImageDataUrl) return;
                        setUploadBusy(true);
                        void (async () => {
                          try {
                            const hash = await uploadMetaAdImage(token, generatedImageDataUrl);
                            if (hash) {
                              setLastImageHash(hash);
                              toast.success("Image uploaded to Meta ad library");
                            } else {
                              toast.error("No hash returned");
                            }
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Upload failed");
                          } finally {
                            setUploadBusy(false);
                          }
                        })();
                      }}
                    >
                      {uploadBusy ? "Uploading…" : "Upload to Meta (ad image)"}
                    </Button>
                  </div>
                ) : (
                  <p className="max-w-sm self-center text-xs text-[#8b9199]">
                    Connect Meta on Social media to upload this image to your ad account.
                  </p>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {canMeta && metaConnected && metaHasAdAccount && isHd2dApiConfigured() && token ? (
        <Card className={`mb-8 ${cardChrome} border-emerald-500/20 bg-emerald-500/[0.04]`}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-emerald-400" aria-hidden />
              <CardTitle className="text-black">Meta — PAUSED ad set + creative + ad</CardTitle>
            </div>
            <CardDescription className="text-[#8b9199]">
              Uses an existing campaign (create one above first). Uploads optional image hash, then creates a minimal PAUSED ad
              bundle. Finish targeting in Ads Manager.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-black">Campaign ID</span>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="From “Create PAUSED draft campaign” or paste from Ads Manager"
                  value={adBundleCampaignId}
                  onChange={(e) => setAdBundleCampaignId(e.target.value)}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-black">Facebook Page</span>
                <select
                  className={inputClass}
                  value={adBundlePageId}
                  onChange={(e) => setAdBundlePageId(e.target.value)}
                >
                  {metaPages.length === 0 ? (
                    <option value="">No pages — refresh after Meta connect</option>
                  ) : (
                    metaPages.map((pg) => (
                      <option key={pg.id} value={pg.id}>
                        {pg.name}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-black">Landing URL (required)</span>
                <input
                  type="url"
                  className={inputClass}
                  placeholder="https://your-site.com/offer"
                  value={adBundleLink}
                  onChange={(e) => setAdBundleLink(e.target.value)}
                />
              </label>
            </div>
            <p className="text-xs text-[#8b9199]">
              Ad primary text defaults to headline + body + CTA from the editor above. Set{" "}
              <strong className="text-black">Landing URL</strong> here (or fill <strong className="text-black">Landing page</strong>{" "}
              in the creative form — ad bundle uses the field below if set, otherwise the creative form link).
            </p>
            <Button
              type="button"
              disabled={
                adBundleBusy ||
                !token ||
                !adBundleCampaignId.trim() ||
                !adBundlePageId ||
                !(adBundleLink.trim() || linkUrl.trim())
              }
              onClick={() => {
                if (!token) return;
                const dest = adBundleLink.trim() || linkUrl.trim();
                if (!dest) {
                  toast.error("Add a landing URL");
                  return;
                }
                const msg = composedCopy().trim();
                if (!msg) {
                  toast.error("Add headline, body, or CTA above");
                  return;
                }
                setAdBundleBusy(true);
                void (async () => {
                  try {
                    const { adsManagerUrl } = await createMetaAdBundleDraft(token, {
                      campaignId: adBundleCampaignId.trim(),
                      pageId: adBundlePageId,
                      linkUrl: dest,
                      message: msg,
                      headline: headline.trim() || undefined,
                      imageHash: lastImageHash || undefined,
                    });
                    toast.success("Ad bundle created — opening Ads Manager");
                    if (adsManagerUrl) window.open(adsManagerUrl, "_blank", "noopener,noreferrer");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Ad bundle failed");
                  } finally {
                    setAdBundleBusy(false);
                  }
                })();
              }}
            >
              {adBundleBusy ? "Creating…" : "Create PAUSED ad bundle"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className={`lg:col-span-2 ${cardChrome}`}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" />
              <CardTitle className="text-black">Creative variants</CardTitle>
            </div>
            <CardDescription className="text-[#8b9199]">
              Headline + body + CTA combinations for A/B tests. Start from a template per service line (repair, replace,
              storm).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-black">Headline</span>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Hail damage? Free roof inspection"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-black">Primary CTA</span>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Book inspection"
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-black">Body copy</span>
              <textarea
                className={textareaClass}
                placeholder="Short value prop + offer + local proof…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-black">Landing page (optional)</span>
              <input
                type="url"
                className={inputClass}
                placeholder="https://… — used for Meta link ads & Social schedule"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
            </label>
            <p className="text-xs text-[#8b9199]">Saved in this browser only.</p>
            <Button type="button" onClick={saveDraft}>
              Save creative draft
            </Button>
            {drafts.length > 0 ? (
              <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8b9199]">Saved creatives</p>
                <ul className="max-h-[240px] space-y-2 overflow-y-auto">
                  {drafts.map((d) => (
                    <li
                      key={d.id}
                      className="flex gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3 text-left"
                    >
                      {d.imageDataUrl ? (
                        <img
                          src={d.imageDataUrl}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-md border border-white/[0.08] object-cover"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-black">{draftLabel(d)}</p>
                        {d.cta ? <p className="mt-0.5 text-xs text-sky-400">CTA: {d.cta}</p> : null}
                        {d.body ? <p className="mt-1 line-clamp-2 text-xs text-[#8b9199]">{d.body}</p> : null}
                        {d.linkUrl ? (
                          <p className="mt-1 truncate text-[10px] text-sky-400/90">{d.linkUrl}</p>
                        ) : null}
                        <p className="mt-1 text-[10px] text-[#8b9199]">
                          {new Date(d.savedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2 h-7 text-xs"
                          onClick={() => applyDraft(d)}
                        >
                          Load into editor
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-[#8b9199] hover:bg-red-500/10 hover:text-red-300"
                        aria-label="Delete draft"
                        onClick={() => removeDraft(d.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className={cardChrome}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-rose-400" />
                <CardTitle className="text-base text-black">Audiences</CardTitle>
              </div>
              <CardDescription className="text-[#8b9199]">
                Radius around canvass pins, ZIP lists, or storm polygons.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-[#8b9199]">
              Sync with Canvassing leads or import CSV — future: push as custom audiences where the platform allows.
            </CardContent>
          </Card>
          <Card className={cardChrome}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-indigo-400" />
                <CardTitle className="text-base text-black">Brand kit</CardTitle>
              </div>
              <CardDescription className="text-[#8b9199]">Logo and colors from Contacts &amp; settings.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-[#8b9199]">
              Pull <code className={codeChip}>logoDataUrl</code> into exported creatives or HTML5 bundles.
            </CardContent>
          </Card>
          <Card className={cardChrome}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-teal-400" />
                <CardTitle className="text-base text-black">Export</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-[#8b9199]">
              CSV / JSON lines for bulk editor tools; optional direct API placement in a later milestone.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
