import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

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

		// 添加设置选项卡
		this.addSettingTab(new MusicExtendedSettingTab(this.app, this));
	}

	onunload() {
		// 插件卸载时的清理工作
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
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
