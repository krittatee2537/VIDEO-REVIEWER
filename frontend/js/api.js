/**
 * API Service for Product Review Video Search.
 * Uses the FastAPI backend when it is reachable (local `python run.py`);
 * otherwise falls back to the in-browser engine (GitHub Pages / static hosting).
 */
class VideoSearchAPI {
    constructor(baseURL = "") {
        this.baseURL = baseURL;
        this._backendAvailable = null; // unknown until first check
    }

    async hasBackend() {
        if (this._backendAvailable !== null) return this._backendAvailable;
        if (location.hostname.endsWith("github.io") || location.protocol === "file:") {
            this._backendAvailable = false;
            return false;
        }
        try {
            const res = await fetch(`${this.baseURL}/api/health`, { cache: "no-store" });
            this._backendAvailable = res.ok;
        } catch {
            this._backendAvailable = false;
        }
        return this._backendAvailable;
    }

    /**
     * Search review videos by text query.
     */
    async searchByText({ query, region = "all", platform = "all", category = "all", sort_by = "relevance" }) {
        if (!(await this.hasBackend())) {
            return window.LocalSearchEngine.searchVideos({ query, region, platform, category, sort_by });
        }

        const response = await fetch(`${this.baseURL}/api/search/text`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, region, platform, category, sort_by })
        });
        if (!response.ok) {
            throw new Error(`Text Search API error: ${response.statusText}`);
        }
        return await response.json();
    }

    /**
     * Search review videos by uploading an image file.
     */
    async searchByImage(file, { region = "all", platform = "all", category = "all", sort_by = "relevance" }) {
        if (!(await this.hasBackend())) {
            const analysis = await window.LocalSearchEngine.analyzeImage(file);
            const search_results = window.LocalSearchEngine.searchVideos({
                query: analysis.detection.primary_query, region, platform, category, sort_by
            });
            return { image_analysis: analysis, search_results };
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("region", region);
        formData.append("platform", platform);
        formData.append("category", category);
        formData.append("sort_by", sort_by);

        const response = await fetch(`${this.baseURL}/api/search/image`, {
            method: "POST",
            body: formData
        });
        if (!response.ok) {
            throw new Error(`Image Search API error: ${response.statusText}`);
        }
        return await response.json();
    }
}

window.api = new VideoSearchAPI();
