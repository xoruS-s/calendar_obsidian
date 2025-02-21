export const VIEW_TYPE_CALENDAR = 'calendar-view';

export class CalendarView {
    constructor(leaf, settings) {
        this.leaf = leaf;
        this.settings = settings;
    }

    getViewType() {
        return VIEW_TYPE_CALENDAR;
    }

    getDisplayText() {
        return "Calendar View";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl("h1", { text: "Simple Calendar" });

        const calendarEl = container.createEl("div", { cls: "calendar" });
        this.renderCalendar(calendarEl);
    }

    async onClose() {
        // Clean up resources if necessary
    }

    renderCalendar(container) {
        const today = new Date();
        const month = today.getMonth();
        const year = today.getFullYear();

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();

        const calendarGrid = container.createEl("div", { cls: "calendar-grid" });

        // Render days of the week
        const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        daysOfWeek.forEach(day => {
            calendarGrid.createEl("div", { cls: "calendar-day-header", text: day });
        });

        // Render days of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarGrid.createEl("div", { cls: "calendar-day empty" });
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = calendarGrid.createEl("div", { cls: "calendar-day", text: day.toString() });
            dayEl.addEventListener("click", () => {
                this.createDailyNote(day, month, year);
            });
        }
    }

    async createDailyNote(day, month, year) {
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const notePath = `${this.settings.defaultNoteFolder}/${dateStr}.md`;

        try {
            const file = this.app.vault.getAbstractFileByPath(notePath);
            if (file) {
                this.app.workspace.openLinkText(notePath, '', false);
            } else {
                await this.app.vault.create(notePath, `# ${dateStr}\n\nWrite your daily notes here.`);
                this.app.workspace.openLinkText(notePath, '', false);
            }
        } catch (error) {
            console.error("Error creating daily note:", error);
        }
    }
}