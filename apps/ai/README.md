# AI Service (Python + FastAPI)

Service for swing video processing, pose estimation, and AI guidance generation.

Planned responsibilities:
- Frame extraction and video normalization.
- Pose estimation and P-position candidate detection.
- Analysis artifacts and confidence scoring.
- LLM-based coaching summaries and goal alignment.

Dev notes:
- Install deps: `pip install -r requirements.txt`
- Run: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- Test: `pytest`
