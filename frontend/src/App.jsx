import { useAuth } from "@clerk/clerk-react";
import { Navigate, Route, Routes } from "react-router";
import * as Sentry from "@sentry/react";

import AuthPage from "./pages/AuthPage";
import CallPage from "./pages/CallPage";
import HomePage from "./pages/HomePage";
import PublicChannelPage from "./pages/PublicChannelPage";
import ProfilePage from "./pages/ProfilePage";
import PageLoader from "./components/PageLoader";

// Defined at module level — never recreated, so hook order inside is always stable
const SentryRoutes = Sentry.withSentryReactRouterV7Routing(Routes);

const App = () => {
  const { isSignedIn, isLoaded } = useAuth();

  // Render routes unconditionally (no early return before hooks finish)
  // Show loader inside the tree instead of returning null
  if (!isLoaded) return <PageLoader />;

  return (
    <SentryRoutes>
      <Route
        path="/"
        element={isSignedIn ? <HomePage /> : <Navigate to="/auth" replace />}
      />
      <Route
        path="/auth"
        element={!isSignedIn ? <AuthPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/profile"
        element={isSignedIn ? <ProfilePage /> : <Navigate to="/auth" replace />}
      />
      <Route
        path="/call/:id"
        element={isSignedIn ? <CallPage /> : <Navigate to="/auth" replace />}
      />
      <Route
        path="/channel/:channelId"
        element={<PublicChannelPage />}
      />
      <Route
        path="*"
        element={isSignedIn ? <Navigate to="/" replace /> : <Navigate to="/auth" replace />}
      />
    </SentryRoutes>
  );
};

export default App;
