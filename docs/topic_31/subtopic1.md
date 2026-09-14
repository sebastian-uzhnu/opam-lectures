---
sidebar_position: 2
---

# Міграції та CRUD через LINQ

## Міграції

**Міграція** — збережений знімок змін у структурі БД. EF Core порівнює поточні моделі з попереднім станом і генерує C#-файл, що описує ALTER TABLE, CREATE TABLE тощо.

### Workflow міграцій

```
Змінили модель (клас)
        ↓
dotnet ef migrations add <Назва>   ← генерує файл у Migrations/
        ↓
dotnet ef database update          ← застосовує до БД
```

### Команди CLI

```bash
# Створити першу міграцію
dotnet ef migrations add InitialCreate

# Застосувати міграції до БД
dotnet ef database update

# Після зміни моделі — нова міграція
dotnet ef migrations add AddEmailToStudent

# Переглянути SQL без виконання
dotnet ef migrations script

# Відкатитись до конкретної міграції
dotnet ef database update InitialCreate

# Видалити останню (ще не застосовану) міграцію
dotnet ef migrations remove
```

:::tip Якщо dotnet ef не знайдено
```bash
dotnet tool install --global dotnet-ef
```
:::

### Що генерує EF Core

Після `dotnet ef migrations add InitialCreate` у папці `Migrations/` з'являється файл:

```csharp
// Migrations/20240315_InitialCreate.cs (спрощено)
public partial class InitialCreate : Migration
{
    protected override void Up(MigrationBuilder mb)
    {
        mb.CreateTable(
            name: "Groups",
            columns: t => new
            {
                Id   = t.Column<int>(nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                Name = t.Column<string>(maxLength: 100, nullable: false)
            },
            constraints: t => t.PrimaryKey("PK_Groups", x => x.Id));

        mb.CreateTable(
            name: "Students",
            // ...
        );
    }

    protected override void Down(MigrationBuilder mb)
    {
        // Зворотня операція (для rollback)
        mb.DropTable("Students");
        mb.DropTable("Groups");
    }
}
```

### Автоматичне застосування при запуску

```csharp
using var db = new AppDbContext();
db.Database.Migrate(); // застосовує всі нові міграції автоматично
```

---

## CRUD через LINQ

### CREATE (додавання)

```csharp
using var db = new AppDbContext();

// Один об'єкт
var student = new Student { Name = "Олена Коваль", Grade = 92 };
db.Students.Add(student);
db.SaveChanges();
// student.Id тепер заповнений БД-значенням

// Кілька об'єктів
db.Students.AddRange(
    new Student { Name = "Андрій Мороз",  Grade = 78 },
    new Student { Name = "Марія Лисенко", Grade = 95 }
);
db.SaveChanges();
```

### READ (читання)

```csharp
using var db = new AppDbContext();

// Всі записи
List<Student> all = db.Students.ToList();

// За первинним ключем (найшвидший пошук — по кешу, потім БД)
Student? byId = db.Students.Find(1);

// Перший що відповідає умові
Student? first = db.Students.FirstOrDefault(s => s.Grade >= 90);

// Чи існує
bool exists = db.Students.Any(s => s.Email == "test@uni.edu");

// Кількість
int count = db.Students.Count(s => s.Grade >= 80);

// Агрегати
double avg = db.Students.Average(s => s.Grade);
int    max = db.Students.Max(s => s.Grade);
```

### Фільтрація, сортування, проєкція

```csharp
// WHERE + ORDER BY + SELECT
var result = db.Students
    .Where(s => s.Grade >= 80)           // WHERE grade >= 80
    .OrderByDescending(s => s.Grade)     // ORDER BY grade DESC
    .ThenBy(s => s.Name)                 // THEN BY name ASC
    .Select(s => new                     // SELECT id, name, grade
    {
        s.Id,
        s.Name,
        s.Grade
    })
    .ToList();

// Пагінація
var page2 = db.Students
    .OrderBy(s => s.Name)
    .Skip(10)       // пропустити 10
    .Take(10)       // взяти 10
    .ToList();

// Пошук (LIKE)
string query = "Коваль";
var found = db.Students
    .Where(s => s.Name.Contains(query))
    .ToList();
// Генерує: WHERE name LIKE '%Коваль%'
```

### UPDATE (оновлення)

```csharp
using var db = new AppDbContext();

// Спосіб 1: через Find + зміна + SaveChanges
var student = db.Students.Find(1);
if (student != null)
{
    student.Grade = 97;
    student.Email = "new@email.com";
    db.SaveChanges(); // EF Core бачить зміни і генерує UPDATE
}

// Спосіб 2: через Update (для об'єктів не з цього db context)
var detached = new Student { Id = 2, Name = "Андрій", Grade = 85, Email = "a@uni.edu" };
db.Students.Update(detached); // EF Core позначить всі поля як змінені
db.SaveChanges();              // UPDATE students SET name=..., grade=..., email=... WHERE id=2
```

### DELETE (видалення)

```csharp
using var db = new AppDbContext();

// Спосіб 1: Find + Remove
var student = db.Students.Find(3);
if (student != null)
{
    db.Students.Remove(student);
    db.SaveChanges();
}

// Спосіб 2: ExecuteDelete (EF Core 7+, без завантаження в пам'ять)
db.Students
  .Where(s => s.Grade < 50)
  .ExecuteDelete(); // DELETE FROM students WHERE grade < 50
```

### Bulk update (EF Core 7+)

```csharp
// Оновлення без завантаження об'єктів у пам'ять
db.Students
  .Where(s => s.Grade > 95)
  .ExecuteUpdate(s => s.SetProperty(x => x.Email, x => x.Name + "@honor.edu"));
// UPDATE students SET email = name || '@honor.edu' WHERE grade > 95
```

---

## Change Tracking: як EF Core відстежує зміни

EF Core **запам'ятовує оригінальний стан** кожного завантаженого об'єкта. При `SaveChanges()` порівнює поточний стан з оригінальним і генерує SQL лише для змінених полів.

```csharp
using var db = new AppDbContext();

var s = db.Students.Find(1);
// Стан: { Name = "Олена", Grade = 92 }

s.Grade = 97;
// EF Core бачить: Grade змінилась 92 → 97

db.SaveChanges();
// Генерує: UPDATE students SET grade = 97 WHERE id = 1
// (тільки Grade! Name не чіпає)
```

### AsNoTracking — для read-only запитів

```csharp
// Якщо читаємо тільки для відображення — вимикаємо відстеження
// Швидше + менше пам'яті
var students = db.Students
    .AsNoTracking()
    .Where(s => s.Grade >= 80)
    .ToList();
// Ці об'єкти НЕ відстежуються — db.SaveChanges() їх не торкнеться
```

---

## Логування SQL

Щоб бачити який SQL генерує EF Core:

```csharp
protected override void OnConfiguring(DbContextOptionsBuilder options)
{
    options
        .UseSqlite("Data Source=school.db")
        .LogTo(Console.WriteLine,          // куди виводити
               LogLevel.Information)       // рівень деталізації
        .EnableSensitiveDataLogging();     // показувати значення параметрів
}
```

Тепер у консолі:
```
info: Microsoft.EntityFrameworkCore.Database.Command[20101]
      Executed DbCommand (2ms) [Parameters=[$name='Олена' ...]]
      INSERT INTO "Students" ("Email", "Grade", "Name")
      VALUES (@p0, @p1, @p2);
      SELECT last_insert_rowid();
```
