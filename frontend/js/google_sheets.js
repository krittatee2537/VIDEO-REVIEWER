/**
 * Google Sheets Database Connector for ReviewSearch AI
 * Allows using Google Sheets as a real-time headless CMS / database.
 * Supports public Google Sheets via Google Visualization API (GViz) or CSV export.
 */

(function () {
    const STORAGE_KEY_SHEET_ID = "reviewsearch_google_sheet_id";
    const STORAGE_KEY_AUTO_SYNC = "reviewsearch_google_sheet_autosync";

    // Keep the initial default seed videos as a safe backup
    if (!window.DEFAULT_SEED_VIDEOS && window.SEED_VIDEOS) {
        window.DEFAULT_SEED_VIDEOS = [...window.SEED_VIDEOS];
    }

    class GoogleSheetsDB {
        constructor() {
            this.sheetId = localStorage.getItem(STORAGE_KEY_SHEET_ID) || "";
            this.autoSync = localStorage.getItem(STORAGE_KEY_AUTO_SYNC) !== "false";
            this.status = "idle"; // "idle" | "loading" | "connected" | "fallback" | "error"
            this.lastSyncTime = null;
            this.rowCount = 0;
        }

        getSheetId() {
            return this.sheetId;
        }

        setSheetId(id) {
            this.sheetId = (id || "").trim();
            if (this.sheetId) {
                // If user pasted full Google Sheets URL, extract the ID
                const match = this.sheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
                if (match && match[1]) {
                    this.sheetId = match[1];
                }
                localStorage.setItem(STORAGE_KEY_SHEET_ID, this.sheetId);
            } else {
                localStorage.removeItem(STORAGE_KEY_SHEET_ID);
            }
        }

        /**
         * Fetch and parse data from Google Sheet using Google Visualization API (GViz).
         * Requires the Google Sheet to be shared as "Anyone with the link can view".
         */
        async syncData(customId = null) {
            const idToUse = customId !== null ? customId.trim() : this.sheetId;
            if (!idToUse) {
                this.status = "fallback";
                if (window.DEFAULT_SEED_VIDEOS) {
                    window.SEED_VIDEOS = [...window.DEFAULT_SEED_VIDEOS];
                }
                return { success: true, count: window.SEED_VIDEOS.length, mode: "fallback" };
            }

            this.status = "loading";
            const gvizUrl = `https://docs.google.com/spreadsheets/d/${idToUse}/gviz/tq?tqx=out:json`;

            try {
                const response = await fetch(gvizUrl);
                if (!response.ok) {
                    throw new Error(`Google Sheets HTTP Error: ${response.status}`);
                }

                const text = await response.text();
                // Google GViz response starts with `/*O_o*/\ngoogle.visualization.Query.setResponse({...});`
                const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
                if (!jsonMatch || !jsonMatch[1]) {
                    throw new Error("Invalid response format from Google Sheets.");
                }

                const data = JSON.parse(jsonMatch[1]);
                if (data.status === "error") {
                    throw new Error(data.errors?.[0]?.message || "Google Sheets returned an error.");
                }

                const parsedVideos = this._parseGVizRows(data.table);
                if (parsedVideos.length > 0) {
                    window.SEED_VIDEOS = parsedVideos;
                    this.status = "connected";
                    this.lastSyncTime = new Date();
                    this.rowCount = parsedVideos.length;
                    return { success: true, count: parsedVideos.length, mode: "google_sheets" };
                } else {
                    throw new Error("No data rows found in Google Sheet.");
                }
            } catch (err) {
                console.warn("[GoogleSheetsDB] Failed to sync with Google Sheet:", err);
                this.status = "error";
                // Fallback to default catalog
                if (window.DEFAULT_SEED_VIDEOS) {
                    window.SEED_VIDEOS = [...window.DEFAULT_SEED_VIDEOS];
                }
                return { success: false, error: err.message, mode: "fallback" };
            }
        }

        /**
         * Parses GViz table structure into video items.
         */
        _parseGVizRows(table) {
            if (!table || !table.cols || !table.rows) return [];

            // Extract column names from header row (lowercase)
            const colNames = table.cols.map(c => (c.label || c.id || "").toLowerCase().trim());
            const videos = [];

            for (const row of table.rows) {
                if (!row.c) continue;
                const obj = {};

                colNames.forEach((col, idx) => {
                    const cell = row.c[idx];
                    const val = cell ? (cell.v !== null && cell.v !== undefined ? cell.v : "") : "";
                    obj[col] = String(val).trim();
                });

                // Skip completely empty rows
                if (!obj.title && !obj.id) continue;

                // Build standardized video object
                const id = obj.id || `video-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                const rawViews = parseInt(obj.view_count_raw || obj.view_count || "100000", 10) || 100000;
                const keywordsList = obj.keywords ? obj.keywords.split(",").map(k => k.trim()).filter(Boolean) : [];

                videos.push({
                    id: id,
                    title: obj.title || "Untitled Review Video",
                    description: obj.description || "",
                    platform: (obj.platform || "youtube").toLowerCase(),
                    platform_name: obj.platform_name || this._guessPlatformName(obj.platform),
                    region: (obj.region || "international").toLowerCase(),
                    author: obj.author || "Reviewer",
                    author_avatar: obj.author_avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
                    view_count: obj.view_count || rawViews.toLocaleString(),
                    view_count_raw: rawViews,
                    duration: obj.duration || "05:00",
                    publish_date: obj.publish_date || new Date().toISOString().slice(0, 10),
                    match_score: parseInt(obj.match_score || "95", 10),
                    thumbnail_url: obj.thumbnail_url || "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80",
                    embed_url: obj.embed_url || "https://www.youtube.com/embed/dQw4w9WgXcQ",
                    source_url: obj.source_url || "#",
                    download_url: obj.download_url || "",
                    category: obj.category || "Electronics",
                    keywords: keywordsList
                });
            }

            return videos;
        }

        _guessPlatformName(platformKey) {
            const map = {
                bilibili: "Bilibili (哔哩哔哩)",
                douyin: "Douyin (抖音)",
                xiaohongshu: "Xiaohongshu (小红书)",
                kuaishou: "Kuaishou (快手)",
                youtube: "YouTube",
                tiktok: "TikTok",
                instagram: "Instagram Reels"
            };
            return map[(platformKey || "").toLowerCase()] || "Video Platform";
        }

        /**
         * Generates CSV template content so the user can import into Google Sheets.
         */
        generateCSVTemplate() {
            const headers = [
                "id", "title", "description", "platform", "platform_name", "region",
                "author", "author_avatar", "view_count", "duration", "publish_date",
                "match_score", "thumbnail_url", "embed_url", "source_url", "download_url",
                "category", "keywords"
            ];

            const rows = (window.DEFAULT_SEED_VIDEOS || window.SEED_VIDEOS || []).map(v => {
                return headers.map(h => {
                    let val = v[h];
                    if (h === "keywords" && Array.isArray(val)) {
                        val = val.join(",");
                    }
                    val = (val === undefined || val === null) ? "" : String(val);
                    // Escape CSV quotes
                    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
                        val = `"${val.replace(/"/g, '""')}"`;
                    }
                    return val;
                }).join(",");
            });

            return [headers.join(","), ...rows].join("\n");
        }
    }

    window.GoogleSheetsDB = new GoogleSheetsDB();
})();
