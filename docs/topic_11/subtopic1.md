---
sidebar_position: 1
---

# 11.1 Поліморфізм та віртуальні методи

**Поліморфізм** (від грец. _polys_ - багато, _morphe_ - форма) — це один з трьох основних принципів об'єктно-орієнтованого програмування (разом з інкапсуляцією та успадкуванням). Він дозволяє об'єктам різних типів оброблятися через єдиний інтерфейс базового класу.

Простими словами: **один інтерфейс — багато реалізацій**.

## Види поліморфізму

1.  **Статичний (Compile-time)**: Перевантаження методів (Method Overloading) та операторів. Рішення про те, який метод викликати, приймається під час компіляції.
2.  **Динамічний (Runtime)**: Перевизначення методів (Method Overriding) за допомогою віртуальних методів. Рішення приймається під час виконання програми.

У цій темі ми зосередимося на динамічному поліморфізмі.

## Віртуальні методи (`virtual` та `override`)

Щоб дозволити похідному класу змінити реалізацію методу базового класу, використовуються ключові слова:

- `virtual`: Вказує у базовому класі, що метод _може_ бути перевизначений.
- `override`: Вказує у похідному класі, що метод _перевизначає_ віртуальний метод базового класу.

### Приклад: Геометричні фігури

Уявімо базовий клас `Shape` (Фігура) та похідні класи `Circle` (Коло) та `Rectangle` (Прямокутник). Кожна фігура має свою формулу для обчислення площі.

```csharp
using System;
using System.Collections.Generic;

// Базовий клас
public class Shape
{
    public int X { get; set; }
    public int Y { get; set; }

    // Віртуальний метод - дозволяємо його змінити у спадкоємцях
    public virtual void Draw()
    {
        Console.WriteLine("Малюємо фігуру");
    }

    public virtual double GetArea()
    {
        return 0;
    }
}

// Похідний клас - Коло
public class Circle : Shape
{
    public double Radius { get; set; }

    // Перевизначення методу Draw
    public override void Draw()
    {
        Console.WriteLine($"Малюємо коло з радіусом {Radius}");
    }

    // Перевизначення методу GetArea
    public override double GetArea()
    {
        return Math.PI * Radius * Radius;
    }
}

// Похідний клас - Прямокутник
public class Rectangle : Shape
{
    public double Width { get; set; }
    public double Height { get; set; }

    public override void Draw()
    {
        Console.WriteLine($"Малюємо прямокутник {Width}x{Height}");
    }

    public override double GetArea()
    {
        return Width * Height;
    }
}

class Program
{
    static void Main()
    {
        // Створюємо список фігур (поліморфізм у дії: список базового типу зберігає об'єкти похідних типів)
        List<Shape> shapes = new List<Shape>
        {
            new Circle { Radius = 5 },
            new Rectangle { Width = 4, Height = 6 },
            new Shape() // Базовий об'єкт
        };

        foreach (var shape in shapes)
        {
            // Виклик методу Draw відбувається поліморфно:
            // Для Circle викличеться Circle.Draw()
            // Для Rectangle викличеться Rectangle.Draw()
            // Для Shape викличеться Shape.Draw()
            shape.Draw();

            Console.WriteLine($"Площа: {shape.GetArea():F2}");
            Console.WriteLine("---");
        }
    }
}
```

### Ключове слово `base`

Якщо ви перевизначили метод, але хочете викликати реалізацію з базового класу, використовуйте `base`.

```csharp
public class Animal
{
    public virtual void Eat()
    {
        Console.WriteLine("Тварина їсть");
    }
}

public class Dog : Animal
{
    public override void Eat()
    {
        base.Eat(); // Викликає "Тварина їсть"
        Console.WriteLine("Собака гризе кістку");
    }
}
```

## Пізнє зв'язування (Late Binding)

При динамічному поліморфізмі компілятор не знає, який саме метод буде викликано. Він знає лише, що це буде метод `GetArea()`. Конкретна адреса методу визначається вже під час роботи програми (Runtime) на основі реального типу об'єкта, на який посилається змінна.

Це досягається за допомогою **таблиці віртуальних методів (vtable)**, яку CLR створює для кожного класу з віртуальними методами.
