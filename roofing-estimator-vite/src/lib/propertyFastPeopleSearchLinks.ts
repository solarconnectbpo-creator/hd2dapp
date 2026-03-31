/**
 * Manual research helpers for FastPeopleSearch.com — opens links in the user's browser.
 * Do not fetch or scrape FPS from this app; respect https://www.fastpeoplesearch.com terms and privacy rules.
 */

export const FAST_PEOPLE_SEARCH_HOME_LANG_EN = "https://www.fastpeoplesearch.com/?lang=en";

/** Primary segment before " | " in assessor owner strings */
export function primaryOwnerName(ownerName: string): string {
  return ownerName.split("|")[0]?.trim() ?? "";
}

/**
 * Google search restricted to fastpeoplesearch.com — reliable way to jump to relevant FPS pages
 * without calling their servers from this app.
 */
export function googleSiteSearchFastPeopleUrl(searchTerms: string): string {
  const q = `site:fastpeoplesearch.com ${searchTerms}`.trim();
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}
