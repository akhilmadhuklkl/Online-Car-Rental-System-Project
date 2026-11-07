"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type AvailableCar = { id: number; name: string; city: string; capacity: string; rent: string; image: string };
type BookingStatus = "upcoming" | "in_progress" | "return_due" | "completed" | "cancelled" | "dates_unavailable";
type Booking = { id: number; car: string; city: string; days: string; pickup_date?: string | null; return_date?: string | null; rent: string; is_complete: boolean; is_cancelled?: boolean; status?: BookingStatus; image: string; requested_pickup_date?: string | null; requested_return_date?: string | null; reschedule_status?: "" | "pending" | "approved" | "declined"; requested_rent?: string | null };

function bookingStatus(booking: Booking): BookingStatus {
  return booking.status ?? (booking.is_cancelled ? "cancelled" : booking.is_complete ? "completed" : "upcoming");
}

function bookingStatusLabel(booking: Booking) {
  return ({ upcoming: "Upcoming drive", in_progress: "In progress", return_due: "Return due", completed: "Completed", cancelled: "Cancelled", dates_unavailable: "Dates unavailable" } satisfies Record<BookingStatus, string>)[bookingStatus(booking)];
}

function BookingTimeline({ booking }: { booking: Booking }) {
  const status = bookingStatus(booking);
  if (status === "cancelled") return <p className="booking-timeline-unavailable">Cancelled before pickup. This vehicle has been returned to the available fleet.</p>;
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
  const status = bookingStatus(booking);
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
  ["Cancellation", "No fee before pick-up in this demo; cancellation closes once the pick-up date begins"],
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

function csvCell(value: string | number) {
  const text = String(value);
  const safeText = /^[\s]*[=+@\-]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function exportCustomerBookings(bookings: Booking[], category: "open" | "completed" | "cancelled") {
  const rows = [
    ["Booking number", "Vehicle", "City", "Pick-up date", "Return date", "Duration (days)", "Total (INR)", "Status"],
    ...bookings.map((booking) => [
      `#${String(booking.id).padStart(4, "0")}`,
      booking.car,
      booking.city,
      booking.pickup_date ?? "Not recorded",
      booking.return_date ?? "Not recorded",
      booking.days,
      booking.rent,
      booking.status ?? (booking.is_complete ? "completed" : "upcoming"),
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `rove-${category}-bookings-${localDateISO()}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [rescheduleDates, setRescheduleDates] = useState<Record<number, { pickup: string; returned: string }>>({});
  const [rescheduleOpenId, setRescheduleOpenId] = useState<number | null>(null);
  const [reschedulingId, setReschedulingId] = useState<number | null>(null);
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

  async function cancelBooking(booking: Booking) {
    setCancellingId(booking.id);
    setError("");
    setNotice("");
    try {
      await request(`/api/customer/bookings/${booking.id}/cancel`, { method: "POST" });
      setConfirmCancelId(null);
      setNotice(`Booking #${String(booking.id).padStart(4, "0")} for ${booking.car} was cancelled. The car is available again.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not cancel this booking.");
    } finally {
      setCancellingId(null);
    }
  }

  async function submitReschedule(booking: Booking) {
    const proposed = rescheduleDates[booking.id];
    if (!proposed?.pickup || !proposed.returned || proposed.returned <= proposed.pickup) {
      setError("Choose a new return date after the new pick-up date.");
      return;
    }
    setReschedulingId(booking.id); setError(""); setNotice("");
    try {
      await request(`/api/customer/bookings/${booking.id}/reschedule`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pickup_date: proposed.pickup, return_date: proposed.returned }) });
      setRescheduleOpenId(null);
      setNotice(`Date-change request for ${booking.car} was sent to the dealer. Your current booking remains unchanged until approval.`);
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "We could not send the date-change request."); }
    finally { setReschedulingId(null); }
  }

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
  const current = bookings.filter((booking) => bookingStatus(booking) !== "completed" && bookingStatus(booking) !== "cancelled");
  const past = bookings.filter((booking) => bookingStatus(booking) === "completed");
  const cancelled = bookings.filter((booking) => bookingStatus(booking) === "cancelled");

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

      <section className="customer-orders-section"><div className="customer-orders-heading"><div><p className="dealer-kicker">ON THE ROAD</p><h2>Your bookings <span>{current.length}</span></h2></div><div className="customer-booking-heading-actions"><button className="customer-booking-export" type="button" disabled={!current.length} onClick={() => exportCustomerBookings(current, "open")}>↓ Export open CSV</button><Link href="/#fleet">Browse the fleet <span>↗</span></Link></div></div>
        {current.length ? <div className="customer-order-grid">{current.map((booking) => { const reminder = bookingReminder(booking, today); const canCancel = bookingStatus(booking) === "upcoming"; const isConfirmingCancel = confirmCancelId === booking.id; const canReschedule = canCancel && !portfolioReadOnly; const proposed = rescheduleDates[booking.id] ?? { pickup: booking.pickup_date ?? "", returned: booking.return_date ?? "" }; const proposedDays = rentalDaysBetween(proposed.pickup, proposed.returned); const dailyRate = Number(booking.rent) / Math.max(Number(booking.days), 1); const proposedTotal = dailyRate * proposedDays; return <article className="customer-order-card" key={booking.id}><div className="customer-order-photo">{booking.image ? <Image src={booking.image} alt={booking.car} fill sizes="(max-width: 700px) 90vw, 360px" /> : null}<span className={`customer-order-status ${bookingStatus(booking)}`}>{bookingStatusLabel(booking)}</span></div><div className="customer-order-body"><p className="customer-order-id">BOOKING #{String(booking.id).padStart(4, "0")}</p><h3>{booking.car}</h3><div className="customer-order-trip-meta"><span>{booking.city}</span><span>{durationLabel(booking.days)}</span></div>{reminder ? <p className={`customer-booking-reminder ${reminder.tone}`} role="status">{reminder.text}</p> : null}{booking.pickup_date && booking.return_date ? <dl className="customer-order-dates"><div><dt>Pick-up</dt><dd>{displayDate(booking.pickup_date)}</dd></div><div><dt>Return</dt><dd>{displayDate(booking.return_date)}</dd></div></dl> : <p className="customer-order-legacy-dates">Dates not recorded</p>}<BookingTimeline booking={booking} /><div className="customer-order-actions"><strong>{rupees(booking.rent)}</strong><span>Confirmed with your host</span>{canCancel && portfolioReadOnly ? <span className="customer-cancel-unavailable">Changes disabled in this portfolio preview</span> : null}{canReschedule && booking.reschedule_status === "pending" ? <span className="customer-reschedule-state pending">Date change awaiting dealer review</span> : null}{canReschedule && booking.reschedule_status === "approved" ? <span className="customer-reschedule-state approved">Date change approved</span> : null}{canReschedule && booking.reschedule_status === "declined" ? <span className="customer-reschedule-state declined">Date change declined · You can request different dates</span> : null}{canReschedule && booking.reschedule_status !== "pending" && !isConfirmingCancel ? <button className="customer-reschedule-trigger" type="button" onClick={() => { setRescheduleDates((previous) => ({ ...previous, [booking.id]: { pickup: booking.pickup_date ?? "", returned: booking.return_date ?? "" } })); setRescheduleOpenId(rescheduleOpenId === booking.id ? null : booking.id); setConfirmCancelId(null); }}>Request date change</button> : null}{canCancel && !portfolioReadOnly && !isConfirmingCancel ? <button className="customer-cancel-trigger" type="button" onClick={() => { setConfirmCancelId(booking.id); setRescheduleOpenId(null); }}>Cancel booking</button> : null}</div>{canReschedule && booking.reschedule_status === "pending" && booking.requested_pickup_date && booking.requested_return_date ? <div className="customer-reschedule-pending"><strong>Proposed dates awaiting approval</strong><span>{displayDate(booking.requested_pickup_date)} → {displayDate(booking.requested_return_date)}</span><small>Proposed total: {rupees(booking.requested_rent ?? booking.rent)} · Current booking remains {dateRangeLabel(booking.pickup_date, booking.return_date)} until your host approves.</small></div> : null}{canReschedule && rescheduleOpenId === booking.id && booking.reschedule_status !== "pending" ? <div className="customer-reschedule-form"><p>Choose proposed dates. Your existing dates and price stay in place until your dealer approves.</p><div><label>New pick-up<input type="date" min={today} value={proposed.pickup} onChange={(event) => setRescheduleDates((previous) => ({ ...previous, [booking.id]: { ...proposed, pickup: event.target.value } }))} /></label><label>New return<input type="date" min={proposed.pickup ? shiftDate(proposed.pickup, 1) : shiftDate(today, 1)} max={proposed.pickup ? shiftDate(proposed.pickup, 365) : undefined} value={proposed.returned} onChange={(event) => setRescheduleDates((previous) => ({ ...previous, [booking.id]: { ...proposed, returned: event.target.value } }))} /></label></div><strong>Estimated revised total · {rupees(proposedTotal)}</strong><small>Uses your original daily rate of {rupees(dailyRate)}.</small><div className="customer-reschedule-actions"><button type="button" className="customer-cancel-keep" onClick={() => setRescheduleOpenId(null)}>Keep current dates</button><button type="button" className="customer-reschedule-send" disabled={reschedulingId === booking.id || proposedDays < 1 || proposedDays > 365} onClick={() => void submitReschedule(booking)}>{reschedulingId === booking.id ? "Sending…" : "Send to dealer"}</button></div></div> : null}{canCancel && !portfolioReadOnly && isConfirmingCancel ? <div className="customer-cancel-confirm" role="group" aria-label={`Confirm cancellation for booking ${booking.id}`}><p>No cancellation fee under this illustrative demo policy. Cancellation is unavailable on or after the pick-up date.</p><div><button type="button" className="customer-cancel-keep" onClick={() => setConfirmCancelId(null)} disabled={cancellingId === booking.id}>Keep booking</button><button type="button" className="customer-cancel-confirm-button" onClick={() => void cancelBooking(booking)} disabled={cancellingId === booking.id}>{cancellingId === booking.id ? "Cancelling…" : "Confirm cancellation"}</button></div></div> : null}</div></article>; })}</div> : <div className="customer-empty-orders"><span>✳</span><h3>No upcoming drives just yet.</h3><p>{portfolioReadOnly ? "This portfolio preview lets you explore your account while booking actions stay disabled." : "Choose a car above and turn a free day into a good story."}</p></div>}
      </section>
      {past.length ? <section className="customer-past-section"><div className="customer-past-heading"><div><p className="dealer-kicker">MILES ALREADY MADE</p><h2>Past drives</h2></div><button className="customer-booking-export" type="button" onClick={() => exportCustomerBookings(past, "completed")}>↓ Export history CSV</button></div><div className="customer-past-list">{past.map((booking) => <article key={booking.id}><span>#{String(booking.id).padStart(4, "0")}</span><strong>{booking.car}</strong><span>{dateRangeLabel(booking.pickup_date, booking.return_date)} · {durationLabel(booking.days)} · {rupees(booking.rent)}</span><span>Completed</span></article>)}</div></section> : null}
      {cancelled.length ? <section className="customer-past-section customer-cancelled-section"><div className="customer-past-heading"><div><p className="dealer-kicker">BOOKING HISTORY</p><h2>Cancelled bookings</h2></div><button className="customer-booking-export" type="button" onClick={() => exportCustomerBookings(cancelled, "cancelled")}>↓ Export cancelled CSV</button></div><div className="customer-past-list">{cancelled.map((booking) => <article key={booking.id}><span>#{String(booking.id).padStart(4, "0")}</span><strong>{booking.car}</strong><span>{dateRangeLabel(booking.pickup_date, booking.return_date)} · {durationLabel(booking.days)} · {rupees(booking.rent)}</span><span>Cancelled</span></article>)}</div></section> : null}
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

