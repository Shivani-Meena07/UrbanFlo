from datetime import datetime

from sqlalchemy import (
    DateTime,
    Float,
    Integer,
    String
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column
)

from app.db.session import Base


class WeatherObservation(Base):

    __tablename__ = "weather_observations"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    observed_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )

    latitude: Mapped[float] = mapped_column(Float)

    longitude: Mapped[float] = mapped_column(Float)

    rainfall_mm: Mapped[float] = mapped_column(
        Float,
        default=0
    )

    rainfall_rate_mm_hr: Mapped[float] = mapped_column(
        Float,
        default=0
    )

    source: Mapped[str] = mapped_column(
        String(80)
    )


class DrainageAsset(Base):

    __tablename__ = "drainage_assets"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    name: Mapped[str] = mapped_column(
        String(120)
    )

    latitude: Mapped[float] = mapped_column(Float)

    longitude: Mapped[float] = mapped_column(Float)

    condition: Mapped[str] = mapped_column(
        String(40),
        default="normal"
    )

    # Links this real-world geocoded asset to a node/junction name
    # inside the SWMM .inp model (e.g. "9", "21"), so a lat/lon can
    # be resolved to specific simulation nodes instead of only ever
    # returning a single city-wide result.
    swmm_node_id: Mapped[str | None] = mapped_column(
        String(60),
        nullable=True
    )


class SimulationRun(Base):

    __tablename__ = "simulation_runs"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    started_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="queued"
    )

    message: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )

class CitizenReport(Base):
    __tablename__ = "citizen_reports"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    issue_type: Mapped[str] = mapped_column(
        String(60)
    )

    location: Mapped[str] = mapped_column(
        String(255)
    )

    latitude: Mapped[float] = mapped_column(
        Float
    )

    longitude: Mapped[float] = mapped_column(
        Float
    )

    severity: Mapped[str] = mapped_column(
        String(20),
        default="LOW"
    )

    description: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(40),
        default="Under verification"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )

    verified_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    assigned_team: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True
    )

    model_relevant: Mapped[bool] = mapped_column(
        default=False,
        nullable=False
    )


class HazardPhotoReport(Base):
    __tablename__ = "hazard_photo_reports"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    location_name: Mapped[str] = mapped_column(
        String(255)
    )

    latitude: Mapped[float] = mapped_column(
        Float
    )

    longitude: Mapped[float] = mapped_column(
        Float
    )

    depth_cm: Mapped[float] = mapped_column(
        Float,
        default=15.0
    )

    issue_tag: Mapped[str] = mapped_column(
        String(80),
        default="Waterlogging"
    )

    photo_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )

    description: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True
    )

    recession_eta_min: Mapped[int] = mapped_column(
        Integer,
        default=30
    )

    verified: Mapped[bool] = mapped_column(
        default=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )