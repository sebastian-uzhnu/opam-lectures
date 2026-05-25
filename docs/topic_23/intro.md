---
sidebar_position: 1
---

# Реляційні БД та ADO.NET

## Що таке реляційна база даних

**База даних (БД)** — організоване сховище даних, що дозволяє швидко зберігати, шукати та змінювати інформацію. **Реляційна** БД зберігає дані у таблицях зі рядками та стовпцями — як Excel, але з потужними можливостями запитів.

```
Таблиця students:
┌────┬──────────────┬──────┬──────────────────────┐
│ id │ name         │grade │ email                │
├────┼──────────────┼──────┼──────────────────────┤
│  1 │ Олена Коваль │   92 │ o.koval@uni.edu      │
│  2 │ Андрій Мороз │   78 │ a.moroz@uni.edu      │
│  3 │ Марія Биков  │   95 │ m.bykova@uni.edu     │
└────┴──────────────┴──────┴──────────────────────┘
```

**СУБД (система управління БД)** — програма, яка керує базою. Популярні варіанти:

| СУБД | Особливість |
|---|---|
| **SQLite** | Файлова БД, без сервера, ідеальна для десктоп-додатків |
| **PostgreSQL** | Потужна відкрита СУБД для серверів |
| **MySQL / MariaDB** | Поширена у веб-розробці |
| **Microsoft SQL Server** | Корпоративна СУБД від Microsoft |
| **SQL Server LocalDB** | Локальна версія MS SQL для розробки |

У цій лекції використовуємо **SQLite** — вона не потребує окремого сервера, весь файл БД — це один `.db` файл на диску.

## Основи SQL

**SQL (Structured Query Language)** — мова для роботи з реляційними БД.

### DDL — визначення структури

```sql
-- Створення таблиці
CREATE TABLE IF NOT EXISTS students (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT    NOT NULL,
    grade INTEGER NOT NULL DEFAULT 0,
    email TEXT    UNIQUE
);

-- Видалення таблиці
DROP TABLE IF EXISTS students;
```

### DML — маніпуляція даними (CRUD)

```sql
-- CREATE — додати запис
INSERT INTO students (name, grade, email)
VALUES ('Олена Коваль', 92, 'o.koval@uni.edu');

-- READ — прочитати дані
SELECT * FROM students;
SELECT name, grade FROM students WHERE grade >= 90 ORDER BY grade DESC;

-- UPDATE — оновити запис
UPDATE students SET grade = 95 WHERE id = 1;

-- DELETE — видалити запис
DELETE FROM students WHERE id = 2;
```

### Агрегатні функції

```sql
SELECT COUNT(*)       FROM students;           -- кількість рядків
SELECT AVG(grade)     FROM students;           -- середня оцінка
SELECT MAX(grade)     FROM students;           -- максимальна
SELECT MIN(grade)     FROM students;           -- мінімальна
SELECT SUM(grade)     FROM students;           -- сума
```

## Рівні доступу до БД у .NET

```
Рівні абстракції:
                    ┌──────────────────────────┐
    Вищий рівень    │   Entity Framework Core  │  ← (Тема 24: ORM)
                    ├──────────────────────────┤
    Нижчий рівень   │       ADO.NET            │  ← SQL вручну, максимум контролю
                    ├──────────────────────────┤
                    │   SQLite / SQL Server    │  ← сама база даних
                    └──────────────────────────┘
```

У цій темі вивчаємо **ADO.NET** — фундаментальний рівень роботи з БД. Розуміння ADO.NET є необхідною базою перед вивченням ORM (Entity Framework Core у Темі 24).

## ADO.NET: базові концепції

**ADO.NET** — вбудований .NET API для прямої роботи з БД через SQL. Основні класи для SQLite:

```csharp
using Microsoft.Data.Sqlite; // NuGet: Microsoft.Data.Sqlite
```

| Клас | Роль |
|---|---|
| `SqliteConnection` | З'єднання з базою даних |
| `SqliteCommand` | SQL-команда для виконання |
| `SqliteDataReader` | Читання результатів запиту рядок за рядком |
| `SqliteParameter` | Параметр запиту (захист від SQL-ін'єкцій) |

### Підключення до SQLite

```csharp
// Connection string для SQLite — шлях до файлу БД
string connectionString = "Data Source=myapp.db";

using var connection = new SqliteConnection(connectionString);
connection.Open(); // відкрити з'єднання

// ... робота з БД ...

// using автоматично закриє з'єднання
```

:::tip Файл БД
SQLite створює файл `myapp.db` у поточній директорії програми. Якщо файл не існує — SQLite створить його автоматично при першому підключенні.
:::

## Перший повний приклад: ADO.NET

```csharp
using Microsoft.Data.Sqlite;

// 1. Підключення
using var conn = new SqliteConnection("Data Source=students.db");
conn.Open();

// 2. Створення таблиці
using (var cmd = conn.CreateCommand())
{
    cmd.CommandText = """
        CREATE TABLE IF NOT EXISTS students (
            id    INTEGER PRIMARY KEY AUTOINCREMENT,
            name  TEXT    NOT NULL,
            grade INTEGER NOT NULL
        )
        """;
    cmd.ExecuteNonQuery(); // для INSERT/UPDATE/DELETE/CREATE
}

// 3. Вставка запису (ЗАВЖДИ використовуємо параметри!)
using (var cmd = conn.CreateCommand())
{
    cmd.CommandText = "INSERT INTO students (name, grade) VALUES ($name, $grade)";
    cmd.Parameters.AddWithValue("$name",  "Олена Коваль");
    cmd.Parameters.AddWithValue("$grade", 92);
    int rowsAffected = cmd.ExecuteNonQuery();
}

// 4. Читання даних
using (var cmd = conn.CreateCommand())
{
    cmd.CommandText = "SELECT id, name, grade FROM students ORDER BY grade DESC";
    using var reader = cmd.ExecuteReader();

    while (reader.Read())
    {
        int    id    = reader.GetInt32(0);   // за індексом стовпця
        string name  = reader.GetString(1);
        int    grade = reader.GetInt32(2);
        // або за назвою: reader.GetString(reader.GetOrdinal("name"))

        Console.WriteLine($"{id}: {name} — {grade}");
    }
}
```

## SQL-ін'єкції та параметризовані запити

:::danger Ніколи не конкатенуйте рядки у SQL!
```csharp
// ❌ НЕБЕЗПЕЧНО — SQL-ін'єкція!
string name = userInput; // наприклад: "'; DROP TABLE students; --"
cmd.CommandText = $"SELECT * FROM students WHERE name = '{name}'";

// ✅ ПРАВИЛЬНО — параметризований запит
cmd.CommandText = "SELECT * FROM students WHERE name = $name";
cmd.Parameters.AddWithValue("$name", name);
```

SQL-ін'єкція — атака, при якій зловмисник додає свій SQL-код через вхідні дані. Параметризовані запити повністю захищають від цього, бо параметри передаються окремо від SQL-тексту.
:::

## ExecuteNonQuery vs ExecuteReader vs ExecuteScalar

```csharp
// ExecuteNonQuery — для INSERT, UPDATE, DELETE, CREATE
// Повертає кількість змінених рядків
int affected = cmd.ExecuteNonQuery();

// ExecuteReader — для SELECT з кількома рядками
using var reader = cmd.ExecuteReader();
while (reader.Read()) { /* ... */ }

// ExecuteScalar — для SELECT що повертає одне значення
cmd.CommandText = "SELECT COUNT(*) FROM students";
long count = (long)cmd.ExecuteScalar();

cmd.CommandText = "SELECT MAX(grade) FROM students";
object maxGrade = cmd.ExecuteScalar(); // може бути DBNull.Value якщо таблиця пуста
```

## Отримання id останнього вставленого запису

```csharp
cmd.CommandText = """
    INSERT INTO students (name, grade) VALUES ($name, $grade);
    SELECT last_insert_rowid();
    """;
cmd.Parameters.AddWithValue("$name",  "Новий студент");
cmd.Parameters.AddWithValue("$grade", 85);

long newId = (long)cmd.ExecuteScalar();
Console.WriteLine($"Створено студента з id = {newId}");
```
