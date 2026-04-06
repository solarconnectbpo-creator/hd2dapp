import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  ArrowLeft,
  CalendarClock,
  Hash,
  ImageIcon,
  MessageSquare,
  Repeat,
  Share2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useAuth } from "../context/AuthContext";
import {
  AD_CREATIVE_DRAFTS_STORAGE_KEY,
  type AdCreativeDraftStored,
  loadJsonArray,
  newDraftId,
  saveJsonArray,
  SOCIAL_DRAFTS_STORAGE_KEY,
} from "../lib/localJsonStorage";
import {
  deleteMetaScheduled,
  disconnectMeta,
  fetchMetaConfig,
  fetchMetaPages,
  fetchMetaStatus,
  listMetaScheduled,
  scheduleMetaPagePost,
  startMetaOAuth,
  type MetaPage,
  type MetaScheduledRow,
} from "../lib/metaMarketingClient";
import { isHd2dApiConfigured } from "../lib/hd2dApiBase";
import { getScopedStorageKey } from "../lib/userScopedStorage";

const cardChrome = "border-white/[0.07] ring-1 ring-white/[0.04]";
const fieldClass =
  "min-h-[120px] w-full rounded-md border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-sm text-[var(--x-text)] placeholder:text-[#8b9199] focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30";
const inputRowClass =
  "w-full rounded-md border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-sm text-[var(--x-text)] placeholder:text-[#8b9199] focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30";

type SocialDraft = {
  id: string;
  body: string;
  savedAt: string;
};

function titleFromBody(body: string): string {
  const line = body.trim().split(/\r?\n/)[0]?.trim() || "";
  if (line.length > 72) return `${line.slice(0, 69)}…`;
  return line || "Draft";
}

/**
 * Social media posting & automation — local drafts plus references for future provider hooks.
 */
function formatScheduledRow(r: MetaScheduledRow): string {
  const when = new Date(r.scheduled_unix * 1000).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  return `${r.page_name || r.page_id} · ${when} · ${r.status}`;
}

function packToPostMessage(d: AdCreativeDraftStored): string {
  return [d.headline.trim(), d.body.trim(), d.cta.trim()].filter(Boolean).join("\n\n");
}

export function SocialMediaAutomation() {
  const { session, user } = useAuth();
  const token = session?.token ?? "";
  const canMeta = user?.user_type === "company" || user?.user_type === "admin";
  const isAdmin = user?.user_type === "admin";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [draftText, setDraftText] = useState("");
  const [drafts, setDrafts] = useState<SocialDraft[]>([]);

  const [metaConfigured, setMetaConfigured] = useState(false);
  const [metaOAuthRedirectUri, setMetaOAuthRedirectUri] = useState<string | null>(null);
  const [metaConnected, setMetaConnected] = useState(false);
  const [metaBusy, setMetaBusy] = useState(false);
  const [metaPages, setMetaPages] = useState<MetaPage[]>([]);
  const [metaScheduled, setMetaScheduled] = useState<MetaScheduledRow[]>([]);
  const [schedulePageId, setSchedulePageId] = useState("");
  const [scheduleMessage, setScheduleMessage] = useState("");
  const [scheduleLink, setScheduleLink] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [creativePacks, setCreativePacks] = useState<AdCreativeDraftStored[]>([]);
  const [selectedPackId, setSelectedPackId] = useState("");

  /** Shown when Worker omits APP_PUBLIC_ORIGIN — Meta still needs this exact URI in the app settings. */
  const spaOAuthCallbackUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin.replace(/\/$/, "")}/api/meta/oauth/callback`;
  }, []);

  const oauthRedirectDisplay =
    (metaOAuthRedirectUri && metaOAuthRedirectUri.trim()) || spaOAuthCallbackUrl || null;
  const oauthUriFromWorkerOnly = Boolean(metaOAuthRedirectUri?.trim());

  const adCreativeDraftsStorageResolved = useMemo(
    () => getScopedStorageKey(AD_CREATIVE_DRAFTS_STORAGE_KEY),
    [user?.id],
  );

  const refreshCreativePacks = useCallback(() => {
    setCreativePacks(loadJsonArray<AdCreativeDraftStored>(AD_CREATIVE_DRAFTS_STORAGE_KEY, []));
  }, []);

  const refreshMeta = useCallback(async () => {
    if (!token || !canMeta || !isHd2dApiConfigured()) return;
    try {
      const cfg = await fetchMetaConfig(token);
      setMetaConfigured(cfg.configured);
      setMetaOAuthRedirectUri(cfg.oauthRedirectUri);
      const connected = await fetchMetaStatus(token);
      setMetaConnected(connected);
      if (connected) {
        const pages = await fetchMetaPages(token);
        setMetaPages(pages);
        setSchedulePageId((prev) => prev || pages[0]?.id || "");
        const rows = await listMetaScheduled(token);
        setMetaScheduled(rows);
      } else {
        setMetaPages([]);
        setMetaScheduled([]);
      }
    } catch (e) {
      console.warn("[meta] refresh", e);
    }
  }, [token, canMeta]);

  useEffect(() => {
    const ok = searchParams.get("meta_connected");
    const err = searchParams.get("meta_error");
    if (ok) {
      toast.success("Meta connected — you can schedule Page posts.");
      navigate("/marketing/social", { replace: true });
    }
    if (err) {
      toast.error(decodeURIComponent(err));
      navigate("/marketing/social", { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    void refreshMeta();
  }, [refreshMeta]);

  useEffect(() => {
    refreshCreativePacks();
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === adCreativeDraftsStorageResolved || ev.key === null) refreshCreativePacks();
    };
    const onFocus = () => refreshCreativePacks();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshCreativePacks, adCreativeDraftsStorageResolved]);

  const persist = useCallback((next: SocialDraft[]) => {
    const r = saveJsonArray(SOCIAL_DRAFTS_STORAGE_KEY, next);
    if (!r.ok) toast.error(r.error);
  }, []);

  useEffect(() => {
    setDrafts(loadJsonArray<SocialDraft>(SOCIAL_DRAFTS_STORAGE_KEY, []));
  }, [user?.id]);

  const saveDraft = () => {
    const body = draftText.trim();
    if (!body) {
      toast.message("Write something first");
      return;
    }
    const entry: SocialDraft = { id: newDraftId(), body, savedAt: new Date().toISOString() };
    const next = [entry, ...drafts];
    setDrafts(next);
    persist(next);
    setDraftText("");
    toast.success("Draft saved in this browser");
  };

  const removeDraft = (id: string) => {
    const next = drafts.filter((d) => d.id !== id);
    setDrafts(next);
    persist(next);
  };

  return (
    <div className="hd2d-page-shell">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4 text-[var(--x-text)] hover:bg-white/[0.06]">
          <Link to="/marketing" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Marketing
          </Link>
        </Button>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8b9199]">Marketing</p>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-[var(--x-text)] sm:text-3xl">
          Social media posting &amp; automation
        </h1>
        <p className="max-w-3xl text-sm text-[#8b9199]">
          Draft posts locally, or connect Meta (Facebook) to schedule real Page posts (10 minutes–75 days out). Company and
          admin accounts only.
        </p>
      </div>

      {canMeta ? (
        <Card className={`mb-8 ${cardChrome} border-blue-500/20 bg-blue-500/[0.04]`}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-blue-400" aria-hidden />
              <CardTitle className="text-[var(--x-text)]">Meta (Facebook) — schedule Page posts</CardTitle>
            </div>
            <CardDescription className="text-[#8b9199]">
              {isAdmin ? (
                <>
                  Uses your Facebook Page (not personal profile). In Meta Developer Console → Facebook Login → Valid OAuth
                  Redirect URIs, add the exact URL below. It must match this app&apos;s origin +{" "}
                  <code className="font-mono text-[0.85em]">/api/meta/oauth/callback</code> and the Worker&apos;s{" "}
                  <code className="font-mono text-[0.85em]">APP_PUBLIC_ORIGIN</code> (no trailing slash).
                </>
              ) : (
                <>
                  Uses your Facebook Page (not your personal profile). Add the redirect URL below to your Meta app&apos;s{" "}
                  <strong>Valid OAuth Redirect URIs</strong> (exact match). Ask your administrator if you are unsure which
                  URL to use.
                </>
              )}
            </CardDescription>
            {oauthRedirectDisplay ? (
              <div className="mt-2 space-y-2">
                <p className="break-all rounded-md bg-white/[0.06] px-2 py-1.5 font-mono text-xs text-[#e7e9ea]">
                  {oauthRedirectDisplay}
                </p>
                {isAdmin && !oauthUriFromWorkerOnly && spaOAuthCallbackUrl ? (
                  <p className="text-xs text-amber-200/90" role="status">
                    Worker did not return a redirect URI yet — showing this site&apos;s callback URL. Set{" "}
                    <code className="rounded bg-white/[0.08] px-1 font-mono">APP_PUBLIC_ORIGIN</code> on the Worker to the same
                    origin as this page (no trailing slash) so Meta OAuth matches.
                  </p>
                ) : null}
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {!isHd2dApiConfigured() ? (
              <p className="text-amber-200/90">
                {isAdmin ? (
                  <>Configure the HD2D Worker (VITE_INTEL_API_BASE) to enable Meta.</>
                ) : (
                  <>Meta scheduling is not available until the app API is configured. Contact your administrator.</>
                )}
              </p>
            ) : !metaConfigured ? (
              <p className="text-[#8b9199]">
                {isAdmin ? (
                  <>
                    Set <code className="rounded bg-white/[0.06] px-1 font-mono text-xs">META_APP_ID</code>,{" "}
                    <code className="rounded bg-white/[0.06] px-1 font-mono text-xs">META_APP_SECRET</code>, and{" "}
                    <code className="rounded bg-white/[0.06] px-1 font-mono text-xs">APP_PUBLIC_ORIGIN</code> on the Worker.
                  </>
                ) : (
                  <>Meta is not fully configured yet. Ask your administrator to finish the Facebook app and server setup.</>
                )}
              </p>
            ) : !metaConnected ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={metaBusy || !token}
                  onClick={() => {
                    if (!token) return;
                    setMetaBusy(true);
                    void (async () => {
                      try {
                        const url = await startMetaOAuth(token);
                        window.location.href = url;
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Meta login failed");
                      } finally {
                        setMetaBusy(false);
                      }
                    })();
                  }}
                >
                  Connect Meta
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={metaBusy} onClick={() => void refreshMeta()}>
                    Refresh
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={metaBusy || !token}
                    onClick={() => {
                      if (!token) return;
                      setMetaBusy(true);
                      void (async () => {
                        try {
                          await disconnectMeta(token);
                          setMetaConnected(false);
                          setMetaPages([]);
                          setMetaScheduled([]);
                          toast.success("Meta disconnected");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Disconnect failed");
                        } finally {
                          setMetaBusy(false);
                        }
                      })();
                    }}
                  >
                    Disconnect
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-medium text-[var(--x-text)]">Creative pack (from Ad maker)</span>
                    <select
                      className={inputRowClass}
                      value={selectedPackId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedPackId(id);
                        if (!id) return;
                        const pack = creativePacks.find((p) => p.id === id);
                        if (!pack) return;
                        setScheduleMessage(packToPostMessage(pack));
                        setScheduleLink(pack.linkUrl?.trim() || "");
                        toast.message("Filled post from creative pack");
                      }}
                    >
                      <option value="">— Optional: load copy + link —</option>
                      {creativePacks.map((p) => (
                        <option key={p.id} value={p.id}>
                          {(p.headline || "Creative").slice(0, 48)}
                          {p.headline.length > 48 ? "…" : ""}
                        </option>
                      ))}
                    </select>
                    <span className="mt-1 block text-[11px] text-[#8b9199]">
                      Save packs on{" "}
                      <Link className="text-sky-400 underline" to="/marketing/ad-maker">
                        Ad maker
                      </Link>
                      . Page posts use text + optional link; attach images in Meta if needed.
                    </span>
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-medium text-[var(--x-text)]">Facebook Page</span>
                    <select
                      className={inputRowClass}
                      value={schedulePageId}
                      onChange={(e) => setSchedulePageId(e.target.value)}
                    >
                      {metaPages.map((pg) => (
                        <option key={pg.id} value={pg.id}>
                          {pg.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-medium text-[var(--x-text)]">Post text</span>
                    <textarea
                      className={fieldClass}
                      rows={4}
                      value={scheduleMessage}
                      onChange={(e) => setScheduleMessage(e.target.value)}
                      placeholder="Post body for your Page…"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-medium text-[var(--x-text)]">Link (optional)</span>
                    <input
                      type="url"
                      className={inputRowClass}
                      value={scheduleLink}
                      onChange={(e) => setScheduleLink(e.target.value)}
                      placeholder="https://…"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-medium text-[var(--x-text)]">Publish on Meta at (local time)</span>
                    <input
                      type="datetime-local"
                      className={inputRowClass}
                      value={scheduleAt}
                      onChange={(e) => setScheduleAt(e.target.value)}
                    />
                  </label>
                </div>
                <Button
                  type="button"
                  disabled={
                    metaBusy || !token || !schedulePageId || !scheduleMessage.trim() || !scheduleAt || !metaPages.length
                  }
                  onClick={() => {
                    if (!token) return;
                    setMetaBusy(true);
                    void (async () => {
                      try {
                        const iso = new Date(scheduleAt).toISOString();
                        await scheduleMetaPagePost(token, {
                          pageId: schedulePageId,
                          message: scheduleMessage.trim(),
                          linkUrl: scheduleLink.trim() || undefined,
                          scheduledAt: iso,
                        });
                        toast.success("Scheduled on Meta");
                        setScheduleMessage("");
                        setScheduleLink("");
                        setScheduleAt("");
                        await refreshMeta();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Schedule failed");
                      } finally {
                        setMetaBusy(false);
                      }
                    })();
                  }}
                >
                  Schedule on Meta
                </Button>
                {metaScheduled.length > 0 ? (
                  <div className="border-t border-white/[0.06] pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8b9199]">Your scheduled posts</p>
                    <ul className="max-h-[280px] space-y-2 overflow-y-auto">
                      {metaScheduled.map((r) => {
                        const preview =
                          r.message.trim().length > 140 ? `${r.message.trim().slice(0, 137)}…` : r.message.trim();
                        return (
                          <li
                            key={r.id}
                            className="flex items-start justify-between gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-[#8b9199]"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium text-[var(--x-text)]">{formatScheduledRow(r)}</span>
                              {preview ? (
                                <span className="mt-1 block whitespace-pre-wrap text-[11px] leading-snug text-[#8b9199]">
                                  {preview}
                                </span>
                              ) : null}
                              {r.link_url ? (
                                <span className="mt-0.5 block truncate text-[10px] text-sky-400/90">{r.link_url}</span>
                              ) : null}
                              {r.last_error ? (
                                <span className="mt-1 block text-[10px] text-amber-600/90">{r.last_error}</span>
                              ) : null}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 shrink-0 text-[#8b9199] hover:text-red-300"
                              onClick={() => {
                                if (!token) return;
                                void (async () => {
                                  try {
                                    await deleteMetaScheduled(token, r.id);
                                    toast.success("Removed from queue");
                                    await refreshMeta();
                                  } catch (e) {
                                    toast.error(e instanceof Error ? e.message : "Delete failed");
                                  }
                                })();
                              }}
                            >
                              Cancel
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <p className="mb-8 text-sm text-[#8b9199]">
          Meta scheduling is available to <strong className="text-[var(--x-text)]">company</strong> and{" "}
          <strong className="text-[var(--x-text)]">admin</strong> accounts.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={cardChrome}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-sky-400" />
              <CardTitle className="text-[var(--x-text)]">Content queue</CardTitle>
            </div>
            <CardDescription className="text-[#8b9199]">
              Save drafts locally. Copy into your scheduler or connect an API when ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--x-text)]">Next post draft</span>
              <textarea
                className={fieldClass}
                placeholder="e.g. Storm season roof check — book a free inspection in [city]…"
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                rows={5}
              />
              <span className="mt-1 block text-xs text-[#8b9199]">Saved in this browser only.</span>
            </label>
            <Button type="button" onClick={saveDraft}>
              Save draft
            </Button>
            {drafts.length > 0 ? (
              <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8b9199]">Saved drafts</p>
                <ul className="max-h-[280px] space-y-2 overflow-y-auto">
                  {drafts.map((d) => (
                    <li
                      key={d.id}
                      className="flex gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--x-text)]">{titleFromBody(d.body)}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-[#8b9199]">{d.body}</p>
                        <p className="mt-1 text-[10px] text-[#8b9199]">
                          {new Date(d.savedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                        </p>
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

        <Card className={cardChrome}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-violet-400" />
              <CardTitle className="text-[var(--x-text)]">Automation</CardTitle>
            </div>
            <CardDescription className="text-[#8b9199]">
              Triggers: new estimate closed, job completed, review received — map to social actions in a future workflow
              engine.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-[#8b9199]">
              <li className="flex items-start gap-2">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#8b9199]" />
                Webhook or cron → generate caption from measurement summary
              </li>
              <li className="flex items-start gap-2">
                <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#8b9199]" />
                Attach before/after or aerial stills when assets exist
              </li>
              <li className="flex items-start gap-2">
                <Hash className="mt-0.5 h-4 w-4 shrink-0 text-[#8b9199]" />
                Territory hashtags / brand tags from org settings
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
