---
sidebar_position: 2
---

# XML: запис, модифікація та серіалізація об'єктів

## Створення XML-документа з нуля

`XDocument` дозволяє будувати XML-дерево декларативно через вкладені конструктори:

```csharp
var doc = new XDocument(
    new XDeclaration("1.0", "utf-8", "yes"),
    new XComment("Список студентів групи ПЗ-21"),
    new XElement("students",
        new XElement("student",
            new XAttribute("id", 1),
            new XAttribute("active", true),
            new XElement("name", "Олена Коваль"),
            new XElement("grade", 92),
            new XElement("email", "o.koval@uni.edu")
        ),
        new XElement("student",
            new XAttribute("id", 2),
            new XAttribute("active", true),
            new XElement("name", "Андрій Мороз"),
            new XElement("grade", 78),
            new XElement("email", "a.moroz@uni.edu")
        )
    )
);

// Зберігаємо у файл
doc.Save("students.xml");
```

Результат у файлі:
```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<!--Список студентів групи ПЗ-21-->
<students>
  <student id="1" active="True">
    <name>Олена Коваль</name>
    <grade>92</grade>
    <email>o.koval@uni.edu</email>
  </student>
  <student id="2" active="True">
    <name>Андрій Мороз</name>
    <grade>78</grade>
    <email>a.moroz@uni.edu</email>
  </student>
</students>
```

## Збереження у рядок (без файлу)

```csharp
// В пам'яті, без файлу
string xmlString = doc.ToString();

// Або через StringWriter для контролю кодування
using var sw = new System.IO.StringWriter();
doc.Save(sw);
string result = sw.ToString();
```

## Додавання елементів до існуючого документа

```csharp
XDocument doc = XDocument.Load("students.xml");

// Новий студент
var newStudent = new XElement("student",
    new XAttribute("id", 3),
    new XAttribute("active", true),
    new XElement("name", "Марія Лисенко"),
    new XElement("grade", 95),
    new XElement("email", "m.lysenko@uni.edu")
);

// Додати у кінець кореневого елемента
doc.Root.Add(newStudent);

// Або на початок
doc.Root.AddFirst(newStudent);

doc.Save("students.xml");
```

## Оновлення існуючих елементів

```csharp
XDocument doc = XDocument.Load("students.xml");

// Знайти студента з id=1
XElement student = doc.Root
    .Elements("student")
    .FirstOrDefault(s => (int)s.Attribute("id") == 1);

if (student != null)
{
    // Змінити значення елемента
    student.Element("grade").Value = "97";

    // Додати новий елемент
    student.Add(new XElement("scholarship", true));

    // Змінити атрибут
    student.SetAttributeValue("active", false);
}

doc.Save("students.xml");
```

## Видалення елементів

```csharp
XDocument doc = XDocument.Load("students.xml");

// Видалити одного студента
doc.Root
   .Elements("student")
   .Where(s => (int)s.Attribute("id") == 2)
   .Remove();

// Видалити всіх неактивних
doc.Root
   .Elements("student")
   .Where(s => (string)s.Attribute("active") == "False")
   .Remove();

doc.Save("students.xml");
```

:::tip Remove() на IEnumerable
Метод `.Remove()` — розширення LINQ to XML, що безпечно видаляє колекцію елементів. Не викидає `InvalidOperationException` при модифікації колекції під час перебору, бо спочатку матеріалізує список.
:::

## Серіалізація класів у XML через XmlSerializer

Стандартний .NET спосіб для автоматичного перетворення об'єкта у XML і назад — `XmlSerializer`.

### Клас-модель

```csharp
using System.Xml.Serialization;

// Атрибути контролюють, як клас серіалізується
[XmlRoot("student")]
public class Student
{
    [XmlAttribute("id")]
    public int Id { get; set; }

    [XmlElement("name")]
    public string Name { get; set; }

    [XmlElement("grade")]
    public int Grade { get; set; }

    [XmlElement("email")]
    public string Email { get; set; }

    [XmlIgnore]       // не серіалізувати
    public string PasswordHash { get; set; }
}

[XmlRoot("students")]
public class StudentList
{
    [XmlElement("student")]
    public List<Student> Students { get; set; } = new();
}
```

### Серіалізація (об'єкт → XML файл)

```csharp
var data = new StudentList
{
    Students = new List<Student>
    {
        new Student { Id = 1, Name = "Олена Коваль",  Grade = 92 },
        new Student { Id = 2, Name = "Андрій Мороз",  Grade = 78 },
    }
};

var serializer = new XmlSerializer(typeof(StudentList));
using var writer = new StreamWriter("students.xml");
serializer.Serialize(writer, data);
```

### Десеріалізація (XML файл → об'єкт)

```csharp
var serializer = new XmlSerializer(typeof(StudentList));
using var reader = new StreamReader("students.xml");
var data = (StudentList)serializer.Deserialize(reader);

foreach (var s in data.Students)
    Console.WriteLine($"{s.Id}: {s.Name} — {s.Grade}");
```

## Порівняння XDocument і XmlSerializer

| | `XDocument` (LINQ to XML) | `XmlSerializer` |
|---|---|---|
| **Стиль** | Ручне маніпулювання | Автоматична серіалізація |
| **Гнучкість** | Висока — будь-яка структура | Обмежена атрибутами |
| **Складна вкладеність** | Зручно через LINQ | Потребує вкладених класів |
| **Читання чужого XML** | Ідеально | Важко (структура мусить збігатись) |
| **Зберігання своїх даних** | Нормально | Ідеально |

**Правило вибору:**
- Читаємо **чужий** XML з невідомою структурою → `XDocument`
- Зберігаємо **свої** C#-об'єкти у XML → `XmlSerializer`

## Обробка помилок

```csharp
try
{
    XDocument doc = XDocument.Load("data.xml");
    // ...
}
catch (System.IO.FileNotFoundException)
{
    // файл не знайдено
}
catch (System.Xml.XmlException ex)
{
    // XML невалідний
    Console.WriteLine($"Помилка XML на рядку {ex.LineNumber}: {ex.Message}");
}
```
