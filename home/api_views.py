import json
from datetime import date
from decimal import Decimal, InvalidOperation
from functools import wraps

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.utils.html import strip_tags
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from .models import Car, CarDealer, Customer, Location, Order


def _dealer_for(request):
    if not request.user.is_authenticated:
        return None
    return CarDealer.objects.select_related("location", "car_dealer").filter(car_dealer=request.user).first()


def _dealer_required(view):
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Sign in with a dealer account to continue."}, status=401)
        dealer = _dealer_for(request)
        if dealer is None:
            return JsonResponse({"error": "A dealer account is required."}, status=403)
        return view(request, dealer, *args, **kwargs)
    return wrapped


def _customer_required(view):
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Sign in with a customer account to continue."}, status=401)
        customer = Customer.objects.select_related("user", "location").filter(user=request.user, type="Customer").first()
        if customer is None:
            return JsonResponse({"error": "A customer account is required."}, status=403)
        return view(request, customer, *args, **kwargs)
    return wrapped


def _json_body(request):
    try:
        data = json.loads(request.body or "{}")
        return data if isinstance(data, dict) else None
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


def _car_data(car):
    if car.image_url:
        image = car.image_url
    else:
        try:
            image = car.image.url
        except (ValueError, AttributeError):
            image = ""
        if image.startswith("/"):
            image = "/api/backend-proxy" + image
    return {
        "id": car.pk,
        "name": car.name,
        "city": car.location.city if car.location else "",
        "capacity": car.capacity,
        "rent": car.rent,
        "is_available": car.is_available,
        "image": image,
        "fuel_type": car.fuel_type,
        "model_year": car.model_year,
        "is_demo": car.is_demo,
        "image_credit": car.image_credit,
        "image_license": car.image_license,
        "image_source_url": car.image_source_url,
        "image_attribution_url": car.image_attribution_url,
        "image_is_illustrative": car.image_is_illustrative,
    }


def _booking_status(order, today=None):
    if order.is_complete:
        return "completed"
    if not order.pickup_date or not order.return_date:
        return "dates_unavailable"
    today = today or timezone.localdate()
    if today < order.pickup_date:
        return "upcoming"
    if today < order.return_date:
        return "in_progress"
    return "return_due"


@ensure_csrf_cookie
@require_GET
def csrf_token(request):
    return JsonResponse({"csrfToken": get_token(request)})


@require_GET
def public_cars(request):
    cars = Car.objects.filter(is_available=True).select_related("location").order_by("id")
    return JsonResponse({"cars": [_car_data(car) for car in cars]})


@require_POST
def customer_signup_api(request):
    data = _json_body(request)
    if data is None:
        return JsonResponse({"error": "Enter valid account details."}, status=400)
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    phone = "".join(char for char in str(data.get("phone", "")) if char.isdigit())
    city = strip_tags(str(data.get("city", ""))).strip()
    password = str(data.get("password", ""))
    if not name or len(name) > 150 or not city or len(city) > 50:
        return JsonResponse({"error": "Enter your name and a city (up to 50 characters)."}, status=400)
    try:
        validate_email(email)
    except ValidationError:
        return JsonResponse({"error": "Enter a valid email address."}, status=400)
    if len(email) > 150:
        return JsonResponse({"error": "Email address must be 150 characters or fewer."}, status=400)
    if len(phone) != 10:
        return JsonResponse({"error": "Enter a 10-digit phone number."}, status=400)
    if User.objects.filter(email__iexact=email).exists() or User.objects.filter(username__iexact=email).exists():
        return JsonResponse({"error": "An account with that email already exists. Sign in instead."}, status=409)
    first_name, _, last_name = name.partition(" ")
    user = User(username=email, email=email, first_name=first_name, last_name=last_name)
    try:
        validate_password(password, user)
    except ValidationError as error:
        return JsonResponse({"error": " ".join(error.messages)}, status=400)
    with transaction.atomic():
        user.set_password(password)
        user.save()
        location, _ = Location.objects.get_or_create(city__iexact=city, defaults={"city": city})
        Customer.objects.create(user=user, phone=phone, location=location, type="Customer")
    login(request, user)
    return JsonResponse({"ok": True}, status=201)


@require_POST
def customer_login_api(request):
    data = _json_body(request)
    if data is None:
        return JsonResponse({"error": "Enter a valid email and password."}, status=400)
    identity = str(data.get("identity", "")).strip()
    password = str(data.get("password", ""))
    if not identity or not password:
        return JsonResponse({"error": "Enter your email or username and password."}, status=400)
    username = identity
    if "@" in identity:
        user = User.objects.filter(email__iexact=identity).first()
        username = user.username if user else identity
    user = authenticate(request, username=username, password=password)
    if user is None or not Customer.objects.filter(user=user, type="Customer").exists():
        return JsonResponse({"error": "Those customer sign-in details were not recognized."}, status=401)
    login(request, user)
    return JsonResponse({"ok": True})


@require_POST
def customer_logout_api(request):
    logout(request)
    return JsonResponse({"ok": True})


@require_GET
def customer_session_api(request):
    customer = Customer.objects.select_related("user").filter(user=request.user, type="Customer").first() if request.user.is_authenticated else None
    if customer is None:
        return JsonResponse({"authenticated": False}, status=401)
    return JsonResponse({"authenticated": True, "customer": {"name": customer.user.get_full_name() or customer.user.username, "email": customer.user.email}})


@_customer_required
@require_http_methods(["GET", "POST"])
def customer_bookings_api(request, customer):
    if request.method == "GET":
        orders = Order.objects.filter(user=customer.user).select_related("car", "car_dealer").order_by("-id")
        return JsonResponse({"bookings": [{
            "id": order.pk,
            "car": order.car.name,
            "city": order.car.location.city if order.car.location else "",
            "days": order.days,
            "pickup_date": order.pickup_date.isoformat() if order.pickup_date else None,
            "return_date": order.return_date.isoformat() if order.return_date else None,
            "rent": order.rent,
            "is_complete": order.is_complete,
            "status": _booking_status(order),
            "image": _car_data(order.car)["image"],
        } for order in orders]})

    data = _json_body(request)
    if data is None:
        return JsonResponse({"error": "Enter valid booking details."}, status=400)
    try:
        car_id = int(data.get("car_id"))
    except (TypeError, ValueError):
        return JsonResponse({"error": "Choose a car to continue."}, status=400)
    pickup_text = data.get("pickup_date")
    return_text = data.get("return_date")
    if not isinstance(pickup_text, str) or not isinstance(return_text, str):
        return JsonResponse({"error": "Choose both a pickup date and a return date."}, status=400)
    try:
        pickup_date = date.fromisoformat(pickup_text)
        return_date = date.fromisoformat(return_text)
    except ValueError:
        return JsonResponse({"error": "Enter valid pickup and return dates."}, status=400)
    if pickup_date.isoformat() != pickup_text or return_date.isoformat() != return_text:
        return JsonResponse({"error": "Enter pickup and return dates in YYYY-MM-DD format."}, status=400)
    if pickup_date < timezone.localdate():
        return JsonResponse({"error": "Pickup date cannot be in the past."}, status=400)
    if return_date <= pickup_date:
        return JsonResponse({"error": "Return date must be after the pickup date."}, status=400)
    days = (return_date - pickup_date).days
    if not 1 <= days <= 365:
        return JsonResponse({"error": "Rental duration must be between 1 and 365 days."}, status=400)
    with transaction.atomic():
        car = Car.objects.select_for_update().select_related("car_dealer", "location").filter(pk=car_id, is_available=True).first()
        if car is None:
            return JsonResponse({"error": "This car is no longer available. Refresh the fleet and choose another."}, status=409)
        try:
            daily_rent = int(car.rent)
        except (TypeError, ValueError):
            return JsonResponse({"error": "The listed price for this car is not valid yet."}, status=409)
        total = daily_rent * days
        if daily_rent <= 0 or total > 9_999_999_999 or car.car_dealer.earnings + total > 2_147_483_647:
            return JsonResponse({"error": "This booking total exceeds the supported amount. Contact the car dealer."}, status=400)
        order = Order.objects.create(
            user=customer.user,
            car_dealer=car.car_dealer,
            car=car,
            rent=str(total),
            days=str(days),
            pickup_date=pickup_date,
            return_date=return_date,
        )
        car.is_available = False
        car.save(update_fields=["is_available"])
        car.car_dealer.earnings += total
        car.car_dealer.save(update_fields=["earnings"])
    return JsonResponse({"ok": True, "booking": {
        "id": order.pk,
        "car": car.name,
        "days": order.days,
        "pickup_date": pickup_date.isoformat(),
        "return_date": return_date.isoformat(),
        "rent": order.rent,
    }}, status=201)


@require_POST
def dealer_login(request):
    data = _json_body(request)
    if data is None:
        return JsonResponse({"error": "Enter a valid email and password."}, status=400)
    identity = str(data.get("identity", "")).strip()
    password = str(data.get("password", ""))
    if not identity or not password:
        return JsonResponse({"error": "Enter your email or username and password."}, status=400)

    username = identity
    if "@" in identity:
        from django.contrib.auth.models import User
        user = User.objects.filter(email__iexact=identity).first()
        username = user.username if user else identity
    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({"error": "Those sign-in details were not recognized."}, status=401)
    if not CarDealer.objects.filter(car_dealer=user).exists():
        return JsonResponse({"error": "This account does not have dealer access."}, status=403)
    login(request, user)
    return JsonResponse({"ok": True})


@require_POST
def dealer_logout(request):
    logout(request)
    return JsonResponse({"ok": True})


@require_GET
def dealer_session(request):
    dealer = _dealer_for(request)
    if dealer is None:
        return JsonResponse({"authenticated": False}, status=401)
    return JsonResponse({
        "authenticated": True,
        "dealer": {
            "name": dealer.car_dealer.get_full_name() or dealer.car_dealer.username,
            "email": dealer.car_dealer.email,
            "city": dealer.location.city,
        },
    })


@_dealer_required
@require_GET
def dealer_dashboard(request, dealer):
    cars = Car.objects.filter(car_dealer=dealer).select_related("location").order_by("-id")
    orders = Order.objects.filter(car_dealer=dealer).select_related("car", "user").order_by("-id")
    return JsonResponse({
        "cars": [_car_data(car) for car in cars],
        "orders": [{
            "id": order.pk,
            "car": order.car.name,
            "car_id": order.car_id,
            "customer": order.user.get_full_name() or order.user.username,
            "days": order.days,
            "pickup_date": order.pickup_date.isoformat() if order.pickup_date else None,
            "return_date": order.return_date.isoformat() if order.return_date else None,
            "rent": order.rent,
            "is_complete": order.is_complete,
            "status": _booking_status(order),
        } for order in orders],
        "earnings": dealer.earnings,
        "city": dealer.location.city,
    })


def _validate_car(data, image=None):
    name = strip_tags(str(data.get("name", ""))).strip()
    city = strip_tags(str(data.get("city", ""))).strip()
    capacity = str(data.get("capacity", "")).strip()
    rent = str(data.get("rent", "")).strip()
    if not name or len(name) > 50:
        return None, "Enter a car name of up to 50 characters."
    if not city or len(city) > 50:
        return None, "Enter a city of up to 50 characters."
    if not capacity.isdigit() or not 1 <= int(capacity) <= 99:
        return None, "Passenger capacity must be between 1 and 99."
    try:
        amount = Decimal(rent)
        if amount <= 0 or amount != amount.to_integral_value() or amount > 99999999:
            raise InvalidOperation
    except (InvalidOperation, ValueError):
        return None, "Daily rent must be a positive whole number."
    if image is not None and not (getattr(image, "content_type", "") or "").startswith("image/"):
        return None, "Upload an image file for the car."
    return {"name": name, "city": city, "capacity": capacity, "rent": str(int(amount))}, None


@_dealer_required
@require_http_methods(["GET", "POST"])
def dealer_cars(request, dealer):
    if request.method == "GET":
        cars = Car.objects.filter(car_dealer=dealer).select_related("location").order_by("-id")
        return JsonResponse({"cars": [_car_data(car) for car in cars]})
    data = request.POST
    image = request.FILES.get("image")
    fields, error = _validate_car(data, image)
    if error:
        return JsonResponse({"error": error}, status=400)
    if image is None:
        return JsonResponse({"error": "Choose a car photo to upload."}, status=400)
    location, _ = Location.objects.get_or_create(city__iexact=fields["city"], defaults={"city": fields["city"]})
    car = Car.objects.create(car_dealer=dealer, location=location, image=image, is_available=True, **{k: v for k, v in fields.items() if k != "city"})
    return JsonResponse({"car": _car_data(car)}, status=201)


@_dealer_required
@require_http_methods(["PATCH", "DELETE"])
def dealer_car(request, dealer, car_id):
    car = Car.objects.filter(pk=car_id, car_dealer=dealer).first()
    if car is None:
        return JsonResponse({"error": "Car not found in your fleet."}, status=404)
    if request.method == "DELETE":
        if Order.objects.filter(car=car).exists():
            return JsonResponse({"error": "This car has rental history. Mark it unavailable instead."}, status=409)
        car.delete()
        return JsonResponse({"ok": True})

    data = _json_body(request)
    if data is None:
        return JsonResponse({"error": "Enter valid car details."}, status=400)
    if "is_available" in data:
        if not isinstance(data["is_available"], bool):
            return JsonResponse({"error": "Availability must be true or false."}, status=400)
        car.is_available = data["is_available"]
        car.save(update_fields=["is_available"])
        return JsonResponse({"car": _car_data(car)})

    image = request.FILES.get("image")
    fields, error = _validate_car(data, image)
    if error:
        return JsonResponse({"error": error}, status=400)
    location, _ = Location.objects.get_or_create(city__iexact=fields["city"], defaults={"city": fields["city"]})
    car.name = fields["name"]
    car.location = location
    car.capacity = fields["capacity"]
    car.rent = fields["rent"]
    if image is not None:
        car.image = image
    car.save()
    return JsonResponse({"car": _car_data(car)})


@_dealer_required
@require_POST
def update_dealer_car_photo(request, dealer, car_id):
    car = Car.objects.filter(pk=car_id, car_dealer=dealer).first()
    if car is None:
        return JsonResponse({"error": "Car not found in your fleet."}, status=404)
    image = request.FILES.get("image")
    if image is None:
        return JsonResponse({"error": "Choose an image file for the car."}, status=400)
    if not (getattr(image, "content_type", "") or "").startswith("image/"):
        return JsonResponse({"error": "Upload an image file for the car."}, status=400)
    car.image = image
    car.save(update_fields=["image"])
    return JsonResponse({"car": _car_data(car)})


@_dealer_required
@require_POST
def complete_dealer_order(request, dealer, order_id):
    with transaction.atomic():
        order = Order.objects.select_for_update().filter(pk=order_id, car_dealer=dealer).select_related("car").first()
        if order is None:
            return JsonResponse({"error": "Rental not found in your bookings."}, status=404)
        if order.is_complete:
            return JsonResponse({"error": "This rental has already been marked complete."}, status=409)
        order.is_complete = True
        order.save(update_fields=["is_complete"])
        order.car.is_available = True
        order.car.save(update_fields=["is_available"])
    return JsonResponse({"ok": True})
