"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AuthScreenProps = {
  audience: "customer" | "host";
  mode: "login" | "signup";
};

export default function AuthScreen({ audience, mode }: AuthScreenProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isHost = audience === "host";
  const signup = mode === "signup";
  const portfolioDemo = process.env.NEXT_PUBLIC_PORTFOLIO_DEMO === "true";
  const customerAuthEnabled = process.env.NEXT_PUBLIC_CUSTOMER_AUTH_ENABLED === "true";
  const canAuthenticate = !portfolioDemo || (!isHost && customerAuthEnabled);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canAuthenticate || submitting) return;
    void signIn(new FormData(event.currentTarget));
  }

  async function signIn(form: FormData) {
    setMessage(signup ? "Creating your account…" : "Signing in…");
    setSubmitting(true);
    try {
      const csrfResponse = await fetch("/api/backend-proxy/api/csrf", { credentials: "same-origin" });
      if (!csrfResponse.ok) throw new Error("The account service is unavailable. Please try again.");
      const csrf = await csrfResponse.json();
      const path = isHost ? "dealer/login" : signup ? "customer/signup" : "customer/login";
      const payload = signup
        ? { name: form.get("name"), email: form.get("email"), password: form.get("password"), phone: form.get("phone"), city: form.get("city") }
        : { identity: form.get("email"), password: form.get("password") };
      const response = await fetch(`/api/backend-proxy/api/${path}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf.csrfToken },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to continue. Please try again.");
      if (isHost) {
        router.push("/dealer/dashboard");
      } else {
        const selectedCar = new URLSearchParams(window.location.search).get("car");
        router.push(`/customer/bookings${selectedCar ? `?car=${encodeURIComponent(selectedCar)}` : ""}`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to reach the sign-in service. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <Link className="brand" href="/" aria-label="Rove home"><span className="brand-mark">r</span><span>rove<span className="brand-period">.</span></span></Link>
      <section className="auth-card">
        <p className="eyebrow"><span className="eyebrow-line" /> {isHost ? "ROVE FOR HOSTS" : "YOUR NEXT JOURNEY"}</p>
        <h1>{signup ? "A little more " : "Good to see "}<em>{signup ? "freedom." : "you."}</em></h1>
        <p className="auth-intro">{isHost ? (signup ? "Dealer accounts are created by the Rove owner. Contact them to request access." : "Sign in to manage your vehicles, bookings and earnings.") : signup ? "Create an account to get ready for the road ahead." : "Sign in to pick up where your journey left off."}</p>
        {portfolioDemo ? <p className="auth-message" role="status">{isHost ? "Dealer sign-in and management remain disabled in this portfolio preview." : canAuthenticate ? "Customer sign-in and account creation are enabled. Bookings remain read-only in this portfolio preview." : "This is a read-only portfolio preview. Customer account access and bookings are disabled."}</p> : null}
        {isHost && signup ? null : <form className="auth-form" onSubmit={submit}>
          {signup ? <label>Full name<input name="name" autoComplete="name" required maxLength={150} placeholder="Your name" /></label> : null}
          <label>{isHost ? "Email or username" : "Email address"}<input name="email" type={isHost ? "text" : "email"} autoComplete={signup ? "email" : "username"} required placeholder={isHost ? "Your dealer login" : "you@example.com"} /></label>
          {signup && !isHost ? <><label>Phone number<input name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" pattern="[0-9]{10}" maxLength={10} minLength={10} required placeholder="10-digit mobile number" /></label><label>City<input name="city" autoComplete="address-level2" required maxLength={50} placeholder="Your city" /></label></> : null}
          <label>Password<input name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={8} placeholder="At least 8 characters" /></label>
          <button className="button button-dark" type="submit" disabled={!canAuthenticate || submitting}>{submitting ? signup ? "Creating account…" : "Signing in…" : isHost ? "Dealer sign in" : signup ? "Create account" : "Log in"}</button>
        </form>}
        {message ? <p className="auth-message" role="status">{message}</p> : null}
        {isHost ? <p className="auth-switch">Dealer access is managed by the Rove owner.</p> : <p className="auth-switch">{signup ? "Already have an account?" : "New to Rove?"} <a href={`/customer/${signup ? "login" : "signup"}`}>{signup ? "Log in" : "Create an account"}</a></p>}
        <Link className="auth-home" href="/">← Back to exploring</Link>
      </section>
      <p className="auth-footnote">A calmer way to find your next drive.</p>
    </main>
  );
}
