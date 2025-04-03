import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, TFile } from 'obsidian';
import { GALLERY_VIEW_TYPE, GalleryView } from './gallery-view';
import { enhanceAudioView } from './audio-enhancer';
import { parseMusicMetadata } from './metadata-utils';
import { TABLE_VIEW_TYPE, TableView } from './table-view';

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

		// 加载插件样式
		this.loadStyles();

		// 注册视图
		this.registerView(
			GALLERY_VIEW_TYPE,
			(leaf: WorkspaceLeaf) => {
				const view = new GalleryView(leaf);
				// 为视图设置plugin引用
				view.plugin = this;
				return view;
			}
		);
		
		// 注册表格视图
		this.registerView(
			TABLE_VIEW_TYPE,
			(leaf: WorkspaceLeaf) => {
				const view = new TableView(leaf);
				// 为视图设置plugin引用
				view.plugin = this;
				return view;
			}
		);
		
			// 监听工作区布局变更，以增强新打开的音频视图
		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				this.enhanceExistingAudioViews();
			})
		);
		
		// 监听文件打开事件，以捕获音频文件的打开
		this.registerEvent(
			this.app.workspace.on('file-open', (file) => {
				if (file && this.isAudioFile(file)) {
					// 延迟执行以确保视图已完全加载
					setTimeout(() => {
						this.enhanceExistingAudioViews();
					}, 100);
				}
			})
		);
		
		// 添加ribbon图标 - 默认在新标签页打开
		const ribbonIconEl = this.addRibbonIcon(
			'file-music',
			'打开音乐库',
			(evt: MouseEvent) => {
				this.activateView('tab');
			}
		);
		
		// 给ribbon图标元素添加一个CSS类，方便样式定制
		ribbonIconEl.addClass('music-extended-ribbon-icon');
		
		// 添加命令
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
		
		// 添加表格视图命令
		this.addCommand({
			id: 'open-music-table-new-tab',
			name: '在新标签页打开音乐表格',
			callback: () => {
				this.activateTableView('tab');
			},
		});
		
		this.addCommand({
			id: 'open-music-table-workspace',
			name: '在工作区打开音乐表格',
			callback: () => {
				this.activateTableView('workspace');
			},
		});

		// 添加文件菜单选项，增强音频播放
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				if (file && this.isAudioFile(file)) {
					menu.addItem((item) => {
						item
							.setTitle('增强音频播放')
							.setIcon('headphones')
							.onClick(async () => {
								// 使用 Obsidian 原生方式打开音频文件
								const leaf = this.app.workspace.getLeaf('tab');
								await leaf.openFile(file);
								
								// 延迟执行以确保视图已完全加载
								setTimeout(() => {
									this.enhanceExistingAudioViews();
								}, 100);
							});
					});
				}
			})
		);

		// 增强已存在的音频视图
		this.enhanceExistingAudioViews();

		// 添加设置选项卡
		this.addSettingTab(new MusicExtendedSettingTab(this.app, this));
	}

	onunload() {
		// 插件卸载时的清理工作
		this.app.workspace.detachLeavesOfType(GALLERY_VIEW_TYPE);
		this.app.workspace.detachLeavesOfType(TABLE_VIEW_TYPE);
		
		// 移除所有增强的音频视图元素
		document.querySelectorAll('.music-extended-audio-enhancer').forEach(el => el.remove());
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

	/**
	 * 激活音乐表格视图
	 * @param mode - 激活模式: 'tab'表示新建标签页, 'workspace'表示在工作区打开
	 */
	async activateTableView(mode: 'tab' | 'workspace' = 'tab') {
		const { workspace } = this.app;
		
		if (mode === 'workspace') {
			// 方式1: 在工作区中查找已有视图或创建
			let leaf = workspace.getLeavesOfType(TABLE_VIEW_TYPE)[0];
			
			if (!leaf) {
				// 使用已存在的视图位置
				leaf = workspace.getLeaf();
				await leaf.setViewState({
					type: TABLE_VIEW_TYPE,
					active: true,
				});
			}
			
			workspace.revealLeaf(leaf);
		} else {
			// 方式2: 创建新标签页(不覆盖当前视图)
			// 首先查看是否已经有此类型的视图
			const existingLeaf = workspace.getLeavesOfType(TABLE_VIEW_TYPE)[0];
			
			if (existingLeaf) {
				// 如果存在则激活已有视图
				workspace.revealLeaf(existingLeaf);
			} else {
				// 创建新标签页
				const leaf = workspace.getLeaf('tab');
				await leaf.setViewState({
					type: TABLE_VIEW_TYPE,
					active: true,
				});
				workspace.revealLeaf(leaf);
			}
		}
	}

	/**
	 * 检查文件是否为音频文件
	 */
	private isAudioFile(file: TFile): boolean {
		return ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(file.extension);
	}
	
	/**
	 * 增强所有现有的音频视图
	 */
	private enhanceExistingAudioViews(): void {
		// 查找所有当前打开的音频视图
		const audioLeaves = this.app.workspace.getLeavesOfType('audio');
		
		// 为每个音频视图添加增强功能
		audioLeaves.forEach(async (leaf) => {
			const file = leaf.view.file;
			if (file && this.isAudioFile(file)) {
				// 查找视图容器
				const audioViewContainer = leaf.view.contentEl;
				
				// 检查是否已经增强过
				if (audioViewContainer.querySelector('.music-extended-audio-enhancer')) {
					return;
				}
				
				try {
					// 获取音频元数据
					const metadata = await parseMusicMetadata(file);
					
					// 对原生音频视图进行增强，传入插件实例
					enhanceAudioView(audioViewContainer, file, metadata, this.app, this);
				} catch (error) {
					console.error('增强音频视图失败:', error);
				}
			}
		});
	}

	/**
	 * 加载插件样式
	 */
	private loadStyles() {
		// 添加插件自定义样式
		this.addStyle();
		
		// 为body添加插件标识类，方便全局样式定制
		document.body.classList.add('music-extended-plugin-enabled');
	}
	
	/**
	 * 添加插件样式
	 */
	private addStyle() {
		// 添加样式元素
		const styleEl = document.createElement('style');
		styleEl.id = 'music-extended-styles';
		
		// 这里可以添加一些动态生成的样式
		// 例如基于设置生成的自定义样式
		styleEl.textContent = `
			/* 针对应用主题的动态样式 */
			.theme-dark .music-card {
				box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
			}
			
			.theme-light .music-card {
				box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
			}
			
			/* 根据用户设置动态生成的样式 */
			.music-extended-ribbon-icon {
				color: var(--icon-color, var(--text-accent));
			}
		`;
		
		// 添加到文档
		document.head.appendChild(styleEl);
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
