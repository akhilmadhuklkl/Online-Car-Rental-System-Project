import json
from pathlib import Path

from django.db import migrations, models


def repair_portfolio_fleet_images(apps, schema_editor):
    Car = apps.get_model("home", "Car")
    catalog_path = Path(__file__).resolve().parents[1] / "data" / "portfolio_fleet.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))

    for model in catalog["models"]:
        _slug, name, _year, _fuel, _body, _seats, _rent, image_key = model
        image = catalog["images"][image_key]
        image_url = image["remote_url"]
        if "/1280px-" not in image_url:
            raise RuntimeError(f"Fleet photo for {name} is not a direct sized Wikimedia image URL.")
        Car.objects.filter(is_demo=True, name=name).update(
            image="",
            image_url=image_url,
            image_credit=image["author"],
            image_license=image["license"],
            image_source_url=image["page"],
            image_attribution_url=image.get("attribution_url", ""),
            image_is_illustrative=image["illustrative"],
        )


class Migration(migrations.Migration):
    dependencies = [("home", "0014_car_image_attribution_url")]

    operations = [
        migrations.AlterField(
            model_name="car",
            name="image_url",
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.RunPython(repair_portfolio_fleet_images, migrations.RunPython.noop),
    ]
