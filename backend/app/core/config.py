from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str

    model_config = SettingsConfigDict(
        env_file="/Users/raman/Documents/Learning/software-dev/playground/.env"
    )


@lru_cache
def get_settings():
    return Settings()
