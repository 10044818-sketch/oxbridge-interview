from sqlalchemy.orm import Session
from models import User
from auth import hash_password

def seed_db(db: Session):
    existing = db.query(User).filter(User.username == "PennyPan").first()
    if not existing:
        admin = User(
            username="PennyPan",
            password_hash=hash_password("sisu2026"),
            role="admin",
            display_name="Penny Pan",
        )
        db.add(admin)
        db.commit()
        print("Seed: admin account created (PennyPan)")
    else:
        print("Seed: admin account already exists")
