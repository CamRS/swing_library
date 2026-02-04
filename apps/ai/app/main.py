from fastapi import FastAPI
from fastapi import HTTPException
from pydantic import BaseModel

app = FastAPI(title="Swing AI Service")


class AnalysisRequest(BaseModel):
  swing_id: str
  goal_id: str | None = None


@app.get("/health")
def health():
  return {"status": "ok"}


@app.post("/v1/analysis")
def request_analysis(payload: AnalysisRequest):
  raise HTTPException(
    status_code=501,
    detail="Analysis pipeline not implemented yet."
  )
