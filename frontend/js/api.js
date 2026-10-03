/**
 * API Service for Product Review Video Search Backend
 */
class VideoSearchAPI {
    constructor(baseURL = "") {
        self.baseURL = baseURL;
    }

    /**
     * Search review videos by text query.
     */
    async searchByText({ query, region = "all", platform = "all", category = "all", sort_by = "relevance" }) {
        const response = await fetch(`${self.baseURL}/api/search/text`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
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
        const formData = new FormData();
        formData.append("file", file);
        formData.append("region", region);
        formData.append("platform", platform);
        formData.append("category", category);
        formData.append("sort_by", sort_by);

        const response = await fetch(`${self.baseURL}/api/search/image`, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Image Search API error: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Fetch supported platform list and metadata.
     */
    async getPlatforms() {
        const response = await fetch(`${self.baseURL}/api/platforms`);
        if (!response.ok) {
            throw new Error("Failed to fetch platforms");
        }
        return await response.json();
    }
}

window.api = new VideoSearchAPI();
