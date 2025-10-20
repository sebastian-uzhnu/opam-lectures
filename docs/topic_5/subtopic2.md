# Взаємодія з Git

## Основні команди Git

| Команда                        | Призначення                                |
|--------------------------------|--------------------------------------------|
| `git init`                     | Створює новий репозиторій у поточній папці |
| `git clone <url>`              | Клонує віддалений репозиторій              |
| `git status`                   | Перевіряє статус файлів                    |
| `git add <file>` / `git add .` | Додає файл(и) до індексу                   |
| `git commit -m "повідомлення"` | Створює коміт                              |
| `git log`                      | Виводить історію комітів                   |
| `git branch`                   | Переглядає або створює гілки               |
| `git checkout <branch>`        | Перемикається на гілку                     |
| `git merge <branch>`           | Об'єднує гілки                             |
| `git pull`                     | Завантажує зміни з віддаленого репозиторію |
| `git push`                     | Надсилає зміни до віддаленого репозиторію  |

---

## Git Config — конфігурація користувача

Git зберігає налаштування у спеціальному файлі `.gitconfig`. Цей файл може існувати на кількох рівнях:

- Системний (--system) — для всіх користувачів (наприклад, `/etc/gitconfig`)
- Глобальний (--global) — для поточного користувача (`~/.gitconfig`)
- Локальний (--local) — для конкретного проєкту (`.git/config`)

Перевірити конфігурацію:

```bash
git config --list
```

### Основні команди конфігурації:

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
git config --global core.editor "code --wait"
git config --global init.defaultBranch main
```

Щоб задати конфігурацію тільки для поточного репозиторію (локально):

```bash
git config --local user.name "Project Name"
git config --local user.email "project@mail.com"
```

### Очистка або видалення налаштувань:

```bash
git config --global --unset user.name
git config --global --unset user.email
```

Або вручну відредагувати файл:

```bash
git config --global --edit
```

---

## Використання GitHub

GitHub — це найпопулярніша хостинг-платформа для Git-репозиторіїв. Вона надає зручний веб-інтерфейс, інструменти для
командної роботи та інтеграцію з CI/CD.

Основні команди для підключення:

```bash
git remote add origin git@github.com:username/repo.git
git push -u origin main
```

---

## Як створити локальний репозиторій і під’єднати його до віддаленого

1. Створіть новий локальний репозиторій (перейдіть у папку вашого проєкту та виконайте):

```bash
git init
```

2. Додайте файли до індексу:

```bash
git add
```

3. Створіть перший коміт

```bash
git commit -m "Initial commit"
```

4. Створіть новий репозиторій на GitHub.

На сайті GitHub натисніть New Repository, задайте назву, наприклад my-project, і створіть його без README (щоб уникнути
конфліктів при push).
Скопіюйте **https** посилання для використання в наступному кроці

5. Підключіть віддалений репозиторій до локального

```bash
git remote add origin https://github.com/username/my-project.git
```

> https://github.com/username/my-project.git - це посилання до вашого репозиторію

6. Виконайте перше надсилання на GitHub

```bash
git push -u origin main
```

7. Тепер репозиторій синхронізовано

Усі подальші зміни можна комітити й надсилати командою:

```bash
git add .
git commit -m "Опис змін"
git push
```

## Хороші практики для назви комітів

- Один коміт = одна логічна зміна.
- Повідомлення має бути коротким, інформативним:
    - ✅ Fix bug in authentication flow
    - ✅ Add email validation to registration

---

## Поради та найкращі практики роботи з Git

- Комітіть часто, але логічно.
- Створюйте окремі гілки для кожної фічі.
- Регулярно оновлюйте локальну гілку (git pull --rebase).
- Використовуйте `.gitignore`, щоб не відстежувати непотрібні файли.
- Не зберігайте паролі чи ключі в репозиторії.
- Перевіряйте коміти перед push.


