---
sidebar_position: 1
---

# Поняття делегата та синтаксис

## Що таке делегат?

**Делегат (Delegate)** у C# — це тип, який представляє посилання на методи з певним списком параметрів і типом повертаного значення. Можна сказати, що делегат — це безпечний, об'єктно-орієнтований аналог вказівників на функції у C++.

Основна мета делегатів — дозволити передавати методи як параметри іншим методам, зберігати їх у змінних та викликати згодом. Це основа для реалізації подій (events) та методів зворотного виклику (callbacks).

### Основні характеристики:

- Делегати повністю об'єктно-орієнтовані.
- Вони типобезпечні (type-safe).
- Делегат може вказувати як на статичні методи, так і на методи екземпляра класу.

## Синтаксис оголошення

Оголошення делегата визначає сигнатуру методу, на який він може посилатися.

```csharp
// Оголошення делегата
// [модифікатор доступу] delegate [тип повернення] [Ім'яДелегата]([параметри]);

public delegate void DisplayMessage(string message);
public delegate int MathOperation(int x, int y);
```

У прикладі вище:

- `DisplayMessage` може посилатися на будь-який метод, який приймає `string` і повертає `void`.
- `MathOperation` може посилатися на будь-який метод, який приймає два `int` і повертає `int`.

## Використання делегатів

Створення екземпляра делегата та його виклик:

```csharp
using System;

namespace DelegateExample
{
    // 1. Оголошення делегата
    public delegate void Notify(string message);

    class Program
    {
        // Метод, що відповідає сигнатурі делегата
        public static void ShowMessage(string msg)
        {
            Console.WriteLine($"Повідомлення: {msg}");
        }

        static void Main(string[] args)
        {
            // 2. Створення екземпляра делегата
            Notify notifyDelegate = ShowMessage;
            // Або старий синтаксис: Notify notifyDelegate = new Notify(ShowMessage);

            // 3. Виклик делегата
            notifyDelegate("Привіт, світ!");
            // Виведе: Повідомлення: Привіт, світ!
        }
    }
}
```

### Мультикастингові делегати (Multicast Delegates)

Делегат може зберігати посилання на кілька методів одночасно. При виклику такого делегата всі методи викликаються послідовно. Для додавання методів використовується оператор `+=`, для видалення — `-=`.

```csharp
public delegate void MathAction(int a, int b);

public static void Add(int a, int b) => Console.WriteLine($"Add: {a + b}");
public static void Multiply(int a, int b) => Console.WriteLine($"Multiply: {a * b}");

static void Main()
{
    MathAction action = Add;
    action += Multiply; // Додаємо ще один метод

    action(5, 3);
    // Виведе:
    // Add: 8
    // Multiply: 15

    action -= Add; // Видаляємо метод
    action(5, 3);
    // Виведе:
    // Multiply: 15
}
```
