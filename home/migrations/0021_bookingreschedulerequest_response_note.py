from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("home", "0020_booking_reschedule_history"),
    ]

    operations = [
        migrations.AddField(
            model_name="bookingreschedulerequest",
            name="response_note",
            field=models.TextField(blank=True),
        ),
    ]
