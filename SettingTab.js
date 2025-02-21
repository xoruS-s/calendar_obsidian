class CalendarSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;

        containerEl.empty();

        new obsidian.Setting(containerEl)
            .setName('Папка для хранения событий')
            .setDesc('Укажите папку, где будут храниться заметки календаря')
            .addText(text => {
                text.setPlaceholder('Введите путь к папке')
                    .setValue(this.plugin.settings.storageFolder)
                    .onChange(async (value) => {
                        this.plugin.settings.storageFolder = value;
                        await this.plugin.saveSettings();
                    });
            })
            .addButton(button => {
                button.setButtonText('Выбрать папку')
                    .onClick(async () => {
                        const selectedFolder = await this.chooseFolder();
                        if (selectedFolder) {
                            this.plugin.settings.storageFolder = selectedFolder;
                            await this.plugin.saveSettings();
                            this.display();
                        }
                    });
            });
    }

    async chooseFolder() {
        return new Promise((resolve) => {
            const modal = new FolderSuggestModal(this.app, (folder) => {
                resolve(folder);
            });
            modal.open();
        });
    }
}

class FolderSuggestModal extends obsidian.SuggestModal {
    constructor(app, callback) {
        super(app);
        this.callback = callback;
    }

    getSuggestions(query) {
        const folders = this.app.vault.getAllLoadedFiles()
            .filter(file => file instanceof obsidian.TFolder)
            .map(folder => folder.path);

        return folders.filter(folder =>
            folder.toLowerCase().includes(query.toLowerCase())
        );
    }

    renderSuggestion(folder, el) {
        el.createEl("div", { text: folder });
    }

    onChooseSuggestion(folder, evt) {
        this.callback(folder);
    }
}