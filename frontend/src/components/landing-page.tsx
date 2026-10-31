"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type VehicleCategory = "SUV" | "Sedan" | "Compact" | "Premium";
type FuelFilter = "All fuels" | "Petrol" | "Diesel" | "CNG" | "EV" | "Hybrid";
type Vehicle = {
  id: number;
  name: string;
  category: VehicleCategory;
  location: string;
  seats: number;
  price: number;
  image: string;
  fuelType?: string;
  modelYear?: number | null;
  imageCredit?: string;
  imageLicense?: string;
  imageSourceUrl?: string;
  imageAttributionUrl?: string;
  imageIsIllustrative?: boolean;
  showcaseImage?: string;
  accent: string;
  tag?: string;
};

const repositoryImage = (path: string) => `https://raw.githubusercontent.com/akhilmadhuklkl/Online-Car-Rental-System-Project/main/frontend/public${path}`;
const modelPhotoOverrides: Record<string, string> = {
  "maruti suzuki dzire": repositoryImage("/images/cars/slideshow/maruti-dzire-cutout.png"),
  "toyota innova crysta": repositoryImage("/images/cars/slideshow/toyota-innova-cutout.png"),
  "tata nexon": repositoryImage("/images/cars/slideshow/tata-nexon-cutout.png"),
};

// Curated editorial slideshow; the live catalog below is loaded from the fleet API.
const vehicles: Vehicle[] = [
  { id: 901, name: "MG Astor", category: "SUV", location: "Kozhikode", seats: 5, price: 2500, image: repositoryImage("/images/cars/mg-astor.jpg"), showcaseImage: repositoryImage("/images/cars/slideshow/mg-astor-cutout.png"), accent: "#f4e8dc", tag: "Portfolio demo" },
  { id: 902, name: "Toyota Innova Crysta", category: "Premium", location: "Trivandrum", seats: 7, price: 3200, image: repositoryImage("/images/cars/toyota-innova.jpg"), showcaseImage: repositoryImage("/images/cars/slideshow/toyota-innova-cutout.png"), accent: "#e9ece6", tag: "7 seats · demo" },
  { id: 903, name: "Tata Nexon", category: "SUV", location: "Ernakulam", seats: 5, price: 1800, image: repositoryImage("/images/cars/tata-nexon.jpg"), showcaseImage: repositoryImage("/images/cars/slideshow/tata-nexon-cutout.png"), accent: "#e7e9e1", tag: "Portfolio demo" },
  { id: 904, name: "Honda Amaze", category: "Sedan", location: "Palakkad", seats: 4, price: 1400, image: repositoryImage("/images/cars/honda-amaze.jpg"), accent: "#e8ece9", tag: "Portfolio demo" },
  { id: 905, name: "Maruti Swift Dzire", category: "Sedan", location: "Alappuzha", seats: 5, price: 1500, image: repositoryImage("/images/cars/maruti-dzire.jpg"), showcaseImage: repositoryImage("/images/cars/slideshow/maruti-dzire-cutout.png"), accent: "#ece9df" },
  { id: 906, name: "Mahindra Scorpio", category: "SUV", location: "Kannur", seats: 7, price: 2800, image: repositoryImage("/images/cars/mahindra-scorpio.jpg"), accent: "#e4e7e5", tag: "7 seats · demo" },
];

const categories = ["All cars", "SUV", "Sedan", "Compact", "Premium"] as const;
type CategoryFilter = (typeof categories)[number];
const fuelFilters: FuelFilter[] = ["All fuels", "Petrol", "Diesel", "CNG", "EV", "Hybrid"];

const featureSlides = [
  { carId: 901, firstLine: "The road is", secondLine: "yours.", eyebrow: "THE WEEKEND EDIT", copy: "Set out from Kozhikode in the MG Astor and leave room for a few unexpected turns." },
  { carId: 902, firstLine: "Make room for", secondLine: "everyone.", eyebrow: "THE TOGETHER EDIT", copy: "Seven seats, one shared playlist, and a longer way home in the Innova Crysta." },
  { carId: 903, firstLine: "The good kind of", secondLine: "detour.", eyebrow: "THE OUT-OF-TOWN EDIT", copy: "Take the scenic route out of Ernakulam in the Tata Nexon." },
  { carId: 905, firstLine: "A little car.", secondLine: "A big day.", eyebrow: "THE CITY ESCAPE EDIT", copy: "Make your own itinerary in the Swift Dzire, starting in Alappuzha." },
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
  // Keep the editorial homepage slideshow tied to its curated photoshoot assets.
  // The database catalog can contain hundreds of different vehicles and should
  // only drive the searchable fleet cards below.
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
        <Image src={vehicle.showcaseImage ?? vehicle.image} alt={`${vehicle.name}, featured rental car`} fill priority={activeSlide === 0} unoptimized sizes="(max-width: 700px) 100vw, 62vw" className={`showcase-car showcase-car-${vehicle.id}`} />
        {vehicle.imageCredit && vehicle.imageSourceUrl ? <a className="showcase-photo-credit" href={vehicle.imageSourceUrl} target="_blank" rel="noreferrer">Photo: {vehicle.imageCredit} · {vehicle.imageLicense}{vehicle.imageIsIllustrative ? " · representative" : ""}</a> : null}
        <span className="showcase-vertical" aria-hidden="true">ROVE MOBILITY · KERALA</span>
      </div>
      <div className="showcase-controls" aria-label="Featured car controls">
        <div className="showcase-dots" role="group" aria-label="Choose featured car">
          {featureSlides.map((item, index) => <button key={item.carId} type="button" aria-label={`Show ${vehicles.find((car) => car.id === item.carId)?.name ?? "featured car"}`} aria-pressed={activeSlide === index} className={activeSlide === index ? "active" : ""} onClick={() => setActiveSlide(index)}><span /></button>)}
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
        <Image src={vehicle.image} alt={`${vehicle.name} rental car${vehicle.imageIsIllustrative ? " (illustrative photo)" : ""}`} fill unoptimized={vehicle.image.startsWith("http")} sizes="(max-width: 700px) 90vw, (max-width: 1100px) 45vw, 30vw" className="vehicle-image" />
      </div>
      <div className="vehicle-info">
        <div className="vehicle-name-row"><div><span className="vehicle-category">{vehicle.category}</span><h3>{vehicle.name}</h3></div></div>
        <p className="vehicle-meta">{vehicle.seats} seats{vehicle.fuelType ? <> <span>·</span> {vehicle.fuelType}</> : null}{vehicle.modelYear ? <> <span>·</span> {vehicle.modelYear}</> : null} <span>·</span> {vehicle.location}</p>
        {vehicle.imageCredit && vehicle.imageSourceUrl ? <span className="photo-credit">Photo: <a href={vehicle.imageSourceUrl} target="_blank" rel="noreferrer">{vehicle.imageCredit} · {vehicle.imageLicense}</a>{vehicle.imageAttributionUrl ? <> · <a href={vehicle.imageAttributionUrl} target="_blank" rel="noreferrer">license</a></> : null}{vehicle.imageIsIllustrative ? " · representative" : ""}</span> : null}
        <div className="vehicle-bottom"><p><strong>₹{vehicle.price.toLocaleString("en-IN")}</strong><span> / day</span></p><a className="text-link" href={`/customer/login?car=${vehicle.id}`}>View car <ArrowIcon /></a></div>
      </div>
    </article>
  );
}

export default function LandingPage() {
  const [catalog, setCatalog] = useState<Vehicle[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [category, setCategory] = useState<CategoryFilter>("All cars");
  const [fuelFilter, setFuelFilter] = useState<FuelFilter>("All fuels");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    let active = true;
    const loadFleet = () => {
      void fetch("/api/backend-proxy/api/cars", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error("Fleet unavailable")))
        .then((result: { cars: Array<{ id: number; name: string; city: string; capacity: string; rent: string; image: string; fuel_type?: string; model_year?: number | null; is_demo?: boolean; image_credit?: string; image_license?: string; image_source_url?: string; image_attribution_url?: string; image_is_illustrative?: boolean }> }) => {
          if (!active) return;
          if (!Array.isArray(result.cars)) { setCatalog([]); setCatalogLoaded(true); return; }
          setCatalog(result.cars.map((car) => {
            const preview = vehicles.find((item) => item.id === car.id);
            const seats = Number.parseInt(car.capacity, 10) || 4;
            const name = car.name.toLowerCase();
            const category: VehicleCategory = /bmw|mercedes|audi|innova|premium/.test(name) ? "Premium" : /swift|hatch|alto|compact/.test(name) ? "Compact" : /sedan|amaze|dzire|city|verna/.test(name) ? "Sedan" : "SUV";
            const modelPhoto = modelPhotoOverrides[name];
            return { id: car.id, name: car.name, category, location: car.city || "Kerala", seats, price: Number.parseInt(car.rent, 10) || 0, image: modelPhoto ?? car.image ?? preview?.image ?? "", fuelType: car.fuel_type, modelYear: car.model_year, imageCredit: modelPhoto ? "Rove Mobility project visual" : car.image_credit, imageLicense: modelPhoto ? "Project image" : car.image_license, imageSourceUrl: modelPhoto ? "https://github.com/akhilmadhuklkl/Online-Car-Rental-System-Project/tree/main/frontend/public/images/cars/slideshow" : car.image_source_url, imageAttributionUrl: modelPhoto ? undefined : car.image_attribution_url, imageIsIllustrative: modelPhoto ? true : car.image_is_illustrative, showcaseImage: preview?.showcaseImage, accent: preview?.accent ?? "#e4e6e3", tag: car.is_demo ? "Sample listing" : seats >= 7 ? `${seats} seats` : undefined };
          }));
          setCatalogLoaded(true);
        })
        .catch(() => { if (active) { setCatalog([]); setCatalogLoaded(true); } });
    };
    loadFleet();
    const interval = window.setInterval(loadFleet, 20000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  const matchingVehicles = useMemo(() => {
    const filtered = catalog.filter((vehicle) => {
    const matchesCategory = category === "All cars" || vehicle.category === category;
    const matchesFuel = fuelFilter === "All fuels" || vehicle.fuelType?.toLowerCase() === fuelFilter.toLowerCase();
    const searchable = `${vehicle.name} ${vehicle.category} ${vehicle.location}`.toLowerCase();
    return matchesCategory && matchesFuel && searchable.includes(query.trim().toLowerCase()) && (!location.trim() || vehicle.location.toLowerCase().includes(location.trim().toLowerCase()));
    });
    const unique = [...new Map(filtered.map((vehicle) => [`${vehicle.name.toLowerCase()}:${vehicle.fuelType?.toLowerCase() ?? "unknown"}:${vehicle.modelYear ?? ""}`, vehicle])).values()];
    const fuelOrder = ["Petrol", "Diesel", "CNG", "EV", "Hybrid"];
    const groups = fuelOrder.map((fuel) => unique.filter((vehicle) => vehicle.fuelType?.toLowerCase() === fuel.toLowerCase()));
    const diversified: Vehicle[] = [];
    for (let index = 0; groups.some((group) => index < group.length); index += 1) {
      for (const group of groups) if (group[index]) diversified.push(group[index]);
    }
    return diversified;
  }, [catalog, category, fuelFilter, location, query]);
  const shownVehicles = showAll ? matchingVehicles : matchingVehicles.slice(0, 12);

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
        <div className="intro-stat"><strong>{catalogLoaded ? catalog.length : "—"}</strong><span>cars to explore<br />in the current fleet</span></div>
      </section>

      <section className="fleet-section" id="fleet">
        <div className="fleet-heading"><div><p className="eyebrow"><span className="eyebrow-line" /> THE GOOD GARAGE</p><h2>Find your <em>kind</em> of ride.</h2></div><a className="text-link view-all-link" href="#fleet" onClick={(event) => { event.preventDefault(); setShowAll(true); }}>See the whole fleet <ArrowIcon /></a></div>
        <div className="fleet-toolbar"><div className="category-tabs" role="group" aria-label="Filter by car type">{categories.map((item) => <button className={`category-tab ${category === item ? "active" : ""}`} type="button" key={item} aria-pressed={category === item} onClick={() => { setCategory(item); setShowAll(false); }}>{item}</button>)}</div><label className="fleet-search"><span aria-hidden="true">⌕</span><input aria-label="Search cars by name, type or city" placeholder="Search the fleet" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></label></div>
        <div className="fuel-filter-tabs" role="group" aria-label="Filter by fuel type">{fuelFilters.map((item) => { const count = item === "All fuels" ? new Set(catalog.map((car) => `${car.name}:${car.fuelType}`)).size : new Set(catalog.filter((car) => car.fuelType?.toLowerCase() === item.toLowerCase()).map((car) => `${car.name}:${car.fuelType}`)).size; return <button className={`fuel-filter ${fuelFilter === item ? "active" : ""}`} type="button" key={item} aria-pressed={fuelFilter === item} onClick={() => { setFuelFilter(item); setShowAll(false); }}>{item}<span className="fuel-filter-count">{count}</span></button>; })}</div>
        {!catalogLoaded ? <div className="vehicle-loading" role="status">Loading the demo fleet…</div> : shownVehicles.length > 0 ? <div className="vehicle-grid">{shownVehicles.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />)}</div> : <div className="empty-state"><span>⌕</span><h3>No rides found just yet</h3><p>Try another city or clear your filters to see the full fleet.</p><button className="text-link" type="button" onClick={() => { setQuery(""); setLocation(""); setCategory("All cars"); setFuelFilter("All fuels"); setShowAll(false); }}>Clear filters <ArrowIcon /></button></div>}
        {matchingVehicles.length > shownVehicles.length && !showAll ? <button className="button button-outline load-more" type="button" onClick={() => setShowAll(true)}>Explore all {matchingVehicles.length} cars <ArrowIcon /></button> : null}
      </section>

      <section className="steps-section"><div className="steps-heading"><p className="eyebrow"><span className="eyebrow-line" /> THE EASY PART</p><h2>Three steps to <em>out there.</em></h2></div><div className="steps-grid"><article className="step-card"><span className="step-number">01</span><div className="step-symbol">⌕</div><h3>Find your fit</h3><p>Pick a car that feels right for the road and the people coming along.</p></article><article className="step-card"><span className="step-number">02</span><div className="step-symbol">↗</div><h3>Make it yours</h3><p>Share a few trip details. We’ll help you make sure everything’s in place.</p></article><article className="step-card"><span className="step-number">03</span><div className="step-symbol">✳</div><h3>Go make a day of it</h3><p>Meet your host, get the keys and take the scenic route for once.</p></article></div></section>

      <footer className="site-footer"><div className="footer-top"><Link href="/" className="brand brand-footer"><span className="brand-mark">r</span><span>rove<span className="brand-period">.</span></span></Link><p>Made for the miles that matter.</p><div className="footer-links"><a href="#fleet">Explore cars</a><a href="/customer/login">Customer login</a></div></div><div className="footer-bottom"><span>© 2026 Rove Mobility. Made for the journey.</span><span>Kerala, India <span aria-hidden="true">✳</span></span></div></footer>
    </main>
  );
}
