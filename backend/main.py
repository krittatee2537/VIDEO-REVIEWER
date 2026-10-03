"""
FastAPI Backend Application
Product Review Video Search Engine (China & International Platforms)
"""

import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
from typing import Optional, List

from services.video_aggregator import VideoAggregator
from services.image_analyzer import ImageAnalyzer

app = FastAPI(
    title="Product Review Video Search API",
    description="Multi-platform video review search system for Chinese and International sources.",
    version="1.0.0"
)

# Enable CORS for frontend cross-origin access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

video_service = VideoAggregator()
image_service = ImageAnalyzer()

# Request Models
class TextSearchRequest(BaseModel):
    query: str
    region: Optional[str] = "all"        # "all", "china", "international"
    platform: Optional[str] = "all"      # "all", "bilibili", "douyin", "youtube", "tiktok", etc.
    category: Optional[str] = "all"      # "all", "Electronics", "Beauty", "Fashion", "Home", "Toys"
    sort_by: Optional[str] = "relevance"  # "relevance", "views", "newest"

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "Product Review Video Search API",
        "version": "1.0.0"
    }

@app.get("/api/platforms")
def get_platforms():
    """Returns list of supported video platforms (China & International)."""
    return {
        "platforms": video_service.get_supported_platforms()
    }

@app.post("/api/search/text")
def search_by_text(req: TextSearchRequest):
    """
    Search product review videos using a text query keyword.
    """
    results = video_service.search_videos(
        query=req.query,
        region=req.region,
        platform=req.platform,
        category=req.category,
        sort_by=req.sort_by
    )
    return results

@app.post("/api/search/image")
async def search_by_image(
    file: UploadFile = File(...),
    region: str = Form("all"),
    platform: str = Form("all"),
    category: str = Form("all"),
    sort_by: str = Form("relevance")
):
    """
    Upload a product image -> run AI vision feature recognition -> search review videos.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    image_bytes = await file.read()
    
    # Analyze uploaded image
    analysis = image_service.analyze_image_bytes(image_bytes, filename=file.filename or "")
    
    primary_query = analysis["detection"]["primary_query"]
    
    # Execute video search based on recognized product keywords
    search_results = video_service.search_videos(
        query=primary_query,
        region=region,
        platform=platform,
        category=category,
        sort_by=sort_by
    )

    return {
        "image_analysis": analysis,
        "search_results": search_results
    }

# Mount static frontend directory
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

    @app.get("/", response_class=HTMLResponse)
    def read_root():
        index_path = os.path.join(frontend_dir, "index.html")
        if os.path.exists(index_path):
            with open(index_path, "r", encoding="utf-8") as f:
                return f.read()
        return "<h1>Frontend index.html not found</h1>"
