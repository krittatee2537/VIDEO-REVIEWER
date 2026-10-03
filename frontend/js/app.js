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
    const modalBtnDownload = document.getElementById("modal-btn-download");
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

    // Google Sheets Modal elements
    const btnOpenSheetsModal = document.getElementById("btn-open-sheets-modal");
    const btnCloseSheetsModal = document.getElementById("btn-close-sheets-modal");
    const sheetsModal = document.getElementById("sheets-modal");
    const inputSheetId = document.getElementById("input-sheet-id");
    const btnSyncSheets = document.getElementById("btn-sync-sheets");
    const btnResetSheets = document.getElementById("btn-reset-sheets");
    const btnDownloadCsvTemplate = document.getElementById("btn-download-csv-template");
    const sheetsStatusDot = document.getElementById("sheets-status-dot");
    const sheetsStatusText = document.getElementById("sheets-status-text");
    const sheetsRowCountBadge = document.getElementById("sheets-row-count-badge");

    let currentActiveVideo = null;

    // --- Initialize ---
    init();

    async function init() {
        setupEventListeners();
        updateBookmarkBadge();

        // Check if user has saved a Google Sheet ID
        if (window.GoogleSheetsDB && window.GoogleSheetsDB.getSheetId()) {
            updateSheetsStatusUI("loading");
            const res = await window.GoogleSheetsDB.syncData();
            updateSheetsStatusUI(res.mode, res.count);
        } else {
            updateSheetsStatusUI("fallback");
        }

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

        // Modal MP4 Download Button
        if (modalBtnDownload) {
            modalBtnDownload.addEventListener("click", () => {
                if (currentActiveVideo) {
                    downloadVideoAsMP4(currentActiveVideo);
                }
            });
        }

        // Google Sheets Modal Controls
        if (btnOpenSheetsModal) {
            btnOpenSheetsModal.addEventListener("click", () => {
                if (inputSheetId && window.GoogleSheetsDB) {
                    inputSheetId.value = window.GoogleSheetsDB.getSheetId();
                }
                sheetsModal.classList.remove("hidden");
            });
        }

        if (btnCloseSheetsModal) {
            btnCloseSheetsModal.addEventListener("click", () => {
                sheetsModal.classList.add("hidden");
            });
        }

        if (sheetsModal) {
            sheetsModal.addEventListener("click", (e) => {
                if (e.target === sheetsModal) sheetsModal.classList.add("hidden");
            });
        }

        if (btnSyncSheets) {
            btnSyncSheets.addEventListener("click", async () => {
                const sheetVal = inputSheetId.value.trim();
                window.GoogleSheetsDB.setSheetId(sheetVal);
                updateSheetsStatusUI("loading");
                showToast("🔄 กำลังเชื่อมต่อและดึงข้อมูลจาก Google Sheets...", "info");

                const res = await window.GoogleSheetsDB.syncData();
                if (res.success && res.mode === "google_sheets") {
                    updateSheetsStatusUI("connected", res.count);
                    showToast(`✅ เชื่อมต่อ Google Sheets สำเร็จ! โหลดวิดีโอได้ ${res.count} รายการ`, "success");
                    performSearch();
                    setTimeout(() => sheetsModal.classList.add("hidden"), 1000);
                } else if (!sheetVal) {
                    updateSheetsStatusUI("fallback");
                    showToast("ℹ️ สลับมาใช้ฐานข้อมูลเริ่มต้นของระบบ", "info");
                    performSearch();
                } else {
                    updateSheetsStatusUI("error");
                    showToast(`❌ เชื่อมต่อล้มเหลว: ${res.error || 'โปรดตรวจสิทธิ์การแชร์'}`, "error");
                }
            });
        }

        if (btnResetSheets) {
            btnResetSheets.addEventListener("click", async () => {
                window.GoogleSheetsDB.setSheetId("");
                if (inputSheetId) inputSheetId.value = "";
                await window.GoogleSheetsDB.syncData("");
                updateSheetsStatusUI("fallback");
                showToast("ℹ️ รีเซ็ตกลับไปใช้ฐานข้อมูลระบบแล้ว", "info");
                performSearch();
            });
        }

        if (btnDownloadCsvTemplate) {
            btnDownloadCsvTemplate.addEventListener("click", () => {
                downloadCSVTemplate();
            });
        }

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
                        <button class="btn-download-card w-7 h-7 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-400 flex items-center justify-center transition-all shadow-sm" title="ดาวน์โหลดไฟล์ MP4">
                            <i class="fa-solid fa-circle-down text-xs"></i>
                        </button>
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
        const btnDownloadCard = div.querySelector(".btn-download-card");
        btnDownloadCard.addEventListener("click", (e) => {
            e.stopPropagation();
            downloadVideoAsMP4(video);
        });

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

    // --- MP4 Video Download Function ---
    async function downloadVideoAsMP4(video) {
        if (!video) return;
        const cleanTitle = (video.title || "video").replace(/[\\\/?:*"<>|]/g, "_").trim().slice(0, 50);
        const filename = `${cleanTitle}.mp4`;
        const downloadUrl = video.download_url;

        if (!downloadUrl) {
            showToast(`⚠️ ไม่มีลิงก์ไฟล์ MP4 โดยตรง กำลังเปิดหน้าต้นทาง: ${video.platform_name}`, "warning");
            if (video.source_url && video.source_url !== "#") {
                window.open(video.source_url, "_blank");
            }
            return;
        }

        showToast(`⏳ เริ่มเตรียมดาวน์โหลด: ${filename}`, "info");

        try {
            // Attempt direct fetch as blob for seamless download with target filename
            const response = await fetch(downloadUrl);
            if (!response.ok) throw new Error("Direct blob fetch failed");
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.style.display = "none";
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
            }, 2000);

            showToast(`✅ ดาวน์โหลดเสร็จสิ้น: ${filename}`, "success");
        } catch (err) {
            console.warn("Direct blob download failed, falling back to anchor trigger:", err);
            // Fallback: direct anchor download trigger
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = downloadUrl;
            a.download = filename;
            a.target = "_blank";
            document.body.appendChild(a);
            a.click();
            setTimeout(() => document.body.removeChild(a), 1500);

            showToast(`🚀 เริ่มการดาวน์โหลดผ่านลิงก์ตรง: ${filename}`, "info");
        }
    }

    // --- Google Sheets UI Status Helper ---
    function updateSheetsStatusUI(status, count = 0) {
        if (!sheetsStatusDot || !sheetsStatusText) return;

        const currentCount = count || (window.SEED_VIDEOS ? window.SEED_VIDEOS.length : 12);
        if (sheetsRowCountBadge) {
            sheetsRowCountBadge.textContent = `${currentCount} คลิป`;
        }

        if (status === "connected" || status === "google_sheets") {
            sheetsStatusDot.className = "w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse";
            sheetsStatusText.innerHTML = `<span class="text-emerald-400 font-bold">เชื่อมต่อ Google Sheets แล้ว (${currentCount} คลิป)</span>`;
            if (btnOpenSheetsModal) {
                btnOpenSheetsModal.classList.add("border-emerald-500/60");
            }
        } else if (status === "loading") {
            sheetsStatusDot.className = "w-2 h-2 rounded-full bg-amber-400 animate-ping";
            sheetsStatusText.innerHTML = `<span class="text-amber-300">กำลังดึงข้อมูลจาก Google Sheets...</span>`;
        } else if (status === "error") {
            sheetsStatusDot.className = "w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500";
            sheetsStatusText.innerHTML = `<span class="text-rose-400">เชื่อมต่อไม่สำเร็จ (สลับใช้ข้อมูลเริ่มต้น)</span>`;
        } else {
            // fallback / default
            sheetsStatusDot.className = "w-2 h-2 rounded-full bg-slate-500";
            sheetsStatusText.innerHTML = `<span class="text-slate-300">ข้อมูลเริ่มต้นของระบบ (Default)</span>`;
        }
    }

    // --- CSV Template Exporter ---
    function downloadCSVTemplate() {
        if (!window.GoogleSheetsDB) return;
        const csvContent = window.GoogleSheetsDB.generateCSVTemplate();
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ReviewSearch_GoogleSheets_Template.csv";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 1500);
        showToast("📄 ดาวน์โหลดแม่แบบ CSV สำหรับ Google Sheets แล้ว!", "success");
    }

    // --- Toast Notifications ---
    function showToast(message, type = "info") {
        const container = document.getElementById("toast-container");
        if (!container) return;

        const toast = document.createElement("div");
        let bg = "bg-slate-900 border-slate-700 text-slate-100";
        if (type === "success") bg = "bg-emerald-950/95 border-emerald-500/50 text-emerald-200 shadow-emerald-950/50";
        if (type === "warning") bg = "bg-amber-950/95 border-amber-500/50 text-amber-200 shadow-amber-950/50";
        if (type === "error") bg = "bg-rose-950/95 border-rose-500/50 text-rose-200 shadow-rose-950/50";

        toast.className = `p-3.5 rounded-xl border shadow-2xl flex items-center space-x-2.5 text-xs pointer-events-auto transition-all transform translate-y-2 opacity-0 duration-200 ${bg}`;
        toast.innerHTML = `
            <span class="flex-grow font-medium">${message}</span>
            <button class="text-slate-400 hover:text-white p-0.5"><i class="fa-solid fa-xmark"></i></button>
        `;

        toast.querySelector("button").addEventListener("click", () => {
            toast.remove();
        });

        container.appendChild(toast);
        requestAnimationFrame(() => {
            toast.classList.remove("translate-y-2", "opacity-0");
        });

        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.add("opacity-0", "translate-y-2");
                setTimeout(() => toast.remove(), 300);
            }
        }, 4500);
    }
});
