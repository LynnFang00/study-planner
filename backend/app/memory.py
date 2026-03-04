from sqlalchemy.orm import Session
from app.models import Preference, CheckIn
from datetime import datetime


def process_daily_checkin(db: Session, checkin_data: dict, user_id: str):
    """
    Process a daily check-in and extract preferences.
    This is a simple keyword-matching system that will get smarter over time.
    """

    notes = checkin_data.get('notes', '').lower()

    # Extract time preferences
    if 'morning' in notes or 'early' in notes:
        update_preference(db, 'best_time', 'morning', 0.7, user_id)
    elif 'evening' in notes or 'night' in notes:
        update_preference(db, 'best_time', 'evening', 0.7, user_id)
    elif 'afternoon' in notes:
        update_preference(db, 'best_time', 'afternoon', 0.7, user_id)

    # Extract study session preferences
    if 'short' in notes or 'breaks' in notes:
        update_preference(db, 'session_length', 'short', 0.6, user_id)
    elif 'long' in notes or 'focused' in notes or 'deep work' in notes:
        update_preference(db, 'session_length', 'long', 0.6, user_id)

    # Extract location preferences
    if 'library' in notes:
        update_preference(db, 'location', 'library', 0.7, user_id)
    elif 'home' in notes or 'room' in notes:
        update_preference(db, 'location', 'home', 0.7, user_id)
    elif 'cafe' in notes or 'coffee' in notes:
        update_preference(db, 'location', 'cafe', 0.7, user_id)

    db.commit()


def update_preference(db: Session, key: str, value: str, confidence: float, user_id: str):
    """
    Update or create a preference in the database.
    """

    # Check if preference exists for this user
    pref = db.query(Preference).filter(
        Preference.key == key,
        Preference.user_id == user_id
    ).first()

    if pref:
        # Update existing preference
        pref.value = value
        pref.confidence = min(1.0, pref.confidence + 0.1)  # Increase confidence
        pref.updated_at = datetime.utcnow()
    else:
        # Create new preference
        pref = Preference(
            user_id=user_id,
            key=key,
            value=value,
            confidence=confidence
        )
        db.add(pref)


def get_preferences(db: Session, user_id: str) -> dict:
    """
    Get all user preferences as a dictionary.
    """
    prefs = db.query(Preference).filter(Preference.user_id == user_id).all()
    return {
        pref.key: {
            'value': pref.value,
            'confidence': pref.confidence,
            'updated_at': pref.updated_at
        }
        for pref in prefs
    }
