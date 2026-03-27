import { RouterProvider } from "react-router";
import { router } from "./routes";
import { RoofingProvider } from "./context/RoofingContext";

export default function AppRouter() {
  return (
    <RoofingProvider>
      <RouterProvider router={router} />
    </RoofingProvider>
  );
}

