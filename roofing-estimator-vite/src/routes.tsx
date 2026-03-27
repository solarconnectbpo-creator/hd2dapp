import { createBrowserRouter } from "react-router";
import { Root } from "./layout/Root";
import { Dashboard } from "./pages/Dashboard";
import { Estimates } from "./pages/Estimates";
import { Contracts } from "./pages/Contracts";
import { Projects } from "./pages/Projects";
import { NotFound } from "./pages/NotFound";
import EstimatorApp from "./App";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Dashboard },
      { path: "measurement/new", Component: EstimatorApp },
      { path: "estimates", Component: Estimates },
      { path: "contracts", Component: Contracts },
      { path: "projects", Component: Projects },
      { path: "*", Component: NotFound },
    ],
  },
]);

