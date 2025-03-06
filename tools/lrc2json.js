"use strict";

const fs = require("fs");
const path = require("path");
const kuromoji = require("kuromoji");

// 获取命令行参数
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error("用法: node convertLrcToJson.js <输入LRC文件> <输出JSON文件>");
    process.exit(1);
}

const INPUT_LRC_PATH = args[0];
const OUTPUT_JSON_PATH = args[1];

// 字典目录（请确保路径正确）
const DIC_DIR = path.join(__dirname, "node_modules/kuromoji/dict/");

// 判断是否为汉字（覆盖常用汉字范围，若需要可扩展）
function isKanji(char) {
    return /[\u4e00-\u9faf\u3400-\u4dbf]/.test(char);
}

// 片假名转平假名
function katakanaToHiragana(str) {
    return str.replace(/[\u30A1-\u30F6]/g, ch =>
        String.fromCharCode(ch.charCodeAt(0) - 0x60)
    );
}

// 转义正则表达式的特殊字符
function escapeRegex(str) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * 对齐函数：从 surface（原句）和 reading（完全假名读音，已转换为平假名）中，
 * 利用原句中的假名作为锚点，构造正则表达式，将汉字块替换为捕获组，
 * 从而提取每个汉字块对应的读音。
 *
 * 返回对象 { positions, kanji, readings }
 */
function alignKanjiReading(surface, reading) {
    let positions = [];
    let kanjiBlocks = [];
    let readings = [];

    // 构造正则表达式的过程：
    // 遍历 surface，遇到连续汉字时，用捕获组 (.+?) 替换，
    // 非汉字部分直接作为文字常量（需要转义）。
    let pattern = "^";
    let lastIndex = 0;
    let i = 0;
    while (i < surface.length) {
        if (isKanji(surface[i])) {
            // 先添加前面连续的非汉字部分（如果有）
            if (i > lastIndex) {
                let literal = surface.substring(lastIndex, i);
                pattern += escapeRegex(literal);
            }
            // 记录该汉字块的起始位置
            positions.push(i);
            // 取出连续的汉字块
            let start = i;
            while (i < surface.length && isKanji(surface[i])) {
                i++;
            }
            let block = surface.substring(start, i);
            kanjiBlocks.push(block);
            // 在正则中添加捕获组
            pattern += "(.+?)";
            lastIndex = i;
        } else {
            i++;
        }
    }
    // 添加末尾非汉字部分
    if (lastIndex < surface.length) {
        pattern += escapeRegex(surface.substring(lastIndex));
    }
    pattern += "$";

    // 创建正则对象（全局匹配不用g标志）
    let regex = new RegExp(pattern);
    let match = regex.exec(reading);
    if (match) {
        // 捕获组从 index 1 开始，对应每个汉字块的读音
        for (let j = 1; j < match.length; j++) {
            // 去掉可能多余的空格，并确保为平假名
            readings.push(match[j].trim());
        }
    } else {
        // 若正则匹配失败，则默认空读音
        readings = kanjiBlocks.map(() => "");
    }

    return { positions, kanji: kanjiBlocks, readings };
}

// 解析 LRC 格式歌词，提取时间戳和文本
function parseLRC(lrcText) {
    const lines = lrcText.split("\n");
    const lyrics = [];
    // 匹配格式：[mm:ss.xx]或[mm:ss.xxx]
    const timeRegex = /\[(\d{2}):(\d{2}\.\d{2,3})\](.*)/;
    for (let line of lines) {
        const m = line.match(timeRegex);
        if (!m) continue;
        const minutes = parseInt(m[1]);
        const seconds = parseFloat(m[2]);
        const time = Math.round((minutes * 60 + seconds) * 1000);
        const text = m[3].trim();
        if (text) {
            lyrics.push({ time, text });
        }
    }
    return lyrics;
}

// 主处理函数：读取 LRC，调用 kuromoji 分词，然后对含汉字的 token 进行对齐处理
function processLyrics(inputFile, outputFile) {
    fs.readFile(inputFile, "utf8", (err, data) => {
        if (err) {
            console.error("读取文件失败:", err);
            return;
        }
        let lyricLines = parseLRC(data);

        // 加载 kuromoji 分词器
        kuromoji.builder({ dicPath: DIC_DIR }).build((error, tokenizer) => {
            if (error) {
                console.error("分词器加载失败:", error);
                return;
            }

            // 对每行歌词处理
            const outputLyrics = lyricLines.map(lineObj => {
                let { time, text } = lineObj;
                let tokens = tokenizer.tokenize(text);
                let linePositions = [];
                let lineKanji = [];
                let lineReadings = [];
                let currentPos = 0;
                tokens.forEach(token => {
                    // 判断该 token 中是否含有汉字
                    if (/[^\u3040-\u30ff]/.test(token.surface_form)) { // 简单判断非假名可能为汉字
                        if (/[^\u3040-\u30ff]/.test(token.surface_form)) {
                            // 如果 token 包含汉字，使用对齐函数
                            // 转换 token.reading 为平假名；若为空则使用 token.surface_form
                            let fullReading = katakanaToHiragana(token.reading || token.surface_form);
                            let aligned = alignKanjiReading(token.surface_form, fullReading);
                            // 将每个汉字块的位置调整到行内整体位置
                            aligned.positions = aligned.positions.map(pos => pos + currentPos);
                            linePositions.push(...aligned.positions);
                            lineKanji.push(...aligned.kanji);
                            lineReadings.push(...aligned.readings);
                        }
                    }
                    currentPos += token.surface_form.length;
                });

                return {
                    time,
                    text,
                    furigana: {
                        positions: linePositions,
                        kanji: lineKanji,
                        readings: lineReadings
                    }
                };
            });
            let reslyrics = {lyrics: outputLyrics};
            // 写入 JSON 文件

            fs.writeFile(outputFile, JSON.stringify(reslyrics, null, 4), "utf8", err => {
                if (err) {
                    console.error("写入文件失败:", err);
                } else {
                    console.log("转换完成，输出文件:", outputFile);
                }
            });
        });
    });
}

// 运行主函数
processLyrics(INPUT_LRC_PATH, OUTPUT_JSON_PATH);
