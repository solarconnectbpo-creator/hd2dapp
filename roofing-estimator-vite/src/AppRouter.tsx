import { RouterProvider } from "react-router";
import { router } from "./routes";
import { RoofingProvider } from "./context/RoofingContext";
import { AuthProvider } from "./context/AuthContext";

export default function AppRouter() {
  return (
    <AuthProvider>
      <RoofingProvider>
        <RouterProvider router={router} />
      </RoofingProvider>
    </AuthProvider>
  );
}

