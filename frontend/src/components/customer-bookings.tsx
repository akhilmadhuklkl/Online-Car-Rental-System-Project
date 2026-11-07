"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type AvailableCar = { id: number; name: string; city: string; capacity: string; rent: string; image: string };
type BookingStatus = "upcoming" | "in_progress" | "return_due" | "completed" | "dates_unavailable";
type Booking = { id: number; car: string; city: string; days: string; pickup_date?: string | null; return_date?: string | null; rent: string; is_complete: boolean; status?: BookingStatus; image: string };

function bookingStatusLabel(booking: Booking) {
  if (booking.status) return ({ upcoming: "Upcoming drive", in_progress: "In progress", return_due: "Return due", completed: "Completed", dates_unavailable: "Dates unavailable" } satisfies Record<BookingStatus, string>)[booking.status];
  return booking.is_complete ? "Completed" : "Upcoming drive";
}

function BookingTimeline({ booking }: { booking: Booking }) {
  const status = booking.status ?? (booking.is_complete ? "completed" : "upcoming");
  if (status === "dates_unavailable" || !booking.pickup_date || !booking.return_date) {
    return <p className="booking-timeline-unavailable">Timeline unavailable because rental dates were not recorded.</p>;
  }
  const pickupLabel = displayDate(booking.pickup_date);
  const returnLabel = displayDate(booking.return_date);
  const steps = [
    { title: "Booked", detail: "Reservation confirmed", state: "complete" },
    { title: "Pick-up", detail: pickupLabel, state: status === "upcoming" ? "next" : "complete" },
    { title: "Return", detail: returnLabel, state: status === "completed" ? "complete" : status === "return_due" ? "current" : status === "in_progress" ? "next" : "future" },
  ];
  return <ol className={`booking-timeline ${status}`} aria-label={`Booking timeline: ${bookingStatusLabel(booking)}`}>
    {steps.map((step) => <li className={`booking-timeline-step ${step.state}`} key={step.title} aria-current={step.state === "current" || step.state === "next" ? "step" : undefined}>
      <span className="booking-timeline-marker" aria-hidden="true" />
      <span className="booking-timeline-copy"><strong>{step.title}</strong><small>{step.detail}</small></span>
    </li>)}
  </ol>;
}

function bookingReminder(booking: Booking, today: string) {
  const status = booking.status ?? (booking.is_complete ? "completed" : "upcoming");
  if (!booking.pickup_date || !booking.return_date || status === "dates_unavailable") return null;
  if (booking.pickup_date === today) return { tone: "pickup-today", text: "Pick-up is today" };
  if (status === "upcoming") {
    const daysUntilPickup = rentalDaysBetween(today, booking.pickup_date);
    return daysUntilPickup === 0 ? { tone: "pickup-today", text: "Pick-up is today" } : { tone: "pickup-upcoming", text: `Pick-up in ${daysUntilPickup} day${daysUntilPickup === 1 ? "" : "s"}` };
  }
  if (status === "return_due") return { tone: "return-due", text: "Return is due · Contact your host to confirm handover" };
  if (status === "in_progress") {
    const daysUntilReturn = rentalDaysBetween(today, booking.return_date);
    return daysUntilReturn === 0 ? { tone: "return-today", text: "Return is due today" } : { tone: "return-upcoming", text: `Return in ${daysUntilReturn} day${daysUntilReturn === 1 ? "" : "s"}` };
  }
  return null;
}

function localDateISO(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return localDateISO(date);
}

function rentalDaysBetween(pickup: string, returned: string) {
  if (!pickup || !returned) return 0;
  return Math.round((Date.parse(`${returned}T00:00:00Z`) - Date.parse(`${pickup}T00:00:00Z`)) / 86_400_000);
}

function displayDate(value?: string | null) {
  if (!value) return "Dates not recorded";
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function durationLabel(days: string | number) {
  return `${days} day${Number(days) === 1 ? "" : "s"}`;
}

function dateRangeLabel(pickup?: string | null, returned?: string | null) {
  if (!pickup || !returned) return "Dates not recorded";
  return `${displayDate(pickup)} → ${displayDate(returned)}`;
}

const demoRentalTerms = [
  ["Daily distance", "250 km per rental day"],
  ["Extra distance", "₹10 per km beyond the sample allowance"],
  ["Security deposit", "₹5,000 refundable sample deposit"],
  ["Fuel", "Return with the same fuel level as pickup"],
  ["Pickup checklist", "Bring a valid driving licence and photo ID"],
] as const;

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
  const [pickupDate, setPickupDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [today, setToday] = useState("");
  const [reviewing, setReviewing] = useState(false);
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
      setToday(localDateISO());
      load();
    }, 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") { setToday(localDateISO()); load(); }
    }, 20000);
    return () => { window.clearTimeout(task); window.clearInterval(interval); };
  }, [refresh]);

  const selectedCar = cars.find((car) => String(car.id) === selectedId);
  const days = rentalDaysBetween(pickupDate, returnDate);
  const estimatedTotal = selectedCar && days > 0 ? (Number(selectedCar.rent) || 0) * days : 0;
  const minimumReturnDate = pickupDate ? shiftDate(pickupDate, 1) : shiftDate(today, 1);

  async function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) { setError("Choose an available car to continue."); return; }
    if (days < 1 || days > 365) { setError("Choose a return date 1 to 365 days after pickup."); return; }
    if (!reviewing) { setReviewing(true); setError(""); return; }
    setSubmitting(true); setError(""); setNotice("");
    try {
      const result = await request("/api/customer/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ car_id: selectedId, pickup_date: pickupDate, return_date: returnDate }),
      });
      setNotice(`${result.booking.car} is booked from ${displayDate(result.booking.pickup_date)} to ${displayDate(result.booking.return_date)}. Total: ${rupees(result.booking.rent)}.`);
      setSelectedId(""); setPickupDate(""); setReturnDate(""); setReviewing(false);
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
  const current = bookings.filter((booking) => (booking.status ?? (booking.is_complete ? "completed" : "upcoming")) !== "completed");
  const past = bookings.filter((booking) => (booking.status ?? (booking.is_complete ? "completed" : "upcoming")) === "completed");

  return <main className="customer-account">
    <header className="site-header customer-account-header"><Link className="brand" href="/" aria-label="Rove home"><span className="brand-mark">r</span><span>rove<span className="brand-period">.</span></span></Link><nav><Link href="/#fleet">Explore cars</Link><button type="button" onClick={() => void logout()}>Sign out</button></nav></header>
    <section className="customer-account-hero"><p className="dealer-kicker">YOUR ROVE ACCOUNT</p><h1>Welcome back, <em>{name.split(" ")[0]}.</em></h1><p>Your upcoming drives and rental details, together in one place.</p></section>
    <section className="customer-account-content">
      {error ? <p className="dealer-banner dealer-banner-error" role="alert">{error}<button type="button" onClick={() => setError("")}>Dismiss</button></p> : null}
      {notice ? <p className="dealer-banner" role="status">{notice}<button type="button" onClick={() => setNotice("")}>Dismiss</button></p> : null}
      <section className="customer-booking-panel"><div className="customer-panel-heading"><div><p className="dealer-kicker">MAKE A LITTLE PLAN</p><h2>Book your next drive</h2></div><span>01 <i> / </i> NOW</span></div>
        {portfolioReadOnly ? <p className="dealer-banner" role="status">Portfolio preview: explore the car, estimate, and sample terms. The final booking action is disabled.</p> : null}
        {cars.length ? <form className="customer-booking-form" onSubmit={book}>
          {!reviewing ? <>
            <label>Choose a car<select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setReviewing(false); }} required><option value="">Select from available cars</option>{cars.map((car) => <option value={car.id} key={car.id}>{car.name} · {car.city} · {rupees(car.rent)}/day</option>)}</select></label>
            <label>Pick-up date<input type="date" value={pickupDate} min={today} onChange={(event) => { const value = event.target.value; setPickupDate(value); if (!returnDate || returnDate <= value) setReturnDate(value ? shiftDate(value, 1) : ""); setReviewing(false); }} required /></label>
            <label>Return date<input type="date" value={returnDate} min={minimumReturnDate} max={pickupDate ? shiftDate(pickupDate, 365) : undefined} onChange={(event) => { setReturnDate(event.target.value); setReviewing(false); }} required /></label>
            <div className="customer-estimate"><span>{days > 0 ? `Estimated · ${days} day${days === 1 ? "" : "s"}` : "Estimated rental total"}</span><strong>{rupees(estimatedTotal)}</strong></div>
            <button className="button button-dark" type="submit" disabled={submitting || !selectedId || days < 1 || days > 365}>Review booking <span aria-hidden="true">→</span></button>
          </> : <div className="customer-booking-review">
            <div className="customer-review-heading"><div><p className="dealer-kicker">HUMAN REVIEW</p><h3>Check your rental details</h3></div><strong>{rupees(estimatedTotal)}</strong></div>
            {selectedCar ? <dl className="customer-review-summary"><div><dt>Car</dt><dd>{selectedCar.name}</dd></div><div><dt>Pickup city</dt><dd>{selectedCar.city}</dd></div><div><dt>Seats</dt><dd>{selectedCar.capacity}</dd></div><div><dt>Pick-up date</dt><dd>{displayDate(pickupDate)}</dd></div><div><dt>Return date</dt><dd>{displayDate(returnDate)}</dd></div><div><dt>Duration</dt><dd>{days} day{days === 1 ? "" : "s"}</dd></div><div><dt>Daily rate</dt><dd>{rupees(selectedCar.rent)} / day</dd></div><div><dt>Estimated rental total</dt><dd>{rupees(estimatedTotal)}</dd></div></dl> : null}
            <RentalTerms />
            <div className="customer-review-actions"><button className="button button-outline" type="button" onClick={() => setReviewing(false)} disabled={submitting}>Edit details</button><button className="button button-dark" type="submit" disabled={submitting || portfolioReadOnly}>{portfolioReadOnly ? "Booking disabled in preview" : submitting ? "Confirming…" : "Confirm booking"}<span aria-hidden="true">→</span></button></div>
          </div>}
        </form> : <div className="customer-no-cars"><p>Every car is currently out on a drive. Check back soon for new availability.</p><Link className="text-link" href="/#fleet">See the fleet <span>→</span></Link></div>}
        {selectedCar ? <div className="customer-selected-car"><div>{selectedCar.image ? <Image src={selectedCar.image} alt={selectedCar.name} fill sizes="120px" /> : null}</div><p><strong>{selectedCar.name}</strong><span>{selectedCar.city} · {selectedCar.capacity} seats · {rupees(selectedCar.rent)} per day</span></p>{portfolioReadOnly && !reviewing ? <RentalTerms compact /> : null}</div> : null}
      </section>

      <section className="customer-orders-section"><div className="customer-orders-heading"><div><p className="dealer-kicker">ON THE ROAD</p><h2>Your bookings <span>{current.length}</span></h2></div><Link href="/#fleet">Browse the fleet <span>↗</span></Link></div>
        {current.length ? <div className="customer-order-grid">{current.map((booking) => { const reminder = bookingReminder(booking, today); return <article className="customer-order-card" key={booking.id}><div className="customer-order-photo">{booking.image ? <Image src={booking.image} alt={booking.car} fill sizes="(max-width: 700px) 90vw, 360px" /> : null}<span className={`customer-order-status ${booking.status ?? "upcoming"}`}>{bookingStatusLabel(booking)}</span></div><div className="customer-order-body"><p className="customer-order-id">BOOKING #{String(booking.id).padStart(4, "0")}</p><h3>{booking.car}</h3><div className="customer-order-trip-meta"><span>{booking.city}</span><span>{durationLabel(booking.days)}</span></div>{reminder ? <p className={`customer-booking-reminder ${reminder.tone}`} role="status">{reminder.text}</p> : null}{booking.pickup_date && booking.return_date ? <dl className="customer-order-dates"><div><dt>Pick-up</dt><dd>{displayDate(booking.pickup_date)}</dd></div><div><dt>Return</dt><dd>{displayDate(booking.return_date)}</dd></div></dl> : <p className="customer-order-legacy-dates">Dates not recorded</p>}<BookingTimeline booking={booking} /><div><strong>{rupees(booking.rent)}</strong><span>Confirmed with your host</span></div></div></article>; })}</div> : <div className="customer-empty-orders"><span>✳</span><h3>No upcoming drives just yet.</h3><p>{portfolioReadOnly ? "This portfolio preview lets you explore your account while booking actions stay disabled." : "Choose a car above and turn a free day into a good story."}</p></div>}
      </section>
      {past.length ? <section className="customer-past-section"><p className="dealer-kicker">MILES ALREADY MADE</p><h2>Past drives</h2><div className="customer-past-list">{past.map((booking) => <article key={booking.id}><span>#{String(booking.id).padStart(4, "0")}</span><strong>{booking.car}</strong><span>{dateRangeLabel(booking.pickup_date, booking.return_date)} · {durationLabel(booking.days)} · {rupees(booking.rent)}</span><span>Completed</span></article>)}</div></section> : null}
    </section>
    <footer className="site-footer customer-account-footer"><div className="footer-bottom"><span>© 2026 Rove Mobility</span><span>Good journeys begin here.</span></div></footer>
  </main>;
}

function RentalTerms({ compact = false }: { compact?: boolean }) {
  return <aside className={`customer-rental-terms ${compact ? "is-compact" : ""}`}>
    <div><p className="dealer-kicker">ILLUSTRATIVE DEMO TERMS</p>{compact ? null : <h4>Sample rental terms</h4>}</div>
    <dl>{demoRentalTerms.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p className="customer-terms-note">Portfolio example only. These sample terms are not a live dealer offer or binding rental policy. Confirm actual terms with the car provider before booking.</p>
  </aside>;
}

