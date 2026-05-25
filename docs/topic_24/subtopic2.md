---
sidebar_position: 3
---

# Зв'язки між сутностями

## Один-до-багатьох (One-to-Many)

Найпоширеніший тип зв'язку. Одна група містить багато студентів.

### Моделі

```csharp
public class Group
{
    public int    Id       { get; set; }
    [Required, MaxLength(50)]
    public string Name     { get; set; } = string.Empty;

    // Навігаційна колекція — всі студенти цієї групи
    public List<Student> Students { get; set; } = new();
}

public class Student
{
    public int    Id      { get; set; }
    [Required, MaxLength(200)]
    public string Name    { get; set; } = string.Empty;
    public int    Grade   { get; set; }

    // Зовнішній ключ
    public int?   GroupId { get; set; }

    // Навігаційна властивість — пов'язана група
    public Group? Group   { get; set; }
}
```

### Налаштування у DbContext

```csharp
protected override void OnModelCreating(ModelBuilder mb)
{
    mb.Entity<Group>()
        .HasMany(g => g.Students)        // Group має багато Students
        .WithOne(s => s.Group)           // кожен Student має одну Group
        .HasForeignKey(s => s.GroupId)   // зовнішній ключ — GroupId
        .OnDelete(DeleteBehavior.SetNull); // при видаленні групи → GroupId = null
}
```

:::info OnDelete поведінка
| Значення | Поведінка при видаленні батька |
|---|---|
| `SetNull` | Зовнішній ключ стає `NULL` |
| `Cascade` | Дочірні записи видаляються |
| `Restrict` | Заборонено — кидає помилку |
| `NoAction` | Нічого (відповідальність на програмісті) |
:::

### Завантаження зв'язаних даних: Include

EF Core **не завантажує** зв'язані дані автоматично (це eager loading vs lazy loading). Треба явно вказати що потрібно:

```csharp
using var db = new AppDbContext();

// Студенти БЕЗ групи (Group = null)
var students = db.Students.ToList();

// Студенти З групою (Include = LEFT JOIN)
var withGroup = db.Students
    .Include(s => s.Group)
    .ToList();

foreach (var s in withGroup)
    Console.WriteLine($"{s.Name} — {s.Group?.Name ?? "без групи"}");

// Групи разом зі студентами
var groups = db.Groups
    .Include(g => g.Students)
    .ToList();

foreach (var g in groups)
    Console.WriteLine($"{g.Name}: {g.Students.Count} студентів");
```

### Вкладений Include (ThenInclude)

```csharp
// Курси → Студенти → Групи (три рівні)
var courses = db.Courses
    .Include(c => c.Enrollments)
        .ThenInclude(e => e.Student)
            .ThenInclude(s => s.Group)
    .ToList();
```

---

## Багато-до-багатьох (Many-to-Many)

Один студент може відвідувати кілька курсів, один курс — мати кількох студентів.

### EF Core 5+: автоматична проміжна таблиця

```csharp
public class Student
{
    public int         Id      { get; set; }
    public string      Name    { get; set; } = string.Empty;

    // EF Core сам створить таблицю CourseStudent
    public List<Course> Courses { get; set; } = new();
}

public class Course
{
    public int          Id       { get; set; }
    public string       Title    { get; set; } = string.Empty;

    public List<Student> Students { get; set; } = new();
}
```

EF Core автоматично створить таблицю `CourseStudent (StudentId, CourseId)`. Якщо потрібні додаткові поля (дата запису, оцінка) — явна проміжна сутність.

### Явна проміжна сутність

```csharp
public class Enrollment
{
    public int      StudentId  { get; set; }
    public Student  Student    { get; set; } = null!;

    public int      CourseId   { get; set; }
    public Course   Course     { get; set; } = null!;

    // Додаткові поля
    public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;
    public int?     FinalGrade { get; set; }
}

public class Student
{
    public int               Id          { get; set; }
    public string            Name        { get; set; } = string.Empty;
    public List<Enrollment>  Enrollments { get; set; } = new();
}

public class Course
{
    public int               Id          { get; set; }
    public string            Title       { get; set; } = string.Empty;
    public List<Enrollment>  Enrollments { get; set; } = new();
}
```

```csharp
// DbContext
protected override void OnModelCreating(ModelBuilder mb)
{
    mb.Entity<Enrollment>()
        .HasKey(e => new { e.StudentId, e.CourseId }); // складений первинний ключ

    mb.Entity<Enrollment>()
        .HasOne(e => e.Student)
        .WithMany(s => s.Enrollments)
        .HasForeignKey(e => e.StudentId);

    mb.Entity<Enrollment>()
        .HasOne(e => e.Course)
        .WithMany(c => c.Enrollments)
        .HasForeignKey(e => e.CourseId);
}
```

### Запис студента на курс

```csharp
using var db = new AppDbContext();

var student = db.Students.Find(1);
var course  = db.Courses.Find(3);

db.Enrollments.Add(new Enrollment
{
    StudentId = student.Id,
    CourseId  = course.Id
});
db.SaveChanges();
```

### Запит: всі курси студента

```csharp
var courses = db.Enrollments
    .Where(e => e.StudentId == 1)
    .Include(e => e.Course)
    .Select(e => e.Course)
    .ToList();
```

---

## Один-до-одного (One-to-One)

Кожен студент має один профіль, кожен профіль належить одному студенту.

```csharp
public class Student
{
    public int     Id      { get; set; }
    public string  Name    { get; set; } = string.Empty;
    public Profile? Profile { get; set; }
}

public class Profile
{
    public int    Id        { get; set; }
    public string Bio       { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;

    // Зовнішній ключ = первинний ключ (характерно для 1:1)
    public int StudentId { get; set; }
    public Student Student { get; set; } = null!;
}
```

```csharp
mb.Entity<Student>()
    .HasOne(s => s.Profile)
    .WithOne(p => p.Student)
    .HasForeignKey<Profile>(p => p.StudentId);
```

---

## Seed Data: початкові дані

```csharp
protected override void OnModelCreating(ModelBuilder mb)
{
    mb.Entity<Group>().HasData(
        new Group { Id = 1, Name = "ПЗ-21" },
        new Group { Id = 2, Name = "ПЗ-22" }
    );

    mb.Entity<Student>().HasData(
        new Student { Id = 1, Name = "Олена Коваль",  Grade = 92, GroupId = 1 },
        new Student { Id = 2, Name = "Андрій Мороз",  Grade = 78, GroupId = 1 },
        new Student { Id = 3, Name = "Марія Лисенко", Grade = 95, GroupId = 2 }
    );
}
```

:::warning Id у HasData
При використанні `HasData` первинний ключ `Id` **обов'язковий** навіть для автоінкрементних полів, бо EF Core потребує стабільного ідентифікатора для відстеження seed-даних між міграціями.
:::
