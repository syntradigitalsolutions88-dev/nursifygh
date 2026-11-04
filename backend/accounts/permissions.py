"""Custom DRF permission classes for NursifyGH."""

from __future__ import annotations

from rest_framework.permissions import BasePermission


class IsSubscribed(BasePermission):
    """
    Grants access only to authenticated users with an active semester pass.
    Lazily downgrades a lapsed subscription the first time it is checked.
    """

    message = "An active semester subscription is required for this resource."

    def has_permission(self, request, view) -> bool:
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        user.deactivate_expired_subscription()
        return user.has_active_subscription