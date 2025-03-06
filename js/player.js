class LyricPlayer {
    constructor() {
        this.lyrics = [];
        this.currentIndex = -1;
        this.isPlaying = false;
        this.startTime = 0;
        this.animationFrame = null;
        this.currentLayout = 'center-align';
        this.layouts = ['center-align', 'sides-align', 'center-each', 'left-right', 'right-left'];
        this.charEffects = new Map(); // 存储字符特效配置
        this.charTimings = new Map(); // 存储字符时间配置

        // DOM元素
        this.lyricsContent = document.getElementById('lyricsContent');
        this.toggleTranslationBtn = document.getElementById('toggleTranslation');
        this.toggleFuriganaBtn = document.getElementById('toggleFurigana');
        this.togglePlayBtn = document.getElementById('togglePlay');
        this.restartBtn = document.getElementById('restart');
        this.toggleLayoutBtn = document.getElementById('toggleLayout');

        this.init();
    }

    async init() {
        // 获取歌曲ID
        const urlParams = new URLSearchParams(window.location.search);
        const songId = urlParams.get('id');

        if (!songId) {
            console.error('No song ID provided');
            return;
        }

        try {
            // 加载歌曲配置
            const configResponse = await fetch(`/lyric-site/songs/${songId}/config.json`);
            const config = await configResponse.json();

            // 加载元数据
            const metadataResponse = await fetch(`/lyric-site/songs/${songId}/metadata.json`);
            const metadata = await metadataResponse.json();

            // 设置页面标题和歌手信息
            document.getElementById('songTitle').textContent = metadata.name;
            document.getElementById('songArtist').textContent = metadata.artist;

            // 显示元数据
            this.displayMetadata(metadata);

            // 应用样式配置
            this.applyStyles(config);

            // 加载歌词
            this.lyrics = await window.lyricParser.parse(`/lyric-site/songs/${songId}/lyrics.${config.lyrics_format}`);

            // 检查是否有注音内容
            const hasFurigana = this.lyrics.some(lyric => lyric.furigana);
            
            // 根据语言和是否有注音来显示/隐藏假名按钮
            if (metadata.language === 'jp' && hasFurigana) {
                this.toggleFuriganaBtn.classList.remove('hidden');
            } else {
                this.toggleFuriganaBtn.classList.add('hidden');
            }

            // 如果有时间轴，显示播放按钮和重播按钮
            if (this.lyrics.some(lyric => lyric.time !== undefined)) {
                this.togglePlayBtn.classList.remove('hidden');
                this.restartBtn.classList.remove('hidden');
            }

            // 加载翻译（如果存在）
            try {
                const translationResponse = await fetch(`/lyric-site/songs/${songId}/translations/zh-CN.json`);
                const translations = await translationResponse.json();
                this.lyrics.forEach((lyric, index) => {
                    lyric.translation = translations[index];
                });
            } catch (error) {
                console.log('No translation available');
            }

            this.setupEventListeners();
            this.render();
        } catch (error) {
            console.error('Failed to initialize player:', error);
        }
    }

    setupEventListeners() {
        // 翻译开关
        this.toggleTranslationBtn.addEventListener('click', () => {
            document.body.classList.toggle('hide-translation');
            const isHidden = document.body.classList.contains('hide-translation');
            this.toggleTranslationBtn.textContent = isHidden ? '开启翻译' : '关闭翻译';
        });

        // 假名开关
        this.toggleFuriganaBtn?.addEventListener('click', () => {
            const isActive = document.body.classList.toggle('hide-furigana');
            this.toggleFuriganaBtn.textContent = isActive ? '开启假名注音' : '关闭假名注音';
        });

        // 播放开关
        this.togglePlayBtn?.addEventListener('click', () => {
            if (this.isPlaying) {
                this.pause();
            } else {
                this.play();
            }
        });

        // 重播按钮
        this.restartBtn?.addEventListener('click', () => {
            this.restart();
        });

        // 布局切换
        this.toggleLayoutBtn?.addEventListener('click', () => {
            const currentIndex = this.layouts.indexOf(this.currentLayout);
            const nextIndex = (currentIndex + 1) % this.layouts.length;
            this.setLayout(this.layouts[nextIndex]);
        });
    }

    setLayout(layout) {
        // 移除旧布局类
        this.lyricsContent.classList.remove(`layout-${this.currentLayout}`);
        // 添加新布局类
        this.lyricsContent.classList.add(`layout-${layout}`);
        this.currentLayout = layout;

        // 更新SVG图标
        document.querySelector('.current-layout')?.classList.add('hidden');
        document.querySelector('.current-layout')?.classList.remove('current-layout');
        const nextIcon = document.querySelector(`#layout-${layout}`);
        nextIcon?.classList.remove('hidden');
        nextIcon?.classList.add('current-layout');
    }

    applyStyles(config) {
        const root = document.documentElement;

        // 处理统一样式配置
        if (config.style) {
            const { fonts, colors, effects } = config.style;
            this.applyFontStyles(root, fonts);
            this.applyColorStyles(root, colors);
            if (effects) this.applyEffects(effects);
            return;
        }

        // 处理按行设置样式
        if (config.lines) {
            config.lines.forEach((line, index) => {
                const lineElement = this.lyricsContent.querySelector(`[data-line-index="${index}"]`);
                if (lineElement) {
                    if (line.style) {
                        this.applyLineStyles(lineElement, line.style);
                    }
                    if (line.chars) {
                        this.applyCharStyles(lineElement, line.chars);
                    }
                }
            });
        }
    }

    applyFontStyles(root, fonts) {
        // // 应用字体大小
        // if (sizes) {
        //     root.style.setProperty('--font-size-lyrics', sizes.lyrics);
        //     root.style.setProperty('--font-size-translation', sizes.translation);
        //     root.style.setProperty('--font-size-furigana', sizes.furigana);
        // }
        if (fonts) {
            root.style.setProperty('--font-lyrics', fonts.lyrics || fonts.default);
            root.style.setProperty('--font-translation', fonts.translation || fonts.default);
            root.style.setProperty('--font-furigana', fonts.furigana || fonts.default);
        }
    }

    applyColorStyles(root, colors) {
        if (colors) {
            root.style.setProperty('--text-color', colors.base);
            root.style.setProperty('--active-color', colors.active);
            root.style.setProperty('--highlight-color', colors.highlight);
            root.style.setProperty('--translation-color', colors.translation);
        }
    }

    applyLineStyles(lineElement, style) {
        // 应用行样式
        if (style.fonts) {
            lineElement.style.fontFamily = style.fonts.lyrics || 'inherit';
        }
        if (style.colors) {
            lineElement.style.color = style.colors.base || 'inherit';
        }
        if (style.effects) {
            this.applyEffects(style.effects);
        }
    }

    applyCharStyles(lineElement, chars) {
        chars.forEach((char, charIndex) => {
            const charElement = lineElement.querySelector(`[data-char-index="${charIndex}"]`);
            if (charElement) {
                if (char.style) {
                    charElement.style.color = char.style.color || 'inherit';
                    charElement.style.fontFamily = char.style.font || 'inherit';
                }
                if (char.effects) {
                    this.applyEffects(char.effects);
                }
            }
        });
    }

    applyEffects(effects) {
        if (effects.charByChar) {
            this.enableCharByCharEffect();
        }
        
        // 应用字符级别的特效配置
        if (effects.charEffects) {
            this.charEffects = new Map(Object.entries(effects.charEffects));
        }
        
        // 应用字符级别的时间配置
        if (effects.charTimings) {
            this.charTimings = new Map(Object.entries(effects.charTimings));
        }
    }

    enableCharByCharEffect() {
        this.lyricsContent.querySelectorAll('.lyric-text').forEach((textElement, lineIndex) => {
            const text = textElement.textContent;
            let html = '';
            
            // 遍历每个字符
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const charKey = `${lineIndex}-${i}`;
                const effect = this.charEffects.get(charKey);
                const timing = this.charTimings.get(charKey);
                
                // 构建字符的 class
                let classes = ['char'];
                if (effect) {
                    classes.push('char-custom');
                    if (effect.hasEffect) {
                        classes.push('char-effect');
                    }
                }
                
                // 构建字符的样式
                let style = '';
                if (effect) {
                    const colors = [
                        `--custom-normal-color: ${effect.normalColor || 'inherit'}`,
                        `--custom-active-color: ${effect.activeColor || 'var(--active-color)'}`,
                        `--custom-effect-color-1: ${effect.effectColors?.[0] || 'var(--effect-color-1)'}`,
                        `--custom-effect-color-2: ${effect.effectColors?.[1] || 'var(--effect-color-2)'}`,
                        `--custom-effect-color-3: ${effect.effectColors?.[2] || 'var(--effect-color-3)'}`
                    ].join(';');
                    style = `style="${colors}"`;
                }
                
                // 构建字符的 HTML
                html += `<span class="${classes.join(' ')}" data-timing="${timing?.time || ''}" ${style}>${char}</span>`;
            }
            
            textElement.innerHTML = html;
        });
    }

    render() {
        // 清空现有内容
        this.lyricsContent.innerHTML = '';

        // 渲染歌词
        this.lyrics.forEach((lyric, index) => {
            // 创建歌词行容器
            const lineContainer = document.createElement('div');
            lineContainer.className = 'lyric-line';
            lineContainer.dataset.index = index;

            // 原文容器
            const originalContainer = document.createElement('div');
            originalContainer.className = 'original-text';
            const originalLine = this.addFurigana(lyric.text, lyric.furigana);
            originalContainer.appendChild(originalLine);
            lineContainer.appendChild(originalContainer);

            // 翻译
            if (lyric.translation) {
                const translatedLine = document.createElement('div');
                translatedLine.className = 'translation';
                translatedLine.textContent = lyric.translation;
                lineContainer.appendChild(translatedLine);
            }

            this.lyricsContent.appendChild(lineContainer);
        });
    }

    addFurigana(text, furiganaMap) {
        // 创建文本容器
        const container = document.createElement('div');
        container.className = 'lyric-text';
        container.setAttribute('lang', 'ja');

        if (!furiganaMap) {
            // 对于没有注音的歌词，直接显示文本
            container.textContent = text;
            return container;
        }

        const chars = text.split('');
        const segments = [];
        let i = 0;
        let currentKana = '';

        // 分析文本，将其分为汉字（带注音）和假名两种段落
        while (i < chars.length) {
            if (furiganaMap[i]) {
                // 如果之前有假名积累，先添加到段落中
                if (currentKana) {
                    segments.push({
                        type: 'kana',
                        text: currentKana,
                        reading: ''
                    });
                    currentKana = '';
                }

                const currentKanji = furiganaMap[i].kanji;
                const currentReading = furiganaMap[i].reading;

                // 检查是否是多字词组
                if (currentKanji.length > 1) {
                    const wordLength = currentKanji.length;
                    const textSlice = chars.slice(i, i + wordLength).join('');
                    if (textSlice === currentKanji) {
                        segments.push({
                            type: 'kanji',
                            text: textSlice,
                            reading: currentReading
                        });
                        i += wordLength;
                        continue;
                    }
                }

                // 单字注音
                if (chars[i] === currentKanji) {
                    segments.push({
                        type: 'kanji',
                        text: chars[i],
                        reading: currentReading
                    });
                } else {
                    currentKana += chars[i];
                }
            } else {
                currentKana += chars[i];
            }
            i++;
        }

        // 添加最后剩余的假名
        if (currentKana) {
            segments.push({
                type: 'kana',
                text: currentKana,
                reading: ''
            });
        }

        // 创建歌词内容
        segments.forEach(segment => {
            if (segment.type === 'kanji') {
                const ruby = document.createElement('ruby');
                const rb = document.createElement('rb');
                rb.textContent = segment.text;
                ruby.appendChild(rb);

                if (segment.reading) {
                    const rt = document.createElement('rt');
                    rt.textContent = segment.reading;
                    ruby.appendChild(rt);
                }

                container.appendChild(ruby);
            } else {
                const text = document.createTextNode(segment.text);
                container.appendChild(text);
            }
        });

        return container;
    }

    restart() {
        // 在重置前记录当前的播放状态
        const wasPlaying = this.isPlaying || !this.togglePlayBtn.textContent.includes('播放');
        
        // 如果正在播放，先停止当前播放
        if (this.isPlaying) {
            this.pause();
        }
        
        // 重置所有状态
        this.resetState();
        
        // 如果之前是播放状态，从头开始播放
        if (wasPlaying) {
            this.play();
        }
    }

    resetState() {
        // 取消任何正在进行的动画
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        // 重置播放状态
        this.currentIndex = -1;
        this.startTime = 0;
        this.isPlaying = false;

        // 重置所有歌词行的样式
        const allLines = this.lyricsContent.querySelectorAll('.lyric-line');
        allLines.forEach(line => {
            line.classList.remove('lyric-line--active');
        });

        // 重置播放按钮文本
        this.togglePlayBtn.textContent = '播放';
    }

    play() {
        this.isPlaying = true;
        this.togglePlayBtn.textContent = '暂停';
        this.startTime = Date.now() - (this.currentIndex >= 0 ? this.lyrics[this.currentIndex].time : 0);
        this.animate();
    }

    pause() {
        this.isPlaying = false;
        this.togglePlayBtn.textContent = '播放';
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }

    animate() {
        const currentTime = Date.now() - this.startTime;
        
        // 更新行级别的高亮
        const newIndex = this.lyrics.findIndex((lyric, index) => {
            const nextLyric = this.lyrics[index + 1];
        // const currentTime = this.getCurrentTime();
        // const newIndex = this.lyrics.findIndex(lyric => {
        //     const nextLyric = this.lyrics[this.currentIndex + 1];
            return lyric.time <= currentTime && (!nextLyric || nextLyric.time > currentTime);
        });

        if (newIndex !== this.currentIndex) {
            if (this.currentIndex >= 0) {
                const oldLine = this.lyricsContent.querySelector(`[data-index="${this.currentIndex}"]`);
                oldLine?.classList.remove('lyric-line--active');
            }

            if (newIndex >= 0) {
                const newLine = this.lyricsContent.querySelector(`[data-index="${newIndex}"]`);
                newLine?.classList.add('lyric-line--active');
                newLine?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            this.currentIndex = newIndex;
        }

        // 更新字符级别的高亮
        if (this.currentIndex >= 0) {
            const currentLine = this.lyricsContent.querySelector(`[data-index="${this.currentIndex}"]`);
            const chars = currentLine?.querySelectorAll('.char[data-timing]');

            chars?.forEach(char => {
                const timing = parseInt(char.dataset.timing);
                if (timing && currentTime >= timing) {
                    char.classList.add('char--active');
                } else {
                    char.classList.remove('char--active');
                }
            });
        }

        if (this.isPlaying) {
            this.animationFrame = requestAnimationFrame(() => this.animate());
        }
    }

    // 添加显示元数据的方法
    displayMetadata(metadata) {
        if (!metadata) return;

        // 专辑信息
        const albumInfo = document.getElementById('albumInfo');
        if (metadata.album) {
            albumInfo.classList.remove('hidden');
            albumInfo.querySelector('.metadata-album').textContent = metadata.album;
        }

        // 发行日期
        const releaseInfo = document.getElementById('releaseInfo');
        if (metadata.release_date) {
            releaseInfo.classList.remove('hidden');
            releaseInfo.querySelector('.metadata-release-date').textContent = metadata.release_date;
        }

        // 时长
        const durationInfo = document.getElementById('durationInfo');
        if (metadata.duration) {
            durationInfo.classList.remove('hidden');
            durationInfo.querySelector('.metadata-duration').textContent = metadata.duration;
        }

        // 制作人员信息
        const creditsInfo = document.getElementById('creditsInfo');
        const lyricistDiv = creditsInfo.querySelector('.metadata-lyricist');
        const composerDiv = creditsInfo.querySelector('.metadata-composer');
        const arrangerDiv = creditsInfo.querySelector('.metadata-arranger');

        if (metadata.lyricist || metadata.composer || metadata.arranger) {
            creditsInfo.classList.remove('hidden');
            
            if (metadata.lyricist) {
                lyricistDiv.classList.remove('hidden');
                lyricistDiv.querySelector('span:last-child').textContent = metadata.lyricist;
            }
            if (metadata.composer) {
                composerDiv.classList.remove('hidden');
                composerDiv.querySelector('span:last-child').textContent = metadata.composer;
            }
            if (metadata.arranger) {
                arrangerDiv.classList.remove('hidden');
                arrangerDiv.querySelector('span:last-child').textContent = metadata.arranger;
            }
        }

        // 唱片公司
        const labelInfo = document.getElementById('labelInfo');
        if (metadata.label) {
            labelInfo.classList.remove('hidden');
            labelInfo.querySelector('.metadata-label').textContent = metadata.label;
        }

        // 流派
        const genreInfo = document.getElementById('genreInfo');
        if (metadata.genre && metadata.genre.length > 0) {
            genreInfo.classList.remove('hidden');
            genreInfo.querySelector('.metadata-genre').textContent = metadata.genre.join(' / ');
        }

        // 标签
        const tagsInfo = document.getElementById('tagsInfo');
        if (metadata.tags && metadata.tags.length > 0) {
            tagsInfo.classList.remove('hidden');
            const tagsContainer = tagsInfo.querySelector('.flex');
            tagsContainer.innerHTML = metadata.tags
                .map(tag => `<span class="px-2 py-1 bg-gray-200 rounded text-sm text-gray-600">#${tag}</span>`)
                .join('');
        }

        // 描述
        const descriptionInfo = document.getElementById('descriptionInfo');
        if (metadata.description) {
            descriptionInfo.classList.remove('hidden');
            descriptionInfo.querySelector('.metadata-description').textContent = metadata.description;
        }
    }
}

// 初始化播放器
document.addEventListener('DOMContentLoaded', () => {
    new LyricPlayer();
}); 