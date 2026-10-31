import json
from pathlib import Path
from urllib.parse import quote

from django.db import migrations


def use_external_fleet_image_urls(apps, schema_editor):
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
    if not found_count:
        return

    for image in catalog["images"].values():
        remote_url = image["remote_url"]
        if "REPLACE_HASH" in remote_url or not remote_url.startswith("https://upload.wikimedia.org/wikipedia/commons/thumb/"):
            raise RuntimeError(f"Expected a direct Wikimedia image URL, got {remote_url!r}.")

    for image in catalog["images"].values():
        remote_url = image["remote_url"]
        Car.objects.filter(
            portfolio_seed_key__in=seed_keys,
            image_source_url=image["page"],
        ).update(
            image_url=remote_url,
            image_credit=image["author"],
            image_license=image["license"],
            image_attribution_url=image["attribution_url"],
            image_is_illustrative=image["illustrative"],
        )

    # Exact-model image assignments override the generic body-style image keys.
    # Update metadata together so the attribution displayed in the UI is accurate.
    for model in catalog["models"]:
        image = catalog["images"][model[7]]
        rows = Car.objects.filter(
            portfolio_seed_key__startswith=f"{model[0]}:",
        )
        rows.update(
            image_url=image["remote_url"],
            image_credit=image["author"],
            image_license=image["license"],
            image_source_url=image["page"],
            image_attribution_url=image["attribution_url"],
            image_is_illustrative=image["illustrative"],
        )

    external_count = seeded.filter(image_url__startswith="https://upload.wikimedia.org/wikipedia/commons/thumb/").count()
    if external_count != found_count:
        raise RuntimeError(f"Only {external_count} of {found_count} existing portfolio car images use external image URLs.")


def restore_special_file_path_urls(apps, schema_editor):
    Car = apps.get_model("home", "Car")
    data_path = Path(__file__).resolve().parents[1] / "data" / "portfolio_fleet.json"
    catalog = json.loads(data_path.read_text(encoding="utf-8"))
    seed_keys = [
        f"{model[0]}:{city.lower().replace(' ', '-')}"
        for model in catalog["models"]
        for city in catalog["cities"]
    ]
    for model in catalog["models"]:
        image = catalog["images"][model[7]]
        special_file_url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + quote(image["filename"], safe="()") + "?width=1280"
        Car.objects.filter(
            portfolio_seed_key__in=seed_keys,
            portfolio_seed_key__startswith=f"{model[0]}:",
        ).update(
            image_url=special_file_url,
            image_credit=image["author"],
            image_license=image["license"],
            image_source_url=image["page"],
            image_attribution_url=image["attribution_url"],
            image_is_illustrative=image["illustrative"],
        )


class Migration(migrations.Migration):
    dependencies = [("home", "0012_localize_portfolio_fleet_images")]

    operations = [migrations.RunPython(use_external_fleet_image_urls, restore_special_file_path_urls)]
