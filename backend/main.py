import json
import os
from dotenv import load_dotenv
load_dotenv()  # 从 .env 文件加载环境变量

from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timezone

from database import get_db, SessionLocal, init_db
from models import User, TrainingSession
from auth import hash_password, verify_password, create_token, get_current_user, require_admin
from websocket import ws_manager
from ai import get_ai_feedback, get_interview_response

app = FastAPI(title="Oxbridge Interview Tutor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()
    from seed import seed_db
    db = SessionLocal()
    try:
        seed_db(db)
    finally:
        db.close()

class LoginRequest(BaseModel):
    username: str
    password: str

class CreateUserRequest(BaseModel):
    username: str
    password: str
    display_name: str

class SessionRequest(BaseModel):
    subject: str
    mode: str

class FeedbackRequest(BaseModel):
    question: str
    canvas_data: str

class InterviewRequest(BaseModel):
    subject: str
    topic: str
    history: list = []
    stage: str = "warmup"
    elapsed: int = 0

class CompleteSessionRequest(BaseModel):
    duration: int | None = None
    score: int | None = None

@app.post("/api/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    token = create_token(user.username, user.role)
    return {
        "token": token,
        "username": user.username,
        "role": user.role,
        "display_name": user.display_name or user.username,
    }

@app.get("/api/me")
def me(user: dict = Depends(get_current_user)):
    return user

@app.get("/api/users")
def list_users(user: dict = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).all()
    result = []
    for u in users:
        session_count = db.query(TrainingSession).filter(TrainingSession.user_id == u.id).count()
        result.append({
            "id": u.id,
            "username": u.username,
            "role": u.role,
            "display_name": u.display_name,
            "session_count": session_count,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })
    return result

@app.post("/api/users")
def create_user(req: CreateUserRequest, user: dict = Depends(require_admin), db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == req.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="用户名已存在")
    new_user = User(
        username=req.username,
        password_hash=hash_password(req.password),
        display_name=req.display_name,
        role="student",
    )
    db.add(new_user)
    db.commit()
    return {"id": new_user.id, "username": new_user.username, "display_name": new_user.display_name}

@app.delete("/api/users/{user_id}")
def delete_user(user_id: int, user: dict = Depends(require_admin), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="用户不存在")
    if target.role == "admin":
        raise HTTPException(status_code=400, detail="不能删除管理员")
    db.query(TrainingSession).filter(TrainingSession.user_id == user_id).delete()
    db.delete(target)
    db.commit()
    return {"ok": True}

@app.post("/api/sessions")
def create_session(req: SessionRequest, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    questions = {
        "math": "请用积分法求曲线 y=x^2 与直线 y=2x+3 所围成的面积。请写出完整解题步骤。",
        "physics": "一个质量为 m 的物体从倾角为 30° 的斜面顶端静止释放，斜面光滑，高度为 h。求物体到达底端时的速度，并讨论能量转化过程。",
    }
    session = TrainingSession(
        user_id=user["id"],
        subject=req.subject,
        mode=req.mode,
        question=questions.get(req.subject, "请解这道题"),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {
        "id": session.id,
        "subject": session.subject,
        "mode": session.mode,
        "question": session.question,
    }

@app.get("/api/sessions")
def list_sessions(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(TrainingSession)
    if user["role"] != "admin":
        query = query.filter(TrainingSession.user_id == user["id"])
    sessions = query.order_by(TrainingSession.created_at.desc()).all()
    return [{
        "id": s.id,
        "user_id": s.user_id,
        "subject": s.subject,
        "mode": s.mode,
        "question": s.question[:60] + "..." if s.question and len(s.question) > 60 else s.question,
        "score": s.score,
        "duration": s.duration,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "user_name": s.user.display_name if s.user else "未知",
    } for s in sessions]

@app.get("/api/sessions/{session_id}")
def get_session(session_id: int, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    if user["role"] != "admin" and session.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="无权访问")
    return {
        "id": session.id,
        "subject": session.subject,
        "mode": session.mode,
        "question": session.question,
        "canvas_data": session.canvas_data,
        "conversation": session.conversation,
        "ai_feedback": session.ai_feedback,
        "score": session.score,
        "duration": session.duration,
        "created_at": session.created_at.isoformat() if session.created_at else None,
    }

@app.post("/api/sessions/{session_id}/feedback")
async def request_feedback(session_id: int, req: FeedbackRequest, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    feedback = await get_ai_feedback(req.question, req.canvas_data, session.subject)
    session.canvas_data = req.canvas_data
    session.ai_feedback = feedback
    db.commit()
    return {"feedback": feedback}

@app.post("/api/sessions/{session_id}/complete")
def complete_session(session_id: int, req: CompleteSessionRequest, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    if req.duration is not None:
        session.duration = req.duration
    if req.score is not None:
        session.score = req.score
    db.commit()
    return {"ok": True}

@app.post("/api/interview")
async def interview(req: InterviewRequest):
    response_text = await get_interview_response(req.subject, req.topic, req.history, req.stage, req.elapsed)
    return {"response": response_text}

@app.websocket("/ws/training/{session_id}")
async def ws_training(websocket: WebSocket, session_id: int):
    await ws_manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "canvas_update":
                db = SessionLocal()
                try:
                    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
                    if session:
                        session.canvas_data = json.dumps(msg.get("data", {}))
                        db.commit()
                finally:
                    db.close()
            elif msg.get("type") == "request_feedback":
                question = msg.get("question", "")
                strokes = msg.get("strokes", "")
                db = SessionLocal()
                try:
                    session = db.query(TrainingSession).filter(TrainingSession.id == session_id).first()
                    feedback = await get_ai_feedback(question, strokes, session.subject if session else "math")
                    await ws_manager.send_to(websocket, json.dumps({
                        "type": "ai_feedback",
                        "data": {"feedback": feedback}
                    }))
                finally:
                    db.close()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, session_id)

@app.websocket("/ws/interview/{session_id}")
async def ws_interview(websocket: WebSocket, session_id: int):
    await ws_manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "answer":
                subject = msg.get("subject", "math")
                topic = msg.get("topic", "")
                history = msg.get("history", [])
                stage = msg.get("stage", "warmup")
                elapsed = msg.get("elapsed", 0)
                response_text = await get_interview_response(subject, topic, history, stage, elapsed)
                await ws_manager.send_to(websocket, json.dumps({
                    "type": "interviewer",
                    "data": {"text": response_text}
                }))
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, session_id)

# ===== 前端静态文件服务 =====
import os

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

# 挂载静态资源（assets/ 等）
if os.path.exists(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

# SPA 兜底：所有非 /api 路由返回 index.html
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    file_path = os.path.join(STATIC_DIR, full_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    # SPA 兜底
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"error": "前端文件未找到，请先构建前端"}
