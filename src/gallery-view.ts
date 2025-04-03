import { ItemView, TFile, WorkspaceLeaf } from 'obsidian';
import { createRoot } from 'react-dom/client';
import React from 'react';
import GalleryViewComponent, { setupGalleryIcons } from './Components/GalleryView';

export const GALLERY_VIEW_TYPE = 'music-gallery-view';
export type ViewTab = 'gallery' | 'musictable';

export class GalleryView extends ItemView {
    private reactRoot: ReturnType<typeof createRoot> | null = null;
    private viewState: any = {
        activeTab: 'gallery' as ViewTab
    };
    
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
        container.addClass('react-container');
        
        // 创建React挂载点
        const reactContainer = container.createDiv({ cls: 'react-gallery-container' });
        
        // 使用React 18的createRoot API挂载React组件
        this.reactRoot = createRoot(reactContainer);
        
        // 渲染React组件
        this.renderReactComponent();
    }
    
    // 切换选项卡
    switchTab(tab: ViewTab) {
        this.setState({ activeTab: tab });
    }
    
    // 渲染React组件
    private renderReactComponent() {
        if (!this.reactRoot) return;
        
        // 每次重新渲染组件
        this.reactRoot.render(
            React.createElement(GalleryViewComponent, {
                app: this.app,
                plugin: this.plugin,
                activeTab: this.viewState.activeTab,
                onSwitchTab: (tab: ViewTab) => this.switchTab(tab),
                onFileOpen: async (file: TFile) => {
                    await this.app.workspace.getLeaf().openFile(file);
                }
            })
        );
        
        // 设置React组件中的图标
        // 需要在组件挂载完成后执行
        setTimeout(() => {
            setupGalleryIcons(this.containerEl);
        }, 50);
    }
    
    getState(): any {
        // 返回存储的状态，不调用leaf.getViewState()
        return this.viewState;
    }
    
    setState(state: any): void {
        if (state && typeof state === 'object') {
            this.viewState = {...this.viewState, ...state};
            // 如果组件已挂载，更新视图
            if (this.reactRoot) {
                this.renderReactComponent();
            }
        }
    }
    
    async onClose(): Promise<void> {
        // 卸载React组件
        if (this.reactRoot) {
            this.reactRoot.unmount();
            this.reactRoot = null;
        }
    }
}
