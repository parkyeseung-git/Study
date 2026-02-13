# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 언어 규칙

- 모든 출력(결과값, 설명, 주석, 커밋 메시지, 코드 내 문자열 등)은 **반드시 한글**로 작성한다.
- 코드 내 사용자에게 보이는 텍스트(UI 문구, 알림, 에러 메시지 등)도 한글로 작성한다.
- 변수명·함수명 등 코드 식별자는 영문을 유지하되, 주석과 설명은 한글로 작성한다.

## Project Overview

**ReBorn** — a schedule-focused personal task management web app built with pure HTML/CSS/Vanilla JS (no frameworks, no build tools). All UI text and comments are in Korean. The detailed feature specification lives in `ToDoApp_명세서.md`.

## Running the App

```bash
npx serve todo-app          # http://localhost:3000
# or
cd todo-app && python3 -m http.server 8080  # http://localhost:8080
```

No build step, no package manager, no dependencies to install. Open `todo-app/index.html` directly in a browser also works.

## Architecture

The entire app is three files in `todo-app/`:

- **index.html** — markup with `<template>` elements used for todo item cloning
- **styles.css** (~2100 lines) — CSS custom properties for dark/light theming, grid-based calendar layout, responsive breakpoint at 520px
- **app.js** (~1900 lines) — all state, logic, rendering, and event handling in one file

### app.js Structure (top to bottom)

1. **Constants & DOM references** — element selectors, motivational quotes
2. **Global state** — `todos[]`, `deletedTodos[]`, theme, calendar state
3. **Theme system** — toggle + localStorage persistence (`todoapp-theme`)
4. **Modal systems** — snooze confirmation, delete confirmation, color picker, calendar completion
5. **Data management** — shape validation, load/save to localStorage (`todoapp-todos`, `todoapp-trash`), snooze expiration logic
6. **Filtering & sorting** — tag filters, sort modes, incomplete-first toggle
7. **Calendar logic** — date calculations, recurring schedule handling, holiday integration (Nager.Date API for Korean holidays + substitute holiday correction), calendar grid rendering
8. **Trash management** — soft delete, restore, empty trash
9. **Event handlers & initialization**

### Data Flow

```
LocalStorage ↔ State (todos/deletedTodos arrays) → DOM rendering
```

All mutations follow: load → modify state → save to localStorage → re-render DOM.

### Todo Data Shape

Key fields: `id`, `title`, `completed`, `dueDate` (start), `dueEndDate` (range end), `repeatDays` (array of 0-6 for recurring), `scheduleColor`, `completedDates` (per-occurrence tracking), `subtasks[]`, `tags[]`, `snoozeUntil`, `deletedAt`.

## External Dependencies (CDN)

- **Lucide Icons** — loaded via CDN script tag
- **Google Fonts** — Noto Sans KR, DM Sans
- **Nager.Date API** — fetches Korean public holidays with fallback to hardcoded dates

## Key Technical Details

- XSS prevention via `escapeHtml()` utility function
- Dynamic text color contrast calculated using YIQ formula (for schedule color chips)
- Calendar renders single-date tasks as chips, range/recurring tasks as horizontal bars
- Accessibility: ARIA attributes, keyboard nav, focus-visible states, `prefers-reduced-motion` support
- Navigation tabs: ToDo, 시간 (placeholder), ReBorn (default entry), 미룬 항목 (snoozed), 설정 (placeholder)

## No Test Suite

There are no automated tests. Testing is manual via browser interaction.
