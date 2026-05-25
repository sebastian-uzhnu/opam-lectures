---
sidebar_position: 1
---

# ORM та концепція Code First

## Що таке ORM

**ORM (Object-Relational Mapper)** — технологія, що автоматично перетворює C#-об'єкти у рядки таблиць і навпаки. Розробник описує структуру даних через класи, а ORM бере на себе:

- Генерацію SQL-запитів
- Створення та оновлення структури таблиць (міграції)
- Відстеження змін в об'єктах
- Завантаження пов'язаних даних

```
Без ORM (ADO.NET):              З ORM (EF Core):
────────────────────────        ──────────────────────────────
var cmd = conn.CreateCommand(); var student = new Student
cmd.CommandText =               {
  "INSERT INTO students          Name  = "Олена",
   (name, grade)                 Grade = 92
   VALUES ($n, $g)";           };
cmd.Parameters...               db.Students.Add(student);
cmd.ExecuteNonQuery();          db.SaveChanges();
```

## Entity Framework Core

**Entity Framework Core** (EF Core) — офіційний ORM від Microsoft для .NET. Підтримує SQLite, PostgreSQL, SQL Server, MySQL та інші СУБД через провайдери.

### Встановлення NuGet пакетів

```bash
# Основний пакет
dotnet add package Microsoft.EntityFrameworkCore

# Провайдер SQLite
dotnet add package Microsoft.EntityFrameworkCore.Sqlite

# Інструменти CLI для міграцій
dotnet add package Microsoft.EntityFrameworkCore.Tools
```

Або у Visual Studio через `Tools → NuGet Package Manager`.

## Підхід Code First

**Code First** — спочатку пишемо C#-класи (моделі), а EF Core сам створює таблиці:

```
1. Клас Student → таблиця students
2. Клас Group   → таблиця groups
3. EF Core аналізує класи і генерує SQL для CREATE TABLE
```

Альтернатива — **Database First** (зворотне: починаємо з існуючої БД, генеруємо класи). У нових проектах переважає Code First.

## Перша модель

```csharp
// Простий клас — EF Core сам визначить ім'я таблиці та тип стовпців
public class Student
{
    public int    Id    { get; set; }   // → INTEGER PRIMARY KEY AUTOINCREMENT
    public string Name  { get; set; } = string.Empty; // → TEXT NOT NULL
    public int    Grade { get; set; }   // → INTEGER NOT NULL
    public string? Email { get; set; }  // → TEXT (nullable)
}
```

**Правила перетворення EF Core за замовчуванням:**

| C# | SQL |
|---|---|
| `int Id` (з назвою `Id` або `{ClassName}Id`) | `INTEGER PRIMARY KEY` |
| `string` (не nullable) | `TEXT NOT NULL` |
| `string?` (nullable) | `TEXT` |
| `int` | `INTEGER NOT NULL` |
| `double` | `REAL NOT NULL` |
| `bool` | `INTEGER NOT NULL` (0/1) |
| `DateTime` | `TEXT` (ISO 8601) |

## Атрибути валідації та схеми

Атрибути з `System.ComponentModel.DataAnnotations` задають обмеження у БД:

```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

public class Student
{
    public int Id { get; set; }

    [Required]            // NOT NULL (для string — за замовчуванням nullable)
    [MaxLength(200)]      // VARCHAR(200)
    public string Name { get; set; } = string.Empty;

    [Range(0, 100)]       // перевірка на рівні C# (не SQL)
    public int Grade { get; set; }

    [EmailAddress]        // перевірка формату на рівні C#
    [MaxLength(300)]
    public string? Email { get; set; }

    [Column("created_at")] // ім'я стовпця у БД відрізняється від назви властивості
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [NotMapped]           // НЕ зберігати у БД (обчислюване поле)
    public string DisplayName => $"{Name} ({Grade})";
}
```

## DbContext

`DbContext` — центральний клас EF Core. Представляє сеанс роботи з БД.

```csharp
using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    // DbSet<T> відповідає таблиці в БД
    public DbSet<Student> Students { get; set; }
    public DbSet<Group>   Groups   { get; set; }

    // Налаштування підключення
    protected override void OnConfiguring(DbContextOptionsBuilder options)
    {
        options.UseSqlite("Data Source=school.db");
    }

    // Додаткові налаштування схеми (Fluent API)
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Індекс уникальності на email
        modelBuilder.Entity<Student>()
            .HasIndex(s => s.Email)
            .IsUnique();

        // Значення за замовчуванням
        modelBuilder.Entity<Student>()
            .Property(s => s.CreatedAt)
            .HasDefaultValueSql("datetime('now')");
    }
}
```

## Два способи налаштування: атрибути vs Fluent API

```csharp
// Спосіб 1: Атрибути (простіше, ближче до моделі)
public class Student
{
    [MaxLength(200)]
    [Required]
    public string Name { get; set; } = string.Empty;
}

// Спосіб 2: Fluent API у OnModelCreating (більше гнучкості)
modelBuilder.Entity<Student>()
    .Property(s => s.Name)
    .IsRequired()
    .HasMaxLength(200);
```

Обидва способи рівнозначні. Атрибути — зручніше для простих випадків. Fluent API — для складних: складені ключі, складні індекси, налаштування зв'язків.

## Перше використання DbContext

```csharp
// EnsureCreated() — створити БД якщо не існує (без міграцій)
using var db = new AppDbContext();
db.Database.EnsureCreated();

// Додати студента
var s = new Student { Name = "Олена Коваль", Grade = 92 };
db.Students.Add(s);
db.SaveChanges();
Console.WriteLine($"Збережено з id = {s.Id}");

// Читати всіх
var all = db.Students.ToList();
foreach (var student in all)
    Console.WriteLine($"{student.Id}: {student.Name} — {student.Grade}");
```

:::info EnsureCreated vs Migrate
- `EnsureCreated()` — швидко, без міграцій. Таблиці створюються один раз. **Не підтримує** оновлення схеми після змін у моделях.
- `Migrate()` — використовує систему міграцій. Підтримує поступове оновлення БД. Рекомендовано для реальних проектів.

Для навчальних проектів `EnsureCreated()` цілком достатньо.
:::
