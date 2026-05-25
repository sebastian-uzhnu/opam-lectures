---
sidebar_position: 3
---

# JSON: структура та System.Text.Json

## Що таке JSON

**JSON (JavaScript Object Notation)** — текстовий формат для обміну даними. Компактніший і читабельніший за XML, є стандартом для REST API та сучасних веб-сервісів.

```json
{
  "id": 1,
  "name": "Олена Коваль",
  "grade": 92,
  "active": true,
  "email": null,
  "tags": ["відмінник", "стипендіат"],
  "address": {
    "city": "Київ",
    "street": "вул. Хрещатик, 1"
  }
}
```

## Типи даних JSON

| JSON тип | C# тип | Приклад |
|---|---|---|
| `string` | `string` | `"Привіт"` |
| `number` | `int`, `double`, `decimal` | `42`, `3.14` |
| `boolean` | `bool` | `true`, `false` |
| `null` | `null` | `null` |
| `array` | `List<T>`, `T[]` | `[1, 2, 3]` |
| `object` | клас або `Dictionary` | `{ "key": "value" }` |

## Порівняння XML і JSON

```xml
<!-- XML — більш багатослівний -->
<student id="1">
    <name>Олена</name>
    <grade>92</grade>
    <tags>
        <tag>відмінник</tag>
        <tag>стипендіат</tag>
    </tags>
</student>
```

```json
// JSON — компактніший
{
  "id": 1,
  "name": "Олена",
  "grade": 92,
  "tags": ["відмінник", "стипендіат"]
}
```

## System.Text.Json у .NET

Починаючи з .NET 3.0, стандартна бібліотека включає `System.Text.Json` — швидкий, безпечний JSON-серіалізатор. Не потребує NuGet-пакетів.

```csharp
using System.Text.Json;
using System.Text.Json.Serialization;
```

:::info Newtonsoft.Json (Json.NET)
Існує також популярна стороння бібліотека `Newtonsoft.Json` (NuGet: `Newtonsoft.Json`). Вона старша, з більшою кількістю можливостей, але `System.Text.Json` у більшості випадків швидший і достатній. У цій лекції розглядаємо `System.Text.Json`.
:::

## Серіалізація: об'єкт → JSON рядок

```csharp
public class Student
{
    public int    Id     { get; set; }
    public string Name   { get; set; }
    public int    Grade  { get; set; }
    public bool   Active { get; set; }
}

var student = new Student { Id = 1, Name = "Олена Коваль", Grade = 92, Active = true };

// Серіалізація у рядок
string json = JsonSerializer.Serialize(student);
// {"Id":1,"Name":"Олена Коваль","Grade":92,"Active":true}

// З відступами (для читабельності)
var options = new JsonSerializerOptions { WriteIndented = true };
string prettyJson = JsonSerializer.Serialize(student, options);
```

Результат з `WriteIndented`:
```json
{
  "Id": 1,
  "Name": "Олена Коваль",
  "Grade": 92,
  "Active": true
}
```

## Десеріалізація: JSON рядок → об'єкт

```csharp
string json = """
    {
      "Id": 1,
      "Name": "Олена Коваль",
      "Grade": 92,
      "Active": true
    }
    """;

Student student = JsonSerializer.Deserialize<Student>(json);
Console.WriteLine(student.Name); // "Олена Коваль"
```

## Збереження та читання JSON файлу

```csharp
// Зберегти список у файл
var students = new List<Student>
{
    new Student { Id = 1, Name = "Олена Коваль",  Grade = 92, Active = true },
    new Student { Id = 2, Name = "Андрій Мороз",  Grade = 78, Active = true },
    new Student { Id = 3, Name = "Марія Лисенко", Grade = 95, Active = false },
};

var options = new JsonSerializerOptions { WriteIndented = true };
string json  = JsonSerializer.Serialize(students, options);
File.WriteAllText("students.json", json);

// --- пізніше ---

// Прочитати з файлу
string     loadedJson = File.ReadAllText("students.json");
List<Student> loaded  = JsonSerializer.Deserialize<List<Student>>(loadedJson);

foreach (var s in loaded)
    Console.WriteLine($"{s.Id}: {s.Name}");
```

## Атрибути для контролю серіалізації

```csharp
public class Student
{
    [JsonPropertyName("student_id")]   // ім'я у JSON відрізняється від ім'я у C#
    public int Id { get; set; }

    [JsonPropertyName("full_name")]
    public string Name { get; set; }

    public int Grade { get; set; }

    [JsonIgnore]                       // не включати у JSON
    public string PasswordHash { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string Email { get; set; } // пропускати якщо null
}
```

Результат:
```json
{
  "student_id": 1,
  "full_name": "Олена Коваль",
  "Grade": 92
}
```

## Регістр властивостей

За замовчуванням `System.Text.Json` чутливий до регістру при десеріалізації і зберігає регістр C#-властивостей (PascalCase). Налаштовуємо через `JsonSerializerOptions`:

```csharp
var options = new JsonSerializerOptions
{
    // Перетворює PascalCase → camelCase при серіалізації
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,

    // Ігнорує регістр при десеріалізації
    PropertyNameCaseInsensitive = true,

    WriteIndented = true
};

string json = JsonSerializer.Serialize(student, options);
// {"id":1,"name":"Олена Коваль","grade":92}
```

## Вкладені об'єкти та колекції

```csharp
public class Address
{
    public string City   { get; set; }
    public string Street { get; set; }
}

public class Student
{
    public int           Id      { get; set; }
    public string        Name    { get; set; }
    public Address       Address { get; set; }     // вкладений об'єкт
    public List<string>  Tags    { get; set; }     // масив рядків
    public List<int>     Grades  { get; set; }     // масив чисел
}

var student = new Student
{
    Id   = 1,
    Name = "Олена Коваль",
    Address = new Address { City = "Київ", Street = "Хрещатик, 1" },
    Tags    = new List<string> { "відмінник", "стипендіат" },
    Grades  = new List<int> { 92, 88, 95 }
};

string json = JsonSerializer.Serialize(student, new JsonSerializerOptions { WriteIndented = true });
```

Результат:
```json
{
  "Id": 1,
  "Name": "Олена Коваль",
  "Address": {
    "City": "Київ",
    "Street": "Хрещатик, 1"
  },
  "Tags": [
    "відмінник",
    "стипендіат"
  ],
  "Grades": [92, 88, 95]
}
```

## Робота з JSON без класу: JsonDocument

Якщо структура JSON заздалегідь невідома, використовують `JsonDocument` — аналог `XDocument` для JSON:

```csharp
string json = File.ReadAllText("unknown_data.json");

using JsonDocument doc = JsonDocument.Parse(json);
JsonElement root = doc.RootElement;

// Читання поля
if (root.TryGetProperty("name", out JsonElement nameEl))
    Console.WriteLine(nameEl.GetString());

// Перебір масиву
if (root.TryGetProperty("tags", out JsonElement tagsEl))
{
    foreach (JsonElement tag in tagsEl.EnumerateArray())
        Console.WriteLine(tag.GetString());
}

// Читання вкладеного об'єкта
if (root.TryGetProperty("address", out JsonElement addrEl))
{
    string city = addrEl.GetProperty("city").GetString();
}
```

:::warning using для JsonDocument
`JsonDocument` реалізує `IDisposable`. Завжди використовуйте `using`, щоб звільнити пам'ять після роботи.
:::

## Обробка помилок

```csharp
try
{
    var data = JsonSerializer.Deserialize<Student>(json);
}
catch (JsonException ex)
{
    // Невалідний JSON або невідповідність типів
    Console.WriteLine($"Помилка JSON: {ex.Message}");
    Console.WriteLine($"Шлях: {ex.Path}, Рядок: {ex.LineNumber}");
}
catch (System.IO.FileNotFoundException)
{
    Console.WriteLine("Файл не знайдено");
}
```
