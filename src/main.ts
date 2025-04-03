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
		
		// 添加ribbon图标
		const ribbonIconEl = this.addRibbonIcon(
			'music-note', // 使用内置的音乐图标
			'打开音乐库', // 悬停提示文本
			(evt: MouseEvent) => {
				// 点击时激活音乐画廊视图
				this.activateView();
			}
		);
		
		// 给ribbon图标元素添加一个CSS类，方便样式定制
		ribbonIconEl.addClass('music-extended-ribbon-icon');
		
		// 添加命令
		this.addCommand({
			id: 'open-music-gallery',
			name: '打开音乐库',
			callback: () => {
				this.activateView();
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
	
	async activateView() {
		// 激活视图，如果不存在就创建新的
		const { workspace } = this.app;
		
		let leaf = workspace.getLeavesOfType(GALLERY_VIEW_TYPE)[0];
		
		if (!leaf) {
			// 创建新的页签
			leaf = workspace.getLeaf(false);
			await leaf.setViewState({
				type: GALLERY_VIEW_TYPE,
				active: true,
			});
		}
		
		// 聚焦到视图
		workspace.revealLeaf(leaf);
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
