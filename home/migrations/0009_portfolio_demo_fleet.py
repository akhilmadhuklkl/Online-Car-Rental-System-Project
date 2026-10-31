import json
import os
from pathlib import Path
from urllib.parse import quote

from django.contrib.auth.hashers import make_password
from django.db import migrations, models


def seed_portfolio_fleet(apps, schema_editor):
    if os.environ.get("PORTFOLIO_DEMO", "false").strip().lower() not in {"1", "true", "yes"}:
        return

    Car = apps.get_model("home", "Car")
    CarDealer = apps.get_model("home", "CarDealer")
    Location = apps.get_model("home", "Location")
    User = apps.get_model("auth", "User")
    data_path = Path(__file__).resolve().parents[1] / "data" / "portfolio_fleet.json"
    catalog = json.loads(data_path.read_text(encoding="utf-8"))

    dealer_email = "portfolio-demo-fleet@rove.example"
    dealer_user = User.objects.filter(username=dealer_email).first()
    if dealer_user is None:
        dealer_user = User.objects.create(
            username=dealer_email,
            email=dealer_email,
            first_name="Rove",
            last_name="Demo Fleet",
            is_active=False,
        )
        dealer_user.password = make_password(None)
        dealer_user.save(update_fields=["password"])
    elif dealer_user.is_active:
        raise RuntimeError("The reserved Rove portfolio demo account already exists as an active user.")

    dealer_location = Location.objects.filter(city="Rove Portfolio Demo").order_by("pk").first()
    if dealer_location is None:
        dealer_location = Location.objects.create(city="Rove Portfolio Demo")
    dealer, _ = CarDealer.objects.get_or_create(
        car_dealer_id=dealer_user.pk,
        defaults={"phone": "0000000000", "location_id": dealer_location.pk, "earnings": 0, "type": "Portfolio demo"},
    )

    locations = {}
    for city in catalog["cities"]:
        location = Location.objects.filter(city=city).order_by("pk").first()
        locations[city] = location or Location.objects.create(city=city)

    fleet_rows = []
    for model in catalog["models"]:
        slug, name, year, fuel, body, seats, rent, image_key = model
        image = catalog["images"][image_key]
        image_url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + quote(image["filename"], safe="()") + "?width=1280"
        for city in catalog["cities"]:
            seed_key = f"{slug}:{city.lower().replace(' ', '-')}"
            fleet_rows.append(
                Car(
                    portfolio_seed_key=seed_key,
                    name=name,
                    image="",
                    image_url=image_url,
                    image_credit=image["author"],
                    image_license=image["license"],
                    image_source_url=image["page"],
                    image_is_illustrative=image["illustrative"],
                    car_dealer_id=dealer.pk,
                    capacity=str(seats),
                    location_id=locations[city].pk,
                    is_available=True,
                    rent=str(rent),
                    fuel_type=fuel,
                    model_year=year,
                    is_demo=True,
                )
            )

    seed_keys = [car.portfolio_seed_key for car in fleet_rows]
    existing_keys = set(Car.objects.filter(portfolio_seed_key__in=seed_keys).values_list("portfolio_seed_key", flat=True))
    if len(existing_keys) not in {0, len(fleet_rows)}:
        raise RuntimeError(f"Portfolio fleet seed is incomplete ({len(existing_keys)} of {len(fleet_rows)} rows already exist).")
    missing_rows = [car for car in fleet_rows if car.portfolio_seed_key not in existing_keys]
    Car.objects.bulk_create(missing_rows, batch_size=200)


def unseed_portfolio_fleet(apps, schema_editor):
    Car = apps.get_model("home", "Car")
    data_path = Path(__file__).resolve().parents[1] / "data" / "portfolio_fleet.json"
    catalog = json.loads(data_path.read_text(encoding="utf-8"))
    seed_keys = [
        f"{model[0]}:{city.lower().replace(' ', '-')}"
        for model in catalog["models"]
        for city in catalog["cities"]
    ]
    Car.objects.filter(portfolio_seed_key__in=seed_keys).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("home", "0008_remove_location_zipcode"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.AlterField(
            model_name="car",
            name="image",
            field=models.ImageField(blank=True, upload_to=""),
        ),
        migrations.AddField(model_name="car", name="image_url", field=models.URLField(blank=True)),
        migrations.AddField(model_name="car", name="image_credit", field=models.CharField(blank=True, max_length=200)),
        migrations.AddField(model_name="car", name="image_license", field=models.CharField(blank=True, max_length=60)),
        migrations.AddField(model_name="car", name="image_source_url", field=models.URLField(blank=True)),
        migrations.AddField(model_name="car", name="image_is_illustrative", field=models.BooleanField(default=False)),
        migrations.AddField(model_name="car", name="fuel_type", field=models.CharField(blank=True, max_length=20)),
        migrations.AddField(model_name="car", name="model_year", field=models.PositiveSmallIntegerField(blank=True, null=True)),
        migrations.AddField(model_name="car", name="is_demo", field=models.BooleanField(default=False)),
        migrations.AddField(
            model_name="car",
            name="portfolio_seed_key",
            field=models.CharField(blank=True, editable=False, max_length=150, null=True, unique=True),
        ),
        migrations.RunPython(seed_portfolio_fleet, unseed_portfolio_fleet),
    ]
