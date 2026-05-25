---
sidebar_position: 2
---

# ADO.NET: повний CRUD-репозиторій

## Патерн Repository

Для зручності роботи з БД виносять всі SQL-операції в окремий клас — **репозиторій**. Код вікна не знає про SQL взагалі, тільки викликає методи репозиторію.

```
MainWindow
    └── StudentRepository       ← весь SQL тут
            └── SqliteConnection ← з'єднання з БД
```

## Модель та репозиторій

### Клас-модель

```csharp
public class Student
{
    public int    Id    { get; set; }
    public string Name  { get; set; } = string.Empty;
    public int    Grade { get; set; }
    public string Email { get; set; } = string.Empty;
}
```

### Повний StudentRepository

```csharp
using Microsoft.Data.Sqlite;

public class StudentRepository
{
    private readonly string _connectionString;

    public StudentRepository(string dbPath = "students.db")
    {
        _connectionString = $"Data Source={dbPath}";
        InitializeDatabase();
    }

    // ── Ініціалізація ──────────────────────────────────────────────

    private void InitializeDatabase()
    {
        using var conn = OpenConnection();
        using var cmd  = conn.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS students (
                id    INTEGER PRIMARY KEY AUTOINCREMENT,
                name  TEXT    NOT NULL,
                grade INTEGER NOT NULL DEFAULT 0,
                email TEXT    NOT NULL DEFAULT ''
            )
            """;
        cmd.ExecuteNonQuery();
    }

    private SqliteConnection OpenConnection()
    {
        var conn = new SqliteConnection(_connectionString);
        conn.Open();
        return conn;
    }

    // ── CREATE ─────────────────────────────────────────────────────

    public Student Add(Student student)
    {
        using var conn = OpenConnection();
        using var cmd  = conn.CreateCommand();

        cmd.CommandText = """
            INSERT INTO students (name, grade, email)
            VALUES ($name, $grade, $email);
            SELECT last_insert_rowid();
            """;
        cmd.Parameters.AddWithValue("$name",  student.Name);
        cmd.Parameters.AddWithValue("$grade", student.Grade);
        cmd.Parameters.AddWithValue("$email", student.Email);

        student.Id = (int)(long)cmd.ExecuteScalar();
        return student;
    }

    // ── READ ────────────────────────────────────────────────────────

    public List<Student> GetAll()
    {
        using var conn    = OpenConnection();
        using var cmd     = conn.CreateCommand();
        cmd.CommandText   = "SELECT id, name, grade, email FROM students ORDER BY name";

        var students = new List<Student>();
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
            students.Add(MapStudent(reader));

        return students;
    }

    public Student? GetById(int id)
    {
        using var conn = OpenConnection();
        using var cmd  = conn.CreateCommand();
        cmd.CommandText = "SELECT id, name, grade, email FROM students WHERE id = $id";
        cmd.Parameters.AddWithValue("$id", id);

        using var reader = cmd.ExecuteReader();
        return reader.Read() ? MapStudent(reader) : null;
    }

    public List<Student> Search(string query)
    {
        using var conn = OpenConnection();
        using var cmd  = conn.CreateCommand();
        cmd.CommandText = """
            SELECT id, name, grade, email FROM students
            WHERE name LIKE $query OR email LIKE $query
            ORDER BY name
            """;
        cmd.Parameters.AddWithValue("$query", $"%{query}%");

        var result = new List<Student>();
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
            result.Add(MapStudent(reader));

        return result;
    }

    public List<Student> GetByMinGrade(int minGrade)
    {
        using var conn = OpenConnection();
        using var cmd  = conn.CreateCommand();
        cmd.CommandText = """
            SELECT id, name, grade, email FROM students
            WHERE grade >= $min
            ORDER BY grade DESC
            """;
        cmd.Parameters.AddWithValue("$min", minGrade);

        var result = new List<Student>();
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
            result.Add(MapStudent(reader));

        return result;
    }

    public int GetCount()
    {
        using var conn = OpenConnection();
        using var cmd  = conn.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM students";
        return (int)(long)cmd.ExecuteScalar();
    }

    public double GetAverageGrade()
    {
        using var conn = OpenConnection();
        using var cmd  = conn.CreateCommand();
        cmd.CommandText = "SELECT AVG(grade) FROM students";
        var result = cmd.ExecuteScalar();
        return result == DBNull.Value ? 0 : Convert.ToDouble(result);
    }

    // ── UPDATE ──────────────────────────────────────────────────────

    public bool Update(Student student)
    {
        using var conn = OpenConnection();
        using var cmd  = conn.CreateCommand();
        cmd.CommandText = """
            UPDATE students
            SET name = $name, grade = $grade, email = $email
            WHERE id = $id
            """;
        cmd.Parameters.AddWithValue("$name",  student.Name);
        cmd.Parameters.AddWithValue("$grade", student.Grade);
        cmd.Parameters.AddWithValue("$email", student.Email);
        cmd.Parameters.AddWithValue("$id",    student.Id);

        return cmd.ExecuteNonQuery() > 0; // true = знайдено і оновлено
    }

    // ── DELETE ──────────────────────────────────────────────────────

    public bool Delete(int id)
    {
        using var conn = OpenConnection();
        using var cmd  = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM students WHERE id = $id";
        cmd.Parameters.AddWithValue("$id", id);

        return cmd.ExecuteNonQuery() > 0;
    }

    public void DeleteAll()
    {
        using var conn = OpenConnection();
        using var cmd  = conn.CreateCommand();
        cmd.CommandText = "DELETE FROM students";
        cmd.ExecuteNonQuery();
    }

    // ── Маппінг ─────────────────────────────────────────────────────

    private static Student MapStudent(SqliteDataReader r) => new Student
    {
        Id    = r.GetInt32(r.GetOrdinal("id")),
        Name  = r.GetString(r.GetOrdinal("name")),
        Grade = r.GetInt32(r.GetOrdinal("grade")),
        Email = r.GetString(r.GetOrdinal("email")),
    };
}
```

## Транзакції

**Транзакція** — група операцій, які або всі виконуються успішно, або всі скасовуються. Якщо одна з операцій провалиться — БД повертається до стану до початку транзакції.

```csharp
public void TransferGrade(int fromId, int toId, int points)
{
    using var conn = OpenConnection();
    using var tx   = conn.BeginTransaction(); // починаємо транзакцію

    try
    {
        // Операція 1: зменшити оцінку
        using var cmd1 = conn.CreateCommand();
        cmd1.Transaction = tx;
        cmd1.CommandText = "UPDATE students SET grade = grade - $pts WHERE id = $id";
        cmd1.Parameters.AddWithValue("$pts", points);
        cmd1.Parameters.AddWithValue("$id",  fromId);
        cmd1.ExecuteNonQuery();

        // Операція 2: збільшити оцінку
        using var cmd2 = conn.CreateCommand();
        cmd2.Transaction = tx;
        cmd2.CommandText = "UPDATE students SET grade = grade + $pts WHERE id = $id";
        cmd2.Parameters.AddWithValue("$pts", points);
        cmd2.Parameters.AddWithValue("$id",  toId);
        cmd2.ExecuteNonQuery();

        tx.Commit(); // фіксуємо зміни
    }
    catch
    {
        tx.Rollback(); // скасовуємо — обидві операції відміняються
        throw;
    }
}
```

## Зв'язки між таблицями (JOIN)

Реляційні БД пов'язують таблиці через **зовнішні ключі** (Foreign Key).

```sql
-- Таблиця груп
CREATE TABLE IF NOT EXISTS groups (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

-- Таблиця студентів зі зовнішнім ключем
CREATE TABLE IF NOT EXISTS students (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name     TEXT    NOT NULL,
    grade    INTEGER NOT NULL,
    group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL
);
```

**JOIN** — об'єднання даних з двох таблиць:

```sql
-- Студенти разом з назвою своєї групи
SELECT s.id, s.name, s.grade, g.name AS group_name
FROM students s
LEFT JOIN groups g ON s.group_id = g.id
ORDER BY g.name, s.name;
```

```csharp
public List<(Student student, string groupName)> GetAllWithGroup()
{
    using var conn = OpenConnection();
    using var cmd  = conn.CreateCommand();
    cmd.CommandText = """
        SELECT s.id, s.name, s.grade, s.email,
               COALESCE(g.name, 'Без групи') AS group_name
        FROM students s
        LEFT JOIN groups g ON s.group_id = g.id
        ORDER BY g.name, s.name
        """;

    var result = new List<(Student, string)>();
    using var reader = cmd.ExecuteReader();
    while (reader.Read())
    {
        var student   = MapStudent(reader);
        string grpName = reader.GetString(reader.GetOrdinal("group_name"));
        result.Add((student, grpName));
    }
    return result;
}
```

## Масова вставка (batch insert)

Вставка кожного запису окремим з'єднанням повільна. Для масової вставки використовуємо одне з'єднання та транзакцію:

```csharp
public void AddMany(IEnumerable<Student> students)
{
    using var conn = OpenConnection();
    using var tx   = conn.BeginTransaction();
    using var cmd  = conn.CreateCommand();

    cmd.Transaction = tx;
    cmd.CommandText = "INSERT INTO students (name, grade, email) VALUES ($n, $g, $e)";

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

Транзакція тут не лише для цілісності — SQLite виконує запис на диск після кожного `ExecuteNonQuery()` без транзакції, тобто вставка 1000 рядків займе ~10 секунд. З транзакцією — менше секунди.
