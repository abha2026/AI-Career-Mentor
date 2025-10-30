import os
import time
import json
import hashlib
import asyncio
from typing import List

from fastapi import FastAPI, UploadFile, Form, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from PyPDF2 import PdfReader
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone, ServerlessSpec
from langchain_ollama import ChatOllama

from sqlalchemy import create_engine, Column, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime

from dotenv import load_dotenv
load_dotenv()

# ---------------- CONFIG ----------------
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENV = os.getenv("PINECONE_ENV", "us-east1-gcp")
PINECONE_INDEX = os.getenv("PINECONE_INDEX", "resume-embeddings")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3:latest")
DATABASE_URL = os.getenv("DATABASE_URL")  # AWS RDS URL

if not PINECONE_API_KEY or not DATABASE_URL:
    raise RuntimeError("Set PINECONE_API_KEY and DATABASE_URL in environment")

# ---------------- INIT ----------------
app = FastAPI(title="AI Career Mentor API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pinecone
pc = Pinecone(api_key=PINECONE_API_KEY)
if PINECONE_INDEX not in pc.list_indexes().names():
    pc.create_index(
        name=PINECONE_INDEX,
        dimension=384,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1")
    )
index = pc.Index(PINECONE_INDEX)
embedder = SentenceTransformer("all-MiniLM-L6-v2")

# LLM
llm = ChatOllama(model=OLLAMA_MODEL, stream=True)

# SQLAlchemy / PostgreSQL (AWS RDS)
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    user_id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ResumeMeta(Base):
    __tablename__ = "resumes"
    resume_id = Column(String, primary_key=True, index=True)
    user_id = Column(String)
    filename = Column(String)
    chunk_ids = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

Base.metadata.create_all(bind=engine)

# ---------------- HELPERS ----------------
def get_hash(text: str) -> str:
    return hashlib.md5(text.encode()).hexdigest()

def chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> List[str]:
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = words[i:i + chunk_size]
        chunks.append(" ".join(chunk))
        i += chunk_size - overlap
    return chunks

CACHE = {}

async def ask_llm(prompt: str) -> str:
    key = get_hash(prompt)
    if key in CACHE:
        return CACHE[key]
    result = ""
    async for chunk in llm.astream(prompt):
        result += chunk.content
    CACHE[key] = result
    return result

async def ask_llm_stream(prompt: str, ws_send):
    async for chunk in llm.astream(prompt):
        await ws_send(chunk.content)

def upsert_chunks(user_id: str, resume_id: str, filename: str, chunks: List[str]):
    vecs = embedder.encode(chunks, show_progress_bar=False)
    items = []
    chunk_ids = []
    for i, v in enumerate(vecs):
        cid = f"{user_id}::{resume_id}::{i}"
        chunk_ids.append(cid)
        meta = {"user_id": user_id, "resume_id": resume_id, "filename": filename, "text": chunks[i][:2000]}
        items.append((cid, v.tolist(), meta))
    index.upsert(vectors=items)
    # save metadata in RDS
    db = SessionLocal()
    db.add(ResumeMeta(
        resume_id=resume_id,
        user_id=user_id,
        filename=filename,
        chunk_ids=json.dumps(chunk_ids)
    ))
    db.commit()
    db.close()
    return chunk_ids

def cleanup_old_resumes(user_id: str, keep_last: int = 3):
    db = SessionLocal()
    resumes = db.query(ResumeMeta).filter(ResumeMeta.user_id == user_id).order_by(ResumeMeta.timestamp.desc()).all()
    if len(resumes) <= keep_last:
        db.close()
        return
    to_delete = resumes[keep_last:]
    ids_to_delete = []
    for r in to_delete:
        ids_to_delete.extend(json.loads(r.chunk_ids))
        db.delete(r)
    db.commit()
    db.close()
    if ids_to_delete:
        index.delete(ids=ids_to_delete)

def semantic_search_user(query: str, user_id: str, top_k: int = 6) -> List[str]:
    qvec = embedder.encode(query).tolist()
    results = index.query(vector=qvec, top_k=top_k, include_metadata=True, include_values=False, filter={"user_id": user_id})
    matches = results.get("matches", [])
    texts = [m["metadata"].get("text") for m in matches]
    return texts


# ---------------- AUTH ----------------
@app.post("/signup/")
async def signup(email: str = Form(...), user_id: str = Form(...), password: str = Form(...)):
    db = SessionLocal()
    existing = db.query(User).filter((User.user_id == user_id) | (User.email == email)).first()
    if existing:
        db.close()
        raise HTTPException(status_code=400, detail="User already exists")
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    db.add(User(user_id=user_id, email=email, password_hash=password_hash))
    db.commit()
    db.close()
    return {"message": "User created successfully"}



@app.post("/login/")
async def login(user_id: str = Form(...), password: str = Form(...)):
    db = SessionLocal()
    user = db.query(User).filter(User.user_id == user_id).first()
    db.close()
    if not user or user.password_hash != hashlib.sha256(password.encode()).hexdigest():
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"message": "Login successful", "user_id": user.user_id, "email": user.email}



# ---------------- RESUME ANALYSIS ----------------
@app.post("/analyze/")
async def analyze_resume(file: UploadFile, target_role: str = Form(...), user_id: str = Form(...)):
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id required")
    pdf = PdfReader(file.file)
    pages = [p.extract_text() for p in pdf.pages if p.extract_text()]
    resume_text = "\n\n".join(pages)
    chunks = chunk_text(resume_text, chunk_size=350, overlap=50)
    resume_id = get_hash(file.filename + str(time.time()))
    upsert_chunks(user_id, resume_id, file.filename, chunks)
    cleanup_old_resumes(user_id, keep_last=3)
    relevant_chunks = semantic_search_user(f"skills and experiences relevant to {target_role}", user_id, top_k=8)
    resume_context = "\n\n".join(relevant_chunks) or resume_text[:4000]

    async def generate():
        yield "data: Starting analysis...\n\n"
        resume_result = await ask_llm(f"Extract key skills, education, and experience from:\n{resume_context}")
        gap_result = await ask_llm(f"Identify missing skills for {target_role} based on this resume context:\n{resume_context}")
        course_result = await ask_llm(f"Suggest 3 online courses (title + short reason) to fill these skills gaps:\n{gap_result}")
        final_data = {
            "resume": resume_result,
            "gaps": gap_result,
            "courses": course_result,
            "resume_id": resume_id,
            "user_id": user_id
        }
        yield f"data: {json.dumps(final_data)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

# ---------------- WEBSOCKET ROADMAP ----------------
@app.websocket("/ws/roadmap")
async def websocket_roadmap(ws: WebSocket):
    await ws.accept()
    try:
        data = await ws.receive_text()
        payload = json.loads(data)
        target_role = payload.get("target_role", "")
        resume_summary = payload.get("resume", "")
        gaps = payload.get("gaps", "")
        user_id = payload.get("user_id", "")

        if not user_id:
            await ws.send_json({"error": "user_id required"})
            await ws.close()
            return

        retrieved = semantic_search_user(f"roadmap context for {target_role}", user_id, top_k=10)
        prompt = f"Create a multi-step, actionable roadmap for becoming a {target_role}.\n\nResume summary:\n{resume_summary}\n\nGaps:\n{gaps}\n\nRelevant resume snippets:\n" + "\n\n".join(retrieved)
        async for chunk in llm.astream(prompt):
            await ws.send_json({"token": chunk.content})
        await ws.send_json({"done": True})
    except Exception as e:
        await ws.send_json({"error": str(e)})
    finally:
        await ws.close()
