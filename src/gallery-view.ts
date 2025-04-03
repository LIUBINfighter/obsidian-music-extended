import { ItemView, TFile, WorkspaceLeaf } from 'obsidian';
import { findMusicFiles, getFilenameWithoutExtension } from './utils';

export const GALLERY_VIEW_TYPE = 'music-gallery-view';

export class GalleryView extends ItemView {
    private musicFiles: TFile[] = [];
    
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }
    
    getViewType(): string {
        return GALLERY_VIEW_TYPE;
    }
    
    getDisplayText(): string {
        return '音乐库';
    }
    
    async onOpen(): Promise<void> {
        // 清空现有内容
        const container = this.containerEl.children[1];
        container.empty();
        
        // 创建标题
        const headerDiv = container.createDiv('music-gallery-header');
        headerDiv.createEl('h2', { text: '音乐库' });
        
        // 创建音乐列表容器
        const musicListContainer = container.createDiv('music-gallery-list');
        
        // 搜索音乐文件并显示
        await this.loadMusicFiles(musicListContainer);
    }
    
    async loadMusicFiles(container: HTMLElement): Promise<void> {
        try {
            // 获取所有音乐文件
            this.musicFiles = await findMusicFiles(this.app.vault);
            
            if (this.musicFiles.length === 0) {
                container.createEl('p', { text: '未找到音乐文件' });
                return;
            }
            
            // 创建音乐文件列表
            const listEl = container.createEl('ul', { cls: 'music-file-list' });
            
            for (const file of this.musicFiles) {
                const filename = getFilenameWithoutExtension(file);
                const listItem = listEl.createEl('li', { cls: 'music-file-item' });
                
                // 创建可点击的链接
                const link = listItem.createEl('a', {
                    cls: 'music-file-link',
                    text: filename,
                    href: '#'
                });
                
                // 添加点击事件
                link.addEventListener('click', (event) => {
                    event.preventDefault();
                    this.openFile(file);
                });
            }
        } catch (error) {
            console.error('加载音乐文件失败:', error);
            container.createEl('p', { text: '加载音乐文件时出错' });
        }
    }
    
    async openFile(file: TFile): Promise<void> {
        // 打开文件
        await this.app.workspace.getLeaf().openFile(file);
    }
    
    async onClose(): Promise<void> {
        // 清理工作
    }
}
