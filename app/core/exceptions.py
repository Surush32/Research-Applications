class LicenseCheckerError(Exception):
    """Base exception for the checker."""


class SourceFileNotFoundError(LicenseCheckerError):
    """Raised when a source file path cannot be found."""


class SourceInvalidExtensionError(LicenseCheckerError):
    """Raised when the file is not a Python source file."""


class SourceSyntaxError(LicenseCheckerError):
    """Raised when the file contains invalid Python syntax."""
