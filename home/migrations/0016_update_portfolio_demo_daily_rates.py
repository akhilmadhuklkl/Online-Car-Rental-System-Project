import json
from pathlib import Path

from django.db import migrations


def update_portfolio_demo_daily_rates(apps, schema_editor):
    Car = apps.get_model("home", "Car")
    catalog_path = Path(__file__).resolve().parents[1] / "data" / "portfolio_fleet.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))

    updated = 0
    for model in catalog["models"]:
        _slug, name, _year, fuel, _body, _seats, daily_rate, _image_key = model
        updated += Car.objects.filter(
            is_demo=True,
            name=name,
            fuel_type=fuel,
        ).update(rent=str(daily_rate))

    expected = len(catalog["models"]) * len(catalog["cities"])
    if updated != expected:
        raise RuntimeError(f"Updated {updated} of {expected} portfolio demo car rates.")


class Migration(migrations.Migration):
    dependencies = [("home", "0015_repair_portfolio_fleet_remote_images")]

    operations = [
        migrations.RunPython(
            update_portfolio_demo_daily_rates,
            migrations.RunPython.noop,
        )
    ]
