"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type VehicleCategory = "SUV" | "Sedan" | "Compact" | "Premium";
type Vehicle = {
  id: number;
  name: string;
  category: VehicleCategory;
  location: string;
  seats: number;
  price: number;
  image: string;
  accent: string;
  tag?: string;
};

// A local preview catalog shaped from the cars in the original SQLite project.
const vehicles: Vehicle[] = [
  { id: 15, name: "MG Astor", category: "SUV", location: "Kozhikode", seats: 5, price: 2500, image: "/images/cars/mg-astor.jpg", accent: "#f4e8dc" },
  { id: 4, name: "Toyota Innova Crysta", category: "Premium", location: "Trivandrum", seats: 7, price: 500, image: "/images/cars/toyota-innova.jpg", accent: "#e9ece6", tag: "7 seats" },
  { id: 11, name: "Tata Nexon", category: "SUV", location: "Ernakulam", seats: 5, price: 1500, image: "/images/cars/tata-nexon.jpg", accent: "#e7e9e1" },
  { id: 5, name: "Honda Amaze", category: "Sedan", location: "Palakkad", seats: 4, price: 400, image: "/images/cars/honda-amaze.jpg", accent: "#e8ece9" },
  { id: 7, name: "Maruti Swift Dzire", category: "Sedan", location: "Alappuzha", seats: 5, price: 900, image: "/images/cars/maruti-dzire.jpg", accent: "#ece9df" },
  { id: 8, name: "Mahindra Scorpio", category: "SUV", location: "Kannur", seats: 7, price: 1000, image: "/images/cars/mahindra-scorpio.jpg", accent: "#e4e7e5" },
];

const categories = ["All cars", "SUV", "Sedan", "Compact", "Premium"] as const;
type CategoryFilter = (typeof categories)[number];

const featureSlides = [
  { carId: 15, firstLine: "The road is", secondLine: "yours.", eyebrow: "THE WEEKEND EDIT", copy: "Set out from Kozhikode in the MG Astor and leave room for a few unexpected turns." },
  { carId: 4, firstLine: "Make room for", secondLine: "everyone.", eyebrow: "THE TOGETHER EDIT", copy: "Seven seats, one shared playlist, and a longer way home in the Innova Crysta." },
  { carId: 11, firstLine: "The good kind of", secondLine: "detour.", eyebrow: "THE OUT-OF-TOWN EDIT", copy: "Take the scenic route out of Ernakulam in the Tata Nexon." },
  { carId: 7, firstLine: "A little car.", secondLine: "A big day.", eyebrow: "THE CITY ESCAPE EDIT", copy: "Make your own itinerary in the Swift Dzire, starting in Alappuzha." },
];

function ArrowIcon({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      {diagonal ? <path d="M5 15 15 5M6 5h9v9" /> : <path d="M3.5 10h12m-5-5 5 5-5 5" />}
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={filled ? "heart-filled" : ""}><path d="M20.8 8.8c0 4.1-8.8 10-8.8 10s-8.8-5.9-8.8-10a4.6 4.6 0 0 1 8.8-1.7 4.6 4.6 0 0 1 8.8 1.7Z" /></svg>;
}

function CarShowcase() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = featureSlides[activeSlide];
  const vehicle = vehicles.find((item) => item.id === slide.carId) ?? vehicles[0];

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => setActiveSlide((current) => (current + 1) % featureSlides.length), 6500);
    return () => window.clearTimeout(timer);
  }, [activeSlide, paused]);

  function moveSlide(direction: number) {
    setActiveSlide((current) => (current + direction + featureSlides.length) % featureSlides.length);
  }

  return (
    <section
      className="showcase"
      aria-label="Featured rental cars"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false); }}
    >
      <div className="showcase-copy" aria-live="polite" aria-atomic="true">
        <p className="eyebrow"><span className="eyebrow-line" /> {slide.eyebrow}</p>
        <h1><span>{slide.firstLine}</span><em>{slide.secondLine}</em></h1>
        <p className="showcase-description">{slide.copy}</p>
        <a className="button button-dark" href="#fleet">Explore the fleet <ArrowIcon /></a>
        <div className="showcase-specs"><span>{vehicle.name}</span><span>{vehicle.seats} seats</span><span>{vehicle.location}</span></div>
      </div>
      <div className="showcase-visual" key={vehicle.id}>
        <span className="showcase-index">0{activeSlide + 1}<i />0{featureSlides.length}</span>
        <Image src={vehicle.image} alt={`${vehicle.name}, featured rental car`} fill priority={activeSlide === 0} sizes="(max-width: 700px) 100vw, 62vw" className="showcase-car" />
        <span className="showcase-vertical" aria-hidden="true">ROVE MOBILITY · KERALA</span>
      </div>
      <div className="showcase-controls" aria-label="Featured car controls">
        <div className="showcase-dots" role="group" aria-label="Choose featured car">
          {featureSlides.map((item, index) => <button key={item.carId} type="button" aria-label={`Show ${vehicles.find((car) => car.id === item.carId)?.name}`} aria-pressed={activeSlide === index} className={activeSlide === index ? "active" : ""} onClick={() => setActiveSlide(index)}><span /></button>)}
        </div>
        <div className="showcase-arrows">
          <button type="button" aria-label="Previous car" onClick={() => moveSlide(-1)}><span aria-hidden="true">←</span></button>
          <button type="button" aria-label="Next car" onClick={() => moveSlide(1)}><span aria-hidden="true">→</span></button>
        </div>
      </div>
      <p className="showcase-footnote">A GOOD CAR MAKES A GOOD STORY.</p>
    </section>
  );
}

function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const [saved, setSaved] = useState(false);
  return (
    <article className="vehicle-card">
      <div className="vehicle-visual" style={{ backgroundColor: vehicle.accent }}>
        {vehicle.tag ? <span className="vehicle-tag">{vehicle.tag}</span> : null}
        <button className={`save-button ${saved ? "is-saved" : ""}`} type="button" aria-label={saved ? `Remove ${vehicle.name} from saved cars` : `Save ${vehicle.name}`} aria-pressed={saved} onClick={() => setSaved((current) => !current)}><HeartIcon filled={saved} /></button>
        <Image src={vehicle.image} alt={`${vehicle.name} rental car`} fill sizes="(max-width: 700px) 90vw, (max-width: 1100px) 45vw, 30vw" className="vehicle-image" />
      </div>
      <div className="vehicle-info">
        <div className="vehicle-name-row"><div><span className="vehicle-category">{vehicle.category}</span><h3>{vehicle.name}</h3></div></div>
        <p className="vehicle-meta">{vehicle.seats} seats <span>·</span> {vehicle.location}</p>
        <div className="vehicle-bottom"><p><strong>₹{vehicle.price.toLocaleString("en-IN")}</strong><span> / day</span></p><a className="text-link" href={`/customer/login?car=${vehicle.id}`}>View car <ArrowIcon /></a></div>
      </div>
    </article>
  );
}

export default function LandingPage() {
  const [category, setCategory] = useState<CategoryFilter>("All cars");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [showAll, setShowAll] = useState(false);
  const matchingVehicles = useMemo(() => vehicles.filter((vehicle) => {
    const matchesCategory = category === "All cars" || vehicle.category === category;
    const searchable = `${vehicle.name} ${vehicle.category} ${vehicle.location}`.toLowerCase();
    return matchesCategory && searchable.includes(query.trim().toLowerCase()) && (!location.trim() || vehicle.location.toLowerCase().includes(location.trim().toLowerCase()));
  }), [category, location, query]);
  const shownVehicles = showAll ? matchingVehicles : matchingVehicles.slice(0, 3);

  function searchFleet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    document.getElementById("fleet")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <main>
      <div className="preview-note">ROVE MOBILITY <span className="preview-separator">/</span> KERALA, INDIA <span className="preview-separator">/</span> TAKE THE ROAD THAT FEELS LIKE YOURS</div>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="Rove home"><span className="brand-mark">r</span><span>rove<span className="brand-period">.</span></span></Link>
        <nav className="desktop-nav" aria-label="Main navigation"><a href="#fleet">Explore cars</a><a href="#how-it-works">How it works</a></nav>
        <div className="header-actions"><a className="header-login" href="/customer/login">Log in</a><a className="button button-dark button-small" href="/customer/signup">Get started <ArrowIcon /></a></div>
      </header>

      <CarShowcase />

      <section className="search-wrap" aria-label="Search for a rental car">
        <form className="search-panel" onSubmit={searchFleet}>
          <label className="search-field search-location"><span className="field-icon location-icon" aria-hidden="true">⌖</span><span className="field-copy"><span className="field-label">Where to?</span><input aria-label="Pickup location" placeholder="City or destination" value={location} onChange={(event) => setLocation(event.target.value)} /></span></label>
          <label className="search-field"><span className="field-icon calendar-icon" aria-hidden="true">▦</span><span className="field-copy"><span className="field-label">Pick-up</span><input aria-label="Pickup date" type="date" /></span></label>
          <label className="search-field"><span className="field-icon calendar-icon" aria-hidden="true">▦</span><span className="field-copy"><span className="field-label">Return</span><input aria-label="Return date" type="date" /></span></label>
          <button className="button button-dark search-button" type="submit"><span>Search cars</span><ArrowIcon /></button>
        </form>
        <p className="search-hint"><span aria-hidden="true">✦</span> Want a little inspiration? <button type="button" onClick={() => { setQuery("SUV"); document.getElementById("fleet")?.scrollIntoView({ behavior: "smooth" }); }}>Browse SUVs</button></p>
      </section>

      <section className="intro-section" id="how-it-works">
        <div className="intro-copy"><p className="eyebrow"><span className="eyebrow-line" /> A LITTLE MORE FREEDOM</p><h2>Good trips start<br />with <em>great drives.</em></h2></div>
        <p className="intro-description">Skip the counter queues and the one-size-fits-all. Find the right car for your kind of trip, from people who know their cars best.</p>
        <div className="intro-stat"><strong>12</strong><span>cars to explore<br />in the current fleet</span></div>
      </section>

      <section className="fleet-section" id="fleet">
        <div className="fleet-heading"><div><p className="eyebrow"><span className="eyebrow-line" /> THE GOOD GARAGE</p><h2>Find your <em>kind</em> of ride.</h2></div><a className="text-link view-all-link" href="#fleet" onClick={(event) => { event.preventDefault(); setShowAll(true); }}>See the whole fleet <ArrowIcon /></a></div>
        <div className="fleet-toolbar"><div className="category-tabs" role="group" aria-label="Filter by car type">{categories.map((item) => <button className={`category-tab ${category === item ? "active" : ""}`} type="button" key={item} aria-pressed={category === item} onClick={() => { setCategory(item); setShowAll(false); }}>{item}</button>)}</div><label className="fleet-search"><span aria-hidden="true">⌕</span><input aria-label="Search cars by name, type or city" placeholder="Search the fleet" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></label></div>
        {shownVehicles.length > 0 ? <div className="vehicle-grid">{shownVehicles.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />)}</div> : <div className="empty-state"><span>⌕</span><h3>No rides found just yet</h3><p>Try another city or clear your filters to see the full fleet.</p><button className="text-link" type="button" onClick={() => { setQuery(""); setLocation(""); setCategory("All cars"); }}>Clear filters <ArrowIcon /></button></div>}
        {matchingVehicles.length > 3 && !showAll ? <button className="button button-outline load-more" type="button" onClick={() => setShowAll(true)}>Explore all {matchingVehicles.length} cars <ArrowIcon /></button> : null}
      </section>

      <section className="steps-section"><div className="steps-heading"><p className="eyebrow"><span className="eyebrow-line" /> THE EASY PART</p><h2>Three steps to <em>out there.</em></h2></div><div className="steps-grid"><article className="step-card"><span className="step-number">01</span><div className="step-symbol">⌕</div><h3>Find your fit</h3><p>Pick a car that feels right for the road and the people coming along.</p></article><article className="step-card"><span className="step-number">02</span><div className="step-symbol">↗</div><h3>Make it yours</h3><p>Share a few trip details. We’ll help you make sure everything’s in place.</p></article><article className="step-card"><span className="step-number">03</span><div className="step-symbol">✳</div><h3>Go make a day of it</h3><p>Meet your host, get the keys and take the scenic route for once.</p></article></div></section>

      <footer className="site-footer"><div className="footer-top"><Link href="/" className="brand brand-footer"><span className="brand-mark">r</span><span>rove<span className="brand-period">.</span></span></Link><p>Made for the miles that matter.</p><div className="footer-links"><a href="#fleet">Explore cars</a><a href="/customer/login">Customer login</a></div></div><div className="footer-bottom"><span>© 2026 Rove Mobility. Made for the journey.</span><span>Kerala, India <span aria-hidden="true">✳</span></span></div></footer>
    </main>
  );
}
