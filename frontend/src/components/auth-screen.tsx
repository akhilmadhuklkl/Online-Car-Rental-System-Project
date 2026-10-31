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
  const isHost = audience === "host";
  const signup = mode === "signup";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isHost || signup) {
      setMessage("This preview is not connected to account services yet. Your details were not submitted.");
      return;
    }

    void signIn(new FormData(event.currentTarget));
  }

  async function signIn(form: FormData) {
    setMessage("Signing in…");
    try {
      const csrfResponse = await fetch("/api/backend/api/csrf/", { credentials: "same-origin" });
      const csrf = await csrfResponse.json();
      const response = await fetch("/api/backend/api/dealer/login/", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf.csrfToken },
        body: JSON.stringify({ identity: form.get("email"), password: form.get("password") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to sign in. Please try again.");
      router.push("/dealer/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to reach the sign-in service. Try again.");
    }
  }

  return (
    <main className="auth-page">
      <Link className="brand" href="/" aria-label="Rove home"><span className="brand-mark">r</span><span>rove<span className="brand-period">.</span></span></Link>
      <section className="auth-card">
        <p className="eyebrow"><span className="eyebrow-line" /> {isHost ? "ROVE FOR HOSTS" : "YOUR NEXT JOURNEY"}</p>
        <h1>{signup ? "A little more " : "Good to see "}<em>{signup ? "freedom." : "you."}</em></h1>
        <p className="auth-intro">{isHost ? (signup ? "Dealer accounts are created by the Rove owner. Contact them to request access." : "Sign in to manage your vehicles, bookings and earnings.") : signup ? "Create an account to get ready for the road ahead." : "Sign in to pick up where your journey left off."}</p>
        {isHost && signup ? null : <form className="auth-form" onSubmit={submit}>
          {signup ? <label>Full name<input name="name" autoComplete="name" required placeholder="Your name" /></label> : null}
          <label>{isHost ? "Email or username" : "Email address"}<input name="email" type={isHost ? "text" : "email"} autoComplete="username" required placeholder={isHost ? "Your dealer login" : "you@example.com"} /></label>
          <label>Password<input name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={8} placeholder="At least 8 characters" /></label>
          <button className="button button-dark" type="submit">{signup ? "Create account" : "Log in"}</button>
        </form>}
        {message ? <p className="auth-message" role="status">{message}</p> : null}
        {isHost ? <p className="auth-switch">Dealer access is managed by the Rove owner.</p> : <p className="auth-switch">{signup ? "Already have an account?" : "New to Rove?"} <a href={`/customer/${signup ? "login" : "signup"}`}>{signup ? "Log in" : "Create an account"}</a></p>}
        <Link className="auth-home" href="/">← Back to exploring</Link>
      </section>
      <p className="auth-footnote">A calmer way to find your next drive.</p>
    </main>
  );
}
