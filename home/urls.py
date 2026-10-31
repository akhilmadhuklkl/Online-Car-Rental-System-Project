from django.urls import path
from . import views
from . import api_views

urlpatterns = [
    path("api/csrf/", api_views.csrf_token, name="api_csrf"),
    path("api/cars/", api_views.public_cars, name="api_public_cars"),
    path("api/dealer/login/", api_views.dealer_login, name="api_dealer_login"),
    path("api/dealer/logout/", api_views.dealer_logout, name="api_dealer_logout"),
    path("api/dealer/session/", api_views.dealer_session, name="api_dealer_session"),
    path("api/dealer/dashboard/", api_views.dealer_dashboard, name="api_dealer_dashboard"),
    path("api/dealer/cars/", api_views.dealer_cars, name="api_dealer_cars"),
    path("api/dealer/cars/<int:car_id>/", api_views.dealer_car, name="api_dealer_car"),
    path("api/dealer/cars/<int:car_id>/photo/", api_views.update_dealer_car_photo, name="api_dealer_car_photo"),
    path("api/dealer/orders/<int:order_id>/complete/", api_views.complete_dealer_order, name="api_complete_dealer_order"),
    path("", views.index, name="index"),
    path("customer_signup/", views.customer_signup, name="customer_signup"),
    path("customer_login/", views.customer_login, name="customer_login"),
    path("car_dealer_signup/", views.car_dealer_signup, name="car_dealer_signup"),
    path("car_dealer_login/", views.car_dealer_login, name="car_dealer_login"),
    path("add_car/", views.add_car, name="add_car"),
    path("all_cars/", views.all_cars, name="all_cars"),
    path("edit_car/<int:myid>/", views.edit_car, name="edit_car"),
    path("delete_car/<int:myid>/", views.delete_car, name="delete_car"),
    path("customer_homepage/", views.customer_homepage, name="customer_homepage"),
    path("search_results/", views.search_results, name="search_results"),
    path("car_rent/", views.car_rent, name="car_rent"),
    path("order_details/", views.order_details, name="order_details"),
    path("past_orders/", views.past_orders, name="past_orders"),
    path("delete_order/<int:myid>/", views.delete_order, name="delete_order"),
    path("all_orders/", views.all_orders, name="all_orders"),
    path("complete_order/", views.complete_order, name="complete_order"),
    path("earnings/", views.earnings, name="earnings"),
    path("signout/", views.signout, name="signout")
]
