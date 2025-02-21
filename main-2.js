const { Plugin, PluginSettingTab, Setting, moment, MarkdownView } = require('obsidian');

const DEFAULT_SETTINGS = {
    dateFormat: 'YYYY-MM-DD'
};

class CalendarPlugin extends Plugin {
    async onload() {
        console.log("start")
        try {
            await this.loadSettings();

            this.addCommand({
                id: 'open-calendar-view',
                name: 'Open Calendar',
                callback: () => {
                    this.activateView();
                }
            });

            this.addSettingTab(new CalendarSettingTab(this.app, this));

            this.registerView(
                "calendar-view",
                (leaf) => new CalendarView(leaf, this)
            );
        } catch (error) {
            console.error("Ошибка при загрузке плагина:", error);
        }
    }

    async activateView() {
        this.app.workspace.detachLeavesOfType("calendar-view");

        try {
            const leaf = this.app.workspace.getRightLeaf(false);
            if (!leaf) {
                console.error("Не удалось получить лист для календаря.");
                return;
            }

            await leaf.setViewState({
                type: "calendar-view",
                active: true,
            });

            const calendarLeaf = this.app.workspace.getLeavesOfType("calendar-view")[0];
            if (calendarLeaf) {
                this.app.workspace.revealLeaf(calendarLeaf);
            } else {
                console.error("Не удалось найти лист для календаря после создания.");
            }
        } catch (error) {
            console.error("Ошибка при активации вида календаря:", error);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class CalendarSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Настройки календаря' });

        new Setting(containerEl)
            .setName('Формат даты')
            .setDesc('Формат даты для отображения в календаре.')
            .addText(text => text
                .setPlaceholder('YYYY-MM-DD')
                .setValue(this.plugin.settings.dateFormat)
                .onChange(async (value) => {
                    this.plugin.settings.dateFormat = value;
                    await this.plugin.saveSettings();
                }));
    }
}

class CalendarView extends MarkdownView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return "calendar-view";
    }

    getDisplayText() {
        return "Calendar";
    }

    getIcon() {
        return "calendar";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl("h2", { text: "Календарь" });

        const calendarContainer = container.createDiv({ cls: 'calendar-container' });
        this.renderCalendar(calendarContainer);
    }

    async onClose() {}

    renderCalendar(container) {
        const now = moment();
        const year = now.year();
        const month = now.month();

        const firstDayOfMonth = moment([year, month, 1]);
        const lastDayOfMonth = moment([year, month, 1]).endOf('month');

        const daysInMonth = lastDayOfMonth.date();
        const startDay = firstDayOfMonth.day();

        const calendarTable = container.createEl('table', { cls: 'calendar-table' });
        const tableHeader = calendarTable.createEl('thead').createEl('tr');

        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        daysOfWeek.forEach(day => {
            tableHeader.createEl('th', { text: day });
        });

        const tableBody = calendarTable.createEl('tbody');

        let dayCounter = 1;

        for (let i = 0; i < 6; i++) {
            const weekRow = tableBody.createEl('tr');

            for (let j = 0; j < 7; j++) {
                if (i === 0 && j < startDay) {
                    weekRow.createEl('td');
                } else if (dayCounter <= daysInMonth) {
                    const dayCell = weekRow.createEl('td', { text: String(dayCounter) });
                    dayCell.addEventListener('click', () => {
                        this.openNoteForDate(year, month, dayCounter);
                    });
                    dayCounter++;
                } else {
                    weekRow.createEl('td');
                }
            }

            if (dayCounter > daysInMonth) break;
        }
    }

    async openNoteForDate(year, month, day) {
        const formattedDate = moment([year, month, day]).format(this.plugin.settings.dateFormat);
        const fileName = `${formattedDate}.md`;

        let abstractFile = this.app.vault.getAbstractFileByPath(fileName);

        if (!abstractFile) {
            try {
                await this.app.vault.create(fileName, `# Заметка за ${formattedDate}`);
                abstractFile = this.app.vault.getAbstractFileByPath(fileName);
            } catch (e) {
                console.error("Ошибка при создании файла:", e);
                return;
            }
        }

        if (abstractFile) {
            await this.app.workspace.openLinkText(fileName, '', 'tab');
        }
    }
}

module.exports = CalendarPlugin;
