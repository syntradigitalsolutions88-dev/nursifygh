"""Root URL configuration for the NursifyGH backend."""

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)

urlpatterns = [
    path("admin/", admin.site.urls),

    # API schema
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),

     # Application API
    path("api/accounts/", include("accounts.urls")),
    path("api/academics/", include("academics.urls")),
    path("api/careplans/", include("careplans.urls")),
    path("api/payments/", include("payments.urls")),
]