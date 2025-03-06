class LyricParser {
    constructor() {
        this.supportedFormats = {
            lrc: this.parseLRC,
            txt: this.parseTXT,
            ass: this.parseASS,
            srt: this.parseSRT,
            json: this.parseJSON,
            xml: this.parseXML
        };
    }

    // LRC格式解析
    parseLRC(content) {
        const lines = content.split('\n');
        const lyrics = [];
        const timeRegex = /\[(\d{2}):(\d{2}\.\d{2,3})\](.*)/;

        lines.forEach(line => {
            const match = timeRegex.exec(line);
            if (match) {
                const minutes = parseInt(match[1]);
                const seconds = parseFloat(match[2]);
                const time = Math.round((minutes * 60 + seconds) * 1000);
                const text = match[3].trim();

                if (text) {
                    lyrics.push({
                        time,
                        text,
                        type: 'line'
                    });
                }
            }
        });

        return lyrics;
    }

    // 纯文本格式解析
    parseTXT(content) {
        return content.split('\n')
            .map(line => line.trim())
            .filter(line => line)
            .map((text, index) => ({
                time: index * 2000, // 每行默认2秒
                text,
                type: 'line'
            }));
    }

    // ASS字幕格式解析
    parseASS(content) {
        const lines = content.split('\n');
        const lyrics = [];
        const dialogueRegex = /^Dialogue:\s*\d+,(\d+:\d{2}:\d{2}\.\d{2}),(\d+:\d{2}:\d{2}\.\d{2}),([^,]*,){7}(.*)$/;

        lines.forEach(line => {
            const match = dialogueRegex.exec(line);
            if (match) {
                const startTime = this.parseASSTime(match[1]);
                const endTime = this.parseASSTime(match[2]);
                const text = match[4].replace(/\{[^}]*\}/g, '').trim();

                if (text) {
                    lyrics.push({
                        time: startTime,
                        endTime,
                        text,
                        type: 'line'
                    });
                }
            }
        });

        return lyrics;
    }

    // SRT字幕格式解析
    parseSRT(content) {
        const blocks = content.split('\n\n');
        const lyrics = [];
        const timeRegex = /(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/;

        blocks.forEach(block => {
            const lines = block.split('\n');
            if (lines.length >= 3) {
                const timeMatch = timeRegex.exec(lines[1]);
                if (timeMatch) {
                    const startTime = this.parseSRTTime(timeMatch.slice(1, 5));
                    const endTime = this.parseSRTTime(timeMatch.slice(5, 9));
                    const text = lines.slice(2).join(' ').trim();

                    if (text) {
                        lyrics.push({
                            time: startTime,
                            endTime,
                            text,
                            type: 'line'
                        });
                    }
                }
            }
        });

        return lyrics;
    }

    // JSON格式解析
    parseJSON(content) {
        try {
            const data = JSON.parse(content);
            return data.lyrics.map(lyric => {
                // 处理假名注音
                let furiganaMap = null;
                if (lyric.furigana) {
                    furiganaMap = {};
                    const { positions, kanji, readings } = lyric.furigana;
                    kanji.forEach((k, i) => {
                        const pos = positions[i];
                        furiganaMap[pos] = {
                            kanji: k,
                            reading: readings[i]
                        };
                    });
                }

                return {
                    time: lyric.time,
                    endTime: lyric.endTime,
                    text: lyric.text,
                    type: lyric.type || 'line',
                    translation: lyric.translation,
                    furigana: furiganaMap
                };
            });
        } catch (error) {
            console.error('Failed to parse JSON lyrics:', error);
            return [];
        }
    }

    // XML格式解析
    parseXML(content) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, 'text/xml');
        const lyrics = [];

        const lyricNodes = xmlDoc.getElementsByTagName('lyric');
        for (const node of lyricNodes) {
            const time = parseInt(node.getAttribute('time'));
            const endTime = parseInt(node.getAttribute('endTime'));
            const text = node.textContent;
            const type = node.getAttribute('type') || 'line';

            if (text) {
                lyrics.push({
                    time,
                    endTime,
                    text,
                    type,
                    translation: node.getAttribute('translation'),
                    furigana: node.getAttribute('furigana')
                });
            }
        }

        return lyrics;
    }

    // 辅助方法：解析ASS时间格式
    parseASSTime(timeStr) {
        const [h, m, s] = timeStr.split(':');
        return (parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s)) * 1000;
    }

    // 辅助方法：解析SRT时间格式
    parseSRTTime([hours, minutes, seconds, milliseconds]) {
        return parseInt(hours) * 3600000 +
               parseInt(minutes) * 60000 +
               parseInt(seconds) * 1000 +
               parseInt(milliseconds);
    }

    // 主解析方法
    async parse(filePath) {
        try {
            const response = await fetch(filePath);
            const content = await response.text();
            const format = filePath.split('.').pop().toLowerCase();

            if (this.supportedFormats[format]) {
                return this.supportedFormats[format].call(this, content);
            } else {
                throw new Error(`Unsupported format: ${format}`);
            }
        } catch (error) {
            console.error('Failed to parse lyrics:', error);
            return [];
        }
    }
}

// 导出解析器实例
window.lyricParser = new LyricParser(); 