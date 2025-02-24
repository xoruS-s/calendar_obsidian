'use strict';
const obsidian = require('obsidian');

const VIEW_TYPE_CALENDAR = 'calendar-view';
const MONTHS_RU = [
    'Январь', 'Февраль', 'Март', 'Апрель',
    'Май', 'Июнь', 'Июль', 'Август',
    'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

class FullCalendarPlugin extends obsidian.Plugin {
    constructor(app, manifest) {
        super(app, manifest);
        this.settings = {
            storageFolder: 'Calendar'
        };
    }

    async onload() {
        console.log('Loading Full Calendar plugin...');
        await this.loadSettings();

        this.registerView(
            VIEW_TYPE_CALENDAR,
            (leaf) => new CalendarView(leaf, this.settings, this.app)
        );

        this.addRibbonIcon('calendar', 'Open Calendar', () => {
            this.activateView();
        });

        this.addSettingTab(new CalendarSettingTab(this.app, this));
    }
    async activateView() {
        // Закрываем все существующие вкладки календаря
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_CALENDAR);

        // Открываем календарь в текущем workspace
        await this.app.workspace.getLeaf().setViewState({
            type: VIEW_TYPE_CALENDAR,
            active: true,
        });

        // Активируем вкладку календаря
        await this.app.workspace.revealLeaf(
            this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR)[0]
        );
    }
    async loadSettings() {
        console.log('Loading settings...');
        this.settings = Object.assign({}, this.settings, await this.loadData());
    }
    async saveSettings() {
        console.log('Saving settings...');
        await this.saveData(this.settings);
    }
}
class CalendarView extends obsidian.ItemView {
    constructor(leaf, settings, app) {
        super(leaf);
        this.settings = settings;
        this.app = app;
        this.currentDate = new Date(); // Текущая отображаемая дата
    }

    getDisplayText() {
        return "Календарь"; // Заголовок вкладки
    }
    getViewType() {
        return VIEW_TYPE_CALENDAR;
    }
    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        this.renderHeader(container);
        this.renderCalendar(container);
        this.renderTodayEvents(container); // Добавляем список событий на сегодня
    }
    renderHeader(container) {
        const header = container.createEl("div", { cls: "calendar-header" });

        // Кнопка предыдущего месяца
        const prevBtn = header.createEl("button", {
            text: "<",
            cls: "nav-button"
        });
        prevBtn.addEventListener("click", () => this.changeMonth(-1));

        // Отображение текущей даты
        this.dateDisplay = header.createEl("div", {
            cls: "current-date",
            text: this.getFormattedDate()
        });

        // Кнопка следующего месяца
        const nextBtn = header.createEl("button", {
            text: ">",
            cls: "nav-button"
        });
        nextBtn.addEventListener("click", () => this.changeMonth(1));

        // Кнопка "Сегодня"
        const todayBtn = header.createEl("button", {
            text: "Сегодня",
            cls: "nav-button"
        });
        todayBtn.addEventListener("click", () => this.goToToday());
    }
    goToToday() {
        this.currentDate = new Date(); // Устанавливаем текущую дату
        this.updateCalendar(); // Обновляем календарь
    }
    updateCalendar() {
        const container = this.containerEl.children[1];
        const oldCalendar = container.querySelector(".calendar-grid");

        // Удаляем старый календарь, если он существует
        if (oldCalendar) {
            oldCalendar.remove();
        }

        // Создаем новый календарь
        this.renderCalendar(container);
        this.dateDisplay.setText(this.getFormattedDate()); // Обновляем заголовок
    }
    getFormattedDate() {
        const month = MONTHS_RU[this.currentDate.getMonth()];
        const year = this.currentDate.getFullYear();
        return `${month} ${year}`;
    }
    changeMonth(offset) {
        // const prevDate = new Date(this.currentDate);
        // this.currentDate.setMonth(this.currentDate.getMonth() + offset);
        //
        // // Автоматическое изменение года при переходе через декабрь/январь
        // if (this.currentDate.getMonth() !== (prevDate.getMonth() + offset + 12) % 12) {
        //     this.currentDate.setFullYear(this.currentDate.getFullYear() + (offset > 0 ? 1 : -1));
        // }
        //
        // this.updateCalendar();

        const prevDate = new Date(this.currentDate);
        this.currentDate.setMonth(this.currentDate.getMonth() + offset);

        // Автоматическое изменение года при переходе через декабрь/январь
        if (this.currentDate.getMonth() !== (prevDate.getMonth() + offset + 12) % 12) {
            this.currentDate.setFullYear(this.currentDate.getFullYear() + (offset > 0 ? 1 : -1));
        }

        this.animateCalendarTransition(offset);
    }
    animateCalendarTransition(offset) {
        const container = this.containerEl.children[1];
        const oldCalendar = container.querySelector(".calendar-grid");

        // Создаем новый календарь
        const newCalendar = this.createCalendarGrid(this.currentDate);

        // Позиционируем новый календарь
        newCalendar.style.position = "absolute";
        newCalendar.style.top = "0";
        newCalendar.style.left = offset > 0 ? "100%" : "-100%";
        newCalendar.style.opacity = "0";

        // Добавляем новый календарь в контейнер
        container.appendChild(newCalendar);

        // Запускаем анимацию
        setTimeout(() => {
            oldCalendar.style.transform = `translateX(${offset > 0 ? "-100%" : "100%"})`;
            oldCalendar.style.opacity = "0";

            newCalendar.style.transform = "translateX(0)";
            newCalendar.style.opacity = "1";
        }, 10);

        // Удаляем старый календарь после завершения анимации
        setTimeout(() => {
            oldCalendar.remove();
            newCalendar.style.position = "static";
            newCalendar.style.transform = "none";
        }, 300); // Длительность анимации (300 мс)

        this.dateDisplay.setText(this.getFormattedDate()); // Обновляем заголовок
    }
    renderCalendar(container) {
        const calendarEl = container.createEl("div", { cls: "calendar-grid" }); /////////////////////////////////////////////////////
        this.renderCalendarGrid(calendarEl, this.currentDate);
    }
    createCalendarGrid(date) {
        const calendarEl = document.createElement("div");
        calendarEl.classList.add("calendar-grid");
        this.renderCalendarGrid(calendarEl, date);
        return calendarEl;
    }
    renderCalendarGrid(container, date) {
        const month = date.getMonth();
        const year = date.getFullYear();
        const today = new Date();

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Неделя начинается с понедельника

        // Отображаем дни недели (начиная с понедельника)
        const daysOfWeek = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
        daysOfWeek.forEach(day => {
            container.createEl("div", { cls: "calendar-day-header", text: day });
        });

        // Пустые ячейки для дней предыдущего месяца
        for (let i = 0; i < startDay; i++) {
            container.createEl("div", { cls: "calendar-day empty" });
        }

        // Ячейки для дней текущего месяца
        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = container.createEl("div", {
                cls: `calendar-day ${this.isToday(day, month, year) ? "today" : ""}`,
                text: day.toString()
            });

            // // Число дня
            // dayEl.createEl("div", {
            //     text: day.toString(),
            //     cls: "day-number"
            // });

            // Точки для заметок
            const dotsEl = dayEl.createEl("div", { cls: "note-dots" });

            // Проверяем, есть ли заметки для этого дня
            const dateStr = `${day.toString().padStart(2, '0')}.${(month + 1).toString().padStart(2, '0')}.${year}`;
            const notePath = `${this.settings.storageFolder}/${dateStr}.md`;
            const file = this.app.vault.getAbstractFileByPath(notePath);

            if (file) {
                this.app.vault.read(file).then((content) => {
                    // Разделяем заметки по разделителю "---"
                    const notes = content.split("---").filter(note => note.trim() !== "");
                    const noteCount = notes.length;

                    // Добавляем цветные кружки
                    for (let i = 0; i < noteCount; i++) {
                        dotsEl.createEl("div", { cls: "note-dot" });
                    }
                });
            }

            dayEl.addEventListener("click", () => {
                this.openEventModal(day, month, year);
            });
        }
    }
    isToday(day, month, year) {
        const today = new Date();
        return (
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
        );
    }
    openEventModal(day, month, year) {
        const dateStr = `${day.toString().padStart(2, '0')}.${(month + 1).toString().padStart(2, '0')}.${year}`;//EDITED
        const notePath = `${this.settings.storageFolder}/${dateStr}.md`;

        const modal = new obsidian.Modal(this.app);
        modal.titleEl.setText(`События на ${dateStr}`);

        const contentEl = modal.contentEl;

        const file = this.app.vault.getAbstractFileByPath(notePath);
        if (file) {
            this.app.vault.read(file).then((content) => {
                const notes = content.split("---").filter(note => note.trim() !== "");

                notes.forEach((note) => {
                    const noteEl = contentEl.createEl("div", { cls: "event-note" });

                    // Разделяем заметку на строки и убираем обозначения
                    const lines = note.trim().split("\n").filter(line => line.trim() !== "");
                    lines.forEach(line => {
                        // Убираем обозначения (например, "Текст:", "Время:")
                        const value = line.split(":**").slice(1).join(":").trim();
                        if (value) {
                            noteEl.createEl("div", {
                                text: value,
                                cls: "event-note-text"
                            });
                        }
                    });

                    // Добавляем разделитель между заметками
                    if (notes.length > 1) {
                        contentEl.createEl("hr", { cls: "event-note-separator" });
                    }
                });
            });
        } else {
            contentEl.createEl("div", {
                text: "Событий на сегодня нет.",
                cls: "today-event-empty"
            });
        }

        const addNoteButton = contentEl.createEl("button", {
            text: "Добавить заметку",
            cls: "note-button"
        });
        addNoteButton.addEventListener("click", () => {
            modal.close();
            this.openAddNoteModal(day, month, year);
        });

        modal.open();
    }
    openAddNoteModal(day, month, year) {
        const dateStr = `${day.toString().padStart(2, '0')}.${(month + 1).toString().padStart(2, '0')}.${year}`;//EDITED
        const modal = new obsidian.Modal(this.app);
        modal.titleEl.setText(`Добавить заметку на ${dateStr}`);

        const contentEl = modal.contentEl;

        // Поле для текста заметки
        contentEl.createEl("label", { text: "Текст заметки:" });
        const noteInput = contentEl.createEl("textarea", {
            placeholder: "Введите текст заметки...",
            cls: "note-input"
        });

        // Поле для времени "с"
        contentEl.createEl("label", { text: "Время с:" });
        const timeFromInput = contentEl.createEl("input", {
            type: "time",
            cls: "note-input"
        });

        // Поле для времени "по"
        contentEl.createEl("label", { text: "Время по:" });
        const timeToInput = contentEl.createEl("input", {
            type: "time",
            cls: "note-input"
        });

        // Поле для дополнительных сведений
        contentEl.createEl("label", { text: "Дополнительные сведения:" });
        const detailsInput = contentEl.createEl("textarea", {
            placeholder: "Введите дополнительные сведения...",
            cls: "note-input"
        });

        // Поле для тега
        contentEl.createEl("label", { text: "Тег:" });
        const tagInput = contentEl.createEl("input", {
            type: "text",
            placeholder: "Введите тег...",
            cls: "note-input"
        });

        // Кнопка для сохранения заметки
        const saveButton = contentEl.createEl("button", {
            text: "Сохранить",
            cls: "note-button"
        });
        saveButton.addEventListener("click", async () => {
            const noteContent = noteInput.value.trim();
            const timeFrom = timeFromInput.value;
            const timeTo = timeToInput.value;
            const details = detailsInput.value.trim();
            const tag = tagInput.value.trim();

            if (noteContent) {
                const fullNote = [
                    `**Текст:** ${noteContent}`,
                    `**Время:** с ${timeFrom} по ${timeTo}`,
                    `**Дополнительно:** ${details}`,
                    `**Тег:** ${tag}`
                ].join("\n");

                const notePath = `${this.settings.storageFolder}/${dateStr}.md`;
                const file = this.app.vault.getAbstractFileByPath(notePath);

                try {
                    if (file) {
                        const existingContent = await this.app.vault.read(file);
                        // Добавляем разделитель перед новой заметкой
                        await this.app.vault.modify(file, `${existingContent}\n\n---\n\n${fullNote}`);
                    } else {
                        await this.app.vault.create(notePath, fullNote);
                    }
                    modal.close();
                    this.openEventModal(day, month, year); // Переоткрываем окно событий
                } catch (error) {
                    console.error("Ошибка сохранения заметки:", error);
                }
            }
        });

        modal.open();
    }
    renderTodayEvents(container) {
        const today = new Date();
        const dateStr = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
        const notePath = `${this.settings.storageFolder}/${dateStr}.md`;

        // Создаем контейнер для списка событий
        const eventsContainer = container.createEl("div", { cls: "today-events" });
        eventsContainer.createEl("h3", { text: "События на сегодня", cls: "today-events-title" });

        // Проверяем, есть ли заметки для сегодняшнего дня
        const file = this.app.vault.getAbstractFileByPath(notePath);
        if (file) {
            this.app.vault.read(file).then((content) => {
                const notes = content.split("---").filter(note => note.trim() !== "");

                notes.forEach((note) => {
                    const noteEl = eventsContainer.createEl("div", { cls: "today-event" });

                    // Разделяем заметку на строки и убираем обозначения
                    const lines = note.trim().split("\n").filter(line => line.trim() !== "");
                    lines.forEach(line => {
                        // Убираем обозначения (например, "Текст:", "Время:")
                        const value = line.split(":**").slice(1).join(":").trim();
                        if (value) {
                            noteEl.createEl("div", {
                                text: value,
                                cls: "today-event-text"
                            });
                        }
                    });

                    // Добавляем разделитель между заметками
                    if (notes.length > 1) {
                        eventsContainer.createEl("hr", { cls: "today-event-separator" });
                    }
                });
            });
        } else {
            eventsContainer.createEl("div", {
                text: "Событий на сегодня нет.",
                cls: "today-event-empty"
            });
        }
    }

    async saveEventToNote(dateStr, content) {
        const notePath = `${this.settings.storageFolder}/${dateStr}.md`;

        try {
            const file = this.app.vault.getAbstractFileByPath(notePath);
            if (file) {
                const existingContent = await this.app.vault.read(file);
                await this.app.vault.modify(file, `${existingContent}\n${content}`);
            } else {
                await this.app.vault.create(notePath, `# ${dateStr}\n\n${content}`);
            }
        } catch (error) {
            console.error("Ошибка сохранения события:", error);
        }
    }
}
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

module.exports = FullCalendarPlugin;