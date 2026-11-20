from rest_framework.throttling import AnonRateThrottle


class LoginIPRateThrottle(AnonRateThrottle):
    """
    Generous per-IP rate throttle for login endpoints to support
    residential campus environments where hundreds of students share
    the same external NAT / campus Wi-Fi IP address.
    """

    scope = "login_ip"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}
