/**
 * Main Application Frontend Logic
 */
document.addEventListener("DOMContentLoaded", () => {
    // --- State Management ---
    const state = {
        mode: "text",                // "text" | "image"
        query: "",
        selectedImageFile: null,
        region: "all",               // "all" | "china" | "international"
        platform: "all",
        category: "all",
        sortBy: "relevance",
        currentResults: [],
        bookmarks: JSON.parse(localStorage.getItem("video_bookmarks") || "[]")
    };

    // --- DOM Elements ---
    const tabText = document.getElementById("tab-text");
    const tabImage = document.getElementById("tab-image");
    const sectionText = document.getElementById("section-text-search");
    const sectionImage = document.getElementById("section-image-search");

    const inputTextQuery = document.getElementById("input-text-query");
    const btnSearchText = document.getElementById("btn-search-text");

    const dropZone = document.getElementById("drop-zone");
    const inputImageFile = document.getElementById("input-image-file");
    const dropZonePrompt = document.getElementById("drop-zone-prompt");
    const imagePreviewContainer = document.getElementById("image-preview-container");
    const imgPreview = document.getElementById("img-preview");
    const imgFileName = document.getElementById("img-file-name");
    const imgFileSize = document.getElementById("img-file-size");
    const aiDetectedCategory = document.getElementById("ai-detected-category");
    const btnChangeImage = document.getElementById("btn-change-image");
    const btnSearchImage = document.getElementById("btn-search-image");

    const filterRegionBtns = document.querySelectorAll(".filter-region-btn");
    const selectPlatform = document.getElementById("select-platform");
    const selectCategory = document.getElementById("select-category");
    const selectSort = document.getElementById("select-sort");

    const loadingState = document.getElementById("loading-state");
    const resultsGrid = document.getElementById("results-grid");
    const emptyState = document.getElementById("empty-state");
    const resultBadgeCount = document.getElementById("result-badge-count");
    const statsDistribution = document.getElementById("stats-distribution");

    // Modal elements
    const videoModal = document.getElementById("video-modal");
    const modalIframe = document.getElementById("modal-iframe");
    const modalPlatformBadge = document.getElementById("modal-platform-badge");
    const modalMatchScore = document.getElementById("modal-match-score");
    const modalVideoTitle = document.getElementById("modal-video-title");
    const modalVideoDesc = document.getElementById("modal-video-desc");
    const modalAuthorAvatar = document.getElementById("modal-author-avatar");
    const modalAuthorName = document.getElementById("modal-author-name");
    const modalViews = document.getElementById("modal-views");
    const modalDate = document.getElementById("modal-date");
    const modalBtnBookmark = document.getElementById("modal-btn-bookmark");
    const modalBtnSource = document.getElementById("modal-btn-source");
    const btnCloseModal = document.getElementById("btn-close-modal");

    // Bookmark Drawer elements
    const btnOpenBookmarks = document.getElementById("btn-open-bookmarks");
    const btnCloseBookmarks = document.getElementById("btn-close-bookmarks");
    const bookmarksDrawer = document.getElementById("bookmarks-drawer");
    const bookmarksList = document.getElementById("bookmarks-list");
    const bookmarkCount = document.getElementById("bookmark-count");
    const btnClearBookmarks = document.getElementById("btn-clear-bookmarks");
    const btnExportBookmarks = document.getElementById("btn-export-bookmarks");

    let currentActiveVideo = null;

    // --- Initialize ---
    init();

    function init() {
        setupEventListeners();
        updateBookmarkBadge();
        // Load initial search (browse all)
        performSearch();
    }

    function setupEventListeners() {
        // Tab switching
        tabText.addEventListener("click", () => setMode("text"));
        tabImage.addEventListener("click", () => setMode("image"));

        // Text search triggers
        btnSearchText.addEventListener("click", () => {
            state.query = inputTextQuery.value.trim();
            performSearch();
        });

        inputTextQuery.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                state.query = inputTextQuery.value.trim();
                performSearch();
            }
        });

        // Quick chip clicks
        document.querySelectorAll(".quick-chip").forEach(chip => {
            chip.addEventListener("click", () => {
                inputTextQuery.value = chip.textContent;
                state.query = chip.textContent;
                setMode("text");
                performSearch();
            });
        });

        // Image drag & drop setup
        dropZone.addEventListener("click", (e) => {
            if (e.target !== btnChangeImage && !btnChangeImage.contains(e.target)) {
                inputImageFile.click();
            }
        });

        dropZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropZone.classList.add("border-indigo-500", "bg-slate-900/80");
        });

        dropZone.addEventListener("dragleave", () => {
            dropZone.classList.remove("border-indigo-500", "bg-slate-900/80");
        });

        dropZone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropZone.classList.remove("border-indigo-500", "bg-slate-900/80");
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleImageFileSelect(e.dataTransfer.files[0]);
            }
        });

        inputImageFile.addEventListener("change", (e) => {
            if (e.target.files && e.target.files[0]) {
                handleImageFileSelect(e.target.files[0]);
            }
        });

        btnChangeImage.addEventListener("click", (e) => {
            e.stopPropagation();
            resetImageUpload();
            inputImageFile.click();
        });

        btnSearchImage.addEventListener("click", () => {
            if (state.selectedImageFile) {
                performSearch();
            }
        });

        // Region Filter Buttons
        filterRegionBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                filterRegionBtns.forEach(b => b.classList.remove("active", "text-slate-200"));
                filterRegionBtns.forEach(b => b.classList.add("text-slate-400"));
                btn.classList.add("active", "text-slate-200");
                state.region = btn.dataset.region;
                performSearch();
            });
        });

        // Select Filters
        selectPlatform.addEventListener("change", (e) => {
            state.platform = e.target.value;
            performSearch();
        });

        selectCategory.addEventListener("change", (e) => {
            state.category = e.target.value;
            performSearch();
        });

        selectSort.addEventListener("change", (e) => {
            state.sortBy = e.target.value;
            performSearch();
        });

        // Modal Controls
        btnCloseModal.addEventListener("click", closeModal);
        videoModal.addEventListener("click", (e) => {
            if (e.target === videoModal) closeModal();
        });

        modalBtnBookmark.addEventListener("click", () => {
            if (currentActiveVideo) {
                toggleBookmark(currentActiveVideo);
                updateModalBookmarkButtonStatus();
            }
        });

        // Bookmarks Drawer Controls
        btnOpenBookmarks.addEventListener("click", openBookmarksDrawer);
        btnCloseBookmarks.addEventListener("click", closeBookmarksDrawer);
        btnClearBookmarks.addEventListener("click", () => {
            if (confirm("ลบบุ๊กมาร์กวิดีโอทั้งหมดใช่หรือไม่?")) {
                state.bookmarks = [];
                saveBookmarks();
                renderBookmarksList();
            }
        });
        btnExportBookmarks.addEventListener("click", exportBookmarksJSON);
    }

    function setMode(mode) {
        state.mode = mode;
        if (mode === "text") {
            tabText.classList.add("active");
            tabText.classList.remove("text-slate-400");
            tabImage.classList.remove("active");
            tabImage.classList.add("text-slate-400");
            sectionText.classList.remove("hidden");
            sectionImage.classList.add("hidden");
        } else {
            tabImage.classList.add("active");
            tabImage.classList.remove("text-slate-400");
            tabText.classList.remove("active");
            tabText.classList.add("text-slate-400");
            sectionImage.classList.remove("hidden");
            sectionText.classList.add("hidden");
        }
    }

    function handleImageFileSelect(file) {
        if (!file.type.startsWith("image/")) {
            alert("โปรดเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP)");
            return;
        }

        state.selectedImageFile = file;
        imgFileName.textContent = file.name;
        imgFileSize.textContent = formatBytes(file.size);

        const reader = new FileReader();
        reader.onload = (e) => {
            imgPreview.src = e.target.result;
            dropZonePrompt.classList.add("hidden");
            imagePreviewContainer.classList.remove("hidden");
            btnSearchImage.removeAttribute("disabled");
            aiDetectedCategory.textContent = `รูปภาพพร้อมสำหรับการวิเคราะห์และค้นหาวิดีโอ (${file.name})`;
        };
        reader.readAsDataURL(file);
    }

    function resetImageUpload() {
        state.selectedImageFile = null;
        inputImageFile.value = "";
        dropZonePrompt.classList.remove("hidden");
        imagePreviewContainer.classList.add("hidden");
        btnSearchImage.setAttribute("disabled", "true");
    }

    async function performSearch() {
        showLoading(true);
        emptyState.classList.add("hidden");

        try {
            let res;
            if (state.mode === "image" && state.selectedImageFile) {
                res = await window.api.searchByImage(state.selectedImageFile, {
                    region: state.region,
                    platform: state.platform,
                    category: state.category,
                    sort_by: state.sortBy
                });
                
                // Update AI vision detection notice
                if (res.image_analysis && res.image_analysis.detection) {
                    const det = res.image_analysis.detection;
                    aiDetectedCategory.innerHTML = `<span class="font-bold">ตรวจพบ:</span> ${det.category} | <span class="font-bold">คำค้นหา:</span> "${det.primary_query}"`;
                }
                
                state.currentResults = res.search_results ? res.search_results.results : [];
                renderResults(res.search_results);
            } else {
                res = await window.api.searchByText({
                    query: state.query,
                    region: state.region,
                    platform: state.platform,
                    category: state.category,
                    sort_by: state.sortBy
                });
                state.currentResults = res.results || [];
                renderResults(res);
            }
        } catch (err) {
            console.error("Search error:", err);
            resultsGrid.innerHTML = `<div class="col-span-full p-6 text-center text-rose-400 bg-rose-950/20 border border-rose-800/40 rounded-xl">เกิดข้อผิดพลาดในการเชื่อมต่อค้นหา: ${err.message}</div>`;
        } finally {
            showLoading(false);
        }
    }

    function renderResults(resData) {
        resultsGrid.innerHTML = "";

        const results = resData.results || [];
        resultBadgeCount.textContent = `${results.length} รายการ`;

        // Render stats distribution
        if (resData.stats) {
            const stats = resData.stats;
            statsDistribution.innerHTML = `
                <span class="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                    🇨🇳 จีน: <strong class="text-indigo-400">${stats.china_total}</strong>
                </span>
                <span class="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                    🌐 ต่างประเทศ: <strong class="text-purple-400">${stats.international_total}</strong>
                </span>
            `;
        }

        if (results.length === 0) {
            emptyState.classList.remove("hidden");
            return;
        }

        // Render cards
        results.forEach(video => {
            const card = createVideoCard(video);
            resultsGrid.appendChild(card);
        });
    }

    function createVideoCard(video) {
        const div = document.createElement("div");
        div.className = "video-card rounded-2xl overflow-hidden flex flex-col group cursor-pointer";

        const badgeClass = getPlatformBadgeClass(video.platform);
        const regionIcon = video.region === "china" ? "🇨🇳" : "🌐";
        const isBookmarked = isVideoBookmarked(video.id);

        div.innerHTML = `
            <!-- Thumbnail container -->
            <div class="relative aspect-video bg-slate-950 overflow-hidden">
                <img src="${video.thumbnail_url}" alt="${video.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                <div class="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-80"></div>
                
                <!-- Platform badge top-left -->
                <div class="absolute top-2.5 left-2.5 flex items-center space-x-1.5">
                    <span class="px-2.5 py-1 rounded-lg text-xs font-bold ${badgeClass} shadow-md flex items-center gap-1">
                        <span>${video.platform_icon || '🎥'}</span>
                        <span>${video.platform_name}</span>
                    </span>
                    <span class="px-1.5 py-0.5 rounded bg-slate-900/80 text-[11px] text-slate-300 border border-slate-700/80 font-medium">
                        ${regionIcon}
                    </span>
                </div>

                <!-- Match Score top-right -->
                <div class="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-emerald-500/90 text-slate-950 font-bold text-xs shadow-md">
                    ${video.match_score || 95}% Match
                </div>

                <!-- Duration bottom-right -->
                <div class="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-slate-950/80 text-slate-200 text-xs font-medium border border-slate-800">
                    <i class="fa-regular fa-clock text-[10px] mr-1"></i>${video.duration || '00:00'}
                </div>
            </div>

            <!-- Card Body -->
            <div class="p-4 flex-grow flex flex-col justify-between space-y-3">
                <div class="space-y-1.5">
                    <h3 class="text-sm font-bold text-slate-100 line-clamp-2 leading-snug group-hover:text-indigo-300 transition-colors">
                        ${video.title}
                    </h3>
                    <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        ${video.description || ''}
                    </p>
                </div>

                <!-- Footer details & controls -->
                <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div class="flex items-center space-x-2">
                        <img src="${video.author_avatar}" alt="${video.author}" class="w-6 h-6 rounded-full border border-slate-700 object-cover">
                        <span class="text-slate-300 font-medium truncate max-w-[100px]">${video.author}</span>
                    </div>

                    <div class="flex items-center space-x-1.5">
                        <button class="btn-bookmark-card w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all ${isBookmarked ? 'text-amber-400' : ''}" title="บันทึกวิดีโอ">
                            <i class="fa-solid fa-bookmark text-xs"></i>
                        </button>
                        <button class="btn-preview-card px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] shadow-sm flex items-center space-x-1">
                            <i class="fa-solid fa-circle-play"></i>
                            <span>ดูรีวิว</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Card Click Handlers
        const btnBookmarkCard = div.querySelector(".btn-bookmark-card");
        btnBookmarkCard.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleBookmark(video);
            btnBookmarkCard.classList.toggle("text-amber-400");
        });

        div.addEventListener("click", () => {
            openVideoModal(video);
        });

        return div;
    }

    function openVideoModal(video) {
        currentActiveVideo = video;
        modalIframe.src = video.embed_url || "https://www.youtube.com/embed/dQw4w9WgXcQ";
        
        const badgeClass = getPlatformBadgeClass(video.platform);
        modalPlatformBadge.className = `px-2.5 py-1 rounded font-semibold text-xs flex items-center gap-1.5 ${badgeClass}`;
        modalPlatformBadge.innerHTML = `<span>${video.platform_icon || '🎥'}</span> <span>${video.platform_name}</span>`;

        modalMatchScore.textContent = `${video.match_score || 95}% Match`;
        modalVideoTitle.textContent = video.title;
        modalVideoDesc.textContent = video.description || "วิดีโอรีวิวสินค้าพร้อมรายละเอียดการใช้งาน";

        modalAuthorAvatar.src = video.author_avatar;
        modalAuthorName.textContent = video.author;
        modalViews.textContent = video.view_count || "0";
        modalDate.textContent = video.publish_date || "2026";

        modalBtnSource.href = video.source_url;

        updateModalBookmarkButtonStatus();

        videoModal.classList.remove("hidden");
    }

    function closeModal() {
        modalIframe.src = "";
        videoModal.classList.add("hidden");
        currentActiveVideo = null;
    }

    function updateModalBookmarkButtonStatus() {
        if (!currentActiveVideo) return;
        const isBm = isVideoBookmarked(currentActiveVideo.id);
        if (isBm) {
            modalBtnBookmark.classList.add("bg-amber-500/20", "border-amber-500/40", "text-amber-300");
            modalBtnBookmark.innerHTML = `<i class="fa-solid fa-bookmark text-amber-400"></i><span>บันทึกแล้ว</span>`;
        } else {
            modalBtnBookmark.classList.remove("bg-amber-500/20", "border-amber-500/40", "text-amber-300");
            modalBtnBookmark.innerHTML = `<i class="fa-solid fa-bookmark text-amber-400"></i><span>บันทึก</span>`;
        }
    }

    function getPlatformBadgeClass(platform) {
        switch (platform) {
            case "bilibili": return "badge-bilibili";
            case "douyin": return "badge-douyin";
            case "xiaohongshu": return "badge-xiaohongshu";
            case "kuaishou": return "badge-kuaishou";
            case "youtube": return "badge-youtube";
            case "tiktok": return "badge-tiktok";
            case "instagram": return "badge-instagram";
            default: return "bg-slate-800 text-slate-200 border border-slate-700";
        }
    }

    // --- Bookmarks Logic ---
    function toggleBookmark(video) {
        const idx = state.bookmarks.findIndex(b => b.id === video.id);
        if (idx >= 0) {
            state.bookmarks.splice(idx, 1);
        } else {
            state.bookmarks.push(video);
        }
        saveBookmarks();
    }

    function isVideoBookmarked(videoId) {
        return state.bookmarks.some(b => b.id === videoId);
    }

    function saveBookmarks() {
        localStorage.setItem("video_bookmarks", JSON.stringify(state.bookmarks));
        updateBookmarkBadge();
        if (!bookmarksDrawer.classList.contains("translate-x-full")) {
            renderBookmarksList();
        }
    }

    function updateBookmarkBadge() {
        bookmarkCount.textContent = state.bookmarks.length;
    }

    function openBookmarksDrawer() {
        renderBookmarksList();
        bookmarksDrawer.classList.remove("translate-x-full");
    }

    function closeBookmarksDrawer() {
        bookmarksDrawer.classList.add("translate-x-full");
    }

    function renderBookmarksList() {
        bookmarksList.innerHTML = "";
        if (state.bookmarks.length === 0) {
            bookmarksList.innerHTML = `<p class="text-xs text-slate-400 text-center py-10">ยังไม่มีวิดีโอที่บันทึกไว้</p>`;
            return;
        }

        state.bookmarks.forEach(video => {
            const item = document.createElement("div");
            item.className = "p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center space-x-3 text-xs";
            item.innerHTML = `
                <img src="${video.thumbnail_url}" alt="${video.title}" class="w-16 h-12 object-cover rounded-lg">
                <div class="flex-grow min-w-0">
                    <h4 class="font-bold text-slate-200 truncate">${video.title}</h4>
                    <p class="text-[11px] text-slate-400">${video.platform_name} • ${video.author}</p>
                </div>
                <button class="btn-remove-bm text-slate-500 hover:text-rose-400 p-1">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;

            item.querySelector(".btn-remove-bm").addEventListener("click", (e) => {
                e.stopPropagation();
                toggleBookmark(video);
            });

            item.addEventListener("click", () => {
                openVideoModal(video);
            });

            bookmarksList.appendChild(item);
        });
    }

    function exportBookmarksJSON() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.bookmarks, null, 2));
        const anchor = document.createElement("a");
        anchor.setAttribute("href", dataStr);
        anchor.setAttribute("download", `review_video_bookmarks_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    }

    function showLoading(isLoading) {
        if (isLoading) {
            loadingState.classList.remove("hidden");
            resultsGrid.classList.add("hidden");
        } else {
            loadingState.classList.add("hidden");
            resultsGrid.classList.remove("hidden");
        }
    }

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
});
