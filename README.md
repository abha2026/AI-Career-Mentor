# AI Career Mentor  

AI Career Mentor is a full-stack application that helps students and early-career professionals understand their current skills, identify gaps, and receive personalized, actionable guidance toward their target career roles.

By combining **resume parsing**, **semantic search**, and **LLM-based reasoning**, the system generates a real-time **career roadmap** with course recommendations and skill gap analysis.

---

## ✨ Key Features

- 📄 PDF Resume Parsing  
- 🔍 Semantic Search using SentenceTransformers + Pinecone  
- 🤖 LLM Skill Extraction (ChatOllama via LangChain)  
- 📚 Course Recommendations  
- 🗺️ Real-time Career Roadmap over WebSocket  
- 🔐 User Authentication  
- ⚛️ React Frontend with Streaming UI  
- 🧪 High Test Coverage (Frontend + Backend)

---

## 📁 Project Structure

The project contains a **FastAPI backend** and a **React frontend**, organized for clarity, scalability, and testability.

---

# How to run
### **Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### **Frontend**
```bash
cd frontend
npm install
npm run dev
```

---

# 🧪 Tests & Coverage

### **Frontend**
```bash
cd frontend
npm test -- --coverage
```
### **Backend**
```bash
cd backend
PYTHONPATH=. pytest --cov=main --cov-report=term-missing -vv
```
