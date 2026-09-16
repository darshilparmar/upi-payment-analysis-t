"""
One place that knows which environment we are in.

Nothing else in the project hardcodes a catalog name or a path. Every notebook
starts with `cfg = get_config(env)` and asks cfg for table names and paths.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    env: str
    catalog: str
    secret_scope: str = "upi"
    recompute_window_days: int = 7

    def schema(self, name: str) -> str:
        """upi_dev.ops"""
        return f"{self.catalog}.{name}"

    def table(self, schema: str, name: str) -> str:
        """upi_dev.silver.transactions"""
        return f"{self.catalog}.{schema}.{name}"

    @property
    def landing(self) -> str:
        """The volume where every file lands before it is read."""
        return f"/Volumes/{self.catalog}/bronze/landing"

    def raw(self, path: str) -> str:
        return f"{self.landing}/{path}"

    def checkpoint(self, name: str) -> str:
        """One checkpoint folder per stream. Never share them."""
        return f"/Volumes/{self.catalog}/bronze/checkpoints/{name}"


def get_config(env: str = "dev") -> Config:
    if env not in ("dev", "prod"):
        raise ValueError(f"env must be dev or prod, got {env!r}")
    return Config(env=env, catalog=f"upi_{env}")


def get_secret(dbutils, cfg: Config, key: str) -> str:
    """Read one secret. Never print the value."""
    return dbutils.secrets.get(scope=cfg.secret_scope, key=key)


def jdbc_url(dbutils, cfg: Config) -> str:
    host = get_secret(dbutils, cfg, "neon-host")
    db = get_secret(dbutils, cfg, "neon-db")
    return f"jdbc:postgresql://{host}:5432/{db}?sslmode=require"


def jdbc_properties(dbutils, cfg: Config) -> dict:
    return {
        "user": get_secret(dbutils, cfg, "neon-user"),
        "password": get_secret(dbutils, cfg, "neon-password"),
        "driver": "org.postgresql.Driver",
        "fetchsize": "10000",
    }
