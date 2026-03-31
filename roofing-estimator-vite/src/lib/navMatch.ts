/** Whether a sidebar item should show the active style for the current URL. */
export function isNavActive(navPath: string, pathname: string): boolean {
  if (navPath === "/") return pathname === "/";
  return pathname === navPath || pathname.startsWith(`${navPath}/`);
}
