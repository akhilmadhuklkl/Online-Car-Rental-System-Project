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
  studioImage?: string;
  studioPosition?: string;
  accent: string;
  tag?: string;
};

const repositoryImage = (path: string) => `https://raw.githubusercontent.com/akhilmadhuklkl/Online-Car-Rental-System-Project/main/frontend/public${path}`;
const studioModelKeys = [
  "maruti suzuki swift|petrol", "maruti suzuki baleno|petrol", "maruti suzuki dzire|petrol",
  "maruti suzuki wagon r|cng", "maruti suzuki ertiga|petrol", "maruti suzuki brezza|petrol",
  "maruti suzuki grand vitara|hybrid", "maruti suzuki alto 800|petrol", "hyundai santro|petrol",
  "hyundai grand i10 nios|cng", "hyundai i20|petrol", "hyundai creta|diesel",
  "hyundai creta|petrol", "hyundai venue|petrol", "hyundai aura|cng", "hyundai exter|cng",
  "tata tiago|petrol", "tata tiago|cng", "tata tiago ev|ev", "tata tigor|cng",
  "tata punch|petrol", "tata punch ev|ev", "tata altroz|diesel", "tata nexon|petrol",
  "tata nexon ev|ev", "tata harrier|diesel", "tata safari|diesel", "tata nano|petrol",
  "mahindra thar|diesel", "mahindra scorpio classic|diesel", "mahindra scorpio n|petrol",
  "mahindra xuv700|diesel", "mahindra xuv700|petrol", "mahindra xuv500|diesel",
  "mahindra bolero|diesel", "mahindra xuv 3xo|petrol", "mahindra be 6|ev",
  "toyota innova crysta|diesel", "toyota innova hycross|hybrid", "toyota fortuner|diesel",
  "toyota glanza|petrol", "honda city|petrol", "honda city e:hev|hybrid", "hyundai eon|petrol",
  "tata sierra|petrol", "tata sierra|diesel", "mahindra xev 9s|ev", "mahindra xuv 7xo|petrol",
  "mahindra xuv 7xo|diesel", "maruti suzuki e vitara|ev",
];
const studioFrames = new Map(studioModelKeys.map((key, index) => {
  const sheet = Math.floor(index / 9) + 1;
  const cell = index % 9;
  const column = cell % 3;
  const row = Math.floor(cell / 3);
  return [key, {
    image: repositoryImage(`/images/cars/studio/fleet-studio-${String(sheet).padStart(2, "0")}.png`),
    position: `${column * 50}% ${row * 50}%`,
  }] as const;
}));

// Curated editorial slideshow; the live catalog below is loaded from the fleet API.
const featuredCars = [
  { id: 901, name: "Toyota Innova Crysta", model: "toyota innova crysta|diesel", category: "Premium" as const, location: "Trivandrum", seats: 7, price: 3500, fuel: "Diesel" },
  { id: 902, name: "Maruti Suzuki Dzire", model: "maruti suzuki dzire|petrol", category: "Sedan" as const, location: "Alappuzha", seats: 5, price: 1950, fuel: "Petrol" },
  { id: 903, name: "Tata Nexon", model: "tata nexon|petrol", category: "SUV" as const, location: "Ernakulam", seats: 5, price: 2600, fuel: "Petrol" },
  { id: 904, name: "Tata Tiago EV", model: "tata tiago ev|ev", category: "Compact" as const, location: "Kozhikode", seats: 5, price: 2300, fuel: "EV" },
  { id: 905, name: "Mahindra Thar", model: "mahindra thar|diesel", category: "SUV" as const, location: "Kannur", seats: 4, price: 5000, fuel: "Diesel" },
  { id: 906, name: "Hyundai Creta", model: "hyundai creta|diesel", category: "SUV" as const, location: "Kochi", seats: 5, price: 3200, fuel: "Diesel" },
  { id: 907, name: "Tata Harrier", model: "tata harrier|diesel", category: "SUV" as const, location: "Thrissur", seats: 5, price: 3700, fuel: "Diesel" },
  { id: 908, name: "Toyota Fortuner", model: "toyota fortuner|diesel", category: "Premium" as const, location: "Trivandrum", seats: 7, price: 6500, fuel: "Diesel" },
  { id: 909, name: "Honda City", model: "honda city|petrol", category: "Sedan" as const, location: "Kollam", seats: 5, price: 2800, fuel: "Petrol" },
  { id: 910, name: "Maruti Grand Vitara", model: "maruti suzuki grand vitara|hybrid", category: "SUV" as const, location: "Alappuzha", seats: 5, price: 3400, fuel: "Hybrid" },
];
const vehicles: Vehicle[] = featuredCars.map((car) => {
  const frame = studioFrames.get(car.model);
  const cutout = {
    "toyota innova crysta|diesel": "/images/cars/slideshow/toyota-innova-cutout.png",
    "maruti suzuki dzire|petrol": "/images/cars/slideshow/maruti-dzire-cutout.png",
    "tata nexon|petrol": "/images/cars/slideshow/tata-nexon-cutout.png",
    "tata tiago ev|ev": "/images/cars/slideshow/tata-tiago-ev-cutout.png",
    "mahindra thar|diesel": "/images/cars/slideshow/mahindra-thar-cutout.png",
    "hyundai creta|diesel": "/images/cars/slideshow/hyundai-creta-cutout.png",
    "tata harrier|diesel": "/images/cars/slideshow/tata-harrier-cutout.png",
    "toyota fortuner|diesel": "/images/cars/slideshow/toyota-fortuner-cutout.png",
    "honda city|petrol": "/images/cars/slideshow/honda-city-cutout.png",
    "maruti suzuki grand vitara|hybrid": "/images/cars/slideshow/maruti-grand-vitara-cutout.png",
  }[car.model];
  return {
    id: car.id, name: car.name, category: car.category, location: car.location, seats: car.seats,
    price: car.price, image: frame?.image ?? "", showcaseImage: cutout ? repositoryImage(cutout) : undefined,
    studioImage: frame?.image, studioPosition: frame?.position,
    accent: "#171b18", fuelType: car.fuel, tag: "Portfolio demo",
  };
});

const categories = ["All cars", "SUV", "Sedan", "Compact", "Premium"] as const;
type CategoryFilter = (typeof categories)[number];
const fuelFilters: FuelFilter[] = ["All fuels", "Petrol", "Diesel", "CNG", "EV", "Hybrid"];

const featureSlides = [
  { carId: 901, firstLine: "MAKE ROOM FOR", secondLine: "EVERYONE.", eyebrow: "THE TOGETHER EDIT", copy: "SEVEN SEATS, ONE SHARED PLAYLIST, AND A LONGER WAY HOME IN THE INNOVA CRYSTA." },
  { carId: 902, firstLine: "A LITTLE CAR.", secondLine: "A BIG DAY.", eyebrow: "THE CITY ESCAPE EDIT", copy: "MAKE YOUR OWN ITINERARY IN THE DZIRE, STARTING IN ALAPPUZHA." },
  { carId: 903, firstLine: "TAKE THE", secondLine: "SCENIC ROUTE.", eyebrow: "THE OUT-OF-TOWN EDIT", copy: "A NEXON, A GOOD PLAYLIST, AND NOWHERE YOU NEED TO RUSH TO." },
  { carId: 904, firstLine: "QUIETLY", secondLine: "GO FURTHER.", eyebrow: "THE ELECTRIC EDIT", copy: "MAKE THE CITY YOURS IN THE ALL-ELECTRIC TIAGO EV." },
  { carId: 905, firstLine: "A LITTLE MORE", secondLine: "WILD.", eyebrow: "THE OPEN-ROAD EDIT", copy: "TAKE THE LONG WAY ROUND IN THE THAR AND SEE WHERE IT LEADS." },
  { carId: 906, firstLine: "FIND YOUR", secondLine: "OWN WAY.", eyebrow: "THE EVERYDAY EDIT", copy: "MAKE EVERY CITY DRIVE FEEL A LITTLE MORE LIKE YOURS IN THE CRETA." },
  { carId: 907, firstLine: "MAKE EVERY", secondLine: "MILE COUNT.", eyebrow: "THE BIG-TRIP EDIT", copy: "THE HARRIER IS READY FOR THE LONG WAY, THE SCENIC WAY, YOUR WAY." },
  { carId: 908, firstLine: "ARRIVE IN", secondLine: "YOUR ELEMENT.", eyebrow: "THE PREMIUM EDIT", copy: "BRING EXTRA ROOM AND A LITTLE EXTRA PRESENCE TO THE JOURNEY." },
  { carId: 909, firstLine: "TAKE THE DAY", secondLine: "AS IT COMES.", eyebrow: "THE CITY ESCAPE EDIT", copy: "SET YOUR OWN PACE AND TAKE THE CITY ONE TURN AT A TIME." },
  { carId: 910, firstLine: "ROOM TO", secondLine: "ROAM.", eyebrow: "THE HYBRID EDIT", copy: "MAKE A LITTLE MORE SPACE FOR THE PLACES YOU DIDN’T PLAN TO GO." },
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
    const timer = window.setTimeout(() => setActiveSlide((current) => (current + 1) % featureSlides.length), 5000);
    return () => window.clearTimeout(timer);
  }, [activeSlide, paused]);

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
        <a className="button button-dark" href="#fleet">EXPLORE THE FLEET <ArrowIcon /></a>
        <div className="showcase-specs"><span>{vehicle.name}</span><span>{vehicle.seats} SEATS · {vehicle.fuelType}</span><span>{vehicle.location}</span></div>
      </div>
      <div className="showcase-visual" key={vehicle.id}>
        <span className="showcase-index">{String(activeSlide + 1).padStart(2, "0")}<i />{String(featureSlides.length).padStart(2, "0")}</span>
        <Image src={vehicle.showcaseImage ?? vehicle.image} alt={`${vehicle.name}, featured rental car`} fill priority={activeSlide === 0} unoptimized sizes="(max-width: 700px) 100vw, 62vw" className={`showcase-car showcase-car-${vehicle.id}`} />
        {vehicle.imageCredit && vehicle.imageSourceUrl ? <a className="showcase-photo-credit" href={vehicle.imageSourceUrl} target="_blank" rel="noreferrer">Photo: {vehicle.imageCredit} · {vehicle.imageLicense}{vehicle.imageIsIllustrative ? " · representative" : ""}</a> : null}
        <span className="showcase-vertical" aria-hidden="true">ROVE MOBILITY · KERALA</span>
      </div>
      <div className="showcase-controls" aria-label="Featured car controls">
        <div className="showcase-dots" role="group" aria-label="Choose featured car">
          {featureSlides.map((item, index) => <button key={item.carId} type="button" aria-label={`SHOW ${vehicles.find((car) => car.id === item.carId)?.name ?? "FEATURED CAR"}`} aria-pressed={activeSlide === index} className={activeSlide === index ? "active" : ""} onClick={() => setActiveSlide(index)}><span /></button>)}
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
      <div className={`vehicle-visual ${vehicle.studioImage ? "vehicle-visual-studio" : ""}`} style={vehicle.studioImage ? undefined : { backgroundColor: vehicle.accent }}>
        {vehicle.tag ? <span className="vehicle-tag">{vehicle.tag}</span> : null}
        <button className={`save-button ${saved ? "is-saved" : ""}`} type="button" aria-label={saved ? `Remove ${vehicle.name} from saved cars` : `Save ${vehicle.name}`} aria-pressed={saved} onClick={() => setSaved((current) => !current)}><HeartIcon filled={saved} /></button>
        {vehicle.studioImage ? <div className="vehicle-image vehicle-image-studio" role="img" aria-label={`${vehicle.name}, AI-generated illustrative studio render`} style={{ backgroundImage: `url("${vehicle.studioImage}")`, backgroundPosition: vehicle.studioPosition }} /> : <Image src={vehicle.image} alt={`${vehicle.name} rental car${vehicle.imageIsIllustrative ? " (illustrative photo)" : ""}`} fill unoptimized={vehicle.image.startsWith("http")} sizes="(max-width: 700px) 90vw, (max-width: 1100px) 45vw, 30vw" className="vehicle-image" />}
      </div>
      <div className="vehicle-info">
        <div className="vehicle-name-row"><div><span className="vehicle-category">{vehicle.category}</span><h3>{vehicle.name}</h3></div></div>
        <p className="vehicle-meta">{vehicle.seats} seats{vehicle.fuelType ? <> <span>·</span> {vehicle.fuelType}</> : null}{vehicle.modelYear ? <> <span>·</span> {vehicle.modelYear}</> : null} <span>·</span> {vehicle.location}</p>
        {vehicle.studioImage ? <span className="photo-credit">AI-generated studio render · illustrative</span> : vehicle.imageCredit && vehicle.imageSourceUrl ? <span className="photo-credit">Photo: <a href={vehicle.imageSourceUrl} target="_blank" rel="noreferrer">{vehicle.imageCredit} · {vehicle.imageLicense}</a>{vehicle.imageAttributionUrl ? <> · <a href={vehicle.imageAttributionUrl} target="_blank" rel="noreferrer">license</a></> : null}{vehicle.imageIsIllustrative ? " · representative" : ""}</span> : null}
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
  const [headerPinned, setHeaderPinned] = useState(false);
  useEffect(() => {
    const updateHeader = () => {
      const showcase = document.querySelector<HTMLElement>(".showcase");
      setHeaderPinned(Boolean(showcase && window.scrollY >= showcase.offsetTop + showcase.offsetHeight - 84));
    };
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    window.addEventListener("resize", updateHeader);
    return () => {
      window.removeEventListener("scroll", updateHeader);
      window.removeEventListener("resize", updateHeader);
    };
  }, []);
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
            const studio = studioFrames.get(`${name}|${(car.fuel_type ?? "").toLowerCase()}`);
            return { id: car.id, name: car.name, category, location: car.city || "Kerala", seats, price: Number.parseInt(car.rent, 10) || 0, image: car.image ?? preview?.image ?? "", studioImage: studio?.image, studioPosition: studio?.position, fuelType: car.fuel_type, modelYear: car.model_year, imageCredit: car.image_credit, imageLicense: car.image_license, imageSourceUrl: car.image_source_url, imageAttributionUrl: car.image_attribution_url, imageIsIllustrative: studio ? true : car.image_is_illustrative, showcaseImage: preview?.showcaseImage, accent: preview?.accent ?? "#e4e6e3", tag: car.is_demo ? "Sample listing" : seats >= 7 ? `${seats} seats` : undefined };
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
    <main className="landing-page">
      <header className={`site-header landing-header ${headerPinned ? "is-pinned" : "is-over-hero"}`}>
        <Link href="/" className="brand" aria-label="Rove home"><span className="brand-mark">r</span><span>rove<span className="brand-period">.</span></span></Link>
        <nav className="desktop-nav" aria-label="Main navigation"><a href="#fleet">Explore cars</a><a href="#how-it-works">How it works</a></nav>
        <div className="header-actions"><a className="header-login" href="/customer/login">LOG IN</a><a className="button button-dark button-small" href="/customer/signup">RENT A CAR <ArrowIcon /></a></div>
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
