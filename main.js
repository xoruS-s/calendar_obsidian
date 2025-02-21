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

    createCalendarGrid(date) {
        const calendarEl = document.createElement("div");
        calendarEl.classList.add("calendar-grid");
        this.renderCalendarGrid(calendarEl, date);
        return calendarEl;
    }

    renderCalendar(container) {
        const calendarEl = container.createEl("div", { cls: "calendar-grid" }); /////////////////////////////////////////////////////
        this.renderCalendarGrid(calendarEl, this.currentDate);
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
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const notePath = `${this.settings.storageFolder}/${dateStr}.md`;
            const file = this.app.vault.getAbstractFileByPath(notePath);

            if (file) {
                // Если заметка существует, загружаем её содержимое
                this.app.vault.read(file).then((content) => {
                    const notes = content.split("\n").filter(line => line.trim() !== "");
                    const noteCount = notes.length;

                    // Добавляем точки
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
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const notePath = `${this.settings.storageFolder}/${dateStr}.md`;

        // Проверяем, существует ли заметка для этого дня
        const file = this.app.vault.getAbstractFileByPath(notePath);

        const modal = new obsidian.Modal(this.app);
        modal.titleEl.setText(`События на ${dateStr}`);

        const contentEl = modal.contentEl;

        if (file) {
            // Если заметка существует, загружаем её содержимое
            this.app.vault.read(file).then((content) => {
                // Разделяем заметки по строкам
                const notes = content.split("\n").filter(line => line.trim() !== "");

                // Отображаем каждую заметку
                notes.forEach((note, index) => {
                    const noteEl = contentEl.createEl("div", { cls: "note-item" });

                    // Текст заметки
                    noteEl.createEl("div", {
                        text: note,
                        cls: "note-text"
                    });

                    // Кнопка для удаления заметки
                    const deleteButton = noteEl.createEl("button", {
                        text: "Удалить",
                        cls: "note-button"
                    });
                    deleteButton.addEventListener("click", async () => {
                        notes.splice(index, 1); // Удаляем заметку из списка
                        if (notes.length > 0) {
                            await this.app.vault.modify(file, notes.join("\n"));
                        } else {
                            await this.app.vault.delete(file); // Удаляем файл, если заметок не осталось
                        }
                        modal.close();
                        this.openEventModal(day, month, year); // Переоткрываем окно для обновления
                    });
                });
            });
        } else {
            // Если заметок нет, отображаем сообщение
            contentEl.createEl("div", {
                text: "Заметок для этого дня нет.",
                cls: "note-empty"
            });
        }

        // Кнопка для добавления новой заметки
        const addNoteButton = contentEl.createEl("button", {
            text: "Добавить заметку",
            cls: "note-button"
        });
        addNoteButton.addEventListener("click", async () => {
            const newNote = prompt("Введите текст новой заметки:");
            if (newNote) {
                if (file) {
                    // Если файл уже существует, добавляем новую заметку
                    const content = await this.app.vault.read(file);
                    await this.app.vault.modify(file, `${content}\n${newNote}`);
                } else {
                    // Если файла нет, создаем новый
                    await this.app.vault.create(notePath, newNote);
                }
                modal.close();
                this.openEventModal(day, month, year); // Переоткрываем окно для обновления
            }
        });

        modal.open();
    }

    renderTodayEvents(container) {
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
        const notePath = `${this.settings.storageFolder}/${dateStr}.md`;

        // Создаем контейнер для списка событий
        const eventsContainer = container.createEl("div", { cls: "today-events" });
        eventsContainer.createEl("h3", { text: "События на сегодня", cls: "today-events-title" });

        // Проверяем, есть ли заметки для сегодняшнего дня
        const file = this.app.vault.getAbstractFileByPath(notePath);
        if (file) {
            // Если заметка существует, загружаем её содержимое
            this.app.vault.read(file).then((content) => {
                const notes = content.split("\n").filter(line => line.trim() !== "");

                // Отображаем каждую заметку
                notes.forEach((note) => {
                    const noteEl = eventsContainer.createEl("div", { cls: "today-event" });

                    // Текст заметки
                    noteEl.createEl("div", {
                        text: note,
                        cls: "today-event-text"
                    });
                });
            });
        } else {
            // Если заметок нет, отображаем сообщение
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

module.exports = FullCalendarPlugin;