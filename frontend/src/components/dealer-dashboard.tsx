"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

type Car = { id: number; name: string; city: string; capacity: string; rent: string; is_available: boolean; image: string };
type RentalStatus = "upcoming" | "in_progress" | "return_due" | "completed" | "cancelled" | "dates_unavailable";
type BookingSort = "newest" | "pickup" | "return";
type RescheduleHistoryItem = { id: number; pickup_date: string; return_date: string; proposed_total: string; status: "pending" | "approved" | "declined" | "cancelled"; requested_at?: string | null; decided_at?: string | null };
type Rental = { id: number; car: string; car_id: number; customer: string; days: string; pickup_date?: string | null; return_date?: string | null; rent: string; is_complete: boolean; is_cancelled?: boolean; status?: RentalStatus; requested_pickup_date?: string | null; requested_return_date?: string | null; reschedule_status?: "" | "pending" | "approved" | "declined"; requested_rent?: string | null; reschedule_history?: RescheduleHistoryItem[] };
type DashboardData = { cars: Car[]; orders: Rental[]; earnings: number; city: string };

function rentalStatus(rental: Rental): RentalStatus {
  return rental.status ?? (rental.is_cancelled ? "cancelled" : rental.is_complete ? "completed" : "upcoming");
}

function localDateISO(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysFromToday(value: string, today: string) {
  return Math.round((Date.parse(`${value}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

async function csrfToken() {
  const response = await fetch("/api/backend-proxy/api/csrf", { credentials: "same-origin" });
  if (!response.ok) throw new Error("Could not connect to the account service.");
  return (await response.json()).csrfToken as string;
}

async function apiRequest(path: string, init: RequestInit = {}) {
  const token = await csrfToken();
  const response = await fetch(`/api/backend-proxy${path}`, {
    ...init,
    credentials: "same-origin",
    headers: { "X-CSRFToken": token, ...init.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? "That action could not be completed.");
  return result;
}

function money(value: string | number) {
  const amount = Number(value);
  return `₹${Number.isFinite(amount) ? amount.toLocaleString("en-IN") : "0"}`;
}

function csvCell(value: string | number) {
  const text = String(value);
  const safeText = /^[\s]*[=+@\-]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function rentalDates(rental: Rental) {
  const duration = `${rental.days} day${Number(rental.days) === 1 ? "" : "s"}`;
  if (!rental.pickup_date || !rental.return_date) return duration;
  const format = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return `Pick-up ${format(rental.pickup_date)} · Return ${format(rental.return_date)} · ${duration}`;
}

function formatHistoryTimestamp(value?: string | null) {
  if (!value) return "Date not recorded for an earlier request";
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? "Date unavailable" : timestamp.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function DealerRescheduleHistory({ items }: { items?: RescheduleHistoryItem[] }) {
  if (!items?.length) return null;
  const labels = { pending: "Awaiting review", approved: "Approved", declined: "Declined", cancelled: "Booking cancelled" } satisfies Record<RescheduleHistoryItem["status"], string>;
  return <details className="dealer-reschedule-history"><summary>Date-change history · {items.length}</summary><ol>{items.map((item) => <li className={`history-${item.status}`} key={item.id}><div><strong>{labels[item.status]}</strong><span>{new Date(`${item.pickup_date}T00:00:00Z`).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "UTC" })} → {new Date(`${item.return_date}T00:00:00Z`).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "UTC" })}</span><small>Requested · {formatHistoryTimestamp(item.requested_at)}</small>{item.status !== "pending" ? <small>Decision · {formatHistoryTimestamp(item.decided_at)}</small> : null}</div><b>{money(item.proposed_total)}</b></li>)}</ol></details>;
}

function RentalTimeline({ status, pickupDate, returnDate }: { status: RentalStatus; pickupDate?: string | null; returnDate?: string | null }) {
  if (status === "cancelled") return <p className="booking-timeline-unavailable">Cancelled before pickup. The car is available for new bookings.</p>;
  if (status === "dates_unavailable" || !pickupDate || !returnDate) return <p className="booking-timeline-unavailable">Timeline unavailable because rental dates were not recorded.</p>;
  const format = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const steps = [
    { title: "Booked", detail: "Reservation confirmed", state: "complete" },
    { title: "Pick-up", detail: format(pickupDate), state: status === "upcoming" ? "next" : "complete" },
    { title: "Return", detail: format(returnDate), state: status === "completed" ? "complete" : status === "return_due" ? "current" : status === "in_progress" ? "next" : "future" },
  ];
  return <ol className={`booking-timeline ${status}`} aria-label={`Booking timeline: ${status.replaceAll("_", " ")}`}>
    {steps.map((step) => <li className={`booking-timeline-step ${step.state}`} key={step.title} aria-current={step.state === "current" || step.state === "next" ? "step" : undefined}><span className="booking-timeline-marker" aria-hidden="true" /><span className="booking-timeline-copy"><strong>{step.title}</strong><small>{step.detail}</small></span></li>)}
  </ol>;
}

function CarForm({ car, onClose, onSaved }: { car?: Car; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const form = new FormData(event.currentTarget);
      if (car) {
        const image = form.get("image");
        if (image instanceof File && image.size > 0) {
          const photo = new FormData();
          photo.append("image", image);
          await apiRequest(`/api/dealer/cars/${car.id}/photo`, { method: "POST", body: photo });
        }
        await apiRequest(`/api/dealer/cars/${car.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.get("name"), city: form.get("city"), capacity: form.get("capacity"), rent: form.get("rent") }),
        });
      } else {
        await apiRequest("/api/dealer/cars", { method: "POST", body: form });
      }
      onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save this vehicle.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="dealer-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="dealer-modal" role="dialog" aria-modal="true" aria-labelledby="car-form-title">
      <button className="dealer-modal-close" onClick={onClose} type="button" aria-label="Close">×</button>
      <p className="dealer-kicker">YOUR FLEET</p><h2 id="car-form-title">{car ? "Edit vehicle" : "Add a vehicle"}</h2>
      <form className="dealer-form" onSubmit={save}>
        <label>Car name<input name="name" required maxLength={50} defaultValue={car?.name} placeholder="e.g. Tata Nexon" /></label>
        <div className="dealer-form-row">
          <label>City<input name="city" required maxLength={50} defaultValue={car?.city} placeholder="Kochi" /></label>
          <label>Seats<input name="capacity" type="number" required min={1} max={99} defaultValue={car?.capacity} placeholder="5" /></label>
        </div>
        <label>Daily rate (₹)<input name="rent" type="number" required min={1} step={1} defaultValue={car?.rent} placeholder="2500" /></label>
        <label>Car photo{car ? " (optional)" : ""}<input name="image" type="file" accept="image/*" required={!car} /></label>
        {error ? <p className="dealer-error" role="alert">{error}</p> : null}
        <button className="dealer-primary" disabled={saving}>{saving ? "Saving…" : car ? "Save changes" : "Add to fleet"}</button>
      </form>
    </section>
  </div>;
}

export default function DealerDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [dealerName, setDealerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Car | null | false>(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [newBookingIds, setNewBookingIds] = useState<number[]>([]);
  const [today, setToday] = useState("");
  const [bookingFilter, setBookingFilter] = useState<"open" | "completed" | "cancelled">("open");
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingSort, setBookingSort] = useState<BookingSort>("newest");
  const knownBookingIds = useRef<Set<number> | null>(null);

  const refresh = useCallback(async () => {
    const sessionResponse = await fetch("/api/backend-proxy/api/dealer/session", { credentials: "same-origin", cache: "no-store" });
    if (!sessionResponse.ok) {
      router.replace("/dealer/login");
      return;
    }
    const session = await sessionResponse.json();
    setDealerName(session.dealer.name);
    const response = await fetch("/api/backend-proxy/api/dealer/dashboard", { credentials: "same-origin", cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not load your dealer workspace.");
    const currentIds = new Set<number>((result.orders as Rental[]).map((rental) => rental.id));
    if (knownBookingIds.current === null) {
      knownBookingIds.current = currentIds;
    } else {
      const activeIds = new Set<number>((result.orders as Rental[]).filter((rental) => rentalStatus(rental) !== "cancelled" && !rental.is_complete).map((rental) => rental.id));
      const arrivals = [...currentIds].filter((id) => activeIds.has(id) && !knownBookingIds.current?.has(id));
      setNewBookingIds((previous) => [...new Set([...previous.filter((id) => activeIds.has(id)), ...arrivals])]);
      knownBookingIds.current = currentIds;
    }
    setData(result);
  }, [router]);

  useEffect(() => {
    const load = () => {
      void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load the dealer workspace.")).finally(() => setLoading(false));
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

  async function logout() {
    try {
      await apiRequest("/api/dealer/logout", { method: "POST" });
    } finally {
      router.replace("/dealer/login");
    }
  }

  async function toggleAvailability(car: Car) {
    setBusyId(car.id); setNotice("");
    try {
      await apiRequest(`/api/dealer/cars/${car.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_available: !car.is_available }) });
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update availability."); }
    finally { setBusyId(null); }
  }

  async function removeCar(car: Car) {
    if (!window.confirm(`Remove ${car.name} from your fleet?`)) return;
    setBusyId(car.id); setNotice("");
    try {
      await apiRequest(`/api/dealer/cars/${car.id}`, { method: "DELETE" });
      setNotice(`${car.name} was removed from your fleet.`);
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not remove this vehicle."); }
    finally { setBusyId(null); }
  }

  async function completeRental(rental: Rental) {
    setBusyId(rental.id); setNotice("");
    try {
      await apiRequest(`/api/dealer/orders/${rental.id}/complete`, { method: "POST" });
      setNotice(`Rental #${rental.id} is complete. ${rental.car} is available again.`);
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not complete this rental."); }
    finally { setBusyId(null); }
  }

  async function decideReschedule(rental: Rental, decision: "approve" | "decline") {
    setBusyId(rental.id); setError(""); setNotice("");
    try {
      await apiRequest(`/api/dealer/orders/${rental.id}/reschedule/${decision}`, { method: "POST" });
      setNotice(decision === "approve" ? `Date change approved for booking #${String(rental.id).padStart(4, "0")}.` : `Date change declined for booking #${String(rental.id).padStart(4, "0")}.`);
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update the date-change request."); }
    finally { setBusyId(null); }
  }

  if (loading) return <main className="dealer-loading"><span className="dealer-spinner" /><p>Opening your workspace…</p></main>;
  const cars = data?.cars ?? [];
  const rentals = data?.orders ?? [];
  const openBookings = rentals.filter((rental) => !["completed", "cancelled"].includes(rentalStatus(rental)));
  const upcomingRentals = rentals.filter((rental) => rental.status === "upcoming");
  const inProgressRentals = rentals.filter((rental) => rental.status === "in_progress");
  const returnDueRentals = rentals.filter((rental) => rental.status === "return_due");
  const pendingReschedules = rentals.filter((rental) => rental.reschedule_status === "pending" && rentalStatus(rental) === "upcoming");
  const completedRentals = rentals.filter((rental) => rentalStatus(rental) === "completed");
  const cancelledRentals = rentals.filter((rental) => rentalStatus(rental) === "cancelled");
  const filterSource = bookingFilter === "open" ? openBookings : bookingFilter === "completed" ? completedRentals : cancelledRentals;
  const normalizedSearch = bookingSearch.trim().toLocaleLowerCase();
  const searchedRentals = normalizedSearch ? filterSource.filter((rental) => [String(rental.id), String(rental.id).padStart(4, "0"), rental.customer, rental.car].some((value) => value.toLocaleLowerCase().includes(normalizedSearch))) : filterSource;
  const filteredRentals = [...searchedRentals].sort((left, right) => {
    if (bookingSort === "newest") return right.id - left.id;
    const key = bookingSort === "pickup" ? "pickup_date" : "return_date";
    const leftDate = left[key];
    const rightDate = right[key];
    if (!leftDate && !rightDate) return right.id - left.id;
    if (!leftDate) return 1;
    if (!rightDate) return -1;
    return leftDate.localeCompare(rightDate) || right.id - left.id;
  });

  function exportBookings() {
    const rows = [
      ["Booking number", "Customer", "Vehicle", "Pick-up date", "Return date", "Duration (days)", "Total (INR)", "Status"],
      ...filteredRentals.map((rental) => [
        `#${String(rental.id).padStart(4, "0")}`,
        rental.customer,
        rental.car,
        rental.pickup_date ?? "Not recorded",
        rental.return_date ?? "Not recorded",
        rental.days,
        rental.rent,
        rentalStatus(rental),
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `rove-${bookingFilter}-bookings-${localDateISO()}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const pickupAlerts = today ? rentals.flatMap((rental) => {
    if (rental.is_complete || rentalStatus(rental) === "cancelled" || !rental.pickup_date) return [];
    const daysUntilPickup = daysFromToday(rental.pickup_date, today);
    return daysUntilPickup >= 0 && daysUntilPickup <= 3 ? [{ rental, daysUntilPickup }] : [];
  }) : [];
  const attentionCount = newBookingIds.length + pickupAlerts.length + returnDueRentals.length + pendingReschedules.length;

  return <main className="dealer-app">
    <aside className="dealer-sidebar">
      <Link className="brand dealer-brand" href="/" aria-label="Rove home"><span className="brand-mark">r</span><span>rove<span className="brand-period">.</span></span></Link>
      <p className="dealer-side-label">DEALER SPACE</p>
      <a className="dealer-side-link current" href="#overview"><span>◫</span> Overview</a>
      <a className="dealer-side-link" href="#vehicles"><span>▱</span> My vehicles</a>
      <a className="dealer-side-link" href="#bookings"><span>▤</span> Bookings <i>{openBookings.length}</i></a>
      <div className="dealer-sidebar-bottom"><span className="dealer-avatar">{dealerName.slice(0, 1).toUpperCase()}</span><span className="dealer-user"><strong>{dealerName}</strong><small>Verified dealer</small></span><button onClick={() => void logout()} type="button" aria-label="Sign out">↗</button></div>
    </aside>

    <section className="dealer-workspace" id="overview">
      <header className="dealer-topbar"><div><p className="dealer-kicker">DEALER DASHBOARD <span>·</span> {data?.city ?? "YOUR BUSINESS"}</p><h1>Good to see you, <em>{dealerName.split(" ")[0]}.</em></h1></div><div className="dealer-top-actions"><span className="dealer-live-dot">Live inventory</span><button className="dealer-primary dealer-add-top" onClick={() => setEditing(null)} type="button">＋ Add a car</button></div></header>
      {error ? <p className="dealer-banner dealer-banner-error" role="alert">{error}<button type="button" onClick={() => setError("")}>Dismiss</button></p> : null}
      {notice ? <p className="dealer-banner" role="status">{notice}<button type="button" onClick={() => setNotice("")}>Dismiss</button></p> : null}

      {attentionCount ? <section className="dealer-attention-panel" aria-label="Booking notifications"><div className="dealer-attention-heading"><div><p className="dealer-kicker">NEEDS YOUR ATTENTION</p><h2>{attentionCount} booking update{attentionCount === 1 ? "" : "s"}</h2></div>{newBookingIds.length ? <button type="button" onClick={() => setNewBookingIds([])}>Mark new bookings seen</button> : null}</div><div className="dealer-attention-items">
        {newBookingIds.map((id) => { const rental = rentals.find((item) => item.id === id); return rental ? <a className="dealer-attention-item new" href="#bookings" key={`new-${id}`}><span className="dealer-attention-tag">New</span><strong>New booking #{String(id).padStart(4, "0")}</strong><small>{rental.car} · {rental.customer}</small></a> : null; })}
        {pickupAlerts.map(({ rental, daysUntilPickup }) => <a className="dealer-attention-item pickup" href="#bookings" key={`pickup-${rental.id}`}><span className="dealer-attention-tag">Pickup</span><strong>{daysUntilPickup === 0 ? "Pickup today" : `Pickup in ${daysUntilPickup} day${daysUntilPickup === 1 ? "" : "s"}`}</strong><small>{rental.car} · {rental.customer}</small></a>)}
        {returnDueRentals.map((rental) => <a className="dealer-attention-item due" href="#bookings" key={`due-${rental.id}`}><span className="dealer-attention-tag">Return</span><strong>Return is due</strong><small>{rental.car} · {rental.customer}</small></a>)}
        {pendingReschedules.map((rental) => <a className="dealer-attention-item reschedule" href="#bookings" key={`reschedule-${rental.id}`}><span className="dealer-attention-tag">Date change</span><strong>Review booking #{String(rental.id).padStart(4, "0")}</strong><small>{rental.car} · {rental.customer}</small></a>)}
      </div></section> : null}

      <div className="dealer-stats">
        <article className="dealer-stat-card"><span>Vehicles listed</span><strong>{cars.length.toString().padStart(2, "0")}</strong><small>{cars.filter((car) => car.is_available).length} available to rent</small></article>
        <article className="dealer-stat-card dealer-rental-status-card"><span>Rental status</span><div className="dealer-rental-status-counts"><div><strong>{upcomingRentals.length.toString().padStart(2, "0")}</strong><small>Upcoming</small></div><div><strong>{inProgressRentals.length.toString().padStart(2, "0")}</strong><small>In progress</small></div><div><strong>{returnDueRentals.length.toString().padStart(2, "0")}</strong><small>Return due</small></div></div><small>{openBookings.length} open booking{openBookings.length === 1 ? "" : "s"} across your fleet</small></article>
        <article className="dealer-stat-card dealer-earnings-card"><span>Total earnings</span><strong>{money(data?.earnings ?? 0)}</strong><small>Recorded rental revenue</small><i aria-hidden="true">↗</i></article>
      </div>

      <section className="dealer-section" id="vehicles">
        <div className="dealer-section-heading"><div><p className="dealer-kicker">YOUR GARAGE</p><h2>Vehicles <span>{cars.length}</span></h2></div><button className="dealer-secondary" onClick={() => setEditing(null)} type="button">＋ Add vehicle</button></div>
        {cars.length ? <div className="dealer-vehicle-grid">{cars.map((car) => <article className="dealer-vehicle-card" key={car.id}>
          <div className="dealer-vehicle-image">{car.image ? <Image src={car.image} alt={car.name} fill sizes="(max-width: 700px) 90vw, (max-width: 1100px) 45vw, 30vw" /> : <span>ROVE</span>}<span className={`dealer-status ${car.is_available ? "available" : "unavailable"}`}>{car.is_available ? "Available" : "Rented / paused"}</span></div>
          <div className="dealer-vehicle-info"><div><p>{car.city} <span>·</span> {car.capacity} seats</p><h3>{car.name}</h3></div><strong>{money(car.rent)}<small> / day</small></strong></div>
          <div className="dealer-vehicle-actions"><button type="button" onClick={() => setEditing(car)}>Edit details</button><button type="button" disabled={busyId === car.id} onClick={() => void toggleAvailability(car)}>{busyId === car.id ? "Updating…" : car.is_available ? "Pause listing" : "Make available"}</button><button className="dealer-remove" type="button" disabled={busyId === car.id} onClick={() => void removeCar(car)}>Remove</button></div>
        </article>)}</div> : <div className="dealer-empty"><span>▱</span><h3>Your garage starts here.</h3><p>Add your first vehicle and it will appear in the customer fleet when available.</p><button className="dealer-primary" onClick={() => setEditing(null)} type="button">＋ Add your first car</button></div>}
      </section>

      <section className="dealer-section dealer-bookings-section" id="bookings">
        <div className="dealer-section-heading"><div><p className="dealer-kicker">RENTAL ACTIVITY</p><h2>Bookings <span>{openBookings.length} open</span></h2></div><div className="dealer-booking-tools"><label className="dealer-booking-search"><span aria-hidden="true">⌕</span><input type="search" value={bookingSearch} onChange={(event) => setBookingSearch(event.target.value)} placeholder="Search customer, car, or booking #" aria-label="Search bookings by customer, car, or booking number" /></label><label className="dealer-booking-sort-label"><span>Sort</span><select value={bookingSort} onChange={(event) => setBookingSort(event.target.value as BookingSort)} aria-label="Sort bookings"><option value="newest">Newest</option><option value="pickup">Pick-up date</option><option value="return">Return date</option></select></label><div className="dealer-booking-filters" role="group" aria-label="Filter bookings"><button className={bookingFilter === "open" ? "selected" : ""} type="button" aria-pressed={bookingFilter === "open"} onClick={() => setBookingFilter("open")}>Open <i>{openBookings.length}</i></button><button className={bookingFilter === "completed" ? "selected" : ""} type="button" aria-pressed={bookingFilter === "completed"} onClick={() => setBookingFilter("completed")}>Completed <i>{completedRentals.length}</i></button><button className={bookingFilter === "cancelled" ? "selected" : ""} type="button" aria-pressed={bookingFilter === "cancelled"} onClick={() => setBookingFilter("cancelled")}>Cancelled <i>{cancelledRentals.length}</i></button></div><button className="dealer-booking-export" type="button" onClick={exportBookings} disabled={!filteredRentals.length} title={`Export ${filteredRentals.length} visible booking${filteredRentals.length === 1 ? "" : "s"} as CSV`}>↓ Export CSV</button></div></div>
        {rentals.length ? filteredRentals.length ? <div className="dealer-booking-list">{filteredRentals.map((rental) => { const status = rental.status ?? (rental.is_complete ? "completed" : "upcoming"); const label = ({ upcoming: "Upcoming", in_progress: "In progress", return_due: "Return due", completed: "Complete", cancelled: "Cancelled", dates_unavailable: "Dates unavailable" } satisfies Record<RentalStatus, string>)[status]; const formatDate = (value?: string | null) => value ? new Date(`${value}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "Not recorded"; const completionAllowed = status === "in_progress" || status === "return_due"; const actionHint = rental.reschedule_status === "pending" ? "Review the pending date-change request first." : status === "upcoming" ? "Completion is available after the pickup date." : status === "dates_unavailable" ? "Review the legacy dates before completing this booking." : status === "cancelled" ? "Cancelled by the customer." : ""; const isNew = newBookingIds.includes(rental.id); return <article className={`dealer-booking-row ${isNew ? "is-new" : ""}`} key={rental.id}><div className="dealer-booking-id">#{String(rental.id).padStart(4, "0")}</div><div className="dealer-booking-main"><strong>{rental.car}{isNew ? <span className="dealer-new-booking-badge">NEW</span> : null}</strong><span>{rental.customer} <i>·</i> {rentalDates(rental)}</span></div><strong className="dealer-booking-price">{money(rental.rent)}</strong><span className={`dealer-booking-status ${status}`}>{rental.reschedule_status === "pending" ? "Date change" : label}</span>{rental.reschedule_status === "pending" ? <span className="dealer-booking-action-hint">Review request below.</span> : rental.is_complete || status === "cancelled" ? null : completionAllowed ? <button className={`dealer-secondary ${status === "return_due" ? "dealer-return-due-action" : ""}`} disabled={busyId === rental.id} onClick={() => void completeRental(rental)} type="button">{busyId === rental.id ? "Saving…" : status === "return_due" ? "Confirm return" : "Mark complete"}</button> : <span className="dealer-booking-action-hint">{actionHint}</span>}<details className="dealer-booking-details"><summary>View details</summary><dl><div><dt>Customer</dt><dd>{rental.customer}</dd></div><div><dt>Vehicle</dt><dd>{rental.car}</dd></div><div><dt>Pick-up date</dt><dd>{formatDate(rental.pickup_date)}</dd></div><div><dt>Return date</dt><dd>{formatDate(rental.return_date)}</dd></div><div><dt>Duration</dt><dd>{rental.days} day{Number(rental.days) === 1 ? "" : "s"}</dd></div><div><dt>Total rental</dt><dd>{money(rental.rent)}</dd></div><div><dt>Booking status</dt><dd>{label}</dd></div></dl>{rental.reschedule_status === "pending" && rental.requested_pickup_date && rental.requested_return_date ? <section className="dealer-reschedule-review"><div><p className="dealer-kicker">CUSTOMER DATE-CHANGE REQUEST</p><strong>{formatDate(rental.requested_pickup_date)} → {formatDate(rental.requested_return_date)}</strong><small>{rental.requested_rent ? `${money(rental.requested_rent)} revised total` : "Revised price unavailable"} · original booking stays unchanged until approval</small></div><div><button type="button" className="dealer-secondary" disabled={busyId === rental.id} onClick={() => void decideReschedule(rental, "decline")}>Decline</button><button type="button" className="dealer-primary" disabled={busyId === rental.id} onClick={() => void decideReschedule(rental, "approve")}>{busyId === rental.id ? "Saving…" : "Approve dates"}</button></div></section> : rental.reschedule_status ? <p className={`dealer-reschedule-outcome ${rental.reschedule_status}`}>Most recent customer date-change request: {rental.reschedule_status}.</p> : null}<DealerRescheduleHistory items={rental.reschedule_history} /><RentalTimeline status={status} pickupDate={rental.pickup_date} returnDate={rental.return_date} /></details></article>; })}</div> : <div className="dealer-bookings-empty">{normalizedSearch ? `No ${bookingFilter} bookings match “${bookingSearch.trim()}”.` : `No ${bookingFilter} bookings to show.`}</div> : <div className="dealer-bookings-empty">No bookings yet. New rentals for your listed vehicles will appear here.</div>}
      </section>
      <footer className="dealer-footer"><span>Rove dealer space</span><span>Inventory changes sync to the customer fleet</span><button type="button" onClick={() => void refresh()}>↻ Refresh data</button></footer>
    </section>
    {editing !== false ? <CarForm car={editing || undefined} onClose={() => setEditing(false)} onSaved={() => { setNotice(editing ? "Vehicle details saved." : "Vehicle added to your fleet and customer listings."); void refresh(); }} /> : null}
  </main>;
}
