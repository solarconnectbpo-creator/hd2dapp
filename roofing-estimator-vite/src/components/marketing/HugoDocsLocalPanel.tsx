import { ExternalLink, FolderGit2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  HUGO_DOCS_DEV_MOUNT,
  HUGO_DOCS_GIT_CLONE_URL,
  HUGO_DOCS_LOCAL_RELATIVE,
  HUGO_DOCS_REPO,
} from "../../config/hugoMarketingRefs";

const codeChip = "rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs text-[#e7e9ea]";

/**
 * Instructions to clone official hugoDocs + optional link to Vite-served tree in dev (`/hugo-docs`).
 */
export function HugoDocsLocalPanel() {
  const hasLocal =
    import.meta.env.DEV && import.meta.env.VITE_HUGO_DOCS_LOCAL === "true";

  return (
    <div className="rounded-xl border border-sky-500/25 bg-sky-500/[0.06] p-4 text-sm">
      <div className="flex items-start gap-2">
        <FolderGit2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" aria-hidden />
        <div className="min-w-0 space-y-2">
          <p className="font-semibold text-black">Official Hugo docs repo (local build)</p>
          <p className="text-[#8b9199]">
            Download the same source as{" "}
            <a className="text-sky-400 underline" href={HUGO_DOCS_REPO} target="_blank" rel="noreferrer">
              gohugoio/hugoDocs
            </a>{" "}
            into <code className={codeChip}>{HUGO_DOCS_LOCAL_RELATIVE}</code> (gitignored). Use it with the{" "}
            <span className="font-medium text-black">Hugo</span> CLI to build landing pages and wire URLs into ads / social
            posts.
          </p>
          <p className="text-xs text-[#71767b]">
            Remote: <code className={codeChip}>{HUGO_DOCS_GIT_CLONE_URL}</code>
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <code className="rounded border border-white/[0.1] bg-black/30 px-2 py-1.5 font-mono text-[11px] text-[#e7e9ea]">
              npm run hugo:docs:sync
            </code>
            <span className="text-xs text-[#8b9199]">from the roofing-estimator-vite folder</span>
          </div>
          <p className="text-xs text-[#71767b]">
            Then run <code className={codeChip}>cd {HUGO_DOCS_LOCAL_RELATIVE} &amp;&amp; hugo server -D</code> to preview
            the docs site with Hugo (install Hugo from{" "}
            <a className="text-sky-400 underline" href="https://gohugo.io/installation/" target="_blank" rel="noreferrer">
              gohugo.io/installation
            </a>
            ).
          </p>
          {hasLocal ? (
            <Button variant="secondary" size="sm" className="mt-2 gap-2" asChild>
              <a href={`${HUGO_DOCS_DEV_MOUNT}/`} target="_blank" rel="noreferrer">
                Browse cloned files in dev
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          ) : (
            <p className="text-xs text-[#71767b]">
              After syncing, restart <code className={codeChip}>npm run dev</code> to enable &quot;Browse cloned files&quot;
              (served at <code className={codeChip}>{HUGO_DOCS_DEV_MOUNT}</code>).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
