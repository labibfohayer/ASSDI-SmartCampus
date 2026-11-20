import datetime
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.utils import timezone

from .constants import get_qr_token_validity_seconds


class TokenExpiredError(Exception):
    """Raised when rotating QR token has exceeded maximum validity."""
    pass


class InvalidTokenError(Exception):
    """Raised when rotating QR token signature is tampered or invalid."""
    pass


class QRCodeService:
    """
    Cryptographic rotating QR token generator and validator.
    Uses Django TimestampSigner to bind session_id and cryptographic timestamp.
    """

    SALT = "assdi.attendance.qr"

    @classmethod
    def get_signer(cls) -> TimestampSigner:
        return TimestampSigner(salt=cls.SALT)

    @classmethod
    def generate_token(cls, session_id: int) -> dict:
        """
        Signs session_id with current timestamp.
        Returns token, validity duration in seconds, and expiration timestamp.
        """
        signer = cls.get_signer()
        validity_seconds = get_qr_token_validity_seconds()
        now = timezone.now()
        token = signer.sign(str(session_id))
        valid_until = now + datetime.timedelta(seconds=validity_seconds)

        return {
            "qr_token": token,
            "session_id": session_id,
            "expires_in_seconds": validity_seconds,
            "valid_until": valid_until.isoformat(),
        }

    @classmethod
    def verify_token(cls, token: str) -> int:
        """
        Validates signed token against dynamic QR_TOKEN_VALIDITY_SECONDS.
        Returns verified integer session_id or raises TokenExpiredError / InvalidTokenError.
        """
        signer = cls.get_signer()
        validity_seconds = get_qr_token_validity_seconds()

        try:
            raw_value = signer.unsign(token, max_age=validity_seconds)
            return int(raw_value)
        except SignatureExpired as e:
            raise TokenExpiredError("QR token has expired. Please ask the teacher for a fresh QR code.") from e
        except (BadSignature, ValueError) as e:
            raise InvalidTokenError("Invalid or tampered QR code.") from e
