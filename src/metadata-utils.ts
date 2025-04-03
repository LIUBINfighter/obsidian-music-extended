import { TFile } from 'obsidian';
import * as mm from 'music-metadata';
import { selectCover, ratingToStars } from 'music-metadata';

// 音乐文件元数据接口
export interface MusicMetadata {
    title: string;
    artist?: string;
    album?: string;
    year?: string;
    genre?: string[];
    duration?: number;
    coverData?: string; // base64编码的封面数据
    filePath: string;
    fileSize?: number;
    bitrate?: number;
    sampleRate?: number;
    lossless?: boolean;
    rating?: number; // 0-5星级评分
    trackNumber?: number;
    totalTracks?: number;
    discNumber?: number;
    totalDiscs?: number;
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
 * 使用music-metadata库提取详细的音乐元数据
 */
export async function parseMusicMetadata(file: TFile): Promise<MusicMetadata> {
    const { basename, path, stat } = file;
    
    // 计算文件大小（单位：MB）
    const fileSize = stat?.size ? Math.round((stat.size / (1024 * 1024)) * 100) / 100 : undefined;
    
    // 创建基本元数据对象（默认为空）
    const metadata: MusicMetadata = {
        title: basename,
        filePath: path,
        fileSize
    };
    
    try {
        // 读取文件二进制数据
        const fileContent = await file.vault.readBinary(file);
        const buffer = new Uint8Array(fileContent);
        
        // 使用music-metadata解析音乐元数据
        const parsedMetadata = await mm.parseBuffer(buffer, {
            mimeType: getMimeTypeByExtension(file.extension),
            size: buffer.length
        });
        
        // 提取常见标签
        const { common, format } = parsedMetadata;
        
        // 更新元数据
        metadata.title = common.title || basename;
        metadata.artist = common.artist;
        metadata.album = common.album;
        metadata.year = common.year?.toString();
        metadata.genre = common.genre;
        metadata.duration = format.duration;
        metadata.bitrate = format.bitrate;
        metadata.sampleRate = format.sampleRate;
        metadata.lossless = format.lossless;
        metadata.rating = common.rating ? ratingToStars(common.rating) : undefined;
        metadata.trackNumber = common.track.no;
        metadata.totalTracks = common.track.of;
        metadata.discNumber = common.disk.no;
        metadata.totalDiscs = common.disk.of;
        
        // 提取封面
        const cover = selectCover(common.picture);
        if (cover) {
            metadata.coverData = `data:${cover.format};base64,${uint8ArrayToBase64(cover.data)}`;
        }
        
    } catch (error) {
        console.error('提取音乐元数据时出错:', error);
    }
    
    return metadata;
}

/**
 * 根据文件扩展名获取MIME类型
 */
function getMimeTypeByExtension(extension: string): string {
    const mimeTypes: Record<string, string> = {
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'flac': 'audio/flac',
        'm4a': 'audio/mp4',
        'aac': 'audio/aac'
    };
    
    return mimeTypes[extension.toLowerCase()] || 'audio/mpeg';
}

/**
 * 将Uint8Array转换为base64编码
 */
function uint8ArrayToBase64(buffer: Uint8Array): string {
    let binary = '';
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
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

/**
 * 格式化比特率显示
 */
export function formatBitrate(bitrate?: number): string {
    if (!bitrate) return '';
    
    if (bitrate >= 1000) {
        return `${(bitrate / 1000).toFixed(1)} kbps`;
    }
    
    return `${Math.round(bitrate)} bps`;
}
