---
sidebar_position: 4
---

# Зв'язки між таблицями та транзакції

## Зв'язки між таблицями

Реляційні бази даних зберігають пов'язані дані у **різних таблицях**, з'єднаних через **зовнішні ключі** (Foreign Key).

### Типи зв'язків

| Тип | Приклад | Реалізація |
|---|---|---|
| **Один-до-багатьох** (1:N) | Група → Студенти | `students.group_id` → `groups.id` |
| **Багато-до-одного** (N:1) | Студент → Група | те саме, інша сторона |
| **Один-до-одного** (1:1) | Студент → Паспорт | унікальний зовнішній ключ |
| **Багато-до-багатьох** (N:M) | Студенти ↔ Курси | проміжна таблиця |

### Схема "Студенти — Групи"

```
groups                 students
┌────┬──────┐          ┌────┬──────────┬───────┬──────────┐
│ id │ name │          │ id │ name     │ grade │ group_id │
├────┼──────┤          ├────┼──────────┼───────┼──────────┤
│  1 │ ПЗ-21│◄─────────┤  1 │ О.Коваль │    92 │        1 │
│  2 │ ПЗ-22│          │  2 │ А.Мороз  │    78 │        1 │
└────┴──────┘          │  3 │ М.Биков  │    95 │        2 │
                       └────┴──────────┴───────┴──────────┘
```

### Створення таблиць зі зв'язком

```csharp
private void EnsureCreated()
{
    using var conn = Open();
    using var cmd  = conn.CreateCommand();

    // Спочатку батьківська таблиця
    cmd.CommandText = """
        CREATE TABLE IF NOT EXISTS groups (
            id   INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT    NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS students (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            name     TEXT    NOT NULL,
            grade    INTEGER NOT NULL DEFAULT 0,
            group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL
        );
        """;
    cmd.ExecuteNonQuery();
}
```

`REFERENCES groups(id)` — зовнішній ключ. `ON DELETE SET NULL` — якщо групу видалено, `group_id` у студентів стає `NULL` (замість помилки).

### JOIN: об'єднання таблиць

```sql
-- INNER JOIN: тільки студенти, у яких є група
SELECT s.id, s.name, s.grade, g.name AS group_name
FROM students s
INNER JOIN groups g ON s.group_id = g.id;

-- LEFT JOIN: всі студенти, для тих без групи — NULL
SELECT s.id, s.name, s.grade,
       COALESCE(g.name, 'Без групи') AS group_name
FROM students s
LEFT JOIN groups g ON s.group_id = g.id
ORDER BY g.name, s.name;
```

### JOIN у C# (ADO.NET)

```csharp
public record StudentWithGroup(int Id, string Name, int Grade, string GroupName);

public List<StudentWithGroup> GetAllWithGroup()
{
    using var conn = Open();
    using var cmd  = conn.CreateCommand();
    cmd.CommandText = """
        SELECT s.id, s.name, s.grade,
               COALESCE(g.name, 'Без групи') AS group_name
        FROM students s
        LEFT JOIN groups g ON s.group_id = g.id
        ORDER BY g.name, s.name
        """;

    var result = new List<StudentWithGroup>();
    using var r = cmd.ExecuteReader();
    while (r.Read())
    {
        result.Add(new StudentWithGroup(
            Id:        r.GetInt32(r.GetOrdinal("id")),
            Name:      r.GetString(r.GetOrdinal("name")),
            Grade:     r.GetInt32(r.GetOrdinal("grade")),
            GroupName: r.GetString(r.GetOrdinal("group_name"))
        ));
    }
    return result;
}
```

---

## Транзакції

**Транзакція** — набір операцій, які виконуються як єдине ціле. Або всі операції успішні (`COMMIT`), або всі скасовуються (`ROLLBACK`).

### Навіщо потрібні транзакції

```
Без транзакції:               З транзакцією:
─────────────────────         ──────────────────────────
INSERT student ✓              BEGIN TRANSACTION
INSERT grade   ✗ (помилка)    INSERT student ✓
                              INSERT grade   ✗ (помилка)
Результат: студент є,         ROLLBACK
але оцінки немає — помилка!   Результат: нічого не збережено ✓
```

### Синтаксис у ADO.NET

```csharp
public void AddStudentWithGrades(Student student, List<int> grades)
{
    using var conn = Open();
    using var tx   = conn.BeginTransaction();

    try
    {
        // Операція 1: вставити студента
        using var insertCmd = conn.CreateCommand();
        insertCmd.Transaction = tx;
        insertCmd.CommandText = """
            INSERT INTO students (name, grade) VALUES ($n, $g);
            SELECT last_insert_rowid();
            """;
        insertCmd.Parameters.AddWithValue("$n", student.Name);
        insertCmd.Parameters.AddWithValue("$g", student.Grade);
        int newId = (int)(long)insertCmd.ExecuteScalar();

        // Операція 2: вставити всі оцінки
        foreach (int g in grades)
        {
            using var gradeCmd = conn.CreateCommand();
            gradeCmd.Transaction = tx;
            gradeCmd.CommandText = "INSERT INTO grades (student_id, value) VALUES ($sid, $val)";
            gradeCmd.Parameters.AddWithValue("$sid", newId);
            gradeCmd.Parameters.AddWithValue("$val", g);
            gradeCmd.ExecuteNonQuery();
        }

        tx.Commit();  // ← всі операції успішні → зберігаємо
    }
    catch
    {
        tx.Rollback(); // ← щось пішло не так → скасовуємо все
        throw;
    }
}
```

### Транзакція для масової вставки

Важлива деталь SQLite: без транзакції кожен `INSERT` — це окрема операція запису на диск. 1000 вставок без транзакції ≈ 5–10 секунд. З транзакцією — менше 100 мс.

```csharp
public void BulkInsert(IEnumerable<Student> students)
{
    using var conn = Open();
    using var tx   = conn.BeginTransaction();
    using var cmd  = conn.CreateCommand();

    cmd.Transaction = tx;
    cmd.CommandText = "INSERT INTO students (name, grade, email) VALUES ($n, $g, $e)";

    // Додаємо параметри один раз і перевикористовуємо
    var pName  = cmd.Parameters.Add("$n", SqliteType.Text);
    var pGrade = cmd.Parameters.Add("$g", SqliteType.Integer);
    var pEmail = cmd.Parameters.Add("$e", SqliteType.Text);

    foreach (var s in students)
    {
        pName.Value  = s.Name;
        pGrade.Value = s.Grade;
        pEmail.Value = s.Email;
        cmd.ExecuteNonQuery();
    }

    tx.Commit();
}
```

---

## Підсумок теми

### Що вивчили

| Концепція | Інструмент |
|---|---|
| Підключення до SQLite | `SqliteConnection` |
| Виконання SQL | `SqliteCommand` |
| Читання результатів | `SqliteDataReader` |
| Захист від SQL-ін'єкцій | `cmd.Parameters.AddWithValue()` |
| Зв'язки між таблицями | `FOREIGN KEY`, `JOIN` |
| Атомарні операції | `BeginTransaction()` / `Commit()` / `Rollback()` |
| Патерн репозиторій | Клас із методами CRUD |

### Коли використовувати ADO.NET

- Потрібна **максимальна продуктивність** (складні запити, великі обсяги даних)
- Запити надто **специфічні** для ORM (складні JOIN, оконні функції, рекурсивні CTE)
- **Навчальний контекст** — розуміння як все працює на низькому рівні

Для більшості продуктових проектів поверх ADO.NET використовують **Entity Framework Core** — ORM, що автоматизує роботу з БД через C#-класи. Це тема наступної лекції.
