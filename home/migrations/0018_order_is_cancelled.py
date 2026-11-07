from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("home", "0017_order_pickup_return_dates"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="is_cancelled",
            field=models.BooleanField(default=False),
        ),
    ]
