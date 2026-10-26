"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

type AuthScreenProps = {
  audience: "customer" | "host";
  mode: "login" | "signup";
};

export default function AuthScreen({ audience, mode }: AuthScreenProps) {
  const [message, setMessage] = useState("");
  const isHost = audience === "host";
  const signup = mode === "signup";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("This preview is not connected to account services yet. Your details were not submitted.");
  }

  return (
    <main className="auth-page">
      <Link className="brand" href="/" aria-label="Rove home"><span className="brand-mark">r</span><span>rove<span className="brand-period">.</span></span></Link>
      <section className="auth-card">
        <p className="eyebrow"><span className="eyebrow-line" /> {isHost ? "ROVE FOR HOSTS" : "YOUR NEXT JOURNEY"}</p>
        <h1>{signup ? "A little more " : "Good to see "}<em>{signup ? "freedom." : "you."}</em></h1>
        <p className="auth-intro">{signup ? "Create an account to get ready for the road ahead." : "Sign in to pick up where your journey left off."}</p>
        <form className="auth-form" onSubmit={submit}>
          {signup ? <label>Full name<input name="name" autoComplete="name" required placeholder="Your name" /></label> : null}
          <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label>
          <label>Password<input name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={8} placeholder="At least 8 characters" /></label>
          <button className="button button-dark" type="submit">{signup ? "Create account" : "Log in"}</button>
        </form>
        {message ? <p className="auth-message" role="status">{message}</p> : null}
        <p className="auth-switch">{signup ? "Already have an account?" : "New to Rove?"} <a href={`/${audience === "host" ? "dealer" : "customer"}/${signup ? "login" : "signup"}`}>{signup ? "Log in" : "Create an account"}</a></p>
        <Link className="auth-home" href="/">← Back to exploring</Link>
      </section>
      <p className="auth-footnote">A calmer way to find your next drive.</p>
    </main>
  );
}
