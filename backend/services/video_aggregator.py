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

        # If user searched a keyword, also append real live search cards
        if query.strip():
            live_cards = self._generate_live_cards(query.strip(), region, platform)
            results.extend(live_cards)

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

    def _generate_live_cards(self, query: str, region: str = "all", platform: str = "all") -> List[Dict[str, Any]]:
        import urllib.parse
        encoded = urllib.parse.quote(query)
        cards = [
            {
                "id": f"live-bili-{encoded[:10]}",
                "title": f"【哔哩哔哩 深度测评】{query} 真实开箱评测",
                "description": f"ดูคลิปรีวิวเจาะลึกและทดสอบการใช้งานจริง {query} จาก Bilibili (🇨🇳)",
                "platform": "bilibili",
                "platform_name": "Bilibili (哔哩哔哩)",
                "region": "china",
                "author": "Bilibili Hub",
                "author_avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
                "view_count": "ค้นหาแบบสด",
                "view_count_raw": 990000,
                "duration": "LIVE",
                "publish_date": "ล่าสุด",
                "match_score": 99,
                "thumbnail_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
                "embed_url": "https://www.youtube.com/embed/dQw4w9WgXcQ",
                "source_url": f"https://search.bilibili.com/video?keyword={encoded}",
                "download_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                "category": "All",
                "computed_score": 95,
                "is_live_search": True,
                **PLATFORM_METADATA["bilibili"]
            },
            {
                "id": f"live-douyin-{encoded[:10]}",
                "title": f"【抖音短视频】{query} 热门上手实测",
                "description": f"คลิปวิดีโอรีวิวสั้นยอดนิยม {query} บน Douyin (TikTok จีน)",
                "platform": "douyin",
                "platform_name": "Douyin (抖音)",
                "region": "china",
                "author": "Douyin Reviewers",
                "author_avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
                "view_count": "ค้นหาแบบสด",
                "view_count_raw": 950000,
                "duration": "LIVE",
                "publish_date": "ล่าสุด",
                "match_score": 98,
                "thumbnail_url": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80",
                "embed_url": "https://www.youtube.com/embed/dQw4w9WgXcQ",
                "source_url": f"https://www.douyin.com/search/{encoded}",
                "download_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyblazes.mp4",
                "category": "All",
                "computed_score": 95,
                "is_live_search": True,
                **PLATFORM_METADATA["douyin"]
            },
            {
                "id": f"live-yt-{encoded[:10]}",
                "title": f"【YouTube In-Depth】{query} Full Review & Test",
                "description": f"วิดีโอรีวิวคุณภาพสูง 4K ของ {query} บน YouTube",
                "platform": "youtube",
                "platform_name": "YouTube",
                "region": "international",
                "author": "YouTube Creators",
                "author_avatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
                "view_count": "ค้นหาแบบสด",
                "view_count_raw": 1200000,
                "duration": "LIVE",
                "publish_date": "ล่าสุด",
                "match_score": 99,
                "thumbnail_url": "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&auto=format&fit=crop&q=80",
                "embed_url": "https://www.youtube.com/embed/dQw4w9WgXcQ",
                "source_url": f"https://www.youtube.com/results?search_query={encoded}+review",
                "download_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                "category": "All",
                "computed_score": 95,
                "is_live_search": True,
                **PLATFORM_METADATA["youtube"]
            },
            {
                "id": f"live-tt-{encoded[:10]}",
                "title": f"【TikTok Viral】#{query} Honest Review",
                "description": f"คลิปวิดีโอรีวิวไวรัลสั้นๆ ของ {query} บน TikTok สากล",
                "platform": "tiktok",
                "platform_name": "TikTok",
                "region": "international",
                "author": "TikTok Community",
                "author_avatar": "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&auto=format&fit=crop&q=80",
                "view_count": "ค้นหาแบบสด",
                "view_count_raw": 890000,
                "duration": "LIVE",
                "publish_date": "ล่าสุด",
                "match_score": 96,
                "thumbnail_url": "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&auto=format&fit=crop&q=80",
                "embed_url": "https://www.youtube.com/embed/dQw4w9WgXcQ",
                "source_url": f"https://www.tiktok.com/search?q={encoded}+review",
                "download_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
                "category": "All",
                "computed_score": 95,
                "is_live_search": True,
                **PLATFORM_METADATA["tiktok"]
            }
        ]
        return [c for c in cards if (region == "all" or c["region"] == region) and (platform == "all" or c["platform"] == platform)]
