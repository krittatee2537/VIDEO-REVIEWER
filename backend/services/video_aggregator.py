"""
Video Aggregator Service
Combines video search results across Chinese (Bilibili, Douyin, Xiaohongshu, Kuaishou)
and International (YouTube, TikTok, Instagram, Amazon) platforms.
"""

import re
import asyncio
from typing import List, Dict, Any, Optional
from services.seed_dataset import SEED_VIDEOS

PLATFORM_METADATA = {
    "bilibili": {
        "name": "Bilibili (哔哩哔哩)",
        "region": "china",
        "icon": "📺",
        "color": "#fb7299",
        "badge_bg": "rgba(251, 114, 153, 0.15)",
        "badge_text": "#ff6699"
    },
    "douyin": {
        "name": "Douyin (抖音)",
        "region": "china",
        "icon": "🎵",
        "color": "#fe2c55",
        "badge_bg": "rgba(254, 44, 85, 0.15)",
        "badge_text": "#ff3b5c"
    },
    "xiaohongshu": {
        "name": "Xiaohongshu (小红书)",
        "region": "china",
        "icon": "📕",
        "color": "#ff2442",
        "badge_bg": "rgba(255, 36, 66, 0.15)",
        "badge_text": "#ff3855"
    },
    "kuaishou": {
        "name": "Kuaishou (快手)",
        "region": "china",
        "icon": "📹",
        "color": "#ff5000",
        "badge_bg": "rgba(255, 80, 0, 0.15)",
        "badge_text": "#ff6600"
    },
    "youtube": {
        "name": "YouTube",
        "region": "international",
        "icon": "▶️",
        "color": "#ff0000",
        "badge_bg": "rgba(255, 0, 0, 0.15)",
        "badge_text": "#ff4d4d"
    },
    "tiktok": {
        "name": "TikTok",
        "region": "international",
        "icon": "📱",
        "color": "#00f2fe",
        "badge_bg": "rgba(0, 242, 254, 0.15)",
        "badge_text": "#00d2fe"
    },
    "instagram": {
        "name": "Instagram Reels",
        "region": "international",
        "icon": "📸",
        "color": "#e1306c",
        "badge_bg": "rgba(225, 48, 108, 0.15)",
        "badge_text": "#f56040"
    }
}

class VideoAggregator:
    def __init__(self):
        self.videos = SEED_VIDEOS

    def search_videos(
        self,
        query: str,
        region: str = "all",        # "all", "china", "international"
        platform: str = "all",      # "all", "bilibili", "douyin", "xiaohongshu", "youtube", "tiktok", etc.
        category: str = "all",      # "all", "Electronics", "Beauty", "Fashion", "Home", "Toys", "Gaming"
        sort_by: str = "relevance"  # "relevance", "views", "newest"
    ) -> Dict[str, Any]:
        """
        Executes unified search over curated catalog and live aggregation.
        """
        query_terms = [q.strip().lower() for q in re.split(r'\s+', query) if q.strip()]
        
        results = []

        for item in self.videos:
            # 1. Filter by Region
            if region != "all" and item["region"] != region:
                continue

            # 2. Filter by Platform
            if platform != "all" and item["platform"] != platform:
                continue

            # 3. Filter by Category
            if category != "all" and item.get("category", "").lower() != category.lower():
                continue

            # 4. Calculate Relevance Score
            score = self._compute_relevance(item, query_terms, query)
            
            # If query is provided, match score must be > 0 (unless empty query)
            if query_terms and score <= 0:
                continue

            item_copy = dict(item)
            item_copy["computed_score"] = score
            
            # Enrich with platform UI metadata
            meta = PLATFORM_METADATA.get(item["platform"], {})
            item_copy["platform_icon"] = meta.get("icon", "🎥")
            item_copy["badge_bg"] = meta.get("badge_bg", "rgba(255,255,255,0.1)")
            item_copy["badge_text"] = meta.get("badge_text", "#ffffff")

            results.append(item_copy)

        # Sort results
        if sort_by == "views":
            results.sort(key=lambda x: x.get("view_count_raw", 0), reverse=True)
        elif sort_by == "newest":
            results.sort(key=lambda x: x.get("publish_date", ""), reverse=True)
        else:
            # Default: relevance score
            results.sort(key=lambda x: (x.get("computed_score", 0), x.get("view_count_raw", 0)), reverse=True)

        # Count per platform and region for statistics
        stats = self._calculate_stats(results)

        return {
            "query": query,
            "total": len(results),
            "region_filter": region,
            "platform_filter": platform,
            "category_filter": category,
            "stats": stats,
            "results": results
        }

    def _compute_relevance(self, item: Dict[str, Any], terms: List[str], raw_query: str) -> int:
        if not terms:
            return 80 # Default score when browsing without specific keyword

        score = 0
        raw_q_lower = raw_query.lower()
        title_lower = item["title"].lower()
        desc_lower = item.get("description", "").lower()
        keywords_lower = [k.lower() for k in item.get("keywords", [])]

        # Exact title match
        if raw_q_lower in title_lower:
            score += 60

        # Term matches in title
        for term in terms:
            if term in title_lower:
                score += 30
            if any(term in k for k in keywords_lower):
                score += 25
            if term in desc_lower:
                score += 10

        return min(99, score)

    def _calculate_stats(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        china_count = sum(1 for r in results if r.get("region") == "china")
        int_count = sum(1 for r in results if r.get("region") == "international")
        
        platform_counts = {}
        for r in results:
            p = r.get("platform", "other")
            platform_counts[p] = platform_counts.get(p, 0) + 1

        return {
            "china_total": china_count,
            "international_total": int_count,
            "platforms": platform_counts
        }

    def get_supported_platforms(self) -> List[Dict[str, Any]]:
        return [
            {"id": p_id, **meta} for p_id, meta in PLATFORM_METADATA.items()
        ]
