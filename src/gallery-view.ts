import { ItemView, TFile, WorkspaceLeaf } from 'obsidian';
import { findMusicFiles, getFilenameWithoutExtension } from './utils';
import { MusicMetadata, parseMusicMetadata, formatDuration, getFileTypeIcon } from './metadata-utils';

export const GALLERY_VIEW_TYPE = 'music-gallery-view';

export class GalleryView extends ItemView {
    private musicFiles: TFile[] = [];
    private musicMetadata: MusicMetadata[] = [];
    private searchEl: HTMLInputElement;
    private loadingEl: HTMLElement;
    private galleryContainer: HTMLElement;
    private noFilesEl: HTMLElement;
    private errorEl: HTMLElement;
    
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
        
        // 创建画廊容器
        const galleryContainer = container.createDiv({ cls: 'music-gallery-container' });
        
        // 创建标题
        const headerDiv = galleryContainer.createDiv({ cls: 'music-gallery-header' });
        headerDiv.createEl('h2', { text: '音乐库' });
        
        // 添加搜索框
        const searchDiv = galleryContainer.createDiv({ cls: 'music-gallery-search' });
        this.searchEl = searchDiv.createEl('input', {
            cls: 'music-search-input',
            attr: {
                type: 'text',
                placeholder: '搜索音乐文件...'
            }
        });
        
        // 添加搜索事件监听
        this.searchEl.addEventListener('input', () => {
            this.renderMusicList();
        });
        
        // 创建加载指示器
        this.loadingEl = galleryContainer.createDiv({ 
            cls: 'music-gallery-loading',
            text: '正在加载音乐文件...'
        });
        
        // 创建音乐列表容器
        this.galleryContainer = galleryContainer.createDiv({ cls: 'music-gallery-list' });
        
        // 创建无文件提示
        this.noFilesEl = this.galleryContainer.createDiv({
            cls: 'music-empty-message',
            text: '未找到音乐文件'
        });
        this.noFilesEl.hide();
        
        // 创建错误提示
        this.errorEl = this.galleryContainer.createDiv({
            cls: 'music-error-message',
            text: '加载音乐文件时出错'
        });
        this.errorEl.hide();
        
        // 搜索音乐文件并显示
        await this.loadMusicFiles();
    }
    
    async loadMusicFiles(): Promise<void> {
        try {
            // 显示加载中
            this.loadingEl.show();
            this.noFilesEl.hide();
            this.errorEl.hide();
            
            // 获取所有音乐文件
            this.musicFiles = await findMusicFiles(this.app.vault);
            
            // 解析音乐文件元数据
            this.musicMetadata = await Promise.all(
                this.musicFiles.map(async (file, index) => {
                    try {
                        return await parseMusicMetadata(file);
                    } catch (error) {
                        console.error(`解析文件 ${file.path} 元数据失败:`, error);
                        // 返回基本元数据
                        return {
                            title: getFilenameWithoutExtension(file),
                            filePath: file.path
                        };
                    }
                })
            );
            
            // 隐藏加载中
            this.loadingEl.hide();
            
            // 渲染音乐列表
            this.renderMusicList();
        } catch (error) {
            console.error('加载音乐文件失败:', error);
            this.loadingEl.hide();
            this.errorEl.show();
        }
    }
    
    renderMusicList(): void {
        // 获取搜索关键词
        const searchTerm = this.searchEl.value.toLowerCase();
        
        // 过滤音乐文件
        const filteredMetadata = this.musicMetadata.filter(metadata => {
            const searchText = [
                metadata.title,
                metadata.artist,
                metadata.album,
                metadata.genre
            ].filter(Boolean).join(' ').toLowerCase();
            
            return searchText.includes(searchTerm);
        });
        
        // 清空音乐列表
        const listContainer = this.galleryContainer;
        listContainer.empty();
        
        // 检查是否有匹配的音乐文件
        if (filteredMetadata.length === 0) {
            if (this.musicMetadata.length === 0) {
                this.noFilesEl.show();
                listContainer.appendChild(this.noFilesEl);
            } else {
                const noResultsEl = listContainer.createDiv({
                    cls: 'music-empty-message',
                    text: '没有匹配的音乐文件'
                });
            }
            return;
        }
        
        // 创建网格布局
        const gridEl = listContainer.createDiv({ cls: 'music-grid' });
        
        // 为每个音乐文件创建卡片
        filteredMetadata.forEach((metadata, index) => {
            const file = this.musicFiles.find(f => f.path === metadata.filePath);
            if (!file) return;
            
            const cardEl = gridEl.createDiv({ cls: 'music-card' });
            
            // 添加图标
            const iconEl = cardEl.createDiv({ cls: 'music-card-icon' });
            iconEl.innerHTML = `<span class="${getFileTypeIcon(file.extension)}"></span>`;
            
            // 添加信息区
            const infoEl = cardEl.createDiv({ cls: 'music-card-info' });
            
            // 添加标题
            infoEl.createDiv({
                cls: 'music-card-title',
                text: metadata.title || getFilenameWithoutExtension(file)
            });
            
            // 如果有艺术家信息则添加
            if (metadata.artist) {
                infoEl.createDiv({
                    cls: 'music-card-artist',
                    text: metadata.artist
                });
            }
            
            // 添加元数据信息
            const metaEl = infoEl.createDiv({ cls: 'music-card-meta' });
            
            // 添加时长信息
            const durationEl = metaEl.createDiv();
            durationEl.innerHTML = `<span class="music-duration-icon clock"></span>${formatDuration(metadata.duration)}`;
            
            // 添加文件大小
            if (metadata.fileSize) {
                metaEl.createDiv({
                    text: `${metadata.fileSize} MB`
                });
            }
            
            // 添加点击事件
            cardEl.addEventListener('click', (event) => {
                event.preventDefault();
                this.openFile(file);
            });
        });
    }
    
    async openFile(file: TFile): Promise<void> {
        // 打开文件
        await this.app.workspace.getLeaf().openFile(file);
    }
    
    async onClose(): Promise<void> {
        // 清理工作
    }
}
