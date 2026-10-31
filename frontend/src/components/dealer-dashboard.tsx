"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type Car = { id: number; name: string; city: string; capacity: string; rent: string; is_available: boolean; image: string };
type Rental = { id: number; car: string; car_id: number; customer: string; days: string; rent: string; is_complete: boolean };
type DashboardData = { cars: Car[]; orders: Rental[]; earnings: number; city: string };

async function csrfToken() {
  const response = await fetch("/api/backend/api/csrf/", { credentials: "same-origin" });
  if (!response.ok) throw new Error("Could not connect to the account service.");
  return (await response.json()).csrfToken as string;
}

async function apiRequest(path: string, init: RequestInit = {}) {
  const token = await csrfToken();
  const response = await fetch(`/api/backend${path}`, {
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
          await apiRequest(`/api/dealer/cars/${car.id}/photo/`, { method: "POST", body: photo });
        }
        await apiRequest(`/api/dealer/cars/${car.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.get("name"), city: form.get("city"), capacity: form.get("capacity"), rent: form.get("rent") }),
        });
      } else {
        await apiRequest("/api/dealer/cars/", { method: "POST", body: form });
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

  const refresh = useCallback(async () => {
    const sessionResponse = await fetch("/api/backend/api/dealer/session/", { credentials: "same-origin", cache: "no-store" });
    if (!sessionResponse.ok) {
      router.replace("/dealer/login");
      return;
    }
    const session = await sessionResponse.json();
    setDealerName(session.dealer.name);
    const response = await fetch("/api/backend/api/dealer/dashboard/", { credentials: "same-origin", cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not load your dealer workspace.");
    setData(result);
  }, [router]);

  useEffect(() => {
    const task = window.setTimeout(() => {
      void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load the dealer workspace.")).finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(task);
  }, [refresh]);

  async function logout() {
    try {
      await apiRequest("/api/dealer/logout/", { method: "POST" });
    } finally {
      router.replace("/dealer/login");
    }
  }

  async function toggleAvailability(car: Car) {
    setBusyId(car.id); setNotice("");
    try {
      await apiRequest(`/api/dealer/cars/${car.id}/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_available: !car.is_available }) });
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update availability."); }
    finally { setBusyId(null); }
  }

  async function removeCar(car: Car) {
    if (!window.confirm(`Remove ${car.name} from your fleet?`)) return;
    setBusyId(car.id); setNotice("");
    try {
      await apiRequest(`/api/dealer/cars/${car.id}/`, { method: "DELETE" });
      setNotice(`${car.name} was removed from your fleet.`);
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not remove this vehicle."); }
    finally { setBusyId(null); }
  }

  async function completeRental(rental: Rental) {
    setBusyId(rental.id); setNotice("");
    try {
      await apiRequest(`/api/dealer/orders/${rental.id}/complete/`, { method: "POST" });
      setNotice(`Rental #${rental.id} is complete. ${rental.car} is available again.`);
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not complete this rental."); }
    finally { setBusyId(null); }
  }

  if (loading) return <main className="dealer-loading"><span className="dealer-spinner" /><p>Opening your workspace…</p></main>;
  const cars = data?.cars ?? [];
  const rentals = data?.orders ?? [];
  const activeRentals = rentals.filter((rental) => !rental.is_complete);

  return <main className="dealer-app">
    <aside className="dealer-sidebar">
      <Link className="brand dealer-brand" href="/" aria-label="Rove home"><span className="brand-mark">r</span><span>rove<span className="brand-period">.</span></span></Link>
      <p className="dealer-side-label">DEALER SPACE</p>
      <a className="dealer-side-link current" href="#overview"><span>◫</span> Overview</a>
      <a className="dealer-side-link" href="#vehicles"><span>▱</span> My vehicles</a>
      <a className="dealer-side-link" href="#bookings"><span>▤</span> Bookings <i>{activeRentals.length}</i></a>
      <div className="dealer-sidebar-bottom"><span className="dealer-avatar">{dealerName.slice(0, 1).toUpperCase()}</span><span className="dealer-user"><strong>{dealerName}</strong><small>Verified dealer</small></span><button onClick={() => void logout()} type="button" aria-label="Sign out">↗</button></div>
    </aside>

    <section className="dealer-workspace" id="overview">
      <header className="dealer-topbar"><div><p className="dealer-kicker">DEALER DASHBOARD <span>·</span> {data?.city ?? "YOUR BUSINESS"}</p><h1>Good to see you, <em>{dealerName.split(" ")[0]}.</em></h1></div><div className="dealer-top-actions"><span className="dealer-live-dot">Live inventory</span><button className="dealer-primary dealer-add-top" onClick={() => setEditing(null)} type="button">＋ Add a car</button></div></header>
      {error ? <p className="dealer-banner dealer-banner-error" role="alert">{error}<button type="button" onClick={() => setError("")}>Dismiss</button></p> : null}
      {notice ? <p className="dealer-banner" role="status">{notice}<button type="button" onClick={() => setNotice("")}>Dismiss</button></p> : null}

      <div className="dealer-stats">
        <article className="dealer-stat-card"><span>Vehicles listed</span><strong>{cars.length.toString().padStart(2, "0")}</strong><small>{cars.filter((car) => car.is_available).length} available to rent</small></article>
        <article className="dealer-stat-card"><span>Active rentals</span><strong>{activeRentals.length.toString().padStart(2, "0")}</strong><small>Across your fleet</small></article>
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
        <div className="dealer-section-heading"><div><p className="dealer-kicker">RENTAL ACTIVITY</p><h2>Bookings <span>{activeRentals.length} active</span></h2></div></div>
        {rentals.length ? <div className="dealer-booking-list">{rentals.map((rental) => <article className="dealer-booking-row" key={rental.id}><div className="dealer-booking-id">#{String(rental.id).padStart(4, "0")}</div><div className="dealer-booking-main"><strong>{rental.car}</strong><span>{rental.customer} <i>·</i> {rental.days} days</span></div><strong className="dealer-booking-price">{money(rental.rent)}</strong><span className={`dealer-booking-status ${rental.is_complete ? "complete" : "active"}`}>{rental.is_complete ? "Complete" : "In progress"}</span>{rental.is_complete ? null : <button className="dealer-secondary" disabled={busyId === rental.id} onClick={() => void completeRental(rental)} type="button">{busyId === rental.id ? "Saving…" : "Mark complete"}</button>}</article>)}</div> : <div className="dealer-bookings-empty">No bookings yet. New rentals for your listed vehicles will appear here.</div>}
      </section>
      <footer className="dealer-footer"><span>Rove dealer space</span><span>Inventory changes sync to the customer fleet</span><button type="button" onClick={() => void refresh()}>↻ Refresh data</button></footer>
    </section>
    {editing !== false ? <CarForm car={editing || undefined} onClose={() => setEditing(false)} onSaved={() => { setNotice(editing ? "Vehicle details saved." : "Vehicle added to your fleet and customer listings."); void refresh(); }} /> : null}
  </main>;
}
