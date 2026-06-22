from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, create_engine
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime, timezone

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(20), default='student')
    display_name = Column(String(100))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    sessions = relationship("TrainingSession", back_populates="user")

class TrainingSession(Base):
    __tablename__ = 'training_sessions'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    subject = Column(String(20))
    mode = Column(String(20))
    question = Column(Text)
    canvas_data = Column(Text)
    conversation = Column(Text)
    ai_feedback = Column(Text)
    score = Column(Integer)
    duration = Column(Integer)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    user = relationship("User", back_populates="sessions")
