# import os
# os.environ["OLLAMA_USE_CPU"] = "1"
from fastapi import FastAPI, UploadFile, Form, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from PyPDF2 import PdfReader
from langchain_ollama import ChatOllama
import asyncio, hashlib, json

app = FastAPI(title="AI Career Mentor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

llm = ChatOllama(model="llama3:latest", stream=True)
cache = {}

def get_hash(text: str) -> str:
    return hashlib.md5(text.encode()).hexdigest()

async def ask_llm(prompt: str) -> str:
    key = get_hash(prompt)
    if key in cache:
        return cache[key]
    result = ""
    async for chunk in llm.astream(prompt):
        result += chunk.content
    cache[key] = result
    return result

# --- Existing SSE /analyze/ stays as is ---
@app.post("/analyze/")
async def analyze_resume(file: UploadFile, target_role: str = Form(...)):
    pdf = PdfReader(file.file)
    resume_text = " ".join(
        [page.extract_text() for page in pdf.pages if page.extract_text()]
    )

    async def generate():
        yield "data: Starting analysis...\n\n"

        resume_task = asyncio.create_task(
            ask_llm(f"Extract key skills, education, and experience from:\n{resume_text}")
        )
        gap_task = asyncio.create_task(
            ask_llm(f"Identify missing skills for {target_role} based on this resume:\n{resume_text}")
        )

        resume_result, gap_result = await asyncio.gather(resume_task, gap_task)
        yield f"data: {json.dumps({'resume': resume_result, 'gaps': gap_result})}\n\n"

        yield "data: Finding recommended courses...\n\n"
        course_task = asyncio.create_task(
            ask_llm(f"Suggest 3 online courses to fill these skill gaps:\n{gap_result}")
        )

        course_result = await course_task

        final_data = {
            "resume": resume_result,
            "gaps": gap_result,
            "courses": course_result,
        }
        yield f"data: {json.dumps(final_data)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

# --- 🟢 New WebSocket endpoint ---
@app.websocket("/ws/roadmap")
async def websocket_roadmap(ws: WebSocket):
    await ws.accept()
    try:
        data = await ws.receive_text()
        payload = json.loads(data)
        target_role = payload.get("target_role", "")
        resume = payload.get("resume", "")
        gaps = payload.get("gaps", "")

        prompt = (
            f"Create a step-by-step roadmap for becoming a {target_role}. "
            f"Base it on this resume and skill gap info:\n\nResume: {resume}\n\nGaps: {gaps}"
        )

        async for chunk in llm.astream(prompt):
            await ws.send_json({"token": chunk.content})

        await ws.send_json({"done": True})
    except Exception as e:
        await ws.send_json({"error": str(e)})
    finally:
        await ws.close()
