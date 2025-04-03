import { TFile, TFolder, Vault } from 'obsidian';

// 定义支持的音乐文件扩展名
export const MUSIC_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'];

/**
 * 搜索仓库中的音乐文件
 */
export async function findMusicFiles(vault: Vault): Promise<TFile[]> {
    const musicFiles: TFile[] = [];
    
    // 递归函数，用于遍历文件夹
    async function searchFolder(folder: TFolder) {
        for (const child of folder.children) {
            if (child instanceof TFile) {
                // 检查是否是音乐文件
                if (MUSIC_EXTENSIONS.some(ext => child.path.toLowerCase().endsWith(ext))) {
                    musicFiles.push(child);
                }
            } else if (child instanceof TFolder) {
                // 递归搜索子文件夹
                await searchFolder(child);
            }
        }
    }
    
    // 从根目录开始搜索
    await searchFolder(vault.getRoot());
    
    return musicFiles;
}

/**
 * 从文件获取文件名（不含扩展名）
 */
export function getFilenameWithoutExtension(file: TFile): string {
    return file.basename;
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
 * 将文件大小（字节）格式化为人类可读格式
 */
export function formatFileSize(sizeInBytes?: number): string {
    if (!sizeInBytes) return 'Unknown';
    
    const KB = 1024;
    const MB = KB * 1024;
    const GB = MB * 1024;
    
    if (sizeInBytes >= GB) {
        return `${(sizeInBytes / GB).toFixed(2)} GB`;
    }
    
    if (sizeInBytes >= MB) {
        return `${(sizeInBytes / MB).toFixed(2)} MB`;
    }
    
    if (sizeInBytes >= KB) {
        return `${(sizeInBytes / KB).toFixed(2)} KB`;
    }
    
    return `${sizeInBytes} bytes`;
}

/**
 * 防抖函数 - 用于搜索等操作
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: number | null = null;
    
    return function(...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            func(...args);
        };
        
        if (timeout !== null) {
            clearTimeout(timeout);
        }
        
        timeout = window.setTimeout(later, wait);
    };
}
