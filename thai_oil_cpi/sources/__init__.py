"""Data sources. Each module exposes fetch functions that return pandas objects
or raise ``SourceError`` so the sync layer can fall through to the next source."""
from .http import SourceError  # noqa: F401
