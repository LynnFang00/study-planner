from typing import Dict
from sqlalchemy.orm import Session
import os
import base64
import httpx


def _get_course_id(course_code: str, db: Session):
    from app.models import Course
    course = db.query(Course).filter(Course.code == course_code.upper()).first()
    return course.id if course else None


def _run_extraction(full_text: str, course_code: str, db: Session) -> Dict:
    from app.ai_service import extract_syllabus_tasks
    course_id = _get_course_id(course_code, db)
    return extract_syllabus_tasks(full_text, course_code, db, course_id)


def parse_syllabus_pdf(file_path: str, course_code: str, db: Session) -> Dict:
    ext = os.path.splitext(file_path)[1].lower()

    # ── Plain text ──────────────────────────────────────────────────────────
    if ext == '.txt':
        try:
            with open(file_path, encoding='utf-8', errors='ignore') as f:
                full_text = f.read()
            return _run_extraction(full_text, course_code, db)
        except Exception as e:
            return {"error": str(e)}

    # ── Images (jpg / png / webp / gif) ─────────────────────────────────────
    if ext in ('.jpg', '.jpeg', '.png', '.webp', '.gif'):
        try:
            mime = {
                '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
                '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif'
            }[ext]
            with open(file_path, 'rb') as f:
                b64 = base64.b64encode(f.read()).decode()

            api_key = os.getenv('GROQ_API_KEY')
            response = httpx.post(
                'https://api.groq.com/openai/v1/chat/completions',
                headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
                json={
                    'model': 'meta-llama/llama-4-scout-17b-16e-instruct',
                    'messages': [{
                        'role': 'user',
                        'content': [
                            {'type': 'image_url',
                             'image_url': {'url': f'data:{mime};base64,{b64}'}},
                            {'type': 'text',
                             'text': 'Extract all the text from this syllabus image. Return the raw text only, no commentary.'}
                        ]
                    }],
                    'max_tokens': 4000,
                    'temperature': 0.1
                },
                timeout=60
            )
            data = response.json()
            if 'choices' not in data:
                err = data.get('error', {}).get('message', str(data))
                return {'error': f'Vision API error: {err}'}
            full_text = data['choices'][0]['message']['content']
            return _run_extraction(full_text, course_code, db)
        except Exception as e:
            return {'error': str(e)}

    # ── PDF (default) ────────────────────────────────────────────────────────
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(file_path, strict=False)
        full_text = ''.join(page.extract_text() or '' for page in reader.pages)
        return _run_extraction(full_text, course_code, db)
    except Exception as e:
        return {'error': str(e)}
