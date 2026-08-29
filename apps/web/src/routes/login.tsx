import { createFileRoute } from "@tanstack/react-router";
import { useContext, useState } from "react";

import DevSignInPanel from "@/components/dev-sign-in-panel";
import { SessionSourceContext } from "@/components/session-provider";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const source = useContext(SessionSourceContext);
  const [showSignIn, setShowSignIn] = useState(false);

  if (source.name === "dev") {
    return <DevSignInPanel />;
  }

  return showSignIn ? (
    <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
  ) : (
    <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
  );
}
