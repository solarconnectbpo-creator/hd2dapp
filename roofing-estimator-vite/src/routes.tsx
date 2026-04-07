import { createBrowserRouter } from "react-router";
import { Root } from "./layout/Root";
import { Dashboard } from "./pages/Dashboard";
import { NotFound } from "./pages/NotFound";
import { AdminLogin } from "./pages/AdminLogin";
import { Login } from "./pages/Login";
import { SignUp } from "./pages/SignUp";
import { Careers } from "./pages/Careers";
import { AuthGate } from "./components/AuthGate";
import { MarketingOutlet } from "./layout/MarketingOutlet";
import { lazyRoute } from "./routes/lazyRoute";

/** Code-split heavy / map-heavy routes; keep dashboard + auth shells eager. */
const MeasurementRoute = lazyRoute(() => import("./App"));
const EstimatesRoute = lazyRoute(() => import("./pages/Estimates").then((m) => ({ default: m.Estimates })));
const ContractsRoute = lazyRoute(() => import("./pages/Contracts").then((m) => ({ default: m.Contracts })));
const ProjectsRoute = lazyRoute(() => import("./pages/Projects").then((m) => ({ default: m.Projects })));
const ContactsSettingsRoute = lazyRoute(() =>
  import("./pages/ContactsSettings").then((m) => ({ default: m.ContactsSettings })),
);
const PropertyScraperRoute = lazyRoute(() =>
  import("./pages/PropertyScraper").then((m) => ({ default: m.PropertyScraper })),
);
const CanvassingRoute = lazyRoute(() => import("./pages/Canvassing").then((m) => ({ default: m.Canvassing })));
const MarketingRoute = lazyRoute(() => import("./pages/Marketing").then((m) => ({ default: m.Marketing })));
const SocialMediaAutomationRoute = lazyRoute(() =>
  import("./pages/SocialMediaAutomation").then((m) => ({ default: m.SocialMediaAutomation })),
);
const AdMakerAutomationRoute = lazyRoute(() =>
  import("./pages/AdMakerAutomation").then((m) => ({ default: m.AdMakerAutomation })),
);
const AdminUsersRoute = lazyRoute(() => import("./pages/AdminUsers").then((m) => ({ default: m.AdminUsers })));
const AdminCoursesRoute = lazyRoute(() => import("./pages/AdminCourses").then((m) => ({ default: m.AdminCourses })));
const CoursesRoute = lazyRoute(() => import("./pages/Courses").then((m) => ({ default: m.Courses })));
const CallCenterRoute = lazyRoute(() => import("./pages/CallCenter").then((m) => ({ default: m.CallCenter })));
const LeadMarketplaceRoute = lazyRoute(() =>
  import("./pages/LeadMarketplace").then((m) => ({ default: m.LeadMarketplace })),
);
const AutomationBuilderRoute = lazyRoute(() =>
  import("./pages/AutomationBuilder").then((m) => ({ default: m.AutomationBuilder })),
);
const AccountPendingRoute = lazyRoute(() =>
  import("./pages/AccountPending").then((m) => ({ default: m.AccountPending })),
);

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/careers",
    Component: Careers,
  },
  {
    path: "/admin/login",
    Component: AdminLogin,
  },
  {
    path: "/signup",
    Component: SignUp,
  },
  {
    Component: AuthGate,
    children: [
      {
        path: "/",
        Component: Root,
        children: [
          { index: true, Component: Dashboard },
          { path: "measurement/new", Component: MeasurementRoute },
          { path: "estimates", Component: EstimatesRoute },
          { path: "contracts", Component: ContractsRoute },
          { path: "projects", Component: ProjectsRoute },
          { path: "contacts", Component: ContactsSettingsRoute },
          { path: "property-lookup", Component: PropertyScraperRoute },
          { path: "canvassing", Component: CanvassingRoute },
          {
            path: "marketing",
            Component: MarketingOutlet,
            children: [
              { index: true, Component: MarketingRoute },
              { path: "social", Component: SocialMediaAutomationRoute },
              { path: "ads", Component: AdMakerAutomationRoute },
            ],
          },
          { path: "courses", Component: CoursesRoute },
          { path: "call-center", Component: CallCenterRoute },
          { path: "leads", Component: LeadMarketplaceRoute },
          { path: "sms-automation", Component: AutomationBuilderRoute },
          { path: "account/pending", Component: AccountPendingRoute },
          { path: "admin/courses", Component: AdminCoursesRoute },
          { path: "admin/users", Component: AdminUsersRoute },
          { path: "*", Component: NotFound },
        ],
      },
    ],
  },
]);
