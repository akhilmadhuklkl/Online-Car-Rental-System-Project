from django.http import JsonResponse


CUSTOMER_AUTH_POST_PATHS = frozenset({
    "/api/customer/login",
    "/api/customer/signup",
    "/api/customer/logout",
})


class DemoReadOnlyMiddleware:
    """Allow customer sessions while keeping portfolio bookings/dealer data read-only."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith("/admin/"):
            return JsonResponse({"error": "Django admin is unavailable in the public portfolio preview."}, status=404)
        safe_method = request.method in {"GET", "HEAD", "OPTIONS"}
        customer_auth_post = request.method == "POST" and request.path in CUSTOMER_AUTH_POST_PATHS
        if not safe_method and not customer_auth_post:
            return JsonResponse(
                {"error": "This portfolio preview does not allow booking or dealer changes."},
                status=403,
            )
        return self.get_response(request)
