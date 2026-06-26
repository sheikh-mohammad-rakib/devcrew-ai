from sqlalchemy import text

from devcrew_api.db import engine


def main() -> None:
    with engine.connect() as connection:
        result = connection.execute(text("SELECT version();"))
        version = result.scalar()

    print("✅ Connected successfully!")
    print(version)


if __name__ == "__main__":
    main()