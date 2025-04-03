import { App, TFile } from 'obsidian';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { MusicMetadata } from './metadata-utils';
import AudioMetadataPanel from './Components/AudioMetadataPanel';

/**
 * 增强原生音频视图
 */
export function enhanceAudioView(
    container: HTMLElement, 
    file: TFile, 
    metadata: MusicMetadata, 
    app: App,
    plugin: any
): void {
    // 创建增强器容器
    const enhancerContainer = container.createDiv({
        cls: 'react-audio-enhancer-container'
    });
    
    // 添加增强器到原生音频视图上方
    container.prepend(enhancerContainer);
    
    // 获取原生音频元素
    const audioEl = container.querySelector('audio') as HTMLAudioElement;
    if (!audioEl) return;
    
    // 找到原生音频控件容器
    const nativeAudioContainer = container.querySelector('.audio-container') as HTMLElement;
    
    // 使用React 18的createRoot API创建React根节点
    const root = createRoot(enhancerContainer);
    
    // 渲染React组件
    root.render(
        React.createElement(AudioMetadataPanel, {
            file: file,
            metadata: metadata,
            app: app, // 确保app正确传递
            plugin: plugin,
            audioEl: audioEl,
            onToggleNativeControls: (visible: boolean) => {
                if (nativeAudioContainer) {
                    nativeAudioContainer.style.display = visible ? 'block' : 'none';
                }
            }
        })
    );
    
    // 确保音频元素的播放速度始终为默认值1.0
    audioEl.playbackRate = 1.0;
    
    // 清理函数 - 当音频元素被移除时
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.removedNodes.forEach((node) => {
                if (node === audioEl || node.contains(audioEl) || node === enhancerContainer) {
                    // 音频元素被移除，卸载React组件并清理资源
                    observer.disconnect();
                    root.unmount();
                    audioEl.playbackRate = 1.0; // 重置回默认值
                }
            });
        });
    });
    
    // 观察DOM变化
    observer.observe(container, { childList: true, subtree: true });
}
