---
sidebar_position: 6
---

# Запис і зчитування файлів

## Класи StreamReader та StreamWriter

Для читання та запису текстових файлів найчастіше використовуються класи `StreamReader` та `StreamWriter`.

### Запис у файл (StreamWriter)

```csharp
using System.IO;

string path = "output.txt";

// using гарантує закриття файлу після завершення блоку
using (StreamWriter writer = new StreamWriter(path, append: false)) 
{
    writer.WriteLine("Hello World");
    writer.WriteLine("Другий рядок");
}
```
Параметр `append: true` дозволяє дописувати дані в кінець файлу, а `false` — перезаписує файл.

### Зчитування з файлу (StreamReader)

```csharp
using System.IO;

string path = "input.txt";

if (File.Exists(path))
{
    using (StreamReader reader = new StreamReader(path))
    {
        string line;
        // Читаємо рядки поки не кінець файлу
        while ((line = reader.ReadLine()) != null)
        {
            Console.WriteLine(line);
        }
    }
}
```

Також можна прочитати весь файл одразу:
```csharp
string content = File.ReadAllText(path);
string[] lines = File.ReadAllLines(path);
```

## Робота з CSV файлами

CSV (Comma-Separated Values) — це простий текстовий формат для зберігання табличних даних.

### Приклад: Збереження результатів обчислень

Припустимо, у нас є результати експерименту, які ми хочемо зберегти.

```csharp
string filePath = "results.csv";
var results = new List<(int Id, double Value)>
{
    (1, 10.5),
    (2, 20.3),
    (3, 15.7)
};

using (StreamWriter writer = new StreamWriter(filePath))
{
    // Записуємо заголовок
    writer.WriteLine("Id,Value");

    foreach (var item in results)
    {
        // Форматуємо рядок: Id,Value
        // Використовуємо CultureInfo.InvariantCulture для крапки в дробових числах
        writer.WriteLine($"{item.Id},{item.Value.ToString(System.Globalization.CultureInfo.InvariantCulture)}");
    }
}
```

### Приклад: Зчитування CSV

```csharp
using (StreamReader reader = new StreamReader("results.csv"))
{
    // Пропускаємо заголовок
    reader.ReadLine(); 

    string line;
    while ((line = reader.ReadLine()) != null)
    {
        string[] parts = line.Split(',');
        int id = int.Parse(parts[0]);
        double value = double.Parse(parts[1], System.Globalization.CultureInfo.InvariantCulture);
        
        Console.WriteLine($"Id: {id}, Value: {value}");
    }
}
```
