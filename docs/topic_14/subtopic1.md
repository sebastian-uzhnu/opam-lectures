---
sidebar_position: 2
---

# Вбудовані делегати .NET

Замість того, щоб щоразу оголошувати власні типи делегатів, .NET надає набір універсальних (generic) делегатів, які покривають більшість потреб: `Action`, `Func` та `Predicate`.

## Action

`Action` використовується для методів, які **не повертають значення** (мають тип повернення `void`). Він може приймати від 0 до 16 аргументів.

```csharp
// Action без параметрів
Action sayHello = () => Console.WriteLine("Hello!");

// Action з одним параметром (string)
Action<string> print = message => Console.WriteLine(message);

// Action з двома параметрами (int, int)
Action<int, int> sum = (x, y) => Console.WriteLine($"Sum: {x + y}");

sayHello();
print("Test Action");
sum(10, 20);
```

## Func

`Func` використовується для методів, які **повертають значення**. Останній параметр у кутових дужках завжди вказує на тип повертаного значення.

```csharp
// Приймає int, повертає int (квадрат числа)
Func<int, int> square = x => x * x;

// Приймає два int, повертає string
Func<int, int, string> formatSum = (x, y) => $"Result: {x + y}";

// Не приймає параметрів, повертає double (випадкове число)
Func<double> getRandom = () => new Random().NextDouble();

Console.WriteLine(square(5)); // 25
Console.WriteLine(formatSum(5, 7)); // Result: 12
```

## Predicate

`Predicate` — це спеціалізований делегат для методів, які приймають **один аргумент** і повертають **`bool`**. Часто використовується для перевірки умов (фільтрації).

_Примітка: `Predicate<T>` функціонально ідентичний `Func<T, bool>`, але історично використовувався у методах класу `List<T>`, таких як `FindAll`._

```csharp
Predicate<int> isPositive = x => x > 0;

Console.WriteLine(isPositive(10)); // True
Console.WriteLine(isPositive(-5)); // False

// Використання у списку
var numbers = new List<int> { -1, 2, -3, 4, 5 };
var positiveNumbers = numbers.FindAll(isPositive);

Console.WriteLine(string.Join(", ", positiveNumbers)); // 2, 4, 5
```
