import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';
import { GALLERY_VIEW_TYPE, GalleryView } from './gallery-view';

interface MusicExtendedSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MusicExtendedSettings = {
	mySetting: 'default'
}

export default class MusicExtendedPlugin extends Plugin {
	settings: MusicExtendedSettings;

	async onload() {
		await this.loadSettings();

		// 注册视图
		this.registerView(
			GALLERY_VIEW_TYPE,
			(leaf: WorkspaceLeaf) => new GalleryView(leaf)
		);
		
		// 添加ribbon图标 - 默认在新标签页打开
		const ribbonIconEl = this.addRibbonIcon(
			'file-music', // 使用内置的音乐图标
			'打开音乐库', // 悬停提示文本
			(evt: MouseEvent) => {
				// 点击时在新标签页中激活音乐画廊视图
				this.activateView('tab');
			}
		);
		
		// 给ribbon图标元素添加一个CSS类，方便样式定制
		ribbonIconEl.addClass('music-extended-ribbon-icon');
		
		// 添加多个命令
		this.addCommand({
			id: 'open-music-gallery-new-tab',
			name: '在新标签页打开音乐库',
			callback: () => {
				this.activateView('tab');
			},
		});
		
		this.addCommand({
			id: 'open-music-gallery-workspace',
			name: '在工作区打开音乐库',
			callback: () => {
				this.activateView('workspace');
			},
		});

		// 添加设置选项卡
		this.addSettingTab(new MusicExtendedSettingTab(this.app, this));
	}

	onunload() {
		// 插件卸载时的清理工作
		this.app.workspace.detachLeavesOfType(GALLERY_VIEW_TYPE);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
	
	/**
	 * 激活音乐库视图
	 * @param mode - 激活模式: 'tab'表示新建标签页, 'workspace'表示在工作区打开
	 */
	async activateView(mode: 'tab' | 'workspace' = 'tab') {
		const { workspace } = this.app;
		
		if (mode === 'workspace') {
			// 方式1: 在工作区中查找已有视图或创建
			let leaf = workspace.getLeavesOfType(GALLERY_VIEW_TYPE)[0];
			
			if (!leaf) {
				// 使用已存在的视图位置
				leaf = workspace.getLeaf();
				await leaf.setViewState({
					type: GALLERY_VIEW_TYPE,
					active: true,
				});
			}
			
			workspace.revealLeaf(leaf);
		} else {
			// 方式2: 创建新标签页(不覆盖当前视图)
			// 首先查看是否已经有此类型的视图
			const existingLeaf = workspace.getLeavesOfType(GALLERY_VIEW_TYPE)[0];
			
			if (existingLeaf) {
				// 如果存在则激活已有视图
				workspace.revealLeaf(existingLeaf);
			} else {
				// 创建新标签页
				const leaf = workspace.getLeaf('tab');
				await leaf.setViewState({
					type: GALLERY_VIEW_TYPE,
					active: true,
				});
				workspace.revealLeaf(leaf);
			}
		}
	}
}

class MusicExtendedSettingTab extends PluginSettingTab {
	plugin: MusicExtendedPlugin;

	constructor(app: App, plugin: MusicExtendedPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('设置选项')
			.setDesc('设置描述')
			.addText(text => text
				.setPlaceholder('请输入设置值')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
