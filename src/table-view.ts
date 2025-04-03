import { ItemView, TFile, WorkspaceLeaf } from 'obsidian';
import { createRoot } from 'react-dom/client';
import React from 'react';
import MusicTable from './Components/MusicTable';

export const TABLE_VIEW_TYPE = 'music-table-view';

export class TableView extends ItemView {
    private reactRoot: ReturnType<typeof createRoot> | null = null;
    private viewState: any = {};
    
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }
    
    getViewType(): string {
        return TABLE_VIEW_TYPE;
    }
    
    getDisplayText(): string {
        return '音乐表格';
    }
    
    async onOpen(): Promise<void> {
        // 清空现有内容
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('react-container');
        
        // 创建React挂载点
        const reactContainer = container.createDiv({ cls: 'react-table-container' });
        
        // 使用React 18的createRoot API挂载React组件
        this.reactRoot = createRoot(reactContainer);
        
        // 渲染React组件
        this.renderReactComponent();
    }
    
    // 渲染React组件
    private renderReactComponent() {
        if (!this.reactRoot) return;
        
        // 每次重新渲染组件
        this.reactRoot.render(
            React.createElement(MusicTable, {
                app: this.app,
                onFileOpen: async (file: TFile) => {
                    await this.app.workspace.getLeaf().openFile(file);
                }
            })
        );
    }
    
    getState(): any {
        // 返回存储的状态
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
