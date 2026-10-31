from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("home", "0009_portfolio_demo_fleet")]

    operations = [
        migrations.AddField(
            model_name="car",
            name="portfolio_seed_key",
            field=models.CharField(blank=True, editable=False, max_length=150, null=True, unique=True),
        ),
    ]
