// 搜索功能实现
class LyricSearch {
    constructor() {
        this.searchInput = document.getElementById('searchInput');
        this.searchResults = document.getElementById('searchResults');
        this.songs = [];
        this.fuse = null;
        this.loadingIndicator = null;

        debug('搜索功能初始化');
        this.createLoadingIndicator();
        this.init();
    }

    createLoadingIndicator() {
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.className = 'loading-indicator';
        this.loadingIndicator.innerHTML = `
            <div class="flex items-center justify-center p-4">
                <svg class="animate-spin h-5 w-5 text-gray-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="text-gray-600">正在加载歌曲列表...</span>
            </div>
        `;
        this.searchResults.appendChild(this.loadingIndicator);
    }

    async init() {
        try {
            debug('开始加载统一元数据');
            const songsResponse = await fetch('/config/songs.json');
            const songsData = await songsResponse.json();
            this.songs = songsData;

            // 初始化 Fuse.js
            this.fuse = new Fuse(this.songs, {
                keys: [
                    'name',
                    'artist',
                    'nameReading',
                    'artistReading',
                    'album',
                    'genre',
                    'tags',
                    'lyricist',
                    'composer',
                    'description'
                ],
                threshold: 0.3,
                includeScore: true
            });
            debug('Fuse.js 初始化完成');

            // 异步验证每个歌曲的元数据
            await this.validateMetadata();

            // 移除加载指示器
            this.loadingIndicator.remove();
            this.setupEventListeners();
        } catch (error) {
            debug(`加载歌曲数据失败: ${error.message}`);
            console.error('Failed to load songs:', error);
            this.loadingIndicator.innerHTML = `
                <div class="text-red-500 p-4 text-center">
                    加载失败：${error.message}
                </div>
            `;
        }
    }

    async validateMetadata() {
        const existingSongs = new Set();

        // 先遍历songs文件夹，收集所有存在的歌曲ID
        const songsResponse = await fetch('/config/songs.json');
        const songsData = await songsResponse.json();
        for (const song of songsData) {
            existingSongs.add(song.id);
        }

        // 验证元数据
        for (const song of this.songs) {
            try {
                const metadataResponse = await fetch(`songs/${song.id}/metadata.json`);
                const metadata = await metadataResponse.json();

                // 验证元数据
                if (metadata.name !== song.name) {
                    debug(`元数据不符，更新歌曲 ${song.id} 的名称`);
                    song.name = metadata.name;
                }
                if (metadata.artist !== song.artist) {
                    debug(`元数据不符，更新歌曲 ${song.id} 的艺术家`);
                    song.artist = metadata.artist;
                }
                if (metadata.album !== song.album) {
                    debug(`元数据不符，更新歌曲 ${song.id} 的专辑`);
                    song.album = metadata.album;
                }
                if (metadata.release_date !== song.release_date) {
                    debug(`元数据不符，更新歌曲 ${song.id} 的发行日期`);
                    song.release_date = metadata.release_date;
                }
                if (metadata.duration !== song.duration) {
                    debug(`元数据不符，更新歌曲 ${song.id} 的时长`);
                    song.duration = metadata.duration;
                }
                // 继续验证其他字段...
            } catch (error) {
                debug(`无法加载歌曲 ${song.id} 的元数据: ${error.message}`);
            }
        }

        // 检查文件夹中的歌曲是否在统一元数据中
        const folderSongs = await this.getFolderSongs();
        for (const folderSong of folderSongs) {
            if (!existingSongs.has(folderSong.id)) {
                debug(`发现新歌曲 ${folderSong.id}，将其添加到统一元数据中`);
                this.songs.push(folderSong);
            }
        }

        debug('元数据核对完成');
    }

    async getFolderSongs() {
        const folderSongs = [];
        let id = 1;
    
        while (true) {
            try {
                const metadataResponse = await fetch(`songs/${id}/metadata.json`);
                if (!metadataResponse.ok) {
                    // 如果返回状态不是200，说明文件夹不存在，停止检查
                    break;
                }
                const metadata = await metadataResponse.json();
                // 添加id字段
                metadata.id = id;
                folderSongs.push(metadata);
                id++; // 递增ID
            } catch (error) {
                debug(`无法加载歌曲 ${id} 的元数据: ${error.message}`);
                break; // 如果发生错误，停止检查
            }
        }
        return folderSongs;
    }

    setupEventListeners() {
        debug('设置事件监听器');
        this.searchInput.addEventListener('input', () => {
            this.handleSearch();
        });
    }

    handleSearch() {
        const query = this.searchInput.value.trim();
        debug(`处理搜索查询: "${query}"`);
        
        if (!query) {
            this.searchResults.innerHTML = '';
            return;
        }

        if (!this.fuse) {
            debug('Fuse.js 未初始化');
            return;
        }

        const results = this.fuse.search(query);
        debug(`找到 ${results.length} 个匹配结果`);
        this.displayResults(results);
    }

    displayResults(results) {
        this.searchResults.innerHTML = '';
        
        if (results.length === 0) {
            const div = document.createElement('div');
            div.className = 'search-result';
            div.textContent = '未找到匹配的歌曲';
            this.searchResults.appendChild(div);
            return;
        }
        
        results.slice(0, 10).forEach(result => {
            const song = result.item;
            const div = document.createElement('div');
            div.className = 'search-result';

            let html = `
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="song-title">${song.name}</div>
                        <div class="song-artist">${song.artist}</div>
                    </div>
                    ${song.duration ? `<div class="text-sm text-gray-500">${song.duration}</div>` : ''}
                </div>`;

            // 制作人员信息
            const credits = [];
            if (song.lyricist) credits.push(`作词：${song.lyricist}`);
            if (song.composer) credits.push(`作曲：${song.composer}`);
            if (song.arranger) credits.push(`编曲：${song.arranger}`);
            
            if (credits.length > 0) {
                html += `<div class="metadata-row">${credits.join(' · ')}</div>`;
            }

            // 专辑和其他元数据
            const meta = [];
            if (song.album) meta.push(song.album);
            if (song.release_date) meta.push(song.release_date);
            if (song.label) meta.push(song.label);
            if (song.genre) meta.push(song.genre.join('/'));
            
            if (meta.length > 0) {
                html += `<div class="metadata-row">${meta.join(' · ')}</div>`;
            }

            // 标签
            if (song.tags && song.tags.length > 0) {
                html += `<div class="flex flex-wrap gap-2 mt-2">
                    ${song.tags.map(tag => 
                        `<span class="tag">#${tag}</span>`
                    ).join('')}
                </div>`;
            }

            // 描述
            if (song.description) {
                html += `<div class="description">${song.description}</div>`;
            }

            div.innerHTML = html;
            div.addEventListener('click', () => {
                window.location.href = `song-page.html?id=${song.id}`;
            });
            
            this.searchResults.appendChild(div);
        });
    }
}

// 初始化搜索功能
document.addEventListener('DOMContentLoaded', () => {
    debug('页面加载完成，初始化搜索功能');
    new LyricSearch();
}); 