---
sidebar_position: 4
---

# Спеціальні методи роботи з рядками. StringBuilder

## Проблема звичайних рядків

Оскільки рядки `String` є незмінними, часті операції зміни (наприклад, конкатенація в циклі) призводять до створення великої кількості тимчасових об'єктів, що навантажує пам'ять і Garbage Collector.

```csharp
string s = "";
for (int i = 0; i < 10000; i++)
{
    s += i.ToString(); // Дуже повільно! Створюється 10000 нових рядків.
}
```

## Клас StringBuilder

Клас `System.Text.StringBuilder` представляє змінний рядок символів. Він дозволяє змінювати вміст без створення нового об'єкта.

```csharp
using System.Text;

StringBuilder sb = new StringBuilder();
for (int i = 0; i < 10000; i++)
{
    sb.Append(i); // Швидко і ефективно
}
string result = sb.ToString();
```

## Основні методи StringBuilder

* `Append(value)`: додає значення в кінець.
* `AppendLine(value)`: додає значення і перехід на новий рядок.
* `Insert(index, value)`: вставляє значення на вказану позицію.
* `Remove(startIndex, length)`: видаляє частину рядка.
* `Replace(oldValue, newValue)`: замінює входження.
* `Clear()`: очищає вміст.

```csharp
StringBuilder sb = new StringBuilder("Hello World");

sb.Replace("World", "C#"); // "Hello C#"
sb.Remove(0, 6); // "C#"
sb.Insert(0, "I love "); // "I love C#"

Console.WriteLine(sb.ToString());
```

## Коли використовувати StringBuilder?

1. Коли потрібно виконувати багато операцій конкатенації або модифікації рядка (особливо в циклах).
2. Коли невідома кількість ітерацій зміни рядка.

Для простих операцій (наприклад, об'єднання 2-3 рядків) краще використовувати звичайний `String` або інтерполяцію, оскільки створення `StringBuilder` теж має свої накладні витрати.
