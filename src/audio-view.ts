import { ItemView, TFile, WorkspaceLeaf } from 'obsidian';
import { MusicMetadata, parseMusicMetadata, formatDuration, formatBitrate } from './metadata-utils';

export const AUDIO_VIEW_TYPE = 'custom-audio-view';

export class CustomAudioView extends ItemView {
    private file: TFile | null = null;
    private filePath: string = '';
    private metadata: MusicMetadata | null = null;
    private audioEl: HTMLAudioElement | null = null;
    private progressBar: HTMLElement | null = null;
    private timeDisplay: HTMLElement | null = null;
    private playPauseBtn: HTMLElement | null = null;
    private volumeControl: HTMLInputElement | null = null;
    private playbackRateControl: HTMLSelectElement | null = null;
    private seekingInterval: number | null = null;
    
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }
    
    getViewType(): string {
        return AUDIO_VIEW_TYPE;
    }
    
    getDisplayText(): string {
        return this.file ? `音频: ${this.file.basename}` : "音频播放器";
    }
    
    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('custom-audio-view');
        
        // 创建播放器容器
        const playerContainer = container.createDiv({ cls: 'audio-player-container' });
        
        // 创建元数据显示区域
        const metadataContainer = playerContainer.createDiv({ cls: 'audio-metadata' });
        
        // 创建音频控件容器
        const audioContainer = playerContainer.createDiv({ cls: 'audio-controls-container' });
        
        // 创建原生音频元素（隐藏原生控件）
        this.audioEl = audioContainer.createEl('audio', { 
            cls: 'audio-element',
            attr: { preload: 'metadata' }
        });
        
        // 创建自定义控件容器
        const customControls = audioContainer.createDiv({ cls: 'custom-audio-controls' });
        
        // 创建播放控制区域
        const controlsRow = customControls.createDiv({ cls: 'controls-row' });
        
        // 创建进度条区域
        const progressContainer = customControls.createDiv({ cls: 'progress-container' });
        
        // 创建时间显示
        this.timeDisplay = progressContainer.createDiv({ cls: 'time-display', text: '0:00 / 0:00' });
        
        // 创建进度条
        this.progressBar = progressContainer.createEl('div', { cls: 'progress-bar' });
        const progressBg = this.progressBar.createEl('div', { cls: 'progress-bg' });
        const progressFill = progressBg.createEl('div', { cls: 'progress-fill' });
        const progressHandle = progressBg.createEl('div', { cls: 'progress-handle' });
        
        // 创建播放/暂停按钮
        this.playPauseBtn = controlsRow.createEl('button', { cls: 'play-pause-btn', text: '播放' });
        
        // 创建音量控制
        const volumeContainer = controlsRow.createDiv({ cls: 'volume-container' });
        volumeContainer.createEl('span', { text: '音量: ' });
        this.volumeControl = volumeContainer.createEl('input', {
            cls: 'volume-slider',
            attr: { type: 'range', min: '0', max: '1', step: '0.01', value: '0.7' }
        });
        
        // 创建播放速率控制
        const rateContainer = controlsRow.createDiv({ cls: 'rate-container' });
        rateContainer.createEl('span', { text: '速度: ' });
        this.playbackRateControl = rateContainer.createEl('select', { cls: 'rate-select' });
        
        const rates = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
        rates.forEach(rate => {
            this.playbackRateControl?.createEl('option', {
                text: `${rate}x`,
                attr: { value: rate.toString() }
            });
        });
        
        // 设置默认速率为1.0
        if (this.playbackRateControl) {
            this.playbackRateControl.value = '1.0';
        }
        
        // 设置事件监听
        this.setupEventListeners();
        
        // 如果已有文件则加载
        if (this.file) {
            await this.loadAudioFile(this.file);
        }
    }
    
    private setupEventListeners(): void {
        if (!this.audioEl || !this.progressBar || !this.playPauseBtn || 
            !this.volumeControl || !this.playbackRateControl) return;
        
        // 播放/暂停按钮点击事件
        this.playPauseBtn.addEventListener('click', () => {
            if (!this.audioEl) return;
            
            if (this.audioEl.paused) {
                this.audioEl.play();
                this.playPauseBtn!.textContent = '暂停';
            } else {
                this.audioEl.pause();
                this.playPauseBtn!.textContent = '播放';
            }
        });
        
        // 音频播放状态改变事件
        this.audioEl.addEventListener('play', () => {
            if (this.playPauseBtn) this.playPauseBtn.textContent = '暂停';
            
            // 更新进度间隔
            if (this.seekingInterval) clearInterval(this.seekingInterval);
            this.seekingInterval = window.setInterval(() => {
                this.updateProgress();
            }, 200);
        });
        
        this.audioEl.addEventListener('pause', () => {
            if (this.playPauseBtn) this.playPauseBtn.textContent = '播放';
            
            // 清除进度更新
            if (this.seekingInterval) {
                clearInterval(this.seekingInterval);
                this.seekingInterval = null;
            }
        });
        
        // 音频播放结束事件
        this.audioEl.addEventListener('ended', () => {
            if (this.playPauseBtn) this.playPauseBtn.textContent = '播放';
            this.updateProgress();
            
            // 清除进度更新
            if (this.seekingInterval) {
                clearInterval(this.seekingInterval);
                this.seekingInterval = null;
            }
        });
        
        // 进度条点击事件
        this.progressBar.addEventListener('click', (e) => {
            if (!this.audioEl) return;
            
            const progressRect = this.progressBar!.querySelector('.progress-bg')!.getBoundingClientRect();
            const clickPos = (e.clientX - progressRect.left) / progressRect.width;
            const newTime = clickPos * this.audioEl.duration;
            
            if (!isNaN(newTime) && isFinite(newTime)) {
                this.audioEl.currentTime = newTime;
                this.updateProgress();
            }
        });
        
        // 音量控制事件
        this.volumeControl.addEventListener('input', () => {
            if (!this.audioEl || !this.volumeControl) return;
            this.audioEl.volume = parseFloat(this.volumeControl.value);
        });
        
        // 播放速率控制事件
        this.playbackRateControl.addEventListener('change', () => {
            if (!this.audioEl || !this.playbackRateControl) return;
            this.audioEl.playbackRate = parseFloat(this.playbackRateControl.value);
        });
        
        // 元数据加载事件
        this.audioEl.addEventListener('loadedmetadata', () => {
            this.updateProgress();
        });
    }
    
    private updateProgress(): void {
        if (!this.audioEl || !this.progressBar || !this.timeDisplay) return;
        
        const currentTime = this.audioEl.currentTime;
        const duration = this.audioEl.duration || 0;
        
        // 更新进度条
        const progressFill = this.progressBar.querySelector('.progress-fill') as HTMLElement;
        const progressHandle = this.progressBar.querySelector('.progress-handle') as HTMLElement;
        
        if (progressFill && progressHandle && !isNaN(duration) && duration > 0) {
            const percent = currentTime / duration;
            progressFill.style.width = `${percent * 100}%`;
            progressHandle.style.left = `${percent * 100}%`;
        }
        
        // 更新时间显示
        const formatTime = (time: number): string => {
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        };
        
        this.timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    }
    
    async loadAudioFile(file: TFile): Promise<void> {
        this.file = file;
        this.filePath = this.app.vault.getResourcePath(file);
        
        // 获取并显示音频文件元数据
        try {
            this.metadata = await parseMusicMetadata(file);
            await this.displayMetadata();
        } catch (error) {
            console.error("无法加载音频元数据:", error);
        }
        
        // 更新音频元素
        if (this.audioEl) {
            this.audioEl.src = this.filePath;
            this.audioEl.load();
        }
        
        // 更新视图标题
        this.leaf.setViewState({
            type: AUDIO_VIEW_TYPE,
            state: { file: file.path }
        });
    }
    
    async displayMetadata(): Promise<void> {
        if (!this.metadata) return;
        
        const container = this.containerEl.querySelector('.audio-metadata');
        if (!container) return;
        
        container.empty();
        
        // 创建封面容器
        const coverContainer = container.createDiv({ cls: 'audio-cover-container' });
        
        // 显示封面
        if (this.metadata.coverData) {
            const coverImg = coverContainer.createEl('img', {
                cls: 'audio-cover-image',
                attr: { src: this.metadata.coverData }
            });
        } else {
            // 显示默认图标
            const coverIcon = coverContainer.createDiv({ cls: 'audio-cover-placeholder' });
            coverIcon.innerHTML = `<span class="audio-placeholder-icon file-music"></span>`;
        }
        
        // 创建元数据信息容器
        const infoContainer = container.createDiv({ cls: 'audio-info-container' });
        
        // 标题 - 添加可复制功能
        const titleEl = infoContainer.createEl('h3', { cls: 'audio-title' });
        const titleText = this.metadata.title || this.file?.basename || '未知标题';
        this.createCopyableText(titleEl, titleText);
        
        // 艺术家 - 添加可复制功能
        if (this.metadata.artist) {
            const artistEl = infoContainer.createEl('div', { cls: 'audio-artist' });
            artistEl.createSpan({ text: '艺术家: ' });
            this.createCopyableText(artistEl, this.metadata.artist);
        }
        
        // 专辑 - 添加可复制功能
        if (this.metadata.album) {
            const albumEl = infoContainer.createEl('div', { cls: 'audio-album' });
            albumEl.createSpan({ text: '专辑: ' });
            this.createCopyableText(albumEl, this.metadata.album);
        }
        
        // 创建技术信息区域
        const techContainer = container.createDiv({ cls: 'audio-tech-info' });
        
        // 添加音频格式、比特率等技术信息
        if (this.metadata.duration) {
            const durationEl = techContainer.createEl('div', { cls: 'audio-duration' });
            durationEl.createSpan({ text: '时长: ' });
            this.createCopyableText(durationEl, formatDuration(this.metadata.duration));
        }
        
        if (this.metadata.bitrate) {
            const bitrateEl = techContainer.createEl('div', { cls: 'audio-bitrate' });
            bitrateEl.createSpan({ text: '比特率: ' });
            this.createCopyableText(bitrateEl, formatBitrate(this.metadata.bitrate));
        }
        
        if (this.metadata.sampleRate) {
            const sampleRateEl = techContainer.createEl('div', { cls: 'audio-samplerate' });
            sampleRateEl.createSpan({ text: '采样率: ' });
            this.createCopyableText(sampleRateEl, `${this.metadata.sampleRate / 1000} kHz`);
        }
        
        // 更新视图标题
        this.leaf.view.titleEl.setText(this.getDisplayText());
    }
    
    private createCopyableText(container: HTMLElement, text: string): HTMLElement {
        const copyableEl = container.createDiv({ cls: 'text-for-copy', attr: { title: '点击复制' } });
        copyableEl.textContent = text;
        
        copyableEl.addEventListener('click', () => {
            navigator.clipboard.writeText(text).then(() => {
                if (!copyableEl) return;
                
                copyableEl.addClass('copied');
                
                // 显示复制成功提示
                const indicator = copyableEl.createSpan({ cls: 'copy-indicator', text: '已复制' });
                
                // 安全地显示全局通知
                try {
                    if (this.app && this.app.notices && typeof this.app.notices.show === 'function') {
                        const notice = this.app.notices.show(`已复制: ${text}`, 2000);
                        // 为通知添加自定义样式类
                        if (notice && notice.noticeEl) {
                            notice.noticeEl.addClass('music-copy-notice');
                        }
                    } else {
                        console.log('原生app.notices不可用，使用DOM通知替代');
                    }
                } catch (err) {
                    console.warn('显示通知失败:', err);
                }
                
                setTimeout(() => {
                    try {
                        if (copyableEl) {
                            copyableEl.removeClass('copied');
                            if (indicator && indicator.parentNode === copyableEl) {
                                indicator.remove();
                            }
                        }
                    } catch (err) {
                        console.warn('清理复制样式失败:', err);
                    }
                }, 1200);
            }).catch(err => {
                console.error('无法复制文本:', err);
                // 安全地显示错误通知
                try {
                    if (this.app && this.app.notices && typeof this.app.notices.show === 'function') {
                        this.app.notices.show('复制失败，请重试', 3000);
                    }
                } catch (err) {
                    console.warn('显示错误通知失败:', err);
                }
            });
        });
        
        return copyableEl;
    }
    
    async onClose(): Promise<void> {
        // 停止音频播放
        if (this.audioEl) {
            this.audioEl.pause();
        }
        
        // 清除进度更新定时器
        if (this.seekingInterval) {
            clearInterval(this.seekingInterval);
            this.seekingInterval = null;
        }
    }
    
    async setFile(file: TFile): Promise<void> {
        await this.loadAudioFile(file);
    }
}
