import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { Dashboard } from "./components/Dashboard";
import { NewMeasurement } from "./components/NewMeasurement";
import { Estimates } from "./components/Estimates";
import { NewEstimate } from "./components/NewEstimate";
import { Contracts } from "./components/Contracts";
import { Projects } from "./components/Projects";
import { NotFound } from "./components/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Dashboard },
      { path: "measurement/new", Component: NewMeasurement },
      { path: "estimates", Component: Estimates },
      { path: "estimates/new", Component: NewEstimate },
      { path: "contracts", Component: Contracts },
      { path: "projects", Component: Projects },
      { path: "*", Component: NotFound },
    ],
  },
]);
