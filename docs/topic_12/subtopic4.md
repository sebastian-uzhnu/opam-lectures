# Інтерфейси та SOLID

Принципи SOLID допомагають створювати гнучкий та підтримуваний код. Інтерфейси відіграють ключову роль у реалізації цих принципів.

## S - Single Responsibility Principle (Принцип єдиної відповідальності)

Клас повинен мати лише одну причину для змін. Інтерфейси дозволяють розділити відповідальність на рівні контрактів.

```csharp
// Погано: Клас робить все - і дані зберігає, і звіт друкує
class Report
{
    public void GenerateReport() { /* ... */ }
    public void SaveToFile() { /* ... */ }
}

// Добре: Розділення відповідальності
class ReportGenerator
{
    public void Generate() { /* ... */ }
}

class ReportSaver
{
    public void Save() { /* ... */ }
}
```

## O - Open/Closed Principle (Принцип відкритості/закритості)

Програмні сутності повинні бути відкриті для розширення, але закриті для змін.
Використовуючи інтерфейси, ми можемо додавати нову поведінку, створюючи нові реалізації інтерфейсу, не змінюючи код, який цей інтерфейс використовує.

```csharp
// Погано: При додаванні нової фігури треба змінювати цей клас
class Rectangle { public double Width; public double Height; }
class Circle { public double Radius; }

class AreaCalculator
{
    public double TotalArea(object[] shapes)
    {
        double area = 0;
        foreach (var shape in shapes)
        {
            if (shape is Rectangle r) area += r.Width * r.Height;
            else if (shape is Circle c) area += Math.PI * c.Radius * c.Radius;
        }
        return area;
    }
}

// Добре: Використання поліморфізму
interface IShape
{
    double Area();
}

class Rectangle : IShape
{
    public double Width { get; set; }
    public double Height { get; set; }
    public double Area() => Width * Height;
}

class Circle : IShape
{
    public double Radius { get; set; }
    public double Area() => Math.PI * Radius * Radius;
}

class AreaCalculator
{
    public double TotalArea(IShape[] shapes)
    {
        double total = 0;
        foreach (var shape in shapes)
        {
            total += shape.Area();
        }
        return total;
    }
}
```

## L - Liskov Substitution Principle (Принцип підстановки Лісков)

Об'єкти в програмі повинні бути замінюваними на екземпляри їх підтипів без зміни правильності виконання програми.
Якщо клас реалізує інтерфейс, він повинен коректно виконувати контракт цього інтерфейсу.

```csharp
// Погано: Ostrich порушує контракт IBird, бо кидає виняток
class Bird
{
    public virtual void Fly() { /* Літає */ }
}

class Ostrich : Bird
{
    public override void Fly()
    {
        throw new NotImplementedException();
    }
}

// Добре: Виділення окремих інтерфейсів
interface IBird { }
interface IFlyable { void Fly(); }

class Eagle : IBird, IFlyable
{
    public void Fly() { /* Літає */ }
}

class Ostrich : IBird
{
    // Не реалізує IFlyable, тому не має методу Fly
}
```

## I - Interface Segregation Principle (Принцип розділення інтерфейсу)

Клієнти не повинні залежати від методів, які вони не використовують.
Краще створити багато вузькоспеціалізованих інтерфейсів, ніж один загальний.

```csharp
// Погано: один великий інтерфейс
interface IWorker
{
    void Work();
    void Eat();
}

// Добре: розділені інтерфейси
interface IWorkable
{
    void Work();
}

interface IFeedable
{
    void Eat();
}
```

## D - Dependency Inversion Principle (Принцип інверсії залежностей)

Модулі верхніх рівнів не повинні залежати від модулів нижніх рівнів. Обидва повинні залежати від абстракцій. Абстракції не повинні залежати від деталей. Деталі повинні залежати від абстракцій.

```csharp
// Погано: Жорстка залежність від конкретного класу LightBulb
class LightBulb
{
    public void TurnOn() { }
    public void TurnOff() { }
}

class Switch
{
    private LightBulb _bulb;

    public Switch()
    {
        _bulb = new LightBulb(); // Жорстка залежність
    }

    public void Toggle()
    {
        _bulb.TurnOn();
    }
}

// Добре: Залежність від абстракції (інтерфейсу)
interface ISwitchable
{
    void TurnOn();
    void TurnOff();
}

class LightBulb : ISwitchable
{
    public void TurnOn() { /* ... */ }
    public void TurnOff() { /* ... */ }
}

class Switch
{
    private ISwitchable _device;

    public Switch(ISwitchable device)
    {
        _device = device;
    }

    public void Toggle()
    {
        _device.TurnOn();
    }
}
```
