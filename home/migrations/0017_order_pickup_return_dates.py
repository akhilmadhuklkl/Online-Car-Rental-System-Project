from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("home", "0016_update_portfolio_demo_daily_rates"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="pickup_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="order",
            name="return_date",
            field=models.DateField(blank=True, null=True),
        ),
    ]
