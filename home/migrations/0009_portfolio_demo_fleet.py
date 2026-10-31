from django.db import migrations, models


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
    ]
