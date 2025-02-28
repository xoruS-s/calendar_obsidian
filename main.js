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
        const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR)[0];
        if (leaf) {
            await this.app.workspace.revealLeaf(leaf);
        } else {
            console.error("Не удалось открыть вкладку календаря!");
        }
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
        if (!container) { console.error("Контейнер не найден!"); return; }
        container.empty();

        this.renderHeader(container);               // Рендер шапки календаря
        this.renderCalendar(container);             // Рендер календаря
        await this.renderTodayEvents(container);    // Рендер списока событий на сегодня
    }

    // Обновление компонентов
    async refreshUI() {
        const container = this.containerEl.children[1];
        container.empty(); // Очищаем контейнер перед обновлением
        this.renderHeader(container);
        this.renderCalendar(container);
        await this.renderTodayEvents(container);

        // // Обновляем календарь
        // this.updateCalendar();
        //
        // // Обновляем канбан
        // await this.renderTodayEvents(this.containerEl);
        //
        // // Обновляем другие компоненты (если есть)
    }

    renderCalendar(container) {
        // const calendarEl = container.querySelector(".calendar-grid");
        // if (calendarEl) {
        //     calendarEl.empty(); // Очищаем календарь перед обновлением
        // } else {
        //     container.createEl("div", { cls: "calendar-grid" });
        // }
        // this.renderCalendarGrid(calendarEl, this.currentDate);

        const calendarEl = container.createEl("div", { cls: "calendar-grid" });
        this.renderCalendarGrid(calendarEl, this.currentDate);
    }                                                                                      // [Генерация календаря (часть 1 - по сути можно было в одном методе)]
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
    }                                                                            // [Генерация кальндаря (сетка, часть 2)]
    renderTag(container, tag) {
        const tagEl = container.createEl("div", { cls: "tag-item" });

        // // Отображаем цвет тега
        // const colorCircle = tagEl.createEl("div", { cls: "tag-color" });
        // colorCircle.style.backgroundColor = tag.color;
        //
        // // Отображаем название тега
        // const nameEl = tagEl.createEl("div", { cls: "tag-name" });
        // nameEl.setText(tag.name);

        // Поле выбора цвета
        const colorInput = tagEl.createEl("input", {
            type: "color",
            value: tag.color,
            cls: "tag-color-input"
        });
        colorInput.addEventListener("change", async (e) => {
            tag.color = e.target.value;
            await this.saveTags().then();
        });

        // Кнопка название тега
        const nameInput = tagEl.createEl("input", {
            type: "text",
            value: tag.name,
            cls: "tag-name"
        });
        // nameInput.addEventListener("change", async (e) => {
        //     tag.name = e.target.value;
        //     await this.saveTags().then();
        // });

        // Кнопка редактирования тега
        const editButton = tagEl.createEl("button", {
            text: "✏️",
            cls: "tag-edit-button"
        });

        // Кнопка удаления тега
        const deleteButton = tagEl.createEl("button", {
            text: "🗑️",
            cls: "tag-delete-button"
        });
        deleteButton.addEventListener("click", async () => {
            tagEl.remove();
            const tags = await this.loadTags();
            const updatedTags = tags.filter(t => t.name !== tag.name);
            await this.saveTags(updatedTags);
        });

        // // Обработчик для кнопки "Редактировать"
        // editButton.addEventListener("click", () => {
        //     // Переключаемся в режим редактирования
        //     this.toggleEditMode(tagEl, tag, editButton);
        // });
        //
        // // Добавляем кнопки в контейнер
        // tagEl.append(editButton, deleteButton);
        // container.append(tagEl);
    }                                                                                      // [Генерация настройки тегов]
    renderHeader(container) {
        const header = container.createEl("div", { cls: "calendar-header" });

        // Кнопка предыдущего месяца
        const prevBtn = header.createEl("button", {
            text: "◀",
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
            text: "▶",
            cls: "nav-button"
        });
        nextBtn.addEventListener("click", () => this.changeMonth(1));

        // Кнопка "Сегодня"
        const todayBtn = header.createEl("button", {
            text: "Сегодня",
            cls: "nav-button"
        });
        todayBtn.addEventListener("click", () => this.goToToday());

        // Кнопка меню
        const menuBtn = header.createEl("button", {
            cls: "menu-button"
        });
        // menuBtn.innerHTML = "&#9776;"; // Иконка меню
        menuBtn.innerHTML = "#";
        menuBtn.addEventListener("click", () => this.openTagSettingsModal());
    }                                                                                        // [Генерация шапки календаря]
    async renderTodayEvents(container) {
        const today = new Date();
        const dateStr = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
        const notePath = `${this.settings.storageFolder}/${dateStr}.md`;

        // Добавляем линию-разделитель
        container.createEl("hr", { cls: "calendar-divider" });

        // Добавляем заголовок "События на сегодня"
        const title = container.createEl("div", { cls: "today-events-title" });
        title.setText("События на сегодня");

        // // Очищаем контейнер перед обновлением
        // const kanbanContainer = container.querySelector(".kanban-container");
        // if (kanbanContainer) {
        //     kanbanContainer.empty();
        // } else {
        //     // Создаем контейнер для канбан-карточек
        //     container.createEl("div", { cls: "kanban-container" });
        // }

        // Создаем контейнер для канбан-карточек
        const kanbanContainer = container.createEl("div", { cls: "kanban-container" });

        // Проверяем, есть ли заметки для сегодняшнего дня
        const file = this.app.vault.getAbstractFileByPath(notePath);
        if (file) {
            this.app.vault.read(file).then((content) => {
                const notes = content.split("---").filter(note => note.trim() !== "");

                notes.forEach((note) => {
                    // Создаем канбан-карточку
                    const card = kanbanContainer.createEl("div", { cls: "kanban-card" });

                    // Добавляем обработчик клика на карточку
                    card.addEventListener("click", () => {
                        this.openNoteModal(note); // Открываем модальное окно с заметкой
                    });

                    // Разделяем заметку на строки и убираем обозначения
                    const lines = note.trim().split("\n").filter(line => line.trim() !== "");
                    lines.forEach(async line => {
                        const value = line.split(":**").slice(1).join(":").trim();
                        if (value) {
                            // Если строка содержит время, добавляем ее в отдельный контейнер с границей
                            if (line.includes("Время:")) {
                                const timeContainer = card.createEl("div", { cls: "kanban-time" });
                                timeContainer.setText(value);
                            }
                            else if (line.includes("Тег:")) {
                                const tagEl = card.createEl("div", { cls: "kanban-tag" });
                                tagEl.setText(`#${value}`); // Добавляем знак "#"
                                tagEl.style.color = await this.getTagColor(value);
                                const tagColor = await this.getTagColor(value); // Получаем цвет тега
                                tagEl.style.border = `1px solid ${tagColor}`; // Добавляем границу
                            }
                            else if (line.includes("Дополнительно:")) {
                                card.createEl("div", {
                                    text: value,
                                    cls: "kanban-card-option"
                                });
                            }
                            else {
                                card.createEl("div", {
                                    text: value,
                                    cls: "kanban-card-text"
                                });
                            }
                        }
                    });

                    // // Добавляем кнопки при наведении
                    // this.addHoverButtons(card, note);
                });
            });
        }
        else {
            kanbanContainer.createEl("div", {
                text: "Событий на сегодня нет.",
                cls: "kanban-empty"
            });
        }

        // // Создаем контейнер для списка событий
        // const eventsContainer = container.createEl("div", { cls: "today-events" });
        // eventsContainer.createEl("h3", { text: "События на сегодня", cls: "today-events-title" });
        //
        // // Проверяем, есть ли заметки для сегодняшнего дня
        // const file = this.app.vault.getAbstractFileByPath(notePath);
        // if (file) {
        //     this.app.vault.read(file).then((content) => {
        //         const notes = content.split("---").filter(note => note.trim() !== "");
        //
        //         notes.forEach((note) => {
        //             const noteEl = eventsContainer.createEl("div", { cls: "today-event" });
        //
        //             // Разделяем заметку на строки и убираем обозначения
        //             const lines = note.trim().split("\n").filter(line => line.trim() !== "");
        //             lines.forEach(line => {
        //                 // Убираем обозначения (например, "Текст:", "Время:")
        //                 const value = line.split(":**").slice(1).join(":").trim();
        //                 if (value) {
        //                     noteEl.createEl("div", {
        //                         text: value,
        //                         cls: "today-event-text"
        //                     });
        //                 }
        //             });
        //
        //             // Добавляем разделитель между заметками
        //             if (notes.length > 1) {
        //                 eventsContainer.createEl("hr", { cls: "today-event-separator" });
        //             }
        //         });
        //     });
        // } else {
        //     eventsContainer.createEl("div", {
        //         text: "Событий на сегодня нет.",
        //         cls: "today-event-empty"
        //     });
        // }
    }                                                                             // [Генерация событий на сегодня]

    // Переход на текущий день
    goToToday() {
        this.currentDate = new Date(); // Устанавливаем текущую дату
        this.updateCalendar(); // Обновляем календарь
    }

    // Метод обновления календаря при переходе на другие месяцы
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
    isToday(day, month, year) {
        const today = new Date();
        return (
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
        );
    }

    async openEventModal(day, month, year) {
        const dateStr = `${day.toString().padStart(2, '0')}.${(month + 1).toString().padStart(2, '0')}.${year}`;
        const notePath = `${this.settings.storageFolder}/${dateStr}.md`;

        const modal = new obsidian.Modal(this.app);
        modal.titleEl.setText(`События на ${dateStr}`);

        const contentEl = modal.contentEl;

        const file = this.app.vault.getAbstractFileByPath(notePath);
        if (file) {
            this.app.vault.read(file).then((content) => {
                const notes = content.split("---").filter(note => note.trim() !== "");

                notes.forEach((note, index) => {
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
                    // Кнопка редактирования заметки
                    const editButton = contentEl.createEl("button", {
                        text: "✏️",
                        cls: "edit-note-button"
                    });
                    editButton.addEventListener("click", () => {
                        modal.close();
                        this.openEditNoteModal(day, month, year, index);
                    });

                    // Кнопка удаления заметки
                    const deleteButton = contentEl.createEl("button", {
                        text: "🗑️",
                        cls: "delete-note-button"
                    });
                    deleteButton.addEventListener("click", async () => {
                        await this.deleteNote(day, month, year, index, modal);

                        // await this.refreshUI(); // Обновление интерфейса
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
            this.openAddNoteModal(day, month, year).then();
        });

        modal.open();
    }                                                                         // [Открытие заметки из календаря]

    openNoteModal(noteContent) {
        const modal = new obsidian.Modal(this.app);
        modal.titleEl.setText("Просмотр заметки");

        // Создаем контейнер для содержимого модального окна
        const contentEl = modal.contentEl;
        contentEl.addClass("note-modal-content");

        // Разделяем заметку на строки и убираем обозначения
        const lines = noteContent.trim().split("\n").filter(line => line.trim() !== "");
        lines.forEach(line => {
            const value = line.split(":**").slice(1).join(":").trim();
            if (value) {
                // Если строка содержит время, добавляем ее в отдельный контейнер с границей
                if (line.includes("Время:")) {
                    const timeContainer = contentEl.createEl("div", { cls: "note-modal-time" });
                    timeContainer.setText(value);
                }
                else if (line.includes("Дополнительно:")) {
                    const optionContainer = contentEl.createEl("div", { cls: "note-modal-option" });
                    optionContainer.setText(value);
                    // Разделитель
                    contentEl.createEl("div", { cls: "option-divider" });
                }
                else {
                    contentEl.createEl("div", {
                        text: value,
                        cls: "note-modal-text"
                    });
                }
            }
        });

        // Добавляем анимацию открытия модального окна
        modal.onOpen = () => {
            contentEl.style.opacity = "0";
            contentEl.style.transform = "translateY(20px)";
            setTimeout(() => {
                contentEl.style.opacity = "1";
                contentEl.style.transform = "translateY(0)";
            }, 10);
        };

        // Открываем модальное окно
        modal.open();
    }
    addHoverButtons(card, note) {
        // Контейнер для кнопок
        const hoverButtons = card.createEl("div", { cls: "kanban-hover-buttons" });

        // Кнопка "Изменить" (слева)
        const editButton = hoverButtons.createEl("button", {
            text: "✏️",
            cls: "kanban-edit-button"
        });
        editButton.addEventListener("click", () => {
            // Логика для редактирования заметки
            console.log("Редактировать заметку:", note);
        });

        // Кнопка "Закрепить" (по центру)
        const pinButton = hoverButtons.createEl("button", {
            text: "📌",
            cls: "kanban-pin-button"
        });
        pinButton.addEventListener("click", () => {
            // Логика для закрепления заметки
            console.log("Закрепить заметку:", note);
            card.classList.toggle("pinned");
            if (card.classList.contains("pinned")) {
                // Перемещаем карточку в начало списка
                card.parentElement.prepend(card);
            }
        });

        // Кнопка "Удалить" (справа)
        const deleteButton = hoverButtons.createEl("button", {
            text: "🗑️",
            cls: "kanban-delete-button"
        });
        deleteButton.addEventListener("click", () => {
            // Логика для удаления заметки
            console.log("Удалить заметку:", note);
            card.remove();
        });
    }

    // Логика переключения между режимами редактирования и просмотра тегов
    toggleEditMode(tagEl, tag, editButton) {
        const isEditing = tagEl.classList.contains("editing");

        if (isEditing) {
            // Выходим из режима редактирования
            tagEl.classList.remove("editing");

            // Сохраняем изменения
            const nameInput = tagEl.querySelector(".tag-name-input");
            const colorInput = tagEl.querySelector(".tag-color-input");

            if (nameInput && colorInput) {
                const newName = nameInput.value.trim();
                const newColor = colorInput.value;

                if (newName) {
                    tag.name = newName;
                    tag.color = newColor;

                    // Обновляем отображение
                    const nameEl = tagEl.querySelector(".tag-name");
                    const colorCircle = tagEl.querySelector(".tag-color");

                    if (nameEl && colorCircle) {
                        nameEl.setText(newName);
                        colorCircle.style.backgroundColor = newColor;
                    }

                    // Удаляем поля ввода
                    nameInput.replaceWith(nameEl);
                    colorInput.replaceWith(colorCircle);

                    // Сохраняем теги
                    this.saveTags(this.tags);
                } else {
                    alert("Название тега не может быть пустым!");
                }
            }

            // Возвращаем кнопку "Редактировать"
            editButton.setText("Редактировать");
        } else {
            // Входим в режим редактирования
            tagEl.classList.add("editing");

            // Заменяем название тега на поле ввода
            const nameEl = tagEl.querySelector(".tag-name");
            const nameInput = tagEl.createEl("input", {
                type: "text",
                value: tag.name,
                cls: "tag-name-input"
            });
            nameEl.replaceWith(nameInput);

            // Заменяем цвет тега на поле выбора цвета
            const colorCircle = tagEl.querySelector(".tag-color");
            const colorInput = tagEl.createEl("input", {
                type: "color",
                value: tag.color,
                cls: "tag-color-input"
            });
            colorCircle.replaceWith(colorInput);

            // Меняем кнопку "Редактировать" на "Сохранить"
            editButton.setText("Сохранить");
        }
    }

    // async addNewTag(container) {
    //     // const newTag = { name: "Новый тег", color: "#cccccc" };
    //     // this.renderTag(container, newTag);
    //     // this.saveTags();
    //
    //     const newTag = { name: "Новый тег", color: "#cccccc" };
    //     this.renderTag(container, newTag);
    //
    //     // Загружаем текущие теги
    //     const tags = await this.loadTags();
    //
    //     // Добавляем новый тег
    //     tags.push(newTag);
    //
    //     // Сохраняем обновленный список тегов
    //     await this.saveTags(tags);
    // }
    async openTagSettingsModal() {
        // const modal = new obsidian.Modal(this.app);
        // modal.titleEl.setText("Управление тегами");
        //
        // // Создаем контейнер для содержимого модального окна
        // const contentEl = modal.contentEl;
        // contentEl.addClass("tag-settings-modal");
        //
        // // Загружаем текущие теги
        // let tags = await this.loadTags();
        //
        // // Отображаем список тегов
        // const tagsList = contentEl.createEl("div", { cls: "tags-list" });
        // tags.forEach(tag => this.renderTag(tagsList, tag));
        //
        // // Кнопка для добавления нового тега
        // const addTagButton = contentEl.createEl("button", {
        //     text: "Добавить тег",
        //     cls: "add-tag-button"
        // });
        // addTagButton.addEventListener("click", () => this.addNewTag(tagsList));
        //
        // // Открываем модальное окно
        // modal.open();
        const modal = new obsidian.Modal(this.app);
        modal.titleEl.setText("Управление тегами");

        // Создаем контейнер для содержимого модального окна
        const contentEl = modal.contentEl;
        contentEl.addClass("tag-settings-modal");

        // Загружаем текущие теги
        const tags = await this.loadTags();

        // Отображаем список тегов
        const tagsList = contentEl.createEl("div", { cls: "tags-list" });
        tags.forEach(tag => this.renderTag(tagsList, tag));

        // Разделитель
        contentEl.createEl("hr", { cls: "tag-divider" });

        // Создаем контейнер для нового тега
        const newTagContainer = contentEl.createEl("div", { cls: "new-tag-container" });

        // Поле для выбора цвета нового тега
        // contentEl.createEl("label", { text: "Цвет тега:" });
        const newTagColorInput = newTagContainer.createEl("input", {
            type: "color",
            value: "#000000", // Черный цвет по умолчанию
            cls: "new-tag-color"
        });

        // Поле для ввода названия нового тега
        // contentEl.createEl("label", { text: "Название тега:" });
        const newTagNameInput = newTagContainer.createEl("input", {
            type: "text",
            placeholder: "Введите название тега...",
            cls: "new-tag-input"
        });

        // Кнопка для добавления нового тега
        const addTagButton = newTagContainer.createEl("button", {
            text: "+",
            cls: "add-tag-button"
        });
        addTagButton.addEventListener("click", async () => {
            const newTagName = newTagNameInput.value.trim();
            const newTagColor = newTagColorInput.value;

            if (newTagName) {
                // Создаем новый тег
                const newTag = { name: newTagName, color: newTagColor };

                // Добавляем новый тег в список
                tags.push(newTag);

                // Сохраняем обновленный список тегов
                await this.saveTags(tags);

                // Очищаем поля ввода
                newTagNameInput.value = "";
                newTagColorInput.value = "#000000";

                // Обновляем список тегов в модальном окне
                tagsList.empty();
                tags.forEach(tag => this.renderTag(tagsList, tag));
            } else {
                alert("Пожалуйста, введите название тега!");
            }
        });

        // Открываем модальное окно
        modal.open();
    }
    async openAddNoteModal(day, month, year) {
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

        // Поле для выбора тега
        contentEl.createEl("label", { text: "Тег:" });
        const tagSelect = contentEl.createEl("select", {
            cls: "note-input"
        });

        // Загружаем теги и добавляем их в выпадающий список
        const tags = await this.loadTags();

        // Если тегов нет, добавляем опцию для создания нового тега
        if (tags.length === 0) {
            const createTagOption = tagSelect.createEl("option", {
                value: "",
                text: "Создать новый тег",
                disabled: true,
                selected: true
            });
        } else {
            // Добавляем существующие теги в выпадающий список
            tags.forEach(tag => {
                const option = tagSelect.createEl("option", {
                    value: tag.name,
                    text: tag.name
                });
                option.style.color = tag.color; // Устанавливаем цвет текста
            });
        }

        // Поле для создания нового тега (появляется, если тегов нет)
        let newTagNameInput, newTagColorInput;
        const newTagContainer = contentEl.createEl("div", { cls: "new-tag-container" });
        if (tags.length === 0) {
            newTagContainer.createEl("label", { text: "Название тега:" });
            newTagNameInput = newTagContainer.createEl("input", {
                type: "text",
                placeholder: "Введите название тега...",
                cls: "note-input"
            });

            newTagContainer.createEl("label", { text: "Цвет тега:" });
            newTagColorInput = newTagContainer.createEl("input", {
                type: "color",
                cls: "note-input"
            });
        }

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
            let tag = tagSelect.value;

            // Если тегов нет, создаем новый тег
            if (tags.length === 0) {
                if (!newTagNameInput || !newTagColorInput) {
                    alert("Ошибка: поля для создания тега не найдены!");
                    return;
                }

                const newTagName = newTagNameInput.value.trim();
                const newTagColor = newTagColorInput.value;

                if (newTagName) {
                    const newTag = { name: newTagName, color: newTagColor };
                    tags.push(newTag);
                    await this.saveTags(tags); // Сохраняем новый тег
                    tag = newTagName; // Используем новый тег для заметки
                } else {
                    alert("Пожалуйста, введите название тега!");
                    return;
                }
            }

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

                    // Обновляем интерфейс
                    await this.refreshUI();
                } catch (error) {
                    console.error("Ошибка сохранения заметки:", error);
                }
            }
        });

        modal.open();
    }
    async getTagColor(tagName) {
        const tags = await this.loadTags(); // Загружаем теги
        if (!Array.isArray(tags)) {
            console.error("Ошибка: теги не являются массивом!");
            return "#000000"; // Возвращаем черный цвет по умолчанию
        }

        const tag = tags.find(t => t.name === tagName);
        return tag ? tag.color : "#000000"; // Возвращаем цвет тега или черный, если тег не найден
    }
    async loadTags() {
        const tagsFolder = `${this.settings.storageFolder}/tags`;
        const tagsFilePath = `${tagsFolder}/tags.json`;

        // Проверяем, существует ли папка .tags
        const tagsFolderExists = this.app.vault.getAbstractFileByPath(tagsFolder);
        if (!tagsFolderExists) {
            try {
                await this.app.vault.createFolder(tagsFolder);
            } catch (error) {
                console.error("Папка уже существует");
            }
        }

        // Проверяем, существует ли файл tags.json
        const tagsFile = this.app.vault.getAbstractFileByPath(tagsFilePath);
        if (!tagsFile) {
            try {
                await this.app.vault.create(tagsFilePath, JSON.stringify([])); // Создаем файл, если его нет
            } catch (error) {
                console.error("Файл уже существует");
            }
            return []; // Возвращаем пустой массив
        }

        const tagsData = await this.app.vault.read(tagsFile);
        return JSON.parse(tagsData);

        // // Читаем и возвращаем теги из файла
        // try {
        //     const tagsData = await this.app.vault.read(tagsFile);
        //     const tags = JSON.parse(tagsData);
        //
        //     // Убедимся, что tags - это массив
        //     return Array.isArray(tags) ? tags : [];
        // } catch (error) {
        //     console.error("Ошибка загрузки тегов:", error);
        //     return []; // Возвращаем пустой массив в случае ошибки
        // }
    }
    async saveTags(tags) {
        const tagsFolder = `${this.settings.storageFolder}/tags`;
        const tagsFilePath = `${tagsFolder}/tags.json`;

        // Сохраняем теги в файл
        await this.app.vault.adapter.write(tagsFilePath, JSON.stringify(tags, null, 2));
    }

    async deleteNote(day, month, year, index, modal) {
        const dateStr = `${day.toString().padStart(2, '0')}.${(month + 1).toString().padStart(2, '0')}.${year}`;
        const notePath = `${this.settings.storageFolder}/${dateStr}.md`;
        const file = this.app.vault.getAbstractFileByPath(notePath);

        if (file) {
            const content = await this.app.vault.read(file);
            const notes = content.split("---").filter(note => note.trim() !== "");
            const updatedContent = notes.filter((_, i) => i !== index).join("\n\n---\n\n");

            await this.app.vault.modify(file, updatedContent);

            modal.close();

            await this.openEventModal(day, month, year);

            await this.refreshUI();
        }
    }                                                                      // [Удаление заметки]
    async openEditNoteModal(day, month, year, index) {
        const dateStr = `${day.toString().padStart(2, '0')}.${(month + 1).toString().padStart(2, '0')}.${year}`;
        const notePath = `${this.settings.storageFolder}/${dateStr}.md`;
        const file = this.app.vault.getAbstractFileByPath(notePath);

        if (!file) {
            console.error("Файл не найден!");
            return;
        }

        const modal = new obsidian.Modal(this.app);
        modal.titleEl.setText(`Редактировать заметку на ${dateStr}`);

        const contentEl = modal.contentEl;

        // Читаем содержимое файла
        const content = await this.app.vault.read(file);
        const notes = content.split("---").filter(note => note.trim() !== "");
        const noteToEdit = notes[index];

        if (!noteToEdit) {
            console.error("Заметка не найдена!");
            return;
        }

        // Парсим заметку
        const lines = noteToEdit.trim().split("\n").filter(line => line.trim() !== "");
        let noteContent = "";
        let timeFrom = "";
        let timeTo = "";
        let tag = "";

        lines.forEach(line => {
            if (line.startsWith("**Текст:**")) {
                noteContent = line.split(":**")[1].trim();
            } else if (line.startsWith("**Время:**")) {
                const timeParts = line.split(":**")[1].trim().split(" по ");
                timeFrom = timeParts[0].replace("с ", "").trim();
                timeTo = timeParts[1].trim();
            } else if (line.startsWith("**Тег:**")) {
                tag = line.split(":**")[1].trim();
            }
        });

        // Поле для текста заметки
        contentEl.createEl("label", { text: "Текст заметки:" });
        const noteInput = contentEl.createEl("textarea", {
            placeholder: "Введите текст заметки...",
            cls: "note-input",
            value: noteContent
        });

        // Поле для времени "с"
        contentEl.createEl("label", { text: "Время с:" });
        const timeFromInput = contentEl.createEl("input", {
            type: "time",
            cls: "note-input",
            value: timeFrom
        });

        // Поле для времени "по"
        contentEl.createEl("label", { text: "Время по:" });
        const timeToInput = contentEl.createEl("input", {
            type: "time",
            cls: "note-input",
            value: timeTo
        });

        // Поле для выбора тега
        contentEl.createEl("label", { text: "Тег:" });
        const tagSelect = contentEl.createEl("select", {
            cls: "note-input"
        });

        // Загружаем теги и добавляем их в выпадающий список
        const tags = await this.loadTags();
        tags.forEach(t => {
            const option = tagSelect.createEl("option", {
                value: t.name,
                text: t.name
            });
            option.style.color = t.color; // Устанавливаем цвет текста
            if (t.name === tag) {
                option.selected = true; // Выбираем текущий тег
            }
        });

        // Кнопка для сохранения изменений
        const saveButton = contentEl.createEl("button", {
            text: "Сохранить",
            cls: "note-button"
        });
        saveButton.addEventListener("click", async () => {
            const newNoteContent = noteInput.value.trim();
            const newTimeFrom = timeFromInput.value;
            const newTimeTo = timeToInput.value;
            const newTag = tagSelect.value;

            if (newNoteContent) {
                // Обновляем заметку в списке
                notes[index] = [
                    `**Текст:** ${newNoteContent}`,
                    `**Время:** с ${newTimeFrom} по ${newTimeTo}`,
                    `**Тег:** ${newTag}`
                ].join("\n");

                // Сохраняем обновленный список заметок в файл
                const updatedContent = notes.join("\n\n---\n\n");
                await this.app.vault.modify(file, updatedContent);

                // Закрываем модальное окно
                modal.close();

                // Обновляем интерфейс
                await this.refreshUI();
            } else {
                alert("Пожалуйста, введите текст заметки!");
            }
        });

        // Открываем модальное окно
        modal.open();
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