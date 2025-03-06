# 歌词展示网站

这是一个基于 GitHub Pages 的歌词展示平台，支持多格式歌词解析、多语言对照、翻译开关、假名注音和播放模拟功能。

## 功能特点

- 支持多种歌词格式（LRC、TXT、ASS、SRT、JSON、XML）
- 中日英三语对照显示
- 日语歌词假名注音
- 歌词播放模拟功能
- 响应式设计，支持移动端
- 自定义样式模板
- 多种布局切换
- 字符特效支持
- 字符级别时间控制
- 自定义字符颜色和动画

## 目录结构

```
project/
├── index.html          # 主页面
├── song-page.html      # 歌词页面模板
├── css/               # 样式文件
│   ├── styles.css     # 全局样式
│   └── template.css   # 自定义模板样式
├── js/                # JavaScript文件
│   ├── main.js       # 主页面逻辑
│   ├── parser.js     # 歌词解析逻辑
│   └── player.js     # 播放逻辑
├── songs/            # 歌词文件目录
│   ├── {song_id}/
│   │   ├── lyrics.[格式]         # 歌词文件
│   │   ├── translations/        # 翻译文件
│   │   │   ├── zh-CN.json
│   │   │   └── en-US.json
│   │   └── config.json          # 配置文件
└── config/           # 配置文件目录
    └── songs.json    # 全体歌曲信息
```

## 配置说明

### 1. 歌曲元数据配置

在歌曲的 `config.json` 中可以设置以下元数据：

```json
{
    "song_name": "歌曲名称",
    "artist": "演唱者",
    "language": "jp",
    "lyrics_format": "lrc",
    "metadata": {
        "album": "专辑名称",
        "release_date": "发布日期",
        "lyricist": "作词",
        "composer": "作曲",
        "arranger": "编曲",
        "duration": "时长",
        "genre": ["流派1", "流派2"],
        "label": "唱片公司",
        "description": "歌曲描述",
        "tags": ["标签1", "标签2"]
    }
}
```

所有元数据字段都是可选的，如果不提供某个字段，相应的显示部分会被自动隐藏。

### 2. 特效系统配置

特效系统支持三种主要动画类型和额外的视觉效果：

#### 2.1 动画类型

1. 颜色切换效果 (switch)
   - 在预设的颜色之间进行切换
   - 带有平滑的过渡动画
   ```json
   {
       "type": "switch",
       "duration": "2s",
       "timing": "ease",
       "normalColors": ["#color1", "#color2", "#color3"],
       "activeColors": ["#active1", "#active2", "#active3"]
   }
   ```

2. 颜色流动效果 (flow)
   - 颜色持续渐变流动
   - 可自定义流动速度和颜色
   ```json
   {
       "type": "flow",
       "duration": "4s",
       "timing": "linear",
       "normalColors": ["#color1", "#color2", "#color3"],
       "activeColors": ["#active1", "#active2", "#active3"]
   }
   ```

3. 波浪效果 (wave)
   - 颜色从左到右或从右到左滚动
   - 可设置方向和速度
   ```json
   {
       "type": "wave",
       "direction": "right",
       "duration": "3s",
       "timing": "linear",
       "normalColors": ["#color1", "#color2", "#color3"],
       "activeColors": ["#active1", "#active2", "#active3"]
   }
   ```

4. 彩虹效果 (rainbow)
   - 预设的彩虹渐变效果
   ```json
   {
       "type": "rainbow",
       "duration": "6s",
       "timing": "linear"
   }
   ```

#### 2.2 视觉效果

1. 发光效果
```json
{
    "glow": {
        "enabled": true,
        "color": "rgba(241, 196, 15, 0.6)",
        "radius": "10px",
        "intensity": 1.2
    }
}
```

2. 阴影效果
```json
{
    "shadow": {
        "enabled": true,
        "color": "rgba(0, 0, 0, 0.3)",
        "x": "2px",
        "y": "2px",
        "blur": "4px"
    }
}
```

#### 2.3 完整配置示例

```json
{
    "effects": {
        "charByChar": true,
        "defaultEffect": {
            "type": "switch",
            "duration": "2s",
            "timing": "ease",
            "normalColors": ["#f1c40f", "#9b59b6", "#3498db"],
            "activeColors": ["#e74c3c", "#2ecc71", "#8e44ad"],
            "glow": {
                "enabled": true,
                "color": "rgba(241, 196, 15, 0.6)",
                "radius": "10px",
                "intensity": 1.2
            },
            "shadow": {
                "enabled": false,
                "color": "rgba(0, 0, 0, 0.3)",
                "x": "2px",
                "y": "2px",
                "blur": "4px"
            }
        },
        "charEffects": {
            "0-0": {  // 第0行第0个字符
                "type": "wave",
                "direction": "right",
                "duration": "3s",
                // ... 其他配置
            }
        },
        "charTimings": {
            "0-0": { "time": 0 },
            "0-1": { "time": 200 }
            // ... 更多时间配置
        }
    }
}
```

### 3. 样式自定义

#### 3.1 全局样式变量

```css
:root {
    /* 颜色 */
    --text-color: #2d3748;
    --active-color: #e74c3c;
    --translation-color: #666;

    /* 字体 */
    --font-lyrics: "字体名称";
    --font-translation: "字体名称";
    --font-furigana: "字体名称";

    /* 字体大小 */
    --font-size-lyrics: 1rem;
    --font-size-translation: 0.9rem;
    --font-size-furigana: 0.7em;

    /* 间距 */
    --gap-lyrics: 3rem;
    --gap-lines: 0.5rem;
}
```

#### 3.2 布局模式

提供五种布局模式：

1. 中间对齐 (center-align)
2. 两侧对齐 (sides-align)
3. 各自居中 (center-each)
4. 左右对齐 (left-right)
5. 右左对齐 (right-left)

## 使用方法

### 1. 添加新歌曲

1. 在 `config/songs.json` 中添加歌曲基本信息
2. 在 `songs/` 目录下创建新的歌曲文件夹（按数字递增）
3. 添加歌词文件和翻译文件
4. 创建并配置 `config.json` 文件

### 2. 配置特效

1. 在歌曲的 `config.json` 中添加 `effects` 配置
2. 设置默认特效和字符级别特效
3. 配置发光和阴影效果
4. 设置字符时间轴

### 3. 自定义样式

1. 修改全局样式变量
2. 配置字体和颜色
3. 调整间距和布局

## 浏览器支持

- Chrome 90+
- Firefox 88+
- Safari 14+

## 贡献指南

1. Fork 本仓库
2. 创建新的功能分支
3. 提交更改
4. 发起 Pull Request

## 许可证

MIT License 