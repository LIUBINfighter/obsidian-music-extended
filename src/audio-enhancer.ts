import { App, TFile } from 'obsidian';
import { MusicMetadata, formatDuration, formatBitrate } from './metadata-utils';

/**
 * 增强原生音频视图
 */
export function enhanceAudioView(
    container: HTMLElement, 
    file: TFile, 
    metadata: MusicMetadata, 
    app: App
): void {
    // 创建增强器容器
    const enhancerContainer = container.createDiv({
        cls: 'music-extended-audio-enhancer'
    });
    
    // 添加增强器到原生音频视图上方
    container.prepend(enhancerContainer);
    
    // 创建元数据显示区
    const metadataPanel = enhancerContainer.createDiv({
        cls: 'audio-metadata-panel'
    });
    
    // 创建布局容器
    const metadataLayout = metadataPanel.createDiv({
        cls: 'audio-metadata-layout'
    });
    
    // 创建封面区
    const coverContainer = metadataLayout.createDiv({
        cls: 'audio-cover-container'
    });
    
    // 显示封面
    if (metadata.coverData) {
        const coverImg = coverContainer.createEl('img', {
            cls: 'audio-cover-image',
            attr: { src: metadata.coverData }
        });
    } else {
        // 显示默认图标
        const coverIcon = coverContainer.createDiv({ cls: 'audio-cover-placeholder' });
        coverIcon.innerHTML = `<span class="audio-placeholder-icon file-music"></span>`;
    }
    
    // 创建信息区
    const infoContainer = metadataLayout.createDiv({ 
        cls: 'audio-info-container' 
    });
    
    // 添加标题
    infoContainer.createEl('h3', { 
        cls: 'audio-title', 
        text: metadata.title || file.basename 
    });
    
    // 如果有艺术家信息则添加
    if (metadata.artist) {
        infoContainer.createEl('div', { 
            cls: 'audio-artist', 
            text: `艺术家: ${metadata.artist}` 
        });
    }
    
    // 如果有专辑信息则添加
    if (metadata.album) {
        infoContainer.createEl('div', { 
            cls: 'audio-album', 
            text: `专辑: ${metadata.album}` 
        });
    }
    
    // 创建技术信息区域
    const techContainer = metadataPanel.createDiv({ cls: 'audio-tech-info' });
    
    // 添加格式信息
    if (metadata.duration) {
        techContainer.createEl('div', { 
            cls: 'audio-tech-item audio-duration', 
            text: `时长: ${formatDuration(metadata.duration)}` 
        });
    }
    
    if (metadata.bitrate) {
        techContainer.createEl('div', { 
            cls: 'audio-tech-item audio-bitrate', 
            text: `比特率: ${formatBitrate(metadata.bitrate)}` 
        });
    }
    
    if (metadata.sampleRate) {
        techContainer.createEl('div', { 
            cls: 'audio-tech-item audio-samplerate', 
            text: `采样率: ${Math.round(metadata.sampleRate / 1000)} kHz` 
        });
    }
    
    // 添加文件格式
    if (file.extension) {
        techContainer.createEl('div', { 
            cls: 'audio-tech-item audio-format', 
            text: `格式: ${file.extension.toUpperCase()}` 
        });
    }
    
    // 添加控制增强区
    const controlsPanel = enhancerContainer.createDiv({
        cls: 'audio-controls-panel'
    });
    
    // 添加播放速率控制
    const rateContainer = controlsPanel.createDiv({ cls: 'audio-rate-container' });
    rateContainer.createEl('span', { text: '播放速度: ' });
    
    const rateSelect = rateContainer.createEl('select', { cls: 'audio-rate-select' });
    
    const rates = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    rates.forEach(rate => {
        rateSelect.createEl('option', {
            text: `${rate}x`,
            attr: { value: rate.toString() }
        });
    });
    
    // 设置默认速率为1.0
    rateSelect.value = '1.0';
    
    // 获取原生音频元素
    const audioEl = container.querySelector('audio');
    if (audioEl) {
        // 为速率选择器添加事件监听
        rateSelect.addEventListener('change', () => {
            (audioEl as HTMLAudioElement).playbackRate = parseFloat(rateSelect.value);
        });
    }
    
    // 检测歌词
    if (metadata && Array.isArray(metadata.genre)) {
        const lyrics = metadata.genre.find(item => 
            item && item.toLowerCase().includes('[lrc]'));
        
        if (lyrics) {
            // 创建歌词显示区
            const lyricsPanel = enhancerContainer.createDiv({
                cls: 'audio-lyrics-panel'
            });
            
            // 提取歌词内容（去掉[lrc]标记）
            const lyricsContent = lyrics.replace('[lrc]', '').trim();
            
            // 显示歌词
            lyricsPanel.createEl('div', {
                cls: 'audio-lyrics-title',
                text: '歌词'
            });
            
            const lyricsTextEl = lyricsPanel.createEl('div', {
                cls: 'audio-lyrics-content'
            });
            
            // 处理并显示歌词
            const lines = lyricsContent.split('\n');
            lines.forEach(line => {
                lyricsTextEl.createEl('div', {
                    cls: 'audio-lyrics-line',
                    text: line
                });
            });
        }
    }
}
