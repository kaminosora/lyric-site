import os
import json

# 定义歌曲文件夹和输出文件路径
songs_dir = 'songs'
output_file = 'config/songs.json'

# 初始化元数据列表
all_songs_metadata = []

# 遍历歌曲文件夹中的每个子文件夹
for song_folder in os.listdir(songs_dir):
    song_path = os.path.join(songs_dir, song_folder)
    if os.path.isdir(song_path):
        metadata_file = os.path.join(song_path, 'metadata.json')
        # 读取元数据文件
        if os.path.exists(metadata_file):
            with open(metadata_file, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
                metadata['id'] = song_folder
                all_songs_metadata.append(metadata)

# 将所有元数据写入输出文件
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(all_songs_metadata, f, ensure_ascii=False, indent=4)

print('所有歌曲元数据已成功写入', output_file) 