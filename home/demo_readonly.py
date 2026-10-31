from django.http import JsonResponse


class DemoReadOnlyMiddleware:
    """Block state-changing actions on the public portfolio demo."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith("/admin/"):
            return JsonResponse({"error": "Django admin is unavailable in the public portfolio preview."}, status=404)
        if request.method not in {"GET", "HEAD", "OPTIONS"}:
            return JsonResponse(
                {"error": "This portfolio preview is read-only. Account, booking, and dealer changes are disabled."},
                status=403,
            )
        return self.get_response(request)
