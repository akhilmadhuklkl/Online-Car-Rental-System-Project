from django.db import migrations, models


def populate_daily_rate(apps, schema_editor):
    Order = apps.get_model("home", "Order")
    for order in Order.objects.all().iterator():
        try:
            total = int(order.rent)
            days = int(order.days)
            if days > 0 and total > 0 and total % days == 0:
                rate = total // days
            else:
                rate = int(order.car.rent)
            if rate > 0:
                order.daily_rate = str(rate)
                order.save(update_fields=["daily_rate"])
        except (AttributeError, TypeError, ValueError):
            continue


class Migration(migrations.Migration):

    dependencies = [
        ("home", "0018_order_is_cancelled"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="daily_rate",
            field=models.CharField(blank=True, max_length=10),
        ),
        migrations.AddField(
            model_name="order",
            name="requested_pickup_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="order",
            name="requested_return_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="order",
            name="reschedule_status",
            field=models.CharField(blank=True, choices=[("", "No request"), ("pending", "Pending dealer review"), ("approved", "Approved"), ("declined", "Declined")], default="", max_length=10),
        ),
        migrations.RunPython(populate_daily_rate, migrations.RunPython.noop),
    ]
