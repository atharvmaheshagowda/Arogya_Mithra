import os
import sys

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.init_db import init_db
from app.database.session import SessionLocal, engine
from app.services.synthetic_data import seed_synthetic_clinical_data


def main():
    print("=" * 60)
    print("  AROGYA MITHRA — SYNTHETIC CLINICAL DATA SEEDER")
    print("=" * 60)

    print("\n1. Ensuring database tables exist...")
    init_db(engine)
    print("   Tables verified.")

    print("\n2. Seeding synthetic demonstration records...")
    db = SessionLocal()
    try:
        stats = seed_synthetic_clinical_data(db)
        print("\n=== Seeding Summary ===")
        print(f"  Patients Created   : {stats['patients_created']}")
        print(f"  Patients Existing  : {stats['patients_existing']}")
        print(f"  Encounters Created : {stats['encounters_created']}")
        print(f"  Allergies Created  : {stats['allergies_created']}")
        print(f"  Histories Created  : {stats['history_created']}")
        print(f"  Vitals Created     : {stats['vitals_created']}")
        print("========================")
        print("\nAll synthetic records successfully initialized.\n")
    finally:
        db.close()


if __name__ == "__main__":
    main()

