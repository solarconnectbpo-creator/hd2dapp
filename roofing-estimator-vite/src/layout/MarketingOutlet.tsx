import { Outlet } from "react-router";

/** Parent for `/marketing`, `/marketing/social`, `/marketing/ads` so child paths match deterministically. */
export function MarketingOutlet() {
  return <Outlet />;
}
