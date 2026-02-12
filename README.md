# ReBorn ToDo App

`todo-app/` 폴더의 순수 HTML/CSS/Vanilla JS 기반 할 일 관리 앱입니다.  
현재 동작 기준 상세 정의는 `ToDoApp_명세서.md`를 참고하세요.

## 실행 방법

### 1) 권장: 로컬 서버 실행

프로젝트 루트에서:

```bash
npx serve todo-app
```

또는:

```bash
cd todo-app && python3 -m http.server 8080
```

- `npx serve`: 기본 `http://localhost:3000`
- `python`: `http://localhost:8080`

### 2) 직접 파일 열기

`todo-app/index.html`을 브라우저에서 바로 열어도 실행됩니다.  
단, 로컬 스토리지는 브라우저/도메인 정책의 영향을 받습니다.

## 주요 기능

- **멀티 뷰 네비게이션**
  - 하단 탭: `ToDo`, `시간`, `ReBorn`, `미룬 항목`, `설정`
  - 기본 진입 화면: `ReBorn`
- **할 일 관리**
  - 추가/수정/삭제, 완료 토글, 미루기, 서브태스크, 태그
  - 정렬: `기본순`, `최신순`, `오래된순`
  - `미완료 우선` 토글
- **일정 기능**
  - 단일 날짜, 기간(시작~종료), 반복 요일(복수 선택)
  - D-day 표시
- **ReBorn 캘린더**
  - 일정 칩 + 반복/기간 바 렌더링
  - 일정별 색상 변경
  - 캘린더 항목 클릭 완료 모달(`완료`, `전부 완료`)
  - `오늘 일정`, `다가오는 일정`, `완료 일정(열람형 토글)`
- **휴지통**
  - 삭제 항목 보관, 그룹(미완료/완료) 표시, 복원, 비우기
  - 열람형 토글 UI
- **공휴일**
  - Nager.Date API 기반 한국 공휴일 + 대체공휴일 보정 로직
- **UI/UX**
  - 다크/라이트 테마, 고정 헤더/하단 네비, 반응형, 모달 인터랙션
  - Lucide 아이콘 사용

## 기술 스택

- HTML5
- CSS3 (반응형/테마 변수)
- Vanilla JavaScript
- LocalStorage
- Lucide Icons (CDN)
- Nager.Date API (공휴일 데이터)

## 디렉토리

- `todo-app/index.html` : 앱 마크업
- `todo-app/styles.css` : 전체 스타일
- `todo-app/app.js` : 상태/렌더링/이벤트/로직
- `ToDoApp_명세서.md` : 최신 기능 명세
