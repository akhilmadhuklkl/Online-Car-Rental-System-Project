import json
from pathlib import Path
from urllib.parse import quote

from django.db import migrations


def localize_portfolio_fleet_images(apps, schema_editor):
    Car = apps.get_model("home", "Car")
    data_path = Path(__file__).resolve().parents[1] / "data" / "portfolio_fleet.json"
    catalog = json.loads(data_path.read_text(encoding="utf-8"))
    seed_keys = [
        f"{model[0]}:{city.lower().replace(' ', '-')}"
        for model in catalog["models"]
        for city in catalog["cities"]
    ]
    seeded = Car.objects.filter(portfolio_seed_key__in=seed_keys)
    found_count = seeded.count()
    if found_count not in {0, len(seed_keys)}:
        raise RuntimeError(f"Expected either 0 or {len(seed_keys)} portfolio cars, found {found_count}.")
    if not found_count:
        return

    for image in catalog["images"].values():
        Car.objects.filter(
            portfolio_seed_key__in=seed_keys,
            image_source_url=image["page"],
        ).update(image_url=image["asset_path"])

    local_count = seeded.filter(image_url__startswith="/images/cars/fleet/").count()
    if local_count != found_count:
        raise RuntimeError(f"Only {local_count} of {found_count} portfolio car images were localized.")


def restore_wikimedia_image_urls(apps, schema_editor):
    Car = apps.get_model("home", "Car")
    data_path = Path(__file__).resolve().parents[1] / "data" / "portfolio_fleet.json"
    catalog = json.loads(data_path.read_text(encoding="utf-8"))
    seed_keys = [
        f"{model[0]}:{city.lower().replace(' ', '-')}"
        for model in catalog["models"]
        for city in catalog["cities"]
    ]
    for image in catalog["images"].values():
        remote_url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + quote(image["filename"], safe="()") + "?width=1280"
        Car.objects.filter(
            portfolio_seed_key__in=seed_keys,
            image_source_url=image["page"],
        ).update(image_url=remote_url)


class Migration(migrations.Migration):
    dependencies = [("home", "0011_seed_portfolio_demo_fleet")]

    operations = [migrations.RunPython(localize_portfolio_fleet_images, restore_wikimedia_image_urls)]
