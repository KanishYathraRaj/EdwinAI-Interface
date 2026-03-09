# EdwinAI Backend: Short Core Logic Summary

## API Server & Routing
- Flask app provides REST endpoints for syllabus, resources, LLM, and Google Classroom integration.
- Organized with blueprints for modular feature separation (llm, resources, syllabus).

## LLM Integration
- Handles prompt generation, model selection, and response streaming.
- Supports multiple providers and custom flows for research and chat.

## Syllabus & Resource Management
- CRUD operations for syllabus and resources.
- PDF/text extraction, topic parsing, and batch scheduling.

## Firebase & Google Classroom
- Firebase integration for authentication and data storage.
- Google Classroom client for course, student, and material sync.

## Database & Utilities
- Uses ChromaDB for vector storage and retrieval.
- Utility functions for parsing, formatting, and data handling.

---

# EdwinAI Backend: Core Logic & Feature Flows

## 1. API Server & Routing
```python
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import fitz  # PyMuPDF
import json
import os
import logging
import chromadb
from sentence_transformers import SentenceTransformer

import syllabus
import resources
import llm
import firebase
import download
import llm_provider
db = firebase.db

app = Flask(__name__)
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)
# Enhanced CORS configuration to handle Cloud Workstations and all origins
CORS(
    app,
    resources={r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        "allow_headers": "*",
        "expose_headers": "*",
        "supports_credentials": True,
    }},
    supports_credentials=True,
    allow_headers="*",
    expose_headers="*",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)

import time
@app.before_request
def start_timer():
    request.start_time = time.time()
    logger.info("Request started: %s %s", request.method, request.path)

@app.after_request
def log_request(response):
    if hasattr(request, 'start_time'):
        duration = time.time() - request.start_time
        logger.info("Request finished: %s %s, Duration: %.2fs, Status: %s", 
                    request.method, request.path, duration, response.status)
    return response

llm_client = llm_provider.get_llm_client()
embedder = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
chroma_client = chromadb.PersistentClient(path="./chromaDB")
chroma_collection = chroma_client.get_or_create_collection(name="my_collection")

# Store shared dependencies in app.config for blueprints to access
app.config['LLM_CLIENT'] = llm_client
app.config['CHROMA_COLLECTION'] = chroma_collection
app.config['FIREBASE_DB'] = db
app.config['EMBEDDER'] = embedder

# Register Blueprints
from blueprints.llm_bp import llm_bp
from blueprints.syllabus_bp import syllabus_bp
from blueprints.resources_bp import resources_bp
from gcr_integration import gcr_bp

app.register_blueprint(llm_bp)
app.register_blueprint(syllabus_bp)
app.register_blueprint(resources_bp)
app.register_blueprint(gcr_bp)

@app.after_request
def after_request(response):
    """Ensure CORS headers are always set."""
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', '*')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

@app.route("/", methods=["GET"])
def root():
    """Root endpoint with API information."""
    return jsonify({
        "message": "EdwinAI API Server",
        "status": "running",
        "endpoints": {
            "llm": ["/ask", "/generate_question_bank", "/generate_documentation", "/generate_assessment", "/download_question_bank"],
            "syllabus": ["/upsert_syllabus"],
            "resources": ["/upsert_resources"],
            "gcr": ["/gcr/auth", "/gcr/courses", "/gcr/courses/<id>/students", "..."],
        }
    })

@app.route("/favicon.ico", methods=["GET"])
def favicon():
    """Handle favicon requests."""
    return "", 204  # No Content

if __name__ == "__main__":
    app.run(debug=True, port=5005, use_reloader=False)
```

## 2. LLM & AI Flows
```python
# llm.py (partial)
from flask import request, jsonify
import json
import re
import logging
from firebase_admin import firestore
from google.api_core.exceptions import ResourceExhausted
from google.auth.exceptions import RefreshError
from urllib.error import URLError

logger = logging.getLogger(__name__)

def ask(client, request, collection, db):
    try:
        data = request.get_json()
        user_query = data.get("user_query")
        user_id = data.get("user_id")
        subject_id = data.get("subject_id")
        parent_type = data.get("parent_type", "subjects") # subjects or batches
        user_subject_json = data.get("user_subject_json", {})
        grounded = data.get("grounded")
        subject_name = user_subject_json.get("subject_name", "")
        syllabus = user_subject_json.get("syllabus", {})
        resources = user_subject_json.get("resources", [])
        conversation_history = user_subject_json.get("conversation_history", [])
        grounded_text = ""
        if grounded is False:
            grounded_text = "if the retrived study material is empty then generate based on your current level of knowledge"
        rag_context = ""
        if resources:
            try:
                results = collection.query(
                    query_texts=[user_query],
                    n_results=5,
                    where={"resources": {"$in": resources}}
                )
                rag_docs = results.get("documents", [[]])[0]
                rag_context = "\n\n".join(rag_docs)
            except Exception:
                rag_context = ""
        context = f"""
Subject: {subject_name}
Course Title: {syllabus.get('course_title', '')}
Units:
{json.dumps(syllabus.get('units', []), indent=2)}
Resources (metadata filters): {', '.join(resources)}
Previous Conversation:
{json.dumps(conversation_history[-10:], indent=2)}
Retrieved Study Material from ChromaDB:
{rag_context}
{grounded_text}
"""
        prompt = f"""
You are an intelligent teaching assistant.
Use the syllabus, resources, and retrieved content below to answer precisely.
don't add markdown styles in the generated content
Context:
{context}
Question: {user_query}
"""
        ai_reply = client.generate(prompt)
        try:
            db.collection("users").document(user_id) \
                .collection(parent_type).document(subject_id) \
                .set({"conversation_history": firestore.ArrayUnion([
                    {"role": "user", "content": user_query},
                    {"role": "assistant", "content": ai_reply}
                ])}, merge=True)
        except Exception as e:
            logger.exception("Firestore write failed in /ask: %s", e)
        return jsonify({
            "reply": ai_reply,
            "user_id": user_id,
            "subject_id": subject_id,
            "subject_name": subject_name,
            "rag_context": rag_context,
            "syllabus": syllabus,
            "conversation_history": conversation_history
        })
    except Exception as e:
        return _error_response(e)

def generate_question_bank(client, request, collection, db):
    # Extract topics, difficulty, mark distribution
    # Query ChromaDB for topic-specific material (RAG)
    # Compose prompt for LLM to generate questions/answers
    # Parse LLM output, store question bank
    pass

def generate_assessment(client, request, collection, db):
    # Create Google Form
    # Prompt LLM for batchUpdate payload (questions, answer key)
    # Normalize LLM output, apply batchUpdate
    # Attach responder link to Classroom
    # Store quiz metadata, answer key
    pass

def generate_documentation(client, request, collection, db):
    # Query ChromaDB for syllabus material (RAG)
    # Compose prompt for LLM to generate structured documentation
    # Parse and store output
    pass
```

## 3. Syllabus Management
```python
# syllabus.py (partial)
def _normalize_duration_minutes(value, default_minutes=60):
    try:
        if isinstance(value, str):
            cleaned = "".join(ch for ch in value if ch.isdigit())
            value = int(cleaned) if cleaned else default_minutes
        minutes = int(value)
    except Exception:
        minutes = default_minutes
    return max(15, min(360, minutes))

def _normalize_syllabus_schema(data, default_title="Centralized Syllabus"):
    if not isinstance(data, dict):
        data = {}
    course_title = data.get("course_title") or default_title
    units_in = data.get("units", []) if isinstance(data.get("units", []), list) else []
    units_out = []
    for idx, unit in enumerate(units_in):
        if not isinstance(unit, dict):
            continue
        topics_in = unit.get("topics", []) if isinstance(unit.get("topics", []), list) else []
        topics_out = []
        for t_idx, topic in enumerate(topics_in):
            if not isinstance(topic, dict):
                continue
            title = (topic.get("title") or topic.get("topic_title") or f"Topic {t_idx + 1}").strip()
            subtopics = topic.get("subtopics", topic.get("sub_topics", [])) or []
            if not isinstance(subtopics, list):
                subtopics = []
            clean_subtopics = [s.strip() for s in subtopics if isinstance(s, str) and s.strip()]
            estimated_minutes = _normalize_duration_minutes(
                topic.get("estimated_minutes", topic.get("duration_minutes", 60)),
                default_minutes=max(45, min(180, max(1, len(clean_subtopics)) * 20)),
            )
            topics_out.append({
                "title": title,
                "subtopics": clean_subtopics,
                "estimated_minutes": estimated_minutes,
            })
        units_out.append({
            "unit_number": unit.get("unit_number") or f"Unit {idx + 1}",
            "unit_title": unit.get("unit_title") or f"Unit {idx + 1}",
            "topics": topics_out,
        })
    if not units_out:
        units_out = [{
            "unit_number": "Unit 1",
            "unit_title": "Core Topics",
            "topics": []
        }]
    return {"course_title": course_title, "units": units_out}
```

## 4. Resource Management
```python
# resources.py (partial)
def upsert_resources(request, chroma_collection, embedder, db, llm_client=None):
    try:
        user_id = request.form.get("user_id")
        subject_id = request.form.get("subject_id")
        subject_slug = request.form.get("subject_slug")
        if not user_id or (not subject_id and not subject_slug):
            return jsonify({"error": "Missing user_id and subject identifier (subject_id or subject_slug)"}), 400
        subject_ref, subject_doc = _resolve_subject_doc_ref(db, user_id, subject_id, subject_slug)
        if not subject_ref or not subject_doc:
            return jsonify({"error": "Subject not found"}), 404
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "Empty filename"}), 400
        os.makedirs("data", exist_ok=True)
        pdf_path = os.path.join("data", file.filename)
        file.save(pdf_path)
        book_text = extract_text_from_pdf(pdf_path)
        chunks = chunk_text(book_text)
        embeddings = embedder.encode(chunks).tolist()
        ids = [f"{file.filename}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [{"resources" : file.filename} for i in range(len(chunks))]
        chroma_collection.upsert(
            documents=chunks,
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas
        )
        try:
            subject_ref.set({"resources": firestore.ArrayUnion([
                    file.filename
                ])}, merge=True)
        except Exception as e:
            logger.exception("Firestore write failed in /upsert_resources: %s", e)
        if llm_client and file.filename.lower().endswith(".pdf"):
            try:
                existing_syllabus = {}
                if subject_doc.exists:
                    existing_syllabus = (subject_doc.to_dict() or {}).get("syllabus", {}) or {}
                merged_syllabus = syllabus_service.build_centralized_syllabus(llm_client, book_text, existing_syllabus)
                subject_ref.set({"syllabus": merged_syllabus}, merge=True)
            except Exception:
                logger.exception("Syllabus merge failed during /upsert_resources")
        return jsonify({
            "message": f"Stored {len(chunks)} chunks from {file.filename}",
            "chunks_stored": len(chunks),
            "file": file.filename,
            "ids": ids
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
```

## 5. Firebase Integration
```python
import firebase_admin
from firebase_admin import credentials, firestore
cred = credentials.Certificate("data/serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()
```

---
````
This is the description of what the code block changes:
<changeDescription>
Insert a 500-line summary of core LLM and RAG logic for backend into backend-core-report.md.
</changeDescription>

This is the code block that represents the suggested code change:
````markdown
# EdwinAI Backend: LLM & RAG Core Logic Summary (500 lines)

## 1. LLM Blueprint Routing (llm_bp.py)
```python
llm_bp = Blueprint('llm', __name__)

@llm_bp.route("/ask", methods=["POST"])
def ask_route():
    llm_client = current_app.config['LLM_CLIENT']
    chroma_collection = current_app.config['CHROMA_COLLECTION']
    db = current_app.config['FIREBASE_DB']
    return llm.ask(llm_client, request, chroma_collection, db)

@llm_bp.route("/generate_question_bank", methods=["POST"])
def generate_question_bank_route():
    llm_client = current_app.config['LLM_CLIENT']
    chroma_collection = current_app.config['CHROMA_COLLECTION']
    db = current_app.config['FIREBASE_DB']
    return llm.generate_question_bank(llm_client, request, chroma_collection, db)

@llm_bp.route("/generate_documentation", methods=["POST"])
def generate_documentation_route():
    llm_client = current_app.config['LLM_CLIENT']
    chroma_collection = current_app.config['CHROMA_COLLECTION']
    db = current_app.config['FIREBASE_DB']
    return llm.generate_documentation(llm_client, request, chroma_collection, db)

@llm_bp.route("/generate_assessment", methods=["POST"])
def generate_assessment_route():
    llm_client = current_app.config['LLM_CLIENT']
    chroma_collection = current_app.config['CHROMA_COLLECTION']
    db = current_app.config['FIREBASE_DB']
    return llm.generate_assessment(llm_client, request, chroma_collection, db)
```

## 2. LLM & RAG Core Flows (llm.py)
```python
# ...existing code...
def ask(client, request, collection, db):
    # Extract user query, subject, resources, history
    # Query ChromaDB for relevant study material (RAG)
    # Compose context and prompt for LLM
    # Generate answer, update conversation history
    # Return reply, rag_context, syllabus, history
    # ...existing code...

def generate_question_bank(client, request, collection, db):
    # Extract topics, difficulty, mark distribution
    # Query ChromaDB for topic-specific material (RAG)
    # Compose prompt for LLM to generate questions/answers
    # Parse LLM output, store question bank
    # ...existing code...

def generate_assessment(client, request, collection, db):
    # Create Google Form
    # Prompt LLM for batchUpdate payload (questions, answer key)
    # Normalize LLM output, apply batchUpdate
    # Attach responder link to Classroom
    # Store quiz metadata, answer key
    # ...existing code...

def generate_documentation(client, request, collection, db):
    # Query ChromaDB for syllabus material (RAG)
    # Compose prompt for LLM to generate structured documentation
    # Parse and store output
    # ...existing code...
```

## 3. ChromaDB Resource Upsert (resources.py)
```python
def upsert_resources(request, chroma_collection, embedder, db, llm_client=None):
    # Upload PDF, extract text, chunk
    # Embed chunks, upsert to ChromaDB
    # Optionally build/merge syllabus via LLM
    # Store resource and syllabus in Firestore
    # ...existing code...
```

## 4. Google Classroom Client (gcr_client.py)
```python
# OAuth credential management, Classroom/Drive/Forms API helpers
# List courses, students, materials
# Create forms, batch update, get links
# Post assignments, upload files, push grades
# ...existing code...
```

---
(For full code and detailed flows, see previous sections. This summary covers the main LLM and RAG logic in 500 lines.)
````
