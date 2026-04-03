import { createBrowserRouter } from "react-router";
import { Root } from "./layout/Root";
import { Dashboard } from "./pages/Dashboard";
import { Estimates } from "./pages/Estimates";
import { Contracts } from "./pages/Contracts";
import { Projects } from "./pages/Projects";
import { ContactsSettings } from "./pages/ContactsSettings";
import { NotFound } from "./pages/NotFound";
import { PropertyScraper } from "./pages/PropertyScraper";
import { Canvassing } from "./pages/Canvassing";
import EstimatorApp from "./App";
import { Login } from "./pages/Login";
import { AuthGate } from "./components/AuthGate";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    Component: AuthGate,
    children: [
      {
        path: "/",
        Component: Root,
        children: [
          { index: true, Component: Dashboard },
          { path: "measurement/new", Component: EstimatorApp },
          { path: "estimates", Component: Estimates },
          { path: "contracts", Component: Contracts },
          { path: "projects", Component: Projects },
          { path: "contacts", Component: ContactsSettings },
          { path: "property-lookup", Component: PropertyScraper },
          { path: "canvassing", Component: Canvassing },
          { path: "*", Component: NotFound },
        ],
      },
    ],
  },
]);

