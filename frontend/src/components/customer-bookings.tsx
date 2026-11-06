"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type AvailableCar = { id: number; name: string; city: string; capacity: string; rent: string; image: string };
type Booking = { id: number; car: string; city: string; days: string; rent: string; is_complete: boolean; image: string };

async function request(path: string, init: RequestInit = {}) {
  const csrfResponse = await fetch("/api/backend-proxy/api/csrf", { credentials: "same-origin" });
  const csrf = await csrfResponse.json();
  const response = await fetch(`/api/backend-proxy${path}`, {
    ...init,
    credentials: "same-origin",
    headers: { "X-CSRFToken": csrf.csrfToken, ...init.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? "That action could not be completed.");
  return result;
}

function rupees(value: string | number) {
  const amount = Number(value);
  return `₹${Number.isFinite(amount) ? amount.toLocaleString("en-IN") : "0"}`;
}

export default function CustomerBookings() {
  const router = useRouter();
  const portfolioReadOnly = process.env.NEXT_PUBLIC_PORTFOLIO_DEMO === "true";
  const [name, setName] = useState("");
  const [cars, setCars] = useState<AvailableCar[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [days, setDays] = useState("1");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const sessionResponse = await fetch("/api/backend-proxy/api/customer/session", { credentials: "same-origin", cache: "no-store" });
    if (!sessionResponse.ok) {
      const car = new URLSearchParams(window.location.search).get("car");
      router.replace(`/customer/login${car ? `?car=${encodeURIComponent(car)}` : ""}`);
      return;
    }
    const session = await sessionResponse.json();
    setName(session.customer.name);
    const [bookingResponse, carResponse] = await Promise.all([
      fetch("/api/backend-proxy/api/customer/bookings", { credentials: "same-origin", cache: "no-store" }),
      fetch("/api/backend-proxy/api/cars", { credentials: "same-origin", cache: "no-store" }),
    ]);
    const [bookingData, carData] = await Promise.all([bookingResponse.json(), carResponse.json()]);
    if (!bookingResponse.ok || !carResponse.ok) throw new Error("We could not load your account right now.");
    setBookings(bookingData.bookings);
    setCars(carData.cars);
    const preferred = new URLSearchParams(window.location.search).get("car");
    if (preferred && carData.cars.some((car: AvailableCar) => String(car.id) === preferred)) setSelectedId(preferred);
  }, [router]);

  useEffect(() => {
    const load = () => {
      void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load your bookings.")).finally(() => setLoading(false));
    };
    const task = window.setTimeout(() => {
      load();
    }, 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 20000);
    return () => { window.clearTimeout(task); window.clearInterval(interval); };
  }, [refresh]);

  const selectedCar = cars.find((car) => String(car.id) === selectedId);
  const estimatedTotal = selectedCar ? (Number(selectedCar.rent) || 0) * (Number(days) || 0) : 0;

  async function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) { setError("Choose an available car to continue."); return; }
    setSubmitting(true); setError(""); setNotice("");
    try {
      const result = await request("/api/customer/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ car_id: selectedId, days }),
      });
      setNotice(`${result.booking.car} is booked for ${result.booking.days} day${result.booking.days === "1" ? "" : "s"}. Total: ${rupees(result.booking.rent)}.`);
      setSelectedId(""); setDays("1");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not place this booking.");
      await refresh().catch(() => undefined);
    } finally { setSubmitting(false); }
  }

  async function logout() {
    try { await request("/api/customer/logout", { method: "POST" }); }
    finally { router.push("/"); }
  }

  if (loading) return <main className="customer-loading"><span className="dealer-spinner" /><p>Loading your journeys…</p></main>;
  const current = bookings.filter((booking) => !booking.is_complete);
  const past = bookings.filter((booking) => booking.is_complete);

  return <main className="customer-account">
    <header className="site-header customer-account-header"><Link className="brand" href="/" aria-label="Rove home"><span className="brand-mark">r</span><span>rove<span className="brand-period">.</span></span></Link><nav><Link href="/#fleet">Explore cars</Link><button type="button" onClick={() => void logout()}>Sign out</button></nav></header>
    <section className="customer-account-hero"><p className="dealer-kicker">YOUR ROVE ACCOUNT</p><h1>Welcome back, <em>{name.split(" ")[0]}.</em></h1><p>Your upcoming drives and rental details, together in one place.</p></section>
    <section className="customer-account-content">
      {error ? <p className="dealer-banner dealer-banner-error" role="alert">{error}<button type="button" onClick={() => setError("")}>Dismiss</button></p> : null}
      {notice ? <p className="dealer-banner" role="status">{notice}<button type="button" onClick={() => setNotice("")}>Dismiss</button></p> : null}
      <section className="customer-booking-panel"><div className="customer-panel-heading"><div><p className="dealer-kicker">MAKE A LITTLE PLAN</p><h2>Book your next drive</h2></div><span>01 <i> / </i> NOW</span></div>
        {portfolioReadOnly ? <p className="dealer-banner" role="status">Booking creation is disabled in this portfolio preview. Your account and any existing bookings remain available to view.</p> : cars.length ? <form className="customer-booking-form" onSubmit={book}>
          <label>Choose a car<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} required><option value="">Select from available cars</option>{cars.map((car) => <option value={car.id} key={car.id}>{car.name} · {car.city} · {rupees(car.rent)}/day</option>)}</select></label>
          <label>Rental days<input type="number" min={1} max={365} value={days} onChange={(event) => setDays(event.target.value)} required /></label>
          <div className="customer-estimate"><span>Estimated total</span><strong>{rupees(estimatedTotal)}</strong></div>
          <button className="button button-dark" type="submit" disabled={submitting || !selectedId}>{submitting ? "Confirming…" : "Confirm booking"}<span aria-hidden="true">→</span></button>
        </form> : <div className="customer-no-cars"><p>Every car is currently out on a drive. Check back soon for new availability.</p><Link className="text-link" href="/#fleet">See the fleet <span>→</span></Link></div>}
        {selectedCar ? <div className="customer-selected-car"><div>{selectedCar.image ? <Image src={selectedCar.image} alt={selectedCar.name} fill sizes="120px" /> : null}</div><p><strong>{selectedCar.name}</strong><span>{selectedCar.city} · {selectedCar.capacity} seats · {rupees(selectedCar.rent)} per day</span></p></div> : null}
      </section>

      <section className="customer-orders-section"><div className="customer-orders-heading"><div><p className="dealer-kicker">ON THE ROAD</p><h2>Your bookings <span>{current.length}</span></h2></div><Link href="/#fleet">Browse the fleet <span>↗</span></Link></div>
        {current.length ? <div className="customer-order-grid">{current.map((booking) => <article className="customer-order-card" key={booking.id}><div className="customer-order-photo">{booking.image ? <Image src={booking.image} alt={booking.car} fill sizes="(max-width: 700px) 90vw, 360px" /> : null}<span>UPCOMING DRIVE</span></div><div className="customer-order-body"><p className="customer-order-id">BOOKING #{String(booking.id).padStart(4, "0")}</p><h3>{booking.car}</h3><p>{booking.city} <i>·</i> {booking.days} day{booking.days === "1" ? "" : "s"}</p><div><strong>{rupees(booking.rent)}</strong><span>Confirmed with your host</span></div></div></article>)}</div> : <div className="customer-empty-orders"><span>✳</span><h3>No upcoming drives just yet.</h3><p>{portfolioReadOnly ? "This portfolio preview lets you explore your account while booking actions stay disabled." : "Choose a car above and turn a free day into a good story."}</p></div>}
      </section>
      {past.length ? <section className="customer-past-section"><p className="dealer-kicker">MILES ALREADY MADE</p><h2>Past drives</h2><div className="customer-past-list">{past.map((booking) => <article key={booking.id}><span>#{String(booking.id).padStart(4, "0")}</span><strong>{booking.car}</strong><span>{booking.days} days · {rupees(booking.rent)}</span><span>Completed</span></article>)}</div></section> : null}
    </section>
    <footer className="site-footer customer-account-footer"><div className="footer-bottom"><span>© 2026 Rove Mobility</span><span>Good journeys begin here.</span></div></footer>
  </main>;
}

