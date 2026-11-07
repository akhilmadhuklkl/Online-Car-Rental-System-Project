from django.db import migrations, models
import django.db.models.deletion


def backfill_latest_request(apps, schema_editor):
    Order = apps.get_model("home", "Order")
    RescheduleRequest = apps.get_model("home", "BookingRescheduleRequest")
    for order in Order.objects.exclude(reschedule_status="").iterator():
        if not order.requested_pickup_date or not order.requested_return_date:
            continue
        try:
            proposed_total = int(order.daily_rate) * (order.requested_return_date - order.requested_pickup_date).days
        except (TypeError, ValueError):
            proposed_total = order.rent
        if not isinstance(proposed_total, int) or proposed_total <= 0:
            proposed_total = order.rent
        RescheduleRequest.objects.create(
            order_id=order.pk,
            requested_pickup_date=order.requested_pickup_date,
            requested_return_date=order.requested_return_date,
            proposed_total=str(proposed_total),
            status=order.reschedule_status,
        )


class Migration(migrations.Migration):

    dependencies = [
        ("home", "0019_order_reschedule_requests"),
    ]

    operations = [
        migrations.CreateModel(
            name="BookingRescheduleRequest",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("requested_pickup_date", models.DateField()),
                ("requested_return_date", models.DateField()),
                ("proposed_total", models.CharField(max_length=10)),
                ("status", models.CharField(choices=[("pending", "Pending dealer review"), ("approved", "Approved"), ("declined", "Declined"), ("cancelled", "Booking cancelled")], default="pending", max_length=10)),
                ("requested_at", models.DateTimeField(blank=True, null=True)),
                ("decided_at", models.DateTimeField(blank=True, null=True)),
                ("order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reschedule_requests", to="home.order")),
            ],
            options={"ordering": ["requested_at", "id"]},
        ),
        migrations.RunPython(backfill_latest_request, migrations.RunPython.noop),
    ]
