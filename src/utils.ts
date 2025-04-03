import { TFile, TFolder, Vault } from 'obsidian';

// 定义支持的音乐文件扩展名
export const MUSIC_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];

// 搜索仓库中的音乐文件
export async function findMusicFiles(vault: Vault): Promise<TFile[]> {
    const musicFiles: TFile[] = [];
    
    // 递归函数，用于遍历文件夹
    async function searchFolder(folder: TFolder) {
        for (const child of folder.children) {
            if (child instanceof TFile) {
                // 检查是否是音乐文件
                if (MUSIC_EXTENSIONS.some(ext => child.path.endsWith(ext))) {
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

// 从文件获取文件名（不含扩展名）
export function getFilenameWithoutExtension(file: TFile): string {
    return file.basename;
}
