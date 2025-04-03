import { TFile, requestUrl } from 'obsidian';

// 音乐文件元数据接口
export interface MusicMetadata {
    title: string;
    artist?: string;
    album?: string;
    year?: string;
    genre?: string;
    duration?: number;
    coverUrl?: string;
    filePath: string;
    fileSize?: number;
}

/**
 * 尝试从文件名中提取艺术家和标题信息
 * 支持格式：Artist - Title.mp3 或 Title.mp3
 */
export function extractInfoFromFilename(filename: string): { artist?: string; title: string } {
    const parts = filename.split(' - ');
    if (parts.length >= 2) {
        return {
            artist: parts[0].trim(),
            title: parts[1].trim()
        };
    }
    return { title: filename };
}

/**
 * 解析音乐文件元数据
 * 
 * 注意：这是一个简化版本，实际生产环境中应使用更完善的音乐元数据解析库
 * 如 music-metadata 或其他适用于浏览器环境的库
 */
export async function parseMusicMetadata(file: TFile): Promise<MusicMetadata> {
    const { basename, extension, path, stat } = file;
    
    // 从文件名提取基本信息
    const { artist, title } = extractInfoFromFilename(basename);
    
    // 计算文件大小（单位：MB）
    const fileSize = stat?.size ? Math.round((stat.size / (1024 * 1024)) * 100) / 100 : undefined;
    
    // 创建基本元数据对象
    const metadata: MusicMetadata = {
        title: title || basename,
        artist,
        filePath: path,
        fileSize
    };
    
    try {
        // 尝试读取文件的前几KB内容以提取更多元数据
        // 注意：这只是一个简化示例，实际上需要更复杂的解析逻辑
        const fileContent = await file.vault.readBinary(file);
        const buffer = new Uint8Array(fileContent);
        
        // 尝试从文件内容中提取元数据（简化示例）
        // 这里只是模拟一些可能的元数据
        if (extension === 'mp3') {
            // 假设我们能识别一些专辑信息
            if (path.toLowerCase().includes('album')) {
                metadata.album = path.split('/').slice(-2, -1)[0];
            }
            
            // 假设从文件目录结构提取年份
            const yearMatch = path.match(/\b(19|20)\d{2}\b/);
            if (yearMatch) {
                metadata.year = yearMatch[0];
            }
            
            // 模拟一个音乐时长 (2-7分钟)
            metadata.duration = Math.floor(120 + Math.random() * 300);
        }
    } catch (error) {
        console.error('提取音乐元数据时出错:', error);
    }
    
    return metadata;
}

/**
 * 格式化音乐时长为分:秒格式
 */
export function formatDuration(seconds?: number): string {
    if (!seconds) return '未知时长';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * 获取文件类型对应的图标
 */
export function getFileTypeIcon(extension: string): string {
    switch (extension.toLowerCase()) {
        case 'mp3':
            return 'audio-file';
        case 'wav':
            return 'waveform';
        case 'flac':
            return 'file-audio';
        case 'ogg':
        case 'm4a':
            return 'headphones';
        default:
            return 'file-music';
    }
}
