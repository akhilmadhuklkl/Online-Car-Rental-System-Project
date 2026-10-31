from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("home", "0013_use_external_fleet_image_urls")]

    operations = [
        migrations.AddField(
            model_name="car",
            name="image_attribution_url",
            field=models.URLField(blank=True),
        ),
    ]
